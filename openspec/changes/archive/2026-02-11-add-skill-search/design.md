## Context

`src/ui/skill-browser.ts` 中的 `browseAndSelect` 函数使用 `prompts` 库的 `select` 类型实现目录浏览器。用户通过上下方向键在选项列表中逐一滚动选择。当仓库技能/目录数量较多时，查找效率低下。同时，全选按钮（`🔘 Select all`）作为列表末尾的普通选项，也难以快速触达。

当前架构采用 **select-in-loop** 模式：每次迭代展示当前目录的选项列表，用户选择一个动作（导航、切换选择、全选、确认、取消），循环执行直到确认或取消。这种模式天然适合将 `select` 替换为 `autocomplete`，因为 `autocomplete` 同样是单选模式，只是增加了文本输入过滤能力。

## Goals / Non-Goals

**Goals:**

- 在现有目录浏览器中增加搜索过滤能力，用户输入关键词可实时过滤当前层级的条目
- 操作类选项（返回上层、全选、确认、取消）始终可见，不受过滤影响
- 零新增依赖，利用 `prompts` 库内置的 `autocomplete` 类型
- 不改变现有交互流程和选择状态管理逻辑

**Non-Goals:**

- 不实现跨目录层级的全局搜索
- 不实现模糊匹配算法（使用简单的子串匹配即可）
- 不改动 `getDirectoryEntries` 或 `explorer.ts` 中的数据层逻辑

## Decisions

### Decision 1: 使用 `prompts` 内置 `autocomplete` 类型替代 `select`

**选择**：将 `browseAndSelect` 中的 `type: 'select'` 替换为 `type: 'autocomplete'`。

**理由**：
- `prompts` 库已内置 `autocomplete` 类型，无需新增依赖
- `autocomplete` 与 `select` 同为单选模式，替换后不影响现有的 select-in-loop 架构
- 支持自定义 `suggest` 函数，可精确控制过滤逻辑
- 支持 `title`、`value`、`description` 属性，与现有 choices 结构完全兼容

**备选方案**：
- 引入 `inquirer` 等第三方库 → 新增依赖，API 风格不一致，排除
- 自行实现键盘监听和文本过滤 → 复杂度高，维护成本大，排除

### Decision 2: 自定义 `suggest` 函数实现分区过滤

**选择**：实现自定义 `suggest` 函数，将选项分为「操作类」和「内容类」两区：

- **操作类**（固定）：⬆️ 返回上层、🔘 全选/取消全选、✅ 确认下载、❌ 取消
- **内容类**（可过滤）：📁 目录、✨ 技能、📄 资源

过滤规则：
- 无输入时，返回全部选项（操作类 + 内容类），行为与现有 `select` 一致
- 有输入时，操作类选项始终保留；内容类选项按 `name` 和 `description` 进行大小写不敏感的子串匹配

**实现方式**：为每个 choice 的 `value` 添加 `isAction: boolean` 标记，`suggest` 函数根据该标记决定是否跳过过滤。

**理由**：
- 用户在搜索时仍需能执行导航、全选、确认等操作
- 子串匹配简单直观，无需引入复杂的模糊匹配库

### Decision 3: 过滤匹配字段选择

**选择**：匹配 `entry.name`（条目名称）和 `entry.description`（条目描述），大小写不敏感。

**理由**：
- `name` 是用户最可能记住的标识
- `description` 包含从 skill 文件中提取的描述信息，也是有效的搜索维度
- 不匹配 `path`，因为当前浏览器按层级展示，path 对用户来说不直观

### Decision 4: `autocomplete` 的 `limit` 参数设置

**选择**：设置 `limit: 20`，终端一屏显示最多 20 条匹配结果。

**理由**：
- 默认 `limit` 为 10，对技能较多的仓库可能显示不全
- 20 条在大多数终端窗口中可以完整显示
- 用户可通过输入关键词进一步缩小范围

## Risks / Trade-offs

- **chalk 渲染与过滤冲突**：当前 choice 的 `title` 中使用了 chalk 颜色标记（如 `chalk.green(entry.name)`），`suggest` 函数匹配时需要基于原始文本（`entry.name`）而非渲染后的带 ANSI 转义码的字符串 → 通过在 `suggest` 函数中使用独立的 `entry.name` / `entry.description` 字段匹配（而非解析 `title`）来规避
- **`autocomplete` 的 `clearFirst` 行为**：`autocomplete` 默认在首次 ESC 时清空输入而非退出 → 设置 `clearFirst: false`，ESC 直接返回 undefined（与现有 Ctrl+C 行为一致，已有兜底处理）
