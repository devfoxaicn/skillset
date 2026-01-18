/**
 * Remove command implementation
 */

import { Command } from 'commander';
import inquirer from 'inquirer';
import { SkillInstaller } from '../core/installer';
import { findProjectRoot } from '../utils';
import { logger } from '../utils';

/**
 * Create remove command
 */
export function createRemoveCommand(): Command {
  const command = new Command('remove');

  command
    .alias('uninstall')
    .description('Remove an installed skill')
    .argument('<skill>', 'Skill ID to remove')
    .option('-s, --scope <scope>', 'Remove from scope', 'global')
    .option('-p, --project-root <path>', 'Project root path')
    .option('-y, --yes', 'Skip confirmation prompt')
    .action(async (skillId, options) => {
      await handleRemove(skillId, options);
    });

  return command;
}

/**
 * Handle remove command logic
 */
async function handleRemove(skillId: string, options: {
  scope: 'global' | 'project';
  projectRoot?: string;
  yes?: boolean;
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

    // Check if skill is installed
    const installer = new SkillInstaller();
    const isInstalled = await installer.isInstalled(skillId, options.scope, projectRoot);

    if (!isInstalled) {
      logger.error(`Skill not installed: ${skillId}`);
      process.exit(1);
    }

    // Confirm removal
    if (!options.yes) {
      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: `Remove skill "${skillId}" from ${options.scope}?`,
          default: false,
        },
      ]);

      if (!confirm) {
        logger.info('Removal cancelled.');
        return;
      }
    }

    // Remove the skill
    const success = await installer.uninstall(skillId, options.scope, projectRoot);

    if (success) {
      logger.success(`Removed ${skillId}`);
    } else {
      logger.error(`Failed to remove ${skillId}`);
      process.exit(1);
    }
  } catch (error) {
    logger.error(`Remove failed: ${(error as Error).message}`);
    process.exit(1);
  }
}
