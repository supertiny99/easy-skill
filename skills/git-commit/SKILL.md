---
name: git-commit
description: "Generate Conventional Commits formatted git commit messages with interactive confirmation. Analyzes git changes to create meaningful commit messages following the 'type(scope): description' format. Allows user review and editing before committing."
---

# Git Commit Skill

智能 Git 提交工具，使用 Conventional Commits 规范生成**中文**提交信息，支持交互式确认和编辑。

## 重要规则

1. **Commit Message 必须使用中文** - type 和 scope 保持英文，但 subject 和 body 必须使用中文
2. **格式**: `type(scope): 中文主题`
3. **示例**: `feat(cli): 添加交互式提供商选择`

## 快速开始

```bash
# 直接使用（分析所有变更）
git commit

# 指定文件
git commit path/to/file

# 指定多个文件
git commit file1.ts file2.ts
```

## Conventional Commits 格式

```
type(scope): subject

body (optional)

footer (optional)
```

### Type 类型

| Type | 说明 | 示例 |
|------|------|------|
| `feat` | 新功能 | `feat(auth): 添加 OAuth2 登录支持` |
| `fix` | 修复 Bug | `fix(api): 处理服务器返回的空响应` |
| `docs` | 文档变更 | `docs(readme): 更新安装指南` |
| `style` | 代码格式（不影响功能）| `style: 使用 prettier 格式化代码` |
| `refactor` | 重构（不是新功能也不是修复）| `refactor(config): 简化配置加载逻辑` |
| `perf` | 性能优化 | `perf(query): 添加数据库索引` |
| `test` | 测试相关 | `test(auth): 添加登录单元测试` |
| `build` | 构建系统或外部依赖变更 | `build: 升级到 webpack 5` |
| `ci` | CI 配置变更 | `ci: 添加 GitHub Actions 工作流` |
| `chore` | 其他变更 | `chore: 更新依赖项` |
| `revert` | 回退提交 | `revert: feat(api)` |

### Scope 范围

可选，用于描述变更影响的模块：
- `auth` - 认证相关
- `api` - API 接口
- `ui` - 用户界面
- `config` - 配置文件
- `cli` - 命令行工具
- `db` - 数据库
- 或根据项目自定义

### Subject 主题

- 使用现在时态："添加" 而非 "添加了"
- 使用中文描述
- 不要以句号结尾
- 简洁描述做了什么

## 工作流程

### 1. 分析变更

```bash
# 查看当前状态
git status

# 查看具体变更
git diff
git diff --staged
```

### 2. 生成 Commit Message

根据变更内容分析：

| 变更类型 | Type | 判断依据 |
|----------|------|----------|
| 添加新功能/接口 | `feat` | 新增函数、类、命令 |
| 修复错误/异常 | `fix` | 捕获异常、边界检查 |
| 文档注释 | `docs` | README、注释、docstring |
| 代码风格 | `style` | 格式化、空格、缩进 |
| 重构代码 | `refactor` | 结构调整、变量重命名 |
| 性能相关 | `perf` | 缓存、异步、优化 |
| 测试代码 | `test` | 单元测试、集成测试 |
| 依赖/构建 | `build/chore` | package.json、配置文件 |

### 3. 确认并提交

展示生成的 commit message，询问用户：
- 是否接受
- 是否需要编辑
- 确认后执行 `git commit`

## Commit Message 示例

### 新功能
```
feat(cli): 添加交互式提供商选择

实现模糊搜索界面，在当前配额用尽时快速切换
到不同的 API 提供商。
```

### Bug 修复
```
fix(config): 优雅处理缺失的配置文件目录

当 ~/.claude/profiles/ 不存在时添加错误处理，
自动创建目录而非抛出错误。
```

### 文档更新
```
docs(readme): 添加手动测试检查清单

为 QA 团队记录逐步测试工作流程。
```

### 重构
```
refactor(loader): 提取提供商检测逻辑

将 getCurrentProvider() 移至独立模块，提高
可测试性和可复用性。
```

### 多文件变更
```
feat: 添加备份和恢复功能

- 在切换提供商前实现自动备份
- 添加 history 命令列出所有备份
- 添加 restore 命令从备份恢复
```

## 特殊情况处理

### 合并多个相关变更

如果多个文件属于同一功能，合并为一个 commit：

```bash
# 添加相关文件
git add file1.ts file2.ts file3.ts
# 生成一个包含所有变更的 commit message
```

### 独立功能分开提交

如果变更涉及多个独立功能，分别提交：

```bash
# 先提交第一个功能
git add auth-related-files
git commit -m "feat(auth): 添加 JWT 支持"

# 再提交第二个功能
git add ui-related-files
git commit -m "feat(ui): 添加深色模式切换"
```

### 补充遗漏的文件

如果提交后发现遗漏文件：

```bash
# 补充文件到上一次提交
git add forgotten-file.ts
git commit --amend --no-edit
```

### 撤销最近一次提交

```bash
# 撤销提交但保留变更
git reset --soft HEAD~1

# 或使用 revert（保留历史）
git revert HEAD
```

## 交互确认流程

执行提交时按以下步骤：

1. **展示分析结果**
   ```markdown
   检测到以下变更：
   - 修改: src/index.ts (新增命令)
   - 修改: src/lib/config/schema.ts (扩展类型)
   - 新增: src/ui/quick-select.ts (新增组件)
   ```

2. **生成 Commit Message**
   ```
   feat(ui): 添加交互式提供商选择

   实现模糊搜索界面，用于快速切换 API 提供商。
   ```

3. **用户确认**
   ```
   是否接受此 commit message？
   [Y]es / [E]dit / [N]o
   ```

4. **执行提交**
   ```bash
   git add <files>
   git commit -m "<message>"
   ```

## 常见错误

| 错误 | 原因 | 解决方案 |
|------|------|----------|
| `type` 过于宽泛 | 没有仔细分析变更 | 查看具体改动，选择更精确的 type |
| `subject` 过长 | 描述太详细 | 简化主题，详细信息放到 body |
| `scope` 不一致 | 随意命名 | 定义项目统一的 scope 列表 |
| 没有 body | 复杂变更缺少说明 | 重大变更添加 body 说明原因 |

## 项目自定义

每个项目可以定义自己的 scope 列表，在项目 `.claude/CLAUDE.md` 中添加：

```markdown
## Commit Scopes

- `cli` - CLI 命令相关
- `config` - 配置文件
- `loader` - 配置加载
- `writer` - 配置写入
- `ui` - 用户界面
```

## 参考资源

- [Conventional Commits](https://www.conventionalcommits.org/)
- [Angular Commit Guidelines](https://github.com/angular/angular/blob/master/CONTRIBUTING.md#commit)
