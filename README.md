# skillset

> 轻量级 Claude Skills 管理工具 - 帮你快速发现、创建和管理 Claude Skills

[![npm version](https://badge.fury.io/js/skillset.svg)](https://www.npmjs.org/package/skillset)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 一分钟上手

```bash
# 安装
npm install -g devfoxaicn/skillset

# 查找需要的技能
skillset find "处理 PDF 文件"

# 安装技能
skillset install pdf

# 创建自己的技能
skillset create --ai

# 查看已安装的技能
skillset list
```

---

## 主要功能

### 🔍 智能查找

用自然语言描述你需要的功能，自动找到最匹配的技能：

```bash
skillset find "我需要处理 PDF 文件"
skillset find "帮我写规范的 Git 提交"
skillset find "代码审查和优化"
```

### ✨ 智能创建

AI 辅助创建自定义技能，只需描述你的需求：

```bash
skillset create --ai
```

交互式引导会：
- 分析你的需求
- 自动生成技能结构
- 推荐名称、标签和依赖
- 查找类似技能参考

### 📦 轻松管理

```bash
# 查看所有已安装的技能
skillset list

# 检查技能健康状态
skillset check

# 更新技能
skillset update

# 删除技能
skillset remove pdf
```

### 💡 智能推荐

根据你的项目自动推荐合适的技能：

```bash
# 在项目目录下运行
skillset suggest
```

---

## 常用命令

| 命令 | 说明 | 示例 |
|------|------|------|
| `find` | 用自然语言查找技能 | `skillset find "处理图片"` |
| `create` | 创建自定义技能 | `skillset create --ai` |
| `install` | 安装技能 | `skillset install pdf` |
| `list` | 查看已安装技能 | `skillset list` |
| `check` | 检查技能状态 | `skillset check` |
| `suggest` | 项目技能推荐 | `skillset suggest` |
| `update` | 更新技能 | `skillset update` |
| `remove` | 删除技能 | `skillset remove pdf` |

---

## 核心场景

### 场景 1：找到并安装技能

```bash
# 1. 用自然语言搜索
skillset find "我需要处理 PDF"

# 2. 安装推荐的技能
skillset install pdf

# 3. 验证安装
skillset list
```

### 场景 2：创建自定义技能

```bash
# 1. 使用 AI 向导创建
skillset create --ai

# 2. 描述你的需求
# "我想让 Claude 帮我分析股票数据"

# 3. 技能文件自动生成到当前目录

# 4. 测试后发布到 GitHub
# 5. 添加你的仓库为 skillset 源
```

### 场景 3：维护已安装技能

```bash
# 检查所有技能状态
skillset check

# 更新有新版本的技能
skillset update

# 查看项目推荐技能
skillset suggest
```

---

## 安装

```bash
# 推荐：从 GitHub 安装
npm install -g devfoxaicn/skillset

# 或从 npm 安装
npm install -g skillset

# 验证
skillset --version
```

---

## 命令详解

### find - 智能查找

```bash
skillset find "你的需求描述"

# 选项
--limit 5     # 限制结果数量
--verbose     # 显示详细匹配理由
```

### create - 创建技能

```bash
# AI 辅助创建（推荐）
skillset create --ai

# 传统模板创建
skillset create --template basic

# 选项
--ai              # AI 辅助模式
--template        # 模板类型：basic/advanced/custom
--output <path>   # 输出目录
```

### install - 安装技能

```bash
# 安装到全局（所有项目可用）
skillset install pdf

# 安装到当前项目
skillset install pdf --scope project

# 选项
--force    # 强制重新安装
--dry-run  # 预览，不实际安装
```

### list - 查看技能

```bash
# 查看全局技能
skillset list

# 查看项目技能
skillset list --scope project

# 详细信息
skillset list --verbose
```

### check - 健康检查

```bash
# 检查所有技能
skillset check

# 自动修复问题
skillset check --fix

# 详细输出
skillset check --verbose
```

### suggest - 智能推荐

```bash
# 基于当前项目推荐
skillset suggest

# 包括已安装的技能
skillset suggest --show-all

# 限制数量
skillset suggest --limit 5
```

---

## 安装位置

| 类型 | 位置 | 说明 |
|------|------|------|
| 全局 | `~/.claude/skills/` | 所有项目共享 |
| 项目 | `<项目>/.claude/skills/` | 仅当前项目 |

---

## 配置（可选）

在项目根目录创建 `.skillset.json`：

```json
{
  "sources": [
    {
      "type": "github",
      "name": "my-skills",
      "github": {
        "owner": "your-username",
        "repo": "my-skills-repo"
      }
    }
  ]
}
```

---

## 常见问题

**Q: skillset 是什么？**

A: 类似 npm 的工具，不过是用来管理 Claude Skills 的。帮你查找、安装、创建和管理 Claude 的技能插件。

**Q: 全局安装和项目安装有什么区别？**

A: 全局安装所有项目都能用，项目安装只对当前项目有效。

**Q: 如何创建自己的技能？**

A: 运行 `skillset create --ai`，跟着提示走就行。会自动分析你的需求并生成技能文件。

**Q: 技能安装到哪里了？**

A: 全局安装到 `~/.claude/skills/`，项目安装到 `<项目>/.claude/skills/`

**Q: 如何更新技能？**

A: 运行 `skillset update` 更新所有技能，或 `skillset update <技能名>` 更新单个。

---

## 相关链接

- [Claude 官方文档](https://docs.anthropic.com)
- [Claude Skills 官方仓库](https://github.com/anthropics/skills)
- [问题反馈](https://github.com/devfoxaicn/skillset/issues)

---

## License

MIT © [devfoxaicn](https://github.com/devfoxaicn)
