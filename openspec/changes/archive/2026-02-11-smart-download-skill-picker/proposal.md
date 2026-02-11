## Why

`download` 命令当前的行为过于简单：直接将整个 Git 仓库 clone 到以 `path.basename(url)` 命名的目录中。当用户下载包含多个技能的仓库（如 `https://github.com/anthropics/skills`）时，整个仓库被当作单个名为 `skills` 的技能下载，丢失了仓库中各个独立技能的结构信息。项目中已有 `explorer.ts` 提供的仓库探索和技能候选发现能力，但 download 命令完全未使用。

## What Changes

- 重构 `download` 命令流程：先探测仓库结构，发现多个技能候选时进入交互选择模式
- 当仓库仅包含单个技能（或仓库根目录本身就是一个技能）时，保持现有的直接下载行为
- 当仓库包含多个技能候选时，展示技能列表（含名称、路径、描述），让用户多选要下载的技能
- 支持 `--all` 选项跳过交互，直接下载所有发现的技能
- 每个选中的技能单独复制到 `skills/<skill-id>/` 目录，而非将整个仓库作为一个目录

## Capabilities

### New Capabilities
- `smart-skill-discovery`: download 命令集成仓库探索能力，自动检测仓库中的技能候选列表，根据检测结果决定下载策略（单技能直接下载 vs 多技能交互选择）
- `interactive-skill-picker`: 多技能场景下的交互式选择界面，展示技能名称、相对路径和描述信息，支持多选和全选

### Modified Capabilities

## Impact

- **代码修改**：`src/index.ts` 中 download 命令的 action 处理逻辑需要重构
- **模块依赖**：download 命令将依赖 `explorer.ts` 中已有的 `exploreRepository`、`copySkillFromExplore`、`cleanupExplore` 函数
- **CLI 接口**：新增 `--all` 选项；现有的 `-s/--subdir` 和 `-i/--id` 选项在多技能模式下语义需要调整
- **用户体验**：下载多技能仓库时需要额外的网络请求（shallow clone 到临时目录进行探测）
