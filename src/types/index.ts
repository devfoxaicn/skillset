/**
 * Core type definitions for Claude Skills CLI
 */

// ============================================================================
// Skill Types
// ============================================================================

/**
 * Skill metadata from source
 */
export interface SkillMetadata {
  /** Unique identifier (e.g., "pdf", "commit") */
  id: string;
  /** Display name */
  name: string;
  /** Short description for search */
  description: string;
  /** Semantic version */
  version: string;
  /** Author name */
  author: string;
  /** Source name (e.g., "official", "community") */
  source: string;
  /** Tags for categorization */
  tags: string[];
  /** Homepage URL */
  homepage?: string;
  /** Required skill dependencies */
  dependencies?: string[];
}

/**
 * Full skill with content
 */
export interface Skill extends SkillMetadata {
  /** Skill markdown content */
  content: string;
  /** Additional files (scripts, configs, etc.) */
  files?: SkillFile[];
}

/**
 * Additional file in a skill
 */
export interface SkillFile {
  /** File path relative to skill root */
  path: string;
  /** File content */
  content: string;
}

/**
 * Skill frontmatter from SKILL.md
 */
export interface SkillFrontmatter {
  name: string;
  description: string;
  version: string;
  author: string;
  tags?: string[];
  dependencies?: string[];
  claude_version?: string;
}

// ============================================================================
// Source Types
// ============================================================================

/**
 * Source type enumeration
 */
export type SourceType = 'github' | 'local' | 'custom';

/**
 * Base configuration for a skill source
 */
export interface SkillSourceConfig {
  /** Unique source name */
  name: string;
  /** Whether source is enabled */
  enabled: boolean;
  /** Source priority (higher = preferred) */
  priority?: number;
}

/**
 * GitHub source configuration
 */
export interface GitHubSourceConfig extends SkillSourceConfig {
  type: 'github';
  github: {
    /** Repository owner */
    owner: string;
    /** Repository name */
    repo: string;
    /** Branch to use (default: main) */
    branch?: string;
    /** Path to skills directory (default: skills/) */
    skillsPath?: string;
  };
}

/**
 * Local source configuration
 */
export interface LocalSourceConfig extends SkillSourceConfig {
  type: 'local';
  local: {
    /** Local filesystem path */
    path: string;
  };
}

/**
 * Custom source configuration
 */
export interface CustomSourceConfig extends SkillSourceConfig {
  type: 'custom';
  custom: {
    /** Base URL */
    url: string;
    /** Custom HTTP headers */
    headers?: Record<string, string>;
    /** Transform function module path */
    transform?: string;
  };
}

/**
 * Union type for all source configs
 */
export type AnySourceConfig = GitHubSourceConfig | LocalSourceConfig | CustomSourceConfig;

/**
 * Interface for skill source operations
 */
export interface SkillSource {
  /** Source name */
  readonly name: string;
  /** Source type */
  readonly type: SourceType;
  /** Source priority */
  readonly priority: number;

  /**
   * List all available skills from this source
   */
  listSkills(): Promise<SkillMetadata[]>;

  /**
   * Get a specific skill by ID
   */
  getSkill(skillId: string): Promise<Skill | null>;

  /**
   * Validate source is accessible
   */
  validate(): Promise<boolean>;
}

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Install path configuration
 */
export interface InstallPathConfig {
  /** Global install path (default: ~/.claude/skills) */
  global?: string;
  /** Project relative path (default: .claude/skills) */
  project?: string;
}

/**
 * Cache configuration
 */
export interface CacheConfig {
  /** Enable caching */
  enabled?: boolean;
  /** Time to live in seconds */
  ttl?: number;
  /** Custom cache path */
  path?: string;
}

/**
 * Main CLI configuration
 */
export interface ClaudeSkillsConfig {
  /** Available skill sources */
  sources?: AnySourceConfig[];
  /** Install path settings */
  installPath?: InstallPathConfig;
  /** Cache settings */
  cache?: CacheConfig;
  /** Default install scope */
  defaultScope?: 'global' | 'project';
}

// ============================================================================
// Installer Types
// ============================================================================

/**
 * Install scope
 */
export type InstallScope = 'global' | 'project';

/**
 * Install options
 */
export interface InstallOptions {
  /** Install target scope */
  scope?: InstallScope;
  /** Project root path (for project scope) */
  projectRoot?: string;
  /** Force reinstall even if exists */
  force?: boolean;
  /** Dry run without actual installation */
  dryRun?: boolean;
}

/**
 * Install result
 */
export interface InstallResult {
  /** Whether installation was successful */
  success: boolean;
  /** Installed skill ID */
  skillId: string;
  /** Install location */
  location: string;
  /** Installed version */
  version: string;
  /** Error message if failed */
  error?: string;
}

// ============================================================================
// Search Types
// ============================================================================

/**
 * Search options
 */
export interface SearchOptions {
  /** Filter by tags */
  tags?: string[];
  /** Limit results */
  limit?: number;
  /** Search specific source */
  source?: string;
}

/**
 * Search result with relevance score
 */
export interface SearchResult extends SkillMetadata {
  /** Relevance score (0-1) */
  score: number;
}

// ============================================================================
// Generator Types
// ============================================================================

/**
 * Skill generator options
 */
export interface GeneratorOptions {
  /** Skill name */
  name?: string;
  /** Description/prompt for skill */
  description?: string;
  /** Template to use */
  template?: 'basic' | 'advanced' | 'custom';
  /** Output directory */
  output?: string;
  /** Non-interactive mode */
  nonInteractive?: boolean;
}

/**
 * Template variable
 */
export interface TemplateVariable {
  /** Variable name */
  name: string;
  /** Prompt for user */
  prompt: string;
  /** Default value */
  default?: string;
  /** Validation regex */
  validate?: RegExp;
}

// ============================================================================
// Cache Types
// ============================================================================

/**
 * Cache entry metadata
 */
export interface CacheMetadata {
  /** Creation timestamp */
  createdAt: number;
  /** Expiration timestamp */
  expiresAt: number;
  /** Source identifier */
  source: string;
  /** Data version */
  version: string;
}

/**
 * Cache entry
 */
export interface CacheEntry<T = unknown> {
  /** Cache key */
  key: string;
  /** Cached data */
  data: T;
  /** Entry metadata */
  metadata: CacheMetadata;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Command result
 */
export interface CommandResult {
  /** Exit code (0 = success) */
  exitCode: number;
  /** stdout content */
  stdout: string;
  /** stderr content */
  stderr: string;
}

/**
 * Progress callback type
 */
export type ProgressCallback = (current: number, total: number, message: string) => void;
