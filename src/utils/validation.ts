/**
 * Validation utilities
 */

import path from 'path';
import {
  SKILL_ID_PATTERN,
  SEMVER_PATTERN,
  GITHUB_REPO_PATTERN,
  URL_PATTERN,
} from '../constants';

/**
 * Validate skill ID format
 */
export function validateSkillId(id: string): { valid: boolean; error?: string } {
  if (!id || id.trim().length === 0) {
    return { valid: false, error: 'Skill ID cannot be empty' };
  }

  if (id.length > 100) {
    return { valid: false, error: 'Skill ID too long (max 100 characters)' };
  }

  if (!SKILL_ID_PATTERN.test(id)) {
    return {
      valid: false,
      error: 'Skill ID must contain only lowercase letters, numbers, and hyphens',
    };
  }

  return { valid: true };
}

/**
 * Validate semantic version
 */
export function validateVersion(version: string): { valid: boolean; error?: string } {
  if (!SEMVER_PATTERN.test(version)) {
    return {
      valid: false,
      error: 'Version must follow semantic versioning (e.g., 1.0.0)',
    };
  }
  return { valid: true };
}

/**
 * Validate GitHub repo format (owner/repo)
 */
export function validateGitHubRepo(repo: string): { valid: boolean; error?: string } {
  if (!GITHUB_REPO_PATTERN.test(repo)) {
    return {
      valid: false,
      error: 'Repository must be in format "owner/repo"',
    };
  }
  return { valid: true };
}

/**
 * Validate URL format
 */
export function validateUrl(url: string): { valid: boolean; error?: string } {
  if (!URL_PATTERN.test(url)) {
    return {
      valid: false,
      error: 'Must be a valid URL (starting with http:// or https://)',
    };
  }
  return { valid: true };
}

/**
 * Validate skill name
 */
export function validateSkillName(name: string): { valid: boolean; error?: string } {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: 'Name cannot be empty' };
  }

  if (name.length > 200) {
    return { valid: false, error: 'Name too long (max 200 characters)' };
  }

  return { valid: true };
}

/**
 * Validate description
 */
export function validateDescription(description: string): { valid: boolean; error?: string } {
  if (!description || description.trim().length === 0) {
    return { valid: false, error: 'Description cannot be empty' };
  }

  if (description.length > 500) {
    return { valid: false, error: 'Description too long (max 500 characters)' };
  }

  return { valid: true };
}

/**
 * Validate tags array
 */
export function validateTags(tags: string[]): { valid: boolean; error?: string } {
  if (!Array.isArray(tags)) {
    return { valid: false, error: 'Tags must be an array' };
  }

  if (tags.length > 10) {
    return { valid: false, error: 'Too many tags (max 10)' };
  }

  for (const tag of tags) {
    if (tag.length > 50) {
      return { valid: false, error: `Tag too long: "${tag}" (max 50 characters)` };
    }
  }

  return { valid: true };
}

/**
 * Validate file path is safe (no path traversal)
 */
export function validateSafePath(filePath: string): { valid: boolean; error?: string } {
  const normalized = path.normalize(filePath);

  if (normalized.includes('..')) {
    return { valid: false, error: 'Path cannot contain parent directory references (..)' };
  }

  if (path.isAbsolute(normalized)) {
    return { valid: false, error: 'Path must be relative' };
  }

  return { valid: true };
}

/**
 * Combine multiple validation results
 */
export function combineValidation(
  ...results: Array<{ valid: boolean; error?: string }>
): { valid: boolean; errors: string[] } {
  const errors = results.flatMap((r) => (r.error ? [r.error] : []));
  return {
    valid: errors.length === 0,
    errors,
  };
}
