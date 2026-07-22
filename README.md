# MD → PDF 本地简历渲染器

用 **Markdown 写简历**，在浏览器里渲染成接近木及简历的版式，再导出 **PDF / PNG**。零构建、无后端框架，适合放到 GitHub 自用或二次开发。

> 本仓库演示的是「从 MD 到可投递 PDF」的技术路线；上传前请自行脱敏（手机号、邮箱、证件照等）。

---

## 技术路线总览

```text
┌─────────────┐     fetch / 导入      ┌──────────────────┐
│  resume.md  │ ───────────────────► │  Markdown 解析   │
│  (源文件)   │                       │  marked.js       │
└─────────────┘                       └────────┬─────────┘
                                               │
                    自定义预处理                ▼
              · ::: left / ::: right 顶栏
              · `tag` 技术标签行
              · ## → 章节胶囊 / 蓝标题
              · ### → 经历标题（可拆日期）
                                               │
                                               ▼
                                      ┌──────────────────┐
                                      │  HTML + CSS 排版  │
                                      │  双主题切换       │
                                      └────────┬─────────┘
                                               │
                     ┌─────────────────────────┼─────────────────────────┐
                     ▼                         ▼                         ▼
              屏幕实时预览              预览 PDF（浮层）           导出 PDF / PNG
              （所见即所得）            不调系统打印              打印另存 / html2canvas
```

### 为什么走这条路

| 方案 | 优点 | 缺点 |
|------|------|------|
| 纯 Word / 在线简历站 | 上手快 | 难版本管理、样式受限 |
| LaTeX / Typst | 排版强 | 学习成本高 |
| **MD + 浏览器渲染（本方案）** | Git 友好、样式可编程、导出方便 | PDF 依赖浏览器打印能力 |

核心思路：**内容用 MD 维护，表现用 HTML/CSS 控制，导出复用浏览器能力**。

---

## 技术栈

| 层级 | 技术 | 作用 |
|------|------|------|
| 内容 | Markdown（GFM） | 简历正文、易 diff |
| 解析 | [marked](https://github.com/markedjs/marked) | MD → HTML |
| 样式 | 原生 CSS（`mm` / `pt` 固定版式） | A4、打印友好 |
| 逻辑 | 原生 JavaScript（IIFE） | 解析扩展、主题、导出 |
| 本地服务 | `python -m http.server` | 解决 `file://` 无法 fetch MD |
| PDF | `window.print()` + `@media print` | 另存为 PDF |
| PNG | [html2canvas](https://github.com/niklasvh/html2canvas) | 整页截图导出 |
| 字体 | Noto Sans SC / 系统中文字体 | 中文显示 |

无 React/Vue/构建工具；打开即用。

---

## 功能特性

- **仿木及顶栏**：`::: left` / `::: right` 双栏个人信息 + 证件照
- **双主题**
  - 木及风：深色顶栏 + 灰胶囊章节标题
  - 经典蓝：白底顶栏 + 蓝色标题下划线，经历标题左文右日期
- **证件照上传**：浏览器本地压缩后存 `localStorage`，可清除
- **MD 热加载**：重新加载 / 切回标签页拉取最新文件
- **预览 PDF**：浮层秒开，不调用系统打印
- **导出 PDF**：打印对话框另存；默认文件名 `MD名_时间戳`
- **导出 PNG**：无页边距，按内容高度完整截取
- **打印优化**：`print-color-adjust`、首页/续页不同 `@page` 边距、避免大段 `break-inside: avoid` 造成页尾大空白

---

## 目录结构

```text
resume-preview/
├── index.html       # 页面骨架与工具栏
├── style.css        # 版式 + 双主题 + 打印样式
├── app.js           # MD 解析扩展、主题、导出
├── resume.md        # 简历 Markdown（可替换）
├── 启动预览.bat      # Windows：同步 MD 并起本地服务
├── README.md        # 本文档
└── avatar.jpg       # 可选：本地证件照（勿强行提交隐私图）
```

---

## 快速开始

首次使用可复制示例简历：

```bash
cp resume.example.md resume.md   # Linux / macOS
copy resume.example.md resume.md # Windows
```

### Windows

1. 把简历 MD 放在上一级或本目录的 `resume.md`
2. 双击 `启动预览.bat`（会尝试同步 `../你的简历.md` → `resume.md`）
3. 浏览器打开 http://127.0.0.1:8765/

### 任意系统

```bash
cd resume-preview
# 可选：复制你的源 MD
# cp ../your-resume.md ./resume.md
python -m http.server 8765
```

打开 http://127.0.0.1:8765/ ，用「导入 MD」也可直接选文件。

### 导出 PDF 建议设置（Chrome）

1. 目标：另存为 PDF  
2. 纸张：A4；缩放：**100%**（不要「适合页面」）  
3. 勾选：**背景图形**  
4. 文件名会尝试使用 `文档标题`（已设为 `MD名_时间戳`）

---

## Markdown 约定

与木及简历类似的轻量约定：

```markdown
# 求职简历（岗位名称）

::: left

- 姓名 | 基本信息
- 学校 | 专业 | 学历 | 届别
- 求职意向：xxx

:::

::: right

- 电话：xxx
- 邮箱：xxx

:::

## 教育经历

学校 | 专业 | 学历 | 时间 | 绩点

## 实习经历

### 公司 | 岗位 | 2026.01-至今

`Python` `FastAPI` `RAG`

概述一段话。

- **项目名**：描述……
  - **子点**：……
```

| 语法 | 渲染效果 |
|------|----------|
| `# 标题` | 顶栏大标题 |
| `::: left/right` | 顶栏左右信息列 |
| `##` | 章节标题（胶囊 / 蓝线，视主题） |
| `### 公司 \| 岗位 \| 日期` | 经历标题；经典蓝主题会把末段日期拆到右侧 |
| 连续 `` `tag` `` | 技术标签 chips |
| `**粗体**` | 强调 JD 关键词 / 量化结果 |

---

## 关键实现说明

### 1. 解析流水线（`app.js`）

1. 抽取 `::: left/right` → 顶栏  
2. 去掉一级标题 → `doc-title`  
3. 剩余正文交给 `marked.parse`  
4. 后处理：`h2` 包胶囊、`h3` 拆日期、连续 `code` 收成 `tag-row`  
5. 将 `h3 + 标签 + 首段` 绑成 `.exp-head`，减少「标题落在页尾、正文跑到下页」  

### 2. 固定版式（`style.css`）

用 CSS 变量统一控制，便于压成约 2 页 A4：

```css
:root {
  --page-w: 210mm;
  --page-h: 297mm;
  --pad-x: 10mm;
  --fs-body: 10.5pt;
  /* ... */
}
```

打印：

```css
@page { size: A4; margin: 10mm 0 5mm 0; }   /* 第 2 页起 */
@page :first { margin-top: 0; margin-bottom: 5mm; }  /* 首页顶栏可贴边 */
```

### 3. 导出

| 方式 | 实现 | 特点 |
|------|------|------|
| 预览 PDF | 克隆 DOM 到浮层 | 快，不调打印引擎 |
| 导出 PDF | `window.print()` | 需浏览器「背景图形」 |
| 导出 PNG | `html2canvas(resume)` | 无打印页边距，完整长图 |

---

## 隐私与开源建议

上传 GitHub 前建议：

- [ ] 替换或删除真实手机号、邮箱  
- [ ] 不要提交证件照 / `localStorage` 导出的隐私数据  
- [ ] `resume.md` 可改为 `resume.example.md`，真实内容本地维护  
- [ ] 若仓库公开，在 README 标明「示例简历，非完整隐私信息」

示例 `.gitignore`：

```gitignore
avatar.jpg
avatar.png
avatar.jpeg
photo.jpg
resume.md
.DS_Store
```

---

## 后续可扩展

- 更多主题（侧栏、时间轴）  
- 一键 GitHub Pages 静态托管  
- Puppeteer / Playwright 无头浏览器批量出 PDF（CI）  
- YAML front-matter 管理姓名/意向等元数据  

---

## License

MIT（若你开源本工具代码）。简历正文版权归作者本人。
