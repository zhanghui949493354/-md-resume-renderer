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

## 部署到 GitHub Pages（别人也能用）

可以。这是纯静态站点，适合用 GitHub 提供的域名访问，例如：

`https://zhanghui949493354.github.io/-md-resume-renderer/`

（仓库名以你实际为准）

### 步骤

1. 仓库设为 **Public**（个人免费账号对私有仓 Pages 有限制；公开仓可免费用）
2. GitHub 仓库页 → **Settings** → **Pages**
3. **Build and deployment** → Source 选 **Deploy from a branch**
4. Branch 选 **`v1`**（或 `main`），文件夹选 **`/ (root)`** → Save
5. 等 1～2 分钟，打开上面的 `github.io` 链接

### 别人怎么用

打开你的 Pages 链接后：

- 默认加载仓库里的 `resume.example.md`（**极简占位**，不含真实个人信息）
- 点 **演示案例** 可加载 `examples/demo-case.md`（**脱敏样例**：学校/公司/姓名等已替换）
- 点 **导入 MD** 上传自己的简历 Markdown
- 上传证件照、切换主题、导出 PDF/PNG  

证件照和编辑内容存在**对方浏览器本地**，不会写回你的 GitHub。

### 注意

- CDN（marked / html2canvas / 字体）需能访问外网  
- 不要把带真实手机号、学校、公司的 `resume.md` 推上公开仓库  
- 改代码后执行 `git push`，Pages 会自动更新  

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
├── resume.example.md    # 默认极简占位（无真实信息）
├── examples/
│   └── demo-case.md     # 脱敏演示案例（点「演示案例」加载）
├── 启动预览.bat          # Windows 一键启动
├── README.md
└── docs/
    └── TECHNICAL_ROUTE.md
```

真实简历请放本地 `resume.md`（已加入 `.gitignore`，勿提交隐私信息）。

---

## License

MIT
