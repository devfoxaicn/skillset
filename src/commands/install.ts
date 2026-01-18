/**
 * Install command implementation
 */

import { Command } from 'commander';
import inquirer from 'inquirer';
import { SourceManager } from '../core';
import { SkillInstaller } from '../core/installer';
import { configLoader } from '../config';
import { logger, findProjectRoot } from '../utils';
import { DEFAULT_SEARCH_LIMIT } from '../constants';

/**
 * Create install command
 */
export function createInstallCommand(): Command {
  const command = new Command('install');

  command
    .description('Install a Claude skill')
    .argument('[skill]', 'Skill ID or name (leave empty to search interactively)')
    .option('-s, --scope <scope>', 'Install scope', 'global')
    .option('-p, --project-root <path>', 'Project root path')
    .option('-f, --force', 'Force reinstall if already installed')
    .option('--dry-run', 'Show what would be installed without actually installing')
    .option('--source <name>', 'Install from specific source')
    .action(async (skillId, options) => {
      await handleInstall(skillId, options);
    });

  return command;
}

/**
 * Handle install command logic
 */
async function handleInstall(skillId: string, options: {
  scope: 'global' | 'project';
  projectRoot?: string;
  force?: boolean;
  dryRun?: boolean;
  source?: string;
}): Promise<void> {
  try {
    // Load configuration
    const { config } = await configLoader.load();

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

    // Initialize source manager
    const sourceManager = await SourceManager.fromConfigs(config.sources || []);
    const installer = new SkillInstaller();

    // Get skill ID if not provided
    if (!skillId) {
      const answer = await inquirer.prompt([
        {
          type: 'input',
          name: 'search',
          message: 'Search for a skill:',
          validate: (input: string) => input.trim().length > 0 || 'Please enter a search term',
        },
      ]);

      const results = await sourceManager.searchSkills(answer.search);
      if (results.length === 0) {
        logger.info('No skills found matching your search.');
        return;
      }

      const choices = results.slice(0, DEFAULT_SEARCH_LIMIT).map((s) => ({
        name: `${s.name} - ${s.description} (${s.source})`,
        value: s.id,
      }));

      const selected = await inquirer.prompt([
        {
          type: 'list',
          name: 'skillId',
          message: 'Select a skill to install:',
          choices,
        },
      ]);

      skillId = selected.skillId;
    }

    // Find the skill
    logger.debug(`Looking for skill: ${skillId}`);
    const skill = await sourceManager.findSkill(skillId);

    if (!skill) {
      logger.error(`Skill not found: ${skillId}`);
      logger.info('Use "claude-skills search" to find available skills.');
      return;
    }

    // Check for specific source filter
    if (options.source && skill.source !== options.source) {
      logger.error(`Skill ${skillId} is from source "${skill.source}", not "${options.source}"`);
      return;
    }

    // Show skill info
    logger.newline();
    logger.info(`Name: ${skill.name}`);
    logger.info(`Description: ${skill.description}`);
    logger.info(`Version: ${skill.version}`);
    logger.info(`Source: ${skill.source}`);
    if (skill.tags.length > 0) {
      logger.info(`Tags: ${skill.tags.join(', ')}`);
    }
    if (skill.dependencies && skill.dependencies.length > 0) {
      logger.info(`Dependencies: ${skill.dependencies.join(', ')}`);
    }
    logger.newline();

    // Confirm installation
    if (!options.dryRun) {
      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: `Install ${skill.name}?`,
          default: true,
        },
      ]);

      if (!confirm) {
        logger.info('Installation cancelled.');
        return;
      }
    }

    // Install the skill
    const result = await installer.install(skill, {
      scope: options.scope,
      projectRoot,
      force: options.force,
      dryRun: options.dryRun,
    });

    if (result.success) {
      logger.success(`Installed ${skill.name} to ${result.location}`);
    } else {
      logger.error(`Installation failed: ${result.error}`);
      process.exit(1);
    }
  } catch (error) {
    logger.error(`Install failed: ${(error as Error).message}`);
    process.exit(1);
  }
}
