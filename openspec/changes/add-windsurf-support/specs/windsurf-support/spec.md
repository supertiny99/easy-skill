## ADDED Requirements

### Requirement: Windsurf IDE 类型定义

系统必须在 IDE 类型定义中包含 Windsurf，使其成为受支持的 IDE 之一。

#### Scenario: 导入 IDEType 时包含 Windsurf

- **WHEN** 代码引用 `IDEType` 类型
- **THEN** `'windsurf'` 必须是有效的类型值

#### Scenario: 获取支持的 IDE 列表

- **WHEN** 查询 `SUPPORTED_IDES` 常量
- **THEN** 数组中必须包含 `'windsurf'`

### Requirement: Windsurf 技能目录路径配置

系统必须定义 Windsurf IDE 的技能目录路径为 `.windsurf/skills`。

#### Scenario: 获取 Windsurf 技能路径

- **WHEN** 通过 `IDE_SKILL_PATHS['windsurf']` 查询路径
- **THEN** 返回值必须为 `'.windsurf/skills'`

#### Scenario: 在项目根目录创建 Windsurf 技能目录

- **WHEN** 系统需要创建 Windsurf 技能目录
- **THEN** 必须在项目根目录下创建 `.windsurf/skills` 目录

### Requirement: Windsurf 技能链接创建

系统必须支持将技能通过符号链接连接到 Windsurf IDE 的技能目录。

#### Scenario: 成功链接技能到 Windsurf

- **WHEN** 用户执行链接操作，指定 IDE 为 `'windsurf'`
- **THEN** 系统必须在 `.windsurf/skills/<skill-id>` 创建指向技能源路径的符号链接

#### Scenario: 链接多个技能到 Windsurf

- **WHEN** 用户批量选择多个技能链接到 Windsurf
- **THEN** 系统必须为每个技能在 `.windsurf/skills/` 下创建独立的符号链接

#### Scenario: 取消技能与 Windsurf 的链接

- **WHEN** 用户执行取消链接操作，指定 IDE 为 `'windsurf'`
- **THEN** 系统必须删除 `.windsurf/skills/<skill-id>` 处的符号链接

### Requirement: CLI 命令支持 Windsurf 参数

系统的命令行界面必须接受 `--windsurf` 标志来指定 Windsurf IDE。

#### Scenario: 使用 --windsurf 标志链接技能

- **WHEN** 用户执行 `easy-skill link <skill-id> --windsurf`
- **THEN** 系统必须将技能链接到 Windsurf IDE

#### Scenario: 同时链接到多个 IDE 包括 Windsurf

- **WHEN** 用户执行 `easy-skill link <skill-id> --claude --trae --windsurf`
- **THEN** 系统必须将技能同时链接到 Claude、Trae 和 Windsurf 三个 IDE

### Requirement: TUI 界面支持 Windsurf 选择

交互式 TUI 界面必须在 IDE 选择列表中提供 Windsurf 选项。

#### Scenario: IDE 多选列表包含 Windsurf

- **WHEN** 用户在 TUI 中进入 IDE 选择界面
- **THEN** 选项列表中必须显示 Windsurf 作为可选项

#### Scenario: 在 TUI 中选择 Windsurf

- **WHEN** 用户在 TUI 中勾选 Windsurf 选项并确认
- **THEN** 系统必须将技能链接到 Windsurf IDE

#### Scenario: 查看技能链接状态时显示 Windsurf

- **WHEN** 用户在 TUI 中查看技能的链接状态
- **THEN** 如果技能已链接到 Windsurf，必须在状态中显示 Windsurf

### Requirement: Windsurf 链接状态检查

系统必须能够检查技能是否已链接到 Windsurf IDE，以及链接的有效性。

#### Scenario: 检查技能是否链接到 Windsurf

- **WHEN** 系统检查技能的链接状态，指定 IDE 为 `'windsurf'`
- **THEN** 系统必须返回该技能是否存在于 `.windsurf/skills/` 目录

#### Scenario: 验证 Windsurf 符号链接有效性

- **WHEN** 检查 Windsurf 技能链接的有效性
- **THEN** 系统必须验证符号链接存在且指向的源路径仍然有效

#### Scenario: 列出所有链接到 Windsurf 的技能

- **WHEN** 用户查询链接到 Windsurf 的所有技能
- **THEN** 系统必须返回 `.windsurf/skills/` 目录下的所有符号链接及其源路径
