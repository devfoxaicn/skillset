/**
 * Update command implementation
 */

import { Command } from 'commander';
import { SourceManager } from '../core';
import { SkillInstaller } from '../core/installer';
import { configLoader } from '../config';
import { logger, findProjectRoot } from '../utils';

/**
 * Create update command
 */
export function createUpdateCommand(): Command {
  const command = new Command('update');

  command
    .description('Update installed skills')
    .argument('[skill]', 'Skill ID to update (leave empty to update all)')
    .option('-s, --scope <scope>', 'Update scope (global or project)', 'global')
    .option('-p, --project-root <path>', 'Project root path')
    .option('--check-only', 'Only check for updates without installing')
    .action(async (skillId, options) => {
      await handleUpdate(skillId, options);
    });

  return command;
}

/**
 * Handle update command logic
 */
async function handleUpdate(skillId: string | undefined, options: {
  scope: 'global' | 'project';
  projectRoot?: string;
  checkOnly?: boolean;
}): Promise<void> {
  try {
    // Determine project root
    let projectRoot = options.projectRoot;
    if (options.scope === 'project' && !projectRoot) {
      const root = findProjectRoot();
      if (!root) {
        logger.error('Could not find project root. Run from a project directory or specify --project-root.');
        return;
      }
      projectRoot = root;
    }

    // Load configuration
    const { config } = await configLoader.load();

    // Initialize source manager
    const sourceManager = await SourceManager.fromConfigs(config.sources || []);
    const installer = new SkillInstaller();

    // Get installed skills
    const installed = await installer.getInstalled(options.scope, projectRoot);

    if (installed.length === 0) {
      logger.info('No skills installed.');
      return;
    }

    // Filter by skill ID if specified
    const toUpdate = skillId
      ? installed.filter((s) => s.id === skillId)
      : installed;

    if (toUpdate.length === 0) {
      logger.info(`No skills${skillId ? ` matching "${skillId}"` : ''} found.`);
      return;
    }

    logger.newline();
    logger.info(`Checking for updates for ${toUpdate.length} skill${toUpdate.length > 1 ? 's' : ''}...`);
    logger.newline();

    const updates: Array<{ id: string; current: string; latest: string; skill: any }> = [];

    // Check each skill for updates
    for (const { id, meta } of toUpdate) {
      const currentVersion = meta?.version || 'unknown';

      try {
        const skill = await sourceManager.findSkill(id);

        if (!skill) {
          logger.warn(`⚠ ${id}: Not found in sources (may have been removed)`);
          continue;
        }

        if (skill.version !== currentVersion) {
          updates.push({
            id,
            current: currentVersion,
            latest: skill.version,
            skill,
          });
          logger.info(`↻ ${id}: ${currentVersion} → ${skill.version}`);
        } else {
          logger.info(`✓ ${id}: Already up to date (${currentVersion})`);
        }
      } catch (error) {
        logger.warn(`⚠ ${id}: Failed to check for updates`);
      }
    }

    // Summary
    logger.newline();

    if (updates.length === 0) {
      logger.success('All skills are up to date!');
      return;
    }

    logger.info(`${updates.length} update${updates.length > 1 ? 's' : ''} available:`);
    for (const update of updates) {
      logger.raw(`  • ${update.id}: ${update.current} → ${update.latest}`);
    }
    logger.newline();

    // Check only mode
    if (options.checkOnly) {
      logger.info('Run without --check-only to install updates.');
      return;
    }

    // Install updates
    logger.startSpinner('Installing updates...');

    const results: Array<{ id: string; success: boolean }> = [];

    for (const update of updates) {
      try {
        const result = await installer.install(update.skill, {
          scope: options.scope,
          projectRoot,
          force: true,
        });

        results.push({
          id: update.id,
          success: result.success,
        });
      } catch (error) {
        results.push({
          id: update.id,
          success: false,
        });
        logger.debug(`Failed to update ${update.id}: ${(error as Error).message}`);
      }
    }

    logger.stopSpinner();

    // Results summary
    const succeeded = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    logger.newline();

    if (succeeded > 0) {
      logger.success(`Updated ${succeeded} skill${succeeded > 1 ? 's' : ''}`);
    }

    if (failed > 0) {
      logger.warn(`Failed to update ${failed} skill${failed > 1 ? 's' : ''}`);
      for (const result of results.filter((r) => !r.success)) {
        logger.raw(`  • ${result.id}`);
      }
    }
  } catch (error) {
    logger.error(`Update failed: ${(error as Error).message}`);
    process.exit(1);
  }
}
