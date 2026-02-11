## 1. 添加 Windsurf IDE 类型定义

- [x] 1.1 在 `src/lib/skill/schema.ts` 中将 `IDEType` 类型扩展为包含 `'windsurf'`
- [x] 1.2 在 `IDE_SKILL_PATHS` 对象中添加 `windsurf: '.windsurf/skills'` 配置
- [x] 1.3 在 `SUPPORTED_IDES` 数组中添加 `'windsurf'` 元素
- [x] 1.4 验证 TypeScript 编译通过，所有引用 IDEType 的代码仍然类型正确

## 2. 实现 Windows 符号链接兼容性

- [x] 2.1 在 `src/lib/skill/linker.ts` 的 `createSymlink` 函数开头添加平台检测逻辑（`process.platform === 'win32'`）
- [x] 2.2 实现 Windows 分支：优先使用 `'junction'` 类型调用 `fs.symlink()`
- [x] 2.3 添加 junction 失败后的降级逻辑：使用 `'dir'` 类型重试
- [x] 2.4 实现友好的错误处理：当两种方式都失败时，抛出包含解决方案的错误信息
- [x] 2.5 确保 Unix 平台（macOS/Linux）继续使用原有的 `'dir'` 类型逻辑
- [x] 2.6 验证错误信息包含：权限说明、管理员模式、开发者模式、系统版本要求

## 3. 更新 CLI 命令参数

- [x] 3.1 在 `src/index.ts` 中为 `link` 命令添加 `--windsurf` 选项
- [x] 3.2 在 `unlink` 命令中添加 `--windsurf` 选项支持
- [x] 3.3 确保 `--windsurf` 可以与 `--claude` 和 `--trae` 同时使用
- [x] 3.4 验证 CLI help 文档自动包含新的 `--windsurf` 选项

## 4. 更新 TUI 界面

- [x] 4.1 在 `src/ui/quick-select.ts` 的 IDE 选择列表中添加 Windsurf 选项
- [x] 4.2 确保 TUI 多选界面正确显示 Windsurf（包含图标或标识）
- [x] 4.3 验证技能链接状态展示中包含 Windsurf 状态
- [x] 4.4 测试在 TUI 中选择 Windsurf 后能正确创建符号链接

## 5. 验证符号链接功能

- [x] 5.1 测试 `linkSkillToIDE` 函数在 IDE 参数为 `'windsurf'` 时正常工作
- [x] 5.2 测试 `unlinkSkillFromIDE` 函数能正确删除 Windsurf 符号链接
- [x] 5.3 测试 `getLinkedSkills` 函数能正确列出链接到 Windsurf 的技能
- [x] 5.4 测试 `checkSymlinkStatus` 函数能正确验证 Windsurf 链接有效性

## 6. Windows 平台兼容性测试

- [ ] 6.1 在 Windows 环境测试 junction 类型符号链接创建（无需管理员权限场景）
- [ ] 6.2 测试 junction 失败后降级到 dir symlink（需要管理员权限场景）
- [ ] 6.3 测试跨磁盘卷场景（如 C: 到 D:）的错误提示是否友好
- [ ] 6.4 验证错误信息包含所有三种解决方案提示
- [ ] 6.5 测试在 Windows 开发者模式下 dir symlink 能正常工作

## 7. Unix 平台回归测试

- [x] 7.1 在 macOS 上测试 Windsurf 符号链接创建功能
- [ ] 7.2 在 Linux 上测试 Windsurf 符号链接创建功能
- [x] 7.3 验证 Claude 和 Trae 的现有功能在所有平台上仍然正常
- [x] 7.4 确认 Unix 平台没有引入 Windows 特定的逻辑或错误信息

## 8. 更新文档

- [x] 8.1 在 README.md 的支持 IDE 列表中添加 Windsurf（包含 emoji 和路径）
- [x] 8.2 在 README.md 中补充 Windows 使用注意事项章节
- [x] 8.3 说明 Windows 上可能需要管理员权限或开发者模式
- [x] 8.4 更新 package.json 的 keywords 中包含 `'windsurf'`（已存在，验证即可）
- [x] 8.5 更新 CLI 使用示例，包含 `--windsurf` 标志的用法

## 9. 端到端测试

- [x] 9.1 测试完整流程：下载技能 → 选择 Windsurf → 创建符号链接 → 验证链接有效
- [x] 9.2 测试批量链接到多个 IDE（Claude + Trae + Windsurf）
- [x] 9.3 测试取消链接操作对 Windsurf 的支持
- [x] 9.4 测试技能状态查看时 Windsurf 链接状态正确显示
- [ ] 9.5 在真实 Windsurf IDE 环境中验证符号链接的技能能被正确加载
