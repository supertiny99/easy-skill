## Why

easy-skill 当前仅支持 Claude 和 Trae 两个 IDE 的技能管理，但 Windsurf 作为新兴的 AI 辅助编程工具，也需要类似的技能管理能力。此外，项目声明支持 Windows 系统（package.json 中包含 "win32"），但符号链接在 Windows 上的行为与 Unix 系统不同，需要验证现有实现是否能在 Windows 上正常工作。

## What Changes

- 新增 Windsurf IDE 支持，允许用户将技能链接到 `.windsurf/skills` 目录
- 添加 Windows 符号链接兼容性检查和处理逻辑
- 在交互式 TUI 和 CLI 命令中暴露 Windsurf 选项
- 确保 `fs.symlink` 在 Windows 上使用正确的参数（可能需要管理员权限或 junction 类型）
- 更新文档说明 Windsurf 支持和 Windows 使用注意事项

## Capabilities

### New Capabilities

- `windsurf-support`: 为 Windsurf IDE 提供技能下载、链接和管理功能，包括类型定义、路径配置和符号链接创建
- `windows-symlink-compatibility`: 检测和处理 Windows 系统上符号链接的特殊要求，包括权限检查、类型选择（symlink vs junction）和错误处理

### Modified Capabilities

无。当前项目没有现有的规格文档需要修改。

## Impact

**受影响的代码**:
- `src/lib/skill/schema.ts`: 需要在 `IDEType` 中添加 `'windsurf'`，在 `IDE_SKILL_PATHS` 和 `SUPPORTED_IDES` 中添加相应配置
- `src/lib/skill/linker.ts`: 可能需要修改 `createSymlink` 函数以处理 Windows 平台的特殊逻辑（如检测权限、使用 junction 类型等）
- `src/ui/quick-select.ts`: TUI 界面需要在 IDE 选择列表中加入 Windsurf 选项
- `src/index.ts`: CLI 命令参数需要支持 `--windsurf` 标志

**受影响的依赖**:
- 现有依赖 `fs-extra` 已支持符号链接操作，但可能需要添加平台检测逻辑

**受影响的文档**:
- README.md 需要更新支持的 IDE 列表，添加 Windsurf 相关使用说明
- 需要补充 Windows 系统使用注意事项（如可能需要管理员权限）
