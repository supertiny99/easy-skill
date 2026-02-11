## 1. 数据层：目录浏览函数

- [x] 1.1 在 `src/lib/skill/explorer.ts` 中新增 `DirectoryEntry` 接口（name, path, type, description 字段）
- [x] 1.2 在 `src/lib/skill/explorer.ts` 中实现 `getDirectoryEntries(repoPath, relativePath)` 函数：读取指定目录的直接子目录，调用 `checkSkillCandidate` 判定类型，区分 directory/skill/resource 三种类型，过滤空目录
- [x] 1.3 处理根目录自身为技能的情况：当 relativePath 为空时，检测根目录是否有 skill 指示文件，有则在返回结果中包含根目录可选项
- [x] 1.4 导出 `DirectoryEntry` 和 `getDirectoryEntries`

## 2. 交互层：目录导航浏览器

- [x] 2.1 新建 `src/ui/skill-browser.ts` 文件，实现 `browseAndSelect(tempPath: string): Promise<SkillCandidate[]>` 函数
- [x] 2.2 实现浏览循环核心逻辑：维护 `currentPath`（当前目录）和 `selected`（已选路径 Set）状态
- [x] 2.3 实现菜单构建逻辑：按顺序生成 ⬆️ 返回上层 → 📁 子目录 → ◉/◯ ✨ 技能 → ◉/◯ 📄 资源 → ✅ 确认 → ❌ 取消
- [x] 2.4 实现各操作分发：navigate（进入/返回）、toggle（选中/取消）、confirm（确认下载）、cancel（取消）
- [x] 2.5 处理边界情况：空目录提示、无已选时确认提示、Ctrl+C 中断处理

## 3. 入口集成：CLI download 命令

- [x] 3.1 在 `src/index.ts` 的 download command 中，将非 `--all` 模式的 multiselect 逻辑替换为调用 `browseAndSelect`
- [x] 3.2 保持 `--all` 模式使用现有 `findSkillCandidates` 平铺逻辑不变
- [x] 3.3 保持 `--subdir` + `--id` 精确下载模式不变
- [x] 3.4 确保 `browseAndSelect` 返回结果能正确传递给后续的冲突检测和安装流程

## 4. 入口集成：TUI 交互模式

- [x] 4.1 在 `src/ui/quick-select.ts` 的 `downloadFromGitAction` 中，将 multiselect 逻辑替换为调用 `browseAndSelect`
- [x] 4.2 确保已选结果能正确传递给后续的冲突处理、安装和链接流程

## 5. 测试与验证

- [x] 5.1 为 `getDirectoryEntries` 编写单元测试：验证 directory/skill/resource 分类、空目录过滤、根目录技能检测
- [x] 5.2 手动验证：使用 `es download https://github.com/anthropics/skills` 测试目录导航浏览功能
- [x] 5.3 手动验证：使用 `es` TUI 入口测试相同功能
- [x] 5.4 手动验证：`--all` 模式和 `--subdir` + `--id` 模式不受影响
