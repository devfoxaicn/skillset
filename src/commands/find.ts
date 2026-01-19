/**
 * Find command implementation - AI-driven natural language skill discovery
 */

import { Command } from 'commander';
import { SourceManager } from '../core';
import { configLoader } from '../config';
import { logger } from '../utils';
import { DEFAULT_SEARCH_LIMIT, MAX_SEARCH_LIMIT } from '../constants';
import type { SkillMetadata } from '../types';

/**
 * Create find command
 */
export function createFindCommand(): Command {
  const command = new Command('find');

  command
    .description('Find skills using natural language description')
    .argument('<query>', 'Natural language description of what you need')
    .option('-l, --limit <number>', 'Limit results', String(DEFAULT_SEARCH_LIMIT))
    .option('-s, --source <name>', 'Search specific source')
    .option('-v, --verbose', 'Show detailed information including reasoning')
    .action(async (query, options) => {
      await handleFind(query, options);
    });

  return command;
}

/**
 * Handle find command logic
 */
async function handleFind(query: string, options: {
  limit: string;
  source?: string;
  verbose?: boolean;
}): Promise<void> {
  try {
    // Parse limit
    const limit = Math.min(
      Math.max(1, parseInt(options.limit) || DEFAULT_SEARCH_LIMIT),
      MAX_SEARCH_LIMIT
    );

    logger.info(`🔍 Analyzing your request: "${query}"`);
    logger.newline();

    // Load configuration
    const { config } = await configLoader.load();

    // Initialize source manager
    const sourceManager = await SourceManager.fromConfigs(config.sources || []);

    // Extract keywords and intent from natural language
    const analysis = analyzeUserIntent(query);
    logger.debug(`Extracted keywords: ${analysis.keywords.join(', ')}`);
    logger.debug(`Detected intent: ${analysis.intent}`);

    // Get all available skills
    logger.startSpinner('Searching skills...');

    const allSkills = await sourceManager.listAllSkills();

    // Apply source filter if specified
    let skills = allSkills;
    if (options.source) {
      skills = skills.filter((s) => s.source === options.source);
    }

    logger.stopSpinner();

    // Intelligent matching with scoring
    const matches = matchSkillsIntelligently(skills, query, analysis);

    // Sort by relevance score
    matches.sort((a, b) => b.score - a.score);

    // Limit results
    const topMatches = matches.slice(0, limit);

    // Display results
    if (topMatches.length === 0) {
      logger.warn('😕 No matching skills found.');
      logger.newline();
      logger.info('Try describing your needs differently, or use:');
      logger.info('  skillset search <keyword>  for keyword search');
      return;
    }

    logger.newline();
    logger.success(`✨ Found ${topMatches.length} skill${topMatches.length > 1 ? 's' : ''} that might help:`);
    logger.newline();

    for (let i = 0; i < topMatches.length; i++) {
      const { skill, score, reasons } = topMatches[i];
      const rank = i + 1;

      // Match strength indicator
      const strength = score >= 0.8 ? '🎯' : score >= 0.6 ? '✅' : score >= 0.4 ? '💡' : '🔍';

      logger.raw(`${strength}  ${rank}. ${skill.name} (${skill.id})`);
      logger.raw(`    ${skill.description}`);
      logger.raw(`    └─ Score: ${Math.round(score * 100)}% | Source: ${skill.source} | v${skill.version}`);

      if (options.verbose && reasons.length > 0) {
        logger.raw(`    └─ Why this matches:`);
        for (const reason of reasons) {
          logger.raw(`       • ${reason}`);
        }
      }

      logger.newline();
    }

    // Show installation hint
    logger.info(`💡 Run "skillset install <id>" to install a skill.`);

  } catch (error) {
    logger.error(`Find failed: ${(error as Error).message}`);
    process.exit(1);
  }
}

/**
 * Analyze user intent from natural language query
 */
interface IntentAnalysis {
  keywords: string[];
  intent: 'search' | 'create' | 'fix' | 'analyze' | 'general';
  categories: string[];
  techStack?: string[];
}

function analyzeUserIntent(query: string): IntentAnalysis {
  const lowerQuery = query.toLowerCase();

  // Extract keywords (remove common stop words)
  const stopWords = new Set([
    'i', 'need', 'want', 'to', 'for', 'a', 'an', 'the', 'is', 'are', 'was', 'were',
    'help', 'me', 'can', 'could', 'would', 'should', 'please', 'how', 'what',
    'make', 'let', 'allows', 'enable', 'wanting', 'needing'
  ]);

  const words = lowerQuery
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w));

  // Detect intent
  let intent: IntentAnalysis['intent'] = 'general';
  if (lowerQuery.match(/\b(process|analyze|parse|extract|read)\b/)) {
    intent = 'analyze';
  } else if (lowerQuery.match(/\b(create|make|build|generate|write)\b/)) {
    intent = 'create';
  } else if (lowerQuery.match(/\b(fix|repair|debug|solve|resolve)\b/)) {
    intent = 'fix';
  } else if (lowerQuery.match(/\b(find|search|look for|need)\b/)) {
    intent = 'search';
  }

  // Detect categories
  const categories: string[] = [];
  const categoryKeywords: Record<string, string[]> = {
    'document': ['pdf', 'doc', 'document', 'word', 'text', 'file'],
    'code': ['code', 'programming', 'development', 'refactor', 'debug'],
    'testing': ['test', 'testing', 'spec', 'tdd', 'unit'],
    'git': ['git', 'commit', 'branch', 'merge', 'repository'],
    'data': ['data', 'json', 'csv', 'api', 'fetch'],
    'ui': ['ui', 'interface', 'component', 'frontend'],
    'database': ['database', 'db', 'sql', 'query', 'migration'],
  };

  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(k => lowerQuery.includes(k))) {
      categories.push(category);
    }
  }

  // Detect tech stack
  const techStack: string[] = [];
  const techPatterns: Record<string, RegExp[]> = {
    'react': [/\breact\b/i],
    'vue': [/\bvue\b/i],
    'typescript': [/\btypescript\b/i, /\bts\b/i],
    'python': [/\bpython\b/i],
    'node': [/\bnode\b/i, /\bnode\.js\b/i],
    'go': [/\bgolang?\b/i, /\bgo\b/i],
  };

  for (const [tech, patterns] of Object.entries(techPatterns)) {
    if (patterns.some(p => p.test(query))) {
      techStack.push(tech);
    }
  }

  return {
    keywords: words,
    intent,
    categories,
    techStack: techStack.length > 0 ? techStack : undefined,
  };
}

/**
 * Intelligent skill matching with scoring
 */
interface SkillMatch {
  skill: SkillMetadata;
  score: number;
  reasons: string[];
}

function matchSkillsIntelligently(
  skills: SkillMetadata[],
  query: string,
  analysis: IntentAnalysis
): SkillMatch[] {
  const lowerQuery = query.toLowerCase();
  const matches: SkillMatch[] = [];

  for (const skill of skills) {
    let score = 0;
    const reasons: string[] = [];

    // 1. Exact name match (highest weight: 0.4)
    if (skill.id.toLowerCase() === lowerQuery.replace(/\s+/g, '-')) {
      score += 0.4;
      reasons.push(`Exact name match for "${skill.id}"`);
    } else if (skill.id.toLowerCase().includes(lowerQuery.replace(/\s+/g, '-'))) {
      score += 0.2;
      reasons.push(`Name contains your search term`);
    }

    // 2. Keyword matching in name and description (0.3)
    const nameLower = skill.name.toLowerCase();
    const descLower = skill.description.toLowerCase();
    const matchedKeywords = analysis.keywords.filter(kw =>
      nameLower.includes(kw) || descLower.includes(kw)
    );

    if (matchedKeywords.length > 0) {
      const keywordScore = Math.min(matchedKeywords.length * 0.1, 0.3);
      score += keywordScore;
      reasons.push(`Matches keywords: ${matchedKeywords.slice(0, 3).join(', ')}${matchedKeywords.length > 3 ? '...' : ''}`);
    }

    // 3. Tag matching (0.15)
    const matchedTags = analysis.keywords.filter(kw =>
      skill.tags.some(t => t.toLowerCase().includes(kw))
    );
    if (matchedTags.length > 0) {
      score += Math.min(matchedTags.length * 0.05, 0.15);
      reasons.push(`Relevant tags: ${skill.tags.slice(0, 2).join(', ')}`);
    }

    // 4. Category matching (0.1)
    for (const category of analysis.categories) {
      const categoryLower = category.toLowerCase();
      if (
        skill.tags.some(t => t.toLowerCase().includes(categoryLower)) ||
        skill.description.toLowerCase().includes(categoryLower) ||
        skill.id.toLowerCase().includes(categoryLower)
      ) {
        score += 0.05;
        reasons.push(`Related to ${category}`);
      }
    }

    // 5. Intent-based matching (0.05)
    if (analysis.intent !== 'general') {
      const intentKeywords: Record<string, string[]> = {
        'analyze': ['analyze', 'parse', 'process', 'extract'],
        'create': ['create', 'generate', 'build', 'make'],
        'fix': ['fix', 'debug', 'repair', 'solve'],
        'search': ['search', 'find', 'lookup'],
      };
      const relevantKeywords = intentKeywords[analysis.intent] || [];
      if (relevantKeywords.some(kw =>
        skill.description.toLowerCase().includes(kw) ||
        skill.tags.some(t => t.toLowerCase().includes(kw))
      )) {
        score += 0.05;
        reasons.push(`Matches your ${analysis.intent} intent`);
      }
    }

    // Only include if there's some relevance
    if (score > 0.1 || matchedKeywords.length > 0) {
      matches.push({ skill, score, reasons });
    }
  }

  return matches;
}
