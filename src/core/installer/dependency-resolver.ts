/**
 * Dependency resolver for skills
 */

import type { Skill, SkillMetadata } from '../../types';
import { logger } from '../../utils';

/**
 * Resolution result
 */
export interface ResolutionResult {
  /** Resolved skills in installation order */
  skills: Skill[];
  /** Missing dependencies */
  missing: string[];
  /** Circular dependency warnings */
  circular: string[][];
}

/**
 * Dependency graph node
 */
interface DependencyNode {
  skill: SkillMetadata;
  dependencies: string[];
  resolved: boolean;
  resolving: boolean;
}

/**
 * Dependency resolver
 */
export class DependencyResolver {
  private availableSkills: Map<string, SkillMetadata>;

  constructor(availableSkills: SkillMetadata[]) {
    this.availableSkills = new Map();
    for (const skill of availableSkills) {
      this.availableSkills.set(skill.id, skill);
    }
  }

  /**
   * Resolve dependencies for a skill
   */
  async resolve(skillId: string, getSkillFn: (id: string) => Promise<Skill | null>): Promise<ResolutionResult> {
    const skills: Skill[] = [];
    const missing: string[] = [];
    const circular: string[][] = [];
    const visited = new Set<string>();
    const resolving = new Set<string>();

    const resolveRecursive = async (id: string, path: string[]): Promise<void> => {
      // Check for circular dependencies
      if (resolving.has(id)) {
        const cycle = [...path.slice(path.indexOf(id)), id];
        circular.push(cycle);
        logger.warn(`Circular dependency detected: ${cycle.join(' -> ')}`);
        return;
      }

      // Skip if already resolved
      if (visited.has(id)) {
        return;
      }

      resolving.add(id);

      // Check if skill exists
      const metadata = this.availableSkills.get(id);
      if (!metadata) {
        missing.push(id);
        logger.debug(`Missing dependency: ${id}`);
        resolving.delete(id);
        return;
      }

      // Resolve dependencies first
      const dependencies = metadata.dependencies || [];
      for (const depId of dependencies) {
        await resolveRecursive(depId, [...path, id]);
      }

      // Get full skill data
      const skill = await getSkillFn(id);
      if (skill) {
        skills.push(skill);
        visited.add(id);
      }

      resolving.delete(id);
    };

    await resolveRecursive(skillId, []);

    // Reverse to get dependencies first (topological order)
    skills.reverse();

    return { skills, missing, circular };
  }

  /**
   * Resolve multiple skills
   */
  async resolveMultiple(
    skillIds: string[],
    getSkillFn: (id: string) => Promise<Skill | null>
  ): Promise<ResolutionResult> {
    const allSkills: Skill[] = [];
    const allMissing: string[] = [];
    const allCircular: string[][] = [];
    const processed = new Set<string>();

    for (const skillId of skillIds) {
      if (processed.has(skillId)) {
        continue;
      }

      const result = await this.resolve(skillId, getSkillFn);

      allSkills.push(...result.skills);
      allMissing.push(...result.missing);
      allCircular.push(...result.circular);

      // Mark all resolved skills as processed
      for (const skill of result.skills) {
        processed.add(skill.id);
      }
    }

    // Remove duplicates
    const uniqueSkills = this.deduplicateSkills(allSkills);

    return {
      skills: uniqueSkills,
      missing: [...new Set(allMissing)],
      circular: allCircular,
    };
  }

  /**
   * Check if all dependencies are satisfied
   */
  checkDependencies(skillId: string): {
    satisfied: boolean;
    missing: string[];
  } {
    const missing: string[] = [];
    const checked = new Set<string>();
    const queue = [skillId];

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (checked.has(current)) {
        continue;
      }
      checked.add(current);

      const skill = this.availableSkills.get(current);
      if (!skill) {
        missing.push(current);
        continue;
      }

      const dependencies = skill.dependencies || [];
      for (const dep of dependencies) {
        if (!checked.has(dep)) {
          queue.push(dep);
        }
      }
    }

    return {
      satisfied: missing.length === 0,
      missing,
    };
  }

  /**
   * Get dependency tree for a skill
   */
  getDependencyTree(skillId: string, visited = new Set<string>()): {
    skill: SkillMetadata | null;
    dependencies: Array<ReturnType<DependencyResolver['getDependencyTree']>>;
  } {
    if (visited.has(skillId)) {
      // Circular reference
      return {
        skill: null,
        dependencies: [],
      };
    }

    visited.add(skillId);

    const skill = this.availableSkills.get(skillId) || null;
    const dependencies = (skill?.dependencies || []).map((depId) =>
      this.getDependencyTree(depId, new Set(visited))
    );

    return { skill, dependencies };
  }

  /**
   * Format dependency tree as string
   */
  formatDependencyTree(skillId: string): string {
    const tree = this.getDependencyTree(skillId);
    const lines: string[] = [];

    const formatNode = (
      node: ReturnType<DependencyResolver['getDependencyTree']>,
      prefix = '',
      isLast = true
    ) => {
      if (!node.skill) {
        lines.push(`${prefix}└── [circular: ${skillId}]`);
        return;
      }

      const connector = isLast ? '└──' : '├──';
      lines.push(`${prefix}${connector} ${node.skill.id} (${node.skill.version})`);

      const childPrefix = prefix + (isLast ? '    ' : '│   ');

      for (let i = 0; i < node.dependencies.length; i++) {
        const isChildLast = i === node.dependencies.length - 1;
        formatNode(node.dependencies[i], childPrefix, isChildLast);
      }
    };

    formatNode(tree);
    return lines.join('\n');
  }

  /**
   * Remove duplicate skills, keeping latest version
   */
  private deduplicateSkills(skills: Skill[]): Skill[] {
    const versionMap = new Map<string, Skill>();

    for (const skill of skills) {
      const existing = versionMap.get(skill.id);

      if (!existing || this.compareVersions(skill.version, existing.version) > 0) {
        versionMap.set(skill.id, skill);
      }
    }

    return Array.from(versionMap.values());
  }

  /**
   * Compare semantic versions
   * Returns: 1 if a > b, -1 if a < b, 0 if equal
   */
  private compareVersions(a: string, b: string): number {
    const parseVersion = (v: string) => {
      const match = v.match(/^(\d+)\.(\d+)\.(\d+)/);
      if (!match) return [0, 0, 0];
      return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
    };

    const [aMajor, aMinor, aPatch] = parseVersion(a);
    const [bMajor, bMinor, bPatch] = parseVersion(b);

    if (aMajor !== bMajor) return aMajor > bMajor ? 1 : -1;
    if (aMinor !== bMinor) return aMinor > bMinor ? 1 : -1;
    if (aPatch !== bPatch) return aPatch > bPatch ? 1 : -1;

    return 0;
  }

  /**
   * Get all available skills
   */
  getAvailableSkills(): SkillMetadata[] {
    return Array.from(this.availableSkills.values());
  }

  /**
   * Add skill to available pool
   */
  addSkill(skill: SkillMetadata): void {
    this.availableSkills.set(skill.id, skill);
  }

  /**
   * Remove skill from available pool
   */
  removeSkill(skillId: string): void {
    this.availableSkills.delete(skillId);
  }
}
