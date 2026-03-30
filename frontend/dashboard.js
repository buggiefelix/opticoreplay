(function dashboardPageEnhancements() {
  const DASHBOARD_PAGE = "dashboard";
  const HYDRATED_TARGETS = [
    "dashboardGames"
  ];
  const CLICKABLE_SELECTOR = [
    "button",
    "a.btn",
    ".dashboard-wallet-btn",
    ".nav-link",
    ".dashboard-arena-card"
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
    setSkeletonMarkup("dashboardGames", Array.from({ length: 4 }, gameCardSkeleton).join(""));
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
    document.addEventListener("click", playClickFeedback, true);
  });
})();
