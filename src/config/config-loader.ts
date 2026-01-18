/**
 * Configuration loader using Cosmiconfig
 */

import { cosmiconfig } from 'cosmiconfig';
import path from 'path';
import * as fs from 'fs-extra';
import type {
  ClaudeSkillsConfig,
  AnySourceConfig,
} from '../types';
import { DEFAULT_CONFIG_FILES, OFFICIAL_GITHUB_SOURCE } from '../constants';
import { logger } from '../utils';

/** Loaded configuration with metadata */
export interface LoadedConfig {
  /** The loaded configuration */
  config: ClaudeSkillsConfig;
  /** Path to config file (if found) */
  filepath?: string;
  /** Whether config is empty/default */
  isEmpty: boolean;
}

/** Singleton configuration loader */
class ConfigLoader {
  private cache?: LoadedConfig;
  private explorer: ReturnType<typeof cosmiconfig>;

  constructor() {
    this.explorer = cosmiconfig('claude-skills', {
      searchPlaces: [
        '.claude-skills.json',
        'package.json',
        '.claude-skills.config.js',
        '.claude-skills.config.cjs',
      ],
      loaders: {
        '.json': this.loadJson.bind(this),
        'package.json': this.loadPackageJson.bind(this),
        '.js': this.loadJs.bind(this),
        '.cjs': this.loadJs.bind(this),
        'noExt': this.loadJson.bind(this),
      },
    });
  }

  /**
   * Load configuration from project directory
   */
  async load(searchFrom = process.cwd()): Promise<LoadedConfig> {
    // Return cached config if available
    if (this.cache) {
      return this.cache;
    }

    try {
      const result = await this.explorer.search(searchFrom);

      if (result) {
        logger.debug(`Loaded config from: ${result.filepath}`);
        this.cache = {
          config: this.normalizeConfig(result.config as ClaudeSkillsConfig),
          filepath: result.filepath,
          isEmpty: false,
        };
        return this.cache;
      }
    } catch (error) {
      logger.warn(`Failed to load config: ${(error as Error).message}`);
    }

    // Return default config
    this.cache = {
      config: this.getDefaultConfig(),
      isEmpty: true,
    };
    return this.cache;
  }

  /**
   * Load configuration from a specific file
   */
  async loadFile(filepath: string): Promise<LoadedConfig> {
    try {
      const result = await this.explorer.load(filepath);

      if (result) {
        return {
          config: this.normalizeConfig(result.config as ClaudeSkillsConfig),
          filepath: result.filepath,
          isEmpty: false,
        };
      }
    } catch (error) {
      throw new Error(`Failed to load config from ${filepath}: ${(error as Error).message}`);
    }

    throw new Error(`No configuration found at ${filepath}`);
  }

  /**
   * Clear cached configuration
   */
  clearCache(): void {
    this.cache = undefined;
  }

  /**
   * Get default configuration
   */
  private getDefaultConfig(): ClaudeSkillsConfig {
    return {
      sources: [OFFICIAL_GITHUB_SOURCE as AnySourceConfig],
      defaultScope: 'global',
      cache: {
        enabled: true,
        ttl: 24 * 60 * 60, // 24 hours
      },
    };
  }

  /**
   * Normalize and validate configuration
   */
  private normalizeConfig(config: ClaudeSkillsConfig): ClaudeSkillsConfig {
    const normalized = { ...config };

    // Ensure sources array exists and has official source
    if (!normalized.sources || normalized.sources.length === 0) {
      normalized.sources = [OFFICIAL_GITHUB_SOURCE as AnySourceConfig];
    } else {
      // Check if official source is included
      const hasOfficial = normalized.sources.some(
        (s) => s.name === 'official' || (s.type === 'github' && s.github?.owner === 'anthropics')
      );

      if (!hasOfficial) {
        normalized.sources.unshift(OFFICIAL_GITHUB_SOURCE as AnySourceConfig);
      }

      // Filter disabled sources and add priority
      normalized.sources = normalized.sources
        .filter((s) => s.enabled !== false)
        .map((s) => ({
          ...s,
          priority: s.priority ?? 50,
        }));
    }

    // Set default scope
    if (!normalized.defaultScope) {
      normalized.defaultScope = 'global';
    }

    // Normalize cache config
    if (!normalized.cache) {
      normalized.cache = { enabled: true, ttl: 24 * 60 * 60 };
    } else if (normalized.cache.enabled === undefined) {
      normalized.cache.enabled = true;
    }

    return normalized;
  }

  /**
   * JSON loader
   */
  private loadJson(filepath: string, content: string): ClaudeSkillsConfig | null {
    try {
      const parsed = JSON.parse(content);

      // For package.json, extract the claude-skills section
      if (path.basename(filepath) === 'package.json') {
        return parsed['claude-skills'] || null;
      }

      return parsed;
    } catch (error) {
      throw new Error(`Invalid JSON in ${filepath}: ${(error as Error).message}`);
    }
  }

  /**
   * Package.json loader
   */
  private loadPackageJson(filepath: string, content: string): ClaudeSkillsConfig | null {
    return this.loadJson(filepath, content);
  }

  /**
   * JS loader
   */
  private loadJs(filepath: string): ClaudeSkillsConfig | null {
    try {
      // Dynamic import for JS config files
      const resolved = require(filepath);
      return resolved?.default || resolved || null;
    } catch (error) {
      throw new Error(`Failed to load ${filepath}: ${(error as Error).message}`);
    }
  }

  /**
   * Save configuration to file
   */
  async save(config: ClaudeSkillsConfig, filepath: string): Promise<void> {
    try {
      await fs.ensureDir(path.dirname(filepath));

      if (filepath.endsWith('.json')) {
        await fs.writeJson(filepath, config, { spaces: 2 });
      } else {
        throw new Error(`Unsupported config file format: ${filepath}`);
      }

      this.clearCache();
      logger.debug(`Saved config to: ${filepath}`);
    } catch (error) {
      throw new Error(`Failed to save config: ${(error as Error).message}`);
    }
  }

  /**
   * Get global config path
   */
  getGlobalConfigPath(): string {
    const homeDir = process.platform === 'win32'
      ? process.env.APPDATA || path.join(process.env.USERPROFILE || '', 'AppData', 'Roaming')
      : process.env.HOME || '';

    return path.join(homeDir, '.claude-skills.json');
  }

  /**
   * Merge user config with default config
   */
  mergeWithDefault(userConfig: Partial<ClaudeSkillsConfig>): ClaudeSkillsConfig {
    const defaultConfig = this.getDefaultConfig();
    return {
      ...defaultConfig,
      ...userConfig,
      sources: userConfig.sources || defaultConfig.sources,
      cache: { ...defaultConfig.cache, ...userConfig.cache },
      installPath: { ...defaultConfig.installPath, ...userConfig.installPath },
    };
  }
}

// Export singleton instance
export const configLoader = new ConfigLoader();
