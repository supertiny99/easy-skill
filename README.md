# easy-skill

[English](./README.en.md) | 简体中文

🛠️ TUI 技能管理工具 - 为 `.claude`、`.trae` 和 `.windsurf` 下载、组织和创建符号链接。

[![npm version](https://badge.fury.io/js/%40supertiny99%2Feasy-skill.svg)](https://www.npmjs.com/package/@supertiny99/easy-skill)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## ✨ 特性

- 📥 **智能下载** - 自动检测分支和 Git 仓库中的技能候选项
- 🔍 **仓库浏览器** - 浏览并多选任意仓库中的技能
- 🔗 **批量链接/取消链接** - 一次性管理多个 IDE 的符号链接
- 📋 **状态概览** - 查看所有技能及其链接状态
- ⚡ **快捷操作** - 全选、重命名冲突、跳过重复项

## 🚀 安装

```bash
npm install -g @supertiny99/easy-skill
```

## 📖 使用方法

### 交互式 TUI（推荐）

```bash
easy-skill
# 或使用短别名
es
```

### TUI 流程

```
1. 选择操作（下载 / 链接 / 取消链接 / 列表 / 删除）
2. Git 下载流程：
   - 输入仓库 URL
   - 从列表中选择分支
   - 多选要下载的技能（[空格] 选择，[a] 全选）
   - 处理冲突（覆盖/重命名/跳过/重新选择）
   - 多选要创建符号链接的 IDE
```

### CLI 命令

```bash
# 从 Git 下载（智能探索）
easy-skill download https://github.com/user/skills.git

# 带选项下载
easy-skill download https://github.com/user/skills.git \
  --branch main \
  --subdir my-skill \
  --id custom-name \
  --link

# 链接/取消链接技能
easy-skill link my-skill --claude --trae --windsurf
easy-skill unlink my-skill

# 列出所有技能
easy-skill list  # 或: es ls

# 删除技能
easy-skill remove my-skill  # 或: es rm my-skill --force
```

## 📁 目录结构

```
your-project/
├── skills/                    # 下载的技能
│   ├── skill-1/
│   └── skill-2/
├── .claude/skills/            # Claude 符号链接
│   ├── skill-1 -> ../../skills/skill-1
│   └── skill-2 -> ../../skills/skill-2
├── .trae/skills/              # Trae 符号链接
│   ├── skill-1 -> ../../skills/skill-1
│   └── skill-2 -> ../../skills/skill-2
└── .windsurf/skills/          # Windsurf 符号链接
    ├── skill-1 -> ../../skills/skill-1
    └── skill-2 -> ../../skills/skill-2
```

## 🎯 支持的 IDE

| IDE | 技能目录 |
|-----|---------|
| 🤖 Claude | `.claude/skills/` |
| 🚀 Trae | `.trae/skills/` |
| 🌊 Windsurf | `.windsurf/skills/` |

## 💻 Windows 使用说明

在 Windows 上，符号链接需要特殊处理：

- **Junction（推荐）**：工具会在 Windows 上自动使用 junction 类型链接，**不需要管理员权限**。
- **目录符号链接**：如果 junction 失败（例如跨卷链接），工具会回退到目录符号链接，需要以下条件之一：
  1. **管理员权限**：以管理员身份运行终端
  2. **开发者模式**：在"设置 > 更新和安全 > 开发者选项"中启用
  3. **Windows 10/11**：创建者更新（版本 1703）或更高版本

**常见场景：**
- ✅ 同一磁盘（如 C: 到 C:）：使用 junction 无需管理员权限即可工作
- ⚠️ 跨磁盘（如 C: 到 D:）：需要管理员权限或开发者模式
- ✅ 启用开发者模式：所有场景均可无缝工作

如果遇到权限错误，工具会提供详细的解决说明。

## 🔧 开发

```bash
# 克隆并安装
git clone https://github.com/supertiny99/easy-skill.git
cd easy-skill
npm install

# 构建并全局链接
npm run build
npm link

# 开发模式运行
npm run dev
```

## 📦 发布

```bash
# 补丁版本发布 (1.0.0 -> 1.0.1)
npm run release:patch

# 次要版本发布 (1.0.0 -> 1.1.0)
npm run release:minor

# 主要版本发布 (1.0.0 -> 2.0.0)
npm run release:major
```

## 📄 许可证

MIT © [supertiny99](https://github.com/supertiny99)
