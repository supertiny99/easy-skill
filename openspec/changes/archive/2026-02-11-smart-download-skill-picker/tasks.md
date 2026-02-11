## 1. 重构 download 命令 - 智能探索集成

- [x] 1.1 在 `src/index.ts` download 命令中添加 `--all` 选项定义
- [x] 1.2 在 download action 开头添加精确下载判断：当同时指定 `--subdir` 和 `--id` 时走原有的 `downloadSkill` 流程
- [x] 1.3 在非精确模式下，调用 `exploreRepository(url, branch)` 进行仓库探索，并添加探索中的进度提示输出
- [x] 1.4 处理探索结果为 0 个候选的情况：输出错误信息并退出
- [x] 1.5 处理探索结果为 1 个候选的情况：自动选中并使用 `copySkillFromExplore` 下载

## 2. 多技能交互选择

- [x] 2.1 实现多技能候选的 `multiselect` 交互菜单，展示技能名称、路径和描述，用 ✨ 标识有 skill 文件的候选
- [x] 2.2 处理用户未选择任何技能（空选择或 Ctrl+C 取消）的情况：清理临时目录并退出
- [x] 2.3 实现 `--all` 选项逻辑：跳过交互选择，直接选中所有候选

## 3. 冲突处理与批量安装

- [x] 3.1 对每个选中的技能检查是否已存在，已存在时弹出覆盖确认提示；`--all` 模式下自动覆盖
- [x] 3.2 使用 `copySkillFromExplore` 逐个安装选中的技能，输出每个技能的安装结果
- [x] 3.3 确保所有执行路径（成功、失败、取消）都调用 `cleanupExplore` 清理临时目录

## 4. 下载后链接处理

- [x] 4.1 当指定 `--link` 时，自动为所有成功下载的技能创建到所有支持 IDE 的符号链接
- [x] 4.2 当未指定 `--link` 时，使用 `confirm` + `multiselect` 提示用户选择是否链接及目标 IDE

## 5. 导入与依赖调整

- [x] 5.1 在 `src/index.ts` 顶部添加 `explorer.ts` 中 `exploreRepository`、`copySkillFromExplore`、`cleanupExplore` 的导入
- [x] 5.2 验证构建通过：`npm run build`
