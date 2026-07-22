# 技术路线详解

本文说明「Markdown → 可投递 PDF/PNG」的实现细节，供二次开发参考。功能说明见根目录 [README.md](../README.md)。

---

## 总览

```text
┌──────────────┐   fetch / 导入    ┌─────────────────┐
│ resume.md    │ ───────────────► │ marked.js 解析   │
└──────────────┘                  └────────┬────────┘
                                           │
                         自定义预处理        ▼
                   · ::: left / right 顶栏
                   · 连续 `tag` → 标签行
                   · ## / ### 结构增强
                   · 经历块绑定（防劣质分页）
                                           │
                                           ▼
                                  ┌─────────────────┐
                                  │ HTML + CSS 双主题 │
                                  └────────┬────────┘
                     ┌─────────────────────┼─────────────────────┐
                     ▼                     ▼                     ▼
              屏幕预览              浮层预览 PDF            导出 PDF / PNG
```

### 方案对比

| 方案 | 优点 | 缺点 |
|------|------|------|
| Word / 在线简历站 | 上手快 | 难版本管理、样式受限 |
| LaTeX / Typst | 排版强 | 学习成本高 |
| **MD + 浏览器（本项目）** | Git 友好、样式可编程 | PDF 依赖浏览器打印 |

---

## 技术栈

| 层级 | 技术 | 作用 |
|------|------|------|
| 内容 | Markdown（GFM） | 简历正文、易 diff |
| 解析 | [marked](https://github.com/markedjs/marked) | MD → HTML |
| 样式 | 原生 CSS（`mm` / `pt`） | A4、打印稳定 |
| 逻辑 | 原生 JavaScript | 扩展语法、主题、导出 |
| 本地服务 | `python -m http.server` | 避免 `file://` 无法 fetch |
| PDF | `window.print()` + `@media print` | 另存为 PDF |
| PNG | [html2canvas](https://github.com/niklasvh/html2canvas) | 整页截图 |
| 字体 | Noto Sans SC / 系统中文字体 | 中文显示 |

无 React/Vue/打包工具。

---

## Markdown 约定

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
| `::: left` / `::: right` | 顶栏左右信息列 |
| `##` | 章节标题（胶囊或蓝线下划线，视主题） |
| `### 公司 \| 岗位 \| 日期` | 经历标题；经典蓝会把末段日期拆到右侧 |
| 连续 `` `tag` `` | 技术标签 chips |
| `**粗体**` | 强调关键词 / 量化结果 |

---

## 解析流水线（`app.js`）

1. 抽取 `::: left/right` → 顶栏列表  
2. 去掉一级 `#` 标题 → `doc-title`  
3. 剩余正文 `marked.parse`（`breaks: true`，单换行也换行）  
4. 后处理：
   - `wrapH2`：章节标题包一层 `<span>`（木及胶囊用）  
   - `enhanceH3`：按 `|` 拆出日期，生成 `.exp-title`  
   - `enhanceTags`：连续 `<code>` 收成 `.tag-row`  
5. `groupExperienceBlocks`：把 `h3 + 标签 + 首段概述` 绑成 `.exp-head`，减少「标题落在页尾、正文跑到下页」的空白  

证件照优先读 `localStorage`（上传压缩后的 DataURL），否则尝试 `./avatar.jpg` 等本地文件。

---

## 版式与打印（`style.css`）

用 CSS 变量统一调字号与边距，便于压成约 2 页 A4：

```css
:root {
  --page-w: 210mm;
  --page-h: 297mm;
  --pad-x: 10mm;
  --fs-body: 10.5pt;
  --fs-title: 13pt;
  /* ... */
}
```

打印相关：

```css
@page {
  size: A4;
  margin: 10mm 0 5mm 0;   /* 第 2 页起：上边距防顶格 */
}
@page :first {
  margin-top: 0;          /* 首页顶栏可贴边 */
  margin-bottom: 5mm;
}
```

注意：

- 使用 `-webkit-print-color-adjust: exact` / `print-color-adjust: exact`，并配合 inset `box-shadow` 提高背景打印成功率  
- **不要**对大块 `li` 设 `page-break-inside: avoid`，否则容易整块推到下一页、页尾留白  
- 窄屏样式用 `@media screen and (...)`，避免打印时被当成窄屏把两栏叠起来  

主题通过 `.resume.theme-muji` / `.resume.theme-classic` 切换。

---

## 导出实现

| 方式 | 实现 | 特点 |
|------|------|------|
| 预览 PDF | 克隆 DOM 到浮层 | 快，不调打印引擎 |
| 导出 PDF | 设置 `document.title` 后 `window.print()` | 默认文件名 ≈ `MD名_时间戳` |
| 导出 PNG | `html2canvas(resume)`，`min-height: auto` | 无打印页边距，完整长图 |

Chrome 导出 PDF 建议：缩放 100%、勾选「背景图形」。

---

## 可扩展方向

- 更多主题（侧栏、时间轴）  
- GitHub Pages 静态托管  
- Puppeteer / Playwright 无头批量出 PDF（CI）  
- YAML front-matter 管理姓名、意向等元数据  

---

## 隐私

- 示例请用 `resume.example.md`（已脱敏）  
- 真实 `resume.md`、证件照不要提交公开仓库（见 `.gitignore`）
