## 1. 修改选择组件类型

- [x] 1.1 在 `src/ui/skill-browser.ts` 中将 `prompts` 调用从 `type: 'select'` 替换为 `type: 'autocomplete'`，设置 `limit: 20`
- [x] 1.2 为 `BrowseAction` 接口添加 `isAction` 标记字段，用于区分操作类选项和内容类选项

## 2. 实现自定义 suggest 函数

- [x] 2.1 实现 `suggestChoices` 函数：无输入时返回全部选项；有输入时对内容类选项按 `entry.name` 和 `entry.description` 进行大小写不敏感子串匹配，操作类选项始终保留
- [x] 2.2 在构建 choices 时，为操作类选项（⬆️ 返回上层、🔘 全选/取消全选、✅ 确认下载、❌ 取消）的 value 设置 `isAction: true`，为内容类选项设置 `isAction: false` 并附带 `searchName` 和 `searchDescription` 原始文本字段

## 3. 验证与回归测试

- [x] 3.1 手动测试：无输入时行为与修改前一致（全部条目可见、上下导航正常）
- [x] 3.2 手动测试：输入关键词后内容类条目正确过滤，操作类选项始终可见
- [x] 3.3 手动测试：搜索状态下选择导航操作后搜索输入被清空，新目录展示全部条目
- [x] 3.4 手动测试：全选操作在搜索过滤状态下仍可用，作用于当前层级全部可选择条目
