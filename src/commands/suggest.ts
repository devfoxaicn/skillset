/**
 * Suggest command implementation - Project-aware skill recommendations
 */

import { Command } from 'commander';
import * as fs from 'fs-extra';
import path from 'path';
import { SourceManager } from '../core';
import { configLoader } from '../config';
import { logger, findProjectRoot } from '../utils';
import type { SkillMetadata } from '../types';

/**
 * Project type detection result
 */
interface ProjectType {
  name: string;
  confidence: number;
  recommendedSkills: string[];
  reason: string;
}

/**
 * Create suggest command
 */
export function createSuggestCommand(): Command {
  const command = new Command('suggest');

  command
    .description('Suggest skills based on your project')
    .option('-l, --limit <number>', 'Limit suggestions', '10')
    .option('--show-all', 'Show all recommendations including installed')
    .action(async (options) => {
      await handleSuggest(options);
    });

  return command;
}

/**
 * Handle suggest command logic
 */
async function handleSuggest(options: {
  limit: string;
  showAll?: boolean;
}): Promise<void> {
  try {
    const limit = parseInt(options.limit) || 10;

    logger.info('🔍 Analyzing your project...');
    logger.newline();

    // Detect project root
    const projectRoot = findProjectRoot();
    if (!projectRoot) {
      logger.warn('⚠️  Not in a project directory.');
      logger.info('Run this command from a project root for better recommendations.');
      logger.newline();
      // Still provide general recommendations
    }

    // Detect project type
    const projectType = await detectProjectType(projectRoot);

    if (projectType) {
      logger.info(`📁 Detected Project: ${projectType.name}`);
      logger.info(`   ${projectType.reason}`);
      logger.newline();
    }

    // Load available skills
    const { config } = await configLoader.load();
    const sourceManager = await SourceManager.fromConfigs(config.sources || []);

    logger.startSpinner('Finding relevant skills...');

    const allSkills = await sourceManager.listAllSkills();

    // Get installed skills (to filter them out)
    const globalSkillsPath = path.join(
      process.env.HOME || process.env.USERPROFILE || '',
      '.claude',
      'skills'
    );
    const projectSkillsPath = projectRoot
      ? path.join(projectRoot, '.claude', 'skills')
      : null;

    const installedIds = new Set<string>();

    try {
      if (await fs.pathExists(globalSkillsPath)) {
        const globalDirs = await fs.readdir(globalSkillsPath);
        globalDirs.forEach(id => installedIds.add(id));
      }
    } catch (err) {
      // Ignore
    }

    try {
      if (projectSkillsPath && await fs.pathExists(projectSkillsPath)) {
        const projectDirs = await fs.readdir(projectSkillsPath);
        projectDirs.forEach(id => installedIds.add(id));
      }
    } catch (err) {
      // Ignore
    }

    logger.stopSpinner();

    // Score and rank skills
    const scoredSkills = scoreSkills(allSkills, projectType, installedIds);

    // Filter out installed if not showing all
    const filteredSkills = options.showAll
      ? scoredSkills
      : scoredSkills.filter(s => !s.installed);

    // Limit results
    const suggestions = filteredSkills.slice(0, limit);

    // Display suggestions
    if (suggestions.length === 0) {
      logger.info('😕 No new skills to suggest.');
      logger.newline();
      logger.info('All recommended skills are already installed!');
      if (!options.showAll) {
        logger.info('Run with --show-all to see all recommendations.');
      }
      return;
    }

    logger.newline();
    logger.success(`✨ Found ${suggestions.length} skill${suggestions.length > 1 ? 's' : ''} for your project:`);
    logger.newline();

    for (let i = 0; i < suggestions.length; i++) {
      const { skill, score, reasons, installed } = suggestions[i];
      const rank = i + 1;

      const statusIcon = installed ? '✓' : '🆕';
      const scorePercent = Math.round(score * 100);

      logger.raw(`${statusIcon}  ${rank}. ${skill.name} (${skill.id})`);
      logger.raw(`    ${skill.description}`);
      logger.raw(`    └─ Relevance: ${scorePercent}% | Source: ${skill.source} | v${skill.version}`);

      if (reasons.length > 0) {
        logger.raw(`    └─ Why recommended:`);
        for (const reason of reasons.slice(0, 2)) {
          logger.raw(`       • ${reason}`);
        }
      }

      logger.newline();
    }

    // Installation hint
    const newSuggestions = suggestions.filter(s => !s.installed);
    if (newSuggestions.length > 0) {
      logger.info(`💡 Run "skillset install <id>" to install a skill.`);
      logger.info(`   Or install all suggestions: skillset install ${newSuggestions.map(s => s.skill.id).join(' ')}`);
    }

  } catch (error) {
    logger.error(`Suggest failed: ${(error as Error).message}`);
    process.exit(1);
  }
}

/**
 * Detect project type
 */
async function detectProjectType(projectRoot: string | null): Promise<ProjectType | null> {
  if (!projectRoot) {
    return null;
  }

  const checks: ProjectType[] = [];

  // Check for Node.js projects
  if (await fs.pathExists(path.join(projectRoot, 'package.json'))) {
    try {
      const pkg = await fs.readJson(path.join(projectRoot, 'package.json'));
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };

      const isReact = Object.keys(deps).some(d =>
        d.includes('react') || d.includes('next')
      );
      const isVue = Object.keys(deps).some(d =>
        d.includes('vue')
      );
      const isNode = !isReact && !isVue;

      if (isReact) {
        checks.push({
          name: 'React / Next.js',
          confidence: 0.9,
          recommendedSkills: ['react', 'eslint', 'testing', 'code-review'],
          reason: 'Found package.json with React/Next.js dependencies',
        });
      } else if (isVue) {
        checks.push({
          name: 'Vue.js',
          confidence: 0.9,
          recommendedSkills: ['vue', 'eslint', 'testing'],
          reason: 'Found package.json with Vue dependencies',
        });
      } else {
        checks.push({
          name: 'Node.js',
          confidence: 0.8,
          recommendedSkills: ['eslint', 'testing', 'code-review'],
          reason: 'Found package.json',
        });
      }
    } catch (err) {
      // Invalid package.json
    }
  }

  // Check for Python projects
  if (await fs.pathExists(path.join(projectRoot, 'requirements.txt')) ||
      await fs.pathExists(path.join(projectRoot, 'pyproject.toml')) ||
      await fs.pathExists(path.join(projectRoot, 'setup.py'))) {
    checks.push({
      name: 'Python',
      confidence: 0.85,
      recommendedSkills: ['python', 'testing'],
      reason: 'Found Python project files',
    });
  }

  // Check for Go projects
  if (await fs.pathExists(path.join(projectRoot, 'go.mod'))) {
    checks.push({
      name: 'Go',
      confidence: 0.9,
      recommendedSkills: ['testing', 'code-review'],
      reason: 'Found go.mod',
    });
  }

  // Check for Rust projects
  if (await fs.pathExists(path.join(projectRoot, 'Cargo.toml'))) {
    checks.push({
      name: 'Rust',
      confidence: 0.9,
      recommendedSkills: ['testing', 'code-review'],
      reason: 'Found Cargo.toml',
    });
  }

  // Check for Git repository
  if (await fs.pathExists(path.join(projectRoot, '.git'))) {
    checks.push({
      name: 'Git Repository',
      confidence: 0.7,
      recommendedSkills: ['commit', 'git'],
      reason: 'Git repository detected',
    });
  }

  // Check for documentation
  const hasDocs = await fs.pathExists(path.join(projectRoot, 'docs')) ||
                  await fs.pathExists(path.join(projectRoot, 'README.md'));
  if (hasDocs) {
    checks.push({
      name: 'Documented Project',
      confidence: 0.6,
      recommendedSkills: ['docx', 'pdf'],
      reason: 'Documentation files found',
    });
  }

  // Return highest confidence match
  if (checks.length > 0) {
    checks.sort((a, b) => b.confidence - a.confidence);
    return checks[0];
  }

  return null;
}

/**
 * Score skills based on project type
 */
interface ScoredSkill {
  skill: SkillMetadata;
  score: number;
  reasons: string[];
  installed: boolean;
}

function scoreSkills(
  skills: SkillMetadata[],
  projectType: ProjectType | null,
  installedIds: Set<string>
): ScoredSkill[] {
  const scored: ScoredSkill[] = [];

  for (const skill of skills) {
    let score = 0;
    const reasons: string[] = [];
    const installed = installedIds.has(skill.id);

    // Base score for new skills
    if (!installed) {
      score += 0.1;
    }

    if (projectType) {
      // Boost recommended skills for project type
      if (projectType.recommendedSkills.includes(skill.id)) {
        score += 0.4;
        reasons.push(`Recommended for ${projectType.name} projects`);
      }

      // Check if skill matches project category
      const skillLower = skill.id.toLowerCase();
      const nameLower = skill.name.toLowerCase();
      const descLower = skill.description.toLowerCase();

      // Project-specific matching
      if (projectType.name.includes('React') || projectType.name.includes('Next')) {
        if (skillLower.includes('react') || nameLower.includes('react')) {
          score += 0.3;
          reasons.push('React-specific tool');
        }
        if (skillLower.includes('frontend') || descLower.includes('frontend')) {
          score += 0.2;
          reasons.push('Frontend development tool');
        }
      }

      if (projectType.name.includes('Vue')) {
        if (skillLower.includes('vue') || nameLower.includes('vue')) {
          score += 0.3;
          reasons.push('Vue-specific tool');
        }
      }

      if (projectType.name.includes('Node') || projectType.name.includes('Python') ||
          projectType.name.includes('Go') || projectType.name.includes('Rust')) {
        if (skillLower.includes('test') || descLower.includes('test')) {
          score += 0.25;
          reasons.push('Testing framework');
        }
        if (skillLower.includes('lint') || descLower.includes('lint')) {
          score += 0.2;
          reasons.push('Code quality tool');
        }
        if (skillLower.includes('format')) {
          score += 0.15;
          reasons.push('Code formatter');
        }
      }

      if (projectType.name.includes('Git')) {
        if (skillLower.includes('git') || skillLower.includes('commit')) {
          score += 0.35;
          reasons.push('Git workflow tool');
        }
      }
    }

    // Tag-based matching
    const commonTags = ['code', 'development', 'testing', 'git', 'documentation'];
    for (const tag of commonTags) {
      if (skill.tags.includes(tag)) {
        score += 0.05;
      }
    }

    // Only include if there's some relevance
    if (score > 0.15 || reasons.length > 0) {
      scored.push({
        skill,
        score: Math.min(score, 1.0),
        reasons,
        installed,
      });
    }
  }

  // Sort by score
  scored.sort((a, b) => b.score - a.score);

  return scored;
}
