(() => {
  // Pages / 本地：优先 resume.md，其次极简占位；演示案例走「演示案例」按钮
  const DEFAULT_MD_PATHS = [
    "./resume.md",
    "./resume.example.md",
    "../0721_ai应用开发.md",
  ];
  const DEMO_MD_PATH = "./examples/demo-case.md";

  const resumeEl = document.getElementById("resume");
  const editorPanel = document.getElementById("editorPanel");
  const mdEditor = document.getElementById("mdEditor");
  const loadError = document.getElementById("loadError");
  const fileInput = document.getElementById("fileInput");

  // 可选：把证件照放到 resume-preview/avatar.jpg（也可网页上传）
  const AVATAR_CANDIDATES = ["./avatar.jpg", "./avatar.png", "./avatar.jpeg", "./photo.jpg"];
  const AVATAR_KEY = "resume-avatar-dataurl";
  const avatarInput = document.getElementById("avatarInput");
  let currentMdName = "resume";
  // 示例/演示案例不展示本机曾上传的证件照（照片只在浏览器 localStorage，不在 GitHub）
  let useStoredAvatar = true;

  function pathAllowsPersonalAvatar(path) {
    const p = String(path || "").replace(/\\/g, "/").toLowerCase();
    if (p.includes("demo-case.md")) return false;
    if (p.endsWith("resume.example.md")) return false;
    return true;
  }

  marked.setOptions({ gfm: true, breaks: true });

  /** 木及风格：普通文本行单换行也换行（避免教育经历黏成一段） */
  function normalizeBodyMd(md) {
    return md
      .split(/\n/)
      .map((line) => line.replace(/\s+$/, ""))
      .join("\n")
      .replace(/\n{3,}/g, "\n\n");
  }

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }

  function inlineMd(text) {
    let s = escapeHtml(text);
    s = s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
    return s;
  }

  function listToHtml(items) {
    if (!items.length) return "";
    return `<ul>${items.map((i) => `<li>${inlineMd(i)}</li>`).join("")}</ul>`;
  }

  function extractHeader(md) {
    const leftMatch = md.match(/::: *left\s*([\s\S]*?):::/i);
    const rightMatch = md.match(/::: *right\s*([\s\S]*?):::/i);

    const parseItems = (block) => {
      if (!block) return [];
      return block
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.startsWith("- "))
        .map((l) => l.slice(2).trim());
    };

    let rest = md;
    if (leftMatch) rest = rest.replace(leftMatch[0], "");
    if (rightMatch) rest = rest.replace(rightMatch[0], "");

    let title = "";
    rest = rest.replace(/^#\s+(.+)\s*$/m, (_, t) => {
      title = t.trim();
      return "";
    });

    return {
      left: parseItems(leftMatch && leftMatch[1]),
      right: parseItems(rightMatch && rightMatch[1]),
      title,
      bodyMd: rest.trim(),
    };
  }

  function enhanceTags(html) {
    return html.replace(
      /(?:<p>)?((?:<code>[^<]+<\/code>\s*){2,})(?:<\/p>)?/g,
      (_full, codes) => `<div class="tag-row">${codes}</div>`
    );
  }

  /** 把 h3 + 标签 + 首段绑成一组，避免标题落在页尾、正文跑到下一页 */
  function groupExperienceBlocks(bodyEl) {
    const nodes = Array.from(bodyEl.childNodes);
    const frag = document.createDocumentFragment();
    let i = 0;

    const skipSpace = () => {
      while (
        i < nodes.length &&
        nodes[i].nodeType === 3 &&
        !String(nodes[i].textContent || "").trim()
      ) {
        i += 1;
      }
    };

    while (i < nodes.length) {
      skipSpace();
      if (i >= nodes.length) break;

      const node = nodes[i];
      if (node.nodeType === 1 && node.tagName === "H3") {
        const block = document.createElement("section");
        block.className = "exp-block";

        const head = document.createElement("div");
        head.className = "exp-head";
        head.appendChild(node);
        i += 1;
        skipSpace();

        if (i < nodes.length && nodes[i].nodeType === 1 && nodes[i].classList?.contains("tag-row")) {
          head.appendChild(nodes[i]);
          i += 1;
          skipSpace();
        }

        if (i < nodes.length && nodes[i].nodeType === 1 && nodes[i].tagName === "P") {
          head.appendChild(nodes[i]);
          i += 1;
          skipSpace();
        }

        block.appendChild(head);

        while (i < nodes.length) {
          skipSpace();
          if (i >= nodes.length) break;
          const n = nodes[i];
          if (n.nodeType === 1 && (n.tagName === "H2" || n.tagName === "H3")) break;
          block.appendChild(n);
          i += 1;
        }

        frag.appendChild(block);
        continue;
      }

      frag.appendChild(node);
      i += 1;
    }

    bodyEl.innerHTML = "";
    bodyEl.appendChild(frag);
  }

  function wrapH2(html) {
    return html.replace(/<h2>([\s\S]*?)<\/h2>/g, (_m, inner) => {
      const text = inner.replace(/<[^>]+>/g, "").trim();
      return `<h2><span>${escapeHtml(text)}</span></h2>`;
    });
  }

  /** 经典蓝主题：把 h3 末尾日期拆到右侧 */
  function enhanceH3(html) {
    return html.replace(/<h3>([\s\S]*?)<\/h3>/g, (_m, inner) => {
      const text = inner.replace(/<[^>]+>/g, "").trim();
      const parts = text.split("|").map((s) => s.trim()).filter(Boolean);
      const last = parts[parts.length - 1] || "";
      if (parts.length >= 2 && /\d{4}/.test(last)) {
        const date = parts.pop();
        const name = parts.join(" | ");
        return `<h3 class="exp-title"><span class="exp-name">${escapeHtml(name)}</span><span class="exp-date">${escapeHtml(date)}</span></h3>`;
      }
      return `<h3>${inner}</h3>`;
    });
  }

  function setMdNameFromPath(pathOrName) {
    const raw = String(pathOrName || "resume")
      .replace(/\\/g, "/")
      .split("/")
      .pop();
    currentMdName = raw.replace(/\.(md|markdown|txt)$/i, "") || "resume";
  }

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function buildExportFileName() {
    const d = new Date();
    const stamp =
      d.getFullYear() +
      pad2(d.getMonth() + 1) +
      pad2(d.getDate()) +
      "_" +
      pad2(d.getHours()) +
      pad2(d.getMinutes()) +
      pad2(d.getSeconds());
    return `${currentMdName}_${stamp}`;
  }

  function getTheme() {
    return localStorage.getItem("resume-theme") || "muji";
  }

  function applyTheme(theme) {
    resumeEl.classList.remove("theme-muji", "theme-classic", "theme-rose-red", "theme-blue-circle", "theme-gray-sidebar", "theme-red-arrow");
    resumeEl.classList.add(`theme-${theme}`);
    localStorage.setItem("resume-theme", theme);
    const sel = document.getElementById("themeSelect");
    if (sel) sel.value = theme;
    // 侧边栏主题需要重包内容结构
    if (theme === "gray-sidebar") {
      wrapGraySidebar();
    } else {
      unwrapGraySidebar();
    }
    scheduleFitResumeScale();
  }

  function avatarHtml(src) {
    if (src) {
      return `<button type="button" class="avatar-wrap" title="点击更换证件照" id="avatarHit">
        <img class="avatar" src="${escapeHtml(src)}" alt="证件照" />
        <span class="avatar-tip no-print">点击更换</span>
      </button>`;
    }
    return `<button type="button" class="avatar-wrap placeholder-wrap" title="点击上传证件照" id="avatarHit">
      <span class="avatar placeholder">点击上传<br/>证件照</span>
    </button>`;
  }

  // 灰色右栏主题特殊结构处理
  let prevSidebarHtml = "";
  function wrapGraySidebar() {
    if (!resumeEl) return;
    const header = resumeEl.querySelector(".resume-header");
    const body = resumeEl.querySelector(".resume-body");
    if (!header || !body) return;
    if (resumeEl.querySelector(".resume-sidebar") && resumeEl.querySelector(".resume-content")) return;

    prevSidebarHtml = header.innerHTML;
    const avatarPart = header.querySelector(".resume-header > .avatar-wrap");

    const sidebar = document.createElement("div");
    sidebar.className = "resume-sidebar no-print";
    if (avatarPart) sidebar.appendChild(avatarPart.cloneNode(true));
    const contactPart = header.querySelector(".header-cols");
    if (contactPart) sidebar.innerHTML += contactPart.outerHTML;

    const content = document.createElement("div");
    content.className = "resume-content";
    content.appendChild(header.cloneNode(false));
    content.querySelector(".resume-header").innerHTML = header.innerHTML.replace(avatarPart.outerHTML, "");
    content.appendChild(body);

    resumeEl.innerHTML = "";
    resumeEl.appendChild(sidebar);
    resumeEl.appendChild(content);
  }
  function unwrapGraySidebar() {
    if (!resumeEl || !prevSidebarHtml) return;
    const sidebar = resumeEl.querySelector(".resume-sidebar");
    const content = resumeEl.querySelector(".resume-content");
    if (!sidebar || !content) return;
    // 恢复结构
    const header = content.querySelector(".resume-header");
    const body = content.querySelector(".resume-body");
    resumeEl.innerHTML = "";
    if (header) resumeEl.appendChild(header);
    if (body) resumeEl.appendChild(body);
  }

  async function resolveAvatar() {
    if (!useStoredAvatar) return "";

    const cached = localStorage.getItem(AVATAR_KEY);
    if (cached) return cached;

    for (const path of AVATAR_CANDIDATES) {
      try {
        const res = await fetch(path, { method: "HEAD", cache: "no-store" });
        if (res.ok) return path;
      } catch (_) {
        /* ignore */
      }
    }
    return "";
  }

  function bindAvatarClick() {
    const hit = document.getElementById("avatarHit");
    if (!hit || !avatarInput) return;
    hit.addEventListener("click", () => avatarInput.click());
  }

  function fileToAvatarDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("读取失败"));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error("图片无效"));
        img.onload = () => {
          const maxW = 360;
          const maxH = 450;
          let { width: w, height: h } = img;
          const scale = Math.min(1, maxW / w, maxH / h);
          w = Math.round(w * scale);
          h = Math.round(h * scale);
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL("image/jpeg", 0.88));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  async function renderMarkdown(md) {
    const { left, right, title, bodyMd } = extractHeader(md);
    const avatar = await resolveAvatar();

    let bodyHtml = marked.parse(normalizeBodyMd(bodyMd));
    bodyHtml = wrapH2(bodyHtml);
    bodyHtml = enhanceH3(bodyHtml);
    bodyHtml = enhanceTags(bodyHtml);

    const docTitle = title || "求职简历";
    const theme = getTheme();

    resumeEl.innerHTML = `
      <header class="resume-header">
        <div class="header-main">
          <h1 class="doc-title">${escapeHtml(docTitle)}</h1>
          <div class="header-cols">
            <div class="col left">${listToHtml(left)}</div>
            <div class="col right">${listToHtml(right)}</div>
          </div>
        </div>
        ${avatarHtml(avatar)}
      </header>
      <div class="resume-body">${bodyHtml}</div>
    `;

    applyTheme(theme);

    const bodyEl = resumeEl.querySelector(".resume-body");
    if (bodyEl) groupExperienceBlocks(bodyEl);
    bindAvatarClick();

    const name = (left[0] || "简历").split("|")[0].trim();
    document.title = `简历预览 · ${name}`;
    fitResumeScale();
  }

  function fitResumeScale() {
    const scaler = document.getElementById("resumeScaler");
    if (!scaler || !resumeEl) return;

    resumeEl.style.transform = "";
    scaler.style.height = "";
    scaler.style.width = "";

    // 打印 / 导出时不缩放
    if (window.matchMedia("print").matches) return;

    const pageWrap = scaler.parentElement;
    const available = Math.max(0, (pageWrap?.clientWidth || window.innerWidth) - 4);
    const naturalW = resumeEl.offsetWidth;
    if (!naturalW || available <= 0) return;

    const scale = Math.min(1, available / naturalW);
    if (scale >= 0.995) return;

    resumeEl.style.transform = `scale(${scale})`;
    resumeEl.style.transformOrigin = "top center";
    scaler.style.width = "100%";
    scaler.style.height = `${Math.ceil(resumeEl.offsetHeight * scale)}px`;
  }

  let fitScaleTimer = 0;
  function scheduleFitResumeScale() {
    window.clearTimeout(fitScaleTimer);
    fitScaleTimer = window.setTimeout(fitResumeScale, 80);
  }

  async function tryFetchMd() {
    const bust = `?t=${Date.now()}`;
    for (const path of DEFAULT_MD_PATHS) {
      try {
        const res = await fetch(encodeURI(path) + bust, { cache: "no-store" });
        if (!res.ok) continue;
        const text = await res.text();
        if (text && text.trim()) return { text, path };
      } catch (_) {
        /* file:// */
      }
    }
    return null;
  }

  function showError(msg) {
    const el = document.getElementById("loadError") || loadError;
    if (!el) {
      if (msg) console.warn("[resume]", msg);
      return;
    }
    el.hidden = !msg;
    el.textContent = msg || "";
  }

  async function loadInitial() {
    const fetched = await tryFetchMd();

    if (fetched) {
      useStoredAvatar = pathAllowsPersonalAvatar(fetched.path);
      setMdNameFromPath(fetched.path);
      mdEditor.value = fetched.text;
      await renderMarkdown(fetched.text);
      localStorage.setItem("resume-md-cache", fetched.text);
      showError("");
      return;
    }

    const saved = localStorage.getItem("resume-md-cache");
    if (saved) {
      // 缓存可能是演示案例，避免误显示个人证件照
      useStoredAvatar = !/示例姓名|XX 大学|A 智能科技公司/.test(saved);
      mdEditor.value = saved;
      await renderMarkdown(saved);
      showError("未能读取 MD 文件，已使用本地缓存。可用「导入 MD」加载。");
      return;
    }

    const fallback = `# 求职简历（职位名称）\n\n::: left\n\n- 姓名 | 信息\n- 求职意向：目标岗位\n\n:::\n\n::: right\n\n- 电话：\n- 邮箱：\n\n:::\n\n## 教育经历\n\n请导入 Markdown。\n`;
    useStoredAvatar = false;
    setMdNameFromPath("resume");
    mdEditor.value = fallback;
    await renderMarkdown(fallback);
    showError("请双击「启动预览.bat」用本地服务打开，或点「导入 MD」。");
    editorPanel.hidden = false;
  }

  document.getElementById("btnReload").addEventListener("click", async () => {
    localStorage.removeItem("resume-md-cache");
    // 尝试让用户知悉：改上级 MD 后需同步到 resume.md，或直接导入
    await loadInitial();
  });

  document.getElementById("btnDemo")?.addEventListener("click", async () => {
    try {
      const bust = `?t=${Date.now()}`;
      const res = await fetch(encodeURI(DEMO_MD_PATH) + bust, { cache: "no-store" });
      if (!res.ok) throw new Error(`演示案例加载失败（${res.status}）`);
      const text = await res.text();
      if (!text.trim()) throw new Error("演示案例为空");
      useStoredAvatar = false;
      setMdNameFromPath(DEMO_MD_PATH);
      mdEditor.value = text;
      localStorage.setItem("resume-md-cache", text);
      await renderMarkdown(text);
      showError("已加载脱敏演示案例（不含个人证件照）。可用「导入 MD」换自己的简历。");
    } catch (e) {
      console.error(e);
      showError(e.message || "演示案例加载失败");
    }
  });

  // 切回页面时自动拉最新 MD
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      localStorage.removeItem("resume-md-cache");
      loadInitial();
    }
  });

  document.getElementById("btnEdit").addEventListener("click", () => {
    editorPanel.hidden = !editorPanel.hidden;
  });

  document.getElementById("btnApply").addEventListener("click", async () => {
    const text = mdEditor.value;
    localStorage.setItem("resume-md-cache", text);
    await renderMarkdown(text);
    showError("");
  });

  function openPdfPreview() {
    const modal = document.getElementById("pdfPreviewModal");
    const mount = document.getElementById("pdfPreviewMount");
    if (!modal || !mount) return;

    // 克隆当前简历节点，不走系统打印，秒开预览
    mount.innerHTML = "";
    const clone = resumeEl.cloneNode(true);
    clone.id = "resumePreviewClone";
    clone.style.transform = "";
    clone.querySelectorAll(".avatar-tip").forEach((el) => el.remove());
    clone.querySelectorAll("button.avatar-wrap").forEach((btn) => {
      const img = btn.querySelector("img.avatar");
      const ph = btn.querySelector(".avatar.placeholder");
      const wrap = document.createElement("div");
      wrap.className = "avatar-wrap";
      if (img) wrap.appendChild(img.cloneNode(true));
      else if (ph) wrap.appendChild(ph.cloneNode(true));
      btn.replaceWith(wrap);
    });
    mount.appendChild(clone);
    modal.hidden = false;
    document.body.style.overflow = "hidden";

    requestAnimationFrame(() => {
      const available = mount.clientWidth || window.innerWidth;
      const naturalW = clone.offsetWidth || 1;
      const scale = Math.min(1, available / naturalW);
      clone.style.transform = scale < 0.995 ? `scale(${scale})` : "";
      clone.style.transformOrigin = "top center";
      mount.style.minHeight = `${Math.ceil(clone.offsetHeight * scale)}px`;
    });
  }

  function closePdfPreview() {
    const modal = document.getElementById("pdfPreviewModal");
    const mount = document.getElementById("pdfPreviewMount");
    if (mount) {
      mount.innerHTML = "";
      mount.style.minHeight = "";
    }
    if (modal) modal.hidden = true;
    document.body.style.overflow = "";
  }

  function exportPdfNow() {
    const exportName = buildExportFileName();
    const prevTitle = document.title;
    const prevTransform = resumeEl.style.transform;
    const scaler = document.getElementById("resumeScaler");
    const prevScalerH = scaler ? scaler.style.height : "";
    const prevScalerW = scaler ? scaler.style.width : "";

    document.title = exportName;
    resumeEl.style.transform = "";
    if (scaler) {
      scaler.style.height = "";
      scaler.style.width = "";
    }

    document.documentElement.style.setProperty("-webkit-print-color-adjust", "exact");
    document.documentElement.style.setProperty("print-color-adjust", "exact");

    const restore = () => {
      document.title = prevTitle;
      resumeEl.style.transform = prevTransform;
      if (scaler) {
        scaler.style.height = prevScalerH;
        scaler.style.width = prevScalerW;
      }
      scheduleFitResumeScale();
      window.removeEventListener("afterprint", restore);
    };
    window.addEventListener("afterprint", restore);
    window.print();
  }

  document.getElementById("btnPdfPreview").addEventListener("click", () => {
    openPdfPreview();
  });

  document.getElementById("btnPdfPreviewClose").addEventListener("click", () => {
    closePdfPreview();
  });

  document.getElementById("btnPdfPreviewExport").addEventListener("click", () => {
    closePdfPreview();
    // 稍等一帧再打印，避免和弹层关闭抢渲染
    requestAnimationFrame(() => exportPdfNow());
  });

  document.getElementById("btnPdf").addEventListener("click", () => {
    exportPdfNow();
  });

  document.getElementById("btnPng").addEventListener("click", async () => {
    if (typeof html2canvas !== "function") {
      showError("html2canvas 未加载，请刷新页面（需能访问 ./vendor/html2canvas.min.js）");
      return;
    }

    const btn = document.getElementById("btnPng");
    const prev = btn.textContent;
    btn.disabled = true;
    btn.textContent = "导出中…";
    showError("");

    // 离屏克隆，避免直接截「带 Google 字体/工具栏」的页面导致卡住
    const host = document.createElement("div");
    host.style.cssText =
      "position:fixed;left:-10000px;top:0;width:210mm;background:#fff;z-index:-1;pointer-events:none;";
    const clone = resumeEl.cloneNode(true);
    clone.id = "resumePngClone";
    clone.classList.add("exporting-png");
    clone.style.minHeight = "auto";
    clone.style.boxShadow = "none";
    clone.querySelectorAll(".avatar-tip, .no-print").forEach((el) => el.remove());
    // button 换成普通容器，减少 html2canvas 异常
    clone.querySelectorAll("button.avatar-wrap").forEach((btnEl) => {
      const wrap = document.createElement("div");
      wrap.className = "avatar-wrap";
      wrap.style.cssText = btnEl.style.cssText || "";
      while (btnEl.firstChild) wrap.appendChild(btnEl.firstChild);
      btnEl.replaceWith(wrap);
    });
    host.appendChild(clone);
    document.body.appendChild(host);

    const withTimeout = (promise, ms) =>
      Promise.race([
        promise,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("导出超时，请重试或改用导出 PDF")), ms)
        ),
      ]);

    try {
      // 等一帧，让离屏节点完成布局
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

      const canvas = await withTimeout(
        html2canvas(clone, {
          scale: 2,
          useCORS: true,
          allowTaint: false,
          backgroundColor: "#ffffff",
          logging: false,
          imageTimeout: 5000,
          foreignObjectRendering: false,
          removeContainer: true,
          onclone: (_doc, el) => {
            el.style.fontFamily =
              '"Microsoft YaHei","PingFang SC","Noto Sans SC",sans-serif';
            el.querySelectorAll("*").forEach((node) => {
              if (node.style) {
                // 避免部分滤镜/复杂阴影拖死引擎
                if (node.style.filter) node.style.filter = "none";
              }
            });
          },
        }),
        20000
      );

      const fileName = `${buildExportFileName()}.png`;
      const link = document.createElement("a");
      link.download = fileName;
      link.href = canvas.toDataURL("image/png");
      link.click();
      showError("");
    } catch (e) {
      console.error(e);
      showError(e.message || "PNG 导出失败，请重试或改用导出 PDF");
    } finally {
      host.remove();
      btn.disabled = false;
      btn.textContent = prev;
    }
  });

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;
    useStoredAvatar = true;
    setMdNameFromPath(file.name);
    const text = await file.text();
    mdEditor.value = text;
    localStorage.setItem("resume-md-cache", text);
    await renderMarkdown(text);
    showError("");
    fileInput.value = "";
  });

  avatarInput.addEventListener("change", async () => {
    const file = avatarInput.files && avatarInput.files[0];
    if (!file) return;
    try {
      const dataUrl = await fileToAvatarDataUrl(file);
      localStorage.setItem(AVATAR_KEY, dataUrl);
      useStoredAvatar = true;
      await renderMarkdown(mdEditor.value || (await tryFetchMd())?.text || "");
      showError("");
    } catch (e) {
      showError(e.message || "证件照上传失败");
    }
    avatarInput.value = "";
  });

  document.getElementById("btnClearAvatar").addEventListener("click", async () => {
    localStorage.removeItem(AVATAR_KEY);
    await renderMarkdown(mdEditor.value);
  });

  const themeSelect = document.getElementById("themeSelect");
  if (themeSelect) {
    themeSelect.value = getTheme();
    themeSelect.addEventListener("change", () => {
      applyTheme(themeSelect.value);
      scheduleFitResumeScale();
    });
  }

  const toolbar = document.querySelector(".toolbar");
  const btnMenu = document.getElementById("btnMenu");
  if (btnMenu && toolbar) {
    btnMenu.addEventListener("click", () => {
      const open = toolbar.classList.toggle("is-open");
      btnMenu.setAttribute("aria-expanded", open ? "true" : "false");
      btnMenu.textContent = open ? "收起" : "菜单";
    });
    // 点工具栏按钮后自动收起（移动端）
    document.getElementById("toolbarActions")?.addEventListener("click", (e) => {
      if (!window.matchMedia("(max-width: 860px)").matches) return;
      const t = e.target;
      if (t && (t.closest("button") || t.closest("label.btn"))) {
        // 文件选择先别立刻收起，等 change 再收
        if (t.closest("label.btn")) return;
        toolbar.classList.remove("is-open");
        btnMenu.setAttribute("aria-expanded", "false");
        btnMenu.textContent = "菜单";
      }
    });
  }

  window.addEventListener("resize", scheduleFitResumeScale);
  window.addEventListener("orientationchange", scheduleFitResumeScale);
  if (document.fonts?.ready) {
    document.fonts.ready.then(scheduleFitResumeScale);
  }

  loadInitial();
})();
