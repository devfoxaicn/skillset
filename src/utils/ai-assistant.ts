/**
 * AI Assistant utilities for intelligent skill creation
 */

import inquirer from 'inquirer';
import type { SkillMetadata } from '../types';
import { logger } from './logger';

/**
 * Analyze user's skill requirements and generate recommendations
 */
export interface SkillRequirements {
  /** User's description of what they want */
  description: string;
  /** Detected category */
  category: string;
  /** Suggested skill ID */
  suggestedId: string;
  /** Suggested name */
  suggestedName: string;
  /** Suggested tags */
  suggestedTags: string[];
  /** Suggested dependencies */
  suggestedDeps: string[];
  /** Detected capabilities */
  capabilities: string[];
  /** Similar existing skills */
  similarSkills: SkillMetadata[];
}

/**
 * Analyze user requirements from natural language description
 */
export async function analyzeRequirements(
  userDescription: string,
  existingSkills: SkillMetadata[]
): Promise<SkillRequirements> {
  const lowerDesc = userDescription.toLowerCase();

  // Detect category
  const category = detectCategory(lowerDesc);

  // Generate suggestions
  const suggestedId = generateSkillId(userDescription);
  const suggestedName = generateSkillName(userDescription);
  const suggestedTags = generateTags(lowerDesc, category);
  const suggestedDeps = suggestDependencies(lowerDesc);
  const capabilities = detectCapabilities(lowerDesc);

  // Find similar skills
  const similarSkills = findSimilarSkills(userDescription, existingSkills);

  return {
    description: userDescription,
    category,
    suggestedId,
    suggestedName,
    suggestedTags,
    suggestedDeps,
    capabilities,
    similarSkills,
  };
}

/**
 * Detect the category of the skill
 */
function detectCategory(description: string): string {
  const categoryPatterns: Record<string, RegExp[]> = {
    'document': [
      /\b(pdf|doc|docx|text|word|document|file|read|parse|extract)\b/i,
    ],
    'code': [
      /\b(code|programming|development|refactor|debug|syntax|parser|ast)\b/i,
    ],
    'testing': [
      /\b(test|testing|spec|tdd|unit test|integration|mock)\b/i,
    ],
    'git': [
      /\b(git|commit|branch|merge|repository|version|vcs)\b/i,
    ],
    'data': [
      /\b(data|json|csv|api|fetch|request|http|graphql)\b/i,
    ],
    'ui': [
      /\b(ui|interface|component|frontend|react|vue|angular)\b/i,
    ],
    'database': [
      /\b(database|db|sql|query|migration|schema|orm)\b/i,
    ],
    'image': [
      /\b(image|photo|picture|visual|graphic|svg|canvas)\b/i,
    ],
    'automation': [
      /\b(automation|script|batch|workflow|pipeline|task)\b/i,
    ],
    'ai': [
      /\b(ai|ml|machine learning|model|training|inference|prediction)\b/i,
    ],
  };

  for (const [category, patterns] of Object.entries(categoryPatterns)) {
    for (const pattern of patterns) {
      if (pattern.test(description)) {
        return category;
      }
    }
  }

  return 'general';
}

/**
 * Generate a skill ID from description
 */
function generateSkillId(description: string): string {
  const words = description
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2)
    .slice(0, 3);

  if (words.length === 0) {
    return 'my-skill';
  }

  return words.join('-');
}

/**
 * Generate a skill name from description
 */
function generateSkillName(description: string): string {
  // Capitalize first letter and make it title-like
  return description
    .split(/\s+/)
    .slice(0, 5)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Generate relevant tags from description
 */
function generateTags(description: string, category: string): string[] {
  const tags: string[] = [category];

  // Add specific tags based on keywords
  const tagKeywords: Record<string, string> = {
    'api': 'api',
    'http': 'api',
    'json': 'data',
    'csv': 'data',
    'pdf': 'document',
    'git': 'git',
    'commit': 'git',
    'test': 'testing',
    'react': 'frontend',
    'vue': 'frontend',
    'database': 'database',
    'sql': 'database',
    'image': 'image',
    'photo': 'image',
  };

  for (const [keyword, tag] of Object.entries(tagKeywords)) {
    if (description.includes(keyword) && !tags.includes(tag)) {
      tags.push(tag);
    }
  }

  // Limit to 5 tags
  return tags.slice(0, 5);
}

/**
 * Suggest dependencies based on description
 */
function suggestDependencies(description: string): string[] {
  const deps: string[] = [];
  const lowerDesc = description.toLowerCase();

  // Common dependency patterns
  if (lowerDesc.includes('pdf') && lowerDesc.includes('ocr')) {
    deps.push('pdf'); // Might depend on pdf skill
  }

  if (lowerDesc.includes('api') && lowerDesc.includes('authentication')) {
    deps.push('http-client');
  }

  if (lowerDesc.includes('git') && lowerDesc.includes('commit')) {
    deps.push('git-utils');
  }

  return deps;
}

/**
 * Detect capabilities the skill needs
 */
function detectCapabilities(description: string): string[] {
  const capabilities: string[] = [];
  const lowerDesc = description.toLowerCase();

  const capabilityPatterns: Record<string, RegExp> = {
    'File Processing': /\b(read|write|parse|process|file|document)\b/i,
    'API Integration': /\b(api|http|request|fetch|endpoint)\b/i,
    'Data Transformation': /\b(transform|convert|format|parse|extract)\b/i,
    'Code Generation': /\b(generate|create|write|code|boilerplate)\b/i,
    'Analysis': /\b(analyze|check|validate|lint|review)\b/i,
    'Automation': /\b(automate|batch|workflow|pipeline|schedule)\b/i,
    'UI/UX': /\b(ui|interface|component|design|visual)\b/i,
  };

  for (const [capability, pattern] of Object.entries(capabilityPatterns)) {
    if (pattern.test(description)) {
      capabilities.push(capability);
    }
  }

  return capabilities.length > 0 ? capabilities : ['General'];
}

/**
 * Find similar existing skills
 */
function findSimilarSkills(
  description: string,
  existingSkills: SkillMetadata[]
): SkillMetadata[] {
  const lowerDesc = description.toLowerCase();
  const words = lowerDesc.split(/\s+/).filter(w => w.length > 3);

  const scored = existingSkills.map(skill => {
    let score = 0;

    // Check for keyword matches
    for (const word of words) {
      if (skill.name.toLowerCase().includes(word)) score += 3;
      if (skill.description.toLowerCase().includes(word)) score += 2;
      if (skill.tags.some(t => t.toLowerCase().includes(word))) score += 1;
    }

    return { skill, score };
  });

  // Return top 3 matches
  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(s => s.skill);
}

/**
 * Generate skill content based on requirements
 */
export async function generateSkillContent(
  requirements: SkillRequirements,
  template: 'basic' | 'advanced' | 'custom'
): Promise<string> {
  const {
    description,
    category,
    capabilities,
    suggestedName,
    similarSkills,
  } = requirements;

  // Build content based on category and capabilities
  let content = '';

  // Overview section
  content += `## Overview\n\n`;
  content += `This skill helps with ${category.toLowerCase()} tasks. `;
  content += `It provides ${capabilities.join(', ')} capabilities.\n\n`;

  // Use cases section
  content += `## Use Cases\n\n`;
  content += `Use this skill when you need to:\n`;
  content += generateUseCases(description, capabilities);
  content += `\n`;

  // Examples section
  content += `## Examples\n\n`;
  content += generateExamples(category, capabilities);

  // Add notes about similar skills if found
  if (similarSkills.length > 0) {
    content += `\n## Related Skills\n\n`;
    content += `You might also find these skills useful:\n`;
    for (const similar of similarSkills) {
      content += `- **${similar.name}** (\`${similar.id}\`): ${similar.description}\n`;
    }
  }

  // Advanced template gets more sections
  if (template === 'advanced') {
    content += `\n## Configuration\n\n`;
    content += `This skill works with the following parameters:\n\n`;
    content += generateConfigTable(capabilities);

    content += `\n## Best Practices\n\n`;
    content += generateBestPractices(category);

    content += `\n## Limitations\n\n`;
    content += `- Known limitation 1\n`;
    content += `- Known limitation 2\n`;
  }

  return content;
}

/**
 * Generate use cases from description and capabilities
 */
function generateUseCases(description: string, capabilities: string[]): string {
  const useCases: string[] = [];

  // Generate use cases based on capabilities
  if (capabilities.includes('File Processing')) {
    useCases.push('- Process and analyze files');
  }
  if (capabilities.includes('API Integration')) {
    useCases.push('- Integrate with external APIs');
  }
  if (capabilities.includes('Data Transformation')) {
    useCases.push('- Transform and convert data formats');
  }
  if (capabilities.includes('Code Generation')) {
    useCases.push('- Generate code or boilerplate');
  }
  if (capabilities.includes('Analysis')) {
    useCases.push('- Analyze and validate content');
  }

  // Add a generic use case from the description
  useCases.push(`- ${description.charAt(0).toLowerCase() + description.slice(1)}`);

  return useCases.join('\n');
}

/**
 * Generate examples based on category
 */
function generateExamples(category: string, capabilities: string[]): string {
  const examples: string[] = [];

  // Add common example patterns
  if (capabilities.includes('File Processing')) {
    examples.push(
      `### Example 1: Processing a file\n\n` +
      `**Input:**\n` +
      `\`\`\`\n` +
      `[Your file content]\n` +
      `\`\`\`\n\n` +
      `**Output:**\n` +
      `\`\`\`\n` +
      `[Processed result]\n` +
      `\`\`\`\n`
    );
  }

  if (capabilities.includes('API Integration')) {
    examples.push(
      `### Example 2: API Integration\n\n` +
      `**Request:**\n` +
      `\`\`\`\n` +
      `[API request details]\n` +
      `\`\`\`\n\n` +
      `**Response:**\n` +
      `\`\`\`\n` +
      `[Expected response format]\n` +
      `\`\`\`\n`
    );
  }

  // Always add at least one example
  if (examples.length === 0) {
    examples.push(
      `### Example 1: Basic usage\n\n` +
      `**Input:**\n` +
      `\`\`\`\n` +
      `[Your input here]\n` +
      `\`\`\`\n\n` +
      `**Output:**\n` +
      `\`\`\`\n` +
      `[Expected output]\n` +
      `\`\`\`\n`
    );
  }

  return examples.join('\n');
}

/**
 * Generate configuration table
 */
function generateConfigTable(capabilities: string[]): string {
  let table = `| Parameter | Type | Default | Description |\n`;
  table += `|-----------|------|---------|-------------|\n`;

  // Add common parameters based on capabilities
  if (capabilities.includes('File Processing')) {
    table += `| input | string | - | Input file path or content |\n`;
    table += `| format | string | "auto" | Output format (auto, json, text) |\n`;
  }

  if (capabilities.includes('API Integration')) {
    table += `| endpoint | string | - | API endpoint URL |\n`;
    table += `| method | string | "GET" | HTTP method |\n`;
  }

  // Add a generic parameter if none added
  if (!table.includes('|')) {
    table += `| param1 | string | "default" | Description of parameter |\n`;
  }

  return table;
}

/**
 * Generate best practices
 */
function generateBestPractices(category: string): string {
  const practices: string[] = [];

  practices.push('1. Provide clear, specific inputs for better results');
  practices.push('2. Review the output for accuracy');

  // Category-specific practices
  switch (category) {
    case 'code':
      practices.push('3. Test generated code before using in production');
      break;
    case 'document':
      practices.push('3. Ensure file permissions are set correctly');
      break;
    case 'data':
      practices.push('3. Validate data structure before processing');
      break;
  }

  return practices.join('\n');
}

/**
 * Interactive AI-assisted creation flow
 */
export async function interactiveAICreation(
  existingSkills: SkillMetadata[]
): Promise<{
  name: string;
  description: string;
  tags: string[];
  dependencies: string[];
  template: 'basic' | 'advanced' | 'custom';
  content: string;
}> {
  logger.newline();
  logger.info('🤖 AI-Assisted Skill Creation');
  logger.info('   Describe what you want, and I\'ll help you build it!');
  logger.newline();

  // Step 1: Collect user's requirements
  const { userDescription } = await inquirer.prompt([
    {
      type: 'input',
      name: 'userDescription',
      message: 'Describe what you want your skill to do:',
      validate: (input: string) => {
        if (!input || input.trim().length < 10) {
          return 'Please provide a more detailed description (at least 10 characters).';
        }
        return true;
      },
    },
  ]);

  logger.startSpinner('🔍 Analyzing your requirements...');

  // Analyze requirements
  const requirements = await analyzeRequirements(userDescription, existingSkills);

  logger.stopSpinner();

  // Show analysis results
  logger.newline();
  logger.info('📊 Analysis Results:');
  logger.newline();
  logger.raw(`  Category:       ${requirements.category}`);
  logger.raw(`  Suggested ID:    ${requirements.suggestedId}`);
  logger.raw(`  Suggested Name:  ${requirements.suggestedName}`);
  logger.raw(`  Capabilities:   ${requirements.capabilities.join(', ')}`);
  logger.raw(`  Tags:           ${requirements.suggestedTags.join(', ')}`);

  if (requirements.suggestedDeps.length > 0) {
    logger.raw(`  Dependencies:   ${requirements.suggestedDeps.join(', ')}`);
  }

  if (requirements.similarSkills.length > 0) {
    logger.newline();
    logger.info('💡 Similar existing skills:');
    for (const similar of requirements.similarSkills) {
      logger.raw(`   - ${similar.name} (${similar.id})`);
      logger.raw(`     ${similar.description}`);
    }
  }

  logger.newline();

  // Step 2: Confirm or edit suggestions
  const { confirmSuggestions } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmSuggestions',
      message: 'Use these suggestions?',
      default: true,
    },
  ]);

  let finalName = requirements.suggestedName;
  let finalTags = requirements.suggestedTags;
  let finalDeps = requirements.suggestedDeps;

  if (!confirmSuggestions) {
    const edits = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: 'Skill name:',
        default: requirements.suggestedName,
      },
      {
        type: 'input',
        name: 'tags',
        message: 'Tags (comma-separated):',
        default: requirements.suggestedTags.join(','),
        filter: (input: string) => input.split(',').map(t => t.trim()).filter(Boolean),
      },
      {
        type: 'input',
        name: 'dependencies',
        message: 'Dependencies (comma-separated, optional):',
        default: requirements.suggestedDeps.join(','),
        filter: (input: string) => input.split(',').map(t => t.trim()).filter(Boolean),
      },
    ]);

    finalName = edits.name;
    finalTags = edits.tags;
    finalDeps = edits.dependencies;
  }

  // Step 3: Choose template
  const { template } = await inquirer.prompt([
    {
      type: 'list',
      name: 'template',
      message: 'Select template complexity:',
      choices: [
        { name: 'Basic - Simple structure, quick start', value: 'basic' },
        { name: 'Advanced - Full documentation and examples', value: 'advanced' },
        { name: 'Custom - Start from scratch', value: 'custom' },
      ],
      default: 'basic',
    },
  ]);

  // Step 4: Generate content
  logger.startSpinner('✨ Generating skill content...');

  const content = await generateSkillContent(requirements, template);

  logger.stopSpinner();

  // Step 5: Preview and edit
  if (template === 'custom') {
    const { editedContent } = await inquirer.prompt([
      {
        type: 'editor',
        name: 'editedContent',
        message: 'Review and edit the generated content:',
        default: content,
      },
    ]);
    return {
      name: finalName,
      description: requirements.description,
      tags: finalTags,
      dependencies: finalDeps,
      template,
      content: editedContent,
    };
  }

  return {
    name: finalName,
    description: requirements.description,
    tags: finalTags,
    dependencies: finalDeps,
    template,
    content,
  };
}
