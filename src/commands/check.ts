/**
 * Check command implementation - Skill health check
 */

import { Command } from 'commander';
import * as fs from 'fs-extra';
import path from 'path';
import { SourceManager } from '../core';
import { configLoader } from '../config';
import { logger, getGlobalSkillsPath, getProjectSkillsPath, findProjectRoot } from '../utils';
import { SkillInstaller } from '../core/installer';
import type { InstallScope } from '../types';

/**
 * Skill health status
 */
interface SkillHealth {
  id: string;
  status: 'healthy' | 'warning' | 'error' | 'update-available';
  version: string;
  installedAt: string;
  issues: string[];
  latestVersion?: string;
}

/**
 * Create check command
 */
export function createCheckCommand(): Command {
  const command = new Command('check');

  command
    .description('Check health of installed skills')
    .option('-s, --scope <scope>', 'Check scope: global or project', 'global')
    .option('-v, --verbose', 'Show detailed information')
    .option('--fix', 'Attempt to fix issues automatically')
    .action(async (options) => {
      await handleCheck(options);
    });

  return command;
}

/**
 * Handle check command logic
 */
async function handleCheck(options: {
  scope: string;
  verbose?: boolean;
  fix?: boolean;
}): Promise<void> {
  try {
    const scope = options.scope as InstallScope;
    const projectRoot = findProjectRoot() || undefined;

    logger.info(`🔍 Checking skill health (${scope} scope)...`);
    logger.newline();

    // Get installed skills
    const installer = new SkillInstaller();
    const installed = await installer.getInstalled(scope, projectRoot);

    if (installed.length === 0) {
      logger.info('No skills installed.');
      return;
    }

    // Get available skills from sources
    const { config } = await configLoader.load();
    const sourceManager = await SourceManager.fromConfigs(config.sources || []);

    logger.startSpinner('Checking skills...');

    // Check each skill
    const healthResults: SkillHealth[] = [];

    for (const { id, meta } of installed) {
      const health = await checkSkillHealth(id, meta, scope, projectRoot, sourceManager);
      healthResults.push(health);
    }

    logger.stopSpinner();

    // Display results
    displayHealthResults(healthResults, options.verbose);

    // Auto-fix if requested
    if (options.fix) {
      await autoFixIssues(healthResults, scope, projectRoot, sourceManager);
    }

  } catch (error) {
    logger.error(`Check failed: ${(error as Error).message}`);
    process.exit(1);
  }
}

/**
 * Check health of a single skill
 */
async function checkSkillHealth(
  id: string,
  meta: any,
  scope: InstallScope,
  projectRoot: string | undefined,
  sourceManager: SourceManager
): Promise<SkillHealth> {
  const health: SkillHealth = {
    id,
    status: 'healthy',
    version: meta?.version || 'unknown',
    installedAt: meta?.installedAt || 'unknown',
    issues: [],
  };

  // Get installation location
  const skillsPath = scope === 'global'
    ? getGlobalSkillsPath()
    : getProjectSkillsPath(projectRoot || '');
  const skillPath = path.join(skillsPath, id);

  // Check 1: Skill directory exists
  if (!(await fs.pathExists(skillPath))) {
    health.status = 'error';
    health.issues.push('Skill directory not found');
    return health;
  }

  // Check 2: SKILL.md exists
  const skillFile = path.join(skillPath, 'SKILL.md');
  if (!(await fs.pathExists(skillFile))) {
    health.status = 'error';
    health.issues.push('SKILL.md file missing');
  } else {
    // Check 3: SKILL.md is readable and has valid frontmatter
    try {
      const content = await fs.readFile(skillFile, 'utf-8');
      if (!content.trim().startsWith('---')) {
        health.status = 'warning';
        health.issues.push('Missing or invalid frontmatter');
      } else if (content.length < 100) {
        health.status = 'warning';
        health.issues.push('SKILL.md content seems too short');
      }
    } catch (err) {
      health.status = 'error';
      health.issues.push(`Cannot read SKILL.md: ${(err as Error).message}`);
    }
  }

  // Check 4: Metadata file exists
  const metaFile = path.join(skillPath, '.skill-meta.json');
  if (!(await fs.pathExists(metaFile))) {
    health.status = 'warning';
    health.issues.push('Metadata file missing');
  }

  // Check 5: Check for updates
  try {
    const availableSkill = await sourceManager.findSkill(id);
    if (availableSkill && availableSkill.version !== health.version) {
      health.status = health.status === 'healthy' ? 'update-available' : health.status;
      health.latestVersion = availableSkill.version;
      health.issues.push(`Update available: ${health.version} → ${availableSkill.version}`);
    }
  } catch (err) {
    // Ignore errors when checking for updates
  }

  // Check 6: Check for broken dependencies
  if (meta?.dependencies && Array.isArray(meta.dependencies)) {
    for (const depId of meta.dependencies) {
      const depPath = path.join(skillsPath, depId);
      if (!(await fs.pathExists(depPath))) {
        health.status = 'warning';
        health.issues.push(`Missing dependency: ${depId}`);
      }
    }
  }

  // Check 7: Check for orphaned files
  try {
    const files = await fs.readdir(skillPath);
    const suspiciousFiles = files.filter(f =>
      f.endsWith('.tmp') || f.endsWith('.bak') || f.startsWith('~')
    );
    if (suspiciousFiles.length > 0) {
      health.status = health.status === 'healthy' ? 'warning' : health.status;
      health.issues.push(`Found temporary files: ${suspiciousFiles.join(', ')}`);
    }
  } catch (err) {
    // Ignore
  }

  return health;
}

/**
 * Display health check results
 */
function displayHealthResults(results: SkillHealth[], verbose?: boolean): void {
  // Count by status
  const healthy = results.filter(r => r.status === 'healthy').length;
  const warning = results.filter(r => r.status === 'warning').length;
  const error = results.filter(r => r.status === 'error').length;
  const updates = results.filter(r => r.status === 'update-available').length;

  // Summary
  logger.info('📊 Health Summary:');
  logger.newline();
  logger.raw(`  ✅ Healthy:           ${healthy}`);
  logger.raw(`  ⚠️  Warnings:          ${warning}`);
  logger.raw(`  ❌ Errors:            ${error}`);
  logger.raw(`  📦 Updates Available: ${updates}`);
  logger.newline();

  // Detailed results
  if (verbose || warning > 0 || error > 0) {
    logger.info('📋 Detailed Results:');
    logger.newline();

    for (const result of results) {
      if (result.status === 'healthy' && !verbose) {
        continue;
      }

      const statusIcon = getStatusIcon(result.status);
      logger.raw(`${statusIcon} ${result.id} (v${result.version})`);

      if (result.issues.length > 0) {
        for (const issue of result.issues) {
          logger.raw(`   └─ ${issue}`);
        }
      }

      logger.newline();
    }
  }

  // Recommendations
  if (error > 0) {
    logger.warn('⚠️  Some skills have errors. Run with --fix to attempt automatic repair.');
  }
  if (updates > 0) {
    logger.info('💡 Run "skillset update" to update all skills.');
  }
}

/**
 * Get status icon for health status
 */
function getStatusIcon(status: string): string {
  switch (status) {
    case 'healthy':
      return '✅';
    case 'warning':
      return '⚠️ ';
    case 'error':
      return '❌';
    case 'update-available':
      return '📦';
    default:
      return '❓';
  }
}

/**
 * Attempt to automatically fix issues
 */
async function autoFixIssues(
  results: SkillHealth[],
  scope: InstallScope,
  projectRoot: string | undefined,
  sourceManager: SourceManager
): Promise<void> {
  logger.newline();
  logger.info('🔧 Attempting automatic fixes...');
  logger.newline();

  let fixed = 0;

  for (const result of results) {
    if (result.status === 'error' || result.status === 'warning') {
      // Try to reinstall skills with errors
      const skillsPath = scope === 'global'
        ? getGlobalSkillsPath()
        : getProjectSkillsPath(projectRoot || '');
      const skillPath = path.join(skillsPath, result.id);

      // Remove broken skill
      try {
        await fs.remove(skillPath);
        logger.success(`Removed broken skill: ${result.id}`);

        // Try to reinstall from source
        const skill = await sourceManager.findSkill(result.id);
        if (skill) {
          const installer = new SkillInstaller();
          await installer.install(skill, { scope, projectRoot, force: true });
          fixed++;
          logger.success(`Reinstalled: ${result.id}`);
        } else {
          logger.warn(`Could not find source for: ${result.id}`);
        }
      } catch (err) {
        logger.error(`Failed to fix ${result.id}: ${(err as Error).message}`);
      }

      logger.newline();
    }
  }

  if (fixed > 0) {
    logger.success(`✅ Fixed ${fixed} skill(s).`);
  } else {
    logger.info('No issues could be automatically fixed.');
  }
}
