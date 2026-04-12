document.addEventListener("DOMContentLoaded", () => {
  const promoBar = document.querySelector("[data-promo-bar]");
  const promoDismissed = localStorage.getItem("onradar-promo-dismissed");
  if (promoBar && promoDismissed === "true") {
    promoBar.classList.add("hidden");
  }

  document.querySelector("[data-close-promo]")?.addEventListener("click", () => {
    promoBar?.classList.add("hidden");
    localStorage.setItem("onradar-promo-dismissed", "true");
  });

  const floatingSignup = document.querySelector("[data-floating-signup]");
  const floatingDismissed = localStorage.getItem("onradar-floating-signup-dismissed");
  if (floatingSignup && floatingDismissed === "true") {
    floatingSignup.classList.add("hidden");
  }

  const updateFloatingSignup = () => {
    if (!floatingSignup || floatingSignup.classList.contains("hidden")) {
      return;
    }
    floatingSignup.classList.toggle("is-visible", window.scrollY > 320);
  };

  document.querySelector("[data-close-floating-signup]")?.addEventListener("click", () => {
    floatingSignup?.classList.add("hidden");
    localStorage.setItem("onradar-floating-signup-dismissed", "true");
  });

  updateFloatingSignup();
  window.addEventListener("scroll", updateFloatingSignup, { passive: true });

  document.querySelectorAll("form").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const existing = form.parentElement?.querySelector(".feedback-note");
      if (existing) {
        existing.remove();
      }
      const note = document.createElement("p");
      note.className = "feedback-note";
      note.textContent = "Preview form captured. Podpiecie do realnego endpointu zrobimy poza statycznym MVP.";
      form.parentElement?.appendChild(note);
      form.reset();
    });
  });

  document.querySelectorAll("[data-copy-url]").forEach((button) => {
    button.addEventListener("click", async () => {
      const url = window.location.href;
      try {
        await navigator.clipboard.writeText(url);
        button.textContent = "Copied";
      } catch (_error) {
        window.prompt("Copy this URL:", url);
      }
      window.setTimeout(() => {
        button.textContent = "Copy link";
      }, 1600);
    });
  });

  const articleContent = document.querySelector("[data-article-content]");
  const toc = document.querySelector("[data-toc]");
  const tocShell = document.querySelector("[data-toc-shell]");
  if (articleContent && toc && tocShell) {
    const headings = Array.from(articleContent.querySelectorAll("h2, h3"));
    if (!headings.length) {
      tocShell.classList.add("hidden");
    } else {
      let currentGroup = null;
      headings.forEach((heading, index) => {
        if (!heading.id) {
          const baseId = heading.textContent
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "") || `section-${index + 1}`;
          heading.id = baseId;
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
      const sectionMap = new Map(
        tocLinks.map((link) => [link.dataset.sectionId, link]),
      );
      const updateActiveLink = () => {
        let activeId = "";
        for (const heading of headings) {
          const rect = heading.getBoundingClientRect();
          if (rect.top <= 180) {
            activeId = heading.id;
          } else {
            break;
          }
        }
        tocLinks.forEach((link) => {
          link.classList.toggle("is-active", link.dataset.sectionId === activeId);
        });
      };
      updateActiveLink();
      window.addEventListener("scroll", updateActiveLink, { passive: true });
    }
  }

  const progressBar = document.querySelector("[data-reading-progress]");
  if (progressBar && articleContent) {
    const updateProgress = () => {
      const rect = articleContent.getBoundingClientRect();
      const articleTop = window.scrollY + rect.top;
      const articleHeight = articleContent.offsetHeight - window.innerHeight;
      if (articleHeight <= 0) {
        progressBar.style.width = "0%";
        return;
      }
      const rawProgress = ((window.scrollY - articleTop) / articleHeight) * 100;
      const progress = Math.max(0, Math.min(100, rawProgress));
      progressBar.style.width = `${progress}%`;
    };
    updateProgress();
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);
  }
});

window.switchTab = (event, tabId) => {
  document.querySelectorAll(".tab-button").forEach((button) => {
    button.classList.remove("active");
  });
  document.querySelectorAll(".tab-content").forEach((panel) => {
    panel.classList.remove("active");
  });

  const trigger = event?.currentTarget;
  const target = document.getElementById(tabId);
  trigger?.classList.add("active");
  target?.classList.add("active");
};

window.calculateCost = () => {
  const ids = ["foodQuality", "vetCare", "grooming", "training", "supplies"];
  const total = ids.reduce((sum, id) => {
    const element = document.getElementById(id);
    return sum + Number(element?.value || 0);
  }, 0);

  const result = document.getElementById("result");
  const totalCost = document.getElementById("totalCost");
  const monthlyCost = document.getElementById("monthlyCost");
  if (result && totalCost && monthlyCost) {
    totalCost.textContent = `$${total.toLocaleString()}`;
    monthlyCost.textContent = `$${Math.round(total / 12).toLocaleString()}`;
    result.style.display = "block";
  }
};
