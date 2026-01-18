/**
 * Skill installer for managing skill installations
 */

import path from 'path';
import * as fs from 'fs-extra';
import type { Skill, InstallOptions, InstallResult, InstallScope } from '../../types';
import { SKILL_META_FILE } from '../../constants';
import { logger, getGlobalSkillsPath, getProjectSkillsPath, findProjectRoot } from '../../utils';

/**
 * Skill installer class
 */
export class SkillInstaller {
  /**
   * Install a skill
   */
  async install(skill: Skill, options: InstallOptions = {}): Promise<InstallResult> {
    const scope = options.scope ?? 'global';
    const location = this.getInstallLocation(scope, options.projectRoot);

    try {
      // Check if already installed
      const skillPath = path.join(location, skill.id);
      if (fs.pathExistsSync(skillPath) && !options.force) {
        return {
          success: false,
          skillId: skill.id,
          location,
          version: skill.version,
          error: 'Skill already installed. Use --force to reinstall.',
        };
      }

      // Dry run check
      if (options.dryRun) {
        logger.info(`[DRY RUN] Would install ${skill.id} to ${location}`);
        return {
          success: true,
          skillId: skill.id,
          location,
          version: skill.version,
        };
      }

      logger.startSpinner(`Installing ${skill.id}...`);

      // Create skill directory
      await fs.ensureDir(skillPath);

      // Write main skill file
      const skillFile = path.join(skillPath, SKILL_META_FILE);
      const content = this.formatSkillContent(skill);
      await fs.writeFile(skillFile, content, 'utf-8');

      // Write additional files
      if (skill.files && skill.files.length > 0) {
        for (const file of skill.files) {
          const filePath = path.join(skillPath, file.path);
          await fs.ensureDir(path.dirname(filePath));
          await fs.writeFile(filePath, file.content, 'utf-8');
        }
      }

      // Write metadata file
      const metaFile = path.join(skillPath, '.skill-meta.json');
      await fs.writeJson(metaFile, {
        id: skill.id,
        name: skill.name,
        version: skill.version,
        source: skill.source,
        installedAt: new Date().toISOString(),
        dependencies: skill.dependencies,
      });

      logger.succeedSpinner(`Installed ${skill.name} v${skill.version}`);

      return {
        success: true,
        skillId: skill.id,
        location,
        version: skill.version,
      };
    } catch (error) {
      logger.failSpinner(`Failed to install ${skill.id}`);
      return {
        success: false,
        skillId: skill.id,
        location,
        version: skill.version,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Uninstall a skill
   */
  async uninstall(skillId: string, scope: InstallScope = 'global', projectRoot?: string): Promise<boolean> {
    const location = this.getInstallLocation(scope, projectRoot);
    const skillPath = path.join(location, skillId);

    try {
      if (!await fs.pathExists(skillPath)) {
        logger.warn(`Skill not found: ${skillId}`);
        return false;
      }

      logger.startSpinner(`Uninstalling ${skillId}...`);
      await fs.remove(skillPath);
      logger.succeedSpinner(`Uninstalled ${skillId}`);
      return true;
    } catch (error) {
      logger.failSpinner(`Failed to uninstall ${skillId}: ${(error as Error).message}`);
      return false;
    }
  }

  /**
   * Check if a skill is installed
   */
  async isInstalled(skillId: string, scope: InstallScope = 'global', projectRoot?: string): Promise<boolean> {
    const location = this.getInstallLocation(scope, projectRoot);
    const skillPath = path.join(location, skillId);
    return fs.pathExists(skillPath);
  }

  /**
   * Get installed skills
   */
  async getInstalled(scope: InstallScope = 'global', projectRoot?: string): Promise<Array<{id: string; meta: any}>> {
    const location = this.getInstallLocation(scope, projectRoot);
    const installed: Array<{id: string; meta: any}> = [];

    try {
      if (!await fs.pathExists(location)) {
        return installed;
      }

      const dirs = await fs.readdir(location);

      for (const dir of dirs) {
        const metaPath = path.join(location, dir, '.skill-meta.json');
        if (await fs.pathExists(metaPath)) {
          try {
            const meta = await fs.readJson(metaPath);
            installed.push({ id: dir, meta });
          } catch {
            // Skip invalid metadata
            installed.push({ id: dir, meta: null });
          }
        }
      }
    } catch (error) {
      logger.debug(`Failed to list installed skills: ${(error as Error).message}`);
    }

    return installed;
  }

  /**
   * Get install location based on scope
   */
  private getInstallLocation(scope: InstallScope, projectRoot?: string): string {
    if (scope === 'global') {
      return getGlobalSkillsPath();
    }

    // Project scope
    const root = projectRoot || findProjectRoot();
    if (!root) {
      throw new Error('Could not find project root. Run from a project directory or specify --project-root.');
    }
    return getProjectSkillsPath(root);
  }

  /**
   * Format skill content with frontmatter
   */
  private formatSkillContent(skill: Skill): string {
    const frontmatter = [
      '---',
      `name: ${skill.name}`,
      `description: ${skill.description}`,
      `version: ${skill.version}`,
      `author: ${skill.author}`,
      skill.tags.length > 0 ? `tags: [${skill.tags.map((t) => `"${t}"`).join(', ')}]` : '',
      skill.dependencies && skill.dependencies.length > 0
        ? `dependencies: [${skill.dependencies.map((d) => `"${d}"`).join(', ')}]`
        : '',
      '---',
      '',
    ].filter(Boolean).join('\n');

    return frontmatter + skill.content;
  }

  /**
   * Update an installed skill
   */
  async update(skill: Skill, scope: InstallScope = 'global', projectRoot?: string): Promise<InstallResult> {
    return this.install(skill, { scope, projectRoot, force: true });
  }
}
