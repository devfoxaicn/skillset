/**
 * Source manager for handling multiple skill sources
 */

import type { SkillSource, SkillMetadata, Skill, AnySourceConfig } from '../../types';
import { GitHubSource } from './github-source';
import { LocalSource } from './local-source';
import { logger } from '../../utils';

/**
 * Manager for multiple skill sources
 */
export class SourceManager {
  private sources: Map<string, SkillSource> = new Map();
  private sortedSources: SkillSource[] = [];

  /**
   * Register a new source
   */
  register(source: SkillSource): void {
    this.sources.set(source.name, source);
    this.updateSortedSources();
  }

  /**
   * Unregister a source
   */
  unregister(sourceName: string): void {
    this.sources.delete(sourceName);
    this.updateSortedSources();
  }

  /**
   * Get a source by name
   */
  get(sourceName: string): SkillSource | undefined {
    return this.sources.get(sourceName);
  }

  /**
   * Get all registered sources
   */
  getAll(): SkillSource[] {
    return this.sortedSources;
  }

  /**
   * List skills from all sources
   */
  async listAllSkills(): Promise<SkillMetadata[]> {
    const allSkills: SkillMetadata[] = [];

    for (const source of this.sortedSources) {
      try {
        const skills = await source.listSkills();
        allSkills.push(...skills);
      } catch (error) {
        logger.warn(`Failed to list skills from ${source.name}: ${(error as Error).message}`);
      }
    }

    return allSkills;
  }

  /**
   * Search skills across all sources
   */
  async searchSkills(keyword: string): Promise<SkillMetadata[]> {
    const allSkills = await this.listAllSkills();
    const lowerKeyword = keyword.toLowerCase();

    return allSkills.filter(
      (skill) =>
        skill.id.includes(lowerKeyword) ||
        skill.name.toLowerCase().includes(lowerKeyword) ||
        skill.description.toLowerCase().includes(lowerKeyword) ||
        skill.tags.some((tag) => tag.toLowerCase().includes(lowerKeyword))
    );
  }

  /**
   * Find a skill across all sources
   */
  async findSkill(skillId: string): Promise<Skill | null> {
    for (const source of this.sortedSources) {
      try {
        const skill = await source.getSkill(skillId);
        if (skill) {
          return skill;
        }
      } catch (error) {
        logger.debug(`Source ${source.name} failed: ${(error as Error).message}`);
      }
    }
    return null;
  }

  /**
   * Validate all sources
   */
  async validateAll(): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();

    for (const [name, source] of this.sources) {
      try {
        results.set(name, await source.validate());
      } catch {
        results.set(name, false);
      }
    }

    return results;
  }

  /**
   * Initialize sources from configuration
   */
  static async fromConfigs(configs: AnySourceConfig[], authToken?: string): Promise<SourceManager> {
    const manager = new SourceManager();

    for (const config of configs) {
      if (!config.enabled) continue;

      try {
        let source: SkillSource;

        switch (config.type) {
          case 'github':
            source = new GitHubSource(config, authToken);
            break;
          case 'local':
            source = new LocalSource(config);
            break;
          default:
            logger.warn(`Unsupported source type: ${(config as AnySourceConfig).type}`);
            continue;
        }

        // Validate source before registering
        if (await source.validate()) {
          manager.register(source);
          logger.debug(`Registered source: ${source.name}`);
        } else {
          logger.warn(`Source validation failed: ${config.name}`);
        }
      } catch (error) {
        logger.warn(`Failed to initialize source ${config.name}: ${(error as Error).message}`);
      }
    }

    return manager;
  }

  /**
   * Update sorted sources array
   */
  private updateSortedSources(): void {
    this.sortedSources = Array.from(this.sources.values()).sort(
      (a, b) => b.priority - a.priority
    );
  }
}
