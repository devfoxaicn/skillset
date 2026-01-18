/**
 * Create command implementation with template support
 */

import { Command } from 'commander';
import inquirer from 'inquirer';
import * as fs from 'fs-extra';
import path from 'path';
import { validateSkillId, validateSkillName, validateDescription, validateTags } from '../utils/validation';
import { logger } from '../utils';
import { getSafeFilename } from '../utils/path';

/** Template type */
type TemplateType = 'basic' | 'advanced' | 'custom';

/**
 * Create skill command
 */
export function createCreateCommand(): Command {
  const command = new Command('create');

  command
    .description('Create a new skill (interactive)')
    .option('-n, --name <name>', 'Skill name')
    .option('-d, --description <description>', 'Skill description')
    .option('-t, --template <type>', 'Template type (basic, advanced, custom)', 'basic')
    .option('-o, --output <path>', 'Output directory')
    .option('--non-interactive', 'Disable interactive prompts')
    .action(async (options) => {
      await handleCreate(options);
    });

  return command;
}

/**
 * Handle create command logic
 */
async function handleCreate(options: {
  name?: string;
  description?: string;
  template?: TemplateType;
  output?: string;
  nonInteractive?: boolean;
}): Promise<void> {
  try {
    let skillName = options.name;
    let description = options.description;
    let template: TemplateType = options.template || 'basic';
    let tags: string[] = [];
    let author = '';
    let dependencies: string[] = [];
    let content = '';

    // Interactive mode
    if (!options.nonInteractive) {
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'name',
          message: 'Skill name:',
          default: skillName,
          validate: (input: string) => {
            const result = validateSkillName(input);
            return result.valid || result.error;
          },
        },
        {
          type: 'input',
          name: 'description',
          message: 'Description:',
          default: description,
          validate: (input: string) => {
            const result = validateDescription(input);
            return result.valid || result.error;
          },
        },
        {
          type: 'list',
          name: 'template',
          message: 'Select template:',
          choices: [
            { name: 'Basic - Simple skill structure', value: 'basic' },
            { name: 'Advanced - Full-featured skill with documentation', value: 'advanced' },
            { name: 'Custom - Minimal template with custom content', value: 'custom' },
          ],
          default: template,
        },
        {
          type: 'input',
          name: 'author',
          message: 'Author:',
          default: process.env.USER || process.env.USERNAME || '',
        },
        {
          type: 'input',
          name: 'tags',
          message: 'Tags (comma-separated):',
          filter: (input: string) => input.split(',').map((t: string) => t.trim()).filter(Boolean),
          validate: (input: string[]) => {
            const result = validateTags(input);
            return result.valid || result.error;
          },
        },
        {
          type: 'input',
          name: 'dependencies',
          message: 'Dependencies (comma-separated, optional):',
          filter: (input: string) => input.split(',').map((t: string) => t.trim()).filter(Boolean),
        },
        {
          type: 'editor',
          name: 'content',
          message: 'Enter skill content (will open editor):',
          default: getDefaultContent(template),
          when: (answers: any) => answers.template === 'custom',
        },
      ]);

      skillName = (answers.name as string) || skillName;
      description = (answers.description as string) || description;
      template = answers.template as TemplateType;
      author = (answers.author as string) || '';
      tags = (answers.tags as string[]) || [];
      dependencies = (answers.dependencies as string[]) || [];
      content = (answers.content as string) || '';
    } else {
      // Non-interactive mode
      if (!skillName || !description) {
        logger.error('Name and description are required in non-interactive mode.');
        process.exit(1);
      }
      content = getDefaultContent(template);
    }

    // Generate skill ID from name
    const skillId = getSafeFilename(skillName || '');

    // Validate
    const nameResult = validateSkillName(skillName || '');
    if (!nameResult.valid) {
      logger.error(nameResult.error || 'Invalid name');
      process.exit(1);
    }

    const descResult = validateDescription(description || '');
    if (!descResult.valid) {
      logger.error(descResult.error || 'Invalid description');
      process.exit(1);
    }

    const tagsResult = validateTags(tags);
    if (!tagsResult.valid) {
      logger.error(tagsResult.error || 'Invalid tags');
      process.exit(1);
    }

    // Create output directory
    const outputDir = options.output || path.join(process.cwd(), skillId);
    await fs.ensureDir(outputDir);

    // Generate skill file from template
    const skillContent = await generateFromTemplate(
      template,
      skillId,
      skillName || '',
      description || '',
      author || '',
      tags,
      dependencies,
      content
    );

    const skillFile = path.join(outputDir, 'SKILL.md');
    await fs.writeFile(skillFile, skillContent, 'utf-8');

    // Create additional files for advanced template
    if (template === 'advanced') {
      const readmePath = path.join(outputDir, 'README.md');
      await fs.writeFile(
        readmePath,
        generateReadme(skillName || '', description || ''),
        'utf-8'
      );
    }

    logger.success(`Created skill: ${skillName}`);
    logger.info(`Location: ${outputDir}`);
    logger.info(`Template: ${template}`);
    logger.newline();
    logger.info('To install this skill:');
    logger.info(`  1. Publish it to a GitHub repository`);
    logger.info(`  2. Add the repository as a source in .claude-skills.json`);
    logger.info(`  3. Run: claude-skills install ${skillId}`);
  } catch (error) {
    logger.error(`Create failed: ${(error as Error).message}`);
    process.exit(1);
  }
}

/**
 * Get default content for template
 */
function getDefaultContent(template: TemplateType): string {
  switch (template) {
    case 'basic':
      return '## Usage\n\nUse this skill when you need to...\n\n## Examples\n\nExample 1:\n- Input: ...\n- Output: ...';
    case 'advanced':
      return '## Overview\n\nThis skill provides...\n\n## Features\n\n- Feature 1\n- Feature 2';
    case 'custom':
      return '# Your skill content here\n\nDescribe what this skill does and how to use it.';
    default:
      return '';
  }
}

/**
 * Generate skill content from template
 */
async function generateFromTemplate(
  template: TemplateType,
  id: string,
  name: string,
  description: string,
  author: string,
  tags: string[],
  dependencies: string[],
  content: string
): Promise<string> {
  // Get template file path
  const templateDir = path.join(__dirname, '../../templates', template);
  const templateFile = path.join(templateDir, 'SKILL.md.template');

  let templateContent: string;

  if (await fs.pathExists(templateFile)) {
    templateContent = await fs.readFile(templateFile, 'utf-8');
  } else {
    // Fallback to built-in templates
    templateContent = getBuiltinTemplate(template);
  }

  // Replace placeholders
  const replacements: Record<string, string> = {
    '{{name}}': name,
    '{{description}}': description,
    '{{author}}': author,
    '{{tags}}': tags.map((t) => `"${t}"`).join(', '),
    '{{dependencies}}': dependencies.map((d) => `"${d}"`).join(', '),
    '{{content}}': content,
  };

  let result = templateContent;
  for (const [placeholder, value] of Object.entries(replacements)) {
    result = result.replace(new RegExp(placeholder, 'g'), value);
  }

  return result;
}

/**
 * Get built-in template
 */
function getBuiltinTemplate(template: TemplateType): string {
  const baseFrontmatter = (deps: string[]) => `---
name: {{name}}
description: {{description}}
version: 1.0.0
author: {{author}}
tags: [{{tags}}]${deps.length > 0 ? '\ndependencies: [' + deps.map((d) => `"${d}"`).join(', ') + ']' : ''}
---
`;

  switch (template) {
    case 'basic':
      return baseFrontmatter([]) + `
# {{name}}

{{description}}

## Usage

{{content}}

## Examples

Add your examples here.
`;

    case 'advanced':
      return baseFrontmatter(['{{dependencies}}']) + `
# {{name}}

{{description}}

## Overview

This skill provides comprehensive functionality for...

## Features

- Feature 1: Description
- Feature 2: Description

## Usage

### Basic Usage

\`\`\`
Input: your input here
Output: expected output
\`\`\`

## Examples

### Example 1

**Input:**
\`\`\`
Your input here
\`\`\`

**Output:**
\`\`\`
Expected output
\`\`\`

## Configuration

This skill accepts the following parameters:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| param1 | string | "default" | Description |

## Limitations

- Limitation 1
- Limitation 2

## Best Practices

1. Best practice 1
2. Best practice 2

## Related Skills

- [skill-name]: Description
`;

    case 'custom':
      return baseFrontmatter([]) + `
# {{name}}

{{description}}

## Usage

{{content}}
`;
  }
}

/**
 * Generate README for advanced template
 */
function generateReadme(name: string, description: string): string {
  return `# ${name}

${description}

## Installation

\`\`\`bash
claude-skills install ${name.toLowerCase().replace(/\s+/g, '-')}
\`\`\`

## Usage

...

## Examples

...

## License

MIT
`;
}
