## Context

当前 `es download` 的技能选择采用平铺式 multiselect：`findSkillCandidates` 递归扫描仓库所有层级，将发现的技能和目录候选平铺在同一个列表中。这种方式在仓库结构简单时可用，但面对如 anthropics/skills 这样的复杂仓库（多层嵌套、目录与技能混合），用户无法按层级浏览，目录类候选也无法有效下载。

两个入口受影响：
- `es download <url>` — CLI 直接下载（`src/index.ts`）
- `es` → TUI → 下载 → Git（`src/ui/quick-select.ts` → `downloadFromGitAction`）

现有依赖：`prompts` 库提供 select/multiselect 交互组件。

## Goals / Non-Goals

**Goals:**

- 实现目录导航式浏览器，支持进入子目录、返回上层、跨层级选择
- 两个入口（CLI 和 TUI）统一使用新的浏览器交互
- 已选择状态在目录切换时保持不丢失
- 目录和技能都可以被选择下载

**Non-Goals:**

- 不改变 `--all` 模式的行为（保持平铺式批量下载）
- 不改变 `--subdir` + `--id` 精确下载模式
- 不改变 `copySkillFromExplore` 的复制逻辑
- 不新增外部依赖

## Decisions

### 决策 1：用 select 循环替代 multiselect

**选择**：使用 `prompts` 的 `select`（单选）在 while 循环中实现导航和选择，而非 multiselect。

**理由**：multiselect 不支持"进入目录"这种非选择型动作。select 每次返回一个用户操作，可以在循环中分发处理：导航进入目录、toggle 选中状态、确认下载、取消。

**替代方案**：
- 改用 multiselect + 特殊值检测 — prompts 不支持在选中后拦截并取消选中，无法实现导航
- 使用 ink/blessed 等全功能终端 UI — 引入重依赖，过度工程化

### 决策 2：新增 getDirectoryEntries 按层级返回内容

**选择**：新增 `getDirectoryEntries(repoPath, relativePath)` 函数，只读取指定目录的直接子项（不递归），对每个子目录调用 `checkSkillCandidate` 判定类型。

**理由**：与现有 `findSkillCandidates`（递归平铺）互补。导航模式只需当前层级的内容，不需要一次性扫描整个仓库。

**返回结构**：
```typescript
interface DirectoryEntry {
  name: string;
  path: string;           // 相对于仓库根的路径
  type: 'directory' | 'skill' | 'resource';
  description?: string;
}
```
- `directory`：有子目录但自身不是技能，可进入浏览
- `skill`：有 skill 指示文件（hasSkillFile），可选择下载
- `resource`：无 skill 文件但有内容文件，可选择下载

### 决策 3：browseAndSelect 作为独立交互函数

**选择**：新增 `browseAndSelect(tempPath: string): Promise<SkillCandidate[]>` 函数，封装整个浏览循环逻辑。

**理由**：两个入口（CLI 和 TUI）都需要此功能，抽成独立函数避免重复。放在 `src/ui/` 下（如 `src/ui/skill-browser.ts`）因为它是交互逻辑。

**内部状态**：
- `currentPath: string` — 当前浏览的目录（相对路径，根为 `''`）
- `selected: Set<string>` — 已选择的候选路径集合
- `candidateMap: Map<string, SkillCandidate>` — 路径到候选的映射（缓存）

### 决策 4：菜单渲染结构

每轮 select 菜单的 choices 按以下顺序构建：

1. `⬆️ ..` — 返回上层（仅在非根目录时显示）
2. `📁 dirname` — 可进入的子目录（type === 'directory'）
3. `◉/◯ ✨ skillname` — 可选择的技能（type === 'skill'）
4. `◉/◯ 📄 dirname` — 可选择的资源目录（type === 'resource'）
5. `✅ 确认下载 (N 已选)` — 确认操作（仅当 selected.size > 0 时启用）
6. `❌ 取消` — 取消操作

value 使用对象 `{ action: 'navigate' | 'toggle' | 'confirm' | 'cancel', path?: string }`。

### 决策 5：根目录特殊处理

如果仓库根目录本身是一个技能（有 skill 指示文件），在根层级额外展示一个 `✨ <repo-name> (根目录)` 可选项。复用现有 `checkSkillCandidate` 对根目录的检测逻辑。

## Risks / Trade-offs

- **select 循环的用户体验** — 每次操作后菜单重新渲染，不如 multiselect 流畅 → 通过清晰的路径提示和已选数量显示来补偿
- **prompts select 的渲染闪烁** — 每轮循环重新调用 prompts.select 可能有屏幕闪烁 → 可接受的 trade-off，prompts 库的渲染已经足够快
- **深层目录导航繁琐** — 用户需要逐层进入 → 保留现有 `--subdir` 选项作为快捷方式；同时如果某层只有一个子目录可以考虑自动进入（留作后续优化）
- **已有测试覆盖** — 需要为新的浏览器函数编写测试 → 新增 `getDirectoryEntries` 的单元测试
