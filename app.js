/* 仙缘美术资产库 · 网页版交互 */
(function () {
  const D = window.DATA;
  const nodes = D.nodes;
  const root = ""; // 根节点 relpath

  const $ = (s) => document.querySelector(s);
  const elSidebar = $("#tree");
  const elContent = $("#content");
  const elBread = $("#breadcrumb");

  // 当前文件夹下的图片列表（用于灯箱翻页）
  let curImages = [];
  let curImgIdx = 0;

  /* ---------- 工具 ---------- */
  function esc(s) { return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  function pathParts(rel) {
    return rel ? rel.split("/") : [];
  }
  function parentOf(rel) {
    const p = pathParts(rel);
    p.pop();
    return p.join("/");
  }

  /* ---------- 侧边栏目录树 ---------- */
  function buildTree(rel, depth) {
    const node = nodes[rel];
    if (!node) return "";
    let html = "";
    const isRoot = rel === root;
    // 仅展示文件夹和笔记，图片在画廊里看
    const kids = (node.children || []).filter((c) => nodes[c] && nodes[c].type !== "image");
    const rowType = node.type === "note" ? "note" : "folder";
    const icon = isRoot ? "🏠" : (node.type === "note" ? "📄" : "📁");
    const twisty = kids.length ? '<span class="twisty">▾</span>' : '<span class="twisty"></span>';
    const label = esc(node.name);
    const goAttr = isRoot ? `data-go="home"` : (node.type === "note" ? `data-go="note" data-rel="${esc(rel)}"` : `data-go="folder" data-rel="${esc(rel)}"`);
    html += `<div class="tnode">
      <div class="trow" ${goAttr}>
        ${twisty}<span class="icon">${icon}</span><span class="label">${label}</span>
      </div>`;
    if (kids.length) {
      html += `<div class="tchildren">`;
      for (const c of kids) html += buildTree(c, depth + 1);
      html += `</div>`;
    }
    html += `</div>`;
    return html;
  }

  function renderSidebar() {
    elSidebar.innerHTML = buildTree(root, 0);
    elSidebar.querySelectorAll(".trow").forEach((row) => {
      row.addEventListener("click", (e) => {
        const go = row.getAttribute("data-go");
        if (go === "home") navigate("home", "");
        else if (go === "note") navigate("note", row.getAttribute("data-rel"));
        else if (go === "folder") navigate("folder", row.getAttribute("data-rel"));
        // 移动端：点击后收起侧栏
        $("#sidebar").classList.remove("open");
      });
    });
  }

  /* ---------- 面包屑 ---------- */
  function renderBreadcrumb(rel) {
    if (rel === "" || rel == null) { elBread.innerHTML = `<b>${esc(D.root)}</b>`; return; }
    const parts = pathParts(rel);
    let acc = "";
    const crumbs = [`<span class="bc" data-go="home" style="cursor:pointer">${esc(D.root)}</span>`];
    parts.forEach((p, i) => {
      acc = acc ? acc + "/" + p : p;
      const isLast = i === parts.length - 1;
      crumbs.push(isLast ? `<b>${esc(p)}</b>` : `<span class="bc" data-go="folder" data-rel="${esc(acc)}" style="cursor:pointer">${esc(p)}</span>`);
    });
    elBread.innerHTML = crumbs.join(' <span style="color:var(--muted)">/</span> ');
    elBread.querySelectorAll(".bc").forEach((c) => c.addEventListener("click", () => {
      const go = c.getAttribute("data-go");
      if (go === "home") navigate("home", ""); else navigate("folder", c.getAttribute("data-rel"));
    }));
  }

  /* ---------- 视图渲染 ---------- */
  function renderHome() {
    renderBreadcrumb("");
    let cats = (D.categories || []).map((c) =>
      `<div class="cat-card" data-folder="${esc(c.rel)}">
         <div class="cn">${esc(c.name)}</div>
         <div class="cc">${c.count} 张图片</div>
       </div>`).join("");
    const stat = `<div class="stat-row">
        <div class="stat"><div class="n">${D.counts.notes}</div><div class="t">说明笔记</div></div>
        <div class="stat"><div class="n">${D.counts.images}</div><div class="t">美术图片</div></div>
        <div class="stat"><div class="n">${(D.categories || []).length}</div><div class="t">分类目录</div></div>
      </div>`;
    elContent.className = "content";
    elContent.innerHTML = `<div class="home">
        <div class="note">${D.homeHtml || ""}</div>
        ${stat}
        <h2 style="margin-top:8px">资产总览</h2>
        <div class="cat-grid">${cats}</div>
      </div>`;
    elContent.querySelectorAll(".cat-card").forEach((c) =>
      c.addEventListener("click", () => navigate("folder", c.getAttribute("data-folder"))));
  }

  function renderFolder(rel) {
    const node = nodes[rel];
    if (!node) { renderHome(); return; }
    renderBreadcrumb(rel);
    const subfolders = (node.children || []).filter((c) => nodes[c] && nodes[c].type === "folder");
    const notes = (node.children || []).filter((c) => nodes[c] && nodes[c].type === "note");
    const images = (node.children || []).filter((c) => nodes[c] && nodes[c].type === "image");
    curImages = images.slice();

    let html = `<div class="folder-head"><h2>${esc(node.name)}</h2></div>`;

    if (subfolders.length) {
      html += `<div class="subfolders">` + subfolders.map((c) => {
        const k = nodes[c];
        const cnt = (k.children || []).filter((x) => nodes[x] && nodes[x].type === "image").length;
        return `<div class="sub-card" data-folder="${esc(c)}"><div class="cn">${esc(k.name)}</div><div class="cc">${cnt} 张图片</div></div>`;
      }).join("") + `</div>`;
    }
    if (notes.length) {
      html += `<div class="subfolders">` + notes.map((c) =>
        `<div class="sub-card" data-note="${esc(c)}"><div class="cn">📄 ${esc(nodes[c].name)}</div></div>`).join("") + `</div>`;
    }
    if (images.length) {
      html += `<div class="gallery">` + images.map((c, i) => {
        const k = nodes[c];
        return `<div class="thumb" data-img="${i}"><img loading="lazy" src="${esc(k.src)}" alt="${esc(k.name)}"><div class="cap">${esc(k.name)}</div></div>`;
      }).join("") + `</div>`;
    } else if (!subfolders.length && !notes.length) {
      html += `<p style="color:var(--muted)">这个目录暂无内容。</p>`;
    }

    elContent.className = "content";
    elContent.innerHTML = html;
    elContent.querySelectorAll(".sub-card[data-folder]").forEach((c) =>
      c.addEventListener("click", () => navigate("folder", c.getAttribute("data-folder"))));
    elContent.querySelectorAll(".sub-card[data-note]").forEach((c) =>
      c.addEventListener("click", () => navigate("note", c.getAttribute("data-note"))));
    elContent.querySelectorAll(".thumb").forEach((t) =>
      t.addEventListener("click", () => openLightbox(parseInt(t.getAttribute("data-img"), 10))));
  }

  function renderNote(rel) {
    const node = nodes[rel];
    if (!node) { renderHome(); return; }
    renderBreadcrumb(rel);
    elContent.className = "content";
    elContent.innerHTML = `<div class="note">${node.html || "<p style='color:var(--muted)'>（空笔记）</p>"}</div>`;
    // 笔记内的 wikilink 跳转
    elContent.querySelectorAll("a.wikilink").forEach((a) =>
      a.addEventListener("click", () => {
        const rel2 = a.getAttribute("data-rel");
        if (rel2) navigate("note", rel2);
      }));
  }

  /* ---------- 灯箱 ---------- */
  const lb = $("#lightbox");
  function openLightbox(idx) {
    if (!curImages.length) return;
    curImgIdx = idx;
    showLightbox();
  }
  function showLightbox() {
    const k = nodes[curImages[curImgIdx]];
    $("#lb-img").src = k.src;
    $("#lb-cap").textContent = k.name;
    lb.classList.add("show");
  }
  function closeLightbox() { lb.classList.remove("show"); }
  function lbNav(d) {
    curImgIdx = (curImgIdx + d + curImages.length) % curImages.length;
    showLightbox();
  }
  $("#lb-close").addEventListener("click", closeLightbox);
  $("#lb-prev").addEventListener("click", () => lbNav(-1));
  $("#lb-next").addEventListener("click", () => lbNav(1));
  lb.addEventListener("click", (e) => { if (e.target === lb) closeLightbox(); });
  document.addEventListener("keydown", (e) => {
    if (!lb.classList.contains("show")) return;
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowLeft") lbNav(-1);
    if (e.key === "ArrowRight") lbNav(1);
  });

  /* ---------- 搜索 ---------- */
  const sInput = $("#s-input");
  const sRes = $("#s-results");
  sInput.addEventListener("input", () => {
    const q = sInput.value.trim().toLowerCase();
    if (!q) { sRes.classList.remove("show"); return; }
    const out = [];
    for (const rel in nodes) {
      const n = nodes[rel];
      if (n.name.toLowerCase().includes(q)) {
        const kind = n.type === "folder" ? "目录" : (n.type === "note" ? "笔记" : "图片");
        out.push({ rel, name: n.name, kind, type: n.type });
      }
      if (out.length >= 40) break;
    }
    sRes.innerHTML = out.map((o) =>
      `<div class="sres" data-type="${o.type}" data-rel="${esc(o.rel)}"><span class="kind">[${o.kind}]</span>${esc(o.name)}</div>`).join("") ||
      `<div class="sres">没有匹配的素材</div>`;
    sRes.classList.add("show");
    sRes.querySelectorAll(".sres[data-rel]").forEach((r) =>
      r.addEventListener("click", () => {
        const t = r.getAttribute("data-type");
        const rel = r.getAttribute("data-rel");
        sRes.classList.remove("show"); sInput.value = "";
        if (t === "note") navigate("note", rel);
        else if (t === "folder") navigate("folder", rel);
        else { // 图片：跳到所属文件夹并打开灯箱
          const p = parentOf(rel);
          navigate("folder", p);
          // 等渲染后打开
          setTimeout(() => {
            const node = nodes[p];
            if (node) {
              const imgs = (node.children || []).filter((c) => nodes[c] && nodes[c].type === "image");
              const idx = imgs.indexOf(rel);
              if (idx >= 0) openLightbox(idx);
            }
          }, 60);
        }
      }));
  });
  document.addEventListener("click", (e) => { if (!e.target.closest(".search")) sRes.classList.remove("show"); });

  /* ---------- 路由 ---------- */
  function navigate(type, rel) {
    if (type === "home") location.hash = "#/home";
    else if (type === "folder") location.hash = "#/folder/" + encodeURIComponent(rel);
    else if (type === "note") location.hash = "#/note/" + encodeURIComponent(rel);
  }
  window.navigate = navigate;

  function onRoute() {
    const h = location.hash || "#/home";
    const m = h.match(/^#\/(home|folder|note)\/(.*)$/);
    // 高亮侧栏
    elSidebar.querySelectorAll(".trow").forEach((r) => r.classList.remove("active"));
    if (!m || m[1] === "home") {
      renderHome();
    } else if (m[1] === "folder") {
      const rel = decodeURIComponent(m[2]);
      renderFolder(rel);
    } else if (m[1] === "note") {
      const rel = decodeURIComponent(m[2]);
      renderNote(rel);
    }
  }
  window.addEventListener("hashchange", onRoute);

  /* ---------- 启动 ---------- */
  renderSidebar();
  onRoute();
})();
