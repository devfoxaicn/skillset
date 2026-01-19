#!/usr/bin/env node
/**
 * @claude-skills/cli
 *
 * One-click installation tool for Claude Skills library
 */

import { Command } from 'commander';
import { CLI_NAME, CLI_VERSION, CLI_DESCRIPTION } from './constants';
import { logger } from './utils';
import {
  createInstallCommand,
  createSearchCommand,
  createFindCommand,
  createListCommand,
  createCheckCommand,
  createSuggestCommand,
  createRemoveCommand,
  createCreateCommand,
  createUpdateCommand,
  createConfigCommand,
} from './commands';

/**
 * Main CLI application
 */
async function main(): Promise<void> {
  const program = new Command();

  program
    .name(CLI_NAME)
    .description(CLI_DESCRIPTION)
    .version(CLI_VERSION);

  // Add subcommands
  program.addCommand(createInstallCommand());
  program.addCommand(createSearchCommand());
  program.addCommand(createFindCommand());
  program.addCommand(createListCommand());
  program.addCommand(createCheckCommand());
  program.addCommand(createSuggestCommand());
  program.addCommand(createRemoveCommand());
  program.addCommand(createCreateCommand());
  program.addCommand(createUpdateCommand());
  program.addCommand(createConfigCommand());

  // Parse arguments
  await program.parseAsync(process.argv);
}

// Error handling
process.on('unhandledRejection', (error) => {
  logger.error(`Unexpected error: ${(error as Error).message}`);
  if (process.env.DEBUG) {
    console.error(error);
  }
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  logger.error(`Fatal error: ${(error as Error).message}`);
  if (process.env.DEBUG) {
    console.error(error);
  }
  process.exit(1);
});

// Run
main().catch((error) => {
  logger.error(`CLI failed: ${error.message}`);
  process.exit(1);
});
