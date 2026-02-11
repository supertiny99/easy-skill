## MODIFIED Requirements

### Requirement: 多技能交互选择界面

当仓库探索发现多个技能候选时，系统 SHALL 使用目录导航式浏览器替代平铺式 multiselect，让用户按目录层级浏览和选择要下载的技能。

#### Scenario: 展示技能候选列表

- **WHEN** `exploreRepository` 返回结果且非 `--all` 模式
- **THEN** 系统 SHALL 调用 `browseAndSelect` 展示目录导航式浏览器，从仓库根目录开始，让用户逐层浏览并选择要下载的候选

#### Scenario: 用户选择部分技能

- **WHEN** 用户在浏览器中跨层级选择了若干候选并确认
- **THEN** 系统 SHALL 仅下载用户选中的候选，每个使用其名称作为独立的技能 ID 复制到 `skills/` 目录

#### Scenario: 用户未选择任何技能

- **WHEN** 用户在浏览器中未选择任何候选直接取消，或按 Ctrl+C
- **THEN** 系统 SHALL 输出取消提示，清理临时目录并正常退出

#### Scenario: TUI 入口使用相同浏览器

- **WHEN** 用户通过 `es` 进入 TUI 选择"📥 Download skill" → "🐙 Git repository"
- **THEN** 系统 SHALL 使用与 CLI `es download <url>` 相同的 `browseAndSelect` 浏览器进行技能选择
