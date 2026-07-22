# MD Resume Renderer

用 **Markdown** 写简历，浏览器里实时预览，一键导出 **PDF / PNG**。  
本地运行、零构建，支持双主题与证件照上传。

---

## 功能

- **Markdown 编辑**：导入 / 在线编辑 / 重新加载，改完立刻预览
- **双主题切换**
  - 木及风：深色顶栏 + 灰胶囊章节标题
  - 经典蓝：白底顶栏 + 蓝色标题下划线，经历标题左文右日期
- **证件照**：点击上传或更换，本地压缩保存；可清除
- **预览 PDF**：浮层秒开，不调用系统打印
- **导出 PDF**：浏览器「另存为 PDF」，默认文件名 `MD名_时间戳`
- **导出 PNG**：截取完整简历界面，无打印页边距
- **打印友好**：固定 A4 版式、背景色可打印、分页尽量不留大块空白

---

## 快速开始

```bash
# 复制示例简历（首次）
cp resume.example.md resume.md        # macOS / Linux
# copy resume.example.md resume.md    # Windows

# 启动本地服务
python -m http.server 8765
```

浏览器打开：http://127.0.0.1:8765/

Windows 也可双击 `启动预览.bat`。

### 导出 PDF（Chrome）

1. 点 **导出 PDF** → 选择「另存为 PDF」  
2. 纸张 A4，缩放 **100%**  
3. 勾选 **背景图形**

---

## 技术路线（简述）

```text
Markdown  →  marked 解析 + 自定义预处理  →  HTML/CSS 排版  →  预览 / PDF / PNG
```

| 环节 | 做法 |
|------|------|
| 内容 | Markdown（GFM） |
| 渲染 | marked.js + 原生 JS |
| 样式 | 原生 CSS（`mm`/`pt` 固定 A4） |
| PDF | `window.print()` |
| PNG | html2canvas |

更完整的解析约定、版式变量、分页与导出细节，见 **[docs/TECHNICAL_ROUTE.md](docs/TECHNICAL_ROUTE.md)**。

---

## 目录

```text
├── index.html           # 页面与工具栏
├── style.css            # 主题与打印样式
├── app.js               # 解析、主题、导出
├── resume.example.md    # 示例简历（已脱敏）
├── 启动预览.bat          # Windows 一键启动
├── README.md
└── docs/
    └── TECHNICAL_ROUTE.md
```

真实简历请放本地 `resume.md`（已加入 `.gitignore`，勿提交隐私信息）。

---

## License

MIT
