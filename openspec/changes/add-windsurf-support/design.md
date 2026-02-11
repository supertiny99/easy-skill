## Context

easy-skill 目前支持 Claude 和 Trae 两个 IDE，通过符号链接将下载的技能连接到各 IDE 的 skills 目录。项目声明支持跨平台运行（darwin、linux、win32），但现有符号链接实现未针对 Windows 平台做特殊处理。

**当前状态**:
- `fs-extra` 的 `symlink()` 在 Unix 系统上工作正常
- Windows 上符号链接需要管理员权限或开发者模式
- Windows 提供了 junction（目录连接点）作为替代方案，无需特殊权限
- Windsurf IDE 使用 `.windsurf/skills` 目录管理技能（与 Claude/Trae 模式一致）

**约束条件**:
- 保持与现有 Claude/Trae 支持的一致性
- 最小化代码侵入性，避免破坏现有功能
- Windows 用户体验应尽可能平滑，避免权限问题导致失败
- 需要保持向后兼容性

## Goals / Non-Goals

**Goals:**
- ✅ 添加 Windsurf IDE 作为第三个支持的 IDE，遵循现有架构模式
- ✅ 在 Windows 平台上优雅处理符号链接，优先使用 junction 避免权限问题
- ✅ 提供清晰的错误信息，当权限不足时指导用户解决
- ✅ 保持现有 Claude/Trae 功能完全不受影响

**Non-Goals:**
- ❌ 不实现其他 IDE 的支持（如 Cursor、VSCode 等）
- ❌ 不修改符号链接之外的跨平台兼容性问题
- ❌ 不提供自动提升权限的功能（避免安全风险）
- ❌ 不改变 skills 目录的组织结构

## Decisions

### 决策 1: Windsurf IDE 集成方式

**选择**: 使用与 Claude/Trae 完全一致的集成模式

**理由**:
- Windsurf 技能目录结构与 Claude/Trae 相同（`.windsurf/skills`）
- 保持代码一致性，降低维护成本
- 用户学习成本最低，体验一致

**实现**:
```typescript
// schema.ts
export type IDEType = 'claude' | 'trae' | 'windsurf';

export const IDE_SKILL_PATHS: Record<IDEType, string> = {
  claude: '.claude/skills',
  trae: '.trae/skills',
  windsurf: '.windsurf/skills'  // 新增
};

export const SUPPORTED_IDES: IDEType[] = ['claude', 'trae', 'windsurf'];
```

**备选方案（已拒绝）**:
- 动态配置路径：过度设计，当前不需要
- 插件化 IDE 支持：增加复杂度，与当前需求不符

### 决策 2: Windows 符号链接处理策略

**选择**: 优先使用 junction，失败时尝试 symlink 并提供明确错误信息

**理由**:
- Junction 在 Windows 上无需管理员权限，适用于目录链接
- Symlink 需要管理员权限或开发者模式，但更通用
- 两阶段尝试能覆盖大部分用户场景

**实现逻辑**:
```typescript
// linker.ts - createSymlink 函数增强
async function createSymlink(sourcePath: string, targetPath: string): Promise<void> {
  const isWindows = process.platform === 'win32';

  // 确保目标父目录存在
  await fs.ensureDir(path.dirname(targetPath));

  // 移除已存在的链接
  if (await fs.pathExists(targetPath)) {
    const stat = await fs.lstat(targetPath);
    if (stat.isSymbolicLink() || stat.isFile()) {
      await fs.remove(targetPath);
    } else if (stat.isDirectory()) {
      throw new Error(`Target path is a directory: ${targetPath}`);
    }
  }

  if (isWindows) {
    try {
      // Windows: 优先尝试 junction（无需权限）
      await fs.symlink(sourcePath, targetPath, 'junction');
    } catch (err) {
      try {
        // 失败后尝试 dir symlink（需要权限）
        await fs.symlink(sourcePath, targetPath, 'dir');
      } catch (symlinkErr) {
        throw new Error(
          `无法创建符号链接。Windows 上请以管理员身份运行，或启用开发者模式。\n` +
          `详情: ${symlinkErr.message}`
        );
      }
    }
  } else {
    // Unix 系统: 保持原有逻辑
    await fs.symlink(sourcePath, targetPath, 'dir');
  }
}
```

**备选方案（已拒绝）**:
1. **仅使用 junction**: 在某些边缘场景可能不适用（如跨卷链接）
2. **检测权限后提示**: 增加复杂度，且无法准确预测权限
3. **使用硬链接**: 不适用于目录，且不符合项目设计

### 决策 3: 平台检测位置

**选择**: 在 `createSymlink` 函数内部检测平台

**理由**:
- 集中处理逻辑，避免在调用方重复判断
- 对外 API 保持不变，不破坏现有调用
- 测试更容易 mock 平台行为

**备选方案（已拒绝）**:
- 配置文件指定: 过度工程化
- 调用方传参: 增加调用复杂度，容易出错

### 决策 4: 错误处理和用户提示

**选择**: 提供分层错误信息，包含操作指导

**理由**:
- Windows 权限问题是常见场景，需要友好提示
- 帮助用户自助解决，减少支持成本

**错误信息结构**:
```typescript
throw new Error(
  `无法创建符号链接到 ${targetPath}\n` +
  `原因: ${err.message}\n` +
  `解决方案:\n` +
  `  1. 以管理员身份运行终端\n` +
  `  2. 或启用 Windows 开发者模式（设置 > 更新和安全 > 开发者选项）\n` +
  `  3. 或使用 Windows 10/11 创建者更新及以上版本`
);
```

## Risks / Trade-offs

### 风险 1: Windows junction 跨卷限制
**风险**: Junction 不支持跨磁盘卷创建链接（如 C: 到 D:）
**缓解**:
- 大部分用户场景都在同一卷内（项目和 IDE 配置通常在同一磁盘）
- 失败时会尝试 symlink 作为备选
- 错误信息会明确说明原因

### 风险 2: fs-extra 版本兼容性
**风险**: 不同版本的 fs-extra 对 junction 支持可能不同
**缓解**:
- 当前使用 fs-extra@11.3.3，已充分支持 junction
- 在 package.json 中锁定版本范围
- 添加集成测试覆盖 Windows 场景（CI/CD 中使用 Windows runner）

### 风险 3: Windsurf 路径变更
**风险**: Windsurf 未来可能更改技能目录路径
**缓解**:
- 配置集中在 `IDE_SKILL_PATHS`，易于更新
- 在文档中说明支持的 Windsurf 版本
- 考虑未来添加路径检测逻辑

### 权衡 1: 性能 vs 健壮性
**权衡**: Windows 上两阶段尝试会增加失败路径的延迟
**决策**: 接受这个权衡，因为：
- 失败场景相对少见
- 额外延迟在毫秒级，用户无感知
- 健壮性收益远大于性能损失

### 权衡 2: 代码复杂度 vs 平台一致性
**权衡**: 添加平台检测逻辑增加了代码复杂度
**决策**: 接受这个权衡，因为：
- Windows 用户占比显著，体验改进值得投入
- 逻辑集中在单一函数，可控性强
- 测试覆盖可以保证质量
