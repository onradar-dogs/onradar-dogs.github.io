// Per-navigation scroll handler cleanup
let _scrollHandlers = [];
function _clearScrollHandlers() {
  _scrollHandlers.forEach(([ev, fn]) => window.removeEventListener(ev, fn));
  _scrollHandlers = [];
}

document.addEventListener("DOMContentLoaded", () => {
  // Promo bar
  const promoBar = document.querySelector("[data-promo-bar]");
  if (promoBar && localStorage.getItem("onradar-promo-dismissed") === "true") {
    promoBar.classList.add("hidden");
  }
  document.querySelector("[data-close-promo]")?.addEventListener("click", () => {
    promoBar?.classList.add("hidden");
    localStorage.setItem("onradar-promo-dismissed", "true");
  });

  // Floating signup
  const floatingSignup = document.querySelector("[data-floating-signup]");
  if (floatingSignup && localStorage.getItem("onradar-floating-signup-dismissed") === "true") {
    floatingSignup.classList.add("hidden");
  }
  const updateFloatingSignup = () => {
    if (!floatingSignup || floatingSignup.classList.contains("hidden")) return;
    floatingSignup.classList.toggle("is-visible", window.scrollY > 320);
  };
  document.querySelector("[data-close-floating-signup]")?.addEventListener("click", () => {
    floatingSignup?.classList.add("hidden");
    localStorage.setItem("onradar-floating-signup-dismissed", "true");
  });
  updateFloatingSignup();
  window.addEventListener("scroll", updateFloatingSignup, { passive: true });

  // Forms (fake submit)
  document.querySelectorAll("form").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const existing = form.parentElement?.querySelector(".feedback-note");
      if (existing) existing.remove();
      const note = document.createElement("p");
      note.className = "feedback-note";
      note.textContent = "Preview form captured. Podpiecie do realnego endpointu zrobimy poza statycznym MVP.";
      form.parentElement?.appendChild(note);
      form.reset();
    });
  });

  // Run article-specific init
  initPage();

  // SPA router init
  history.replaceState({ path: location.pathname }, "", location.pathname);
});

// ─── Article page features ───────────────────────────────────────────────────

function initPage() {
  _clearScrollHandlers();
  initCopyUrl();
  initTOC();
  initReadingProgress();
}

function initCopyUrl() {
  document.querySelectorAll("[data-copy-url]").forEach((btn) => {
    // Clone to strip old listeners
    const fresh = btn.cloneNode(true);
    btn.replaceWith(fresh);
    fresh.addEventListener("click", async () => {
      const url = window.location.href;
      try {
        await navigator.clipboard.writeText(url);
        fresh.textContent = "Copied";
      } catch (_) {
        window.prompt("Copy this URL:", url);
      }
      setTimeout(() => { fresh.textContent = "Copy link"; }, 1600);
    });
  });
}

function initTOC() {
  const articleContent = document.querySelector("[data-article-content]");
  const toc = document.querySelector("[data-toc]");
  const tocShell = document.querySelector("[data-toc-shell]");
  if (!articleContent || !toc || !tocShell) return;

  toc.innerHTML = "";
  const headings = Array.from(articleContent.querySelectorAll("h2, h3"));
  if (!headings.length) { tocShell.classList.add("hidden"); return; }
  tocShell.classList.remove("hidden");

  let currentGroup = null;
  headings.forEach((heading, index) => {
    if (!heading.id) {
      heading.id = heading.textContent.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || `section-${index + 1}`;
    }
    const link = document.createElement("a");
    link.href = `#${heading.id}`;
    link.textContent = heading.textContent;
    link.dataset.sectionId = heading.id;

    if (heading.tagName === "H2" || !currentGroup) {
      const item = document.createElement("li");
      item.className = "toc-item toc-item--level-2";
      link.className = "toc-link toc-link--level-2";
      item.appendChild(link);
      const sublist = document.createElement("ul");
      sublist.className = "toc-sublist";
      item.appendChild(sublist);
      toc.appendChild(item);
      currentGroup = sublist;
    } else {
      const item = document.createElement("li");
      item.className = "toc-item toc-item--level-3";
      link.className = "toc-link toc-link--level-3";
      item.appendChild(link);
      currentGroup.appendChild(item);
    }
  });

  const tocLinks = Array.from(toc.querySelectorAll("[data-section-id]"));
  const updateActive = () => {
    let activeId = "";
    for (const h of headings) {
      if (h.getBoundingClientRect().top <= 180) activeId = h.id;
      else break;
    }
    tocLinks.forEach((l) => l.classList.toggle("is-active", l.dataset.sectionId === activeId));
  };
  updateActive();
  _scrollHandlers.push(["scroll", updateActive]);
  window.addEventListener("scroll", updateActive, { passive: true });
}

function initReadingProgress() {
  const bar = document.querySelector("[data-reading-progress]");
  const content = document.querySelector("[data-article-content]");
  if (!bar) return;
  if (!content) { bar.style.width = "0%"; return; }

  const update = () => {
    const top = window.scrollY + content.getBoundingClientRect().top;
    const height = content.offsetHeight - window.innerHeight;
    if (height <= 0) { bar.style.width = "0%"; return; }
    bar.style.width = `${Math.max(0, Math.min(100, ((window.scrollY - top) / height) * 100))}%`;
  };
  update();
  _scrollHandlers.push(["scroll", update]);
  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
}

// ─── SPA Router ─────────────────────────────────────────────────────────────

document.addEventListener("click", (e) => {
  const a = e.target.closest("a");
  if (!a) return;
  const href = a.getAttribute("href");
  if (!href || a.target === "_blank" || a.hasAttribute("download")) return;
  if (/^(https?:\/\/|\/\/|#|mailto:|tel:)/.test(href)) return;
  // Only intercept links that resolve to .html pages (or directory index)
  e.preventDefault();
  _navigate(href);
});

window.addEventListener("popstate", () => {
  _loadPage(location.pathname, false);
});

function _navigate(path) {
  if (path === location.pathname) return;
  history.pushState({ path }, "", path);
  _loadPage(path, true);
}

function _loadPage(path, doScroll) {
  document.body.classList.add("od-loading");

  fetch(path)
    .then((r) => { if (!r.ok) throw r; return r.text(); })
    .then((html) => {
      const doc = new DOMParser().parseFromString(html, "text/html");

      // Metadata
      document.title = doc.title;
      _swapMeta(doc, "description");
      const canon = doc.querySelector('link[rel="canonical"]');
      const curCanon = document.querySelector('link[rel="canonical"]');
      if (canon && curCanon) curCanon.href = canon.href;

      // Body class (article-page vs home-page)
      document.body.className = doc.body.className + (doc.body.className ? " " : "") + "od-loading";

      // Swap content-column — keep site-layout grid and sidebar intact
      const newCol = doc.querySelector(".content-column");
      const curCol = document.querySelector(".content-column");

      // Also swap sidebar if the new page has one
      const newAside = doc.querySelector(".site-layout > aside");
      const curAside = document.querySelector(".site-layout > aside");

      if (!newCol || !curCol) { location.href = path; return; }

      curCol.innerHTML = newCol.innerHTML;
      if (newAside && curAside) curAside.innerHTML = newAside.innerHTML;

      document.body.classList.remove("od-loading");
      if (doScroll) window.scrollTo({ top: 0, behavior: "instant" });

      initPage();

      // Re-bind form submits for any new forms in swapped content
      curCol.querySelectorAll("form").forEach((form) => {
        form.addEventListener("submit", (event) => {
          event.preventDefault();
          const existing = form.parentElement?.querySelector(".feedback-note");
          if (existing) existing.remove();
          const note = document.createElement("p");
          note.className = "feedback-note";
          note.textContent = "Preview form captured.";
          form.parentElement?.appendChild(note);
          form.reset();
        });
      });
    })
    .catch(() => {
      document.body.classList.remove("od-loading");
      location.href = path;
    });
}

function _swapMeta(doc, name) {
  const n = doc.querySelector(`meta[name="${name}"]`);
  const c = document.querySelector(`meta[name="${name}"]`);
  if (n && c) c.setAttribute("content", n.getAttribute("content"));
}

// ─── Global UI helpers (tabs, cost calculator) ──────────────────────────────

window.switchTab = (event, tabId) => {
  document.querySelectorAll(".tab-button").forEach((b) => b.classList.remove("active"));
  document.querySelectorAll(".tab-content").forEach((p) => p.classList.remove("active"));
  event?.currentTarget?.classList.add("active");
  document.getElementById(tabId)?.classList.add("active");
};

window.calculateCost = () => {
  const ids = ["foodQuality", "vetCare", "grooming", "training", "supplies"];
  const total = ids.reduce((sum, id) => sum + Number(document.getElementById(id)?.value || 0), 0);
  const result = document.getElementById("result");
  const totalCost = document.getElementById("totalCost");
  const monthlyCost = document.getElementById("monthlyCost");
  if (result && totalCost && monthlyCost) {
    totalCost.textContent = `$${total.toLocaleString()}`;
    monthlyCost.textContent = `$${Math.round(total / 12).toLocaleString()}`;
    result.style.display = "block";
  }
};
