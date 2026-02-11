# smart-skill-discovery Specification

## Purpose
TBD - created by archiving change smart-download-skill-picker. Update Purpose after archive.
## Requirements
### Requirement: download 命令集成仓库探索

CLI `download` 命令 SHALL 在下载前自动探索 Git 仓库结构，使用 `exploreRepository` 发现仓库中的技能候选列表，并根据发现结果决定下载策略。

#### Scenario: 多技能仓库自动探索
- **WHEN** 用户执行 `easy-skill download <url>` 且未同时指定 `--subdir` 和 `--id`
- **THEN** 系统 SHALL 对仓库执行 shallow clone 到临时目录，调用 `findSkillCandidates` 发现技能候选，并将结果传递给交互选择流程

#### Scenario: 精确下载跳过探索
- **WHEN** 用户执行 `easy-skill download <url> --subdir <path> --id <id>`（同时指定 subdir 和 id）
- **THEN** 系统 SHALL 跳过探索流程，直接使用原有的 `downloadSkill` 函数下载指定子目录

#### Scenario: 探索时使用指定分支
- **WHEN** 用户指定 `--branch <branch>` 选项
- **THEN** 系统 SHALL 使用指定分支进行仓库探索

### Requirement: 单技能自动下载

当仓库探索仅发现一个技能候选时，系统 SHALL 自动选中该技能并直接下载，不弹出选择菜单。

#### Scenario: 单技能仓库直接下载
- **WHEN** `findSkillCandidates` 返回恰好 1 个候选
- **THEN** 系统 SHALL 自动选中该候选，使用其名称作为技能 ID，从临时目录复制到 `skills/` 目录下，并在控制台输出发现信息

#### Scenario: 无技能候选
- **WHEN** `findSkillCandidates` 返回 0 个候选
- **THEN** 系统 SHALL 输出提示信息告知用户仓库中未发现技能候选，并以非零退出码退出

### Requirement: --all 选项批量下载

`download` 命令 SHALL 支持 `--all` 选项，跳过交互选择，下载所有发现的技能候选。

#### Scenario: 使用 --all 下载全部技能
- **WHEN** 用户执行 `easy-skill download <url> --all`
- **THEN** 系统 SHALL 下载所有发现的技能候选到 `skills/` 目录，每个候选使用其名称作为独立的技能 ID

#### Scenario: --all 与 --link 组合
- **WHEN** 用户同时指定 `--all` 和 `--link`
- **THEN** 系统 SHALL 下载所有技能并为每个技能创建到所有支持 IDE 的符号链接

### Requirement: 临时目录清理

系统 SHALL 确保在所有执行路径（成功、失败、用户取消）下都清理探索产生的临时目录。

#### Scenario: 下载成功后清理
- **WHEN** 技能下载完成（无论部分成功还是全部成功）
- **THEN** 系统 SHALL 调用 `cleanupExplore` 清理临时目录

#### Scenario: 错误时清理
- **WHEN** 探索或下载过程中发生错误
- **THEN** 系统 SHALL 在错误处理路径中调用 `cleanupExplore` 清理临时目录

#### Scenario: 用户取消时清理
- **WHEN** 用户在交互选择中取消操作
- **THEN** 系统 SHALL 清理临时目录后正常退出

