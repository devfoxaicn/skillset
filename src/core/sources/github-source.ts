/**
 * GitHub source for fetching skills from repositories
 */

import { Octokit } from 'octokit';
import type { SkillSource, Skill, SkillMetadata, GitHubSourceConfig } from '../../types';
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

      // Parse YAML values
      const strValue = String(value);
      if (strValue.startsWith('"') || strValue.startsWith("'")) {
        value = strValue.slice(1, -1);
      } else if (strValue === 'true') {
        value = true;
      } else if (strValue === 'false') {
        value = false;
      } else if (strValue.startsWith('[')) {
        // Parse array
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
 * GitHub source implementation
 */
export class GitHubSource implements SkillSource {
  readonly name: string;
  readonly type = 'github' as const;
  readonly priority: number;

  private octokit: Octokit;
  private config: GitHubSourceConfig['github'];

  constructor(config: GitHubSourceConfig, authToken?: string) {
    this.name = config.name;
    this.priority = config.priority ?? 50;
    this.config = config.github;

    this.octokit = new Octokit({
      auth: authToken || process.env.GITHUB_TOKEN,
      userAgent: '@claude-skills/cli',
      request: {
        timeout: 30000,
      },
    });
  }

  /**
   * Validate source is accessible
   */
  async validate(): Promise<boolean> {
    try {
      await this.octokit.rest.repos.get({
        owner: this.config.owner,
        repo: this.config.repo,
      });
      return true;
    } catch (error) {
      logger.debug(`Source validation failed: ${(error as Error).message}`);
      return false;
    }
  }

  /**
   * List all available skills from this source
   */
  async listSkills(): Promise<SkillMetadata[]> {
    const skills: SkillMetadata[] = [];
    const skillsPath = this.config.skillsPath || 'skills';
    const branch = this.config.branch || 'main';

    try {
      logger.debug(`Fetching skills from ${this.config.owner}/${this.config.repo}`);

      // Get the tree for the skills directory
      const { data: treeData } = await this.octokit.rest.git.getTree({
        owner: this.config.owner,
        repo: this.config.repo,
        tree_sha: branch,
        recursive: '1',
      });

      // Find all SKILL.md files
      for (const item of treeData.tree) {
        if (item.type === 'blob' && item.path.endsWith('/SKILL.md')) {
          // Extract skill ID from path (e.g., "skills/pdf/SKILL.md" -> "pdf")
          const pathParts = item.path.split('/');
          const skillIndex = pathParts.indexOf(skillsPath);
          if (skillIndex >= 0 && skillIndex + 1 < pathParts.length) {
            const skillId = pathParts[skillIndex + 1];

            try {
              // Get file content
              const { data: fileData } = await this.octokit.rest.repos.getContent({
                owner: this.config.owner,
                repo: this.config.repo,
                path: item.path,
                ref: branch,
              });

              if ('content' in fileData && fileData.content) {
                const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
                const { frontmatter } = parseFrontmatter(content);

                skills.push(parseSkillMetadata(skillId, frontmatter, this.name));
              }
            } catch (error) {
              logger.debug(`Failed to fetch skill ${skillId}: ${(error as Error).message}`);
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
    const skillsPath = this.config.skillsPath || 'skills';
    const branch = this.config.branch || 'main';
    const skillPath = `${skillsPath}/${skillId}/SKILL.md`;

    try {
      logger.debug(`Fetching skill ${skillId} from ${this.name}`);

      // Get main skill file
      const { data: fileData } = await this.octokit.rest.repos.getContent({
        owner: this.config.owner,
        repo: this.config.repo,
        path: skillPath,
        ref: branch,
      });

      if (!('content' in fileData) || !fileData.content) {
        return null;
      }

      const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
      const { frontmatter, body } = parseFrontmatter(content);
      const metadata = parseSkillMetadata(skillId, frontmatter, this.name);

      // Get all files in the skill directory
      const files: Skill['files'] = [];
      try {
        const { data: treeData } = await this.octokit.rest.git.getTree({
          owner: this.config.owner,
          repo: this.config.repo,
          tree_sha: branch,
          recursive: '1',
        });

        const skillDirPrefix = `${skillsPath}/${skillId}/`;

        for (const item of treeData.tree) {
          if (
            item.path.startsWith(skillDirPrefix) &&
            item.path !== skillPath &&
            item.type === 'blob'
          ) {
            try {
              const { data: fileContent } = await this.octokit.rest.repos.getContent({
                owner: this.config.owner,
                repo: this.config.repo,
                path: item.path,
                ref: branch,
              });

              if ('content' in fileContent && fileContent.content) {
                const fileData = Buffer.from(fileContent.content, 'base64').toString('utf-8');
                files.push({
                  path: item.path.slice(skillDirPrefix.length),
                  content: fileData,
                });
              }
            } catch {
              // Skip files that fail to load
            }
          }
        }
      } catch {
        // Continue without additional files
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
   * Search skills by keyword
   */
  async searchSkills(keyword: string): Promise<SkillMetadata[]> {
    const allSkills = await this.listSkills();
    const lowerKeyword = keyword.toLowerCase();

    return allSkills.filter(
      (skill) =>
        skill.id.includes(lowerKeyword) ||
        skill.name.toLowerCase().includes(lowerKeyword) ||
        skill.description.toLowerCase().includes(lowerKeyword) ||
        skill.tags.some((tag) => tag.toLowerCase().includes(lowerKeyword))
    );
  }
}
