/**
 * Config command implementation
 */

import { Command } from 'commander';
import inquirer from 'inquirer';
import * as fs from 'fs-extra';
import path from 'path';
import { configLoader } from '../config';
import { logger, findProjectRoot } from '../utils';

// Local type definitions to avoid import issues
type SourceType = 'github' | 'local' | 'custom';

interface GitHubSourceConfig {
  type: 'github';
  name: string;
  enabled: boolean;
  priority?: number;
  github: {
    owner: string;
    repo: string;
    branch?: string;
    skillsPath?: string;
  };
}

interface LocalSourceConfig {
  type: 'local';
  name: string;
  enabled: boolean;
  priority?: number;
  local: {
    path: string;
  };
}

interface CustomSourceConfig {
  type: 'custom';
  name: string;
  enabled: boolean;
  priority?: number;
  custom: {
    url: string;
    headers?: Record<string, string>;
    transform?: string;
  };
}

type AnySourceConfig = GitHubSourceConfig | LocalSourceConfig | CustomSourceConfig;

interface CacheConfig {
  enabled?: boolean;
  ttl?: number;
}

interface ClaudeSkillsConfig {
  sources?: AnySourceConfig[];
  installPath?: {
    global?: string;
    project?: string;
  };
  cache?: CacheConfig;
  defaultScope?: 'global' | 'project';
}

/**
 * Create config command
 */
export function createConfigCommand(): Command {
  const command = new Command('config');

  command
    .description('Manage configuration')
    .option('-l, --list', 'List current configuration')
    .option('-s, --set <key=value>', 'Set a configuration value')
    .option('-g, --get <key>', 'Get a configuration value')
    .option('-e, --edit', 'Edit configuration file')
    .option('--init', 'Initialize configuration file')
    .option('--global', 'Use global configuration')
    .action(async (options) => {
      await handleConfig(options);
    });

  return command;
}

/**
 * Handle config command logic
 */
async function handleConfig(options: {
  list?: boolean;
  set?: string;
  get?: string;
  edit?: boolean;
  init?: boolean;
  global?: boolean;
}): Promise<void> {
  try {
    // Determine config path
    let configPath: string;

    if (options.global) {
      configPath = configLoader.getGlobalConfigPath();
    } else {
      const projectRoot = findProjectRoot();
      if (projectRoot) {
        configPath = path.join(projectRoot, '.claude-skills.json');
      } else {
        logger.warn('Not in a project directory, using global configuration');
        configPath = configLoader.getGlobalConfigPath();
      }
    }

    // Initialize new config
    if (options.init) {
      await initConfig(configPath);
      return;
    }

    // Edit configuration
    if (options.edit) {
      await editConfig(configPath);
      return;
    }

    // Set configuration value
    if (options.set) {
      await setConfigValue(configPath, options.set);
      return;
    }

    // Get configuration value
    if (options.get) {
      await getConfigValue(configPath, options.get);
      return;
    }

    // List configuration (default action)
    await listConfig(configPath);
  } catch (error) {
    logger.error(`Config command failed: ${(error as Error).message}`);
    process.exit(1);
  }
}

/**
 * Initialize new configuration file
 */
async function initConfig(configPath: string): Promise<void> {
  if (await fs.pathExists(configPath)) {
    const { overwrite } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'overwrite',
        message: 'Configuration file already exists. Overwrite?',
        default: false,
      },
    ]);

    if (!overwrite) {
      logger.info('Cancelled.');
      return;
    }
  }

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'defaultScope',
      message: 'Default install scope:',
      default: 'global',
      choices: ['global', 'project'],
    },
    {
      type: 'confirm',
      name: 'cacheEnabled',
      message: 'Enable caching?',
      default: true,
    },
    {
      type: 'number',
      name: 'cacheTtl',
      message: 'Cache TTL (hours):',
      default: 24,
      when: (answers: any) => answers.cacheEnabled,
    },
  ]);

  const config: ClaudeSkillsConfig = {
    defaultScope: answers.defaultScope,
    cache: answers.cacheEnabled
      ? {
          enabled: true,
          ttl: answers.cacheTtl * 3600,
        }
      : {
          enabled: false,
        },
    sources: [
      {
        type: 'github',
        name: 'official',
        enabled: true,
        priority: 100,
        github: {
          owner: 'anthropics',
          repo: 'skills',
          branch: 'main',
          skillsPath: 'skills',
        },
      },
    ],
  };

  await configLoader.save(config, configPath);
  logger.success(`Configuration created: ${configPath}`);
}

/**
 * Edit configuration file
 */
async function editConfig(configPath: string): Promise<void> {
  let config: ClaudeSkillsConfig;

  if (await fs.pathExists(configPath)) {
    const loaded = await configLoader.loadFile(configPath);
    config = loaded.config as ClaudeSkillsConfig;
  } else {
    config = {
      sources: [],
      cache: {
        enabled: true,
        ttl: 24 * 60 * 60,
      },
      defaultScope: 'global',
    };
  }

  // Interactive editing
  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'What would you like to do?',
      choices: [
        { name: 'Add a new source', value: 'add-source' },
        { name: 'Remove a source', value: 'remove-source' },
        { name: 'Change default scope', value: 'scope' },
        { name: 'Configure cache', value: 'cache' },
        { name: 'Show current config', value: 'show' },
      ],
    },
  ]);

  switch (answers.action) {
    case 'add-source':
      await addSource(config);
      break;
    case 'remove-source':
      await removeSource(config);
      break;
    case 'scope':
      await changeScope(config);
      break;
    case 'cache':
      await configureCache(config);
      break;
    case 'show':
      logger.newline();
      logger.info(JSON.stringify(config, null, 2));
      break;
  }

  await configLoader.save(config, configPath);
  logger.success(`Configuration saved: ${configPath}`);
}

/**
 * Add a new source
 */
async function addSource(config: ClaudeSkillsConfig): Promise<void> {
  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'type',
      message: 'Source type:',
      choices: [
        { name: 'GitHub repository', value: 'github' },
        { name: 'Local directory', value: 'local' },
      ],
    },
    {
      type: 'input',
      name: 'name',
      message: 'Source name:',
      validate: (input: string) => input.trim().length > 0 || 'Name is required',
    },
    {
      type: 'input',
      name: 'repo',
      message: 'Repository (owner/repo):',
      when: (answers: any) => answers.type === 'github',
      validate: (input: string) => {
        if (!input.includes('/')) return 'Must be in format "owner/repo"';
        return true;
      },
    },
    {
      type: 'input',
      name: 'localPath',
      message: 'Local path:',
      when: (answers: any) => answers.type === 'local',
      validate: (input: string) => input.trim().length > 0 || 'Path is required',
    },
  ]);

  let source: AnySourceConfig;

  if (answers.type === 'github') {
    const [owner, repo] = answers.repo.split('/');
    source = {
      type: 'github',
      name: answers.name,
      enabled: true,
      priority: 50,
      github: { owner, repo },
    };
  } else {
    source = {
      type: 'local',
      name: answers.name,
      enabled: true,
      priority: 50,
      local: { path: answers.localPath },
    };
  }

  config.sources = config.sources || [];
  config.sources.push(source);
  logger.success(`Source "${answers.name}" added`);
}

/**
 * Remove a source
 */
async function removeSource(config: ClaudeSkillsConfig): Promise<void> {
  if (!config.sources || config.sources.length === 0) {
    logger.info('No sources configured');
    return;
  }

  const { sourceName } = await inquirer.prompt([
    {
      type: 'list',
      name: 'sourceName',
      message: 'Select source to remove:',
      choices: config.sources.map((s: AnySourceConfig) => ({ name: s.name, value: s.name })),
    },
  ]);

  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: `Remove source "${sourceName}"?`,
      default: false,
    },
  ]);

  if (confirm) {
    config.sources = config.sources.filter((s: AnySourceConfig) => s.name !== sourceName);
    logger.success(`Source "${sourceName}" removed`);
  }
}

/**
 * Change default scope
 */
async function changeScope(config: ClaudeSkillsConfig): Promise<void> {
  const { scope } = await inquirer.prompt([
    {
      type: 'list',
      name: 'scope',
      message: 'Default install scope:',
      choices: ['global', 'project'],
      default: config.defaultScope || 'global',
    },
  ]);

  config.defaultScope = scope;
  logger.success(`Default scope set to "${scope}"`);
}

/**
 * Configure cache
 */
async function configureCache(config: ClaudeSkillsConfig): Promise<void> {
  const answers = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'enabled',
      message: 'Enable caching?',
      default: config.cache?.enabled ?? true,
    },
    {
      type: 'number',
      name: 'ttl',
      message: 'Cache TTL (hours):',
      default: Math.round((config.cache?.ttl || 24 * 60 * 60) / 3600),
      when: (answers: any) => answers.enabled,
    },
  ]);

  config.cache = answers.enabled
    ? { enabled: true, ttl: answers.ttl * 3600 }
    : { enabled: false };

  logger.success(`Cache ${answers.enabled ? 'enabled' : 'disabled'}`);
}

/**
 * Set configuration value
 */
async function setConfigValue(configPath: string, keyValue: string): Promise<void> {
  const [key, ...valueParts] = keyValue.split('=');
  const value = valueParts.join('=');

  if (!value) {
    logger.error('Invalid format. Use: --set key=value');
    return;
  }

  let config: ClaudeSkillsConfig;

  if (await fs.pathExists(configPath)) {
    const loaded = await configLoader.loadFile(configPath);
    config = loaded.config as ClaudeSkillsConfig;
  } else {
    config = {};
  }

  // Simple key path resolution (supports nested keys with dot notation)
  const keys = key.split('.');
  let current: any = config;

  for (let i = 0; i < keys.length - 1; i++) {
    if (!(keys[i] in current)) {
      current[keys[i]] = {};
    }
    current = current[keys[i]];
  }

  // Parse value (try JSON, fallback to string)
  try {
    current[keys[keys.length - 1]] = JSON.parse(value);
  } catch {
    current[keys[keys.length - 1]] = value;
  }

  await configLoader.save(config, configPath);
  logger.success(`Set ${key} = ${value}`);
}

/**
 * Get configuration value
 */
async function getConfigValue(configPath: string, key: string): Promise<void> {
  let config: ClaudeSkillsConfig;

  if (await fs.pathExists(configPath)) {
    const loaded = await configLoader.loadFile(configPath);
    config = loaded.config as ClaudeSkillsConfig;
  } else {
    logger.info('Configuration file not found');
    return;
  }

  const keys = key.split('.');
  let current: any = config;

  for (const k of keys) {
    if (current && typeof current === 'object' && k in current) {
      current = current[k];
    } else {
      logger.info(`Key "${key}" not found`);
      return;
    }
  }

  logger.newline();
  if (typeof current === 'object') {
    logger.info(JSON.stringify(current, null, 2));
  } else {
    logger.info(String(current));
  }
}

/**
 * List configuration
 */
async function listConfig(configPath: string): Promise<void> {
  if (!await fs.pathExists(configPath)) {
    logger.info(`Configuration file: ${configPath} (not found)`);
    logger.info('Run with --init to create a configuration file.');
    return;
  }

  const loaded = await configLoader.loadFile(configPath);

  logger.newline();
  logger.info(`Configuration file: ${configPath}`);
  logger.newline();

  const config = loaded.config;

  // Display default scope
  logger.info(`Default scope: ${config.defaultScope || 'global'}`);

  // Display sources
  if (config.sources && config.sources.length > 0) {
    logger.info(`Sources (${config.sources.length}):`);
    for (const source of config.sources) {
      const enabled = source.enabled !== false ? '✓' : '✗';
      logger.raw(`  ${enabled} ${source.name} (${source.type})`);
    }
  }

  // Display cache config
  if (config.cache) {
    const cacheStatus = config.cache.enabled ? 'enabled' : 'disabled';
    logger.info(`Cache: ${cacheStatus}`);
    if (config.cache.enabled && config.cache.ttl) {
      const ttlHours = Math.round(config.cache.ttl / 3600);
      logger.raw(`  TTL: ${ttlHours}h`);
    }
  }
}
