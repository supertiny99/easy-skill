# directory-browser Specification

## Purpose
目录导航式技能浏览器，支持按层级浏览仓库结构、进入/回退目录、跨层级选择技能和资源目录进行下载。

## Requirements

### Requirement: 目录层级浏览

系统 SHALL 提供目录导航式浏览器，允许用户按仓库目录层级逐层浏览内容，而非将所有候选平铺在同一列表中。

#### Scenario: 根目录展示

- **WHEN** 仓库探索完成，进入交互选择阶段
- **THEN** 系统 SHALL 展示仓库根目录的直接子项，包括可进入的子目录（📁）、可选择的技能（✨）和可选择的资源目录（📄）

#### Scenario: 进入子目录

- **WHEN** 用户选择一个 📁 类型的子目录
- **THEN** 系统 SHALL 切换到该子目录，展示其直接子项内容，并在菜单顶部显示当前路径

#### Scenario: 返回上层目录

- **WHEN** 用户在非根目录层级选择"⬆️ 返回上层"选项
- **THEN** 系统 SHALL 切换到父目录，展示父目录的直接子项内容

#### Scenario: 根目录无返回选项

- **WHEN** 用户处于根目录层级
- **THEN** 系统 SHALL 不显示"⬆️ 返回上层"选项

### Requirement: 目录项分类展示

系统 SHALL 对当前目录层级的内容按类型分类展示，使用不同图标区分。

#### Scenario: 子目录展示

- **WHEN** 当前目录包含有内容的子目录（子目录内有子目录或内容文件）
- **THEN** 系统 SHALL 将其展示为 📁 类型，可进入浏览但不可直接选择下载

#### Scenario: 技能展示

- **WHEN** 当前目录包含有 skill 指示文件（skill.json/skill.yaml/skill.yml/skill.md/SKILL.md/index.md/README.md）的子目录
- **THEN** 系统 SHALL 将其展示为 ✨ 类型，可选择下载，并显示从 skill 文件中提取的描述信息

#### Scenario: 资源目录展示

- **WHEN** 当前目录包含无 skill 指示文件但有内容文件（.md/.txt/.json/.yaml/.yml）的子目录，且该子目录无可浏览的子目录
- **THEN** 系统 SHALL 将其展示为 📄 类型，可选择下载

#### Scenario: 空目录过滤

- **WHEN** 当前目录包含无内容文件且无有效子目录的空子目录
- **THEN** 系统 SHALL 不展示该子目录

### Requirement: 跨层级选择状态保持

系统 SHALL 在目录切换时保持用户已选择的候选状态不丢失。

#### Scenario: 进入子目录后保持选择

- **WHEN** 用户在当前层级选中了若干候选后进入某个子目录
- **THEN** 之前选中的候选 SHALL 保持选中状态，在确认下载时包含在内

#### Scenario: 返回上层后保持选择

- **WHEN** 用户在子目录层级选中了若干候选后返回上层
- **THEN** 之前在各层级选中的候选 SHALL 全部保持选中状态

#### Scenario: 已选候选的视觉反馈

- **WHEN** 用户浏览到某个层级，该层级中有已被选中的候选
- **THEN** 已选中的候选 SHALL 使用 ◉ 前缀标识，未选中的 SHALL 使用 ◯ 前缀标识

### Requirement: 搜索过滤

系统 SHALL 在目录浏览器的选择界面中提供搜索过滤能力，用户可通过输入关键词实时过滤当前层级的条目列表。

#### Scenario: 无输入时展示全部条目

- **WHEN** 用户未输入任何搜索关键词
- **THEN** 系统 SHALL 展示当前层级的全部条目，行为与未启用搜索时完全一致

#### Scenario: 输入关键词过滤内容条目

- **WHEN** 用户输入搜索关键词
- **THEN** 系统 SHALL 对内容类条目（📁 目录、✨ 技能、📄 资源）按名称和描述进行大小写不敏感的子串匹配，仅展示匹配的条目

#### Scenario: 操作类选项不受过滤影响

- **WHEN** 用户输入搜索关键词
- **THEN** 操作类选项（⬆️ 返回上层、🔘 全选/取消全选、✅ 确认下载、❌ 取消）SHALL 始终可见，不受搜索过滤影响

#### Scenario: 无匹配结果

- **WHEN** 用户输入的关键词未匹配到任何内容类条目
- **THEN** 系统 SHALL 仅展示操作类选项，不显示任何内容类条目

#### Scenario: 搜索状态不跨层级保持

- **WHEN** 用户在搜索过滤状态下选择导航操作（进入子目录或返回上层）
- **THEN** 搜索输入 SHALL 被清空，新目录层级展示全部条目

### Requirement: 确认和取消操作

系统 SHALL 在浏览器菜单中提供确认下载和取消操作选项。这些操作选项属于「操作类」，在搜索过滤时始终可见。

#### Scenario: 确认下载

- **WHEN** 用户选择"✅ 确认下载"选项且已选择至少一个候选
- **THEN** 系统 SHALL 结束浏览循环，将所有已选候选传递给下载安装流程

#### Scenario: 无已选时确认

- **WHEN** 用户选择"✅ 确认下载"选项但未选择任何候选
- **THEN** 系统 SHALL 提示"未选择任何项目"并继续浏览循环

#### Scenario: 取消浏览

- **WHEN** 用户选择"❌ 取消"选项
- **THEN** 系统 SHALL 结束浏览循环，返回空列表，调用方负责清理临时目录

#### Scenario: 全选操作始终可见

- **WHEN** 当前层级存在可选择的条目（技能或资源），且用户正在输入搜索关键词
- **THEN** 🔘 全选/取消全选选项 SHALL 始终可见，其作用范围为当前层级的全部可选择条目（不限于过滤后的可见条目）

### Requirement: 根目录自身为技能

当仓库根目录自身具有 skill 指示文件时，系统 SHALL 在根层级展示一个代表根目录的可选项。

#### Scenario: 根目录是技能

- **WHEN** 仓库根目录包含 skill 指示文件
- **THEN** 系统 SHALL 在根层级的可选项中额外展示一个 `✨ <仓库名> (根目录)` 项，用户可选择下载整个仓库根目录

#### Scenario: 根目录不是技能

- **WHEN** 仓库根目录不包含 skill 指示文件
- **THEN** 系统 SHALL 不展示根目录可选项，仅展示其子目录和子项

### Requirement: getDirectoryEntries 函数

系统 SHALL 提供 `getDirectoryEntries` 函数，按层级返回指定目录的直接子项分类信息。

#### Scenario: 返回直接子项

- **WHEN** 调用 `getDirectoryEntries(repoPath, relativePath)`
- **THEN** 函数 SHALL 只读取指定目录的直接子目录（不递归），对每个子目录调用 `checkSkillCandidate` 判定类型，返回 `DirectoryEntry[]`

#### Scenario: 区分可浏览目录和可选择项

- **WHEN** 某个子目录内部还有子目录
- **THEN** 函数 SHALL 将其标记为 `type: 'directory'`（可进入浏览）
- **WHEN** 某个子目录有 skill 指示文件
- **THEN** 函数 SHALL 将其标记为 `type: 'skill'`（可选择下载）
- **WHEN** 某个子目录无 skill 指示文件但有内容文件且无可浏览子目录
- **THEN** 函数 SHALL 将其标记为 `type: 'resource'`（可选择下载）
