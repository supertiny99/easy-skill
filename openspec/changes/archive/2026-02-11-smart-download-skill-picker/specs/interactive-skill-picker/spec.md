## ADDED Requirements

### Requirement: 多技能交互选择界面

当仓库探索发现多个技能候选时，系统 SHALL 展示交互式多选菜单，让用户选择要下载的技能。

#### Scenario: 展示技能候选列表
- **WHEN** `findSkillCandidates` 返回 2 个或更多候选
- **THEN** 系统 SHALL 使用 `prompts` 库的 `multiselect` 类型展示技能列表，每个选项包含技能名称和描述信息（如有），具有 `hasSkillFile` 标记的候选 SHALL 使用 ✨ 图标标识

#### Scenario: 用户选择部分技能
- **WHEN** 用户在多选菜单中选择了部分技能并确认
- **THEN** 系统 SHALL 仅下载用户选中的技能候选，每个使用其名称作为独立的技能 ID 复制到 `skills/` 目录

#### Scenario: 用户未选择任何技能
- **WHEN** 用户在多选菜单中未选择任何技能直接确认，或按 Ctrl+C 取消
- **THEN** 系统 SHALL 输出取消提示，清理临时目录并正常退出

### Requirement: 已存在技能的冲突处理

当用户选择的技能与本地已存在的技能同名时，系统 SHALL 逐个提示用户确认是否覆盖。

#### Scenario: 技能已存在且用户选择覆盖
- **WHEN** 用户选择下载的技能在 `skills/` 目录中已存在，且用户在确认提示中选择覆盖
- **THEN** 系统 SHALL 删除已有目录并安装新版本

#### Scenario: 技能已存在且用户选择跳过
- **WHEN** 用户选择下载的技能在 `skills/` 目录中已存在，且用户在确认提示中拒绝覆盖
- **THEN** 系统 SHALL 跳过该技能，继续处理下一个选中的技能

#### Scenario: --all 模式下技能已存在
- **WHEN** 使用 `--all` 选项且某些技能已存在
- **THEN** 系统 SHALL 自动覆盖已存在的技能，不弹出确认提示

### Requirement: 下载后自动链接提示

批量下载完成后，系统 SHALL 提示用户是否要为已下载的技能创建 IDE 符号链接（如果未指定 `--link` 选项）。

#### Scenario: 未指定 --link 时提示链接
- **WHEN** 批量下载完成且用户未指定 `--link` 选项
- **THEN** 系统 SHALL 使用 `confirm` 提示询问是否创建符号链接，若用户确认则使用 `multiselect` 让用户选择目标 IDE

#### Scenario: 已指定 --link 时自动链接
- **WHEN** 用户指定了 `--link` 选项
- **THEN** 系统 SHALL 为所有成功下载的技能自动创建到所有支持 IDE 的符号链接，不弹出额外提示
