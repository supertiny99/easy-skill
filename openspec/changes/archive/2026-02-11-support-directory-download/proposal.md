## Why

`es download` 探索仓库时，当前实现将所有技能候选平铺在同一个 multiselect 列表中。当仓库结构较复杂（如 anthropics/skills）时，目录类候选（📁）和技能类候选（✨）混在一起，用户无法按目录层级浏览和选择。部分技能可能嵌套在深层目录中，平铺列表无法体现其组织关系，且目录本身无法被有效下载使用。

## What Changes

- 将技能选择从平铺式 multiselect 升级为**目录导航式浏览器**：支持进入子目录、返回上层、跨层级选择
- 新增 `getDirectoryEntries` 函数，按层级返回当前目录的子目录和技能候选
- 新增 `browseAndSelect` 交互循环函数，使用 select 单选实现导航 + toggle 选择
- 用全局 `Set<string>` 跟踪已选择的候选路径，切换目录时选择状态不丢失
- 两个入口（`es download <url>` CLI 和 `es` TUI）统一使用新的浏览器交互
- `--all` 模式保持使用现有 `findSkillCandidates` 平铺逻辑，不受影响

## Capabilities

### New Capabilities

- `directory-browser`: 目录导航式技能浏览器，支持按层级浏览仓库结构、进入/回退目录、跨层级选择技能和资源目录进行下载

### Modified Capabilities

- `interactive-skill-picker`: 选择界面从平铺式 multiselect 替换为目录导航式浏览器，非 `--all` 模式下的交互方式发生变化

## Impact

- **代码**：`src/lib/skill/explorer.ts`（新增目录浏览函数）、`src/ui/quick-select.ts`（`downloadFromGitAction` 重构）、`src/index.ts`（download command 交互模式重构）
- **依赖**：无新增外部依赖
- **兼容性**：无 breaking change，`--all`/`--subdir`/`--id` 等 CLI 直接模式不受影响
