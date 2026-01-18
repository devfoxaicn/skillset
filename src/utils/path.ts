/**
 * Path utilities for cross-platform compatibility
 */

import path from 'path';
import os from 'os';
import { findProjectRoot } from './project';

/**
 * Get global skills installation path
 */
export function getGlobalSkillsPath(customPath?: string): string {
  if (customPath) {
    return path.resolve(customPath);
  }

  const baseDir =
    os.platform() === 'win32'
      ? process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming')
      : os.homedir();

  return path.join(baseDir, 'claude', 'skills');
}

/**
 * Get project skills installation path
 */
export function getProjectSkillsPath(projectRoot?: string, customPath?: string): string {
  const root = projectRoot || findProjectRoot();
  if (!root) {
    throw new Error('Could not find project root');
  }

  const relativePath = customPath || '.claude/skills';
  return path.join(root, relativePath);
}

/**
 * Get cache directory path
 */
export function getCachePath(customPath?: string): string {
  if (customPath) {
    return path.resolve(customPath);
  }

  const baseDir =
    os.platform() === 'win32'
      ? process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Local')
      : os.homedir();

  return path.join(baseDir, '.claude-skills', 'cache');
}

/**
 * Get config directory path
 */
export function getConfigPath(): string {
  const baseDir =
    os.platform() === 'win32'
      ? process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming')
      : os.homedir();

  return path.join(baseDir, '.claude-skills');
}

/**
 * Resolve path relative to cwd or custom base
 */
export function resolvePath(targetPath: string, basePath = process.cwd()): string {
  if (path.isAbsolute(targetPath)) {
    return targetPath;
  }
  return path.resolve(basePath, targetPath);
}

/**
 * Normalize path for display (shorten home directory)
 */
export function normalizePathForDisplay(filePath: string): string {
  const home = os.homedir();
  if (filePath.startsWith(home)) {
    return filePath.replace(home, '~');
  }
  return filePath;
}

/**
 * Check if path is within parent directory
 */
export function isPathWithin(childPath: string, parentPath: string): boolean {
  const relative = path.relative(parentPath, childPath);
  return !relative.startsWith('..') && !path.isAbsolute(relative);
}

/**
 * Ensure path exists, create if not
 */
export async function ensurePathExists(targetPath: string): Promise<void> {
  const fs = await import('fs-extra');
  await fs.ensureDir(targetPath);
}

/**
 * Check if path exists
 */
export async function pathExists(targetPath: string): Promise<boolean> {
  const fs = await import('fs-extra');
  return fs.pathExists(targetPath);
}

/**
 * Check if path is a directory
 */
export async function isDirectory(targetPath: string): Promise<boolean> {
  const fs = await import('fs-extra');
  try {
    const stat = await fs.stat(targetPath);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Get safe filename from string
 */
export function getSafeFilename(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 100);
}
