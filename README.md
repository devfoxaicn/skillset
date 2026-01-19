# skillset

> Your Claude Skills, Set and Ready - 一键安装和管理 Claude Skills 的命令行工具

[![npm version](https://badge.fury.io/js/skillset.svg)](https://www.npmjs.com/package/skillset)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 📖 什么是 Claude Skills？

**Claude Skills** 是 Claude Code 的扩展插件，类似于 VS Code 的插件系统。通过安装不同的 Skills，可以让 Claude 具备特定的领域能力，比如：
- **pdf**: 处理 PDF 文档
- **commit**: 规范化 Git 提交信息
- **code-review**: 代码审查
- **testing**: 测试生成
- ...等等

## ❓ 为什么需要 skillset？

手动安装 Claude Skills 很麻烦：
- ❌ 需要手动克隆 GitHub 仓库
- ❌ 不知道有哪些可用的 Skills
- ❌ 需要手动管理依赖关系
- ❌ 更新 Skills 很繁琐

**skillset** 解决了这些问题：
- ✅ **一键安装**: 自动从 GitHub 或本地源安装
- ✅ **智能搜索**: 跨所有源搜索可用 Skills
- ✅ **依赖管理**: 自动安装依赖的 Skills
- ✅ **批量更新**: 一键更新所有已安装的 Skills
- ✅ **快速创建**: 内置模板，快速创建自定义 Skill

## 🚀 快速开始

### 安装

```bash
# 方式 1: 从 GitHub 安装（推荐）
npm install -g devfoxaicn/skillset

# 方式 2: 从 npm 安装
npm install -g skillset

# 验证安装
skillset --version
```

### 基础使用

```bash
# 1️⃣ 搜索可用的 Skills
skillset search pdf

# 2️⃣ 安装 Skill 到全局（所有项目可用）
skillset install pdf

# 3️⃣ 或者安装到当前项目
skillset install pdf --scope project

# 4️⃣ 查看已安装的 Skills
skillset list

# 5️⃣ 检查更新
skillset update --check-only
```

## 📚 详细功能说明

### 1. 搜索 Skills

从所有配置的源（GitHub 官方仓库、社区仓库、本地目录）搜索 Skills：

```bash
# 关键词搜索
skillset search pdf

# 按标签过滤
skillset search --tag document

# 限制结果数量
skillset search pdf --limit 10

# 显示详细信息
skillset search pdf --verbose
```

### 2. 安装 Skills

支持**全局安装**和**项目级安装**两种模式：

| 模式 | 安装位置 | 适用场景 |
|------|----------|----------|
| **全局** | `~/.claude/skills/` | 常用工具，所有项目都使用 |
| **项目** | `<项目>/.claude/skills/` | 项目特定技能 |

```bash
# 交互式安装（推荐新手使用）
skillset install

# 直接安装指定 Skill
skillset install pdf

# 项目级安装
skillset install pdf --scope project

# 强制重新安装
skillset install pdf --force

# 预览模式（不实际安装）
skillset install pdf --dry-run
```

### 3. 管理已安装的 Skills

```bash
# 列出全局 Skills
skillset list

# 列出项目 Skills
skillset list --scope project

# 显示详细信息
skillset list --verbose

# 移除 Skill
skillset remove pdf

# 移除项目 Skill
skillset remove pdf --scope project
```

### 4. 更新 Skills

```bash
# 检查有哪些更新可用
skillset update --check-only

# 更新所有 Skills
skillset update

# 更新指定 Skill
skillset update pdf

# 更新项目 Skills
skillset update --scope project
```

### 5. 创建自定义 Skills

通过交互式向导快速创建自己的 Skill：

```bash
# 交互式创建（推荐）
skillset create

# 指定模板创建
skillset create --template advanced

# 指定输出目录
skillset create --output ./my-skill
```

**内置模板说明**：

| 模板 | 适用场景 |
|------|----------|
| **basic** | 简单的 Skill，包含基本结构和示例 |
| **advanced** | 完整的 Skill 文档，包含配置、错误处理、最佳实践等 |
| **custom** | 最小化模板，完全自定义内容 |

### 6. 配置管理

```bash
# 查看当前配置
skillset config --list

# 初始化配置文件
skillset config --init

# 交互式编辑配置
skillset config --edit

# 设置配置项
skillset config --set defaultScope=project

# 获取配置项
skillset config --get defaultScope
```

## ⚙️ 配置文件

在项目根目录创建 `.skillset.json`：

```json
{
  "sources": [
    {
      "type": "github",
      "name": "official",
      "enabled": true,
      "priority": 100,
      "github": {
        "owner": "anthropics",
        "repo": "skills",
        "branch": "main",
        "skillsPath": "skills"
      }
    },
    {
      "type": "local",
      "name": "my-skills",
      "enabled": true,
      "priority": 50,
      "local": {
        "path": "./my-custom-skills"
      }
    }
  ],
  "defaultScope": "project",
  "cache": {
    "enabled": true,
    "ttl": 86400
  }
}
```

### 配置项说明

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| `sources` | Skills 源列表 | 官方仓库 |
| `defaultScope` | 默认安装范围 | `global` |
| `cache.enabled` | 是否启用缓存 | `true` |
| `cache.ttl` | 缓存有效期（秒） | `86400` (24小时) |

### 支持的源类型

**GitHub 源**：从 GitHub 仓库获取 Skills
```json
{
  "type": "github",
  "github": {
    "owner": "用户名",
    "repo": "仓库名",
    "branch": "分支名",
    "skillsPath": "skills目录"
  }
}
```

**本地源**：从本地文件系统加载 Skills
```json
{
  "type": "local",
  "local": {
    "path": "./my-skills"
  }
}
```

## 🎯 使用场景示例

### 场景 1: 全局安装常用工具

```bash
# 安装常用的 PDF 处理和代码审查工具
skillset install pdf
skillset install code-review
skillset install commit

# 查看已安装
skillset list
```

### 场景 2: 项目特定 Skills

```bash
cd my-project

# 安装项目特定的测试生成技能
skillset install testing-generator --scope project

# 配置文件会自动创建在 .skillset.json
```

### 场景 3: 创建自定义 Skill

```bash
# 创建一个新的数据分析 Skill
skillset create

# 按照提示输入：
# - 名称: data-analyzer
# - 描述: 数据分析和可视化工具
# - 模板: advanced
# - 标签: data,visualization

# 发布到 GitHub 后，添加为源
skillset config --edit
```

### 场景 4: 批量更新

```bash
# 检查所有 Skills 的更新
skillset update --check-only

# 一键更新所有
skillset update
```

## 🏗️ 项目结构

```
skillset/
├── src/
│   ├── commands/       # CLI 命令实现
│   │   ├── install.ts  # 安装命令
│   │   ├── search.ts   # 搜索命令
│   │   ├── list.ts     # 列表命令
│   │   ├── remove.ts   # 移除命令
│   │   ├── create.ts   # 创建命令
│   │   ├── update.ts   # 更新命令
│   │   └── config.ts   # 配置命令
│   ├── core/           # 核心业务逻辑
│   │   ├── sources/    # 源管理（GitHub、本地）
│   │   ├── installer/  # 安装器和依赖解析
│   │   └── cache/      # 缓存系统
│   ├── config/         # 配置加载和管理
│   ├── types/          # TypeScript 类型定义
│   └── utils/          # 工具函数
├── templates/          # Skill 模板
│   ├── basic/          # 基础模板
│   ├── advanced/       # 高级模板
│   └── custom/         # 自定义模板
└── dist/              # 编译输出
```

## 🛠️ 开发

```bash
# 克隆仓库
git clone https://github.com/devfoxaicn/skillset.git
cd skillset

# 安装依赖
npm install

# 构建项目
npm run build

# 开发模式
npm run dev

# 运行测试
npm test

# 代码检查
npm run lint

# 格式化代码
npm run format
```

## 🤝 贡献

欢迎贡献！请随时提交 Issue 或 Pull Request。

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## ❓ 常见问题

### Q: skillset 和 Claude Skills 有什么区别？

**A**: **skillset** 是一个管理工具，**Claude Skills** 是被管理的插件。就像 npm 是管理 Node.js 包的工具，而包本身是被管理的对象。

### Q: 全局安装和项目安装有什么区别？

**A**:
- **全局安装**: 安装到 `~/.claude/skills/`，所有项目都能使用
- **项目安装**: 安装到 `<项目>/.claude/skills/`，只有当前项目使用

### Q: 如何查看 Skill 的详细信息？

**A**: 使用 `skillset search <keyword> --verbose` 可以查看 Skill 的详细描述、版本、标签等信息。

### Q: 如何创建自己的 Skill？

**A**: 使用 `skillset create` 命令，按照提示输入信息即可。也可以手动创建 SKILL.md 文件。

### Q: 支持哪些 Skills 源？

**A**:
- **GitHub 源**: 从 GitHub 仓库获取（官方或社区）
- **本地源**: 从本地文件系统加载
- **自定义源**: 支持通过 HTTP API 获取（需自行实现）

## 📄 License

MIT © [devfoxaicn](https://github.com/devfoxaicn)

## 🔗 相关链接

- [Claude 官方文档](https://docs.anthropic.com)
- [Claude Skills 仓库](https://github.com/anthropics/skills)
- [Issue 追踪](https://github.com/devfoxaicn/skillset/issues)

---

<p align="center">
  <sub>Built with ❤️ by the Claude community</sub>
</p>
