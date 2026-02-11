## Context

当前 `download` 命令（`src/index.ts` L26-78）直接将整个 Git 仓库 clone 为单个技能目录，使用 `path.basename(url, '.git')` 作为技能 ID。对于多技能仓库（如 `https://github.com/anthropics/skills`），整个仓库被下载为一个名为 `skills` 的目录。

TUI 模式（`src/ui/quick-select.ts` L68-308 `downloadFromGitAction`）已经实现了完整的智能流程：获取分支 → shallow clone 到临时目录 → `findSkillCandidates` 发现技能列表 → 交互式多选 → 逐个复制安装。但这套逻辑完全封闭在 TUI 内部，CLI download 命令无法使用。

约束：
- 依赖 `prompts` 库进行交互，该库支持 `select`、`multiselect`、`confirm` 等类型
- `explorer.ts` 提供的 `exploreRepository` 会进行一次 shallow clone 到临时目录，有网络和磁盘开销
- 现有 CLI 接口支持 `-b/--branch`、`-s/--subdir`、`-i/--id`、`-l/--link` 选项

## Goals / Non-Goals

**Goals:**
- CLI `download` 命令默认启用智能探索：先探测仓库结构，发现多技能时展示交互选择列表
- 当用户明确指定 `--subdir` 和 `--id` 时，跳过探索直接下载（保持向后兼容）
- 新增 `--all` 选项：跳过交互选择，下载所有发现的技能
- 复用 `explorer.ts` 中已有的基础设施，不重复实现探索逻辑

**Non-Goals:**
- 不修改 TUI `quick-select.ts` 中已有的智能下载流程
- 不引入新的外部依赖
- 不改变 `explorer.ts` 中 `findSkillCandidates` 的技能发现算法

## Decisions

### 决策 1：直接在 download 命令的 action 中集成探索逻辑

**方案 A（选定）**：在 `index.ts` download 命令的 action handler 中直接调用 `exploreRepository` 等函数，编写 CLI 交互流程。

**方案 B（备选）**：将 `quick-select.ts` 中的 `downloadFromGitAction` 提取为共享模块。

**选择 A 的理由**：CLI 和 TUI 的交互模式不同（CLI 使用 commander 选项 + prompts，TUI 是纯 prompts 向导），提取共享模块会引入不必要的抽象层。两者共享的是 `explorer.ts` 的底层能力，不是交互逻辑本身。

### 决策 2：智能探索的触发条件

当用户**同时指定** `--subdir` 和 `--id` 时，视为精确下载意图，跳过探索直接使用原有的 `downloadSkill` 流程。其他情况均进入智能探索模式。

理由：`--subdir` + `--id` 组合说明用户已经知道要下载什么，无需探索。单独指定 `--id` 只是想覆盖默认命名，仍应走探索流程。

### 决策 3：单技能仓库的行为

当 `findSkillCandidates` 仅返回 1 个候选时，自动选中该技能并直接下载，不弹出选择菜单。但在控制台输出发现信息以保持透明。

### 决策 4：`--all` 选项的语义

`--all` 跳过交互选择，下载所有发现的技能候选。与 `--link` 组合使用时，所有下载的技能都自动链接到所有 IDE。

## Risks / Trade-offs

- **网络开销**：智能探索需要额外的 shallow clone 到临时目录 → 对于单技能仓库是额外开销。缓解措施：shallow clone（`--depth 1`）已经最小化了下载量，且仅在未指定 `--subdir` + `--id` 时触发。
- **临时目录清理**：探索完成后需确保清理临时目录 → 使用 `cleanupExplore` 并在 error path 中也调用清理。
- **向后兼容**：对于仅有根级技能的仓库，新行为与旧行为结果一致（自动选中唯一候选）。对于多技能仓库，旧行为是下载整个仓库为单个目录，新行为是列出选择。这是有意的行为改变，不是 breaking change（结果更好）。
