# easy-skill

English | [简体中文](./README.md)

🛠️ TUI tool for managing skills - download, organize and create symlinks for `.claude`, `.trae`, and `.windsurf`.

[![npm version](https://badge.fury.io/js/%40supertiny99%2Feasy-skill.svg)](https://www.npmjs.com/package/@supertiny99/easy-skill)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## ✨ Features

- 📥 **Smart Download** - Auto-detect branches and skill candidates from Git repos
- 🔍 **Repository Explorer** - Browse and multi-select skills from any repo
- 🔗 **Batch Link/Unlink** - Manage symlinks across multiple IDEs at once
- 📋 **Status Overview** - View all skills and their link status
- ⚡ **Quick Actions** - Toggle all, rename conflicts, skip duplicates

## 🚀 Installation

```bash
npm install -g @supertiny99/easy-skill
```

## 📖 Usage

### Interactive TUI (Recommended)

```bash
easy-skill
# or short alias
es
```

### TUI Flow

```
1. Select action (Download / Link / Unlink / List / Remove)
2. For Git downloads:
   - Enter repository URL
   - Select branch from list
   - Multi-select skills to download ([space] select, [a] toggle all)
   - Handle conflicts (overwrite/rename/skip/reselect)
   - Multi-select IDEs to create symlinks
```

### CLI Commands

```bash
# Download from Git (with smart explore)
easy-skill download https://github.com/user/skills.git

# Download with options
easy-skill download https://github.com/user/skills.git \
  --branch main \
  --subdir my-skill \
  --id custom-name \
  --link

# Link/Unlink skills
easy-skill link my-skill --claude --trae --windsurf
easy-skill unlink my-skill

# List all skills
easy-skill list  # or: es ls

# Remove skill
easy-skill remove my-skill  # or: es rm my-skill --force
```

## 📁 Directory Structure

```
your-project/
├── skills/                    # Downloaded skills
│   ├── skill-1/
│   └── skill-2/
├── .claude/skills/            # Claude symlinks
│   ├── skill-1 -> ../../skills/skill-1
│   └── skill-2 -> ../../skills/skill-2
├── .trae/skills/              # Trae symlinks
│   ├── skill-1 -> ../../skills/skill-1
│   └── skill-2 -> ../../skills/skill-2
└── .windsurf/skills/          # Windsurf symlinks
    ├── skill-1 -> ../../skills/skill-1
    └── skill-2 -> ../../skills/skill-2
```

## 🎯 Supported IDEs

| IDE | Skill Directory |
|-----|-----------------|
| 🤖 Claude | `.claude/skills/` |
| 🚀 Trae | `.trae/skills/` |
| 🌊 Windsurf | `.windsurf/skills/` |

## 💻 Windows Usage Notes

On Windows, symbolic links require special handling:

- **Junction (Recommended)**: The tool automatically uses junction-type links on Windows, which **do not require administrator privileges**.
- **Directory Symlinks**: If junction fails (e.g., cross-volume linking), the tool falls back to directory symlinks, which require either:
  1. **Administrator privileges**: Run your terminal as Administrator
  2. **Developer Mode**: Enable in Settings > Update & Security > For developers
  3. **Windows 10/11**: Creator Update (version 1703) or later

**Common scenarios:**
- ✅ Same disk (e.g., C: to C:): Works without admin using junction
- ⚠️ Cross-disk (e.g., C: to D:): Requires admin privileges or developer mode
- ✅ Developer Mode enabled: Works seamlessly for all scenarios

If you encounter permission errors, the tool will provide detailed instructions on how to resolve them.

## 🔧 Development

```bash
# Clone and install
git clone https://github.com/supertiny99/easy-skill.git
cd easy-skill
npm install

# Build and link globally
npm run build
npm link

# Run in dev mode
npm run dev
```

## 📦 Release

```bash
# Patch release (1.0.0 -> 1.0.1)
npm run release:patch

# Minor release (1.0.0 -> 1.1.0)
npm run release:minor

# Major release (1.0.0 -> 2.0.0)
npm run release:major
```

## 📄 License

MIT © [supertiny99](https://github.com/supertiny99)
