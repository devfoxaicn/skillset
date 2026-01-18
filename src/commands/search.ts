/**
 * Search command implementation
 */

import { Command } from 'commander';
import { SourceManager } from '../core';
import { configLoader } from '../config';
import { logger } from '../utils';
import { DEFAULT_SEARCH_LIMIT, MAX_SEARCH_LIMIT } from '../constants';

/**
 * Create search command
 */
export function createSearchCommand(): Command {
  const command = new Command('search');

  command
    .description('Search for available skills')
    .argument('<keyword>', 'Search keyword')
    .option('-t, --tag <tag>', 'Filter by tag')
    .option('-l, --limit <number>', 'Limit results', String(DEFAULT_SEARCH_LIMIT))
    .option('-s, --source <name>', 'Search specific source')
    .option('-v, --verbose', 'Show detailed information')
    .action(async (keyword, options) => {
      await handleSearch(keyword, options);
    });

  return command;
}

/**
 * Handle search command logic
 */
async function handleSearch(keyword: string, options: {
  tag?: string;
  limit: string;
  source?: string;
  verbose?: boolean;
}): Promise<void> {
  try {
    // Parse limit
    const limit = Math.min(
      Math.max(1, parseInt(options.limit) || DEFAULT_SEARCH_LIMIT),
      MAX_SEARCH_LIMIT
    );

    // Load configuration
    const { config } = await configLoader.load();

    // Initialize source manager
    const sourceManager = await SourceManager.fromConfigs(config.sources || []);

    // Perform search
    logger.startSpinner('Searching skills...');

    let results = await sourceManager.searchSkills(keyword);

    // Apply tag filter if specified
    if (options.tag) {
      const tag = options.tag.toLowerCase();
      results = results.filter((s) =>
        s.tags.some((t) => t.toLowerCase() === tag)
      );
    }

    // Apply source filter if specified
    if (options.source) {
      results = results.filter((s) => s.source === options.source);
    }

    // Limit results
    results = results.slice(0, limit);

    logger.stopSpinner();

    // Display results
    if (results.length === 0) {
      logger.info('No skills found matching your search.');
      return;
    }

    logger.newline();
    logger.info(`Found ${results.length} skill${results.length > 1 ? 's' : ''}:`);
    logger.newline();

    if (options.verbose) {
      // Detailed view
      for (const skill of results) {
        logger.info(`${skill.name} (${skill.id})`);
        logger.raw(`  Description: ${skill.description}`);
        logger.raw(`  Version: ${skill.version}`);
        logger.raw(`  Author: ${skill.author}`);
        logger.raw(`  Source: ${skill.source}`);
        if (skill.tags.length > 0) {
          logger.raw(`  Tags: ${skill.tags.join(', ')}`);
        }
        if (skill.homepage) {
          logger.raw(`  Homepage: ${skill.homepage}`);
        }
        logger.newline();
      }
    } else {
      // Table view
      const headers = ['Name', 'ID', 'Source', 'Description'];
      const rows = results.map((s) => [
        s.name,
        s.id,
        s.source,
        s.description.length > 50 ? s.description.slice(0, 47) + '...' : s.description,
      ]);
      logger.table(headers, rows);
    }

    logger.info(`Run "claude-skills install <id>" to install a skill.`);
  } catch (error) {
    logger.error(`Search failed: ${(error as Error).message}`);
    process.exit(1);
  }
}
