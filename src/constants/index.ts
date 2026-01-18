/**
 * Constant values for Claude Skills CLI
 */

import path from 'path';
import os from 'os';

// ============================================================================
// Default Configuration
// ============================================================================

/** Default configuration file names */
export const DEFAULT_CONFIG_FILES = [
  '.claude-skills.json',
  '.claude-skills.config.js',
  '.claude-skills.config.cjs',
];

/** Default global skills directory */
export const DEFAULT_GLOBAL_SKILLS_PATH = path.join(
  os.platform() === 'win32'
    ? process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming')
    : os.homedir(),
  os.platform() === 'win32' ? '' : '.',
  'claude',
  'skills'
).replace(/^\.+/, path.join(os.homedir(), '.claude', 'skills'));

/** Default project skills directory (relative to project root) */
export const DEFAULT_PROJECT_SKILLS_PATH = '.claude/skills';

/** Default cache directory */
export const DEFAULT_CACHE_PATH = path.join(
  os.platform() === 'win32'
    ? process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Local')
    : os.homedir(),
  os.platform() === 'win32' ? '' : '.',
  'claude-skills',
  'cache'
).replace(/^\.+/, path.join(os.homedir(), '.claude-skills', 'cache'));

/** Default cache TTL (24 hours in seconds) */
export const DEFAULT_CACHE_TTL = 24 * 60 * 60;

/** Default install scope */
export const DEFAULT_SCOPE: 'global' | 'project' = 'global';

// ============================================================================
// Default Sources
// ============================================================================

/** Official Anthropic GitHub source */
export const OFFICIAL_GITHUB_SOURCE = {
  type: 'github' as const,
  name: 'official',
  enabled: true,
  priority: 100,
  github: {
    owner: 'anthropics',
    repo: 'skills',
    branch: 'main',
    skillsPath: 'skills',
  },
};

// ============================================================================
// API Constants
// ============================================================================

/** GitHub API base URL */
export const GITHUB_API_BASE = 'https://api.github.com';

/** GitHub raw content base URL */
export const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com';

/** Default request timeout in milliseconds */
export const DEFAULT_REQUEST_TIMEOUT = 30000;

/** Max retries for API requests */
export const MAX_RETRIES = 3;

/** Base delay for exponential backoff (ms) */
export const RETRY_BASE_DELAY = 1000;

// ============================================================================
// Skill File Constants
// ============================================================================

/** Skill metadata filename */
export const SKILL_META_FILE = 'SKILL.md';

/** Valid skill file extensions */
export const VALID_SKILL_EXTENSIONS = ['.md', '.txt', '.js', '.ts', '.py'];

/** Maximum skill file size (10MB) */
export const MAX_SKILL_FILE_SIZE = 10 * 1024 * 1024;

// ============================================================================
// CLI Constants
// ============================================================================

/** CLI name */
export const CLI_NAME = 'skillset';

/** CLI version */
export const CLI_VERSION = '0.1.0';

/** CLI description */
export const CLI_DESCRIPTION = 'Your Claude Skills, Set and Ready';

/** Default search results limit */
export const DEFAULT_SEARCH_LIMIT = 20;

/** Maximum search results */
export const MAX_SEARCH_LIMIT = 100;

// ============================================================================
// Error Messages
// ============================================================================

export const ERROR_MESSAGES = {
  SOURCE_NOT_FOUND: 'Skill source not found',
  SKILL_NOT_FOUND: 'Skill not found',
  SKILL_ALREADY_INSTALLED: 'Skill is already installed',
  INSTALL_FAILED: 'Failed to install skill',
  INVALID_CONFIG: 'Invalid configuration',
  NETWORK_ERROR: 'Network error occurred',
  PERMISSION_DENIED: 'Permission denied',
  INVALID_SKILL_FORMAT: 'Invalid skill format',
  DEPENDENCY_NOT_FOUND: 'Required dependency not found',
} as const;

// ============================================================================
// Success Messages
// ============================================================================

export const SUCCESS_MESSAGES = {
  INSTALLED: 'Skill installed successfully',
  UNINSTALLED: 'Skill uninstalled successfully',
  UPDATED: 'Skill updated successfully',
  CREATED: 'Skill created successfully',
  CONFIG_SAVED: 'Configuration saved successfully',
} as const;

// ============================================================================
// Color Codes (for consistent theming)
// ============================================================================

export const COLORS = {
  primary: '#7F52FF',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  muted: '#6B7280',
} as const;

// ============================================================================
// Regex Patterns
// ============================================================================

/** Skill ID validation pattern (alphanumeric, hyphens, underscores) */
export const SKILL_ID_PATTERN = /^[a-z0-9-]+$/;

/** Semantic version pattern */
export const SEMVER_PATTERN = /^(\d+)\.(\d+)\.(\d+)(?:-([a-z0-9.-]+))?(?:\+([a-z0-9.-]+))?$/i;

/** GitHub repo pattern */
export const GITHUB_REPO_PATTERN = /^[\w-]+\/[\w-]+$/;

/** URL pattern */
export const URL_PATTERN = /^https?:\/\/.+/;
