(function dashboardPageEnhancements() {
  const DASHBOARD_PAGE = "dashboard";
  const MOBILE_DETAIL_MEDIA = "(max-width: 720px)";
  const HYDRATED_TARGETS = [
    "dashboardQuickStrip",
    "dashboardStats",
    "dashboardTournament",
    "dashboardGames",
    "dashboardActivity",
    "dashboardSummary",
    "dashboardLeaderboard"
  ];
  const CLICKABLE_SELECTOR = [
    "button",
    "a.btn",
    ".dashboard-wallet-btn",
    ".dashboard-lobby-chip",
    ".nav-link",
    ".quick-entry-card",
    ".game-link-card",
    ".balance-hero-card",
    ".tournament-showcase",
    ".leader-card"
  ].join(", ");
  let clickSound = null;

  function isDashboardPage() {
    return document.body && document.body.dataset.page === DASHBOARD_PAGE;
  }

  function skeletonLine(short = false) {
    return `<span class="dashboard-skeleton-line${short ? " is-short" : ""}"></span>`;
  }

  function setSkeletonMarkup(targetId, markup) {
    const target = document.getElementById(targetId);
    if (!target || target.dataset.dashboardHydrated === "true" || target.innerHTML.trim()) {
      return;
    }
    target.innerHTML = markup;
  }

  function quickCardSkeleton() {
    return `
      <div class="dashboard-skeleton-card">
        <span class="dashboard-skeleton-icon"></span>
        <div class="dashboard-skeleton-copy">
          ${skeletonLine(true)}
          ${skeletonLine()}
        </div>
      </div>
    `;
  }

  function statPanelSkeleton() {
    return `
      <div class="dashboard-skeleton-panel">
        <span class="dashboard-skeleton-pill"></span>
        <span class="dashboard-skeleton-value"></span>
        ${skeletonLine()}
        ${skeletonLine(true)}
        <div class="dashboard-skeleton-tag-row">
          <span class="dashboard-skeleton-tag"></span>
          <span class="dashboard-skeleton-tag"></span>
        </div>
      </div>
    `;
  }

  function sheetRowSkeleton() {
    return `
      <div class="dashboard-skeleton-row">
        <span class="dashboard-skeleton-icon"></span>
        <div class="dashboard-skeleton-copy-stack">
          ${skeletonLine(true)}
          ${skeletonLine()}
        </div>
        <span class="dashboard-skeleton-value"></span>
      </div>
    `;
  }

  function gameCardSkeleton() {
    return `
      <div class="dashboard-skeleton-game">
        <div class="dashboard-skeleton-game-top">
          <span class="dashboard-skeleton-game-icon"></span>
          <span class="dashboard-skeleton-game-pill"></span>
        </div>
        <div class="dashboard-skeleton-copy-stack">
          ${skeletonLine(true)}
          ${skeletonLine(true)}
          ${skeletonLine()}
          ${skeletonLine()}
        </div>
        <div class="dashboard-skeleton-game-foot">
          <span class="dashboard-skeleton-game-pill"></span>
          <span class="dashboard-skeleton-game-pill"></span>
        </div>
      </div>
    `;
  }

  function applyDashboardLoadingState() {
    if (!isDashboardPage()) {
      return;
    }

    document.body.dataset.dashboardLoading = "true";
    setSkeletonMarkup("dashboardQuickStrip", Array.from({ length: 4 }, quickCardSkeleton).join(""));
    setSkeletonMarkup("dashboardStats", Array.from({ length: 3 }, statPanelSkeleton).join(""));
    setSkeletonMarkup("dashboardTournament", `<div class="dashboard-skeleton-sheet">${Array.from({ length: 4 }, sheetRowSkeleton).join("")}</div>`);
    setSkeletonMarkup("dashboardGames", `<div class="dashboard-skeleton-game-grid">${Array.from({ length: 5 }, gameCardSkeleton).join("")}</div>`);
    setSkeletonMarkup("dashboardActivity", `<div class="dashboard-skeleton-sheet">${Array.from({ length: 4 }, sheetRowSkeleton).join("")}</div>`);
    setSkeletonMarkup("dashboardSummary", `
      <div class="dashboard-skeleton-sheet summary">
        ${Array.from({ length: 4 }, () => `
          <div class="dashboard-skeleton-row">
            ${skeletonLine(true)}
            <span class="dashboard-skeleton-value"></span>
          </div>
        `).join("")}
        <span class="dashboard-skeleton-note dashboard-skeleton-line"></span>
      </div>
    `);
    setSkeletonMarkup("dashboardLeaderboard", `<div class="dashboard-skeleton-sheet">${Array.from({ length: 3 }, sheetRowSkeleton).join("")}</div>`);
  }

  function getClickSound() {
    if (!clickSound) {
      clickSound = new Audio("sounds/Click.mp3");
      clickSound.preload = "auto";
      clickSound.volume = 0.28;
    }
    return clickSound;
  }

  function playClickFeedback(event) {
    if (!isDashboardPage()) {
      return;
    }

    const target = event.target.closest(CLICKABLE_SELECTOR);
    if (!target || target.disabled || target.getAttribute("aria-disabled") === "true") {
      return;
    }

    try {
      const audio = getClickSound();
      audio.currentTime = 0;
      const playAttempt = audio.play();
      if (playAttempt && typeof playAttempt.catch === "function") {
        playAttempt.catch(() => {});
      }
    } catch (_error) {
      return;
    }
  }

  function initDashboardDetailSwitch() {
    if (!isDashboardPage()) {
      return;
    }

    const tabs = Array.from(document.querySelectorAll("[data-dashboard-detail-target]"));
    const panels = Array.from(document.querySelectorAll("[data-dashboard-detail-panel]"));
    const sideStack = document.querySelector(".dashboard-side-stack");
    const mediaQuery = typeof window.matchMedia === "function"
      ? window.matchMedia(MOBILE_DETAIL_MEDIA)
      : null;

    if (!tabs.length || !panels.length || !mediaQuery) {
      return;
    }

    const panelLookup = new Map(
      panels.map((panel) => [panel.getAttribute("data-dashboard-detail-panel"), panel])
    );
    let activeTarget = tabs.find((tab) => tab.classList.contains("is-current"))?.getAttribute("data-dashboard-detail-target")
      || tabs[0].getAttribute("data-dashboard-detail-target")
      || "activity";

    const syncDetailView = () => {
      const mobileLayout = mediaQuery.matches;

      tabs.forEach((tab) => {
        const target = tab.getAttribute("data-dashboard-detail-target");
        const current = target === activeTarget;
        tab.classList.toggle("is-current", current);
        tab.setAttribute("aria-pressed", current ? "true" : "false");
      });

      panels.forEach((panel) => {
        const panelName = panel.getAttribute("data-dashboard-detail-panel");
        panel.hidden = mobileLayout && panelName !== activeTarget;
      });

      if (sideStack) {
        sideStack.hidden = mobileLayout && activeTarget === "activity";
      }
    };

    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        const target = tab.getAttribute("data-dashboard-detail-target");
        if (!target || !panelLookup.has(target)) {
          return;
        }

        activeTarget = target;
        syncDetailView();
      });
    });

    const handleViewportChange = () => {
      syncDetailView();
    };

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleViewportChange);
    } else if (typeof mediaQuery.addListener === "function") {
      mediaQuery.addListener(handleViewportChange);
    }

    syncDetailView();
  }

  window.initDashboardPage = function initDashboardPage() {
    if (!isDashboardPage()) {
      return;
    }

    document.body.dataset.dashboardLoading = "false";
    HYDRATED_TARGETS.forEach((targetId) => {
      const node = document.getElementById(targetId);
      if (node) {
        node.dataset.dashboardHydrated = "true";
      }
    });
    document.querySelectorAll("[data-balance]").forEach((node) => {
      node.classList.remove("dashboard-balance-loading");
      node.removeAttribute("aria-busy");
    });
  };

  document.addEventListener("DOMContentLoaded", () => {
    if (!isDashboardPage()) {
      return;
    }
    applyDashboardLoadingState();
    initDashboardDetailSwitch();
    document.addEventListener("click", playClickFeedback, true);
  });
})();
