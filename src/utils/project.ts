/**
 * Project detection utilities
 */

import path from 'path';
import * as fs from 'fs-extra';

/**
 * Find project root by looking for common markers
 */
export function findProjectRoot(startPath = process.cwd()): string | null {
  let currentPath = path.resolve(startPath);
  const root = path.parse(currentPath).root;

  while (currentPath !== root) {
    // Check for common project markers
    const markers = [
      'package.json',
      '.git',
      '.claude-skills.json',
      'tsconfig.json',
      'pyproject.toml',
      'Cargo.toml',
      'go.mod',
    ];

    for (const marker of markers) {
      const markerPath = path.join(currentPath, marker);
      if (fs.pathExistsSync(markerPath)) {
        return currentPath;
      }
    }

    // Move up one directory
    currentPath = path.dirname(currentPath);
  }

  return null;
}

/**
 * Check if current directory is a project
 */
export function isProjectDirectory(dirPath = process.cwd()): boolean {
  return findProjectRoot(dirPath) !== null;
}

/**
 * Get project name from package.json or directory name
 */
export function getProjectName(projectRoot?: string): string {
  const root = projectRoot || findProjectRoot() || process.cwd();

  // Try package.json first
  const packageJsonPath = path.join(root, 'package.json');
  if (fs.pathExistsSync(packageJsonPath)) {
    try {
      const pkg = fs.readJsonSync(packageJsonPath);
      if (pkg.name) {
        return pkg.name;
      }
    } catch {
      // Ignore errors
    }
  }

  // Fall back to directory name
  return path.basename(root);
}
