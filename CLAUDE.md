# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**skillset** is a CLI package manager for Claude Skills - extensions that add specific capabilities to Claude Code (similar to VS Code extensions). The tool allows users to discover, install, manage, and update Claude Skills from various sources including GitHub repositories and local directories.

## Common Commands

### Development
```bash
npm run build      # Compile TypeScript to dist/
npm run dev        # Run in development mode (ts-node)
npm run lint       # ESLint code quality check
npm run format     # Prettier code formatting
npm test          # Run Jest tests
```

### Testing the CLI
```bash
# After building, test commands:
node dist/index.js --help
node dist/index.js search pdf
node dist/index.js list
```

## Architecture

### Source Abstraction Pattern

The core architectural pattern is the **source abstraction** (`src/core/sources/`). The `SkillSource` interface defines a contract for fetching skills from different backends:

- **GitHubSource** (`github-source.ts`): Fetches skills from GitHub repos via Octokit API
- **LocalSource** (`local-source.ts`): Reads skills from local filesystem
- **SourceManager** (`source-manager.ts`): Aggregates multiple sources with priority-based ordering

Sources are configured via `.skillset.json` and initialized through `SourceManager.fromConfigs()`. Each source implements:
- `listSkills()`: Enumerate all available skills
- `getSkill(id)`: Fetch a specific skill with content
- `validate()`: Check source accessibility

### Installation Pipeline

The installation flow (`src/core/installer/`):

1. **SkillFetcher** (implicit via sources): Retrieves skill metadata and content from sources
2. **SkillInstaller** (`skill-installer.ts`): Writes skills to filesystem with metadata tracking
3. **DependencyResolver** (`dependency-resolver.ts`): Resolves and installs skill dependencies recursively

Skills are installed with a `.skill-meta.json` file tracking version, source, and installation timestamp.

### Install Scopes

Two installation modes exist:
- **Global**: `~/.claude/skills/` - Available to all projects
- **Project**: `<project-root>/.claude/skills/` - Project-specific skills

Project root is detected by finding `.git`, `package.json`, or `.skillset.json`.

### Configuration System

Configuration uses `cosmiconfig` (`src/config/`) to search for config in multiple locations:
1. `.skillset.json` / `.skillsetrc.json`
2. `skillset.config.js`
3. `skillset` property in `package.json`

Config structure includes sources array, cache settings, and default scope.

### CLI Structure

Commands (`src/commands/`) follow a consistent pattern:
- Use Commander.js for argument parsing
- Use Inquirer.js for interactive prompts
- Use Ora for spinners and Chalk for colored output
- Return appropriate exit codes

Each command is a standalone module that can be tested independently.

## Type System

All types are centralized in `src/types/index.ts`:
- `SkillMetadata`: Basic skill info (id, name, description, version, tags)
- `Skill`: Full skill with content and optional additional files
- `SkillSource`: Interface all sources must implement
- `InstallOptions`, `InstallResult`: Installation-related types

The system uses strict TypeScript with ES2022 target and CommonJS modules.

## Skill Format

Skills are markdown files (`SKILL.md`) with YAML frontmatter:
```yaml
---
name: PDF Processor
description: Process PDF documents
version: 1.0.0
author: Author Name
tags: [pdf, document]
dependencies: [other-skill]
---
```

## Templates

The `templates/` directory contains scaffolding templates for new skills:
- `basic/`: Simple structure with examples
- `advanced/`: Full documentation and best practices
- `custom/`: Minimal template for complete customization

Templates are used by the `create` command to generate new skills.

## Key Implementation Details

- **Error Handling**: Global handlers for uncaught exceptions/rejections in `src/index.ts`
- **Logging**: Leveled logging via `loglevel` with colored console output
- **Path Handling**: Cross-platform path utilities in `src/utils/path.ts`
- **Caching**: Cache system for source listings to reduce API calls
- **Project Detection**: Searches upward for `.git`, `package.json`, or `.skillset.json`

## Testing

Tests are run with Jest. Test files should be placed in a `tests/` directory (not yet present in the project). Coverage reports are generated in `coverage/`.
