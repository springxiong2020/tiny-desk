<div align="center">

<img src="public/logo.svg" alt="小桌 Logo" width="88" />

# 小桌 · Tiny Desk

**把常用工具，放在顺手的地方。**

一个轻巧的个人工作台，收好网址、理清待办，也记录每一道题的进步。

![Vue](https://img.shields.io/badge/Vue-3-42b883?logo=vuedotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178c6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6-646cff?logo=vite&logoColor=white)
![Storage](https://img.shields.io/badge/数据存储-浏览器本地-0d9488)

[功能一览](#功能一览) · [快速开始](#快速开始) · [部署到-github-pages](#部署到-github-pages) · [开发指南](#开发指南)

</div>

---

## 为什么是小桌

不必在多个页面之间来回切换，也不必为简单的日常记录注册账号。打开小桌，从工作台进入需要的工具，让注意力回到手头的事情上。

- **打开即用**：个人记录与偏好保存在当前浏览器，无需登录。
- **日常够用**：网址导航、待办事项、力扣热题，集中在一个工作台。
- **明暗皆宜**：首次使用参考系统主题，支持手动切换并保存选择。
- **随时带走**：通过全量 JSON 备份迁移记录与主题设置。

## 功能一览

| 工具 | 可以做什么 |
| :--- | :--- |
| 🧭 **网址导航** | 分类浏览网站，按名称、介绍或网址搜索，将常用网站置顶 |
| ✅ **待办事项** | 管理任务分组，快捷录入，设置优先级、截止日期和周期任务，搜索与筛选任务 |
| 💻 **力扣热题** | 练习 Hot 100，随机排列题序，管理练习轮次，查看完成记录与本轮进度 |
| 📦 **备份与恢复** | 导出全部工具记录与主题，预览备份内容后确认覆盖恢复 |

## 快速开始

准备支持 Vite 6 的 Node.js 环境（建议 Node.js 22）与 npm，在项目根目录执行：

```bash
npm ci
npm run dev
```

打开终端中显示的本地地址，即可开始使用。

构建并预览生产版本：

```bash
npm run build
npm run preview
```

构建会先执行严格的 Vue / TypeScript 类型检查，再将生产文件输出到 `dist/`。

## 数据与备份

个人记录和偏好通过 `localStorage` 保存在**当前浏览器、当前站点来源**下，不会自动跨设备同步。更换浏览器、切换站点域名或清理浏览器数据后，原记录不会自动出现在新环境中。

建议在迁移设备或清理数据前完成以下步骤：

1. 打开侧边栏的「备份与恢复」，点击「导出全部数据」。
2. 妥善保存下载的 JSON 文件。
3. 在新环境中选择「导入全量备份」，检查预览内容后确认恢复。

> 全量备份文件需在 10 MB 以内。恢复会整体替换当前记录与主题，备份中没有记录的工具也会清空；导入前建议先导出现有数据。

小桌的部分内容需要联网加载：网址目录来自远程接口，力扣题库来自远程 JSON。个人记录保存在本地，并不代表所有功能都能离线使用。

| 内容 | 数据源配置 |
| :--- | :--- |
| 网址目录 | [`src/modules/sites/sites.ts`](src/modules/sites/sites.ts) |
| 力扣 Hot 100 题库 | [`src/modules/leetcode/leetcode.ts`](src/modules/leetcode/leetcode.ts) |

自行部署时，可在上述文件中调整数据源；对应服务需要允许浏览器跨域访问。

## 部署到 GitHub Pages

项目是静态前端应用，使用 Hash 路由与相对资源路径，适合部署在 GitHub Pages 等静态托管平台，包括仓库子路径。

1. 在仓库的 **Settings → Pages → Build and deployment → Source** 中选择 **GitHub Actions**。
2. 将代码推送到 `main` 分支，自动触发测试、构建与部署。
3. 在 **Actions → Deploy to GitHub Pages** 中查看执行结果；部署成功后可从部署环境中打开站点地址。

工作流位于 [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml)，使用 Node.js 22，运行全部五组回归测试和生产构建，成功后发布 `dist/`。也可以在 Actions 页面点击 **Run workflow**，选择 `main` 手动部署。无需配置个人访问令牌，也无需提交 `dist/` 到源码分支。

## 开发指南

### 技术栈

Vue 3 Composition API · TypeScript · Vue Router · Vite · Lucide 图标

### 目录结构

```text
tiny-desk/
├── public/                  # 静态资源与 Logo
├── scripts/                 # 各模块回归测试
├── src/
│   ├── app/                 # 路由、主题、全量备份逻辑
│   ├── components/layout/   # 页头、侧边栏、页脚与应用布局
│   ├── modules/
│   │   ├── Workspace.vue    # 工作台首页
│   │   ├── sites/           # 网址导航
│   │   ├── todo/            # 待办事项
│   │   ├── leetcode/        # 力扣练习
│   │   └── backup/          # 备份与恢复
│   ├── styles/              # 全局样式
│   ├── App.vue              # 根组件
│   └── main.ts              # 应用入口
└── vite.config.ts           # 构建配置
```

### 常用命令

| 命令 | 用途 |
| :--- | :--- |
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 类型检查并构建生产版本 |
| `npm run preview` | 本地预览生产构建 |
| `npm run test:todo` | 待办事项回归测试 |
| `npm run test:sites` | 网址导航回归测试 |
| `npm run test:leetcode` | 力扣练习回归测试 |
| `npm run test:theme` | 主题回归测试 |
| `npm run test:backup` | 全量备份回归测试 |

测试使用 Node.js 独立脚本运行，当前没有统一的 `npm test` 命令。修改功能后，请运行对应回归测试和 `npm run build`；涉及界面调整时，也请在浏览器中检查实际效果。

### 参与改进

欢迎通过 Issue 反馈问题或提出想法，也欢迎提交 Pull Request。提交时请说明行为变化与验证方式；涉及界面变化时附上截图，涉及本地存储或备份格式时说明兼容性影响。

---

<div align="center">

**一张小桌，安放日常。**

</div>
