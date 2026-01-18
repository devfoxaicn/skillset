/**
 * Local source for loading skills from filesystem
 */

import path from 'path';
import * as fs from 'fs-extra';
import type { SkillSource, Skill, SkillMetadata, LocalSourceConfig } from '../../types';
import { SKILL_META_FILE } from '../../constants';
import { logger } from '../../utils';

/**
 * Parse frontmatter from markdown content
 */
function parseFrontmatter(content: string): { frontmatter: Record<string, unknown>; body: string } {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return { frontmatter: {}, body: content };
  }

  const frontmatter: Record<string, unknown> = {};
  const lines = match[1].split('\n');

  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.slice(0, colonIndex).trim();
      let value: unknown = line.slice(colonIndex + 1).trim();

      const strValue = String(value);
      if (strValue.startsWith('"') || strValue.startsWith("'")) {
        value = strValue.slice(1, -1);
      } else if (strValue === 'true') {
        value = true;
      } else if (strValue === 'false') {
        value = false;
      } else if (strValue.startsWith('[')) {
        value = strValue
          .slice(1, -1)
          .split(',')
          .map((v: string) => v.trim().replace(/^["']|["']$/g, ''))
          .filter((v: string) => v.length > 0);
      }

      frontmatter[key] = value;
    }
  }

  return { frontmatter, body: match[2] };
}

/**
 * Parse skill metadata from frontmatter
 */
function parseSkillMetadata(
  skillId: string,
  frontmatter: Record<string, unknown>,
  sourceName: string
): SkillMetadata {
  return {
    id: skillId,
    name: String(frontmatter.name || skillId),
    description: String(frontmatter.description || ''),
    version: String(frontmatter.version || '1.0.0'),
    author: String(frontmatter.author || 'Unknown'),
    source: sourceName,
    tags: Array.isArray(frontmatter.tags) ? (frontmatter.tags as string[]) : [],
    dependencies: Array.isArray(frontmatter.dependencies)
      ? (frontmatter.dependencies as string[])
      : undefined,
  };
}

/**
 * Local source implementation
 */
export class LocalSource implements SkillSource {
  readonly name: string;
  readonly type = 'local' as const;
  readonly priority: number;

  private sourcePath: string;

  constructor(config: LocalSourceConfig) {
    this.name = config.name;
    this.priority = config.priority ?? 50;
    this.sourcePath = path.resolve(config.local.path);
  }

  /**
   * Validate source is accessible
   */
  async validate(): Promise<boolean> {
    try {
      return await fs.pathExists(this.sourcePath);
    } catch {
      return false;
    }
  }

  /**
   * List all available skills from this source
   */
  async listSkills(): Promise<SkillMetadata[]> {
    const skills: SkillMetadata[] = [];

    try {
      logger.debug(`Scanning local source: ${this.sourcePath}`);

      const entries = await fs.readdir(this.sourcePath, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const skillPath = path.join(this.sourcePath, entry.name);
          const metaPath = path.join(skillPath, SKILL_META_FILE);

          if (await fs.pathExists(metaPath)) {
            try {
              const content = await fs.readFile(metaPath, 'utf-8');
              const { frontmatter } = parseFrontmatter(content);

              skills.push(parseSkillMetadata(entry.name, frontmatter, this.name));
            } catch (error) {
              logger.debug(`Failed to read skill ${entry.name}: ${(error as Error).message}`);
            }
          }
        }
      }
    } catch (error) {
      logger.error(`Failed to list skills from ${this.name}: ${(error as Error).message}`);
    }

    return skills;
  }

  /**
   * Get a specific skill by ID
   */
  async getSkill(skillId: string): Promise<Skill | null> {
    const skillPath = path.join(this.sourcePath, skillId);
    const metaPath = path.join(skillPath, SKILL_META_FILE);

    try {
      logger.debug(`Loading skill ${skillId} from local source`);

      if (!await fs.pathExists(metaPath)) {
        return null;
      }

      // Read main skill file
      const content = await fs.readFile(metaPath, 'utf-8');
      const { frontmatter, body } = parseFrontmatter(content);
      const metadata = parseSkillMetadata(skillId, frontmatter, this.name);

      // Read additional files
      const files: Skill['files'] = [];
      const entries = await fs.readdir(skillPath, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isFile() && entry.name !== SKILL_META_FILE && !entry.name.startsWith('.')) {
          try {
            const filePath = path.join(skillPath, entry.name);
            const fileContent = await fs.readFile(filePath, 'utf-8');
            files.push({
              path: entry.name,
              content: fileContent,
            });
          } catch {
            // Skip files that fail to load
          }
        }
      }

      return {
        ...metadata,
        content: body,
        files,
      };
    } catch (error) {
      logger.debug(`Failed to get skill ${skillId}: ${(error as Error).message}`);
      return null;
    }
  }

  /**
   * Get source path for debugging
   */
  getSourcePath(): string {
    return this.sourcePath;
  }
}
