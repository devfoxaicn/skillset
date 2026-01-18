# skillset

Your Claude Skills, Set and Ready - One-click installation tool for Claude Skills library.

## Features

- **Multiple Sources**: Install skills from GitHub, local directories, or custom sources
- **Flexible Installation**: Install skills globally or project-specific
- **Search & Discovery**: Search across all configured sources
- **Skill Creation**: Create custom skills with built-in templates (basic, advanced, custom)
- **Dependency Management**: Automatic dependency resolution and installation
- **Update Management**: Check for and install updates for installed skills
- **Configuration**: Interactive configuration management
- **Caching**: Intelligent caching for faster operations

## Installation

```bash
npm install -g skillset
```

## Usage

### Search Skills

```bash
# Search for skills
skillset search pdf

# Search with tag filter
skillset search --tag document

# Limit results
skillset search pdf --limit 10

# Verbose output
skillset search pdf --verbose
```

### Install Skills

```bash
# Install a skill globally (interactive)
skillset install

# Install a specific skill globally
skillset install pdf

# Install to current project
skillset install pdf --scope project

# Force reinstall
skillset install pdf --force

# Dry run
skillset install pdf --dry-run
```

### Manage Installed Skills

```bash
# List installed skills
skillset list

# List project skills
skillset list --scope project

# List with details
skillset list --verbose
```

### Update Skills

```bash
# Check for updates
skillset update --check-only

# Update all skills
skillset update

# Update specific skill
skillset update pdf

# Update project skills
skillset update --scope project
```

### Create Skills

```bash
# Interactive creation with template selection
skillset create

# Quick creation with basic template
skillset create --name myskill --description "My skill" --template basic

# Create with advanced template
skillset create --template advanced

# Create to specific directory
skillset create --output ./my-skill
```

### Remove Skills

```bash
# Remove with confirmation
skillset remove pdf

# Remove without confirmation
skillset remove pdf --yes

# Remove project skill
skillset remove pdf --scope project
```

### Configuration

```bash
# List current configuration
skillset config --list

# Initialize configuration file
skillset config --init

# Edit configuration interactively
skillset config --edit

# Set configuration value
skillset config --set defaultScope=project

# Get configuration value
skillset config --get defaultScope

# Use global configuration
skillset config --global
```

## Configuration

Create a `.skillset.json` file in your project root:

```json
{
  "sources": [
    {
      "type": "github",
      "name": "official",
      "enabled": true,
      "priority": 100,
      "github": {
        "owner": "anthropics",
        "repo": "skills",
        "branch": "main",
        "skillsPath": "skills"
      }
    },
    {
      "type": "local",
      "name": "my-skills",
      "enabled": true,
      "priority": 50,
      "local": {
        "path": "./my-skills"
      }
    }
  ],
  "defaultScope": "project",
  "cache": {
    "enabled": true,
    "ttl": 86400
  }
}
```

## Skill Templates

### Basic Template

Simple structure with essential sections:
- Name and description
- Usage instructions
- Examples

### Advanced Template

Full-featured template with:
- Overview and features
- Configuration options
- Multiple examples
- Error handling
- Limitations and best practices
- Related skills

### Custom Template

Minimal template for complete customization:
- Basic frontmatter
- Custom content editor

## Project Structure

```
skillset/
├── src/
│   ├── commands/       # CLI commands
│   ├── core/           # Core business logic
│   │   ├── sources/    # Source implementations
│   │   ├── installer/  # Installation logic
│   │   └── cache/      # Caching system
│   ├── config/         # Configuration management
│   ├── types/          # TypeScript types
│   └── utils/          # Utilities
├── templates/          # Skill templates
└── dist/              # Compiled output
```

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run in development
npm run dev

# Run tests
npm test

# Lint
npm run lint

# Format
npm run format
```

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## License

MIT
