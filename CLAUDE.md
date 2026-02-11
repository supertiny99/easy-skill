# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**easy-skill** is a TUI (Text User Interface) tool for managing Claude, Trae, and Windsurf AI coding assistant skills. It downloads skills from Git repositories, manages them locally in a `skills/` directory, and creates symlinks to IDE-specific directories (`.claude/skills/`, `.trae/skills/`, `.windsurf/skills/`).

## Commands

### Development
```bash
npm run build       # TypeScript compilation to ./dist
npm run dev         # Run directly with ts-node
npm link            # Link for local development testing
```

### Testing
```bash
npm test            # Run tests in watch mode (Vitest)
npm run test:run    # Run tests once
```

### Release
```bash
npm run release:patch   # Bump patch version (1.0.0 -> 1.0.1)
npm run release:minor   # Bump minor version (1.0.0 -> 1.1.0)
npm run release:major   # Bump major version (1.0.0 -> 2.0.0)
```

Release scripts automatically build, commit, tag, and push to git.

## Architecture

### Entry Point
`src/index.ts` - CLI entry point using Commander.js, defines all commands and TUI flow.

### Core Modules (`src/lib/skill/`)

- **schema.ts** - TypeScript interfaces for Skill type, IDE types (Claude, Trae, Windsurf), and configuration
- **downloader.ts** - Downloads skills from Git URLs or local directories, handles subdirectory extraction for monorepos
- **linker.ts** - Creates/removes symlinks between `skills/` and IDE directories. Platform-specific logic:
  - Unix: standard directory symlinks
  - Windows: junctions (no admin required) with fallback to directory symlinks
- **explorer.ts** - Smart repository scanning that detects skill candidates by looking for indicator files (`skill.json`, `README.md`, etc.)

### TUI (`src/ui/quick-select.ts`)
Interactive multi-select prompts using the `prompts` library with keyboard shortcuts ([space] select, [a] select all), conflict resolution (overwrite/rename/skip), and batch operations for linking skills to multiple IDEs.

### Directory Structure Created by Tool
```
your-project/
├── skills/              # Downloaded skills
├── .claude/skills/      # Claude symlinks -> ../../skills/*
├── .trae/skills/        # Trae symlinks -> ../../skills/*
└── .windsurf/skills/    # Windsurf symlinks -> ../../skills/*
```

## Key Patterns

- **CommonJS Output**: TypeScript compiles to CommonJS (not ES modules) - the output in `dist/` is what gets executed
- **chalk v4**: Uses older chalk version for CommonJS compatibility (do not upgrade to v5+)
- **Git Integration**: Uses `simple-git` for branch fetching and repository operations
- **Platform Abstraction**: All symlink logic is centralized in `linker.ts` with Windows-specific handling

## CLI Commands Available

- `easy-skill` / `es` - Interactive TUI (default)
- `easy-skill download <url>` - Download from Git with smart exploration
- `easy-skill link <skill-id>` - Create symlinks to IDEs
- `easy-skill unlink <skill-id>` - Remove symlinks
- `easy-skill list` - Show all skills and link status
- `easy-skill remove <skill-id>` - Remove skill and all symlinks
