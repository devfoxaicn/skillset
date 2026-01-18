/**
 * List command implementation
 */

import { Command } from 'commander';
import { SkillInstaller } from '../core/installer';
import { findProjectRoot } from '../utils';
import { logger } from '../utils';

/**
 * Create list command
 */
export function createListCommand(): Command {
  const command = new Command('list');

  command
    .description('List installed skills')
    .option('-s, --scope <scope>', 'List scope (global or project)', 'global')
    .option('-p, --project-root <path>', 'Project root path')
    .option('-v, --verbose', 'Show detailed information')
    .action(async (options) => {
      await handleList(options);
    });

  return command;
}

/**
 * Handle list command logic
 */
async function handleList(options: {
  scope: 'global' | 'project';
  projectRoot?: string;
  verbose?: boolean;
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

    // Get installed skills
    const installer = new SkillInstaller();
    const installed = await installer.getInstalled(options.scope, projectRoot);

    if (installed.length === 0) {
      logger.info(`No skills installed in ${options.scope} scope.`);
      logger.info(`Use "claude-skills install" to add skills.`);
      return;
    }

    logger.newline();
    logger.info(`Installed skills (${options.scope}):`);
    logger.newline();

    if (options.verbose) {
      // Detailed view
      for (const { id, meta } of installed) {
        logger.info(`${id}`);
        if (meta) {
          logger.raw(`  Name: ${meta.name}`);
          logger.raw(`  Version: ${meta.version}`);
          logger.raw(`  Source: ${meta.source}`);
          if (meta.installedAt) {
            logger.raw(`  Installed: ${new Date(meta.installedAt).toLocaleDateString()}`);
          }
          if (meta.dependencies && meta.dependencies.length > 0) {
            logger.raw(`  Dependencies: ${meta.dependencies.join(', ')}`);
          }
        }
        logger.newline();
      }
    } else {
      // Table view
      const headers = ['ID', 'Name', 'Version', 'Source'];
      const rows = installed.map(({ id, meta }) => [
        id,
        meta?.name || id,
        meta?.version || 'unknown',
        meta?.source || 'unknown',
      ]);
      logger.table(headers, rows);
    }
  } catch (error) {
    logger.error(`List failed: ${(error as Error).message}`);
    process.exit(1);
  }
}
