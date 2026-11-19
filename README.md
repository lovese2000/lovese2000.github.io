# 李飚 · 个人主页（Eleventy 版）

由原来的单页 `index.html` 迁移而来。文字、项目、出版记录和图片全部保留；页面视觉沿用原设计，只是拆成了「首页 + 关于 + 每个项目一页」。

迁移前的原单页 `index.html` 只保留在本地工作区（不纳入本仓库）；仓库里只有 Eleventy 工程。

## 运行

需要 Node.js 18 以上。

```powershell
npm ci           # 按 package-lock.json 安装
npm run dev      # http://localhost:8080
npm run build    # 生成静态站点到 _site/
```

`npm run dev` 和 `npm run build` 都会先清空 `_site/` 再构建，避免旧页面残留。

## 部署到 GitHub Pages

仓库：[lovese2000/lovese2000.github.io](https://github.com/lovese2000/lovese2000.github.io)

- 工作流：[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)。push 到 `main` 自动构建并发布，也可以在 Actions 页面手动 `Run workflow`。
- 流程：`npm ci` → `npm run build` → 上传 `_site/` 为 Pages artifact → 由 `actions/deploy-pages` 发布。不需要 `gh-pages` 分支，也不需要把 `_site` 提交进仓库。
- Pages 已在首次推送时启用。如果以后在 Settings → Pages 把 Source 改成 “Deploy from a branch”，需要改回 **GitHub Actions**，否则 `deploy-pages` 会失败。
- 发布地址：<https://lovese2000.github.io/>

工作流使用 Node 22；`package-lock.json` 必须一起提交，`npm ci` 依赖它。

## 目录结构

```
.
├── .github/workflows/deploy.yml  push main 自动构建并发布
├── src/
│   ├── about.md                 自我介绍（正文为中文，英文在 proseEn 前置字段）
│   ├── projects/                每个项目一个 .md
│   │   ├── 2025-07-29-phantasmal-island.md
│   │   └── …
│   ├── _data/
│   │   ├── site.json            站点头部、首屏、各区块标题、联系与页脚
│   │   ├── research.json        四条研究主线
│   │   └── publications.json    25 条出版记录
│   ├── _includes/               页面模板（base / header / footer / 各区块）
│   ├── assets/
│   │   ├── style.css            整套视觉（原 CSS 原样迁移 + 多页补充）
│   │   └── main.js              语言切换、滚动、筛选、搜索、项目图集
│   └── index.njk                首页
├── public/imgs/                 45 张图片，页面用 /imgs/xxx.jpg 引用
├── tools/
│   ├── verify-content.py        对照原 index.html 检查内容是否丢失
│   └── check-links.py           爬取本地预览，检查所有链接和图片
├── eleventy.config.js
├── package.json
├── package-lock.json
└── README.md
```

## 改内容

### 关于页：`src/about.md`

正文直接写 Markdown 中文；英文正文写在 `proseEn` 前置字段（用 Markdown 写，构建时渲染）。职务、研究、兼职、地址在 `facts`，时间轴在 `timeline`，中英文成对。

### 项目页：`src/projects/*.md`

每个文件对应 `/projects/<文件名>/`。文件名里的日期会保留在 URL 中，例如 `2025-07-29-phantasmal-island.md` → `/projects/2025-07-29-phantasmal-island/`。

前置字段：

| 字段 | 说明 |
|---|---|
| `title` / `titleEn` | 中英文项目名（`title` 为页面标题） |
| `year` | 年份 |
| `category` | `built` / `tool` / `research`，决定筛选分类与图集样式 |
| `location` / `locationEn` | 地点，可留空 |
| `team` | 团队名单 |
| `keywords` | 标签列表（不要用 `tags`，那是 Eleventy 的集合字段） |
| `images` | 图片路径，例如 `/imgs/2025-07-29-phantasmal-island-0.jpg` |
| `url` | 外部项目链接，可留空 |
| `descriptionEn` | 英文简介 |
| `order` | 排序，1 为最新 |

正文写中文简介（Markdown）。增删项目只需增删 `.md`，首页列表、筛选计数和上一页/下一页会自动更新。

### 图片

放进 `public/imgs/`，在 Markdown 里写 `/imgs/文件名.jpg`。构建时 `public/` 会原样拷贝到 `_site/`。

### 出版记录

`src/_data/publications.json`，每条形如：

```json
{
  "year": "2025",
  "type": "Book",
  "typeCn": "著作",
  "title": "…",
  "source": "…",
  "authors": "…"
}
```

类型计数和筛选按钮由模板自动计算。

## 模板与样式

- 页面模板在 `src/_includes/`：`base.njk`（head/页头/页脚）、`index.njk` 首页、`about.njk` 关于页、`project.njk` 项目页，以及 `hero.njk`、`research.njk`、`works.njk`、`publications.njk`、`contact.njk`。
- `src/assets/style.css` 的前半部分是原 `index.html` 的内联样式，原样迁入；末尾「12. Multi-page additions」只补了多页需要的少量规则。
- 语言切换（中 / EN）仍是原来的机制：`html[data-lang]` + `.lang-zh` / `.lang-en`，选择存在 `localStorage`，也支持 `?lang=en`。
- 项目页保留原弹窗的图集结构（主图 + 缩略图 + 上一项/下一项）。旧链接 `/?work=<slug>` 会自动跳转到对应项目页。

## 验证「没丢内容」

```powershell
npm run build
python tools/verify-content.py
python tools/check-links.py   # 先 npm run dev
```

`verify-content.py` 会逐条比对原 `index.html` 的文本节点、15 个项目的全部字段、25 条出版记录、45 张图片和页面结构数量；任何一项对不上都会以非零状态退出。当前结果为：

```
OK — no content lost. 251 original text nodes, 15 project pages, 25 publications, 45 images.
```

`check-links.py` 会从首页开始爬取所有内部页面、CSS、JS 和图片，确认全部返回 HTTP 200。

## 已知差异（有意为之）

- 原单页里的项目弹窗改成了独立项目页，弹窗本身不再使用。
- 「简介」从首页的一个区块变成了 `/about/` 页面；首页保留研究、作品、出版、联系。
- 因为列表改为服务端渲染，原来「请启用 JavaScript」的 `<noscript>` 提示不再需要。
- 原页面里的 `assets/img/...` 路径统一改为 `/imgs/...`。
