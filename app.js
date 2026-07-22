(() => {
  // 优先读上级源文件；失败再用本地副本 resume.md
  const DEFAULT_MD_PATHS = [
    "../0721_ai应用开发.md",
    "./resume.md",
  ];

  const resumeEl = document.getElementById("resume");
  const editorPanel = document.getElementById("editorPanel");
  const mdEditor = document.getElementById("mdEditor");
  const loadError = document.getElementById("loadError");
  const fileInput = document.getElementById("fileInput");

  // 可选：把证件照放到 resume-preview/avatar.jpg（也可网页上传）
  const AVATAR_CANDIDATES = ["./avatar.jpg", "./avatar.png", "./avatar.jpeg", "./photo.jpg"];
  const AVATAR_KEY = "resume-avatar-dataurl";
  const avatarInput = document.getElementById("avatarInput");
  let currentMdName = "0721_ai应用开发";

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
    const t = theme === "classic" ? "classic" : "muji";
    resumeEl.classList.remove("theme-muji", "theme-classic");
    resumeEl.classList.add(`theme-${t}`);
    localStorage.setItem("resume-theme", t);
    const sel = document.getElementById("themeSelect");
    if (sel) sel.value = t;
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

  async function resolveAvatar() {
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

    const name = (left[0] || "张晖").split("|")[0].trim();
    document.title = `简历预览 · ${name}`;
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
    loadError.hidden = !msg;
    loadError.textContent = msg || "";
  }

  async function loadInitial() {
    const fetched = await tryFetchMd();

    if (fetched) {
      setMdNameFromPath(fetched.path);
      mdEditor.value = fetched.text;
      await renderMarkdown(fetched.text);
      localStorage.setItem("resume-md-cache", fetched.text);
      showError("");
      return;
    }

    const saved = localStorage.getItem("resume-md-cache");
    if (saved) {
      mdEditor.value = saved;
      await renderMarkdown(saved);
      showError("未能读取 MD 文件，已使用本地缓存。可用「导入 MD」加载。");
      return;
    }

    const fallback = `# 求职简历（AI应用算法工程师）\n\n::: left\n\n- 姓名 | 信息\n- 求职意向：AI应用算法工程师\n\n:::\n\n::: right\n\n- 电话：\n- 邮箱：\n\n:::\n\n## 教育经历\n\n请导入 Markdown。\n`;
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
  }

  function closePdfPreview() {
    const modal = document.getElementById("pdfPreviewModal");
    const mount = document.getElementById("pdfPreviewMount");
    if (mount) mount.innerHTML = "";
    if (modal) modal.hidden = true;
    document.body.style.overflow = "";
  }

  function exportPdfNow() {
    const exportName = buildExportFileName();
    const prevTitle = document.title;
    document.title = exportName;

    document.documentElement.style.setProperty("-webkit-print-color-adjust", "exact");
    document.documentElement.style.setProperty("print-color-adjust", "exact");

    const restore = () => {
      document.title = prevTitle;
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
      showError("html2canvas 未加载，请检查网络后刷新");
      return;
    }

    const btn = document.getElementById("btnPng");
    const prev = btn.textContent;
    btn.disabled = true;
    btn.textContent = "导出中…";
    showError("");

    // 隐藏头像上的「点击更换」等仅预览元素
    resumeEl.classList.add("exporting-png");
    const prevMinHeight = resumeEl.style.minHeight;
    resumeEl.style.minHeight = "auto";

    try {
      // 临时去掉阴影，按实际内容高度导出完整界面（无打印页边距）
      const canvas = await html2canvas(resumeEl, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
        scrollX: 0,
        scrollY: 0,
        windowWidth: resumeEl.scrollWidth,
        windowHeight: resumeEl.scrollHeight,
      });

      const fileName = `${buildExportFileName()}.png`;
      const link = document.createElement("a");
      link.download = fileName;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (e) {
      console.error(e);
      showError("PNG 导出失败，请重试");
    } finally {
      resumeEl.classList.remove("exporting-png");
      resumeEl.style.minHeight = prevMinHeight;
      btn.disabled = false;
      btn.textContent = prev;
    }
  });

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;
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
    });
  }

  loadInitial();
})();
