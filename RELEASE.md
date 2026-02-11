# 发布流程

本文档介绍 easy-skill 的发布流程，包括自动发布（推荐）和手动发布（备用）两种方式。

## 目录

- [自动发布（推荐）](#自动发布推荐)
- [手动发布（备用）](#手动发布备用)
- [版本号规范](#版本号规范)
- [CI/CD 流程](#cicd-流程)
- [常见问题](#常见问题)

---

## 自动发布（推荐）

默认发布方式，通过 GitHub Actions 自动完成构建、测试、发布到 npm 和创建 GitHub Release。

### 触发条件

推送以 `v` 开头的版本标签到仓库：

```bash
git push origin v1.0.3
```

### 完整流程

```
推送 tag → GitHub Actions 触发 → 构建测试 → 发布 npm → 创建 Release
```

### 自动发布步骤

| 步骤 | 说明 |
|------|------|
| 1. Checkout | 检出代码 |
| 2. Setup Node.js | 设置 Node.js v20 环境 |
| 3. Install | 安装依赖 (`npm ci`) |
| 4. Build | 构建项目 (`npm run build`) |
| 5. Pack | 打包 (`npm pack`) |
| 6. Publish | 发布到 npm (`npm publish --access public`) |
| 7. Release | 创建 GitHub Release 并上传 tgz 文件 |

### 前置配置

在 GitHub 仓库设置中配置以下 Secrets：

| Secret | 说明 | 获取方式 |
|--------|------|----------|
| `NPM_TOKEN` | npm 发布令牌 | [创建 npm Automation Token](https://docs.npmjs.com/creating-and-viewing-access-tokens) |

**创建 NPM_TOKEN 步骤：**

1. 登录 [npmjs.com](https://www.npmjs.com/)
2. 点击头像 → Access Tokens
3. 点击 "Generate New Token" → 选择 "Automation"
4. 复制生成的 token
5. 进入 GitHub 仓库 → Settings → Secrets and variables → Actions
6. 点击 "New repository secret"，名称填写 `NPM_TOKEN`，值粘贴 token

### 快速发布命令

```bash
# 1. 修改代码后提交
git add .
git commit -m "fix: xxx"

# 2. 升级版本并自动推送（推荐使用）
npm version patch   # 1.0.3 → 1.0.4 (修复 bug)
npm version minor   # 1.0.3 → 1.1.0 (新功能)
npm version major   # 1.0.3 → 2.0.0 (破坏性变更)

# npm version 会自动执行：
# - 更新 package.json 中的 version
# - 创建 git tag (如 v1.0.4)
# - 执行 git add .
# - 执行 postversion: git push && git push --tags

# 3. 等待 GitHub Actions 自动发布完成
# 访问：https://github.com/supertiny99/easy-skill/actions
```

### 验证发布

```bash
# 检查 npm 版本
npm view @supertiny99/easy-skill version

# 查看最新版本信息
npm view @supertiny99/easy-skill

# 全局安装测试
npm install -g @supertiny99/easy-skill
easy-skill list
```

---

## 手动发布（备用）

当 GitHub Actions 不可用时，可以使用手动发布方式。

### 前置条件

```bash
# 登录 npm（首次或 token 过期时）
npm login
# 输入用户名、密码、邮箱
# 或使用 token: npm config set //registry.npmjs.org/:_authToken <your-token>
```

### 发布步骤

```bash
# 1. 构建项目
npm run build

# 2. 升级版本（如果需要）
npm version patch  # 或 minor/major

# 3. 推送代码和标签
git push
git push --tags

# 4. 发布到 npm
npm publish --access public
```

---

## 版本号规范

遵循 [语义化版本 (SemVer)](https://semver.org/lang/zh-CN/) 规范：

| 版本号格式 | 示例 | 含义 | 使用场景 |
|-----------|------|------|----------|
| `MAJOR.MINOR.PATCH` | `1.2.3` | 主版本.次版本.补丁版本 | - |
| **MAJOR** | `2.0.0` | 主版本 | 破坏性 API 变更 |
| **MINOR** | `1.3.0` | 次版本 | 向后兼容的新功能 |
| **PATCH** | `1.2.4` | 补丁版本 | 向后兼容的 Bug 修复 |

### 版本升级命令

```bash
npm version patch   # 1.0.3 → 1.0.4 (修复 bug)
npm version minor   # 1.0.3 → 1.1.0 (新功能)
npm version major   # 1.0.3 → 2.0.0 (破坏性变更)
```

### 预发布版本

```bash
npm version prepatch --preid=beta   # 1.0.3 → 1.0.4-beta.0
npm version preminor --preid=alpha  # 1.0.3 → 1.1.0-alpha.0
npm version prerelease --preid=rc   # 1.0.3 → 1.0.4-rc.0
```

---

## CI/CD 流程

### CI 持续集成

**触发时机：** 每次推送到 `main`/`master` 分支或创建 Pull Request

**测试矩阵：** Node.js 18, 20, 22

```yaml
name: CI
on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]
```

**CI 流程：**
1. 检出代码
2. 设置 Node.js（多版本测试）
3. 安装依赖
4. 构建项目
5. 运行测试

### CD 持续部署（发布）

**触发时机：** 推送版本标签 (`v*.*.*`)

```yaml
name: Publish to npm
on:
  push:
    tags:
      - 'v*.*.*'
```

---

## 常见问题

### Q1: GitHub Actions 发布失败怎么办？

**原因：**
- `NPM_TOKEN` 未配置或已过期
- 版本号已存在
- 构建失败

**解决方案：**
1. 检查 GitHub Secrets 中的 `NPM_TOKEN` 是否有效
2. 确认 `package.json` 版本号未被占用
3. 查看 Actions 日志排查构建错误
4. 使用手动发布方式作为备用

### Q2: 如何撤销已发布的版本？

```bash
# 撤销 24 小时内的版本
npm unpublish @supertiny99/easy-skill@1.0.3

# 注意：超过 24 小时无法撤销，只能发布新版本修复
```

### Q3: 如何发布 beta 版本？

```bash
# 1. 创建预发布版本
npm version prerelease --preid=beta  # 1.0.3 → 1.0.4-beta.0

# 2. 推送 tag
git push --tags

# 3. GitHub Actions 会自动发布 beta 版本
```

### Q4: 本地测试 npm 包

```bash
# 方法 1: 使用 npm link
cd /path/to/easy-skill
npm link
npm link @supertiny99/easy-skill

# 方法 2: 全局安装本地 tgz
npm pack
npm install -g supertiny99-easy-skill-1.0.3.tgz

# 方法 3: 使用 npm install + 路径
npm install -g /path/to/easy-skill
```

---

## 快速参考

| 操作 | 命令 |
|------|------|
| 升级补丁版本 | `npm version patch` |
| 升级次版本 | `npm version minor` |
| 升级主版本 | `npm version major` |
| 查看当前版本 | `npm view @supertiny99/easy-skill version` |
| 查看远程版本 | `npm dist-tag ls @supertiny99/easy-skill` |
| 本地登录 npm | `npm login` |
| 手动发布 | `npm publish --access public` |
| 推送代码 | `git push && git push --tags` |
