## ADDED Requirements

### Requirement: Windows 平台检测

系统必须能够检测当前运行平台是否为 Windows，以便应用平台特定的符号链接逻辑。

#### Scenario: 在 Windows 平台上检测

- **WHEN** 系统在 Windows 系统上运行（`process.platform === 'win32'`）
- **THEN** 必须启用 Windows 特定的符号链接处理逻辑

#### Scenario: 在 Unix 平台上检测

- **WHEN** 系统在 Unix 类系统上运行（macOS 或 Linux）
- **THEN** 必须使用标准的符号链接创建逻辑

### Requirement: Windows Junction 优先策略

在 Windows 平台上创建符号链接时，系统必须优先尝试使用 junction 类型，因为它无需管理员权限。

#### Scenario: 成功使用 junction 创建链接

- **WHEN** 在 Windows 上创建符号链接
- **THEN** 系统必须首先尝试使用 `'junction'` 类型调用 `fs.symlink()`

#### Scenario: Junction 创建成功后无需后续尝试

- **WHEN** junction 类型符号链接创建成功
- **THEN** 系统必须完成操作，不再尝试其他链接类型

### Requirement: Windows Symlink 降级策略

当 junction 创建失败时，系统必须尝试使用 directory symlink 作为备选方案。

#### Scenario: Junction 失败后尝试 dir symlink

- **WHEN** junction 类型符号链接创建失败
- **THEN** 系统必须尝试使用 `'dir'` 类型调用 `fs.symlink()`

#### Scenario: Dir symlink 创建成功

- **WHEN** dir symlink 创建成功
- **THEN** 系统必须完成操作并返回成功

### Requirement: Windows 符号链接错误处理

当所有符号链接创建尝试都失败时，系统必须提供清晰的错误信息和解决方案指导。

#### Scenario: 所有尝试失败时抛出友好错误

- **WHEN** junction 和 dir symlink 都创建失败
- **THEN** 系统必须抛出包含以下信息的错误：
  - 无法创建符号链接的说明
  - Windows 权限要求说明
  - 至少三种解决方案（管理员模式、开发者模式、系统版本要求）

#### Scenario: 错误信息包含原始错误详情

- **WHEN** 符号链接创建失败
- **THEN** 错误信息中必须包含底层错误的详细信息（`err.message`）

### Requirement: Unix 平台符号链接保持不变

在非 Windows 平台上，系统必须保持原有的符号链接创建行为，确保向后兼容性。

#### Scenario: macOS 上使用标准 dir symlink

- **WHEN** 在 macOS 平台上创建符号链接
- **THEN** 系统必须直接使用 `'dir'` 类型调用 `fs.symlink()`，无需尝试 junction

#### Scenario: Linux 上使用标准 dir symlink

- **WHEN** 在 Linux 平台上创建符号链接
- **THEN** 系统必须直接使用 `'dir'` 类型调用 `fs.symlink()`，无需尝试 junction

#### Scenario: Unix 平台符号链接失败时正常抛错

- **WHEN** 在 Unix 平台上符号链接创建失败
- **THEN** 系统必须直接抛出原始错误，不添加 Windows 特定的提示信息

### Requirement: 符号链接类型透明性

对于调用方而言，符号链接的创建过程必须是透明的，无论使用何种内部实现。

#### Scenario: 调用方 API 保持不变

- **WHEN** 任何代码调用 `createSymlink()` 函数
- **THEN** 函数签名和行为必须与原有实现保持一致，不需要传递平台或类型参数

#### Scenario: 成功创建的符号链接功能一致

- **WHEN** 符号链接创建成功（无论是 junction 还是 dir symlink）
- **THEN** 链接必须能够正常工作，IDE 能够访问链接的技能目录

### Requirement: Windows 跨卷链接错误提示

当 junction 因跨卷限制失败时，系统应提供相应的错误提示说明。

#### Scenario: Junction 跨卷失败时的错误信息

- **WHEN** junction 创建失败是由于跨磁盘卷限制（如 C: 到 D:）
- **THEN** 最终错误信息必须包含跨卷限制的说明和建议（将技能和项目放在同一磁盘卷）

#### Scenario: Dir symlink 可以处理跨卷场景

- **WHEN** junction 因跨卷失败但用户有管理员权限
- **THEN** dir symlink 降级策略必须能够成功创建跨卷链接
