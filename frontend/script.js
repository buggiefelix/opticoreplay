const DEFAULT_LOCAL_ORIGIN = "http://127.0.0.1:3000";
const API_BASE = resolveApiBase();
const STORAGE_KEYS = {
  user: "opticore_user",
  match: "opticore_active_match",
  gameState: "opticore_game_state"
};

const GAME_LIBRARY = {
  ludo: {
    key: "ludo",
    name: "Ludo",
    badge: "LU",
    tagline: "Race board pressure",
    rules: [
      "Roll the two center dice and use each live die once.",
      "Any die showing 6 opens a home token onto its colored gate square.",
      "Get every token around the runway and into the center first to win."
    ]
  },
  chess: {
    key: "chess",
    name: "Chess",
    badge: "CH",
    tagline: "Board control",
    rules: [
      "You play White and move first.",
      "Legal moves respect check and promotion.",
      "Castling and en passant are intentionally simplified out."
    ]
  },
  whot: {
    key: "whot",
    name: "Whot",
    badge: "WH",
    tagline: "Card pressure",
    rules: [
      "Play a card that matches value or shape.",
      "Value 2 is pick two and can be countered with another 2.",
      "Value 14 is general market, while 1 and 8 keep your turn.",
      "WHOT 20 lets you request the next shape."
    ]
  },
  ayo: {
    key: "ayo",
    name: "Ayo",
    badge: "AY",
    tagline: "Seed capture strategy",
    rules: [
      "Sow from your lower row only.",
      "Final seeds on the enemy side can trigger captures.",
      "Highest capture total wins when the round closes."
    ]
  },
  tictactoe: {
    key: "tictactoe",
    name: "Tic-Tac-Toe",
    badge: "TT",
    tagline: "Fast warmup rounds",
    rules: [
      "You are X and always move first.",
      "Three in a row wins immediately.",
      "A full board without a line is a draw."
    ]
  },
  connectfour: {
    key: "connectfour",
    name: "Connect Four",
    badge: "C4",
    tagline: "Vertical combo control",
    rules: [
      "Drop discs into any open column.",
      "Four connected discs in any direction wins.",
      "Center control creates more winning lines."
    ]
  },
  reversi: {
    key: "reversi",
    name: "Reversi",
    badge: "RV",
    tagline: "Flip control battle",
    rules: [
      "Place discs to trap and flip enemy discs.",
      "Only legal moves that capture are allowed.",
      "More discs on the board wins when no moves remain."
    ]
  },
  memory: {
    key: "memory",
    name: "Memory Match",
    badge: "MM",
    tagline: "Recall and outscore",
    rules: [
      "Flip two cards and remember every reveal.",
      "A matched pair scores and stays open.",
      "The higher pair count wins when the grid is cleared."
    ]
  }
};

const GAME_THEMES = {
  ludo: {
    primary: "#ffbc4a",
    secondary: "#ff5c55",
    accent: "#6be8ff",
    glow: "rgba(255, 112, 84, 0.34)"
  },
  chess: {
    primary: "#8ab4ff",
    secondary: "#4668e8",
    accent: "#ffe29b",
    glow: "rgba(92, 126, 255, 0.34)"
  },
  whot: {
    primary: "#ff7cad",
    secondary: "#5d78ff",
    accent: "#ffe780",
    glow: "rgba(255, 124, 173, 0.32)"
  },
  ayo: {
    primary: "#d9a15a",
    secondary: "#71451d",
    accent: "#f7dfb2",
    glow: "rgba(201, 145, 88, 0.32)"
  },
  tictactoe: {
    primary: "#74fff0",
    secondary: "#16a8ff",
    accent: "#ffd66f",
    glow: "rgba(92, 236, 255, 0.3)"
  },
  connectfour: {
    primary: "#ffd05b",
    secondary: "#ff6048",
    accent: "#8cf0ff",
    glow: "rgba(255, 125, 84, 0.32)"
  },
  reversi: {
    primary: "#72f3b0",
    secondary: "#127e5f",
    accent: "#f6f2c7",
    glow: "rgba(80, 221, 159, 0.28)"
  },
  memory: {
    primary: "#ffab70",
    secondary: "#ff5f74",
    accent: "#7df4ff",
    glow: "rgba(255, 126, 116, 0.3)"
  }
};

const MONEY_FORMAT = new Intl.NumberFormat("en-NG");
const PRIVATE_MATCH_SYNC_POLL_MS = 900;
const GAME_ENGINES = {};
let activeRuntime = null;
let whotDragState = null;
let whotSuppressClickUntil = 0;
let whotBackgroundAudio = null;
let whotBackgroundPendingUnlock = false;
const WHOT_MUSIC_DEFAULT_VOLUME = 0.18;
const WHOT_MUSIC_STORAGE_KEYS = {
  enabled: "opticore.whotMusic.enabled",
  volume: "opticore.whotMusic.volume"
};
let socialRuntime = {
  snapshotTimer: null,
  threadTimer: null,
  selectedFriend: "",
  mode: "",
  matchId: null
};
const NAV_ITEMS = {
  home: { label: "Home", icon: "home", pack: "home", glow: "#4FD8FF" },
  wallet: { label: "Wallet", icon: "wallet", pack: "wallet", glow: "#FF9A1F" },
  friends: { label: "Friends", icon: "users", pack: "friends", glow: "#36B8FF" },
  tournaments: { label: "Tourneys", icon: "trophy", pack: "tourneys", glow: "#FFBE18" },
  leaderboard: { label: "Leaders", icon: "chart", pack: "leaders", glow: "#5CD3FF" },
  profile: { label: "Profile", icon: "user", pack: "profile", glow: "#B06CFF" }
};

function resolveApiBase() {
  if (typeof window === "undefined" || !window.location) {
    return "/api";
  }

  const configuredBase = normalizeConfiguredApiBase(
    window.OPTICORE_CONFIG && typeof window.OPTICORE_CONFIG === "object"
      ? window.OPTICORE_CONFIG.API_BASE
      : ""
  );
  if (configuredBase) {
    return configuredBase;
  }

  const { protocol, origin, hostname, port } = window.location;
  if (protocol === "file:" || origin === "null") {
    return `${DEFAULT_LOCAL_ORIGIN}/api`;
  }

  const isLocalHost = hostname === "127.0.0.1" || hostname === "localhost";
  if (isLocalHost && port && port !== "3000") {
    return `${DEFAULT_LOCAL_ORIGIN}/api`;
  }

  return `${origin}/api`;
}

function normalizeConfiguredApiBase(value) {
  const trimmed = String(value || "").trim().replace(/\/+$/, "");
  if (!trimmed) {
    return "";
  }

  return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
}

function serverUnavailableMessage() {
  const openedFromFile = typeof window !== "undefined" && window.location && window.location.protocol === "file:";
  if (openedFromFile) {
    return 'Cannot reach the Opticore server. Start it with "start-opticore.bat" or "npm start", then open http://127.0.0.1:3000 instead of the raw HTML file.';
  }

  return 'Cannot reach the Opticore server. Start it with "start-opticore.bat" or "npm start", then refresh http://127.0.0.1:3000.';
}

function setAuthStatus(targetId, message = "", tone = "error") {
  const target = document.getElementById(targetId);
  if (!target) {
    return;
  }

  target.textContent = message;
  target.hidden = !message;
  target.classList.remove("is-error", "is-success");

  if (message && tone) {
    target.classList.add(`is-${tone}`);
  }
}

async function checkAuthServerStatus(targetId) {
  try {
    const response = await fetch(`${API_BASE}/health`, {
      headers: {
        Accept: "application/json"
      }
    });

    if (!response.ok) {
      throw new Error("Server unavailable.");
    }

    setAuthStatus(targetId, "", "");
    return true;
  } catch (_error) {
    setAuthStatus(targetId, serverUnavailableMessage(), "error");
    return false;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initPage().catch((error) => {
    console.error(error);
    alert(error.message || "Something went wrong while loading the app.");
  });
});

window.addEventListener("pointerdown", () => {
  if (shouldRetryWhotBackgroundMusic()) {
    startWhotBackgroundMusic();
  }
}, { passive: true });

window.addEventListener("keydown", () => {
  if (shouldRetryWhotBackgroundMusic()) {
    startWhotBackgroundMusic();
  }
});

window.addEventListener("pagehide", () => {
  stopWhotBackgroundMusic(true);
});

async function initPage() {
  clearSocialRuntime();
  highlightActiveNav();

  const page = document.body.dataset.page || "";
  if (page !== "game") {
    stopWhotBackgroundMusic(true);
  }
  let user = getStoredUser();

  if (document.body.dataset.protected === "true") {
    user = await requireSession();
    enhanceTopbarProfile(user);
  } else if (user) {
    setBalanceEverywhere(user.coins);
  }

  attachOpticoreIconEffects();

  const handlers = {
    landing: initLanding,
    login: initLogin,
    register: initRegister,
    dashboard: initDashboard,
    match: initMatchSetup,
    game: initGamePage,
    wallet: initWallet,
    friends: initFriends,
    leaderboard: initLeaderboard,
    profile: initProfile,
    tournaments: initTournaments,
    admin: initAdmin,
    verify: initVerify
  };

  if (handlers[page]) {
    await handlers[page](user);
  }
}

function getStoredUser() {
  return readStorage(STORAGE_KEYS.user);
}

function setStoredUser(user) {
  writeStorage(STORAGE_KEYS.user, user);
  setBalanceEverywhere(user.coins);
}

function clearStoredUser() {
  localStorage.removeItem(STORAGE_KEYS.user);
}

function getStoredMatch() {
  return readStorage(STORAGE_KEYS.match);
}

function setStoredMatch(match) {
  writeStorage(STORAGE_KEYS.match, match);
}

function clearStoredMatch() {
  localStorage.removeItem(STORAGE_KEYS.match);
}

function getStoredGameState() {
  return readStorage(STORAGE_KEYS.gameState);
}

function setStoredGameState(state) {
  writeStorage(STORAGE_KEYS.gameState, state);
}

function clearStoredGameState() {
  localStorage.removeItem(STORAGE_KEYS.gameState);
}

function readStorage(key) {
  const raw = localStorage.getItem(key);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch (_error) {
    localStorage.removeItem(key);
    return null;
  }
}

function writeStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function isPrivateMatch(match = activeRuntime && activeRuntime.match) {
  return Boolean(match && (match.queueType === "private" || match.mode === "private"));
}

function isPrivateLudoMatch(match = activeRuntime && activeRuntime.match) {
  return Boolean(match && match.game === "ludo" && isPrivateMatch(match));
}

function cloneSerializableValue(value) {
  if (value === undefined) {
    return null;
  }

  if (typeof structuredClone === "function") {
    try {
      return structuredClone(value);
    } catch (_error) {}
  }

  return value === null ? null : JSON.parse(JSON.stringify(value));
}

function normalizePrivateMatchSyncVersion(value) {
  const version = Number(value);
  return Number.isInteger(version) && version >= 0 ? version : 0;
}

function getPrivateLudoSeatId(match = activeRuntime && activeRuntime.match) {
  return match && match.isGuest ? "player2" : "player1";
}

function getPrivateMatchViewerState(match, state) {
  const sourceState = state && typeof state === "object"
    ? state
    : GAME_ENGINES[match.game].createState(match);

  if (match.game === "ludo") {
    const seatMode = normalizeLudoSeatMode(match.ludoSeatMode || sourceState.seatMode || 4);
    return {
      ...cloneLudoState(sourceState),
      seatMode,
      colorOwners: normalizeLudoColorOwners(match.ludoColorOwners || sourceState.colorOwners, seatMode),
      localSeatId: getPrivateLudoSeatId(match),
      botMode: Boolean(sourceState.botMode)
    };
  }

  return cloneSerializableValue(sourceState);
}

function getPrivateMatchSyncState(match, state) {
  if (!state || typeof state !== "object") {
    return null;
  }

  if (match.game === "ludo") {
    const next = cloneLudoState(state);
    delete next.localSeatId;
    return next;
  }

  return cloneSerializableValue(state);
}

function stopPrivateMatchStatePolling(runtime = activeRuntime) {
  if (runtime && runtime.privateSyncPollId) {
    window.clearInterval(runtime.privateSyncPollId);
    runtime.privateSyncPollId = null;
  }
}

function isPrivateMatchStateSyncBlocked(runtime = activeRuntime) {
  return Boolean(
    !runtime ||
    runtime.finished ||
    runtime.animating ||
    (runtime.match && runtime.match.game === "ludo" && isLudoRuntimeBusy(runtime))
  );
}

async function loadPrivateMatchStateSnapshot(matchId, username) {
  return apiRequest(`/private-matches/${encodeURIComponent(matchId)}/state?username=${encodeURIComponent(username)}`);
}

function applyPrivateMatchSnapshot(snapshot, options = {}) {
  if (!activeRuntime || !snapshot) {
    return false;
  }

  if (snapshot.match) {
    activeRuntime.match = snapshot.match;
    setStoredMatch(snapshot.match);
  }

  const version = normalizePrivateMatchSyncVersion(snapshot.version);
  if (!options.force && version <= normalizePrivateMatchSyncVersion(activeRuntime.privateSyncVersion)) {
    return false;
  }

  if (!snapshot.state) {
    activeRuntime.privateSyncVersion = version;
    return false;
  }

  const nextState = getPrivateMatchViewerState(activeRuntime.match, snapshot.state);
  activeRuntime.privateSyncVersion = version;
  activeRuntime.privateSyncUpdatedAt = snapshot.updatedAt || "";
  activeRuntime.privateSyncUpdatedBy = snapshot.updatedBy || "";
  activeRuntime.state = nextState;
  setStoredGameState(nextState);

  if (options.render !== false) {
    renderActiveGame();
  }

  if (activeRuntime.match.game === "ludo" && nextState.winner && !activeRuntime.finished) {
    closeLudo(nextState);
  }

  return true;
}

async function pollPrivateMatchStateOnce() {
  if (!activeRuntime || !isPrivateLudoMatch() || activeRuntime.privateSyncPullBusy || activeRuntime.finished) {
    return;
  }

  if (isPrivateMatchStateSyncBlocked(activeRuntime)) {
    return;
  }

  const runtimeId = activeRuntime.match.id;
  activeRuntime.privateSyncPullBusy = true;

  try {
    const snapshot = await loadPrivateMatchStateSnapshot(runtimeId, activeRuntime.user.username);
    if (!activeRuntime || activeRuntime.match.id !== runtimeId || activeRuntime.finished) {
      return;
    }
    applyPrivateMatchSnapshot(snapshot);
  } catch (error) {
    console.error("Private match polling failed:", error);
  } finally {
    if (activeRuntime && activeRuntime.match.id === runtimeId) {
      activeRuntime.privateSyncPullBusy = false;
    }
  }
}

function startPrivateMatchStatePolling() {
  if (!activeRuntime || !isPrivateLudoMatch()) {
    return;
  }

  stopPrivateMatchStatePolling(activeRuntime);
  const runtimeId = activeRuntime.match.id;
  activeRuntime.privateSyncPollId = window.setInterval(() => {
    if (!activeRuntime || activeRuntime.match.id !== runtimeId || activeRuntime.finished) {
      stopPrivateMatchStatePolling();
      return;
    }
    pollPrivateMatchStateOnce();
  }, PRIVATE_MATCH_SYNC_POLL_MS);
}

function queuePrivateMatchStateSync(nextState) {
  if (!activeRuntime || !isPrivateLudoMatch() || activeRuntime.finished) {
    return;
  }

  activeRuntime.privateSyncPendingState = getPrivateMatchSyncState(activeRuntime.match, nextState);
  flushPrivateMatchStateSyncQueue();
}

async function flushPrivateMatchStateSyncQueue() {
  if (!activeRuntime || !isPrivateLudoMatch() || activeRuntime.privateSyncPushBusy || !activeRuntime.privateSyncPendingState || activeRuntime.finished) {
    return;
  }

  const runtimeId = activeRuntime.match.id;
  activeRuntime.privateSyncPushBusy = true;

  while (activeRuntime && activeRuntime.match.id === runtimeId && activeRuntime.privateSyncPendingState && !activeRuntime.finished) {
    const stateToSend = activeRuntime.privateSyncPendingState;
    activeRuntime.privateSyncPendingState = null;

    try {
      const snapshot = await apiRequest(`/private-matches/${encodeURIComponent(runtimeId)}/state`, {
        method: "POST",
        body: {
          username: activeRuntime.user.username,
          baseVersion: normalizePrivateMatchSyncVersion(activeRuntime.privateSyncVersion),
          state: stateToSend
        }
      });

      if (!activeRuntime || activeRuntime.match.id !== runtimeId || activeRuntime.finished) {
        return;
      }

      applyPrivateMatchSnapshot(snapshot, { force: true });
    } catch (error) {
      if (!activeRuntime || activeRuntime.match.id !== runtimeId) {
        return;
      }

      if (error.status === 409 && error.data) {
        applyPrivateMatchSnapshot(error.data, { force: true });
      } else {
        console.error("Private match sync failed:", error);
        activeRuntime.privateSyncPendingState = stateToSend;
        window.setTimeout(() => {
          if (activeRuntime && activeRuntime.match.id === runtimeId) {
            flushPrivateMatchStateSyncQueue();
          }
        }, 1200);
      }
      break;
    }
  }

  if (activeRuntime && activeRuntime.match.id === runtimeId) {
    activeRuntime.privateSyncPushBusy = false;
  }
}

function money(value) {
  const amount = Number(value || 0);
  const sign = amount < 0 ? "-" : "";
  return `${sign}N${MONEY_FORMAT.format(Math.abs(Math.round(amount)))}`;
}

function signedMoney(value) {
  const amount = Number(value || 0);
  return amount > 0 ? `+${money(amount)}` : money(amount);
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (character) => {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;"
    }[character];
  });
}

function queryParam(key) {
  return new URLSearchParams(window.location.search).get(key);
}

function gameData(gameKey) {
  return GAME_LIBRARY[gameKey] || GAME_LIBRARY.ludo;
}

function gameTheme(gameKey) {
  return GAME_THEMES[gameKey] || GAME_THEMES.ludo;
}

function gameThemeStyle(gameKey) {
  const theme = gameTheme(gameKey);
  return `--card-primary:${theme.primary};--card-secondary:${theme.secondary};--card-accent:${theme.accent};--card-glow:${theme.glow};`;
}

function applyGameTheme(gameKey) {
  const theme = gameTheme(gameKey);
  document.body.dataset.gameTheme = gameKey;
  document.body.style.setProperty("--game-primary", theme.primary);
  document.body.style.setProperty("--game-secondary", theme.secondary);
  document.body.style.setProperty("--game-accent", theme.accent);
  document.body.style.setProperty("--game-glow", theme.glow);
}

function gameIconMarkup(gameKey) {
  switch (gameKey) {
    case "ludo":
      return `
        <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
          <rect x="10" y="10" width="44" height="44" rx="18" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.32)" stroke-width="1.5"></rect>
          <circle cx="22" cy="22" r="8" fill="#ff6d6d"></circle>
          <circle cx="42" cy="22" r="8" fill="#ffd65a"></circle>
          <circle cx="22" cy="42" r="8" fill="#59df86"></circle>
          <circle cx="42" cy="42" r="8" fill="#63aeff"></circle>
          <path d="M32 14v36M14 32h36" stroke="rgba(255,255,255,0.84)" stroke-width="4" stroke-linecap="round"></path>
          <circle cx="32" cy="32" r="5" fill="#ffffff"></circle>
        </svg>
      `;
    case "chess":
      return `
        <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
          <path d="M24 52h16l-1.5-7H25.5L24 52Zm3-11h10l2-7-4-4 3-6-4-4-2 3-2-3-4 4 3 6-4 4 2 7Z" fill="#ffffff"></path>
          <path d="M21 54h22" stroke="rgba(255,255,255,0.74)" stroke-width="4" stroke-linecap="round"></path>
          <circle cx="32" cy="16" r="4" fill="#ffe3a6"></circle>
        </svg>
      `;
    case "whot":
      return `
        <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
          <rect x="14" y="14" width="24" height="34" rx="6" fill="rgba(255,255,255,0.26)" stroke="rgba(255,255,255,0.65)" stroke-width="2" transform="rotate(-8 26 31)"></rect>
          <rect x="26" y="16" width="24" height="34" rx="6" fill="#ffffff" stroke="rgba(255,255,255,0.78)" stroke-width="2" transform="rotate(8 38 33)"></rect>
          <circle cx="38" cy="32" r="6" fill="#ff7cad"></circle>
          <path d="M18 32h8" stroke="#63e2ff" stroke-width="4" stroke-linecap="round"></path>
        </svg>
      `;
    case "ayo":
      return `
        <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
          <rect x="8" y="18" width="48" height="28" rx="14" fill="rgba(255,255,255,0.18)" stroke="rgba(255,255,255,0.45)" stroke-width="2"></rect>
          <path d="M32 18v28" stroke="rgba(255,255,255,0.45)" stroke-width="2"></path>
          <circle cx="18" cy="32" r="4" fill="#ffd07a"></circle>
          <circle cx="26" cy="32" r="4" fill="#ffd07a"></circle>
          <circle cx="38" cy="32" r="4" fill="#ffd07a"></circle>
          <circle cx="46" cy="32" r="4" fill="#ffd07a"></circle>
        </svg>
      `;
    case "tictactoe":
      return `
        <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
          <rect x="12" y="12" width="40" height="40" rx="12" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.35)" stroke-width="2"></rect>
          <path d="M25 16v32M39 16v32M16 25h32M16 39h32" stroke="rgba(255,255,255,0.28)" stroke-width="2"></path>
          <path d="M20 20l10 10M30 20L20 30" stroke="#63e2ff" stroke-width="4" stroke-linecap="round"></path>
          <circle cx="42" cy="42" r="6" fill="none" stroke="#ffd55b" stroke-width="4"></circle>
        </svg>
      `;
    case "connectfour":
      return `
        <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
          <rect x="12" y="12" width="40" height="40" rx="12" fill="rgba(255,255,255,0.14)" stroke="rgba(255,255,255,0.32)" stroke-width="2"></rect>
          <circle cx="24" cy="24" r="5" fill="#ffd05b"></circle>
          <circle cx="40" cy="24" r="5" fill="#ff6950"></circle>
          <circle cx="24" cy="40" r="5" fill="#ff6950"></circle>
          <circle cx="40" cy="40" r="5" fill="#ffd05b"></circle>
          <path d="M20 16v32M32 16v32M44 16v32M16 32h32" stroke="rgba(255,255,255,0.24)" stroke-width="2"></path>
        </svg>
      `;
    case "reversi":
      return `
        <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
          <rect x="12" y="12" width="40" height="40" rx="12" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.3)" stroke-width="2"></rect>
          <circle cx="26" cy="26" r="9" fill="#101722" stroke="rgba(255,255,255,0.22)" stroke-width="2"></circle>
          <circle cx="38" cy="38" r="9" fill="#f3f6ff" stroke="rgba(16,23,34,0.2)" stroke-width="2"></circle>
          <path d="M20 20l24 24" stroke="rgba(255,255,255,0.18)" stroke-width="2"></path>
        </svg>
      `;
    case "memory":
      return `
        <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
          <rect x="14" y="14" width="18" height="28" rx="6" fill="rgba(255,255,255,0.24)" stroke="rgba(255,255,255,0.56)" stroke-width="2" transform="rotate(-8 23 28)"></rect>
          <rect x="32" y="18" width="18" height="28" rx="6" fill="#ffffff" stroke="rgba(255,255,255,0.78)" stroke-width="2" transform="rotate(8 41 32)"></rect>
          <path d="M20 28h6M23 25v6" stroke="#7df4ff" stroke-width="3" stroke-linecap="round"></path>
          <circle cx="41" cy="32" r="4" fill="#ff8f6c"></circle>
        </svg>
      `;
    default:
      return `
        <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
          <circle cx="32" cy="32" r="20" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.4)" stroke-width="2"></circle>
          <path d="M24 32h16M32 24v16" stroke="#ffffff" stroke-width="4" stroke-linecap="round"></path>
        </svg>
      `;
  }
}

function gameIconAsset(gameKey) {
  const iconMap = {
    ludo: "ludo.png",
    chess: "chess.png",
    whot: "whot-custom.svg",
    ayo: "ayo.png",
    tictactoe: "tic-tac-toe.png",
    connectfour: "connect-four.png",
    reversi: "reversi.png",
    memory: "memory-match.png"
  };
  const iconKey = String(gameKey || "").toLowerCase();
  return `assets/icons/games/${iconMap[iconKey] || "ludo.png"}`;
}

function gameIconFrame(gameKey) {
  return `
    <span class="game-badge-icon" aria-hidden="true">
      <img class="game-asset-icon" src="${escapeHtml(gameIconAsset(gameKey))}" alt="" loading="lazy" decoding="async">
    </span>
  `;
}

function setGameBadge(targetId, gameKey, label = gameData(gameKey).badge) {
  const target = document.getElementById(targetId);
  if (!target) {
    return;
  }

  target.innerHTML = `${gameIconFrame(gameKey)}<span class="game-badge-label">${escapeHtml(label)}</span>`;
  target.setAttribute("aria-label", `${gameData(gameKey).name} badge`);
}

function appIconMarkup(iconKey) {
  switch (iconKey) {
    case "home":
      return `
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.8a1 1 0 0 1-1-1v-4h-2.4v4a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-9.5Z" fill="currentColor"></path>
        </svg>
      `;
    case "wallet":
      return `
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M5 7.5A2.5 2.5 0 0 1 7.5 5H18a2 2 0 0 1 2 2v1h-7a3 3 0 0 0 0 6h7v1a2 2 0 0 1-2 2H7.5A2.5 2.5 0 0 1 5 14.5v-7Z" fill="currentColor"></path>
          <path d="M14 10h6v4h-6a2 2 0 1 1 0-4Z" fill="none" stroke="currentColor" stroke-width="1.8"></path>
          <circle cx="16.6" cy="12" r="1" fill="currentColor"></circle>
        </svg>
      `;
    case "trophy":
      return `
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M8 4h8v2a4 4 0 0 0 3 3.9V11a5 5 0 0 1-4 4.9V18h2a1 1 0 1 1 0 2H7a1 1 0 1 1 0-2h2v-2.1A5 5 0 0 1 5 11V9.9A4 4 0 0 0 8 6V4Z" fill="currentColor"></path>
          <path d="M5 6H3a3 3 0 0 0 3 3M19 6h2a3 3 0 0 1-3 3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>
        </svg>
      `;
    case "chart":
      return `
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M5 19h14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>
          <rect x="6" y="10" width="3" height="7" rx="1.2" fill="currentColor"></rect>
          <rect x="10.5" y="7" width="3" height="10" rx="1.2" fill="currentColor"></rect>
          <rect x="15" y="4" width="3" height="13" rx="1.2" fill="currentColor"></rect>
        </svg>
      `;
    case "user":
      return `
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <circle cx="12" cy="8" r="4" fill="currentColor"></circle>
          <path d="M5 19a7 7 0 0 1 14 0" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>
        </svg>
      `;
    case "users":
      return `
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <circle cx="9" cy="9" r="3.2" fill="currentColor"></circle>
          <circle cx="16.5" cy="10.5" r="2.5" fill="currentColor" opacity="0.72"></circle>
          <path d="M4.5 19a5 5 0 0 1 9 0" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>
          <path d="M13.5 18.2a4.1 4.1 0 0 1 6 0" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" opacity="0.72"></path>
        </svg>
      `;
    case "chat":
      return `
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M6 6h12a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H11l-4.5 3v-3H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"></path>
          <circle cx="9" cy="11.5" r="1" fill="currentColor"></circle>
          <circle cx="12" cy="11.5" r="1" fill="currentColor"></circle>
          <circle cx="15" cy="11.5" r="1" fill="currentColor"></circle>
        </svg>
      `;
    case "deposit":
      return `
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M12 4v11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>
          <path d="m8.5 8 3.5-4 3.5 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path>
          <rect x="4" y="14" width="16" height="6" rx="2" fill="currentColor" opacity="0.85"></rect>
        </svg>
      `;
    case "withdraw":
      return `
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M12 4v11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>
          <path d="m8.5 11 3.5 4 3.5-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path>
          <rect x="4" y="14" width="16" height="6" rx="2" fill="currentColor" opacity="0.85"></rect>
        </svg>
      `;
    case "spark":
      return `
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="m13 3-1.8 5.1L6 10l5.2 1.8L13 17l1.8-5.2L20 10l-5.2-1.9L13 3Z" fill="currentColor"></path>
        </svg>
      `;
    default:
      return `
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <circle cx="12" cy="12" r="7" fill="currentColor"></circle>
        </svg>
      `;
  }
}

function appIconFrame(iconKey, className = "ui-icon-shell") {
  return `<span class="${escapeHtml(className)}" aria-hidden="true">${appIconMarkup(iconKey)}</span>`;
}

function gameIconBubble(gameKey, className = "ui-icon-shell is-game") {
  return `
    <span class="${escapeHtml(className)}" style="${gameThemeStyle(gameKey)}" aria-hidden="true">
      <img class="game-asset-icon" src="${escapeHtml(gameIconAsset(gameKey))}" alt="" loading="lazy" decoding="async">
    </span>
  `;
}

function opticorePackAsset(navKey, state = "default") {
  const navItem = NAV_ITEMS[navKey];
  if (!navItem || !navItem.pack) {
    return "";
  }

  return `assets/icons/opticore/${navItem.pack}-${state}.svg`;
}

function opticorePackIconMarkup(navKey, className = "opticore-state-icon") {
  const navItem = NAV_ITEMS[navKey];
  if (!navItem || !navItem.pack) {
    return appIconFrame(navItem ? navItem.icon : "spark", className);
  }

  return `
    <span class="${escapeHtml(className)}" aria-hidden="true">
      <img class="state-icon is-default" src="${escapeHtml(opticorePackAsset(navKey, "default"))}" alt="">
      <img class="state-icon is-active" src="${escapeHtml(opticorePackAsset(navKey, "active"))}" alt="">
    </span>
  `;
}

function capitalize(value) {
  const text = String(value || "");
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "";
}

function initials(value) {
  return String(value || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "OP";
}

function formatDateTime(value) {
  const stamp = new Date(value);
  if (Number.isNaN(stamp.getTime())) {
    return "";
  }

  return stamp.toLocaleString("en-NG", {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function amountTone(amount) {
  if (amount > 0) {
    return "positive";
  }
  if (amount < 0) {
    return "negative";
  }
  return "neutral";
}

function resultTone(result) {
  if (result === "win") {
    return "positive";
  }
  if (result === "loss" || result === "forfeit") {
    return "negative";
  }
  return "neutral";
}

function transactionMeta(type) {
  const normalized = String(type || "").toLowerCase();

  if (normalized.includes("deposit")) {
    return { label: "Deposit", icon: "deposit" };
  }
  if (normalized.includes("withdraw")) {
    return { label: "Withdrawal", icon: "withdraw" };
  }
  if (normalized.includes("tournament")) {
    return { label: "Tournament", icon: "trophy" };
  }
  if (normalized.includes("payout") || normalized.includes("win")) {
    return { label: "Payout", icon: "spark" };
  }
  if (normalized.includes("match")) {
    return { label: "Match", icon: "spark" };
  }

  return {
    label: capitalize(normalized.replace(/_/g, " ")) || "Wallet",
    icon: "wallet"
  };
}

function clearSocialRuntime() {
  if (socialRuntime.snapshotTimer) {
    window.clearInterval(socialRuntime.snapshotTimer);
  }
  if (socialRuntime.threadTimer) {
    window.clearInterval(socialRuntime.threadTimer);
  }

  socialRuntime = {
    snapshotTimer: null,
    threadTimer: null,
    selectedFriend: "",
    mode: "",
    matchId: null
  };
}

window.addEventListener("beforeunload", clearSocialRuntime);

async function fetchSocialSnapshot(username) {
  return apiRequest(`/social/${encodeURIComponent(username)}`);
}

async function sendFriendRequestAction(username, targetUsername) {
  return apiRequest("/friends/request", {
    method: "POST",
    body: {
      username,
      targetUsername
    }
  });
}

async function respondFriendRequestAction(username, requestId, action) {
  return apiRequest("/friends/respond", {
    method: "POST",
    body: {
      username,
      requestId,
      action
    }
  });
}

async function fetchChatThread(username, friendUsername) {
  const params = new URLSearchParams({
    username,
    friend: friendUsername
  });
  return apiRequest(`/chat/thread?${params.toString()}`);
}

async function sendChatMessageAction(username, friendUsername, body, matchId = null) {
  return apiRequest("/chat/send", {
    method: "POST",
    body: {
      username,
      friendUsername,
      body,
      matchId
    }
  });
}

async function fetchSocialFeed(username) {
  return apiRequest(`/feed/${encodeURIComponent(username)}`);
}

async function createFeedPostAction(username, body) {
  return apiRequest("/feed/post", {
    method: "POST",
    body: {
      username,
      body
    }
  });
}

function socialPresenceCopy(friend) {
  return friend.activeMatch
    ? `${capitalize(gameData(friend.activeGame).name)} match live`
    : "Ready to connect";
}

function socialMessagePreview(message) {
  if (!message) {
    return "No messages yet.";
  }

  const prefix = message.matchId ? "Live match" : capitalize(message.sender);
  return `${prefix}: ${message.body}`;
}

function keepChatScrolled(targetId) {
  const target = document.getElementById(targetId);
  if (!target) {
    return;
  }

  target.scrollTop = target.scrollHeight;
}

function enhanceNavLinks() {
  document.querySelectorAll("[data-nav-link]").forEach((link) => {
    const navKey = link.dataset.navLink;
    const navItem = NAV_ITEMS[navKey];
    if (!navItem || link.dataset.enhanced === "true") {
      return;
    }

    if (navItem.glow) {
      link.style.setProperty("--nav-glow", navItem.glow);
    }

    link.setAttribute("aria-label", navItem.label);
    link.setAttribute("title", navItem.label);
    link.innerHTML = `<span class="nav-icon">${opticorePackIconMarkup(navKey)}</span>`;
    link.dataset.enhanced = "true";
  });
}

function highlightActiveNav() {
  enhanceNavLinks();

  const nav = document.body.dataset.nav;
  if (!nav) {
    return;
  }

  document.querySelectorAll("[data-nav-link]").forEach((link) => {
    if (link.dataset.navLink === nav) {
      link.classList.add("active");
    }
  });
}

function enhanceTopbarProfile(user) {
  const actions = document.querySelector(".topbar-actions");
  if (!actions || !user || actions.querySelector("[data-topbar-profile]")) {
    return;
  }

  const bottomNavProfileLinks = Array.from(document.querySelectorAll('.nav-bar [data-nav-link="profile"]'));
  const shouldKeepProfileInBottomNav = typeof window !== "undefined"
    && window.matchMedia("(max-width: 720px)").matches
    && bottomNavProfileLinks.length > 0;

  if (shouldKeepProfileInBottomNav) {
    return;
  }

  const profileLink = document.createElement("a");
  const currentPage = document.body.dataset.page || "";
  profileLink.href = "profile.html";
  profileLink.className = `topbar-profile-link${currentPage === "profile" ? " is-current" : ""}`;
  profileLink.dataset.topbarProfile = "true";
  profileLink.style.setProperty("--nav-glow", NAV_ITEMS.profile.glow);
  profileLink.setAttribute("aria-label", `Open ${user.username} profile`);
  profileLink.setAttribute("title", "Profile");
  if (currentPage === "profile") {
    profileLink.setAttribute("aria-current", "page");
  }

  profileLink.innerHTML = opticorePackIconMarkup("profile", "opticore-state-icon topbar-profile-icon");

  const balancePill = actions.querySelector(".info-pill");
  if (balancePill && balancePill.nextSibling) {
    actions.insertBefore(profileLink, balancePill.nextSibling);
  } else {
    actions.appendChild(profileLink);
  }

  bottomNavProfileLinks.forEach((link) => {
    link.remove();
  });
}

function createOpticoreRipple(host, left, top) {
  if (!host) {
    return;
  }

  const ripple = document.createElement("span");
  const rect = host.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height) * 1.4;
  ripple.className = "opticore-ripple";
  ripple.style.width = `${size}px`;
  ripple.style.height = `${size}px`;
  ripple.style.left = `${left}px`;
  ripple.style.top = `${top}px`;
  host.appendChild(ripple);
  ripple.addEventListener("animationend", () => ripple.remove());
}

function attachOpticoreIconEffects() {
  const targets = [
    ...document.querySelectorAll(".nav-bar .nav-link"),
    ...document.querySelectorAll("[data-topbar-profile]")
  ];

  targets.forEach((target) => {
    if (target.dataset.opticoreFxBound === "true") {
      return;
    }

    target.dataset.opticoreFxBound = "true";
    target.addEventListener("pointerdown", (event) => {
      if (event.button !== undefined && event.button !== 0) {
        return;
      }

      const host = target.querySelector(".nav-icon") || target;
      const rect = host.getBoundingClientRect();
      createOpticoreRipple(host, event.clientX - rect.left, event.clientY - rect.top);
    });

    target.addEventListener("click", (event) => {
      if (
        !target.matches("[data-nav-link]") ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        event.button !== 0
      ) {
        return;
      }

      document.querySelectorAll(".nav-bar .nav-link").forEach((link) => link.classList.remove("active"));
      target.classList.add("active");
    });
  });
}

function setBalanceEverywhere(amount) {
  document.querySelectorAll("[data-balance]").forEach((node) => {
    node.textContent = money(amount);
    node.classList.remove("dashboard-balance-loading");
    node.removeAttribute("aria-busy");
  });
}

function setPageTitle(id, text) {
  const node = document.getElementById(id);
  if (node) {
    node.textContent = text;
  }
}

function renderDashboardHeadline(user) {
  const node = document.getElementById("dashboardWelcome");
  if (!node) {
    return;
  }

  const username = escapeHtml(user && user.username ? user.username : "Player");
  node.innerHTML = `<span class="dashboard-headline-user">${username}</span>, <span class="dashboard-headline-accent">Ready</span><br>for the next<br>win?`;
}

function renderInfoList(targetId, items, emptyMessage) {
  const target = document.getElementById(targetId);
  if (!target) {
    return;
  }

  if (!items || !items.length) {
    target.innerHTML = `<div class="empty-state">${escapeHtml(emptyMessage)}</div>`;
    return;
  }

  target.innerHTML = items
    .map((item) => {
      return `
        <div class="mini-panel">
          ${item.label ? `<small>${escapeHtml(item.label)}</small>` : ""}
          ${item.value ? `<strong>${escapeHtml(item.value)}</strong>` : ""}
          ${item.copy ? `<p class="panel-copy">${escapeHtml(item.copy)}</p>` : ""}
        </div>
      `;
    })
    .join("");
}

async function apiRequest(path, options = {}) {
  const config = {
    method: options.method || "GET",
    headers: {
      Accept: "application/json",
      ...(options.headers || {})
    }
  };

  if (options.body !== undefined) {
    config.headers["Content-Type"] = "application/json";
    config.body = JSON.stringify(options.body);
  }

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, config);
  } catch (_error) {
    throw new Error(serverUnavailableMessage());
  }

  let data = null;

  try {
    data = await response.json();
  } catch (_error) {
    data = null;
  }

  if (!response.ok || (data && data.error)) {
    const error = new Error((data && data.error) || "Request failed.");
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

async function requireSession() {
  const stored = getStoredUser();
  if (!stored || !stored.username) {
    window.location.href = "login.html";
    throw new Error("Session required.");
  }

  try {
    const user = await apiRequest(`/me/${encodeURIComponent(stored.username)}`);
    setStoredUser(user);
    return user;
  } catch (_error) {
    clearStoredUser();
    clearStoredMatch();
    clearStoredGameState();
    window.location.href = "login.html";
    throw new Error("Please login again.");
  }
}

function joinTournamentAction(user, tournamentId) {
  return apiRequest("/tournaments/join", {
    method: "POST",
    body: {
      username: user.username,
      tournamentId
    }
  }).then((payload) => {
    setStoredUser(payload.user);
    return payload;
  });
}

function logout() {
  clearStoredUser();
  clearStoredMatch();
  clearStoredGameState();
  window.location.href = "login.html";
}

async function initLanding() {
  renderLandingHeroStats();
  renderLandingPreviewGames();
  renderLandingTournamentCard();
  renderLandingQuickPicks();
  renderDashboardGames("landingGameGrid");
  renderLandingFeatureGrid();
  return;
}

async function initLogin(user) {
  if (user && user.username) {
    window.location.href = "dashboard.html";
    return;
  }

  const form = document.getElementById("loginForm");
  if (!form) {
    return;
  }

  await checkAuthServerStatus("loginStatus");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const submitButton = form.querySelector('button[type="submit"]');
    const serverAvailable = await checkAuthServerStatus("loginStatus");

    if (!serverAvailable) {
      return;
    }

    if (submitButton) {
      submitButton.disabled = true;
    }

    try {
      const account = await apiRequest("/login", {
        method: "POST",
        body: {
          username: formData.get("username"),
          password: formData.get("password")
        }
      });

      setAuthStatus("loginStatus", "");
      setStoredUser(account);
      window.location.href = "dashboard.html";
    } catch (error) {
      setAuthStatus("loginStatus", error.message, "error");
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
      }
    }
  });
}

async function initRegister(user) {
  if (user && user.username) {
    window.location.href = "dashboard.html";
    return;
  }

  const form = document.getElementById("registerForm");
  if (!form) {
    return;
  }

  await checkAuthServerStatus("registerStatus");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const submitButton = form.querySelector('button[type="submit"]');
    const serverAvailable = await checkAuthServerStatus("registerStatus");

    if (!serverAvailable) {
      return;
    }

    if (submitButton) {
      submitButton.disabled = true;
    }

    try {
      const account = await apiRequest("/register", {
        method: "POST",
        body: {
          username: formData.get("username"),
          email: formData.get("email"),
          password: formData.get("password")
        }
      });

      setAuthStatus("registerStatus", "");
      setStoredUser(account);
      window.location.href = "dashboard.html";
    } catch (error) {
      setAuthStatus("registerStatus", error.message, "error");
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
      }
    }
  });
}

function renderDashboardGames(targetId) {
  const target = document.getElementById(targetId);
  if (!target) {
    return;
  }

  target.innerHTML = Object.values(GAME_LIBRARY)
    .map((game) => {
      return `
        <a class="game-link-card" data-game-key="${escapeHtml(game.key)}" style="${gameThemeStyle(game.key)}" href="match.html?game=${encodeURIComponent(game.key)}">
          <div class="game-card-top">
            <div class="game-badge">${gameIconFrame(game.key)}</div>
            <span class="game-signal">Live arena</span>
          </div>
          <div class="game-meta">
            <div class="game-meta-head">
              <h3>${escapeHtml(game.name)}</h3>
              <span class="game-meta-code">${escapeHtml(game.badge)}</span>
            </div>
            <p>${escapeHtml(game.tagline)}</p>
            <div class="game-card-note">${escapeHtml(game.rules[0])}</div>
          </div>
          <div class="game-card-footer">
            <span class="game-tag">Ranked + Practice</span>
            <span class="game-arrow">Enter Arena</span>
          </div>
        </a>
      `;
    })
    .join("");
}

function renderLandingHeroStats() {
  const target = document.getElementById("landingHeroStats");
  if (!target) {
    return;
  }

  const stats = [
    {
      label: "Skill games",
      value: `${Object.keys(GAME_LIBRARY).length} arenas`,
      copy: "Fast rounds, board control, memory pressure, and deeper tactical tables."
    },
    {
      label: "Match modes",
      value: "Ranked + Practice",
      copy: "Warm up for free or stake into wallet-backed competition."
    },
    {
      label: "Wallet loop",
      value: "Deposit to payout",
      copy: "Entries, wins, withdrawals, and history stay connected."
    },
    {
      label: "Competitive edge",
      value: "Tournaments live",
      copy: "Bracket pressure and leaderboard movement from the same control center."
    }
  ];

  target.innerHTML = stats
    .map((item) => {
      return `
        <div class="stat-card landing-stat-card">
          <small>${escapeHtml(item.label)}</small>
          <strong>${escapeHtml(item.value)}</strong>
          <p class="panel-copy">${escapeHtml(item.copy)}</p>
        </div>
      `;
    })
    .join("");
}

function renderLandingPreviewGames() {
  const target = document.getElementById("landingPreviewGames");
  if (!target) {
    return;
  }

  target.innerHTML = Object.values(GAME_LIBRARY)
    .slice(0, 4)
    .map((game) => {
      return `
        <a class="landing-preview-card theme-surface" style="${gameThemeStyle(game.key)}" href="match.html?game=${encodeURIComponent(game.key)}">
          ${gameIconBubble(game.key, "landing-preview-icon is-game")}
          <div class="landing-preview-copy">
            <strong>${escapeHtml(game.name)}</strong>
            <span>${escapeHtml(game.tagline)}</span>
          </div>
          <span class="game-meta-code">${escapeHtml(game.badge)}</span>
        </a>
      `;
    })
    .join("");
}

function renderLandingTournamentCard() {
  const target = document.getElementById("landingTournamentCard");
  if (!target) {
    return;
  }

  target.innerHTML = `
    <div class="landing-float-card theme-surface" style="${gameThemeStyle("ludo")}">
      <div class="landing-float-head">
        ${gameIconBubble("ludo", "tournament-icon is-game")}
        <div>
          <small>Featured bracket</small>
          <strong>Daily Ludo Rush</strong>
        </div>
      </div>
      <p class="panel-copy">Fast-entry bracket with leaderboard lift and wallet-backed prize pressure.</p>
      <div class="landing-float-kpis">
        <div class="spot-pill">
          <small>Entry</small>
          <strong>${money(500)}</strong>
        </div>
        <div class="spot-pill">
          <small>Prize</small>
          <strong>${money(10000)}</strong>
        </div>
      </div>
      <div class="row-between">
        <span class="status-chip">24 / 32 players</span>
        <a class="btn btn-primary" href="register.html">Join In</a>
      </div>
    </div>
  `;
}

function renderLandingQuickPicks() {
  const target = document.getElementById("landingQuickPicks");
  if (!target) {
    return;
  }

  const items = [
    {
      icon: "wallet",
      title: "Wallet center",
      copy: "Deposit, withdraw, and follow every entry fee and reward.",
      href: "wallet.html"
    },
    {
      icon: "trophy",
      title: "Tournament hub",
      copy: "Jump into featured brackets without losing the premium app feel.",
      href: "tournaments.html"
    },
    {
      icon: "chart",
      title: "Leaderboard",
      copy: "See top balances, win counts, and competitive momentum at a glance.",
      href: "leaderboard.html"
    },
    {
      icon: "user",
      title: "Player profile",
      copy: "Track win rate, history, favorite games, and your next move.",
      href: "profile.html"
    }
  ];

  target.innerHTML = items
    .map((item) => {
      return `
        <a class="landing-quick-card" href="${escapeHtml(item.href)}">
          ${appIconFrame(item.icon, "quick-entry-icon")}
          <div class="landing-quick-copy">
            <strong>${escapeHtml(item.title)}</strong>
            <span>${escapeHtml(item.copy)}</span>
          </div>
        </a>
      `;
    })
    .join("");
}

function renderLandingFeatureGrid() {
  const target = document.getElementById("landingFeatureGrid");
  if (!target) {
    return;
  }

  const features = [
    {
      icon: "deposit",
      label: "Wallet and history",
      title: "Track every deposit, entry fee, win, and withdrawal request in one place.",
      copy: "The money flow feels like part of the game product instead of a separate tool."
    },
    {
      icon: "spark",
      label: "Ranked and practice",
      title: "Switch between zero-risk warmups and competitive rounds with real stakes.",
      copy: "Practice keeps players sharp while ranked play keeps the product exciting."
    },
    {
      icon: "trophy",
      label: "Tournaments and prestige",
      title: "Move from game lobby to tournament spotlight to leaderboard without friction.",
      copy: "The full journey now reads like one premium gaming ecosystem."
    }
  ];

  target.innerHTML = features
    .map((item) => {
      return `
        <div class="feature-card panel landing-feature-card">
          ${appIconFrame(item.icon, "landing-feature-icon")}
          <small>${escapeHtml(item.label)}</small>
          <h3 class="panel-title">${escapeHtml(item.title)}</h3>
          <p class="panel-copy">${escapeHtml(item.copy)}</p>
        </div>
      `;
    })
    .join("");
}

function renderDashboardHeroStats(user, activeSessions) {
  const target = document.getElementById("dashboardStats");
  if (!target) {
    return;
  }

  const favoriteKey = user.favoriteGame || "ludo";
  const favoriteGame = gameData(favoriteKey);
  target.classList.add("dashboard-hero-stats");
  target.innerHTML = `
    <a class="balance-hero-card" href="wallet.html">
      <div class="balance-hero-copy">
        <span class="eyebrow">Playable balance</span>
        <strong>${money(user.coins)}</strong>
        <p>Jump straight into ranked matches, tournament brackets, and wallet actions without leaving the same flow.</p>
        <div class="balance-hero-tags">
          <span class="tag-pill">${user.coins >= 500 ? "Ranked ready" : "Top up to rank"}</span>
          <span class="tag-pill">${activeSessions} live arenas</span>
        </div>
      </div>
      <div class="balance-hero-orb">
        <small>Wallet</small>
        <strong>${money(user.coins)}</strong>
      </div>
    </a>
    <div class="spotlight-stat">
      <small>Wins</small>
      <strong>${escapeHtml(String(user.wins || 0))}</strong>
      <p class="panel-copy">${escapeHtml(String(user.games || 0))} matches already logged on your profile.</p>
    </div>
    <div class="spotlight-stat spotlight-stat-themed" style="${gameThemeStyle(favoriteKey)}">
      <div class="spotlight-stat-head">
        ${gameIconBubble(favoriteKey)}
        <span class="game-meta-code">${escapeHtml(favoriteGame.badge)}</span>
      </div>
      <small>Favorite arena</small>
      <strong>${escapeHtml(favoriteGame.name)}</strong>
      <p class="panel-copy">Queue back into your best table while the lobby is active.</p>
    </div>
  `;
}

function renderDashboardQuickStrip(user, tournaments) {
  const target = document.getElementById("dashboardQuickStrip");
  if (!target) {
    return;
  }

  const favoriteKey = user.favoriteGame || "ludo";
  const favoriteGame = gameData(favoriteKey);
  const featuredTournament = (tournaments || [])[0];
  const tournamentCopy = featuredTournament
    ? `${money(featuredTournament.entryFee)} entry`
    : "Brackets open";

  target.innerHTML = `
    <a class="quick-entry-card" href="wallet.html">
      ${appIconFrame("wallet", "quick-entry-icon")}
      <div class="quick-entry-copy">
        <strong>${money(user.coins)}</strong>
        <span>Wallet ready for your next move.</span>
      </div>
    </a>
    <a class="quick-entry-card theme-surface" style="${gameThemeStyle(favoriteKey)}" href="match.html?game=${encodeURIComponent(favoriteKey)}">
      ${gameIconBubble(favoriteKey, "quick-entry-icon is-game")}
      <div class="quick-entry-copy">
        <strong>${escapeHtml(favoriteGame.name)}</strong>
        <span>${escapeHtml(favoriteGame.tagline)}</span>
      </div>
    </a>
    <a class="quick-entry-card" href="tournaments.html">
      ${appIconFrame("trophy", "quick-entry-icon")}
      <div class="quick-entry-copy">
        <strong>${featuredTournament ? escapeHtml(featuredTournament.name) : "Tournament hub"}</strong>
        <span>${escapeHtml(tournamentCopy)}</span>
      </div>
    </a>
    <a class="quick-entry-card" href="leaderboard.html">
      ${appIconFrame("chart", "quick-entry-icon")}
      <div class="quick-entry-copy">
        <strong>Leaderboard</strong>
        <span>Check the richest and most active players.</span>
      </div>
    </a>
  `;
}

function leaderboardCardMarkup(player, index) {
  const favoriteKey = player.favoriteGame || "ludo";
  const favoriteGame = gameData(favoriteKey);
  const games = Number(player.games || 0);
  const wins = Number(player.wins || 0);
  const winRate = games ? `${Math.round((wins / games) * 100)}%` : "0%";

  return `
    <div class="leader-card ${index === 0 ? "leader-card-top" : ""}" style="${gameThemeStyle(favoriteKey)}">
      <div class="leader-rank-badge">#${index + 1}</div>
      <div class="leader-avatar">${escapeHtml(initials(player.username))}</div>
      <div class="leader-main">
        <div class="leader-main-top">
          <strong>${escapeHtml(player.username)}</strong>
          <span class="leader-chip">${escapeHtml(favoriteGame.name)}</span>
        </div>
        <div class="panel-copy">Wins ${wins} - Games ${games} - Win rate ${escapeHtml(winRate)}</div>
      </div>
      <div class="leader-score-block">
        <small>Wallet</small>
        <strong>${money(player.coins)}</strong>
      </div>
    </div>
  `;
}

function renderLeaderboardCards(targetId, leaderboard, limit) {
  const target = document.getElementById(targetId);
  if (!target) {
    return;
  }

  if (!leaderboard.length) {
    target.innerHTML = `<div class="empty-state">No leaderboard data yet.</div>`;
    return;
  }

  const items = limit ? leaderboard.slice(0, limit) : leaderboard;
  target.innerHTML = items.map((player, index) => leaderboardCardMarkup(player, index)).join("");
}

function renderDashboardLeaderboard(leaderboard) {
  renderLeaderboardCards("dashboardLeaderboard", leaderboard, 5);
}

function renderDashboardSummary(user, transactions, history, tournaments) {
  const target = document.getElementById("dashboardSummary");
  if (!target) {
    return;
  }

  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recentHistory = (history || []).filter((item) => {
    return new Date(item.createdAt || 0).getTime() >= cutoff;
  });
  const recentTransactions = (transactions || []).filter((item) => {
    return new Date(item.createdAt || 0).getTime() >= cutoff;
  });
  const wins = recentHistory.filter((item) => item.result === "win").length;
  const weekWinRate = recentHistory.length
    ? `${Math.round((wins / recentHistory.length) * 100)}%`
    : `${Math.round(((Number(user.wins || 0) || 0) / Math.max(Number(user.games || 0) || 0, 1)) * 100)}%`;
  const tournamentCashIns = recentTransactions.reduce((total, item) => {
    const type = String(item.type || "").toLowerCase();
    const amount = Number(item.amount || 0);
    if (amount <= 0) {
      return total;
    }
    if (type.includes("tournament") || type.includes("payout") || type.includes("win")) {
      return total + amount;
    }
    return total;
  }, 0);
  const walletNetFlow = recentTransactions.reduce((total, item) => total + Number(item.amount || 0), 0);
  const liveTournamentCount = (tournaments || []).filter((item) => !item.completed).length;

  const items = [
    {
      label: "Total matches played",
      value: String(recentHistory.length)
    },
    {
      label: "Win rate",
      value: weekWinRate
    },
    {
      label: "Tournament cash-ins",
      value: tournamentCashIns ? signedMoney(tournamentCashIns) : money(0),
      tone: tournamentCashIns > 0 ? "positive" : "neutral"
    },
    {
      label: "Wallet net flow",
      value: signedMoney(walletNetFlow),
      tone: amountTone(walletNetFlow)
    }
  ];

  const subcopy = liveTournamentCount
    ? `${liveTournamentCount} live ${liveTournamentCount === 1 ? "bracket" : "brackets"} open for entry.`
    : recentHistory.length
      ? `${wins} wins from ${recentHistory.length} recent matches.`
      : "Your next match will start this week's activity.";

  target.innerHTML = `
    <div class="dashboard-summary-sheet">
      ${items
        .map((item) => {
          return `
            <div class="dashboard-summary-row">
              <span>${escapeHtml(item.label)}</span>
              <strong class="${escapeHtml(item.tone || "")}">${escapeHtml(item.value)}</strong>
            </div>
          `;
        })
        .join("")}
      <p class="dashboard-summary-note">${escapeHtml(subcopy)}</p>
    </div>
  `;
}

function renderDashboardActivity(transactions, history) {
  const target = document.getElementById("dashboardActivity");
  if (!target) {
    return;
  }

  const transactionItems = (transactions || []).map((item) => {
    const meta = transactionMeta(item.type);
    return {
      title: meta.label,
      detail: item.type.replace(/_/g, " "),
      amount: money(item.amount),
      amountClass: amountTone(item.amount),
      stamp: formatDateTime(item.createdAt),
      createdAt: item.createdAt,
      iconMarkup: appIconFrame(meta.icon, "activity-icon"),
      label: "Wallet"
    };
  });

  const historyItems = (history || []).map((item) => {
    const net = item.payout ? Number(item.payout) : item.cost ? -Number(item.cost) : 0;
    return {
      title: gameData(item.game).name,
      detail: `${capitalize(item.mode)} - ${capitalize(item.result)}`,
      amount: item.mode === "practice" && !item.payout && !item.cost ? "Free" : money(net),
      amountClass: resultTone(item.result),
      stamp: formatDateTime(item.createdAt),
      createdAt: item.createdAt,
      iconMarkup: gameIconBubble(item.game, "activity-icon is-game"),
      label: "Match"
    };
  });

  const items = [...transactionItems, ...historyItems]
    .sort((left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0))
    .slice(0, 5);

  if (!items.length) {
    target.innerHTML = `<div class="empty-state">Your first transaction or match will appear here.</div>`;
    return;
  }

  target.innerHTML = `
    <div class="dashboard-activity-sheet">
      ${items
        .map((item) => {
          return `
            <div class="dashboard-activity-row ${escapeHtml(item.amountClass)}">
              ${item.iconMarkup}
              <div class="activity-copy">
                <div class="activity-top">
                  <strong>${escapeHtml(item.title)}</strong>
                  <span class="activity-amount ${escapeHtml(item.amountClass)}">${escapeHtml(item.amount)}</span>
                </div>
                <div class="panel-copy">${escapeHtml(item.label)} - ${escapeHtml(item.detail)}</div>
                <div class="activity-time">${escapeHtml(item.stamp)}</div>
              </div>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderFeaturedTournament(tournaments, user) {
  const target = document.getElementById("dashboardTournament");
  const intro = document.getElementById("dashboardTournamentIntro");
  if (!target) {
    return;
  }

  const tournament = (tournaments || [])[0];
  if (!tournament) {
    if (intro) {
      intro.textContent = "Warm up in practice mode while the next live bracket is being prepared.";
    }
    target.innerHTML = `<div class="empty-state">No tournaments are configured yet.</div>`;
    return;
  }

  if (intro) {
    intro.textContent = tournament.headline || "Jump into the next live bracket or warm up in practice mode first.";
  }

  target.innerHTML = `
    <div class="tournament-showcase theme-surface" style="${gameThemeStyle(tournament.game)}">
      <div class="tournament-showcase-head">
        ${gameIconBubble(tournament.game, "tournament-icon is-game")}
        <div class="tournament-copy">
          <small>${escapeHtml(gameData(tournament.game).name)} bracket</small>
          <h3>${escapeHtml(tournament.name)}</h3>
          <p>${escapeHtml(tournament.headline)}</p>
        </div>
        <div class="tournament-pot">
          <small>Prize pool</small>
          <strong>${money(tournament.prize)}</strong>
        </div>
      </div>
      <div class="tournament-highlight-row">
        <div class="spot-pill">
          <small>Entry</small>
          <strong>${money(tournament.entryFee)}</strong>
        </div>
        <div class="spot-pill">
          <small>Slots</small>
          <strong>${tournament.joinedCount}/${tournament.slots}</strong>
        </div>
        <div class="spot-pill">
          <small>Starts</small>
          <strong>${escapeHtml(tournament.startsAtLabel || "Live now")}</strong>
        </div>
      </div>
      <div class="row-between tournament-showcase-footer">
        <span class="status-chip">${tournament.joined ? "Already joined" : "Open for entry"}</span>
        <div class="button-row">
          <button class="btn btn-primary" id="featuredTournamentJoin" type="button" ${tournament.joined ? "disabled" : ""}>
            ${tournament.joined ? "Already Joined" : "Join Tournament"}
          </button>
          <a class="btn btn-secondary dashboard-spotlight-secondary" href="tournaments.html">See All</a>
        </div>
      </div>
    </div>
  `;

  const button = document.getElementById("featuredTournamentJoin");
  if (button && !tournament.joined) {
    button.addEventListener("click", async () => {
      try {
        await joinTournamentAction(user, tournament.id);
        window.location.href = "tournaments.html";
      } catch (error) {
        alert(error.message);
      }
    });
  }
}

async function initDashboard(user) {
  const data = await apiRequest(`/bootstrap/${encodeURIComponent(user.username)}`);
  setStoredUser(data.user);
  renderDashboardHeadline(data.user);

  renderDashboardHeroStats(data.user, data.activeSessions);
  renderDashboardQuickStrip(data.user, data.tournaments);
  renderDashboardGames("dashboardGames");
  renderDashboardSummary(data.user, data.transactions, data.history, data.tournaments);
  renderDashboardLeaderboard(data.leaderboard);
  renderDashboardActivity(data.transactions, data.history);
  renderFeaturedTournament(data.tournaments, data.user);

  if (typeof window.initDashboardPage === "function") {
    window.initDashboardPage(data);
  }
}

async function initMatchSetup(user) {
  const game = gameData(queryParam("game"));
  const storedMatch = getStoredMatch();
  const state = {
    fee: 500,
    mode: "ranked",
    difficulty: "balanced",
    ludoSeatMode: game.key === "ludo" ? normalizeLudoSeatMode(storedMatch?.ludoSeatMode || 4) : 4,
    ludoDraftColors: game.key === "ludo" ? extractLudoDraftColors(storedMatch?.ludoColorOwners, storedMatch?.ludoSeatMode || 4) : [],
    ludoPracticeColorOwners: game.key === "ludo" && storedMatch?.ludoColorOwners && normalizeLudoSeatMode(storedMatch?.ludoSeatMode || 4) === 4
      ? normalizeLudoColorOwners(storedMatch.ludoColorOwners, 4)
      : null,
    joinMatchId: queryParam("join") || "",
    privateMatch: storedMatch && storedMatch.queueType === "private" && storedMatch.game === game.key ? storedMatch : null,
    privatePollId: null,
    privateBusy: false
  };

  applyGameTheme(game.key);
  setBalanceEverywhere(user.coins);
  setPageTitle("matchGameTitle", `${game.name} Match`);
  setPageTitle("matchGameCopy", game.key === "ludo" ? "Choose the table size, color homes, and stake before the race starts." : game.tagline);
  setGameBadge("matchGameBadge", game.key);

  const feeChoices = [100, 500, 1000, 2500];
  const modes = [
    { key: "ranked", label: "Ranked", note: "Entry fee deducted, payout on win." },
    { key: "practice", label: "Practice", note: "Free round with no wallet impact." }
  ];
  const ludoSeatChoices = [
    { key: 4, label: "4 Players", note: "Four seats, one color home each." },
    { key: 2, label: "2 Players", note: "Two seats, two home colors each." }
  ];
  const difficulties = [
    { key: "rookie", label: "Rookie", note: "Relaxed bot decisions." },
    { key: "balanced", label: "Balanced", note: "Steady pressure and clean replies." },
    { key: "elite", label: "Elite", note: "Sharper tactical choices." }
  ];

  function getLudoSetupState() {
    if (game.key === "ludo" && state.mode === "practice") {
      if (normalizeLudoSeatMode(state.ludoSeatMode) === 4 && !state.ludoPracticeColorOwners) {
        state.ludoPracticeColorOwners = buildRandomLudoPracticeOwners();
      }
      return buildLudoPracticeSetup(state.ludoSeatMode, state.ludoDraftColors, state.ludoPracticeColorOwners);
    }
    return buildLudoMatchSetup(state.ludoSeatMode, state.ludoDraftColors);
  }

  function isLudoSetupLocked() {
    return game.key === "ludo" && !getLudoSetupState().ready;
  }

  function stopPrivateMatchPolling() {
    if (state.privatePollId) {
      window.clearInterval(state.privatePollId);
      state.privatePollId = null;
    }
  }

  function enterPrivateMatch(match) {
    stopPrivateMatchPolling();
    setStoredMatch(match);
    clearStoredGameState();
    window.location.href = "game.html";
  }

  async function refreshPrivateMatch(matchId) {
    if (!matchId) {
      return;
    }

    try {
      const payload = await apiRequest(`/private-matches/${encodeURIComponent(matchId)}?username=${encodeURIComponent(user.username)}`);
      state.privateMatch = payload.match;
      if (payload.match) {
        setStoredMatch(payload.match);
      }
      renderPrivateMatchPanel();

      if (payload.match && payload.match.status === "ACTIVE" && payload.match.guestUsername) {
        enterPrivateMatch(payload.match);
      }
    } catch (error) {
      stopPrivateMatchPolling();
      state.privateMatch = null;
      clearStoredMatch();
      renderPrivateMatchPanel(error.message);
    }
  }

  function startPrivateMatchPolling(matchId) {
    stopPrivateMatchPolling();
    state.privatePollId = window.setInterval(() => {
      refreshPrivateMatch(matchId);
    }, 2500);
  }

  function renderPrivateMatchPanel(errorMessage = "") {
    const target = document.getElementById("privateMatchPanel");
    if (!target) {
      return;
    }

    const privateMatch = state.privateMatch;
    const joinValue = escapeHtml(state.joinMatchId);
    const setupLocked = isLudoSetupLocked();

    if (privateMatch) {
      const joinId = escapeHtml(privateMatch.joinCode || privateMatch.id);
      const waitingCopy = privateMatch.status === "ACTIVE" && privateMatch.guestUsername
        ? `${escapeHtml(privateMatch.guestUsername)} joined your room. Opening the shared match now.`
        : "Share this match ID with a friend or anyone you want to invite.";
      const playerLine = privateMatch.guestUsername
        ? `${escapeHtml(privateMatch.hostUsername)} vs ${escapeHtml(privateMatch.guestUsername)}`
        : `${escapeHtml(privateMatch.hostUsername)} waiting for player two`;

      target.innerHTML = `
        <div class="private-match-grid private-match-grid-active">
          <div class="match-summary-card private-match-panel-card private-match-host-card">
            <div class="private-match-card-head">
              <div class="private-match-token" aria-hidden="true"></div>
              <div>
                <small>Hosted room</small>
                <strong class="private-match-id">${joinId}</strong>
              </div>
              <span class="status-chip">${escapeHtml(privateMatch.status === "LOBBY" ? "Waiting for join" : "Room ready")}</span>
            </div>
            <p class="private-match-note">${waitingCopy}</p>
            <div class="private-match-meta-grid">
              <div class="mini-panel private-match-mini">
                <small>Players</small>
                <strong>${playerLine}</strong>
              </div>
              <div class="mini-panel private-match-mini">
                <small>Game</small>
                <strong>${escapeHtml(game.name)}</strong>
              </div>
            </div>
            <div class="button-row private-match-actions">
              <button class="btn btn-secondary" type="button" data-copy-private-id="${joinId}">Copy Match ID</button>
              <button class="btn btn-ghost" type="button" data-refresh-private-match="${escapeHtml(privateMatch.id)}">Refresh status</button>
            </div>
          </div>
        </div>
      `;
      return;
    }

    target.innerHTML = `
      <div class="private-match-grid private-match-grid-split">
        <div class="match-summary-card private-match-panel-card private-match-create-card">
          <div class="private-match-card-head">
            <div class="private-match-token" aria-hidden="true"></div>
            <div>
              <small>Create room</small>
              <strong>Host a private ${escapeHtml(game.name)} match</strong>
            </div>
          </div>
          <p class="panel-copy">Create a match ID for this game and share it. Anyone with the ID can join your room.</p>
          <p class="private-match-note">${escapeHtml(setupLocked ? "Finish the Ludo color draft before opening a private room." : "Use your current table setup and share the match ID.")}</p>
          <div class="button-row private-match-actions" style="margin-top: 16px;">
            <button class="btn btn-secondary" type="button" data-create-private-match ${(state.privateBusy || setupLocked) ? "disabled" : ""}>Create Match ID</button>
          </div>
        </div>
        <div class="match-summary-card private-match-panel-card private-match-join-card">
          <div class="private-match-card-head">
            <div class="private-match-token is-join" aria-hidden="true"></div>
            <div>
              <small>Join room</small>
              <strong>Enter a shared match ID</strong>
            </div>
          </div>
          <div class="field" style="margin-top: 10px;">
            <label for="joinMatchIdInput">Match ID</label>
            <input id="joinMatchIdInput" name="joinMatchIdInput" autocomplete="off" spellcheck="false" value="${joinValue}" placeholder="Paste a private match ID">
          </div>
          <p class="private-match-note">${escapeHtml(errorMessage || "Paste the host's match ID and join the same room.")}</p>
          <div class="button-row private-match-actions" style="margin-top: 14px;">
            <button class="btn btn-primary" type="button" data-join-private-match ${state.privateBusy ? "disabled" : ""}>Join Match</button>
          </div>
        </div>
      </div>
    `;
  }

  function renderChoices() {
    const feeTarget = document.getElementById("feeChoices");
    const modeTarget = document.getElementById("modeChoices");
    const ludoCard = document.getElementById("ludoSetupCard");
    const ludoSeatTarget = document.getElementById("ludoSeatChoices");
    const ludoDraftTarget = document.getElementById("ludoDraftPanel");
    const difficultyTarget = document.getElementById("difficultyChoices");
    const difficultyCard = difficultyTarget?.closest(".match-choice-card");

    if (feeTarget) {
      feeTarget.innerHTML = feeChoices
        .map((fee) => {
          const active = state.fee === fee ? "active" : "";
          const disabled = state.mode === "practice" ? "disabled" : "";
          return `<button class="choice-chip ${active}" type="button" data-fee="${fee}" ${disabled}>${money(fee)}</button>`;
        })
        .join("");
    }

    if (modeTarget) {
      modeTarget.innerHTML = modes
        .map((mode) => {
          const active = state.mode === mode.key ? "active" : "";
          return `<button class="choice-chip ${active}" type="button" data-mode="${mode.key}">
            ${escapeHtml(mode.label)}
            <small>${escapeHtml(mode.note)}</small>
          </button>`;
        })
        .join("");
    }

    if (ludoCard) {
      ludoCard.hidden = game.key !== "ludo";
    }

    if (ludoSeatTarget && game.key === "ludo") {
      ludoSeatTarget.innerHTML = ludoSeatChoices
        .map((seat) => {
          const active = getLudoSetupState().seatMode === seat.key ? "active" : "";
          return `<button class="choice-chip ${active}" type="button" data-ludo-seat-mode="${seat.key}">
            ${escapeHtml(seat.label)}
            <small>${escapeHtml(seat.note)}</small>
          </button>`;
        })
        .join("");
    }

    if (ludoDraftTarget) {
      if (game.key === "ludo") {
        ludoDraftTarget.innerHTML = renderLudoDraftPanelMarkup(getLudoSetupState());
        ludoDraftTarget.hidden = false;
      } else {
        ludoDraftTarget.innerHTML = "";
        ludoDraftTarget.hidden = true;
      }
    }

    if (difficultyCard) {
      difficultyCard.hidden = game.key === "ludo";
    }

    if (difficultyTarget && game.key !== "ludo") {
      difficultyTarget.innerHTML = difficulties
        .map((difficulty) => {
          const active = state.difficulty === difficulty.key ? "active" : "";
          return `<button class="choice-chip ${active}" type="button" data-difficulty="${difficulty.key}">
            ${escapeHtml(difficulty.label)}
            <small>${escapeHtml(difficulty.note)}</small>
          </button>`;
        })
        .join("");
    }

    renderMatchSummary(game, state);
    renderPrivateMatchPanel();

    const startButton = document.getElementById("startMatchButton");
    if (startButton) {
      const privateRoomActive = Boolean(state.privateMatch && state.privateMatch.id);
      const setupLocked = isLudoSetupLocked();
      startButton.disabled = privateRoomActive || setupLocked;
      startButton.textContent = privateRoomActive ? "Private Room Active" : setupLocked ? "Complete Color Draft" : "Start Solo Match";
    }
  }

  renderChoices();
  renderInfoList(
    "matchRules",
    (game.rules || []).map((rule, index) => ({
      label: `Rule ${index + 1}`,
      value: rule,
      copy: index === 0 ? game.tagline : ""
    })),
    "No rules available."
  );

  document.getElementById("feeChoices")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-fee]");
    if (!button || state.mode === "practice") {
      return;
    }
    state.fee = Number(button.dataset.fee);
    renderChoices();
  });

  document.getElementById("modeChoices")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-mode]");
    if (!button) {
      return;
    }
    state.mode = button.dataset.mode;
    if (game.key === "ludo") {
      if (state.mode === "practice") {
        if (normalizeLudoSeatMode(state.ludoSeatMode) === 4) {
          state.ludoPracticeColorOwners = buildRandomLudoPracticeOwners();
          state.ludoDraftColors = [];
        } else if (!Array.isArray(state.ludoDraftColors)) {
          state.ludoDraftColors = [];
        }
      } else {
        state.ludoPracticeColorOwners = null;
      }
    }
    renderChoices();
  });

  document.getElementById("difficultyChoices")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-difficulty]");
    if (!button) {
      return;
    }
    state.difficulty = button.dataset.difficulty;
    renderChoices();
  });

  document.getElementById("ludoSeatChoices")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-ludo-seat-mode]");
    if (!button) {
      return;
    }
    state.ludoSeatMode = normalizeLudoSeatMode(button.dataset.ludoSeatMode);
    if (state.ludoSeatMode !== 2) {
      state.ludoDraftColors = [];
    }
    if (state.mode === "practice") {
      if (state.ludoSeatMode === 4) {
        state.ludoPracticeColorOwners = buildRandomLudoPracticeOwners();
        state.ludoDraftColors = [];
      } else {
        state.ludoPracticeColorOwners = null;
        state.ludoDraftColors = [];
      }
    }
    renderChoices();
  });

  document.getElementById("ludoDraftPanel")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-ludo-draft-color]");
    if (!button || state.ludoSeatMode !== 2) {
      return;
    }

    const color = button.dataset.ludoDraftColor;
    if (!LUDO_TURN_ORDER.includes(color)) {
      return;
    }

    const setup = getLudoSetupState();
    if (setup.ready || setup.draftColors.includes(color)) {
      return;
    }

    const nextDraftColors = [...setup.draftColors, color];
    if (state.mode === "practice") {
      const botColor = chooseLudoPracticeBotDraftColor(nextDraftColors);
      if (botColor) {
        nextDraftColors.push(botColor);
      }
    }
    state.ludoDraftColors = nextDraftColors;
    renderChoices();
  });

  document.getElementById("startMatchButton")?.addEventListener("click", async () => {
    try {
      const ludoSetup = getLudoSetupState();
      const payload = await apiRequest("/games/start", {
        method: "POST",
        body: {
          username: user.username,
          game: game.key,
          cost: state.mode === "practice" ? 0 : state.fee,
          mode: state.mode,
          difficulty: state.difficulty,
          ...(game.key === "ludo" ? {
            ludoSeatMode: ludoSetup.seatMode,
            ludoColorOwners: ludoSetup.colorOwners
          } : {})
        }
      });

      setStoredUser(payload.user);
      setStoredMatch(payload.match);
      clearStoredGameState();
      window.location.href = "game.html";
    } catch (error) {
      alert(error.message);
    }
  });

  document.getElementById("privateMatchPanel")?.addEventListener("input", (event) => {
    if (event.target instanceof HTMLInputElement && event.target.id === "joinMatchIdInput") {
      state.joinMatchId = event.target.value.trim();
    }
  });

  document.getElementById("privateMatchPanel")?.addEventListener("click", async (event) => {
    if (!(event.target instanceof Element)) {
      return;
    }

    const createButton = event.target.closest("[data-create-private-match]");
    const joinButton = event.target.closest("[data-join-private-match]");
    const copyButton = event.target.closest("[data-copy-private-id]");
    const refreshButton = event.target.closest("[data-refresh-private-match]");

    if (copyButton) {
      const matchId = copyButton.dataset.copyPrivateId || "";
      try {
        await navigator.clipboard.writeText(matchId);
        alert("Match ID copied.");
      } catch (_error) {
        alert(`Copy this match ID: ${matchId}`);
      }
      return;
    }

    if (refreshButton) {
      await refreshPrivateMatch(refreshButton.dataset.refreshPrivateMatch || "");
      return;
    }

    if (state.privateBusy) {
      return;
    }

    if (createButton) {
      state.privateBusy = true;
      renderPrivateMatchPanel();

      try {
        const ludoSetup = getLudoSetupState();
        const payload = await apiRequest("/private-matches/create", {
          method: "POST",
          body: {
            username: user.username,
            game: game.key,
            ...(game.key === "ludo" ? {
              ludoSeatMode: ludoSetup.seatMode,
              ludoColorOwners: ludoSetup.colorOwners
            } : {})
          }
        });

        state.privateMatch = payload.match;
        setStoredMatch(payload.match);
        state.privateBusy = false;
        renderPrivateMatchPanel();
        startPrivateMatchPolling(payload.match.id);
      } catch (error) {
        state.privateBusy = false;
        renderPrivateMatchPanel(error.message);
      }
      return;
    }

    if (joinButton) {
      if (!state.joinMatchId) {
        renderPrivateMatchPanel("Enter a match ID first.");
        return;
      }

      state.privateBusy = true;
      renderPrivateMatchPanel();

      try {
        const payload = await apiRequest("/private-matches/join", {
          method: "POST",
          body: {
            username: user.username,
            matchId: state.joinMatchId
          }
        });

        state.privateBusy = false;
        enterPrivateMatch(payload.match);
      } catch (error) {
        state.privateBusy = false;
        renderPrivateMatchPanel(error.message);
      }
    }
  });

  if (state.privateMatch && state.privateMatch.id) {
    renderPrivateMatchPanel();
    if (state.privateMatch.status === "ACTIVE" && state.privateMatch.guestUsername) {
      enterPrivateMatch(state.privateMatch);
      return;
    }
    startPrivateMatchPolling(state.privateMatch.id);
  }

  window.addEventListener("beforeunload", stopPrivateMatchPolling, { once: true });
}

function renderMatchSummary(game, state) {
  const summary = document.getElementById("matchSummary");
  if (!summary) {
    return;
  }

  const entryFee = state.mode === "practice" ? 0 : state.fee;
  const payout = state.mode === "practice" ? 0 : entryFee * 2;
  const difficultyLabel = {
    rookie: "Rookie bot",
    balanced: "Balanced bot",
    elite: "Elite bot"
  }[state.difficulty];
  const ludoSetup = game.key === "ludo"
    ? (state.mode === "practice" ? buildLudoPracticeSetup(state.ludoSeatMode, state.ludoDraftColors, state.ludoPracticeColorOwners) : buildLudoMatchSetup(state.ludoSeatMode, state.ludoDraftColors))
    : null;
  const ludoSeatCopy = ludoSetup
    ? getLudoSeatIds(ludoSetup.seatMode)
      .map((seatId) => {
        const colors = getLudoSetupColorsForSeat(ludoSetup.colorOwners, ludoSetup.seatMode, seatId);
        const colorCopy = colors.length ? colors.map((color) => LUDO_DISPLAY[color].title).join(" + ") : "Waiting for pick";
        return `<div class="match-ludo-seat-line"><span>${escapeHtml(getLudoSeatLabel(seatId))}</span><strong>${escapeHtml(colorCopy)}</strong></div>`;
      })
      .join("")
    : "";
  const ludoStatusCopy = ludoSetup
    ? ludoSetup.botOnly
      ? ludoSetup.seatMode === 2
        ? ludoSetup.ready
          ? "Practice runs as a two-seat bot table. You manage one seat and the bot manages the other."
          : "Practice keeps the two-seat draft live. Pick the home colors and the bot takes the opposing seat."
        : "Practice keeps one human home against three bot homes."
      : ludoSetup.seatMode === 4
      ? "Four local seats, one home color each."
      : ludoSetup.ready
        ? ludoSetup.autoAssignedColor
          ? `${LUDO_DISPLAY[ludoSetup.autoAssignedColor].title} auto-filled the last seat.`
          : "Both players have their two home colors."
        : `${getLudoSeatLabel(ludoSetup.nextSeat)} picks the next home color.`
    : "";

  summary.innerHTML = `
    <div class="mini-panel match-summary-hero-card">
      <small>Selected game</small>
      <div class="summary-badge-row">
        <div class="game-badge">${gameIconFrame(game.key)}</div>
        <div>
          <strong>${escapeHtml(game.name)}</strong>
          <p class="panel-copy">${escapeHtml(game.tagline)}</p>
        </div>
      </div>
    </div>
    <div class="mini-panel match-summary-stat-card">
      <small>Match mode</small>
      <strong>${escapeHtml(state.mode === "practice" ? "Practice" : "Ranked")}</strong>
      <p class="panel-copy">${escapeHtml(game.key === "ludo" ? (state.mode === "practice" ? "Bot table enabled." : "Local table rules enabled.") : difficultyLabel)}</p>
    </div>
    <div class="mini-panel match-summary-stat-card">
      <small>${state.mode === "practice" ? "Practice value" : "Entry and reward"}</small>
      <strong>${money(entryFee)}</strong>
      <p class="panel-copy">Potential win ${money(payout)}</p>
    </div>
    ${ludoSetup ? `
      <div class="mini-panel match-summary-stat-card">
        <small>Table seats</small>
        <strong>${escapeHtml(ludoSetup.seatMode === 2 ? "2 Players" : "4 Players")}</strong>
        <p class="panel-copy">${escapeHtml(ludoStatusCopy)}</p>
      </div>
      <div class="mini-panel match-summary-stat-card match-summary-ludo-card">
        <small>Home colors</small>
        <div class="match-ludo-seat-summary">${ludoSeatCopy}</div>
      </div>
    ` : ""}
  `;
}

async function initWallet(user) {
  const [account, transactions, withdrawals] = await Promise.all([
    apiRequest(`/me/${encodeURIComponent(user.username)}`),
    apiRequest(`/transactions/${encodeURIComponent(user.username)}`),
    apiRequest(`/withdrawals/${encodeURIComponent(user.username)}`)
  ]);

  setStoredUser(account);
  setPageTitle("walletBalance", money(account.coins));
  renderWalletHighlights(account, transactions, withdrawals);
  renderTransactions(transactions, "walletTransactions", "No wallet activity yet.");
  renderWithdrawals(withdrawals, "withdrawHistory");

  document.getElementById("depositForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const amount = Number(new FormData(event.currentTarget).get("amount"));

    try {
      const updated = await apiRequest("/wallet/deposit", {
        method: "POST",
        body: {
          username: account.username,
          amount
        }
      });

      setStoredUser(updated);
      window.location.reload();
    } catch (error) {
      alert(error.message);
    }
  });

  document.getElementById("withdrawForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    try {
      const payload = await apiRequest("/wallet/withdraw", {
        method: "POST",
        body: {
          username: account.username,
          amount: Number(formData.get("amount")),
          bankName: formData.get("bankName"),
          accountNumber: formData.get("accountNumber"),
          accountName: formData.get("accountName")
        }
      });

      setStoredUser(payload.user);
      window.location.reload();
    } catch (error) {
      alert(error.message);
    }
  });
}

function renderWalletHighlights(account, transactions, withdrawals) {
  const target = document.getElementById("walletHighlights");
  if (!target) {
    return;
  }

  const inflow = (transactions || []).reduce((sum, item) => {
    return item.amount > 0 ? sum + Number(item.amount) : sum;
  }, 0);
  const outflow = (transactions || []).reduce((sum, item) => {
    return item.amount < 0 ? sum + Math.abs(Number(item.amount)) : sum;
  }, 0);
  const pending = (withdrawals || []).filter((item) => String(item.status || "").toLowerCase() === "pending").length;

  target.innerHTML = `
    <div class="wallet-highlight-card">
      <small>Wallet</small>
      <strong>${money(account.coins)}</strong>
      <p class="panel-copy">Current playable balance.</p>
    </div>
    <div class="wallet-highlight-card">
      <small>Total inflow</small>
      <strong>${money(inflow)}</strong>
      <p class="panel-copy">Deposits, wins, and credits received.</p>
    </div>
    <div class="wallet-highlight-card">
      <small>Outflow</small>
      <strong>${money(outflow)}</strong>
      <p class="panel-copy">${pending} pending withdrawal request${pending === 1 ? "" : "s"}.</p>
    </div>
  `;
}

function renderTransactions(transactions, targetId, emptyMessage) {
  const target = document.getElementById(targetId);
  if (!target) {
    return;
  }

  if (!transactions.length) {
    target.innerHTML = `<div class="empty-state">${escapeHtml(emptyMessage)}</div>`;
    return;
  }

  target.innerHTML = transactions
    .map((item) => {
      const meta = transactionMeta(item.type);
      const tone = amountTone(item.amount);
      return `
        <div class="wallet-activity-card ${escapeHtml(tone)}">
          ${appIconFrame(meta.icon, "wallet-row-icon")}
          <div class="wallet-row-copy">
            <div class="wallet-row-top">
              <strong>${escapeHtml(meta.label)}</strong>
              <span class="activity-amount ${escapeHtml(tone)}">${money(item.amount)}</span>
            </div>
            <div class="panel-copy">${escapeHtml(item.type.replace(/_/g, " "))}</div>
            <div class="activity-time">${escapeHtml(formatDateTime(item.createdAt))}</div>
          </div>
        </div>
      `;
    })
    .join("");
}

function renderWithdrawals(withdrawals, targetId) {
  const target = document.getElementById(targetId);
  if (!target) {
    return;
  }

  if (!withdrawals.length) {
    target.innerHTML = `<div class="empty-state">No withdrawal requests yet.</div>`;
    return;
  }

  target.innerHTML = withdrawals
    .map((item) => {
      const status = capitalize(item.status || "pending");
      return `
        <div class="withdrawal-card">
          ${appIconFrame("withdraw", "wallet-row-icon")}
          <div class="withdrawal-main">
            <div class="wallet-row-top">
              <strong>${money(item.amount)}</strong>
              <span class="status-chip">${escapeHtml(status)}</span>
            </div>
            <div class="panel-copy">${escapeHtml(`${item.bankName} - ${item.accountNumber}`)}</div>
            <div class="activity-time">${escapeHtml(formatDateTime(item.createdAt))}</div>
          </div>
        </div>
      `;
    })
    .join("");
}

async function initLeaderboard(user) {
  const leaderboard = await apiRequest("/users");
  setStoredUser(user);

  renderLeaderboardCards("leaderboardList", leaderboard);

  const richest = leaderboard[0];
  const totalWins = leaderboard.reduce((sum, player) => sum + Number(player.wins || 0), 0);
  renderInfoList(
    "leaderboardStats",
    [
      { label: "Players", value: String(leaderboard.length), copy: "Profiles in the current local ladder." },
      { label: "Top wallet", value: richest ? money(richest.coins) : money(0), copy: richest ? richest.username : "No player yet." },
      { label: "Total wins", value: String(totalWins), copy: "All recorded wins across stored accounts." }
    ],
    "No leaderboard stats yet."
  );
}

async function initProfile(user) {
  const [account, history] = await Promise.all([
    apiRequest(`/me/${encodeURIComponent(user.username)}`),
    apiRequest(`/history/${encodeURIComponent(user.username)}`)
  ]);

  setStoredUser(account);

  const profileCard = document.getElementById("profileCard");
  if (profileCard) {
    const winRate = account.games ? `${Math.round((account.wins / account.games) * 100)}%` : "0%";
    const favoriteKey = account.favoriteGame || "ludo";
    const favoriteGame = gameData(favoriteKey);
    profileCard.innerHTML = `
      <div class="profile-showcase theme-surface" style="${gameThemeStyle(favoriteKey)}">
        <div class="profile-showcase-head">
          <div class="profile-avatar">${escapeHtml(initials(account.username))}</div>
          <div class="profile-copy">
            <small>Competitor profile</small>
            <h3>${escapeHtml(account.username)}</h3>
            <p>${escapeHtml(account.email)}</p>
          </div>
          <span class="status-chip">${account.coins >= 500 ? "Ranked ready" : "Fund to rank"}</span>
        </div>
        <div class="profile-highlight-grid">
          <div class="profile-highlight-card">
            <small>Wallet</small>
            <strong>${money(account.coins)}</strong>
          </div>
          <div class="profile-highlight-card">
            <small>Wins</small>
            <strong>${escapeHtml(String(account.wins || 0))}</strong>
          </div>
          <div class="profile-highlight-card">
            <small>Win rate</small>
            <strong>${escapeHtml(winRate)}</strong>
          </div>
        </div>
        <div class="profile-showcase-foot">
          <div class="balance-hero-tags">
            <span class="tag-pill">Favorite ${escapeHtml(favoriteGame.name)}</span>
            <span class="tag-pill">${escapeHtml(String(account.games || 0))} matches logged</span>
          </div>
          <a class="btn btn-primary" href="match.html?game=${encodeURIComponent(favoriteKey)}">Play ${escapeHtml(favoriteGame.name)}</a>
        </div>
      </div>
    `;
  }

  renderInfoList(
    "profileNotes",
    [
      {
        label: "Favorite game",
        value: gameData(account.favoriteGame).name,
        copy: "Your most recently queued arena."
      },
      {
        label: "Next move",
        value: account.coins < 500 ? "Fund your wallet" : "Queue a ranked match",
        copy: account.coins < 500 ? "Add balance so you can keep entering ranked and tournament rounds." : "You have enough balance to keep climbing."
      },
      {
        label: "Practice note",
        value: "Warm up before ranking",
        copy: "Use practice mode when you want to test openings, routes, or captures without touching your wallet."
      }
    ],
    "No notes yet."
  );

  renderHistory(history, "profileHistory");
  document.getElementById("logoutButton")?.addEventListener("click", logout);
}

function renderHistory(history, targetId) {
  const target = document.getElementById(targetId);
  if (!target) {
    return;
  }

  if (!history.length) {
    target.innerHTML = `<div class="empty-state">No match history yet. Start a game to populate this section.</div>`;
    return;
  }

  target.innerHTML = history
    .map((item) => {
      const tone = resultTone(item.result);
      const net = item.payout ? Number(item.payout) : item.cost ? -Number(item.cost) : 0;
      return `
        <div class="history-showcase-card theme-surface" style="${gameThemeStyle(item.game)}">
          <div class="history-showcase-head">
            ${gameIconBubble(item.game, "history-icon is-game")}
            <div>
              <strong>${escapeHtml(gameData(item.game).name)}</strong>
              <div class="panel-copy">${escapeHtml(item.summary)}</div>
            </div>
            <span class="history-result-chip ${escapeHtml(tone)}">${escapeHtml(capitalize(item.result))}</span>
          </div>
          <div class="history-meta-row">
            <span class="tag-pill">${escapeHtml(capitalize(item.mode))} mode</span>
            <span class="activity-amount ${escapeHtml(amountTone(net))}">${item.mode === "practice" && !item.payout && !item.cost ? "Free" : money(net)}</span>
          </div>
          <div class="activity-time">${escapeHtml(formatDateTime(item.createdAt))}</div>
        </div>
      `;
    })
    .join("");
}

function renderFriendsOverview(snapshot) {
  const target = document.getElementById("friendsOverview");
  if (!target) {
    return;
  }

  target.innerHTML = `
    <div class="wallet-highlight-card">
      <small>Friends</small>
      <strong>${escapeHtml(String(snapshot.stats.friendsCount))}</strong>
      <p class="panel-copy">Confirmed players in your network.</p>
    </div>
    <div class="wallet-highlight-card">
      <small>Incoming</small>
      <strong>${escapeHtml(String(snapshot.stats.incomingCount))}</strong>
      <p class="panel-copy">Requests waiting for your reply.</p>
    </div>
    <div class="wallet-highlight-card">
      <small>Outgoing</small>
      <strong>${escapeHtml(String(snapshot.stats.outgoingCount))}</strong>
      <p class="panel-copy">Requests you have already sent.</p>
    </div>
    <div class="wallet-highlight-card">
      <small>Live now</small>
      <strong>${escapeHtml(String(snapshot.stats.activeFriendsCount))}</strong>
      <p class="panel-copy">Friends currently inside active matches.</p>
    </div>
  `;
}

function renderSocialRequests(snapshot) {
  const incomingTarget = document.getElementById("friendIncoming");
  const outgoingTarget = document.getElementById("friendOutgoing");

  if (incomingTarget) {
    incomingTarget.innerHTML = snapshot.incomingRequests.length
      ? snapshot.incomingRequests
          .map((item) => {
            return `
              <div class="social-card">
                <div class="social-card-head">
                  <div class="social-card-user">
                    ${gameIconBubble(item.from.favoriteGame || "ludo", "social-card-icon is-game")}
                    <div>
                      <strong>${escapeHtml(item.from.username)}</strong>
                      <div class="panel-copy">${escapeHtml(socialPresenceCopy(item.from))}</div>
                    </div>
                  </div>
                  <span class="status-chip">Incoming</span>
                </div>
                <div class="social-card-foot">
                  <span class="activity-time">${escapeHtml(formatDateTime(item.createdAt))}</span>
                  <div class="button-row">
                    <button class="btn btn-primary" data-friend-accept="${escapeHtml(item.id)}" type="button">Accept</button>
                    <button class="btn btn-ghost" data-friend-decline="${escapeHtml(item.id)}" type="button">Decline</button>
                  </div>
                </div>
              </div>
            `;
          })
          .join("")
      : `<div class="empty-state">No incoming friend requests right now.</div>`;
  }

  if (outgoingTarget) {
    outgoingTarget.innerHTML = snapshot.outgoingRequests.length
      ? snapshot.outgoingRequests
          .map((item) => {
            return `
              <div class="social-card subtle">
                <div class="social-card-head">
                  <div class="social-card-user">
                    ${gameIconBubble(item.to.favoriteGame || "ludo", "social-card-icon is-game")}
                    <div>
                      <strong>${escapeHtml(item.to.username)}</strong>
                      <div class="panel-copy">${escapeHtml(socialPresenceCopy(item.to))}</div>
                    </div>
                  </div>
                  <span class="status-chip">Pending</span>
                </div>
                <div class="activity-time">${escapeHtml(formatDateTime(item.createdAt))}</div>
              </div>
            `;
          })
          .join("")
      : `<div class="empty-state">No pending outgoing requests.</div>`;
  }
}

function renderDiscoverPlayers(players) {
  const target = document.getElementById("discoverPlayers");
  if (!target) {
    return;
  }

  target.innerHTML = players.length
    ? players
        .map((player) => {
          return `
            <div class="social-card">
              <div class="social-card-head">
                <div class="social-card-user">
                  ${gameIconBubble(player.favoriteGame || "ludo", "social-card-icon is-game")}
                  <div>
                    <strong>${escapeHtml(player.username)}</strong>
                    <div class="panel-copy">${escapeHtml(socialPresenceCopy(player))}</div>
                  </div>
                </div>
                <span class="leader-chip">${money(player.coins)}</span>
              </div>
              <div class="social-card-foot">
                <span class="panel-copy">${escapeHtml(gameData(player.favoriteGame).name)} specialist</span>
                <button class="btn btn-secondary" data-send-friend-request="${escapeHtml(player.username)}" type="button">Add Friend</button>
              </div>
            </div>
          `;
        })
        .join("")
    : `<div class="empty-state">No new players to discover right now.</div>`;
}

function renderSocialFeed(posts) {
  const target = document.getElementById("friendFeedList");
  if (!target) {
    return;
  }

  target.innerHTML = posts.length
    ? posts
        .map((post) => {
          const author = post.author || {};
          const gameKey = post.game || author.favoriteGame || "ludo";
          const feedStatus = post.fromSelf
            ? "Your update"
            : author.activeMatch
              ? `${capitalize(gameData(author.activeGame).name)} live`
              : "Friend update";

          return `
            <article class="feed-card theme-surface" style="${gameThemeStyle(gameKey)}">
              <div class="feed-card-head">
                <div class="social-card-user">
                  ${gameIconBubble(author.favoriteGame || gameKey, "social-card-icon is-game")}
                  <div>
                    <strong>${escapeHtml(post.fromSelf ? "You" : author.username)}</strong>
                    <div class="panel-copy">${escapeHtml(post.fromSelf ? "Visible to your network." : socialPresenceCopy(author))}</div>
                  </div>
                </div>
                <div class="feed-card-meta">
                  <span class="status-chip">${escapeHtml(feedStatus)}</span>
                  <span class="activity-time">${escapeHtml(formatDateTime(post.createdAt))}</span>
                </div>
              </div>
              <p class="feed-card-body">${escapeHtml(post.body)}</p>
              <div class="social-card-foot">
                <span class="tag-pill">${escapeHtml(gameData(gameKey).name)}</span>
                <span class="panel-copy">${escapeHtml(post.fromSelf ? "Your friends can see this in their feed." : `${author.username} shared this with friends.`)}</span>
              </div>
            </article>
          `;
        })
        .join("")
    : `<div class="empty-state">No feed posts yet. Share your first update and invite your friends into the conversation.</div>`;
}

function renderFriendsDirectory(friends, targetId, emptyMessage) {
  const target = document.getElementById(targetId);
  if (!target) {
    return;
  }

  target.innerHTML = friends.length
    ? friends
        .map((friend) => {
          const active = socialRuntime.selectedFriend === friend.username ? "active" : "";
          return `
            <button class="friend-pill ${active}" data-select-friend="${escapeHtml(friend.username)}" type="button">
              ${gameIconBubble(friend.favoriteGame || "ludo", "friend-pill-icon is-game")}
              <div class="friend-pill-copy">
                <strong>${escapeHtml(friend.username)}</strong>
                <span>${escapeHtml(socialPresenceCopy(friend))}</span>
                <small>${escapeHtml(socialMessagePreview(friend.lastMessage))}</small>
              </div>
            </button>
          `;
        })
        .join("")
    : `<div class="empty-state">${escapeHtml(emptyMessage)}</div>`;
}

function renderConversationHeader(targetId, friend, copy) {
  const target = document.getElementById(targetId);
  if (!target) {
    return;
  }

  if (!friend) {
    target.innerHTML = `
      <div class="empty-state">Choose a confirmed friend to open chat.</div>
    `;
    return;
  }

  target.innerHTML = `
    <div class="social-thread-head-card">
      <div class="social-card-user">
        ${gameIconBubble(friend.favoriteGame || "ludo", "social-card-icon is-game")}
        <div>
          <strong>${escapeHtml(friend.username)}</strong>
          <div class="panel-copy">${escapeHtml(copy || socialPresenceCopy(friend))}</div>
        </div>
      </div>
      <span class="status-chip">${friend.activeMatch ? `${capitalize(gameData(friend.activeGame).name)} live` : "Online profile"}</span>
    </div>
  `;
}

function renderConversationMessages(targetId, messages, viewerUsername, activeMatchId = null) {
  const target = document.getElementById(targetId);
  if (!target) {
    return;
  }

  target.innerHTML = messages.length
    ? messages
        .map((message) => {
          const fromSelf = message.fromSelf || message.sender === viewerUsername;
          const liveTag = message.matchId
            ? `<span class="chat-context-chip ${activeMatchId && message.matchId === activeMatchId ? "active" : ""}">${activeMatchId && message.matchId === activeMatchId ? "This live match" : "Live match"}</span>`
            : "";

          return `
            <div class="chat-bubble ${fromSelf ? "self" : "friend"}">
              <div class="chat-bubble-head">
                <strong>${escapeHtml(fromSelf ? "You" : message.sender)}</strong>
                <span>${escapeHtml(formatDateTime(message.createdAt))}</span>
              </div>
              <p>${escapeHtml(message.body)}</p>
              ${liveTag}
            </div>
          `;
        })
        .join("")
    : `<div class="empty-state">Start the conversation with your friend.</div>`;

  keepChatScrolled(targetId);
}

function setChatComposerState(formId, inputId, enabled, placeholder) {
  const input = document.getElementById(inputId);
  const form = document.getElementById(formId);
  const button = form ? form.querySelector('button[type="submit"]') : null;

  if (input) {
    input.disabled = !enabled;
    input.placeholder = placeholder;
  }

  if (button) {
    button.disabled = !enabled;
  }
}

async function loadSocialThread(user, friendUsername, config) {
  if (!friendUsername) {
    renderConversationHeader(config.metaTargetId, null, "");
    renderConversationMessages(config.messagesTargetId, [], user.username, config.matchId || null);
    setChatComposerState(config.formId, config.inputId, false, "Choose a friend first.");
    return null;
  }

  const payload = await fetchChatThread(user.username, friendUsername);
  renderConversationHeader(config.metaTargetId, payload.friend, config.copy || "");
  renderConversationMessages(config.messagesTargetId, payload.messages, user.username, config.matchId || null);
  setChatComposerState(config.formId, config.inputId, true, `Message ${payload.friend.username}`);
  return payload;
}

async function refreshFriendsPage(user, preserveSelection = true) {
  const [snapshot, feedPayload] = await Promise.all([
    fetchSocialSnapshot(user.username),
    fetchSocialFeed(user.username)
  ]);
  renderFriendsOverview(snapshot);
  renderSocialRequests(snapshot);
  renderDiscoverPlayers(snapshot.discover);
  renderSocialFeed(feedPayload.posts || []);

  if (!preserveSelection || !snapshot.friends.some((item) => item.username === socialRuntime.selectedFriend)) {
    socialRuntime.selectedFriend = snapshot.friends[0] ? snapshot.friends[0].username : "";
  }

  renderFriendsDirectory(snapshot.friends, "friendsList", "Add players as friends to unlock chat.");
  await loadSocialThread(user, socialRuntime.selectedFriend, {
    metaTargetId: "chatFriendMeta",
    messagesTargetId: "chatMessages",
    formId: "friendMessageForm",
    inputId: "friendMessageInput"
  });

  return snapshot;
}

async function initFriends(user) {
  socialRuntime.mode = "friends";
  await refreshFriendsPage(user, false);

  document.getElementById("feedPostForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const input = document.getElementById("feedPostInput");
    const body = input ? input.value.trim() : "";

    if (!body) {
      return;
    }

    try {
      await createFeedPostAction(user.username, body);
      if (input) {
        input.value = "";
      }
      await refreshFriendsPage(user, true);
    } catch (error) {
      alert(error.message);
    }
  });

  document.getElementById("friendSearchForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const targetUsername = String(new FormData(form).get("targetUsername") || "").trim();

    try {
      await sendFriendRequestAction(user.username, targetUsername);
      form.reset();
      await refreshFriendsPage(user);
    } catch (error) {
      alert(error.message);
    }
  });

  document.getElementById("discoverPlayers")?.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-send-friend-request]");
    if (!button) {
      return;
    }

    try {
      await sendFriendRequestAction(user.username, button.dataset.sendFriendRequest);
      await refreshFriendsPage(user);
    } catch (error) {
      alert(error.message);
    }
  });

  document.getElementById("friendIncoming")?.addEventListener("click", async (event) => {
    const accept = event.target.closest("[data-friend-accept]");
    const decline = event.target.closest("[data-friend-decline]");

    try {
      if (accept) {
        await respondFriendRequestAction(user.username, accept.dataset.friendAccept, "accept");
        await refreshFriendsPage(user, false);
      }

      if (decline) {
        await respondFriendRequestAction(user.username, decline.dataset.friendDecline, "decline");
        await refreshFriendsPage(user, true);
      }
    } catch (error) {
      alert(error.message);
    }
  });

  document.getElementById("friendsList")?.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-select-friend]");
    if (!button) {
      return;
    }

    socialRuntime.selectedFriend = button.dataset.selectFriend;
    renderFriendsDirectory((await fetchSocialSnapshot(user.username)).friends, "friendsList", "Add players as friends to unlock chat.");
    await loadSocialThread(user, socialRuntime.selectedFriend, {
      metaTargetId: "chatFriendMeta",
      messagesTargetId: "chatMessages",
      formId: "friendMessageForm",
      inputId: "friendMessageInput"
    });
  });

  document.getElementById("friendMessageForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const input = document.getElementById("friendMessageInput");
    const body = input ? input.value.trim() : "";

    if (!body || !socialRuntime.selectedFriend) {
      return;
    }

    try {
      await sendChatMessageAction(user.username, socialRuntime.selectedFriend, body);
      if (input) {
        input.value = "";
      }
      await loadSocialThread(user, socialRuntime.selectedFriend, {
        metaTargetId: "chatFriendMeta",
        messagesTargetId: "chatMessages",
        formId: "friendMessageForm",
        inputId: "friendMessageInput"
      });
      const snapshot = await fetchSocialSnapshot(user.username);
      renderFriendsDirectory(snapshot.friends, "friendsList", "Add players as friends to unlock chat.");
    } catch (error) {
      alert(error.message);
    }
  });

  socialRuntime.snapshotTimer = window.setInterval(() => {
    refreshFriendsPage(user, true).catch(() => {});
  }, 7000);

  socialRuntime.threadTimer = window.setInterval(() => {
    if (!socialRuntime.selectedFriend) {
      return;
    }

    loadSocialThread(user, socialRuntime.selectedFriend, {
      metaTargetId: "chatFriendMeta",
      messagesTargetId: "chatMessages",
      formId: "friendMessageForm",
      inputId: "friendMessageInput"
    }).catch(() => {});
  }, 3500);
}

async function initMatchSocial(user, match) {
  const snapshot = await fetchSocialSnapshot(user.username);
  socialRuntime.mode = "match";
  socialRuntime.matchId = match.id;
  const matchChatConfig = {
    metaTargetId: "matchChatMeta",
    messagesTargetId: "matchChatMessages",
    formId: "matchChatForm",
    inputId: "matchChatInput",
    matchId: match.id,
    copy: "Talk with friends while you play."
  };

  if (!snapshot.friends.some((item) => item.username === socialRuntime.selectedFriend)) {
    socialRuntime.selectedFriend = snapshot.friends[0] ? snapshot.friends[0].username : "";
  }

  renderFriendsDirectory(snapshot.friends, "matchFriendsList", "Add friends from the social page to unlock live match chat.");
  await loadSocialThread(user, socialRuntime.selectedFriend, matchChatConfig);

  document.getElementById("matchFriendsList")?.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-select-friend]");
    if (!button) {
      return;
    }

    socialRuntime.selectedFriend = button.dataset.selectFriend;
    const nextSnapshot = await fetchSocialSnapshot(user.username);
    renderFriendsDirectory(nextSnapshot.friends, "matchFriendsList", "Add friends from the social page to unlock live match chat.");
    await loadSocialThread(user, socialRuntime.selectedFriend, matchChatConfig);
  });

  document.getElementById("matchChatForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const input = document.getElementById("matchChatInput");
    const body = input ? input.value.trim() : "";

    if (!body || !socialRuntime.selectedFriend) {
      return;
    }

    try {
      await sendChatMessageAction(user.username, socialRuntime.selectedFriend, body, match.id);
      if (input) {
        input.value = "";
      }
      await loadSocialThread(user, socialRuntime.selectedFriend, matchChatConfig);
      const nextSnapshot = await fetchSocialSnapshot(user.username);
      renderFriendsDirectory(nextSnapshot.friends, "matchFriendsList", "Add friends from the social page to unlock live match chat.");
    } catch (error) {
      alert(error.message);
    }
  });

  socialRuntime.snapshotTimer = window.setInterval(async () => {
    try {
      const nextSnapshot = await fetchSocialSnapshot(user.username);
      const previousFriend = socialRuntime.selectedFriend;
      if (!nextSnapshot.friends.some((item) => item.username === socialRuntime.selectedFriend)) {
        socialRuntime.selectedFriend = nextSnapshot.friends[0] ? nextSnapshot.friends[0].username : "";
      }
      renderFriendsDirectory(nextSnapshot.friends, "matchFriendsList", "Add friends from the social page to unlock live match chat.");
      if (previousFriend !== socialRuntime.selectedFriend) {
        await loadSocialThread(user, socialRuntime.selectedFriend, matchChatConfig);
      }
    } catch (_error) {
      return;
    }
  }, 8000);

  socialRuntime.threadTimer = window.setInterval(() => {
    if (!socialRuntime.selectedFriend) {
      return;
    }

    loadSocialThread(user, socialRuntime.selectedFriend, matchChatConfig).catch(() => {});
  }, 3500);
}

async function initTournaments(user) {
  const tournaments = await apiRequest(`/tournaments?username=${encodeURIComponent(user.username)}`);
  const target = document.getElementById("tournamentGrid");

  if (!target) {
    return;
  }

  target.innerHTML = tournaments
    .map((tournament) => {
      return `
        <div class="tournament-card tournament-card-rich theme-surface" style="${gameThemeStyle(tournament.game)}">
          <div class="tournament-card-head">
            ${gameIconBubble(tournament.game, "tournament-icon is-game")}
            <div class="tournament-copy">
              <small>${escapeHtml(gameData(tournament.game).name)} bracket</small>
              <h3>${escapeHtml(tournament.name)}</h3>
              <p>${escapeHtml(tournament.headline)}</p>
            </div>
            <span class="status-chip">${tournament.joined ? "Joined" : "Open"}</span>
          </div>
          <div class="tournament-kpis">
            <div class="spot-pill">
              <small>Entry</small>
              <strong>${money(tournament.entryFee)}</strong>
            </div>
            <div class="spot-pill">
              <small>Prize</small>
              <strong>${money(tournament.prize)}</strong>
            </div>
            <div class="spot-pill">
              <small>Slots</small>
              <strong>${tournament.joinedCount}/${tournament.slots}</strong>
            </div>
          </div>
          <div class="tournament-card-footer">
            <div class="panel-copy">${escapeHtml(tournament.startsAtLabel)}</div>
            <button class="btn btn-primary" data-join-tournament="${escapeHtml(tournament.id)}" type="button" ${tournament.joined ? "disabled" : ""}>
              ${tournament.joined ? "Already Joined" : "Join Tournament"}
            </button>
          </div>
        </div>
      `;
    })
    .join("");

  target.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-join-tournament]");
    if (!button) {
      return;
    }

    try {
      await joinTournamentAction(user, button.dataset.joinTournament);
      window.location.reload();
    } catch (error) {
      alert(error.message);
    }
  });
}

async function initAdmin() {
  const data = await apiRequest("/admin/overview");
  renderAdminUsers(data.users);
  renderAdminWithdrawals(data.withdrawals);
  renderHistory(data.history, "adminHistory");
}

function renderAdminUsers(users) {
  const target = document.getElementById("adminUsers");
  if (!target) {
    return;
  }

  target.innerHTML = users
    .map((user, index) => {
      return `
        <div class="leader-row">
          <div class="leader-rank">${index + 1}</div>
          <div>
            <strong>${escapeHtml(user.username)}</strong>
            <div class="panel-copy">${escapeHtml(user.email)}</div>
          </div>
          <div class="leader-score">${money(user.coins)}</div>
        </div>
      `;
    })
    .join("");
}

function renderAdminWithdrawals(withdrawals) {
  const target = document.getElementById("adminWithdrawals");
  if (!target) {
    return;
  }

  if (!withdrawals.length) {
    target.innerHTML = `<div class="empty-state">No withdrawal requests yet.</div>`;
    return;
  }

  target.innerHTML = withdrawals
    .map((item) => {
      return `
        <div class="history-card">
          <div class="transaction-head">
            <strong>${escapeHtml(item.username)}</strong>
            <span>${money(item.amount)}</span>
          </div>
          <div class="panel-copy">${escapeHtml(`${item.bankName} - ${item.accountNumber}`)}</div>
          <div class="button-row">
            <button class="btn btn-secondary" data-admin-approve="${item.id}" type="button">Approve</button>
            <button class="btn btn-danger" data-admin-reject="${item.id}" type="button">Reject</button>
          </div>
        </div>
      `;
    })
    .join("");

  target.addEventListener("click", async (event) => {
    const approve = event.target.closest("[data-admin-approve]");
    const reject = event.target.closest("[data-admin-reject]");

    try {
      if (approve) {
        await apiRequest(`/admin/withdraw/${encodeURIComponent(approve.dataset.adminApprove)}/approve`, { method: "POST" });
        window.location.reload();
      }
      if (reject) {
        await apiRequest(`/admin/withdraw/${encodeURIComponent(reject.dataset.adminReject)}/reject`, { method: "POST" });
        window.location.reload();
      }
    } catch (error) {
      alert(error.message);
    }
  });
}

async function initVerify() {
  return;
}

async function initGamePage(user) {
  const match = getStoredMatch();
  if (!match || !GAME_ENGINES[match.game]) {
    window.location.href = "dashboard.html";
    return;
  }

  if ((match.queueType === "private" || match.mode === "private") && match.status === "LOBBY") {
    window.location.href = `match.html?game=${encodeURIComponent(match.game)}&join=${encodeURIComponent(match.joinCode || match.id)}`;
    return;
  }

  const storedGameState = getStoredGameState();
  activeRuntime = {
    user,
    match,
    state: storedGameState || GAME_ENGINES[match.game].createState(match),
    finished: false,
    animating: false,
    ludoRolling: null,
    ludoRollAudio: null,
    ludoRollIntervalId: null,
    ludoRollTimeoutId: null,
    ludoMoveAnimation: null,
    ludoMoveStepTimeoutId: null,
    ludoMoveFinishTimeoutId: null,
    whotTurnTimerId: null,
    whotTurnTickerId: null,
    whotTurnDeadline: 0,
    whotTurnKey: "",
    whotScoreRevealTimerId: null,
    whotScoreRevealCloseId: null,
    whotScoreRevealKey: "",
    privateSyncPollId: null,
    privateSyncVersion: 0,
    privateSyncUpdatedAt: "",
    privateSyncUpdatedBy: "",
    privateSyncPushBusy: false,
    privateSyncPullBusy: false,
    privateSyncPendingState: null
  };

  if (match.game === "ludo" && match.mode === "practice") {
    const practiceSeatMode = normalizeLudoSeatMode(match.ludoSeatMode || activeRuntime.state.seatMode || 4);
    activeRuntime.state = {
      ...cloneLudoState(activeRuntime.state),
      seatMode: practiceSeatMode,
      colorOwners: normalizeLudoColorOwners(match.ludoColorOwners || activeRuntime.state.colorOwners, practiceSeatMode),
      localSeatId: activeRuntime.state.localSeatId || "player1",
      botMode: true
    };
  }

  applyGameTheme(match.game);
  document.body.dataset.matchGame = match.game;
  document.body.classList.toggle("game-focus-whot", match.game === "whot");
  if (isPrivateLudoMatch(match)) {
    try {
      const snapshot = await loadPrivateMatchStateSnapshot(match.id, user.username);
      if (!applyPrivateMatchSnapshot(snapshot, { force: true, render: false })) {
        throw new Error("Could not load the shared Ludo board.");
      }
      startPrivateMatchStatePolling();
    } catch (error) {
      alert(error.message || "Could not load the shared Ludo board.");
      returnToMatchLobby();
      return;
    }
  } else if (!storedGameState || (match.game === "ludo" && match.mode === "practice")) {
    setStoredGameState(activeRuntime.state);
  }

  bindGameSideTabs();
  showGameSideTab("game");

  document.getElementById("forfeitButton")?.addEventListener("click", async () => {
    if (activeRuntime.finished) {
      window.location.href = "dashboard.html";
      return;
    }

    const shouldForfeit = window.confirm("Leave this match and record it as a forfeit?");
    if (!shouldForfeit) {
      return;
    }

    await finishActiveGame("forfeit", `${gameData(match.game).name} match forfeited.`);
  });

  document.getElementById("resultContinueButton")?.addEventListener("click", () => {
    returnToMatchLobby();
  });

  document.getElementById("resultReplayButton")?.addEventListener("click", async () => {
    await replayActiveMatch();
  });

  renderActiveGame();
  if (match.game === "ludo" && shouldRunLudoBotTurn(activeRuntime.state)) {
    if (Array.isArray(activeRuntime.state.dice)) {
      scheduleRuntimeAction(() => resolveLudoBotTurn(activeRuntime.state.turn), 420);
    } else {
      scheduleRuntimeAction(runLudoBotCycle, 650);
    }
  }
  try {
    await initMatchSocial(user, match);
  } catch (error) {
    console.error(error);
    renderConversationHeader("matchChatMeta", null, "");
    renderConversationMessages("matchChatMessages", [], user.username, match.id);
    setChatComposerState("matchChatForm", "matchChatInput", false, "Social chat is unavailable right now.");
  }
}

function renderActiveGame() {
  if (!activeRuntime) {
    stopWhotBackgroundMusic(true);
    return;
  }

  clearWhotDragState();
  setBalanceEverywhere(activeRuntime.user.coins);
  document.body.dataset.matchGame = activeRuntime.match.game;
  document.body.classList.toggle("game-focus-whot", activeRuntime.match.game === "whot");
  const engine = GAME_ENGINES[activeRuntime.match.game];
  const view = engine.render(activeRuntime);
  const isPrivateMatch = activeRuntime.match.queueType === "private" || activeRuntime.match.mode === "private";
  const opponentName = activeRuntime.match.opponentName || activeRuntime.match.guestUsername || activeRuntime.match.hostUsername || "Player";
  const modeLabel = isPrivateMatch ? "Private" : activeRuntime.match.mode === "practice" ? "Practice" : "Ranked";
  const stakeLabel = isPrivateMatch ? `Match ID ${activeRuntime.match.joinCode || activeRuntime.match.id}` : `Stake ${money(activeRuntime.match.cost)}`;
  const difficultyLabel = activeRuntime.match.game === "ludo"
    ? activeRuntime.state.botMode
      ? `${normalizeLudoSeatMode(activeRuntime.match.ludoSeatMode || activeRuntime.state.seatMode) === 2 ? "2-player" : "4-player"} bot table`
      : `${normalizeLudoSeatMode(activeRuntime.match.ludoSeatMode || activeRuntime.state.seatMode) === 2 ? "2-player" : "4-player"} table`
    : isPrivateMatch
      ? `Vs ${opponentName}`
      : `${capitalize(activeRuntime.match.difficulty)} bot`;
  const subtitle = activeRuntime.match.game === "ludo"
    ? "Ludo live"
    : isPrivateMatch
      ? `${gameData(activeRuntime.match.game).name} private room`
      : `${gameData(activeRuntime.match.game).name} live`;

  setPageTitle("activeGameSubtitle", subtitle);
  setPageTitle("activeGameTitle", view.title);
  setPageTitle("activeGameCopy", view.copy);
  setGameBadge("activeGameChip", activeRuntime.match.game);
  setPageTitle("activeGameTag", gameData(activeRuntime.match.game).tagline);
  setPageTitle("matchModeChip", modeLabel);
  setPageTitle("matchStakeChip", stakeLabel);
  setPageTitle("matchDifficultyChip", difficultyLabel);

  const canvas = document.getElementById("gameCanvas");
  if (canvas) {
    canvas.innerHTML = view.html;
  }

  renderInfoList("gameNotes", view.notes, "No notes.");
  renderInfoList("gameControls", view.controls, "No controls.");

  if (typeof view.bind === "function") {
    view.bind();
  }

  if (activeRuntime.match.game === "whot") {
    syncWhotTurnTimer();
    syncWhotScoreReveal();
  } else {
    clearWhotTurnTimer();
    clearWhotScoreRevealTimers();
  }
  syncWhotBackgroundMusic();
}

function renderCurrentGameToText() {
  if (!activeRuntime || !activeRuntime.match) {
    return JSON.stringify({
      page: document.body.dataset.page || "",
      activeMatch: false
    });
  }

  const base = {
    activeMatch: true,
    game: activeRuntime.match.game,
    title: document.getElementById("activeGameTitle")?.textContent || "",
    subtitle: document.getElementById("activeGameSubtitle")?.textContent || ""
  };

  if (activeRuntime.match.game === "ludo") {
    const state = getRenderableLudoState(activeRuntime);
    const isRolling = Boolean(activeRuntime.ludoRolling);
    const isMoving = Boolean(activeRuntime.ludoMoveAnimation);
    const displayDice = isRolling ? activeRuntime.ludoRolling.currentDice : state.dice;
    const movesByDie = !isRolling && !isMoving && state.dice
      ? getLudoAvailableMovesByDie(state, state.turn)
      : buildEmptyLudoMovesByDie(displayDice);
    const payload = {
      ...base,
      turn: state.turn,
      turnOwner: getLudoColorOwner(state, state.turn),
      dice: displayDice,
      resolvedDice: state.dice,
      isRolling,
      isMoving,
      rollAudioDuration: activeRuntime.ludoRollAudio && Number.isFinite(activeRuntime.ludoRollAudio.duration)
        ? Number(activeRuntime.ludoRollAudio.duration.toFixed(3))
        : null,
      rollAudioCurrentTime: activeRuntime.ludoRollAudio
        ? Number(activeRuntime.ludoRollAudio.currentTime.toFixed(3))
        : null,
      selectedDie: state.selectedDie,
      winner: state.winner,
      note: state.note,
      seatMode: state.seatMode,
      localSeatId: state.localSeatId || "player1",
      botMode: Boolean(state.botMode),
      privateSyncVersion: normalizePrivateMatchSyncVersion(activeRuntime.privateSyncVersion),
      colorOwners: normalizeLudoColorOwners(state.colorOwners, state.seatMode),
      availableMovesByDie: movesByDie,
      players: Object.fromEntries(
        LUDO_TURN_ORDER.map((color) => {
          const tokens = state.players[color].tokens;
          const stackOrder = Array.isArray(state.players[color].stackOrder) ? [...state.players[color].stackOrder] : [];
          return [color, {
            home: tokens.filter((position) => position === -1).length,
            live: tokens.filter((position) => position >= 0 && !isLudoGoalPosition(position)).length,
            goal: tokens.filter((position) => isLudoGoalPosition(position)).length,
            tokens: [...tokens],
            stackOrder
          }];
        })
      ),
      stackSerial: Number.isInteger(state.stackSerial) ? state.stackSerial : null
    };
    return JSON.stringify(payload);
  }

  return JSON.stringify(base);
}

window.render_game_to_text = renderCurrentGameToText;
window.advanceTime = async function advanceTime() {
  return;
};

function bindGameSideTabs() {
  const tabs = document.querySelectorAll("[data-game-panel-tab]");
  if (!tabs.length) {
    return;
  }

  tabs.forEach((tab) => {
    if (tab.dataset.bound === "true") {
      return;
    }
    tab.dataset.bound = "true";
    tab.addEventListener("click", () => {
      showGameSideTab(tab.dataset.gamePanelTab || "game");
    });
  });
}

function showGameSideTab(panelName) {
  document.querySelectorAll("[data-game-panel-tab]").forEach((tab) => {
    const isActive = tab.dataset.gamePanelTab === panelName;
    tab.classList.toggle("is-active", isActive);
    tab.classList.toggle("active", isActive);
    tab.setAttribute("aria-selected", isActive ? "true" : "false");
  });

  document.querySelectorAll("[data-game-panel]").forEach((panel) => {
    const isActive = panel.dataset.gamePanel === panelName;
    panel.classList.toggle("is-active", isActive);
    panel.classList.toggle("active", isActive);
    panel.hidden = !isActive;
  });
}

function setResultOverlayBusy(isBusy) {
  const replayButton = document.getElementById("resultReplayButton");
  const lobbyButton = document.getElementById("resultContinueButton");
  if (replayButton) {
    replayButton.disabled = isBusy;
  }
  if (lobbyButton) {
    lobbyButton.disabled = isBusy;
  }
}

function returnToMatchLobby() {
  const gameKey = activeRuntime && activeRuntime.match ? activeRuntime.match.game : "";
  stopPrivateMatchStatePolling();
  clearStoredMatch();
  clearStoredGameState();
  window.location.href = gameKey ? `match.html?game=${encodeURIComponent(gameKey)}` : "dashboard.html";
}

async function replayActiveMatch() {
  if (!activeRuntime) {
    return;
  }

  const match = activeRuntime.match;
  const user = activeRuntime.user;
  const isPrivateMatch = match.queueType === "private" || match.mode === "private";
  setResultOverlayBusy(true);

  try {
    if (isPrivateMatch) {
      const payload = await apiRequest("/private-matches/create", {
        method: "POST",
        body: {
          username: user.username,
          game: match.game,
          ...(match.game === "ludo" ? {
            ludoSeatMode: match.ludoSeatMode,
            ludoColorOwners: match.ludoColorOwners
          } : {})
        }
      });

      setStoredUser(payload.user);
      setStoredMatch(payload.match);
      clearStoredGameState();
      window.location.href = `match.html?game=${encodeURIComponent(match.game)}&join=${encodeURIComponent(payload.match.joinCode || payload.match.id)}`;
      return;
    }

    const payload = await apiRequest("/games/start", {
      method: "POST",
      body: {
        username: user.username,
        game: match.game,
        cost: match.mode === "practice" ? 0 : Number(match.cost || 0),
        mode: match.mode === "ranked" ? "ranked" : "practice",
        difficulty: match.difficulty || "balanced",
        ...(match.game === "ludo" ? {
          ludoSeatMode: match.ludoSeatMode,
          ludoColorOwners: match.ludoColorOwners
        } : {})
      }
    });

    setStoredUser(payload.user);
    setStoredMatch(payload.match);
    clearStoredGameState();
    window.location.href = "game.html";
  } catch (error) {
    setResultOverlayBusy(false);
    alert(error.message);
  }
}

async function finishActiveGame(result, summary) {
  if (!activeRuntime || activeRuntime.finished) {
    return;
  }

  stopPrivateMatchStatePolling();
  clearLudoRollAnimation();
  clearLudoMoveAnimation();
  activeRuntime.finished = true;
  syncWhotBackgroundMusic();
  clearWhotTurnTimer();
  clearWhotScoreRevealTimers();
  clearWhotDragState();

  try {
    const payload = await apiRequest("/games/finish", {
      method: "POST",
      body: {
        matchId: activeRuntime.match.id,
        username: activeRuntime.user.username,
        result,
        summary
      }
    });

    activeRuntime.user = payload.user;
    setStoredUser(payload.user);
    showResultOverlay(result, summary, payload.payout);
  } catch (error) {
    activeRuntime.finished = false;
    alert(error.message);
  }
}

function showResultOverlay(result, summary, payout) {
  const overlay = document.getElementById("resultOverlay");
  if (!overlay) {
    return;
  }

  const isPrivateMatch = Boolean(activeRuntime && (activeRuntime.match.queueType === "private" || activeRuntime.match.mode === "private"));
  const isWhotMatch = Boolean(activeRuntime && activeRuntime.match && activeRuntime.match.game === "whot");

  const titleMap = {
    win: "Victory secured",
    loss: "Match lost",
    draw: "Match drawn",
    forfeit: "Match forfeited"
  };
  const soundMap = {
    win: isWhotMatch ? WHOT_SOUND_ASSETS.winning : WHOT_SOUND_ASSETS.win,
    loss: WHOT_SOUND_ASSETS.play,
    draw: WHOT_SOUND_ASSETS.select,
    forfeit: WHOT_SOUND_ASSETS.select
  };
  const replayButton = document.getElementById("resultReplayButton");
  const lobbyButton = document.getElementById("resultContinueButton");

  setPageTitle("resultTitle", titleMap[result] || "Match finished");
  setPageTitle("resultCopy", result === "win" ? `${summary} Stay on the board and choose your next move.` : `${summary} The board stays open while you decide what to do next.`);
  setPageTitle("resultEyebrow", result === "win" ? (isPrivateMatch ? "Private room complete" : "Wallet updated") : "Session closed");

  if (replayButton) {
    replayButton.textContent = isPrivateMatch ? "Create New Room" : "Play Again";
  }
  if (lobbyButton) {
    lobbyButton.textContent = "Return to Lobby";
  }
  setResultOverlayBusy(false);

  const summaryTarget = document.getElementById("resultSummary");
  if (summaryTarget) {
    summaryTarget.innerHTML = `
      <div class="mini-panel">
        <small>Outcome</small>
        <strong>${escapeHtml(result)}</strong>
      </div>
      <div class="mini-panel">
        <small>${result === "win" ? "Reward" : "Payout"}</small>
        <strong>${money(payout || 0)}</strong>
      </div>
      <div class="mini-panel">
        <small>Updated Balance</small>
        <strong>${money(activeRuntime.user.coins)}</strong>
      </div>
    `;
  }

  overlay.classList.remove("is-win", "is-loss", "is-draw", "is-forfeit", "hidden");
  overlay.classList.add(`is-${result}`);
  playInterfaceSound(soundMap[result], result === "win" ? 0.52 : 0.28);
  overlay.classList.remove("hidden");
}

function scheduleRuntimeAction(callback, delay = 550) {
  const runtimeId = activeRuntime ? activeRuntime.match.id : null;
  window.setTimeout(() => {
    if (!activeRuntime || activeRuntime.match.id !== runtimeId || activeRuntime.finished) {
      return;
    }
    callback();
  }, delay);
}

function persistRuntime(nextState) {
  activeRuntime.state = nextState;
  setStoredGameState(nextState);
  renderActiveGame();
  if (isPrivateLudoMatch()) {
    queuePrivateMatchStateSync(nextState);
  }
}

function clearLudoRollAnimation() {
  if (!activeRuntime) {
    return;
  }

  if (activeRuntime.ludoRollIntervalId) {
    window.clearInterval(activeRuntime.ludoRollIntervalId);
  }
  if (activeRuntime.ludoRollTimeoutId) {
    window.clearTimeout(activeRuntime.ludoRollTimeoutId);
  }
  if (activeRuntime.ludoRollAudio) {
    activeRuntime.ludoRollAudio.onended = null;
    activeRuntime.ludoRollAudio.onerror = null;
    activeRuntime.ludoRollAudio.onloadedmetadata = null;
    try {
      activeRuntime.ludoRollAudio.pause();
      activeRuntime.ludoRollAudio.currentTime = 0;
    } catch (error) {}
  }

  activeRuntime.ludoRollAudio = null;
  activeRuntime.ludoRollIntervalId = null;
  activeRuntime.ludoRollTimeoutId = null;
  activeRuntime.ludoRolling = null;
}

function clearLudoMoveAnimation(shouldRender = false) {
  if (!activeRuntime) {
    return;
  }

  if (activeRuntime.ludoMoveStepTimeoutId) {
    window.clearTimeout(activeRuntime.ludoMoveStepTimeoutId);
  }
  if (activeRuntime.ludoMoveFinishTimeoutId) {
    window.clearTimeout(activeRuntime.ludoMoveFinishTimeoutId);
  }

  activeRuntime.ludoMoveStepTimeoutId = null;
  activeRuntime.ludoMoveFinishTimeoutId = null;
  activeRuntime.ludoMoveAnimation = null;

  if (shouldRender) {
    renderActiveGame();
  }
}

function clearWhotTurnTimer() {
  if (!activeRuntime) {
    return;
  }

  if (activeRuntime.whotTurnTimerId) {
    window.clearTimeout(activeRuntime.whotTurnTimerId);
  }
  if (activeRuntime.whotTurnTickerId) {
    window.clearInterval(activeRuntime.whotTurnTickerId);
  }

  activeRuntime.whotTurnTimerId = null;
  activeRuntime.whotTurnTickerId = null;
  activeRuntime.whotTurnDeadline = 0;
  activeRuntime.whotTurnKey = "";

  const timer = document.getElementById("whotTurnTimer");
  if (timer) {
    timer.textContent = "";
    timer.classList.add("is-hidden");
    timer.classList.remove("is-urgent");
  }
}

function clearWhotScoreRevealTimers() {
  if (!activeRuntime) {
    return;
  }

  if (activeRuntime.whotScoreRevealTimerId) {
    window.clearTimeout(activeRuntime.whotScoreRevealTimerId);
  }
  if (activeRuntime.whotScoreRevealCloseId) {
    window.clearTimeout(activeRuntime.whotScoreRevealCloseId);
  }

  activeRuntime.whotScoreRevealTimerId = null;
  activeRuntime.whotScoreRevealCloseId = null;
  activeRuntime.whotScoreRevealKey = "";
}

function updateWhotTurnTimerDisplay() {
  const timer = document.getElementById("whotTurnTimer");
  if (!timer || !activeRuntime || !activeRuntime.whotTurnDeadline) {
    return;
  }

  const remainingMs = Math.max(0, activeRuntime.whotTurnDeadline - Date.now());
  const remainingSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  timer.textContent = `${remainingSeconds}s`;
  timer.classList.remove("is-hidden");
  timer.classList.toggle("is-urgent", remainingSeconds <= 5);
}

function syncWhotTurnTimer() {
  if (!activeRuntime || activeRuntime.match.game !== "whot") {
    clearWhotTurnTimer();
    return;
  }

  let state = activeRuntime.state;
  const shouldRun = Boolean(
    state
    && state.turn === "player"
    && !state.winner
    && !state.pendingRequestSelection
    && !activeRuntime.animating
  );

  if (!shouldRun) {
    clearWhotTurnTimer();
    return;
  }

  if (!Number(state.turnDeadlineAt)) {
    state = {
      ...state,
      turnDeadlineAt: Date.now() + WHOT_PLAYER_TURN_LIMIT_MS
    };
    activeRuntime.state = state;
    setStoredGameState(state);
  }

  const turnKey = `player:${Number(state.turnSerial || 1)}`;
  const deadline = Number(state.turnDeadlineAt || 0);
  const remainingMs = Math.max(0, deadline - Date.now());

  if (remainingMs <= 0) {
    clearWhotTurnTimer();
    window.setTimeout(runWhotPlayerTurnTimeout, 0);
    return;
  }

  if (activeRuntime.whotTurnKey !== turnKey || activeRuntime.whotTurnDeadline !== deadline) {
    clearWhotTurnTimer();
    activeRuntime.whotTurnKey = turnKey;
    activeRuntime.whotTurnDeadline = deadline;
    activeRuntime.whotTurnTickerId = window.setInterval(updateWhotTurnTimerDisplay, 250);
    activeRuntime.whotTurnTimerId = window.setTimeout(runWhotPlayerTurnTimeout, remainingMs);
  }

  updateWhotTurnTimerDisplay();
}

function syncWhotScoreReveal() {
  if (!activeRuntime || activeRuntime.match.game !== "whot") {
    clearWhotScoreRevealTimers();
    return;
  }

  const reveal = activeRuntime.state && activeRuntime.state.scoreReveal;
  if (!reveal || activeRuntime.finished) {
    clearWhotScoreRevealTimers();
    return;
  }

  if (reveal.phase === "done" && activeRuntime.state.winner) {
    if (!activeRuntime.whotScoreRevealCloseId) {
      activeRuntime.whotScoreRevealCloseId = window.setTimeout(() => {
        if (!activeRuntime || activeRuntime.finished || activeRuntime.match.game !== "whot") {
          return;
        }
        closeWhot(activeRuntime.state);
      }, 1400);
    }
    return;
  }

  const revealKey = [
    reveal.phase,
    Number(reveal.playerShown || 0),
    Number(reveal.botShown || 0),
    Number(reveal.playerTotal || 0),
    Number(reveal.botTotal || 0)
  ].join(":");

  if (activeRuntime.whotScoreRevealKey === revealKey && activeRuntime.whotScoreRevealTimerId) {
    return;
  }

  if (activeRuntime.whotScoreRevealTimerId) {
    window.clearTimeout(activeRuntime.whotScoreRevealTimerId);
  }

  activeRuntime.whotScoreRevealKey = revealKey;
  activeRuntime.whotScoreRevealTimerId = window.setTimeout(runWhotScoreRevealStep, 520);
}

function runWhotScoreRevealStep() {
  if (!activeRuntime || activeRuntime.finished || activeRuntime.match.game !== "whot" || activeRuntime.animating) {
    return;
  }

  activeRuntime.whotScoreRevealTimerId = null;
  const next = cloneWhotState(activeRuntime.state);
  const reveal = next.scoreReveal;
  if (!reveal) {
    clearWhotScoreRevealTimers();
    return;
  }

  if (reveal.phase === "player") {
    if (Number(reveal.playerShown || 0) < reveal.playerEntries.length) {
      const entry = reveal.playerEntries[reveal.playerShown];
      reveal.playerShown += 1;
      reveal.playerTotal += Number(entry.points || 0);
      next.message = `Counting your hand: ${entry.label} adds ${entry.points}.`;
      if (reveal.playerShown >= reveal.playerEntries.length) {
        reveal.phase = reveal.botEntries.length ? "bot" : "winner";
      }
      persistRuntime(next);
      return;
    }
    reveal.phase = reveal.botEntries.length ? "bot" : "winner";
    persistRuntime(next);
    return;
  }

  if (reveal.phase === "bot") {
    if (Number(reveal.botShown || 0) < reveal.botEntries.length) {
      const entry = reveal.botEntries[reveal.botShown];
      reveal.botShown += 1;
      reveal.botTotal += Number(entry.points || 0);
      next.message = `Counting opponent hand: ${entry.label} adds ${entry.points}.`;
      if (reveal.botShown >= reveal.botEntries.length) {
        reveal.phase = "winner";
      }
      persistRuntime(next);
      return;
    }
    reveal.phase = "winner";
    persistRuntime(next);
    return;
  }

  if (reveal.phase === "winner") {
    const playerScore = Number(reveal.playerTotal || 0);
    const botScore = Number(reveal.botTotal || 0);
    next.winner = playerScore === botScore ? "draw" : playerScore < botScore ? "player" : "bot";
    next.message = playerScore === botScore
      ? `${reveal.reason} Final count tied at ${playerScore}.`
      : `${reveal.reason} Final count: you ${playerScore}, opponent ${botScore}. Lowest total wins.`;
    reveal.phase = "done";
    persistRuntime(next);
    return;
  }

  clearWhotScoreRevealTimers();
}

function runWhotPlayerTurnTimeout() {
  if (!activeRuntime || activeRuntime.finished || activeRuntime.match.game !== "whot" || activeRuntime.animating) {
    return;
  }

  const state = cloneWhotState(activeRuntime.state);
  if (state.turn !== "player" || state.winner || state.pendingRequestSelection) {
    clearWhotTurnTimer();
    return;
  }

  clearWhotTurnTimer();

  const effect = state.pendingEffect;
  const amount = effect && effect.type === "pick2" ? effect.amount || 2 : 1;
  const drawn = drawWhotCards(state, "playerHand", amount);
  state.selectedIndex = null;

  if (effect && effect.type === "pick2") {
    state.pendingEffect = null;
    setWhotTurn(state, effect.source || "bot");
    state.message = `Time ran out, so you went to market and picked ${drawn} card${drawn === 1 ? "" : "s"}. ${capitalize(effect.source || "bot")} continues to cover the 2.`;
  } else {
    setWhotTurn(state, "bot");
    state.message = state.requestShape
      ? `Time ran out, so you went to market and drew ${drawn} card${drawn === 1 ? "" : "s"}. The request stays live and bot turn begins.`
      : `Time ran out, so you went to market and drew ${drawn} card${drawn === 1 ? "" : "s"}. Bot turn.`;
  }

  playInterfaceSound(WHOT_SOUND_ASSETS.select, 0.22);

  if (state.deck.length === 0) {
    const resolved = resolveWhotDeckExhaustion(state, "The draw pile is exhausted.");
    persistRuntime(resolved);
    return;
  }

  persistRuntime(state);
  if (state.turn === "bot") {
    scheduleRuntimeAction(runWhotBotTurn, 420);
  }
}

GAME_ENGINES.tictactoe = {
  createState() {
    return {
      board: Array(9).fill(""),
      turn: "player",
      winner: null,
      note: "You are X. Claim the center early."
    };
  },
  render(runtime) {
    const state = runtime.state;
    return {
      title: "Tic-Tac-Toe Arena",
      copy: state.winner ? "Round complete." : state.turn === "player" ? "Your move." : "Bot is thinking...",
      html: `
        <div class="ttt-grid">
          ${state.board
            .map((cell, index) => {
              return `<button class="ttt-cell" type="button" data-ttt-cell="${index}" ${cell || state.winner || state.turn !== "player" ? "disabled" : ""}>${escapeHtml(cell)}</button>`;
            })
            .join("")}
        </div>
      `,
      notes: [
        { label: "Status", value: state.winner ? capitalize(state.winner) : capitalize(state.turn), copy: state.note },
        { label: "Symbols", value: "You are X", copy: "The bot plays O and responds automatically." }
      ],
      controls: [
        { label: "Control 1", value: "Click any empty square to place X." },
        { label: "Control 2", value: "The bot replies after your move." },
        { label: "Control 3", value: "Three in a row wins the round." }
      ],
      bind() {
        document.querySelectorAll("[data-ttt-cell]").forEach((button) => {
          button.addEventListener("click", () => handleTicTacToeMove(Number(button.dataset.tttCell)));
        });
      }
    };
  }
};

function handleTicTacToeMove(index) {
  const state = { ...activeRuntime.state, board: [...activeRuntime.state.board] };
  if (state.turn !== "player" || state.winner || state.board[index]) {
    return;
  }

  state.board[index] = "X";
  state.note = "You placed X.";
  const winner = getTicTacToeWinner(state.board);

  if (winner) {
    state.winner = winner === "draw" ? "draw" : winner === "X" ? "player" : "bot";
    persistRuntime(state);
    closeTicTacToe(state);
    return;
  }

  state.turn = "bot";
  state.note = "Bot is thinking...";
  persistRuntime(state);

  scheduleRuntimeAction(() => {
    const move = chooseTicTacToeMove(activeRuntime.state.board);
    const next = { ...activeRuntime.state, board: [...activeRuntime.state.board] };
    next.board[move] = "O";
    const outcome = getTicTacToeWinner(next.board);

    if (outcome) {
      next.winner = outcome === "draw" ? "draw" : outcome === "X" ? "player" : "bot";
      next.note = next.winner === "bot" ? "The bot closed a line." : "Board locked in a draw.";
      persistRuntime(next);
      closeTicTacToe(next);
      return;
    }

    next.turn = "player";
    next.note = "Your move.";
    persistRuntime(next);
  });
}

function getTicTacToeWinner(board) {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
  ];

  for (const [a, b, c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }

  if (board.every(Boolean)) {
    return "draw";
  }

  return null;
}

function chooseTicTacToeMove(board) {
  const open = board
    .map((cell, index) => ({ cell, index }))
    .filter((entry) => !entry.cell)
    .map((entry) => entry.index);

  for (const index of open) {
    const copy = [...board];
    copy[index] = "O";
    if (getTicTacToeWinner(copy) === "O") {
      return index;
    }
  }

  for (const index of open) {
    const copy = [...board];
    copy[index] = "X";
    if (getTicTacToeWinner(copy) === "X") {
      return index;
    }
  }

  const preference = [4, 0, 2, 6, 8, 1, 3, 5, 7];
  return preference.find((index) => open.includes(index)) ?? open[0];
}

function closeTicTacToe(state) {
  if (state.winner === "player") {
    finishActiveGame("win", "You outplayed the bot in Tic-Tac-Toe.");
  } else if (state.winner === "bot") {
    finishActiveGame("loss", "The bot closed the line before you could recover.");
  } else {
    finishActiveGame("draw", "The board filled up without a winner.");
  }
}

GAME_ENGINES.ayo = {
  createState() {
    return {
      pits: [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
      captured: { player: 0, bot: 0 },
      turn: "player",
      winner: null,
      turnCount: 0,
      note: "Pick a lower pit to sow your first seeds."
    };
  },
  render(runtime) {
    const state = runtime.state;
    const topIndices = [11, 10, 9, 8, 7, 6];
    const bottomIndices = [0, 1, 2, 3, 4, 5];
    return {
      title: "Ayo Board",
      copy: state.winner ? "Capture totals are locked." : state.turn === "player" ? "Your lower row is active." : "The bot is sowing from the upper row.",
      html: `
        <div class="ayo-grid">
          <div class="capture-strip">
            <div class="mini-panel">
              <small>Bot captures</small>
              <strong>${state.captured.bot}</strong>
            </div>
            <div class="mini-panel">
              <small>Your captures</small>
              <strong>${state.captured.player}</strong>
            </div>
          </div>
          <div class="ayo-row">
            ${topIndices.map((index) => renderAyoPit(index, state, false)).join("")}
          </div>
          <div class="ayo-row">
            ${bottomIndices.map((index) => renderAyoPit(index, state, true)).join("")}
          </div>
        </div>
      `,
      notes: [
        { label: "Turn", value: state.winner ? capitalize(state.winner) : capitalize(state.turn), copy: state.note },
        { label: "Seed total", value: String(state.pits.reduce((sum, pit) => sum + pit, 0)), copy: "Watch the board count as well as captures." }
      ],
      controls: [
        { label: "Control 1", value: "Click one of your lower bowls to sow its seeds." },
        { label: "Control 2", value: "Captures happen when your final seed leaves 2 or 3 in an enemy bowl." },
        { label: "Control 3", value: "The higher capture total wins when the round closes." }
      ],
      bind() {
        document.querySelectorAll("[data-ayo-pit]").forEach((button) => {
          button.addEventListener("click", () => handleAyoMove(Number(button.dataset.ayoPit)));
        });
      }
    };
  }
};

function renderAyoPit(index, state, isPlayerRow) {
  const clickable = isPlayerRow && state.turn === "player" && !state.winner && state.pits[index] > 0;
  return `
    <button class="pit-button" type="button" data-ayo-pit="${index}" ${clickable ? "" : "disabled"}>
      <small>${clickable ? "Play" : "Pit"}</small>
      <span class="pit-count">${state.pits[index]}</span>
    </button>
  `;
}

function handleAyoMove(index) {
  if (!activeRuntime || activeRuntime.state.turn !== "player") {
    return;
  }

  const next = playAyoMove(activeRuntime.state, index, "player");
  if (!next) {
    return;
  }

  persistRuntime(next);

  if (next.winner) {
    closeAyo(next);
    return;
  }

  scheduleRuntimeAction(() => {
    const botMove = chooseAyoBotMove(activeRuntime.state);
    if (botMove === null) {
      const stalled = closeAyoRound({ ...activeRuntime.state, winner: "player", note: "Bot ran out of legal pits." });
      persistRuntime(stalled);
      closeAyo(stalled);
      return;
    }

    const afterBot = playAyoMove(activeRuntime.state, botMove, "bot");
    persistRuntime(afterBot);

    if (afterBot.winner) {
      closeAyo(afterBot);
    }
  });
}

function playAyoMove(state, pitIndex, side) {
  const next = {
    pits: [...state.pits],
    captured: { ...state.captured },
    turn: state.turn,
    winner: state.winner,
    turnCount: state.turnCount,
    note: state.note
  };

  const lower = side === "player" ? 0 : 6;
  const upper = side === "player" ? 5 : 11;

  if (pitIndex < lower || pitIndex > upper || next.pits[pitIndex] === 0) {
    return null;
  }

  let seeds = next.pits[pitIndex];
  next.pits[pitIndex] = 0;
  let current = pitIndex;

  while (seeds > 0) {
    current = (current + 1) % 12;
    if (current === pitIndex) {
      continue;
    }
    next.pits[current] += 1;
    seeds -= 1;
  }

  let captured = 0;
  const onOpponentSide = side === "player"
    ? (index) => index >= 6
    : (index) => index <= 5;

  while (onOpponentSide(current) && next.pits[current] >= 2 && next.pits[current] <= 3) {
    captured += next.pits[current];
    next.pits[current] = 0;
    current = (current + 11) % 12;
  }

  next.captured[side] += captured;
  next.turn = side === "player" ? "bot" : "player";
  next.turnCount += 1;
  next.note = `${side === "player" ? "You" : "Bot"} captured ${captured} seed${captured === 1 ? "" : "s"}.`;

  return closeAyoRound(next);
}

function closeAyoRound(state) {
  const next = {
    pits: [...state.pits],
    captured: { ...state.captured },
    turn: state.turn,
    winner: state.winner,
    turnCount: state.turnCount,
    note: state.note
  };

  const playerSeeds = next.pits.slice(0, 6).reduce((sum, value) => sum + value, 0);
  const botSeeds = next.pits.slice(6).reduce((sum, value) => sum + value, 0);

  if (next.captured.player >= 25 || next.captured.bot >= 25 || playerSeeds === 0 || botSeeds === 0 || next.turnCount > 120) {
    next.captured.player += playerSeeds;
    next.captured.bot += botSeeds;
    next.pits = Array(12).fill(0);

    if (next.captured.player > next.captured.bot) {
      next.winner = "player";
      next.note = `You closed the board ${next.captured.player} to ${next.captured.bot}.`;
    } else if (next.captured.bot > next.captured.player) {
      next.winner = "bot";
      next.note = `Bot closed the board ${next.captured.bot} to ${next.captured.player}.`;
    } else {
      next.winner = "draw";
      next.note = "Ayo ended level on captures.";
    }
  }

  return next;
}

function chooseAyoBotMove(state) {
  const candidates = [];

  for (let index = 6; index < 12; index += 1) {
    if (state.pits[index] === 0) {
      continue;
    }
    const preview = playAyoMove(state, index, "bot");
    if (!preview) {
      continue;
    }
    const gained = preview.captured.bot - state.captured.bot;
    const remaining = preview.pits.slice(6).reduce((sum, value) => sum + value, 0);
    candidates.push({
      index,
      score: gained * 10 + remaining
    });
  }

  if (!candidates.length) {
    return null;
  }

  candidates.sort((left, right) => right.score - left.score);
  return candidates[0].index;
}

function closeAyo(state) {
  if (state.winner === "player") {
    finishActiveGame("win", "You collected the stronger Ayo capture line.");
  } else if (state.winner === "bot") {
    finishActiveGame("loss", "The bot harvested more seeds before the board closed.");
  } else {
    finishActiveGame("draw", "Ayo ended level on capture totals.");
  }
}

const WHOT_SHAPES = [
  { key: "circle", label: "Circle", code: "CI" },
  { key: "triangle", label: "Triangle", code: "TR" },
  { key: "cross", label: "Cross", code: "CR" },
  { key: "square", label: "Square", code: "SQ" },
  { key: "star", label: "Star", code: "ST" }
];

const WHOT_CARD_VALUES = {
  circle: [1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 13, 14],
  triangle: [1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 13, 14],
  cross: [1, 2, 3, 5, 7, 10, 11, 13, 14],
  square: [1, 2, 3, 5, 7, 10, 11, 13, 14],
  star: [1, 2, 3, 4, 5, 7, 8]
};

const WHOT_WILD_ASSETS = ["whot-20-1.png", "whot-20-2.png", "whot-20-3.png", "whot-20-4.png", "whot-20-5.png"];
const WHOT_SOUND_ASSETS = {
  select: "sounds/Click.mp3",
  play: "sounds/Coin.mp3",
  win: "sounds/Win.mp3",
  background: "sounds/whot/whot-background-music.mp3",
  cardPlay: "sounds/whot/card-play.wav",
  iNeed: "sounds/whot/i-need.mp3",
  continue: "sounds/whot/continue.mp3",
  holdOn: "sounds/whot/hold-on.mp3",
  suspension: "sounds/whot/suspension.mp3",
  pickTwo: "sounds/whot/pick-2.mp3",
  lastCard: "sounds/whot/last-card.mp3",
  checkUp: "sounds/whot/check-up.mp3",
  generalMarket: "sounds/whot/general-market.mp3",
  winning: "sounds/whot/winning.mp3",
  requestShape: {
    circle: "sounds/whot/circle.mp3",
    triangle: "sounds/whot/triangle.mp3",
    cross: "sounds/whot/cross.mp3",
    square: "sounds/whot/square.mp3",
    star: "sounds/whot/star.mp3"
  }
};
const LUDO_SOUND_ASSETS = {
  roll: "sounds/ludo/rolling-dice.mp3",
  move: "sounds/ludo/seed-move.mp3",
  kill: "sounds/ludo/seed-kill.wav",
  open: "sounds/Click.mp3"
};
const WHOT_PLAYER_TURN_LIMIT_MS = 15000;
const WHOT_CARD_SYMBOLS = {
  circle: "\u25CF",
  triangle: "\u25B2",
  cross: "\u271A",
  square: "\u25A0",
  star: "\u2605",
  whot: "WHOT"
};

GAME_ENGINES.whot = {
  createState() {
    return createWhotState();
  },
  render(runtime) {
    const state = runtime.state;
    const topCard = state.discard[state.discard.length - 1];
    const isLocked = Boolean(runtime.animating);
    const requestSelectionLive = Boolean(state.pendingRequestSelection);
    const scoreRevealLive = Boolean(state.scoreReveal);
    const selectedCard = Number.isInteger(state.selectedIndex) ? state.playerHand[state.selectedIndex] : null;
    const requestedLabel = state.requestShape ? whotShapeLabel(state.requestShape) : "Open play";
    const pickTwoLive = state.pendingEffect && state.pendingEffect.type === "pick2";
    const playerHasPickTwoCounter = hasWhotValue(state.playerHand, 2);
    const drawDisabled = state.turn !== "player"
      || state.winner
      || isLocked
      || requestSelectionLive
      || scoreRevealLive;
    const currentCallLabel = scoreRevealLive
      ? "Final count"
      : requestSelectionLive
      ? "Choose request"
      : pickTwoLive
      ? "Pick two live"
      : state.requestShape
        ? `Requested ${requestedLabel}`
        : "Open play";
    const opponentPreviewCount = Math.max(1, Math.min(state.botHand.length || 1, 6));
    const selectedPrompt = requestSelectionLive
      ? "Choose the shape you need before the turn passes."
      : pickTwoLive && state.turn === "player"
        ? playerHasPickTwoCounter
          ? "Pick two is live. Use a 2 to counter it, or go to market and draw."
          : "Pick two is live and you have no 2 card. Go to market to draw."
        : selectedCard
          ? `${labelWhotCard(selectedCard)} selected. Tap again to play it, drag it to the center pile, or go to market.`
          : "Select a card to play, or go to market and pass.";
    const calloutCopy = whotCallCopy(state, topCard, selectedCard, playerHasPickTwoCounter);
    const userWins = Number(runtime.user && runtime.user.wins ? runtime.user.wins : 0);
    const userGames = Number(runtime.user && runtime.user.games ? runtime.user.games : 0);
    const playerNameRaw = runtime.user && (runtime.user.displayName || runtime.user.username || runtime.user.name || runtime.user.email) ? (runtime.user.displayName || runtime.user.username || runtime.user.name || runtime.user.email) : "You";
    const playerName = String(playerNameRaw).trim() || "You";
    const playerInitial = playerName.charAt(0).toUpperCase() || "Y";
    const opponentInitial = "O";
    const tableStatus = scoreRevealLive && !state.winner
      ? "Counting cards"
      : state.winner
      ? (state.winner === "draw" ? "Round drawn" : `${capitalize(state.winner)} won`)
      : requestSelectionLive
        ? "Choose request"
        : state.turn === "player"
          ? "Your turn"
          : "Opponent thinking";
    return {
      title: "Whot Table",
      copy: scoreRevealLive && !state.winner
        ? "The draw pile is finished. Remaining cards are being counted live to decide the winner."
        : state.winner
        ? state.finishReason === "deck"
          ? "Draw pile exhausted. Lowest hand total wins the round."
          : "Round complete."
        : "Select a valid card to raise it. Tap the selected card again to throw it into the center pile. Draw pile, status, and side panels now feel like a playable match screen.",
      html: `
        <div class="whot-layout">
          <div class="table-wrap">
            <div class="whot-table whot-table-board">
              <div class="score-badge">
                <span class="profile-avatar profile-avatar-player" aria-hidden="true">${escapeHtml(playerInitial)}</span>
                <div class="score-badge-copy">
                  <small>Wins</small>
                  <strong>${escapeHtml(String(userWins))}</strong>
                </div>
              </div>
              <div class="status-badge ${state.turn === "player" && !state.winner ? "is-live" : ""}">
                <span class="status-dot" aria-hidden="true"></span>
                <span>${escapeHtml(tableStatus)}</span>
                <span
                  id="whotTurnTimer"
                  class="whot-turn-timer ${state.turn === "player" && !state.winner && !requestSelectionLive ? "" : "is-hidden"}"
                  aria-live="polite"
                >15s</span>
              </div>
              <div class="drop-zone" data-whot-drop-zone aria-hidden="true"></div>
              <div class="opponent-zone">
                <div class="zone-meta">
                  <span class="seat-pill opponent-seat">
                    <span class="profile-avatar profile-avatar-opponent" aria-hidden="true">${escapeHtml(opponentInitial)}</span>
                    <span>Opponent</span>
                  </span>
                  <span>${escapeHtml(`${state.turn === "bot" && !state.winner ? "Playing response..." : "Waiting"} - ${state.botHand.length} cards in hand`)}</span>
                </div>
                <div class="opponent-hand" aria-label="Opponent cards">
                  ${Array.from({ length: opponentPreviewCount })
                    .map((_, index) =>
                      renderWhotCardSurface(null, {
                        hidden: true,
                        classes: ["whot-opponent-card"],
                        style: whotOpponentCardStyle(index, opponentPreviewCount),
                        extraAttrs: `data-whot-opponent-card="${index}" aria-hidden="true"`
                      })
                    )
                    .join("")}
                </div>
              </div>
              <div class="center-zone">
                <div class="draw-pile-wrap">
                  <div class="pile-label">Go market</div>
                  <button
                    id="drawWhotCard"
                    class="draw-stack-button"
                    type="button"
                    aria-label="Draw one Whot card"
                    ${drawDisabled ? "disabled" : ""}
                  >
                    <div class="draw-stack" aria-hidden="true">
                      ${renderWhotCardSurface(null, {
                        hidden: true,
                        classes: ["whot-deck-card", "stack-low"],
                        extraAttrs: 'aria-hidden="true"'
                      })}
                      ${renderWhotCardSurface(null, {
                        hidden: true,
                        classes: ["whot-deck-card", "stack-mid"],
                        extraAttrs: 'aria-hidden="true"'
                      })}
                      ${renderWhotCardSurface(null, {
                        hidden: true,
                        classes: ["whot-deck-card", "stack-top"],
                        extraAttrs: 'aria-hidden="true"'
                      })}
                    </div>
                  </button>
                  <div class="draw-pile-meta">
                    <strong>${escapeHtml(String(state.deck.length))} cards left</strong>
                    <span aria-hidden="true">•</span>
                    <span>Market is always open. Draw and pass anytime.</span>
                  </div>
                </div>
                <div class="play-pile-wrap center-pile">
                  <div class="pile-label">Center pile</div>
                  ${renderWhotCardSurface(topCard, {
                    classes: ["whot-center-card"],
                    extraAttrs: 'aria-hidden="true"'
                  })}
                  <div class="requested-call">${escapeHtml(currentCallLabel)}</div>
                </div>
                <div class="draw-pile-wrap match-call-wrap ${requestSelectionLive ? "has-request-picker" : ""} ${scoreRevealLive ? "has-score-reveal" : ""}">
                  ${scoreRevealLive
                    ? renderWhotScoreReveal(state.scoreReveal)
                    : requestSelectionLive
                    ? renderWhotRequestOptions(isLocked || state.winner)
                    : `
                      <div class="pile-label">${escapeHtml(selectedCard ? "Selected card" : "Match call")}</div>
                      <div class="pile-note">${escapeHtml(calloutCopy)}</div>
                    `}
                </div>
              </div>
              <div class="player-zone">
                <div class="player-meta">
                  <div class="player-seat">
                    <span class="profile-avatar profile-avatar-player" aria-hidden="true">${escapeHtml(playerInitial)}</span>
                    <span>${escapeHtml(playerName)}</span>
                  </div>
                  <div class="player-meta-stats">
                    <div class="title">Wins: ${escapeHtml(String(userWins))}</div>
                    <p>${escapeHtml(`${userGames} matches logged`)}</p>
                  </div>
                </div>
                <div class="player-hand">
                  ${state.playerHand
                    .map((card, index) => {
                      const playable = canPlayWhotCard(card, topCard, state.requestShape, state.pendingEffect);
                      const selected = state.selectedIndex === index;
                      return `
                        <button
                          class="whot-card-slot"
                          type="button"
                          data-whot-card="${index}"
                          aria-label="${escapeHtml(`${whotCardAlt(card)}. ${playable ? "Playable now." : "Blocked right now."}`)}"
                          aria-pressed="${selected ? "true" : "false"}"
                          ${state.turn !== "player" || state.winner || isLocked || requestSelectionLive || scoreRevealLive ? "disabled" : ""}
                        >
                          ${renderWhotCardSurface(card, {
                            classes: [
                              "playable-card",
                              selected ? "active selected" : "",
                              playable ? "" : "blocked"
                            ],
                            style: whotPlayerCardStyle(index, state.playerHand.length),
                            extraAttrs: `data-whot-card-face="${index}" aria-hidden="true"`
                          })}
                        </button>
                      `;
                    })
                    .join("")}
                </div>
              </div>
            </div>
          </div>
        </div>
      `,
      notes: [
        {
          label: scoreRevealLive ? "Card count" : "Status",
          value: state.winner ? (state.winner === "draw" ? "Draw" : capitalize(state.winner)) : scoreRevealLive ? "Counting live" : state.turn === "player" ? "Your turn" : "Opponent thinking",
          copy: state.message
        },
        {
          label: scoreRevealLive ? "Final count" : "Match line",
          value: currentCallLabel,
          copy: scoreRevealLive
            ? "Every remaining card is counted live on the table. Lowest total wins when the market is finished."
            : state.requestShape
            ? `Center pile is showing ${labelWhotCard(topCard)}. Requested ${requestedLabel} stays active until it is answered. Draw pile: ${state.deck.length} cards left.`
            : `Center pile is showing ${labelWhotCard(topCard)}. Draw pile: ${state.deck.length} cards left.`
        }
      ],
      controls: [
        { label: "Drag", value: "Drag a valid card toward the center zone until it lights up, then release." },
        { label: "Commands", value: "2 is pick two, 14 is general market, 1 and 8 keep your turn, and 20 lets you request the next shape." },
        { label: "Timer", value: "The market is always open, and if you wait 15 seconds the game draws for you and passes the turn." }
      ],
      bind() {
        ensureWhotDragListeners();
        document.getElementById("drawWhotCard")?.addEventListener("click", handleWhotDraw);
        document.querySelectorAll("[data-whot-card]").forEach((button) => {
          const index = Number(button.dataset.whotCard);
          button.addEventListener("click", (event) => {
            if (Date.now() < whotSuppressClickUntil) {
              event.preventDefault();
              return;
            }
            handleWhotPlay(index);
          });
          button.querySelector(`[data-whot-card-face="${index}"]`)?.addEventListener("pointerdown", (event) => {
            beginWhotDrag(index, event);
          });
        });
        document.querySelectorAll("[data-whot-request]").forEach((button) => {
          button.addEventListener("click", () => {
            handleWhotRequestSelection(button.dataset.whotRequest || "");
          });
        });
      }
    };
  }
};

function createWhotState() {
  let deck = shuffle(createWhotDeck());
  const playerHand = deck.splice(0, 6);
  const botHand = deck.splice(0, 6);
  let top = deck.shift();

  while (top && top.shape === "whot") {
    deck.push(top);
    top = deck.shift();
  }

  return {
    deck,
    discard: [top],
    playerHand,
    botHand,
    requestShape: null,
    pendingEffect: null,
    pendingRequestSelection: false,
    turn: "player",
    turnSerial: 1,
    turnDeadlineAt: Date.now() + WHOT_PLAYER_TURN_LIMIT_MS,
    scoreReveal: null,
    winner: null,
    finishReason: null,
    message: "Match the pile by shape or value.",
    selectedIndex: null
  };
}

function createWhotDeck() {
  const deck = [];
  let counter = 0;

  for (const shape of WHOT_SHAPES) {
    for (const value of WHOT_CARD_VALUES[shape.key] || []) {
      deck.push({ id: `card-${counter += 1}`, shape: shape.key, value, asset: `${shape.key}-${value}.png` });
    }
  }

  for (const asset of WHOT_WILD_ASSETS) {
    deck.push({ id: `card-${counter += 1}`, shape: "whot", value: 20, asset });
  }

  return deck;
}

function shuffle(items) {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }

  return copy;
}

function labelWhotCard(card) {
  if (!card) {
    return "";
  }
  if (card.shape === "whot") {
    return "WHOT";
  }
  const shape = WHOT_SHAPES.find((entry) => entry.key === card.shape);
  return `${shape ? shape.code : card.shape} ${card.value}`;
}

function whotPenaltyLabel(effect) {
  if (!effect) {
    return "Open play";
  }
  if (effect.type === "pick2") {
    return "Pick two";
  }
  return capitalize(effect.type);
}

function whotRespondingActor(effect) {
  if (!effect || !effect.source) {
    return null;
  }
  return effect.source === "player" ? "bot" : "player";
}

function whotCallCopy(state, topCard, selectedCard, playerHasPickTwoCounter) {
  if (state.pendingRequestSelection) {
    return "Choose triangle, circle, cross, square, or star. The next player must answer your request or draw and pass.";
  }
  if (selectedCard) {
    if (state.pendingEffect && state.pendingEffect.type === "pick2" && state.turn === "player") {
      return playerHasPickTwoCounter
        ? "Pick two is live. Counter with one of your 2 cards, or go to market and take the penalty draw."
        : "Pick two is live and you have no 2 card. Go to market and take the penalty draw.";
    }
    return `${labelWhotCard(selectedCard)} selected. ${canPlayWhotCard(selectedCard, topCard, state.requestShape, state.pendingEffect) ? "Tap again to play it, drag it into the center pile, or go to market." : "Pick another card or go to market."}`;
  }
  if (state.pendingEffect && state.pendingEffect.type === "pick2") {
    return `${capitalize(whotRespondingActor(state.pendingEffect) || state.turn)} must answer pick two with another 2, or choose market and draw 2 cards.`;
  }
  if (state.requestShape) {
    return `Requested ${whotShapeLabel(state.requestShape)}. The next player can answer it, or choose market and draw before passing.`;
  }
  return "Match by shape or value. Drag a valid card into the center zone, tap to play, or go to market and pass.";
}

function whotHandScore(hand) {
  return (hand || []).reduce((sum, card) => {
    const value = Number(card && card.value ? card.value : 0);
    return sum + (card && card.shape === "star" ? value * 2 : value);
  }, 0);
}

function whotCardCountValue(card) {
  const value = Number(card && card.value ? card.value : 0);
  return card && card.shape === "star" ? value * 2 : value;
}

function whotScoreEntryLabel(card) {
  if (!card) {
    return "Unknown";
  }
  if (card.shape === "whot") {
    return "WHOT 20";
  }
  return `${whotShapeLabel(card.shape)} ${card.value}`;
}

function createWhotScoreReveal(state, reason) {
  return {
    phase: "player",
    reason,
    playerEntries: (state.playerHand || []).map((card) => ({
      id: card.id,
      label: whotScoreEntryLabel(card),
      points: whotCardCountValue(card)
    })),
    botEntries: (state.botHand || []).map((card) => ({
      id: card.id,
      label: whotScoreEntryLabel(card),
      points: whotCardCountValue(card)
    })),
    playerShown: 0,
    botShown: 0,
    playerTotal: 0,
    botTotal: 0
  };
}

function renderWhotScoreReveal(reveal) {
  if (!reveal) {
    return "";
  }

  const playerShown = reveal.playerEntries.slice(0, Number(reveal.playerShown || 0));
  const botShown = reveal.botEntries.slice(0, Number(reveal.botShown || 0));
  const playerPending = Math.max(0, reveal.playerEntries.length - playerShown.length);
  const botPending = Math.max(0, reveal.botEntries.length - botShown.length);

  return `
    <div class="whot-score-reveal" role="status" aria-live="polite">
      <div class="whot-score-head">
        <div class="pile-label">Final count</div>
        <div class="whot-score-phase">${escapeHtml(reveal.phase === "done" ? "Winner decided" : "Counting live")}</div>
      </div>
      <div class="whot-score-grid">
        <div class="whot-score-team">
          <div class="whot-score-team-head">
            <span>You</span>
            <strong>${escapeHtml(String(reveal.playerTotal || 0))}</strong>
          </div>
          <div class="whot-score-list">
            ${playerShown.map((entry) => `
              <div class="whot-score-entry">
                <span>${escapeHtml(entry.label)}</span>
                <strong>${escapeHtml(String(entry.points))}</strong>
              </div>
            `).join("") || `<div class="whot-score-entry is-muted"><span>Waiting to count...</span><strong>0</strong></div>`}
            ${playerPending ? `<div class="whot-score-pending">${escapeHtml(String(playerPending))} card${playerPending === 1 ? "" : "s"} left</div>` : ""}
          </div>
        </div>
        <div class="whot-score-team">
          <div class="whot-score-team-head">
            <span>Opponent</span>
            <strong>${escapeHtml(String(reveal.botTotal || 0))}</strong>
          </div>
          <div class="whot-score-list">
            ${botShown.map((entry) => `
              <div class="whot-score-entry">
                <span>${escapeHtml(entry.label)}</span>
                <strong>${escapeHtml(String(entry.points))}</strong>
              </div>
            `).join("") || `<div class="whot-score-entry is-muted"><span>Waiting to count...</span><strong>0</strong></div>`}
            ${botPending ? `<div class="whot-score-pending">${escapeHtml(String(botPending))} card${botPending === 1 ? "" : "s"} left</div>` : ""}
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderWhotRequestOptions(disabled = false) {
  return `
    <div class="whot-request-picker" role="group" aria-label="Choose requested shape">
      <div class="whot-request-head">
        <div class="whot-request-kicker">Request shape</div>
      </div>
      <div class="whot-request-grid">
        ${WHOT_SHAPES.map((shape) => `
          <button
            class="whot-request-button"
            type="button"
            data-whot-request="${escapeHtml(shape.key)}"
            aria-label="${escapeHtml(`Request ${shape.label}`)}"
            ${disabled ? "disabled" : ""}
          >
            <span class="whot-request-card tone-${escapeHtml(whotCardTone(shape.key))}" aria-hidden="true">
              <span class="whot-request-center">
                <span class="shape ${escapeHtml(shape.key)}"></span>
              </span>
            </span>
            <span class="whot-request-name">${escapeHtml(shape.label)}</span>
          </button>
        `).join("")}
      </div>
      <div class="whot-request-caption">Choose what the next player must answer.</div>
    </div>
  `;
}

function resolveWhotDeckExhaustion(state, reason) {
  const next = cloneWhotState(state);
  next.finishReason = "deck";
  next.pendingEffect = null;
  next.pendingRequestSelection = false;
  next.requestShape = null;
  next.selectedIndex = null;
  next.turnDeadlineAt = 0;
  next.winner = null;
  next.scoreReveal = createWhotScoreReveal(next, reason);
  next.message = `${reason} Counting the remaining cards live to decide the winner.`;
  return next;
}

function hasWhotValue(hand, value) {
  return (hand || []).some((card) => Number(card && card.value) === Number(value));
}

function hasPlayableWhotCard(hand, topCard, requestedShape, pendingEffect = null) {
  return (hand || []).some((card) => canPlayWhotCard(card, topCard, requestedShape, pendingEffect));
}

function whotShapeLabel(shapeKey) {
  const shape = WHOT_SHAPES.find((entry) => entry.key === shapeKey);
  return shape ? shape.label : capitalize(shapeKey);
}

function whotCardTag(shapeKey) {
  const tags = {
    circle: "CIR",
    triangle: "TRI",
    cross: "CRS",
    square: "SQR",
    star: "STR",
    whot: "WHOT"
  };
  return tags[shapeKey] || capitalize(shapeKey).slice(0, 3);
}

function whotCardTone(shape) {
  return shape === "triangle" || shape === "cross" || shape === "whot" ? "red" : "black";
}

function whotCardSymbol(shape) {
  return WHOT_CARD_SYMBOLS[shape] || WHOT_CARD_SYMBOLS.whot;
}

function whotPlayerCardStyle(index, total) {
  const middle = (Math.max(total, 1) - 1) / 2;
  const offset = index - middle;
  return `--spread-angle:${(offset * 5).toFixed(2)}deg;--spread-lift:${(Math.abs(offset) * 5).toFixed(2)}px;`;
}

function whotOpponentCardStyle(index, total) {
  const middle = (Math.max(total, 1) - 1) / 2;
  const offset = index - middle;
  return `--fan-rotate:${(offset * 4).toFixed(2)}deg;--fan-lift:${(Math.abs(offset) * 4).toFixed(2)}px;`;
}

function renderWhotCardSurface(card, options = {}) {
  const hidden = Boolean(options.hidden);
  const classes = ["card", hidden ? "back-card" : "traditional-card", "whot-card-surface", ...(options.classes || [])].filter(Boolean);
  const styleAttr = options.style ? ` style="${escapeHtml(options.style)}"` : "";
  const extraAttrs = options.extraAttrs ? ` ${options.extraAttrs}` : "";

  if (hidden) {
    return `
      <div class="${classes.join(" ")}"${styleAttr}${extraAttrs}>
        <div class="whot-mark" aria-hidden="true">WHOT</div>
      </div>
    `;
  }

  const tone = whotCardTone(card && card.shape ? card.shape : "whot");
  const rank = card && card.shape === "whot" ? "20" : String(card && card.value ? card.value : "");
  const shapeKey = card && card.shape ? card.shape : "whot";
  const centerMarkup = shapeKey === "whot"
    ? `<div class="shape whot">WHOT</div>`
    : `<div class="shape ${escapeHtml(shapeKey)}" aria-hidden="true"></div>`;
  let cornerMarkMarkup = "";
  if (shapeKey === "whot") {
    cornerMarkMarkup = `<div class="corner-mark whot-letter" aria-hidden="true">W</div>`;
  } else if (shapeKey === "star") {
    cornerMarkMarkup = `
      <div class="corner-mark shape-star" aria-hidden="true">
        <span class="corner-mark-value">${escapeHtml(String(Number(card && card.value ? card.value : 0) * 2))}</span>
      </div>
    `;
  } else {
    cornerMarkMarkup = `<div class="corner-mark shape-${escapeHtml(shapeKey)}" aria-hidden="true"></div>`;
  }

  return `
    <div class="${classes.join(" ")} tone-${tone}"${styleAttr}${extraAttrs}>
      <div class="corner">
        <div class="n">${escapeHtml(rank)}</div>
        ${cornerMarkMarkup}
      </div>
      <div class="center">
        ${centerMarkup}
      </div>
      <div class="corner bottom">
        <div class="n">${escapeHtml(rank)}</div>
        ${cornerMarkMarkup}
      </div>
    </div>
  `;
}

function whotCardAlt(card) {
  if (!card) {
    return "Whot card";
  }
  if (card.shape === "whot") {
    return "Whot wild card";
  }
  return `${whotShapeLabel(card.shape)} ${card.value}`;
}

function playInterfaceSound(src, volume = 0.4) {
  const audio = createInterfaceAudio(src, volume);
  if (!audio) {
    return null;
  }

  const playback = startInterfaceAudio(audio);
  if (playback && typeof playback.catch === "function") {
    playback.catch(() => {});
  }
  return audio;
}

function createInterfaceAudio(src, volume = 0.4) {
  if (!src || typeof Audio === "undefined") {
    return null;
  }

  try {
    const audio = new Audio(src);
    audio.volume = volume;
    audio.preload = "auto";
    return audio;
  } catch (error) {
    return null;
  }
}

function startInterfaceAudio(audio) {
  if (!audio) {
    return null;
  }

  try {
    return audio.play() || null;
  } catch (error) {
    return null;
  }
}

function playLudoRollSound(handlers = {}) {
  const audio = createInterfaceAudio(LUDO_SOUND_ASSETS.roll, 0.42);
  if (!audio) {
    if (typeof handlers.onError === "function") {
      handlers.onError();
    }
    return null;
  }

  if (typeof handlers.onEnded === "function") {
    audio.onended = handlers.onEnded;
  }
  if (typeof handlers.onError === "function") {
    audio.onerror = handlers.onError;
  }
  if (typeof handlers.onLoadedMetadata === "function") {
    audio.onloadedmetadata = handlers.onLoadedMetadata;
  }

  const playback = startInterfaceAudio(audio);
  if (playback && typeof playback.catch === "function") {
    playback.catch(() => {
      if (typeof handlers.onError === "function") {
        handlers.onError();
      }
    });
  }
  return audio;
}

function playLudoMoveStepSound() {
  playInterfaceSound(LUDO_SOUND_ASSETS.move, 0.34);
}

function playLudoKillSound() {
  playInterfaceSound(LUDO_SOUND_ASSETS.kill, 0.46);
}

function playLudoHomeOpenSound() {
  playInterfaceSound(LUDO_SOUND_ASSETS.open, 0.24);
}

function shouldWhotMusicBePlaying() {
  return Boolean(
    activeRuntime
    && activeRuntime.match
    && activeRuntime.match.game === "whot"
    && !activeRuntime.finished
    && getWhotMusicEnabled()
  );
}

function shouldRetryWhotBackgroundMusic() {
  if (!shouldWhotMusicBePlaying()) {
    return false;
  }

  const audio = ensureWhotBackgroundAudio();
  return Boolean(audio && (audio.paused || whotBackgroundPendingUnlock));
}

function ensureWhotBackgroundAudio() {
  if (typeof Audio === "undefined") {
    return null;
  }
  if (!whotBackgroundAudio) {
    whotBackgroundAudio = new Audio(WHOT_SOUND_ASSETS.background);
    whotBackgroundAudio.loop = true;
    whotBackgroundAudio.volume = getWhotMusicVolume();
    whotBackgroundAudio.preload = "auto";
    whotBackgroundAudio.load();
  }
  return whotBackgroundAudio;
}

function getWhotMusicEnabled() {
  try {
    const stored = window.localStorage.getItem(WHOT_MUSIC_STORAGE_KEYS.enabled);
    return stored === null ? true : stored !== "false";
  } catch (error) {
    return true;
  }
}

function getWhotMusicVolume() {
  try {
    const stored = Number(window.localStorage.getItem(WHOT_MUSIC_STORAGE_KEYS.volume));
    if (Number.isFinite(stored)) {
      return Math.min(1, Math.max(0, stored));
    }
  } catch (error) {}
  return WHOT_MUSIC_DEFAULT_VOLUME;
}

function setWhotMusicEnabled(enabled) {
  try {
    window.localStorage.setItem(WHOT_MUSIC_STORAGE_KEYS.enabled, enabled ? "true" : "false");
  } catch (error) {}
  syncWhotBackgroundMusic();
  renderWhotMusicControls();
}

function setWhotMusicVolume(volume) {
  const nextVolume = Math.min(1, Math.max(0, volume));
  try {
    window.localStorage.setItem(WHOT_MUSIC_STORAGE_KEYS.volume, String(nextVolume));
  } catch (error) {}
  if (whotBackgroundAudio) {
    whotBackgroundAudio.volume = nextVolume;
  }
  renderWhotMusicControls();
}

function startWhotBackgroundMusic() {
  if (!getWhotMusicEnabled()) {
    whotBackgroundPendingUnlock = false;
    return;
  }
  const audio = ensureWhotBackgroundAudio();
  if (!audio) {
    return;
  }
  audio.volume = getWhotMusicVolume();
  if (!audio.paused) {
    whotBackgroundPendingUnlock = false;
    return;
  }
  try {
    const playback = audio.play();
    if (playback && typeof playback.then === "function") {
      playback.then(() => {
        whotBackgroundPendingUnlock = false;
      }).catch(() => {
        whotBackgroundPendingUnlock = true;
      });
    } else {
      whotBackgroundPendingUnlock = false;
    }
  } catch (error) {
    whotBackgroundPendingUnlock = true;
  }
}

function stopWhotBackgroundMusic(reset = false) {
  if (!whotBackgroundAudio) {
    whotBackgroundPendingUnlock = false;
    return;
  }
  whotBackgroundAudio.pause();
  if (reset) {
    whotBackgroundAudio.currentTime = 0;
  }
  whotBackgroundPendingUnlock = false;
}

function syncWhotBackgroundMusic() {
  const shouldPlay = Boolean(
    activeRuntime
    && activeRuntime.match
    && activeRuntime.match.game === "whot"
    && !activeRuntime.finished
  );
  if (shouldPlay && getWhotMusicEnabled()) {
    startWhotBackgroundMusic();
    return;
  }
  stopWhotBackgroundMusic(!shouldPlay);
}

function renderWhotMusicControls() {
  const target = document.getElementById("whotAudioControls");
  if (!target) {
    return;
  }
  const isWhotMatch = Boolean(activeRuntime && activeRuntime.match && activeRuntime.match.game === "whot");
  if (!isWhotMatch) {
    target.hidden = true;
    target.innerHTML = "";
    return;
  }

  const enabled = getWhotMusicEnabled();
  const volume = getWhotMusicVolume();
  const volumePercent = Math.round(volume * 100);

  target.hidden = false;
  target.innerHTML = `
    <div class="whot-audio-card">
      <div class="whot-audio-copy">
        <span class="whot-audio-title">Whot Music</span>
        <strong>${enabled ? "Background music on" : "Background music off"}</strong>
        <span>Adjust the WHOT table music or mute it anytime.</span>
      </div>
      <div class="whot-audio-actions">
        <button id="whotMusicToggle" class="whot-audio-toggle ${enabled ? "is-on" : ""}" type="button">
          ${enabled ? "Music On" : "Music Off"}
        </button>
        <div class="whot-audio-slider-row">
          <label for="whotMusicVolume">Volume</label>
          <input id="whotMusicVolume" class="whot-audio-slider" type="range" min="0" max="100" step="1" value="${volumePercent}">
          <strong>${volumePercent}%</strong>
        </div>
      </div>
    </div>
  `;

  document.getElementById("whotMusicToggle")?.addEventListener("click", () => {
    setWhotMusicEnabled(!getWhotMusicEnabled());
  });
  document.getElementById("whotMusicVolume")?.addEventListener("input", (event) => {
    const value = Number(event.currentTarget.value || 0) / 100;
    setWhotMusicVolume(value);
  });
}

function whotPlaySoundForCard(card) {
  if (card && card.shape === "whot") {
    return WHOT_SOUND_ASSETS.iNeed;
  }
  const value = Number(card && card.value);
  if (value === 1) {
    return WHOT_SOUND_ASSETS.holdOn;
  }
  if (value === 8) {
    return WHOT_SOUND_ASSETS.suspension;
  }
  if (value === 2) {
    return WHOT_SOUND_ASSETS.pickTwo;
  }
  if (value === 14) {
    return WHOT_SOUND_ASSETS.generalMarket;
  }
  return WHOT_SOUND_ASSETS.cardPlay;
}

function whotRequestSoundForShape(shapeKey) {
  return (WHOT_SOUND_ASSETS.requestShape && WHOT_SOUND_ASSETS.requestShape[shapeKey]) || WHOT_SOUND_ASSETS.select;
}

function isWhotContinueCardValue(value) {
  return value === 1 || value === 8 || value === 14;
}

function isWhotCoverUpState(state, actor) {
  const lastMove = state && state.lastPlayedMeta;
  if (!lastMove || lastMove.actor !== actor || state.turn !== actor) {
    return false;
  }

  return isWhotContinueCardValue(Number(lastMove.card && lastMove.card.value));
}

function playWhotMoveSounds(state) {
  const move = state && state.lastPlayedMeta;
  if (!move || !move.card) {
    return;
  }

  if (move.remainingHand === 0) {
    playInterfaceSound(WHOT_SOUND_ASSETS.checkUp, move.actor === "player" ? 0.52 : 0.42);
    return;
  }

  playInterfaceSound(
    move.coverUp ? WHOT_SOUND_ASSETS.continue : whotPlaySoundForCard(move.card),
    move.actor === "player" ? 0.46 : 0.34
  );

  if (move.actor !== "player") {
    if (move.card.shape === "whot" && state.requestShape) {
      window.setTimeout(() => {
        playInterfaceSound(whotRequestSoundForShape(state.requestShape), 0.32);
      }, 220);
    }
    return;
  }

  if (move.remainingHand === 1) {
    window.setTimeout(() => {
      playInterfaceSound(WHOT_SOUND_ASSETS.lastCard, 0.48);
    }, 170);
    return;
  }

}

function animateWhotCardToCenter({ fromEl, card, hidden = false, onComplete }) {
  const target = document.querySelector(".whot-center-card");
  if (!activeRuntime || !fromEl || !target) {
    if (typeof onComplete === "function") {
      onComplete();
    }
    return;
  }

  const runtimeId = activeRuntime.match.id;
  const fromRect = fromEl.getBoundingClientRect();
  const toRect = target.getBoundingClientRect();
  const ghostHost = document.createElement("div");
  ghostHost.innerHTML = renderWhotCardSurface(card, {
    hidden,
    classes: ["whot-card-ghost-face"],
    extraAttrs: 'aria-hidden="true"'
  });
  const ghost = ghostHost.firstElementChild;

  if (!ghost) {
    if (typeof onComplete === "function") {
      onComplete();
    }
    return;
  }

  ghost.classList.add("whot-card-ghost");
  ghost.style.left = `${fromRect.left}px`;
  ghost.style.top = `${fromRect.top}px`;
  ghost.style.width = `${fromRect.width}px`;
  ghost.style.height = `${fromRect.height}px`;
  document.body.appendChild(ghost);

  activeRuntime.animating = true;

  window.requestAnimationFrame(() => {
    ghost.style.left = `${toRect.left}px`;
    ghost.style.top = `${toRect.top}px`;
    ghost.style.width = `${toRect.width}px`;
    ghost.style.height = `${toRect.height}px`;
    ghost.style.transform = "rotate(-6deg) scale(1.02)";
    ghost.style.opacity = "0.98";
  });

  window.setTimeout(() => {
    ghost.remove();
    if (activeRuntime && activeRuntime.match.id === runtimeId) {
      activeRuntime.animating = false;
      if (typeof onComplete === "function") {
        onComplete();
      }
    }
  }, 420);
}

function bounceWhotCenterCard() {
  window.requestAnimationFrame(() => {
    const center = document.querySelector(".whot-center-card");
    if (!center) {
      return;
    }
    center.classList.remove("bounce");
    void center.offsetWidth;
    center.classList.add("bounce");
    window.setTimeout(() => {
      center.classList.remove("bounce");
    }, 240);
  });
}

function ensureWhotDragListeners() {
  if (ensureWhotDragListeners.bound) {
    return;
  }
  ensureWhotDragListeners.bound = true;
  window.addEventListener("pointermove", handleWhotDragMove);
  window.addEventListener("pointerup", handleWhotDragEnd);
  window.addEventListener("pointercancel", handleWhotDragEnd);
}

function clearWhotDragState() {
  const drag = whotDragState;
  const dropZone = document.querySelector("[data-whot-drop-zone]");
  dropZone?.classList.remove("active");
  if (!drag || !drag.cardEl) {
    whotDragState = null;
    return;
  }

  try {
    drag.cardEl.releasePointerCapture?.(drag.pointerId);
  } catch (error) {}

  drag.cardEl.classList.remove("dragging");
  if (!drag.wasSelected) {
    drag.cardEl.classList.remove("selected");
  }
  drag.cardEl.style.removeProperty("position");
  drag.cardEl.style.removeProperty("left");
  drag.cardEl.style.removeProperty("top");
  drag.cardEl.style.removeProperty("width");
  drag.cardEl.style.removeProperty("height");
  drag.cardEl.style.removeProperty("z-index");
  drag.cardEl.style.removeProperty("transition");
  drag.cardEl.style.removeProperty("pointer-events");
  drag.cardEl.style.removeProperty("transform");
  whotDragState = null;
}

function beginWhotDrag(index, event) {
  if (!activeRuntime || activeRuntime.match.game !== "whot" || activeRuntime.animating) {
    return;
  }

  const state = activeRuntime.state;
  if (state.pendingRequestSelection || state.scoreReveal) {
    return;
  }
  const top = state.discard[state.discard.length - 1];
  const card = state.playerHand[index];
  const playable = canPlayWhotCard(card, top, state.requestShape, state.pendingEffect);
  if (!card || !playable || state.turn !== "player" || state.winner) {
    return;
  }

  const cardEl = event.currentTarget;
  if (!(cardEl instanceof HTMLElement)) {
    return;
  }

  const rect = cardEl.getBoundingClientRect();
  whotDragState = {
    index,
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    offsetX: event.clientX - rect.left,
    offsetY: event.clientY - rect.top,
    homeLeft: rect.left,
    homeTop: rect.top,
    width: rect.width,
    height: rect.height,
    active: false,
    wasSelected: cardEl.classList.contains("selected"),
    cardEl
  };
}

function whotDragOverDropZone(cardEl, dropZone) {
  if (!cardEl || !dropZone) {
    return false;
  }
  const cardRect = cardEl.getBoundingClientRect();
  const dropRect = dropZone.getBoundingClientRect();
  return !(cardRect.right < dropRect.left || cardRect.left > dropRect.right || cardRect.bottom < dropRect.top || cardRect.top > dropRect.bottom);
}

function handleWhotDragMove(event) {
  const drag = whotDragState;
  if (!drag || event.pointerId !== drag.pointerId) {
    return;
  }

  const deltaX = event.clientX - drag.startX;
  const deltaY = event.clientY - drag.startY;
  if (!drag.active) {
    if (Math.hypot(deltaX, deltaY) < 10) {
      return;
    }
    drag.active = true;
    whotSuppressClickUntil = Date.now() + 260;
    drag.cardEl.classList.add("selected", "dragging");
    drag.cardEl.style.position = "fixed";
    drag.cardEl.style.left = `${drag.homeLeft}px`;
    drag.cardEl.style.top = `${drag.homeTop}px`;
    drag.cardEl.style.width = `${drag.width}px`;
    drag.cardEl.style.height = `${drag.height}px`;
    drag.cardEl.style.zIndex = "120";
    drag.cardEl.style.transition = "none";
    drag.cardEl.setPointerCapture?.(drag.pointerId);
  }

  const nextLeft = event.clientX - drag.offsetX;
  const nextTop = event.clientY - drag.offsetY;
  drag.cardEl.style.left = `${nextLeft}px`;
  drag.cardEl.style.top = `${nextTop}px`;
  drag.cardEl.style.setProperty("transform", `rotate(${(deltaX * 0.04).toFixed(2)}deg) scale(1.08)`, "important");

  const dropZone = document.querySelector("[data-whot-drop-zone]");
  dropZone?.classList.toggle("active", whotDragOverDropZone(drag.cardEl, dropZone));
}

function animateDraggedWhotCardToCenter(cardEl, onComplete) {
  const target = document.querySelector(".whot-center-card");
  if (!activeRuntime || !cardEl || !target) {
    if (typeof onComplete === "function") {
      onComplete();
    }
    return;
  }

  const runtimeId = activeRuntime.match.id;
  const cardRect = cardEl.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  activeRuntime.animating = true;
  cardEl.style.pointerEvents = "none";
  cardEl.style.transition = "left 0.26s ease, top 0.26s ease, transform 0.26s ease";
  window.requestAnimationFrame(() => {
    cardEl.style.left = `${targetRect.left + (targetRect.width - cardRect.width) / 2}px`;
    cardEl.style.top = `${targetRect.top + (targetRect.height - cardRect.height) / 2}px`;
    cardEl.style.setProperty("transform", "rotate(5deg) scale(1.08)", "important");
  });

  window.setTimeout(() => {
    if (activeRuntime && activeRuntime.match.id === runtimeId) {
      activeRuntime.animating = false;
      if (typeof onComplete === "function") {
        onComplete();
      }
    }
  }, 260);
}

function animateWhotDragReturn(drag) {
  if (!drag || !drag.cardEl) {
    clearWhotDragState();
    return;
  }
  drag.cardEl.style.transition = "left 0.32s cubic-bezier(.2,.9,.2,1), top 0.32s cubic-bezier(.2,.9,.2,1), transform 0.32s ease";
  drag.cardEl.style.left = `${drag.homeLeft}px`;
  drag.cardEl.style.top = `${drag.homeTop}px`;
  drag.cardEl.style.setProperty("transform", "", "important");
  window.setTimeout(() => {
    if (whotDragState && whotDragState.pointerId === drag.pointerId) {
      clearWhotDragState();
    } else {
      drag.cardEl.classList.remove("dragging");
      if (!drag.wasSelected) {
        drag.cardEl.classList.remove("selected");
      }
      drag.cardEl.style.removeProperty("position");
      drag.cardEl.style.removeProperty("left");
      drag.cardEl.style.removeProperty("top");
      drag.cardEl.style.removeProperty("width");
      drag.cardEl.style.removeProperty("height");
      drag.cardEl.style.removeProperty("z-index");
      drag.cardEl.style.removeProperty("transition");
      drag.cardEl.style.removeProperty("pointer-events");
      drag.cardEl.style.removeProperty("transform");
    }
  }, 320);
}

function finishWhotPlayerPlay(next) {
  playWhotMoveSounds(next);
  persistRuntime(next);
  bounceWhotCenterCard();

  if (next.winner) {
    closeWhot(next);
    return;
  }

  if (next.pendingRequestSelection) {
    playInterfaceSound(WHOT_SOUND_ASSETS.select, 0.22);
    return;
  }

  if (next.turn === "bot") {
    scheduleRuntimeAction(runWhotBotTurn, 420);
    return;
  }

  if (next.pendingEffect && next.pendingEffect.type === "pick2" && next.turn === "player" && !hasWhotValue(next.playerHand, 2)) {
    scheduleRuntimeAction(resolveWhotPlayerPenaltyTurn, 420);
  }
}

function resolveWhotPlayerPenaltyTurn() {
  if (!activeRuntime || activeRuntime.finished || activeRuntime.animating) {
    return;
  }

  const state = cloneWhotState(activeRuntime.state);
  const effect = state.pendingEffect;
  if (!effect || effect.type !== "pick2" || state.turn !== "player") {
    return;
  }

  if (hasWhotValue(state.playerHand, 2)) {
    return;
  }

  const drawn = drawWhotCards(state, "playerHand", effect.amount || 2);
  state.pendingEffect = null;
  state.selectedIndex = null;
  setWhotTurn(state, effect.source || "bot");
  state.message = `You had no 2 card, so you picked ${drawn} card${drawn === 1 ? "" : "s"}. ${capitalize(effect.source || "bot")} continues to cover the 2.`;
  playInterfaceSound(WHOT_SOUND_ASSETS.select, 0.24);

  if (state.deck.length === 0) {
    const resolved = resolveWhotDeckExhaustion(state, "The draw pile is exhausted.");
    persistRuntime(resolved);
    return;
  }

  persistRuntime(state);
  if (state.turn === "bot") {
    scheduleRuntimeAction(runWhotBotTurn, 420);
  }
}

function handleWhotDragEnd(event) {
  const drag = whotDragState;
  if (!drag || event.pointerId !== drag.pointerId) {
    return;
  }

  const dropZone = document.querySelector("[data-whot-drop-zone]");
  const overlaps = drag.active && whotDragOverDropZone(drag.cardEl, dropZone);
  dropZone?.classList.remove("active");

  if (!drag.active) {
    clearWhotDragState();
    return;
  }

  whotSuppressClickUntil = Date.now() + 360;
  const state = activeRuntime ? activeRuntime.state : null;
  const top = state ? state.discard[state.discard.length - 1] : null;
  const card = state ? state.playerHand[drag.index] : null;
  const playable = state && top && card ? canPlayWhotCard(card, top, state.requestShape, state.pendingEffect) : false;

  if (activeRuntime && overlaps && playable && state.turn === "player" && !state.winner && !activeRuntime.animating) {
    const next = playWhotCardForActor(state, "playerHand", drag.index, "player");
    whotDragState = null;
    animateDraggedWhotCardToCenter(drag.cardEl, () => {
      finishWhotPlayerPlay(next);
    });
    return;
  }

  whotDragState = drag;
  animateWhotDragReturn(drag);
  whotDragState = null;
}

function canPlayWhotCard(card, topCard, requestedShape, pendingEffect = null) {
  if (!card || !topCard) {
    return false;
  }
  if (pendingEffect && pendingEffect.type === "pick2") {
    return Number(card.value) === 2;
  }
  if (requestedShape) {
    return card.shape === requestedShape || card.shape === "whot";
  }
  if (card.shape === "whot") {
    return true;
  }
  return card.shape === topCard.shape || card.value === topCard.value;
}

function chooseRequestedWhotShape(hand) {
  const counts = {};
  for (const card of hand) {
    if (card.shape === "whot") {
      continue;
    }
    counts[card.shape] = (counts[card.shape] || 0) + 1;
  }
  const best = Object.entries(counts).sort((left, right) => right[1] - left[1])[0];
  return best ? best[0] : "circle";
}

function cloneWhotState(state) {
  return JSON.parse(JSON.stringify(state));
}

function refillWhotDeckIfNeeded(state) {
  return state;
}

function drawWhotCards(state, handKey, amount) {
  let drawn = 0;
  for (let count = 0; count < amount; count += 1) {
    refillWhotDeckIfNeeded(state);
    const card = state.deck.shift();
    if (!card) {
      break;
    }
    state[handKey].push(card);
    drawn += 1;
  }
  return drawn;
}

function setWhotTurn(state, turn, forceRestart = false) {
  const currentTurn = state.turn;
  const currentSerial = Number(state.turnSerial || 1);
  const nextSerial = forceRestart || currentTurn !== turn ? currentSerial + 1 : currentSerial;
  state.turn = turn;
  state.turnSerial = nextSerial;
  state.turnDeadlineAt = turn === "player" && !state.pendingRequestSelection && !state.winner
    ? Date.now() + WHOT_PLAYER_TURN_LIMIT_MS
    : 0;
  return state;
}

function playWhotCardForActor(state, handKey, index, actor) {
  const next = cloneWhotState(state);
  const hand = next[handKey];
  const card = hand.splice(index, 1)[0];
  const coverUp = isWhotCoverUpState(state, actor);
  next.discard.push(card);
  next.requestShape = null;
  next.pendingEffect = null;
  next.pendingRequestSelection = false;
  next.scoreReveal = null;
  next.selectedIndex = null;
  next.finishReason = null;
  next.lastPlayedMeta = {
    actor,
    card: { ...card },
    remainingHand: hand.length,
    coverUp
  };
  next.message = `${actor === "player" ? "You" : "Bot"} played ${labelWhotCard(card)}.`;
  const responder = actor === "player" ? "bot" : "player";
  const responderHandKey = responder === "player" ? "playerHand" : "botHand";

  if (hand.length === 0) {
    next.winner = actor;
    next.finishReason = "hand";
    next.turnDeadlineAt = 0;
    return next;
  }

  if (card.shape === "whot") {
    if (actor === "player") {
      setWhotTurn(next, "player");
      next.pendingRequestSelection = true;
      next.turnDeadlineAt = 0;
      next.message += " Choose the shape you need.";
      return next;
    }
    next.requestShape = chooseRequestedWhotShape(hand);
    setWhotTurn(next, responder);
    next.message += ` Requested ${whotShapeLabel(next.requestShape)}.`;
    return next;
  }

  if (card.value === 2) {
    next.pendingEffect = { type: "pick2", source: actor, amount: 2 };
    setWhotTurn(next, responder);
    next.message += ` Pick two is live. ${capitalize(responder)} must answer with 2 or draw 2.`;
    return next;
  }

  if (card.value === 14) {
    const drawn = drawWhotCards(next, responderHandKey, 1);
    if (next.deck.length === 0) {
      return resolveWhotDeckExhaustion(next, `${actor === "player" ? "You" : "Bot"} triggered general market and the draw pile ended.`);
    }
    setWhotTurn(next, actor, true);
    next.message += drawn
      ? ` General market. ${capitalize(responder)} picked 1 card and you play again.`
      : " General market could not draw because the pile is empty.";
    return next;
  }

  if (card.value === 1) {
    setWhotTurn(next, actor, true);
    next.message += " Hold on. You keep the turn.";
    return next;
  }

  if (card.value === 8) {
    setWhotTurn(next, actor, true);
    next.message += " Suspension. You keep the turn.";
    return next;
  }

  setWhotTurn(next, responder);
  return next;
}

function handleWhotPlay(index) {
  if (!activeRuntime) {
    return;
  }
  const state = activeRuntime.state;
  if (state.scoreReveal) {
    return;
  }
  const top = state.discard[state.discard.length - 1];
  const card = state.playerHand[index];
  const playable = canPlayWhotCard(card, top, state.requestShape, state.pendingEffect);

  if (state.turn !== "player" || state.winner || activeRuntime.animating || !card) {
    return;
  }

  if (state.selectedIndex !== index) {
    const next = cloneWhotState(state);
    next.selectedIndex = index;
    next.message = playable
      ? state.pendingEffect && state.pendingEffect.type === "pick2"
        ? `${labelWhotCard(card)} selected. Tap again to counter pick two.`
        : `${labelWhotCard(card)} selected. Tap again to play it.`
      : state.pendingEffect && state.pendingEffect.type === "pick2"
        ? `${labelWhotCard(card)} cannot answer pick two. You need another 2 or must draw.`
        : state.requestShape
          ? `${labelWhotCard(card)} cannot answer the requested ${whotShapeLabel(state.requestShape)}.`
        : `${labelWhotCard(card)} cannot land on ${labelWhotCard(top)} right now.`;
    playInterfaceSound(WHOT_SOUND_ASSETS.select, 0.3);
    persistRuntime(next);
    return;
  }

  if (!playable) {
    const next = cloneWhotState(state);
    next.selectedIndex = index;
    next.message = state.pendingEffect && state.pendingEffect.type === "pick2"
      ? `${labelWhotCard(card)} cannot answer pick two. Use a 2 or draw the penalty cards.`
      : state.requestShape
        ? `${labelWhotCard(card)} cannot answer the requested ${whotShapeLabel(state.requestShape)}.`
      : `${labelWhotCard(card)} is blocked. Choose a matching card or draw from the pile.`;
    playInterfaceSound(WHOT_SOUND_ASSETS.select, 0.24);
    persistRuntime(next);
    return;
  }

  const next = playWhotCardForActor(state, "playerHand", index, "player");
  animateWhotCardToCenter({
    fromEl: document.querySelector(`[data-whot-card-face="${index}"]`),
    card,
    onComplete() {
      finishWhotPlayerPlay(next);
    }
  });
}

function handleWhotDraw() {
  if (!activeRuntime || activeRuntime.state.turn !== "player" || activeRuntime.state.winner || activeRuntime.animating || activeRuntime.state.scoreReveal) {
    return;
  }
  const next = cloneWhotState(activeRuntime.state);
  if (next.pendingRequestSelection) {
    next.message = "Choose the shape you need for WHOT 20 before the turn can continue.";
    persistRuntime(next);
    return;
  }
  const effect = next.pendingEffect;
  const amount = effect && effect.type === "pick2" ? effect.amount || 2 : 1;
  const drawn = drawWhotCards(next, "playerHand", amount);
  next.selectedIndex = null;

  if (effect && effect.type === "pick2") {
    next.pendingEffect = null;
    setWhotTurn(next, effect.source || "bot");
    next.message = `You went to market instead of countering pick two and picked ${drawn} card${drawn === 1 ? "" : "s"}. ${capitalize(effect.source || "bot")} continues to cover the 2.`;
  } else {
    setWhotTurn(next, "bot");
    next.message = next.requestShape
      ? `You went to market instead of answering the requested ${whotShapeLabel(next.requestShape)} and drew ${drawn} card${drawn === 1 ? "" : "s"}. Bot turn, and the request stays live.`
      : `You chose market and drew ${drawn} card${drawn === 1 ? "" : "s"}. Bot turn.`;
  }
  playInterfaceSound(WHOT_SOUND_ASSETS.select, 0.24);

  if (next.deck.length === 0) {
    const resolved = resolveWhotDeckExhaustion(next, "The draw pile is exhausted.");
    persistRuntime(resolved);
    return;
  }

  persistRuntime(next);
  if (next.turn === "bot") {
    scheduleRuntimeAction(runWhotBotTurn);
  }
}

function handleWhotRequestSelection(shapeKey) {
  if (!activeRuntime || activeRuntime.finished || activeRuntime.animating) {
    return;
  }

  const validShape = WHOT_SHAPES.find((shape) => shape.key === shapeKey);
  if (!validShape) {
    return;
  }

  const next = cloneWhotState(activeRuntime.state);
  if (!next.pendingRequestSelection || next.turn !== "player" || next.winner) {
    return;
  }

  next.pendingRequestSelection = false;
  next.requestShape = validShape.key;
  next.selectedIndex = null;
  setWhotTurn(next, "bot");
  next.message = `You requested ${validShape.label}. Opponent must answer that shape or use WHOT. If not, they draw and the request stays live.`;
  playInterfaceSound(whotRequestSoundForShape(validShape.key), 0.34);
  persistRuntime(next);
  scheduleRuntimeAction(runWhotBotTurn, 420);
}

function runWhotBotTurn() {
  if (!activeRuntime || activeRuntime.finished || activeRuntime.animating) {
    return;
  }
  const state = cloneWhotState(activeRuntime.state);
  if (state.pendingRequestSelection) {
    return;
  }
  const top = state.discard[state.discard.length - 1];
  const pendingPickTwo = state.pendingEffect && state.pendingEffect.type === "pick2";
  const options = state.botHand
    .map((card, index) => ({ card, index }))
    .filter((entry) => canPlayWhotCard(entry.card, top, state.requestShape, state.pendingEffect));

  if (!options.length) {
    const drawAmount = pendingPickTwo ? state.pendingEffect.amount || 2 : 1;
    const drawn = drawWhotCards(state, "botHand", drawAmount);
    state.pendingEffect = null;
    setWhotTurn(state, "player");
    state.selectedIndex = null;
    state.message = pendingPickTwo
      ? `Bot had no 2 card and picked ${drawn} card${drawn === 1 ? "" : "s"}. Your turn to cover the 2.`
      : state.requestShape
        ? `Bot could not answer the requested ${whotShapeLabel(state.requestShape)} and drew ${drawn} card${drawn === 1 ? "" : "s"}. Your turn, and the request stays live.`
        : `Bot drew ${drawn} card${drawn === 1 ? "" : "s"} and passed the turn.`;
    playInterfaceSound(WHOT_SOUND_ASSETS.select, 0.18);

    if (state.deck.length === 0) {
      const resolved = resolveWhotDeckExhaustion(state, "The draw pile is exhausted.");
      persistRuntime(resolved);
      return;
    }

    persistRuntime(state);
    return;
  }

  options.sort((left, right) => {
    const leftScore = (left.card.value === 2 ? 24 : 0) + (left.card.value === 14 ? 18 : 0) + (left.card.value === 8 ? 14 : 0) + (left.card.value === 1 ? 12 : 0) + (left.card.shape === "whot" ? 5 : 0);
    const rightScore = (right.card.value === 2 ? 24 : 0) + (right.card.value === 14 ? 18 : 0) + (right.card.value === 8 ? 14 : 0) + (right.card.value === 1 ? 12 : 0) + (right.card.shape === "whot" ? 5 : 0);
    return rightScore - leftScore;
  });

  const choice = options[0];
  const next = playWhotCardForActor(state, "botHand", choice.index, "bot");
  animateWhotCardToCenter({
    fromEl: document.querySelector(".whot-opponent-card:last-child") || document.querySelector(".opponent-hand"),
    card: choice.card,
    onComplete() {
      playWhotMoveSounds(next);
      persistRuntime(next);
      bounceWhotCenterCard();

      if (next.winner) {
        closeWhot(next);
        return;
      }

      if (next.turn === "bot") {
        scheduleRuntimeAction(runWhotBotTurn, 420);
        return;
      }

      if (next.pendingEffect && next.pendingEffect.type === "pick2" && next.turn === "player" && !hasWhotValue(next.playerHand, 2)) {
        scheduleRuntimeAction(resolveWhotPlayerPenaltyTurn, 420);
      }
    }
  });
}

function closeWhot(state) {
  if (state.winner === "player") {
    finishActiveGame("win", state.finishReason === "deck" ? "The draw pile ended and your hand total was lower than the bot's." : "You emptied your Whot hand before the bot could reset the pile.");
  } else if (state.winner === "bot") {
    finishActiveGame("loss", state.finishReason === "deck" ? "The draw pile ended and the bot had the lower hand total." : "The bot cleared its hand first.");
  } else {
    finishActiveGame("draw", "The draw pile ended with equal hand totals.");
  }
}

const CHESS_PIECES = {
  wk: "&#9812;",
  wq: "&#9813;",
  wr: "&#9814;",
  wb: "&#9815;",
  wn: "&#9816;",
  wp: "&#9817;",
  bk: "&#9818;",
  bq: "&#9819;",
  br: "&#9820;",
  bb: "&#9821;",
  bn: "&#9822;",
  bp: "&#9823;"
};

const CHESS_VALUES = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };

GAME_ENGINES.chess = {
  createState() {
    return {
      board: createChessBoard(),
      turn: "w",
      winner: null,
      selected: null,
      lastMove: "White to move.",
      moveCount: 0
    };
  },
  render(runtime) {
    const state = runtime.state;
    const legalTargets = state.selected ? getLegalMovesForPiece(state.board, "w", state.selected.row, state.selected.col) : [];
    return {
      title: "Chess Match",
      copy: state.winner ? "The board is closed." : state.turn === "w" ? "White to move." : "Black is thinking.",
      html: `
        <div class="chess-board">
          ${state.board
            .map((row, rowIndex) => {
              return row
                .map((piece, columnIndex) => {
                  const selected = state.selected && state.selected.row === rowIndex && state.selected.col === columnIndex;
                  const target = legalTargets.find((move) => move.toRow === rowIndex && move.toCol === columnIndex);
                  const cellClass = (rowIndex + columnIndex) % 2 === 0 ? "chess-light" : "chess-dark";
                  return `
                    <button class="chess-cell ${cellClass} ${selected ? "selected" : ""}" type="button" data-chess-cell="${rowIndex}-${columnIndex}" ${state.winner ? "disabled" : ""}>
                      ${piece ? CHESS_PIECES[piece] : ""}
                      ${target ? '<span class="chess-dot"></span>' : ""}
                    </button>
                  `;
                })
                .join("");
            })
            .join("")}
        </div>
      `,
      notes: [
        { label: "Status", value: state.winner ? capitalize(state.winner) : state.turn === "w" ? "Your turn" : "Bot turn", copy: state.lastMove },
        { label: "Rules", value: "Streamlined chess", copy: "Castling and en passant are intentionally left out in this build." }
      ],
      controls: [
        { label: "Control 1", value: "Click a white piece to highlight its legal moves." },
        { label: "Control 2", value: "Click a highlighted destination to move." },
        { label: "Control 3", value: "Promotion to queen is automatic." }
      ],
      bind() {
        document.querySelectorAll("[data-chess-cell]").forEach((button) => {
          button.addEventListener("click", () => {
            const [row, col] = button.dataset.chessCell.split("-").map(Number);
            handleChessClick(row, col);
          });
        });
      }
    };
  }
};

function createChessBoard() {
  return [
    ["br", "bn", "bb", "bq", "bk", "bb", "bn", "br"],
    ["bp", "bp", "bp", "bp", "bp", "bp", "bp", "bp"],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    ["wp", "wp", "wp", "wp", "wp", "wp", "wp", "wp"],
    ["wr", "wn", "wb", "wq", "wk", "wb", "wn", "wr"]
  ];
}

function cloneChessBoard(board) {
  return board.map((row) => [...row]);
}

function insideBoard(row, col) {
  return row >= 0 && row < 8 && col >= 0 && col < 8;
}

function pieceColor(piece) {
  return piece ? piece[0] : null;
}

function pieceType(piece) {
  return piece ? piece[1] : null;
}

function getPseudoMoves(board, row, col, attackOnly = false) {
  const piece = board[row][col];
  if (!piece) {
    return [];
  }

  const color = pieceColor(piece);
  const type = pieceType(piece);
  const enemy = color === "w" ? "b" : "w";
  const moves = [];

  if (type === "p") {
    const direction = color === "w" ? -1 : 1;
    const startRow = color === "w" ? 6 : 1;
    const oneRow = row + direction;
    const attackCols = [col - 1, col + 1];

    if (attackOnly) {
      attackCols.forEach((attackCol) => {
        if (insideBoard(oneRow, attackCol)) {
          moves.push({ fromRow: row, fromCol: col, toRow: oneRow, toCol: attackCol });
        }
      });
      return moves;
    }

    if (insideBoard(oneRow, col) && !board[oneRow][col]) {
      moves.push({ fromRow: row, fromCol: col, toRow: oneRow, toCol: col });
      const twoRow = row + direction * 2;
      if (row === startRow && insideBoard(twoRow, col) && !board[twoRow][col]) {
        moves.push({ fromRow: row, fromCol: col, toRow: twoRow, toCol: col });
      }
    }

    attackCols.forEach((attackCol) => {
      if (insideBoard(oneRow, attackCol) && pieceColor(board[oneRow][attackCol]) === enemy) {
        moves.push({ fromRow: row, fromCol: col, toRow: oneRow, toCol: attackCol });
      }
    });

    return moves;
  }

  if (type === "n") {
    const jumps = [
      [-2, -1], [-2, 1], [-1, -2], [-1, 2],
      [1, -2], [1, 2], [2, -1], [2, 1]
    ];

    jumps.forEach(([rowDelta, colDelta]) => {
      const targetRow = row + rowDelta;
      const targetCol = col + colDelta;
      if (!insideBoard(targetRow, targetCol)) {
        return;
      }
      if (!board[targetRow][targetCol] || pieceColor(board[targetRow][targetCol]) !== color) {
        moves.push({ fromRow: row, fromCol: col, toRow: targetRow, toCol: targetCol });
      }
    });

    return moves;
  }

  if (type === "k") {
    for (let rowDelta = -1; rowDelta <= 1; rowDelta += 1) {
      for (let colDelta = -1; colDelta <= 1; colDelta += 1) {
        if (rowDelta === 0 && colDelta === 0) {
          continue;
        }
        const targetRow = row + rowDelta;
        const targetCol = col + colDelta;
        if (!insideBoard(targetRow, targetCol)) {
          continue;
        }
        if (!board[targetRow][targetCol] || pieceColor(board[targetRow][targetCol]) !== color) {
          moves.push({ fromRow: row, fromCol: col, toRow: targetRow, toCol: targetCol });
        }
      }
    }
    return moves;
  }

  const directions = [];
  if (type === "b" || type === "q") {
    directions.push([-1, -1], [-1, 1], [1, -1], [1, 1]);
  }
  if (type === "r" || type === "q") {
    directions.push([-1, 0], [1, 0], [0, -1], [0, 1]);
  }

  directions.forEach(([rowDelta, colDelta]) => {
    let targetRow = row + rowDelta;
    let targetCol = col + colDelta;
    while (insideBoard(targetRow, targetCol)) {
      const targetPiece = board[targetRow][targetCol];
      if (!targetPiece) {
        moves.push({ fromRow: row, fromCol: col, toRow: targetRow, toCol: targetCol });
      } else {
        if (pieceColor(targetPiece) !== color) {
          moves.push({ fromRow: row, fromCol: col, toRow: targetRow, toCol: targetCol });
        }
        break;
      }
      targetRow += rowDelta;
      targetCol += colDelta;
    }
  });

  return moves;
}

function applyChessMove(board, move) {
  const next = cloneChessBoard(board);
  const piece = next[move.fromRow][move.fromCol];
  next[move.fromRow][move.fromCol] = null;
  next[move.toRow][move.toCol] = piece;

  if (pieceType(piece) === "p" && (move.toRow === 0 || move.toRow === 7)) {
    next[move.toRow][move.toCol] = `${pieceColor(piece)}q`;
  }

  return next;
}

function locateKing(board, color) {
  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      if (board[row][col] === `${color}k`) {
        return { row, col };
      }
    }
  }
  return null;
}

function isSquareAttacked(board, row, col, byColor) {
  for (let sourceRow = 0; sourceRow < 8; sourceRow += 1) {
    for (let sourceCol = 0; sourceCol < 8; sourceCol += 1) {
      const piece = board[sourceRow][sourceCol];
      if (!piece || pieceColor(piece) !== byColor) {
        continue;
      }
      const moves = getPseudoMoves(board, sourceRow, sourceCol, true);
      if (moves.some((move) => move.toRow === row && move.toCol === col)) {
        return true;
      }
    }
  }
  return false;
}

function getLegalMovesForPiece(board, color, row, col) {
  const piece = board[row][col];
  if (!piece || pieceColor(piece) !== color) {
    return [];
  }

  return getPseudoMoves(board, row, col, false).filter((move) => {
    const nextBoard = applyChessMove(board, move);
    const king = locateKing(nextBoard, color);
    if (!king) {
      return false;
    }
    return !isSquareAttacked(nextBoard, king.row, king.col, color === "w" ? "b" : "w");
  });
}

function getAllLegalMoves(board, color) {
  const moves = [];

  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      moves.push(...getLegalMovesForPiece(board, color, row, col));
    }
  }

  return moves;
}

function evaluateChessOutcome(board, turn) {
  const legalMoves = getAllLegalMoves(board, turn);
  if (legalMoves.length > 0) {
    return null;
  }
  const king = locateKing(board, turn);
  const inCheck = king ? isSquareAttacked(board, king.row, king.col, turn === "w" ? "b" : "w") : true;
  if (inCheck) {
    return turn === "w" ? "bot" : "player";
  }
  return "draw";
}

function handleChessClick(row, col) {
  const state = activeRuntime.state;
  if (state.turn !== "w" || state.winner) {
    return;
  }

  const piece = state.board[row][col];
  const selected = state.selected;

  if (selected) {
    const legalMoves = getLegalMovesForPiece(state.board, "w", selected.row, selected.col);
    const move = legalMoves.find((candidate) => candidate.toRow === row && candidate.toCol === col);

    if (move) {
      const nextBoard = applyChessMove(state.board, move);
      const outcome = evaluateChessOutcome(nextBoard, "b");
      const next = {
        ...state,
        board: nextBoard,
        turn: "b",
        selected: null,
        moveCount: state.moveCount + 1,
        lastMove: `You moved ${labelChessSquare(move.fromRow, move.fromCol)} to ${labelChessSquare(move.toRow, move.toCol)}.`,
        winner: outcome
      };

      persistRuntime(next);

      if (next.winner) {
        closeChess(next);
        return;
      }

      scheduleRuntimeAction(runChessBotTurn);
      return;
    }
  }

  if (piece && pieceColor(piece) === "w") {
    persistRuntime({ ...state, selected: { row, col } });
  } else if (selected) {
    persistRuntime({ ...state, selected: null });
  }
}

function labelChessSquare(row, col) {
  return `${"abcdefgh"[col]}${8 - row}`;
}

function runChessBotTurn() {
  const state = activeRuntime.state;
  const moves = getAllLegalMoves(state.board, "b");
  if (!moves.length) {
    const winner = evaluateChessOutcome(state.board, "b");
    const next = { ...state, winner };
    persistRuntime(next);
    closeChess(next);
    return;
  }

  let bestMove = moves[0];
  let bestScore = -Infinity;

  moves.forEach((move) => {
    const targetPiece = state.board[move.toRow][move.toCol];
    const nextBoard = applyChessMove(state.board, move);
    const createsMate = evaluateChessOutcome(nextBoard, "w") === "bot";
    const centrality = 3.5 - Math.abs(3.5 - move.toCol) + 3.5 - Math.abs(3.5 - move.toRow);
    const score = (targetPiece ? CHESS_VALUES[pieceType(targetPiece)] * 10 : 0) + centrality + (createsMate ? 25 : 0) + Math.random();

    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  });

  const afterMove = applyChessMove(state.board, bestMove);
  const outcome = evaluateChessOutcome(afterMove, "w");
  const next = {
    ...state,
    board: afterMove,
    turn: "w",
    selected: null,
    moveCount: state.moveCount + 1,
    lastMove: `Bot moved ${labelChessSquare(bestMove.fromRow, bestMove.fromCol)} to ${labelChessSquare(bestMove.toRow, bestMove.toCol)}.`,
    winner: outcome
  };

  persistRuntime(next);

  if (next.winner) {
    closeChess(next);
  }
}

function closeChess(state) {
  if (state.winner === "player") {
    finishActiveGame("win", "You outmaneuvered the bot on the chess board.");
  } else if (state.winner === "bot") {
    finishActiveGame("loss", "The bot found the winning sequence.");
  } else {
    finishActiveGame("draw", "The board closed without a winner.");
  }
}

const LUDO_BOARD_SIZE = 15;
const LUDO_RING = [
  [6, 1], [6, 2], [6, 3], [6, 4], [6, 5],
  [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6], [0, 7], [0, 8],
  [1, 8], [2, 8], [3, 8], [4, 8], [5, 8],
  [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14],
  [7, 14], [8, 14],
  [8, 13], [8, 12], [8, 11], [8, 10], [8, 9],
  [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8], [14, 7], [14, 6],
  [13, 6], [12, 6], [11, 6], [10, 6], [9, 6],
  [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0], [7, 0], [6, 0]
];
const LUDO_START_OFFSETS = { yellow: 0, green: 13, red: 26, blue: 39 };
const LUDO_LANES = {
  yellow: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]],
  green: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]],
  red: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]],
  blue: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]]
};
const LUDO_GOAL_POSITION = 56;
const LUDO_SAFE_ABS = Object.values(LUDO_START_OFFSETS);
const LUDO_TURN_ORDER = ["green", "red", "yellow", "blue"];
const LUDO_LABELS = {
  green: "Green",
  red: "Red",
  yellow: "Yellow",
  blue: "Blue"
};
const LUDO_DISPLAY = {
  yellow: { title: "Yellow", short: "Y", note: "Top-left base" },
  green: { title: "Green", short: "G", note: "Top-right base" },
  blue: { title: "Blue", short: "B", note: "Bottom-left base" },
  red: { title: "Red", short: "R", note: "Bottom-right base" }
};
const LUDO_SEAT_LABELS = {
  player1: "Player 1",
  player2: "Player 2",
  player3: "Player 3",
  player4: "Player 4"
};
const LUDO_COLOR_OWNERS_BY_MODE = {
  2: {
    green: "player1",
    red: "player2",
    yellow: "player1",
    blue: "player2"
  },
  4: {
    green: "player1",
    red: "player2",
    yellow: "player3",
    blue: "player4"
  }
};
const LUDO_RING_INDEX_BY_KEY = new Map(LUDO_RING.map(([row, col], index) => [ludoCellKey(row, col), index]));
const LUDO_LANE_COLOR_BY_KEY = new Map();
const LUDO_ARROW_BY_KEY = new Map();
const LUDO_START_BY_INDEX = new Map(Object.entries(LUDO_START_OFFSETS).map(([color, index]) => [index, color]));

function isLudoGoalPosition(position) {
  return Number.isInteger(position) && position >= LUDO_GOAL_POSITION;
}

function normalizeLudoSeatMode(value) {
  return Number(value) === 2 ? 2 : 4;
}

function getLudoSeatIds(seatMode = 4) {
  return normalizeLudoSeatMode(seatMode) === 2
    ? ["player1", "player2"]
    : ["player1", "player2", "player3", "player4"];
}

function getDefaultLudoColorOwners(seatMode = 4) {
  return { ...LUDO_COLOR_OWNERS_BY_MODE[normalizeLudoSeatMode(seatMode)] };
}

function normalizeLudoColorOwners(input, seatMode = 4) {
  const normalizedSeatMode = normalizeLudoSeatMode(seatMode);
  const defaults = getDefaultLudoColorOwners(normalizedSeatMode);
  const seatIds = getLudoSeatIds(normalizedSeatMode);

  if (!input || typeof input !== "object") {
    return defaults;
  }

  const counts = new Map(seatIds.map((seatId) => [seatId, 0]));
  const owners = {};

  LUDO_TURN_ORDER.forEach((color) => {
    const candidate = typeof input[color] === "string" ? input[color] : defaults[color];
    owners[color] = seatIds.includes(candidate) ? candidate : defaults[color];
    counts.set(owners[color], Number(counts.get(owners[color]) || 0) + 1);
  });

  const expectedPerSeat = normalizedSeatMode === 2 ? 2 : 1;
  if (seatIds.some((seatId) => Number(counts.get(seatId) || 0) !== expectedPerSeat)) {
    return defaults;
  }

  return owners;
}

function extractLudoDraftColors(colorOwners, seatMode = 4) {
  if (normalizeLudoSeatMode(seatMode) !== 2) {
    return [];
  }

  const owners = normalizeLudoColorOwners(colorOwners, 2);
  const player1Colors = LUDO_TURN_ORDER.filter((color) => owners[color] === "player1");
  const player2Colors = LUDO_TURN_ORDER.filter((color) => owners[color] === "player2");
  return [player1Colors[0], player2Colors[0], player1Colors[1]].filter(Boolean);
}

function buildRandomLudoPracticeOwners() {
  const availableColors = [...LUDO_TURN_ORDER];
  const humanColor = availableColors.splice(Math.floor(Math.random() * availableColors.length), 1)[0];
  const owners = {
    [humanColor]: "player1"
  };

  ["player2", "player3", "player4"].forEach((seatId, index) => {
    owners[availableColors[index]] = seatId;
  });

  return owners;
}

function chooseLudoPracticeBotDraftColor(draftColors = []) {
  const setup = buildLudoMatchSetup(2, draftColors);
  if (setup.ready || setup.nextSeat !== "player2" || !setup.remainingColors.length) {
    return null;
  }

  const nextIndex = Math.floor(Math.random() * setup.remainingColors.length);
  return setup.remainingColors[nextIndex] || null;
}

function buildLudoMatchSetup(seatMode = 4, draftColors = []) {
  const normalizedSeatMode = normalizeLudoSeatMode(seatMode);
  if (normalizedSeatMode === 4) {
    return {
      seatMode: 4,
      draftColors: [],
      colorOwners: getDefaultLudoColorOwners(4),
      ready: true,
      nextSeat: null,
      remainingColors: [],
      autoAssignedColor: null
    };
  }

  const picks = [];
  const seen = new Set();

  (Array.isArray(draftColors) ? draftColors : []).forEach((color) => {
    if (LUDO_TURN_ORDER.includes(color) && !seen.has(color) && picks.length < 3) {
      picks.push(color);
      seen.add(color);
    }
  });

  const colorOwners = {};
  if (picks[0]) {
    colorOwners[picks[0]] = "player1";
  }
  if (picks[1]) {
    colorOwners[picks[1]] = "player2";
  }
  if (picks[2]) {
    colorOwners[picks[2]] = "player1";
  }

  let autoAssignedColor = null;
  const remainingColors = LUDO_TURN_ORDER.filter((color) => !colorOwners[color]);
  if (picks.length === 3 && remainingColors.length === 1) {
    autoAssignedColor = remainingColors[0];
    colorOwners[autoAssignedColor] = "player2";
  }

  const ready = LUDO_TURN_ORDER.every((color) => Boolean(colorOwners[color]));
  return {
    seatMode: 2,
    draftColors: picks,
    colorOwners: ready ? normalizeLudoColorOwners(colorOwners, 2) : colorOwners,
    ready,
    nextSeat: ready ? null : (picks.length === 0 || picks.length === 2 ? "player1" : "player2"),
    remainingColors: ready ? [] : remainingColors,
    autoAssignedColor
  };
}

function buildLudoPracticeSetup(seatMode = 4, draftColors = [], practiceColorOwners = null) {
  const normalizedSeatMode = normalizeLudoSeatMode(seatMode);
  if (normalizedSeatMode === 4) {
    return {
      seatMode: 4,
      draftColors: [],
      colorOwners: normalizeLudoColorOwners(practiceColorOwners, 4),
      ready: true,
      nextSeat: null,
      remainingColors: [],
      autoAssignedColor: null,
      botOnly: true
    };
  }

  return {
    ...buildLudoMatchSetup(2, draftColors),
    botOnly: true
  };
}

function getLudoSeatLabel(seatId) {
  return LUDO_SEAT_LABELS[seatId] || "Player";
}

function getLudoSetupColorsForSeat(colorOwners, seatMode, seatId) {
  const owners = normalizeLudoSeatMode(seatMode) === 2 && (!colorOwners || Object.keys(colorOwners).length < 4)
    ? colorOwners || {}
    : normalizeLudoColorOwners(colorOwners, seatMode);
  return LUDO_TURN_ORDER.filter((color) => owners[color] === seatId);
}

function getLudoColorOwner(state, color) {
  const owners = normalizeLudoColorOwners(state.colorOwners, state.seatMode);
  return owners[color];
}

function getLudoOwnedColors(state, seatId) {
  return getLudoSetupColorsForSeat(state.colorOwners, state.seatMode, seatId);
}

function getLudoTurnColors(state, color = state.turn) {
  if (normalizeLudoSeatMode(state.seatMode) !== 2) {
    return [color];
  }

  return getLudoOwnedColors(state, getLudoColorOwner(state, color));
}

function ludoTokenKey(color, tokenIndex) {
  return `${color}:${tokenIndex}`;
}

function isLudoTokenHighlighted(highlightedMoves, color, tokenIndex) {
  return Array.isArray(highlightedMoves) && highlightedMoves.includes(ludoTokenKey(color, tokenIndex));
}

function formatLudoTurnColorNames(colors, lowercase = false) {
  const labels = (Array.isArray(colors) ? colors : [])
    .map((color) => LUDO_DISPLAY[color]?.title || color)
    .filter(Boolean);

  if (!labels.length) {
    return lowercase ? "chip" : "Chip";
  }

  if (labels.length === 1) {
    return lowercase ? labels[0].toLowerCase() : labels[0];
  }

  const output = `${labels.slice(0, -1).join(" + ")} + ${labels[labels.length - 1]}`;
  return lowercase ? output.toLowerCase() : output;
}

function getLudoTurnSummary(state, color = state.turn) {
  const ownerId = getLudoColorOwner(state, color);
  return {
    ownerId,
    ownerLabel: getLudoSeatLabel(ownerId),
    colorLabel: LUDO_DISPLAY[color].title,
    fullLabel: `${getLudoSeatLabel(ownerId)} · ${LUDO_DISPLAY[color].title}`
  };
}

function getLudoWinnerLabel(state) {
  if (!state.winner) {
    return "";
  }

  const ownerId = getLudoColorOwner(state, state.winner);
  const ownedColors = getLudoOwnedColors(state, ownerId);
  return ownedColors.length > 1
    ? getLudoSeatLabel(ownerId)
    : `${getLudoSeatLabel(ownerId)} · ${LUDO_DISPLAY[state.winner].title}`;
}

function getLudoGoalTargetForSeat(state, seatId) {
  return getLudoOwnedColors(state, seatId).length * 4;
}

function getLudoGoalCountForSeat(state, seatId) {
  return getLudoOwnedColors(state, seatId).reduce((total, color) => {
    return total + state.players[color].tokens.filter((position) => isLudoGoalPosition(position)).length;
  }, 0);
}

function renderLudoDraftPanelMarkup(setup) {
  if (setup.seatMode !== 2) {
    return `
      <div class="ludo-draft-copy">
        <p>${escapeHtml(setup.botOnly ? "Practice mode keeps the green home with you and hands red, yellow, and blue to bots." : "Four-player table keeps one home color per seat.")}</p>
      </div>
    `;
  }

  const picked = new Set(setup.draftColors);
  const seatLabel = (seatId) => {
    if (!setup.botOnly) {
      return getLudoSeatLabel(seatId);
    }
    return seatId === "player1" ? "You" : "Bot";
  };
  const availableButtons = setup.ready
    ? ""
    : setup.remainingColors
      .map((color) => {
        return `
          <button class="ludo-draft-color is-${color}" type="button" data-ludo-draft-color="${color}">
            <span class="ludo-draft-dot" aria-hidden="true"></span>
            <strong>${escapeHtml(LUDO_DISPLAY[color].title)}</strong>
          </button>
        `;
      })
      .join("");
  const seatLines = getLudoSeatIds(2)
    .map((seatId) => {
      const colors = getLudoSetupColorsForSeat(setup.colorOwners, setup.seatMode, seatId);
      const slots = Array.from({ length: 2 }, (_, index) => {
        const color = colors[index];
        return color
          ? `<span class="ludo-draft-slot is-filled is-${color}">${escapeHtml(LUDO_DISPLAY[color].title)}</span>`
          : `<span class="ludo-draft-slot">${escapeHtml(index === colors.length && setup.nextSeat === seatId ? "Picking" : "Waiting")}</span>`;
      }).join("");

      return `
        <div class="ludo-draft-seat-line">
          <strong>${escapeHtml(seatLabel(seatId))}</strong>
          <div class="ludo-draft-seat-slots">${slots}</div>
        </div>
      `;
    })
    .join("");

  const completeCopy = setup.autoAssignedColor
    ? `${seatLabel("player2")} receives ${LUDO_DISPLAY[setup.autoAssignedColor].title} automatically to close the table.`
    : setup.botOnly
      ? "You and the bot have your two home colors."
      : "Both players have their two home colors.";
  const pendingCopy = setup.botOnly
    ? seatLabel(setup.nextSeat) === "You"
      ? "You pick the next home color."
      : `${seatLabel(setup.nextSeat)} picks the next home color.`
    : `${getLudoSeatLabel(setup.nextSeat)} picks the next home color.`;

  return `
    <div class="ludo-draft-copy">
      <p>${escapeHtml(setup.ready ? completeCopy : pendingCopy)}</p>
    </div>
    <div class="ludo-draft-seat-grid">${seatLines}</div>
    <div class="ludo-draft-color-grid">
      ${setup.ready
        ? LUDO_TURN_ORDER.map((color) => `<span class="ludo-draft-color is-static is-${color}${picked.has(color) ? " is-picked" : ""}"><span class="ludo-draft-dot" aria-hidden="true"></span><strong>${escapeHtml(LUDO_DISPLAY[color].title)}</strong></span>`).join("")
        : availableButtons}
    </div>
  `;
}

LUDO_RING.forEach((cell, index) => {
  const next = LUDO_RING[(index + 1) % LUDO_RING.length];
  if (index % 2 === 0 || LUDO_SAFE_ABS.includes(index)) {
    LUDO_ARROW_BY_KEY.set(ludoCellKey(cell[0], cell[1]), ludoArrowDirection(cell, next));
  }
});

Object.entries(LUDO_LANES).forEach(([color, cells]) => {
  cells.forEach(([row, col], index) => {
    LUDO_LANE_COLOR_BY_KEY.set(ludoCellKey(row, col), color);
    if (index < cells.length - 1) {
      LUDO_ARROW_BY_KEY.set(ludoCellKey(row, col), ludoArrowDirection(cells[index], cells[index + 1]));
    }
  });
});

GAME_ENGINES.ludo = {
  createState(match = {}) {
    const botMode = match.mode === "practice";
    const seatMode = normalizeLudoSeatMode(match.ludoSeatMode || 4);
    const colorOwners = normalizeLudoColorOwners(match.ludoColorOwners, seatMode);
    const players = normalizeLudoPlayers({
      green: { tokens: [-1, -1, -1, -1] },
      red: { tokens: [-1, -1, -1, -1] },
      yellow: { tokens: [-1, -1, -1, -1] },
      blue: { tokens: [-1, -1, -1, -1] }
    });
    return {
      players,
      turn: "green",
      dice: null,
      selectedDie: null,
      winner: null,
      note: "Roll the two center dice. Any die showing 6 can open a chip onto its colored gate square.",
      turnCount: 0,
      stackSerial: getLudoMaxStackOrder(players),
      seatMode,
      colorOwners,
      localSeatId: "player1",
      botMode
    };
  },
  render(runtime) {
    const state = getRenderableLudoState(runtime);
    const isRolling = Boolean(runtime.ludoRolling);
    const isMoving = Boolean(runtime.ludoMoveAnimation);
    const displayDice = isRolling ? runtime.ludoRolling.currentDice : state.dice;
    const turnSummary = getLudoTurnSummary(state);
    const movesByDie = !isRolling && !isMoving && state.dice
      ? getLudoAvailableMovesByDie(state, state.turn)
      : buildEmptyLudoMovesByDie(displayDice);
    const highlightedMoves = !isRolling && !isMoving && Number.isInteger(state.selectedDie) ? (movesByDie[state.selectedDie] || []) : [];
    const activeLabel = isRolling
      ? `${turnSummary.fullLabel} rolling`
      : isMoving
      ? `${turnSummary.fullLabel} moving`
      : state.winner
      ? `${getLudoWinnerLabel(state)} wins`
      : state.dice
        ? state.dice
          ? Number.isInteger(state.selectedDie)
            ? `${turnSummary.fullLabel} · Die ${state.selectedDie + 1}`
            : `${turnSummary.fullLabel} · Choose a die`
          : `${turnSummary.fullLabel} turn`
        : `${turnSummary.fullLabel} turn`;

    return {
      title: "Nigerian Ludo Table",
      copy: isRolling
        ? "The center dice are rolling. Wait for the final roll to settle."
        : isMoving
        ? "The live chip is counting cell by cell. Wait for it to settle before the next action."
        : state.winner
        ? `${getLudoWinnerLabel(state)} closed the table first.`
        : state.dice
          ? state.dice
            ? Number.isInteger(state.selectedDie)
              ? `Use the armed die on one of the glowing ${turnSummary.colorLabel.toLowerCase()} chips.`
              : `Tap a live die at the center, then move a ${turnSummary.colorLabel.toLowerCase()} chip.`
            : "Roll the two center dice to open a chip or continue the race."
          : `${turnSummary.fullLabel} is using the center dice.`,
      html: renderLudoBoard(state, movesByDie, highlightedMoves, activeLabel, displayDice, isRolling, isMoving),
      notes: [
        {
          label: "Turn",
          value: state.winner ? getLudoWinnerLabel(state) : turnSummary.fullLabel,
          copy: state.note
        },
        {
          label: "Die",
          value: formatLudoDiceValues(displayDice),
          copy: state.winner
            ? "Round complete."
            : isRolling
              ? "The center dice keep rolling until the rolling sound finishes."
            : isMoving
              ? "The selected chip is walking through each counted cell before the move settles."
            : state.dice
              ? "Every banked die stays live until it is spent or no legal move remains."
              : "Two dice roll from the center of the board every turn."
        }
      ],
      controls: [
        { label: "Roll", value: "Roll the two center dice. A double six keeps the turn rolling and banks both sixes before the next pair lands." },
        { label: "Move", value: "Tap a live die, then move a matching chip along the white runway and arrow direction." },
        { label: "Goal", value: state.seatMode === 2 ? "Landing on any enemy chip sends it home and scores goal for the covering chip. First seat to clear all assigned chips wins." : "Landing on any enemy chip sends it home and scores goal for the covering chip. First player to goal all four wins." }
      ],
      bind() {
        document.getElementById("rollLudoButton")?.addEventListener("click", handleLudoRoll);
        document.querySelectorAll("[data-ludo-die]").forEach((button) => {
          button.addEventListener("click", () => {
            handleLudoSelectDie(Number(button.dataset.ludoDie));
          });
        });
        document.querySelectorAll("[data-ludo-token]").forEach((button) => {
          button.addEventListener("click", () => {
            handleLudoMove(button.dataset.ludoToken);
          });
        });
      }
    };
  }
};

function ludoCellKey(row, col) {
  return `${row}-${col}`;
}

function ludoArrowDirection(fromCell, toCell) {
  const [fromRow, fromCol] = fromCell;
  const [toRow, toCol] = toCell;
  if (toRow < fromRow) {
    return "up";
  }
  if (toRow > fromRow) {
    return "down";
  }
  if (toCol < fromCol) {
    return "left";
  }
  return "right";
}

function getDefaultLudoStackOrder(color, tokenIndex) {
  const colorIndex = Math.max(0, LUDO_TURN_ORDER.indexOf(color));
  return colorIndex * 4 + tokenIndex;
}

function normalizeLudoPlayerState(color, playerState = {}) {
  const rawTokens = Array.isArray(playerState && playerState.tokens) ? playerState.tokens : [];
  const rawStackOrder = Array.isArray(playerState && playerState.stackOrder) ? playerState.stackOrder : [];
  return {
    tokens: Array.from({ length: 4 }, (_, tokenIndex) => {
      const value = Number(rawTokens[tokenIndex]);
      return Number.isInteger(value) ? value : -1;
    }),
    stackOrder: Array.from({ length: 4 }, (_, tokenIndex) => {
      const value = Number(rawStackOrder[tokenIndex]);
      return Number.isInteger(value) ? value : getDefaultLudoStackOrder(color, tokenIndex);
    })
  };
}

function normalizeLudoPlayers(players = {}) {
  const source = players && typeof players === "object" ? players : {};
  return Object.fromEntries(
    LUDO_TURN_ORDER.map((color) => [color, normalizeLudoPlayerState(color, source[color])])
  );
}

function getLudoMaxStackOrder(players) {
  const normalizedPlayers = normalizeLudoPlayers(players);
  return LUDO_TURN_ORDER.reduce((maxOrder, color) => {
    return Math.max(maxOrder, ...normalizedPlayers[color].stackOrder);
  }, -1);
}

function cloneLudoPlayers(players) {
  const normalizedPlayers = normalizeLudoPlayers(players);
  return {
    green: {
      tokens: [...normalizedPlayers.green.tokens],
      stackOrder: [...normalizedPlayers.green.stackOrder]
    },
    red: {
      tokens: [...normalizedPlayers.red.tokens],
      stackOrder: [...normalizedPlayers.red.stackOrder]
    },
    yellow: {
      tokens: [...normalizedPlayers.yellow.tokens],
      stackOrder: [...normalizedPlayers.yellow.stackOrder]
    },
    blue: {
      tokens: [...normalizedPlayers.blue.tokens],
      stackOrder: [...normalizedPlayers.blue.stackOrder]
    }
  };
}

function cloneLudoState(state) {
  return {
    players: cloneLudoPlayers(state.players),
    turn: state.turn,
    dice: Array.isArray(state.dice) ? [...state.dice] : null,
    selectedDie: state.selectedDie,
    winner: state.winner,
    note: state.note,
    turnCount: state.turnCount,
    stackSerial: Number.isInteger(state.stackSerial) ? state.stackSerial : getLudoMaxStackOrder(state.players),
    seatMode: normalizeLudoSeatMode(state.seatMode || 4),
    colorOwners: normalizeLudoColorOwners(state.colorOwners, state.seatMode || 4),
    localSeatId: state.localSeatId || "player1",
    botMode: Boolean(state.botMode)
  };
}

const LUDO_ROLL_SPIN_FALLBACK_MS = 2000;
const LUDO_ROLL_AUDIO_FAILSAFE_MS = 8000;
const LUDO_ROLL_TICK_MS = 120;
const LUDO_ROLL_AUDIO_AUDIBLE_THRESHOLD = 0.001;
const LUDO_ROLL_AUDIO_AUDIBLE_PADDING_MS = 28;
const LUDO_MOVE_STEP_MS = 220;
const LUDO_MOVE_SETTLE_MS = 120;
const LUDO_CAPTURE_SETTLE_MS = 180;
const LUDO_DEBUG_ROLLS_STORAGE_KEY = "opticore_ludo_debug_rolls";
let ludoRollAudibleDurationPromise = null;

function getRenderableLudoState(runtime = activeRuntime) {
  if (!runtime) {
    return null;
  }
  return runtime.ludoMoveAnimation?.visualState || runtime.state;
}

function isLudoRuntimeBusy(runtime = activeRuntime) {
  return Boolean(runtime && (runtime.ludoRolling || runtime.ludoMoveAnimation));
}

function detectAudibleAudioDurationMs(src, options = {}) {
  const AudioContextCtor = typeof window !== "undefined"
    ? (window.AudioContext || window.webkitAudioContext)
    : null;
  if (!AudioContextCtor || !src) {
    return Promise.resolve(null);
  }

  const threshold = Number.isFinite(options.threshold) && options.threshold > 0
    ? options.threshold
    : LUDO_ROLL_AUDIO_AUDIBLE_THRESHOLD;
  const paddingMs = Number.isFinite(options.paddingMs) && options.paddingMs >= 0
    ? options.paddingMs
    : LUDO_ROLL_AUDIO_AUDIBLE_PADDING_MS;

  return fetch(src)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to load audio profile for ${src}.`);
      }
      return response.arrayBuffer();
    })
    .then((buffer) => {
      const context = new AudioContextCtor();
      return context.decodeAudioData(buffer.slice(0))
        .then((audioBuffer) => {
          const channels = [];
          for (let channelIndex = 0; channelIndex < audioBuffer.numberOfChannels; channelIndex += 1) {
            channels.push(audioBuffer.getChannelData(channelIndex));
          }

          for (let sampleIndex = audioBuffer.length - 1; sampleIndex >= 0; sampleIndex -= 1) {
            for (let channelIndex = 0; channelIndex < channels.length; channelIndex += 1) {
              if (Math.abs(channels[channelIndex][sampleIndex]) >= threshold) {
                return Math.ceil((sampleIndex / audioBuffer.sampleRate) * 1000) + paddingMs;
              }
            }
          }

          return null;
        })
        .catch(() => null)
        .finally(() => {
          try {
            const closeResult = context.close();
            if (closeResult && typeof closeResult.catch === "function") {
              closeResult.catch(() => {});
            }
          } catch (error) {}
        });
    })
    .catch(() => null);
}

function getLudoRollAudibleDurationMs() {
  if (!ludoRollAudibleDurationPromise) {
    ludoRollAudibleDurationPromise = detectAudibleAudioDurationMs(LUDO_SOUND_ASSETS.roll);
  }
  return ludoRollAudibleDurationPromise;
}

function takeDebugLudoDie() {
  if (typeof window === "undefined" || !window.localStorage) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(LUDO_DEBUG_ROLLS_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const queue = JSON.parse(raw);
    if (!Array.isArray(queue) || !queue.length) {
      return null;
    }
    const next = Number(queue.shift());
    window.localStorage.setItem(LUDO_DEBUG_ROLLS_STORAGE_KEY, JSON.stringify(queue));
    return Number.isInteger(next) && next >= 1 && next <= 6 ? next : null;
  } catch (error) {
    return null;
  }
}

function rollLudoDie() {
  const debugDie = takeDebugLudoDie();
  if (Number.isInteger(debugDie)) {
    return debugDie;
  }
  return 1 + Math.floor(Math.random() * 6);
}

function rollLudoDicePair() {
  return [rollLudoDie(), rollLudoDie()];
}

function isLudoDoubleSixRoll(dice) {
  return Array.isArray(dice) && dice.length === 2 && dice[0] === 6 && dice[1] === 6;
}

function rollLudoTurnDice() {
  const rolled = [];
  let current = rollLudoDicePair();
  rolled.push(...current);

  while (isLudoDoubleSixRoll(current)) {
    current = rollLudoDicePair();
    rolled.push(...current);
  }

  return rolled;
}

function buildEmptyLudoMovesByDie(dice) {
  const output = {};
  const count = Array.isArray(dice) && dice.length ? dice.length : 2;
  for (let index = 0; index < count; index += 1) {
    output[index] = [];
  }
  return output;
}

function nextAnimatedLudoDicePair(previous = []) {
  const next = rollLudoDicePair();
  if (Array.isArray(previous) && previous.length === 2 && next[0] === previous[0] && next[1] === previous[1]) {
    const index = Math.random() < 0.5 ? 0 : 1;
    next[index] = next[index] === 6 ? 1 : next[index] + 1;
  }
  return next;
}

function startLudoRollAnimation(tempState, finalState, onComplete, options = {}) {
  if (!activeRuntime) {
    return;
  }

  clearLudoRollAnimation();
  const runtimeId = activeRuntime.match.id;
  const syncToAudioEnd = Boolean(options.syncToAudioEnd);
  const fallbackDurationMs = Number.isFinite(options.fallbackDurationMs) && options.fallbackDurationMs > 0
    ? options.fallbackDurationMs
    : LUDO_ROLL_SPIN_FALLBACK_MS;
  const audioFailSafeMs = Number.isFinite(options.audioFailSafeMs) && options.audioFailSafeMs > 0
    ? options.audioFailSafeMs
    : LUDO_ROLL_AUDIO_FAILSAFE_MS;
  const audibleDurationPromise = syncToAudioEnd ? getLudoRollAudibleDurationMs() : null;
  const rollStartedAt = typeof performance !== "undefined" && typeof performance.now === "function"
    ? performance.now()
    : Date.now();
  let scheduledFinishElapsedMs = syncToAudioEnd ? audioFailSafeMs : fallbackDurationMs;
  let finished = false;
  const finishRoll = () => {
    if (finished) {
      return;
    }
    finished = true;
    if (!activeRuntime || activeRuntime.match.id !== runtimeId || activeRuntime.finished) {
      clearLudoRollAnimation();
      return;
    }
    clearLudoRollAnimation();
    onComplete();
  };
  const scheduleRollFinishAt = (elapsedDurationMs = LUDO_ROLL_SPIN_FALLBACK_MS) => {
    if (!activeRuntime || activeRuntime.match.id !== runtimeId) {
      return;
    }
    const currentNow = typeof performance !== "undefined" && typeof performance.now === "function"
      ? performance.now()
      : Date.now();
    const elapsedMs = currentNow - rollStartedAt;
    const remainingMs = Math.max(0, Math.ceil(elapsedDurationMs - elapsedMs));
    if (activeRuntime.ludoRollTimeoutId) {
      window.clearTimeout(activeRuntime.ludoRollTimeoutId);
    }
    activeRuntime.ludoRollTimeoutId = window.setTimeout(finishRoll, remainingMs);
  };
  const tightenRollFinishTimeout = (elapsedDurationMs) => {
    const nextTargetMs = Math.ceil(Number(elapsedDurationMs) || 0);
    if (nextTargetMs <= 0 || nextTargetMs >= scheduledFinishElapsedMs) {
      return;
    }
    scheduledFinishElapsedMs = nextTargetMs;
    scheduleRollFinishAt(nextTargetMs);
  };

  activeRuntime.state = tempState;
  activeRuntime.ludoRolling = {
    currentDice: nextAnimatedLudoDicePair(),
    finalDice: Array.isArray(finalState.dice) ? [...finalState.dice] : null
  };
  activeRuntime.ludoRollAudio = playLudoRollSound({
    onEnded() {
      if (syncToAudioEnd) {
        finishRoll();
      }
    },
    onError() {
      tightenRollFinishTimeout(fallbackDurationMs);
    },
    onLoadedMetadata() {
      if (!syncToAudioEnd) {
        return;
      }
      const duration = Number(activeRuntime?.ludoRollAudio?.duration || 0);
      if (Number.isFinite(duration) && duration > 0) {
        tightenRollFinishTimeout(Math.ceil(duration * 1000) + 80);
      }
    }
  });
  scheduleRollFinishAt(scheduledFinishElapsedMs);
  if (audibleDurationPromise) {
    audibleDurationPromise.then((audibleDurationMs) => {
      if (!activeRuntime || activeRuntime.match.id !== runtimeId || activeRuntime.finished || finished) {
        return;
      }
      tightenRollFinishTimeout(audibleDurationMs);
    });
  }
  renderActiveGame();

  activeRuntime.ludoRollIntervalId = window.setInterval(() => {
    if (!activeRuntime || activeRuntime.match.id !== runtimeId || activeRuntime.finished || !activeRuntime.ludoRolling) {
      clearLudoRollAnimation();
      return;
    }

    activeRuntime.ludoRolling.currentDice = nextAnimatedLudoDicePair(activeRuntime.ludoRolling.currentDice);
    renderActiveGame();
  }, LUDO_ROLL_TICK_MS);
}

function formatLudoDiceValues(dice) {
  if (!Array.isArray(dice)) {
    return "Ready";
  }
  return dice.map((value) => Number.isInteger(value) ? String(value) : "-").join(" / ");
}

function isLudoHumanTurn(state) {
  return !state.botMode || getLudoColorOwner(state, state.turn) === (state.localSeatId || "player1");
}

function shouldRunLudoBotTurn(state) {
  return Boolean(state && state.botMode && !state.winner && !activeRuntime?.ludoRolling && !activeRuntime?.ludoMoveAnimation && !isLudoHumanTurn(state));
}

function buildLudoMovePath(startPosition, preview) {
  if (!preview) {
    return [];
  }
  if (startPosition === -1) {
    return [preview.nextPosition];
  }

  const path = [];
  for (let position = startPosition + 1; position <= preview.nextPosition; position += 1) {
    path.push(position);
  }
  return path;
}

function startLudoMoveAnimation(sourceState, moveResult, onComplete) {
  if (!activeRuntime || !moveResult) {
    if (typeof onComplete === "function") {
      onComplete(moveResult?.nextState || null);
    }
    return;
  }

  clearLudoMoveAnimation();
  const runtimeId = activeRuntime.match.id;
  const path = buildLudoMovePath(moveResult.startPosition, moveResult.preview);
  if (!path.length) {
    if (typeof onComplete === "function") {
      onComplete(moveResult.nextState);
    }
    return;
  }

  const visualState = cloneLudoState(sourceState);
  visualState.selectedDie = null;
  visualState.note = moveResult.preview.leavesHome
    ? `${getLudoTurnSummary(sourceState, moveResult.color).fullLabel} is opening from base.`
    : `${getLudoTurnSummary(sourceState, moveResult.color).fullLabel} is counting ${moveResult.dieValue} across the path.`;

  activeRuntime.ludoMoveAnimation = {
    color: moveResult.color,
    tokenIndex: moveResult.tokenIndex,
    nextState: moveResult.nextState,
    preview: moveResult.preview,
    stepIndex: -1,
    path,
    visualState
  };

  if (moveResult.preview.leavesHome) {
    playLudoHomeOpenSound();
  }

  const advanceStep = () => {
    if (!activeRuntime || activeRuntime.match.id !== runtimeId || activeRuntime.finished || !activeRuntime.ludoMoveAnimation) {
      clearLudoMoveAnimation();
      return;
    }

    const animation = activeRuntime.ludoMoveAnimation;
    animation.stepIndex += 1;
    const nextPosition = animation.path[animation.stepIndex];
    animation.visualState.players[animation.color].tokens[animation.tokenIndex] = nextPosition;
    renderActiveGame();

    if (!(animation.preview.leavesHome && animation.stepIndex === 0)) {
      playLudoMoveStepSound();
    }

    if (animation.stepIndex < animation.path.length - 1) {
      activeRuntime.ludoMoveStepTimeoutId = window.setTimeout(advanceStep, LUDO_MOVE_STEP_MS);
      return;
    }

    activeRuntime.ludoMoveFinishTimeoutId = window.setTimeout(() => {
      if (!activeRuntime || activeRuntime.match.id !== runtimeId || activeRuntime.finished) {
        clearLudoMoveAnimation();
        return;
      }

      if (animation.preview.captureTargets.length) {
        playLudoKillSound();
      }

      clearLudoMoveAnimation();
      if (typeof onComplete === "function") {
        onComplete(moveResult.nextState);
      }
    }, animation.preview.captureTargets.length ? LUDO_CAPTURE_SETTLE_MS : LUDO_MOVE_SETTLE_MS);
  };

  advanceStep();
}

function parseLudoTokenKey(tokenKey, fallbackColor = "") {
  const [color, tokenIndexText] = String(tokenKey || "").split(":");
  const tokenIndex = Number(tokenIndexText);
  return {
    color: LUDO_TURN_ORDER.includes(color) ? color : fallbackColor,
    tokenIndex
  };
}

function getLudoTokenStackOrder(state, color, tokenIndex) {
  const order = Number(state?.players?.[color]?.stackOrder?.[tokenIndex]);
  return Number.isInteger(order) ? order : getDefaultLudoStackOrder(color, tokenIndex);
}

function promoteLudoTokenStackOrder(state, color, tokenIndex) {
  const nextOrder = (Number.isInteger(state.stackSerial) ? state.stackSerial : getLudoMaxStackOrder(state.players)) + 1;
  state.players[color].stackOrder[tokenIndex] = nextOrder;
  state.stackSerial = nextOrder;
}

function buildLudoBoardTokenMap(state) {
  const tokenMap = new Map();
  const players = normalizeLudoPlayers(state.players);

  LUDO_TURN_ORDER.forEach((color) => {
    players[color].tokens.forEach((position, tokenIndex) => {
      if (position < 0 || isLudoGoalPosition(position)) {
        return;
      }

      const [row, col] = ludoCoordinateForToken(color, position);
      const key = ludoCellKey(row, col);
      if (!tokenMap.has(key)) {
        tokenMap.set(key, []);
      }
      tokenMap.get(key).push({
        color,
        tokenIndex,
        position,
        stackOrder: players[color].stackOrder[tokenIndex]
      });
    });
  });

  tokenMap.forEach((tokens) => {
    tokens.sort((left, right) => {
      if (left.stackOrder !== right.stackOrder) {
        return left.stackOrder - right.stackOrder;
      }
      if (left.color !== right.color) {
        return LUDO_TURN_ORDER.indexOf(left.color) - LUDO_TURN_ORDER.indexOf(right.color);
      }
      return left.tokenIndex - right.tokenIndex;
    });
  });

  return tokenMap;
}

function ludoCoordinateForToken(color, position) {
  if (position <= 50) {
    return LUDO_RING[(LUDO_START_OFFSETS[color] + position) % LUDO_RING.length];
  }

  return LUDO_LANES[color][position - 51];
}

function renderLudoBoard(state, movesByDie, highlightedMoves, activeLabel, displayDice, isRolling, isMoving = false) {
  const boardTokens = buildLudoBoardTokenMap(state);
  const dice = Array.isArray(displayDice) && displayDice.length ? displayDice : [null, null];
  const diceLayoutClass = dice.length > 4 ? " has-stack-dice" : dice.length > 2 ? " has-many-dice" : "";
  const rollDisabled = isRolling || isMoving || Boolean(state.dice) || Boolean(state.winner);

  return `
    <div class="ludo-match-layout">
      <div class="ludo-table-wrap">
        <div class="ludo-player-band is-top">
          ${renderLudoPlayerCard(state, "yellow", isRolling || isMoving, true)}
          ${renderLudoPlayerCard(state, "green", isRolling || isMoving, true)}
        </div>
        <div class="ludo-table-shell">
          <div class="ludo-table-board">
            <div class="ludo-board-grid">
              ${renderLudoBoardCells(state, boardTokens, highlightedMoves)}
            </div>
            ${renderLudoHomePanel("yellow", state, highlightedMoves)}
            ${renderLudoHomePanel("green", state, highlightedMoves)}
            ${renderLudoHomePanel("blue", state, highlightedMoves)}
            ${renderLudoHomePanel("red", state, highlightedMoves)}
            <div class="ludo-center-hub${diceLayoutClass}">
              <div class="ludo-center-dice${diceLayoutClass}">
                ${dice.map((dieValue, dieIndex) => renderLudoDieShell(state, dieValue, dieIndex, movesByDie[dieIndex] || [], isRolling)).join("")}
              </div>
              <button id="rollLudoButton" class="ludo-roll-button" type="button" ${rollDisabled ? "disabled" : ""}>Roll dice</button>
            </div>
          </div>
        </div>
        <div class="ludo-player-band is-bottom">
          ${renderLudoPlayerCard(state, "blue", isRolling || isMoving, true)}
          ${renderLudoPlayerCard(state, "red", isRolling || isMoving, true)}
        </div>
        <div class="ludo-table-meta">
          <div class="ludo-turn-banner">
            <small>Current turn</small>
            <strong>${escapeHtml(activeLabel)}</strong>
            <span>${escapeHtml(state.note)}</span>
          </div>
        </div>
        <div class="ludo-player-grid">
          ${LUDO_TURN_ORDER.map((color) => renderLudoPlayerCard(state, color, isRolling || isMoving)).join("")}
        </div>
      </div>
    </div>
  `;
}

function renderLudoBoardCells(state, boardTokens, highlightedMoves) {
  let output = "";
  const activeColors = getLudoTurnColors(state);

  for (let row = 0; row < LUDO_BOARD_SIZE; row += 1) {
    for (let col = 0; col < LUDO_BOARD_SIZE; col += 1) {
      const key = ludoCellKey(row, col);
      const ringIndex = LUDO_RING_INDEX_BY_KEY.has(key) ? LUDO_RING_INDEX_BY_KEY.get(key) : -1;
      const laneColor = LUDO_LANE_COLOR_BY_KEY.get(key) || "";
      const tokens = boardTokens.get(key) || [];
      const startColor = ringIndex >= 0 ? (LUDO_START_BY_INDEX.get(ringIndex) || "") : "";
      const safeCell = ringIndex >= 0 && LUDO_SAFE_ABS.includes(ringIndex);
      const arrow = LUDO_ARROW_BY_KEY.get(key) || "";
      const classes = ["ludo-grid-cell"];

      if (ringIndex >= 0 || laneColor) {
        classes.push("is-track");
      }
      if (laneColor) {
        classes.push("is-lane", `is-${laneColor}`);
      }
      if (safeCell) {
        classes.push("is-safe");
      }
      if (startColor) {
        classes.push("is-start", `start-${startColor}`);
      }
      if (arrow) {
        classes.push("has-arrow", `arrow-${arrow}`);
      }
      if (row === 7 && col === 7) {
        classes.push("is-center");
      }
      if (tokens.some((token) => activeColors.includes(token.color) && isLudoTokenHighlighted(highlightedMoves, token.color, token.tokenIndex))) {
        classes.push("has-move");
      }

      output += `
        <div class="${classes.join(" ")}">
          ${safeCell ? '<span class="ludo-safe-mark" aria-hidden="true"></span>' : ""}
          <div class="ludo-track-stack">
            ${tokens.map((token, stackIndex) => renderLudoPiece(
              token.color,
              token.tokenIndex,
              activeColors.includes(token.color) && isLudoTokenHighlighted(highlightedMoves, token.color, token.tokenIndex),
              true,
              {
                stackIndex,
                stackTotal: tokens.length
              }
            )).join("")}
          </div>
        </div>
      `;
    }
  }

  return output;
}

function renderLudoHomePanel(color, state, highlightedMoves) {
  const entries = state.players[color].tokens.map((position, tokenIndex) => ({ position, tokenIndex }));
  const activeColors = getLudoTurnColors(state);

  return `
    <section class="ludo-home-panel is-${color}">
      <div class="ludo-home-card">
        <div class="ludo-home-slots">
          ${entries.map((entry) => {
            const clickable = activeColors.includes(color) && entry.position === -1 && isLudoTokenHighlighted(highlightedMoves, color, entry.tokenIndex);
            return `
              <div class="ludo-home-slot ${entry.position === -1 ? "" : "is-empty"}">
                ${entry.position === -1 ? renderLudoPiece(color, entry.tokenIndex, clickable, false) : '<span class="ludo-home-slot-mark" aria-hidden="true"></span>'}
              </div>
            `;
          }).join("")}
        </div>
        <div class="ludo-home-copy">
          <strong>${escapeHtml(LUDO_DISPLAY[color].title)} Base</strong>
          <span>${escapeHtml(LUDO_DISPLAY[color].note)}</span>
        </div>
      </div>
    </section>
  `;
}

function buildLudoPieceStackStyle(stackIndex = 0, stackTotal = 1) {
  if (!Number.isFinite(stackTotal) || stackTotal <= 1 || !Number.isFinite(stackIndex)) {
    return "";
  }
  const centeredIndex = stackIndex - ((stackTotal - 1) / 2);
  const horizontalStep = stackTotal > 3 ? 4 : 5;
  const verticalStep = stackTotal > 3 ? 3.5 : 4.5;
  const shiftX = Number((centeredIndex * horizontalStep).toFixed(2));
  const shiftY = Number((centeredIndex * -verticalStep).toFixed(2));
  return `--ludo-stack-shift-x:${shiftX}px; --ludo-stack-shift-y:${shiftY}px; z-index:${20 + stackIndex};`;
}

function renderLudoPiece(color, tokenIndex, clickable, compact, options = {}) {
  const stackTotal = Number.isFinite(options.stackTotal) ? options.stackTotal : 1;
  const style = typeof options.style === "string" ? options.style : buildLudoPieceStackStyle(options.stackIndex, stackTotal);
  const styleAttr = style ? ` style="${style}"` : "";
  const className = `ludo-piece is-${color}${clickable ? " is-clickable" : ""}${compact ? " is-compact" : ""}${stackTotal > 1 ? " is-stacked" : ""}`;
  const label = `${LUDO_DISPLAY[color].title} chip ${tokenIndex + 1}`;
  if (clickable) {
    return `<button class="${className}" type="button"${styleAttr} data-ludo-token="${color}:${tokenIndex}" aria-label="${escapeHtml(label)}"></button>`;
  }
  return `<span class="${className}"${styleAttr} aria-hidden="true"></span>`;
}

function renderLudoPlayerCard(state, color, isRolling = false, bandProfile = false) {
  const ownerId = getLudoColorOwner(state, color);
  const pieces = state.players[color].tokens;
  const homeCount = pieces.filter((position) => position === -1).length;
  const trackCount = pieces.filter((position) => position >= 0 && !isLudoGoalPosition(position)).length;
  const goalCount = pieces.filter((position) => isLudoGoalPosition(position)).length;
  const active = getLudoTurnColors(state).includes(color) && !state.winner;
  const movesByDie = active && !isRolling && state.dice ? getLudoAvailableMovesByDie(state, color) : buildEmptyLudoMovesByDie(state.dice);
  const liveDice = getPlayableLudoDice(movesByDie).length;
  const status = state.winner === color
    ? "Winner"
    : active
      ? isRolling
        ? "Rolling"
      : state.dice
        ? liveDice ? `${liveDice} die${liveDice === 1 ? "" : "s"} live` : "Turn closing"
        : "Ready to roll"
      : "Waiting";

  return `
    <article class="ludo-player-card is-${color}${active ? " is-active" : ""}${bandProfile ? " is-band-profile" : ""}">
      <div class="ludo-player-top">
        <div>
          <strong>${escapeHtml(getLudoSeatLabel(ownerId))}</strong>
          <span>${escapeHtml(`${LUDO_DISPLAY[color].title} home · ${status}`)}</span>
        </div>
        <span class="ludo-player-badge is-${color}">${escapeHtml(LUDO_DISPLAY[color].short)}</span>
      </div>
      <div class="ludo-player-stats">
        <div class="ludo-player-stat">
          <small>Base</small>
          <strong>${homeCount}</strong>
        </div>
        <div class="ludo-player-stat">
          <small>Run</small>
          <strong>${trackCount}</strong>
        </div>
        <div class="ludo-player-stat">
          <small>Goal</small>
          <strong>${goalCount}</strong>
        </div>
      </div>
    </article>
  `;
}

function getLudoTurnSummary(state, color = state.turn) {
  const ownerId = getLudoColorOwner(state, color);
  const turnColors = getLudoTurnColors(state, color);
  return {
    ownerId,
    ownerLabel: getLudoSeatLabel(ownerId),
    colorLabel: formatLudoTurnColorNames(turnColors),
    fullLabel: normalizeLudoSeatMode(state.seatMode) === 2
      ? `${getLudoSeatLabel(ownerId)} - ${formatLudoTurnColorNames(turnColors)}`
      : `${getLudoSeatLabel(ownerId)} - ${LUDO_DISPLAY[color].title}`
  };
}

function getLudoWinnerLabel(state) {
  if (!state.winner) {
    return "";
  }

  const ownerId = getLudoColorOwner(state, state.winner);
  const ownedColors = getLudoOwnedColors(state, ownerId);
  return ownedColors.length > 1
    ? getLudoSeatLabel(ownerId)
    : `${getLudoSeatLabel(ownerId)} - ${LUDO_DISPLAY[state.winner].title}`;
}

function renderLudoPlayerCard(state, color, isRolling = false, bandProfile = false) {
  const ownerId = getLudoColorOwner(state, color);
  const pieces = state.players[color].tokens;
  const homeCount = pieces.filter((position) => position === -1).length;
  const trackCount = pieces.filter((position) => position >= 0 && !isLudoGoalPosition(position)).length;
  const goalCount = pieces.filter((position) => isLudoGoalPosition(position)).length;
  const active = state.turn === color && !state.winner;
  const movesByDie = active && !isRolling && state.dice ? getLudoAvailableMovesByDie(state, color) : buildEmptyLudoMovesByDie(state.dice);
  const liveDice = getPlayableLudoDice(movesByDie).length;
  const status = state.winner === color
    ? "Winner"
    : active
      ? isRolling
        ? "Rolling"
        : state.dice
          ? liveDice ? `${liveDice} die${liveDice === 1 ? "" : "s"} live` : "Turn closing"
          : "Ready to roll"
      : "Waiting";

  return `
    <article class="ludo-player-card is-${color}${active ? " is-active" : ""}${bandProfile ? " is-band-profile" : ""}">
      <div class="ludo-player-top">
        <div>
          <strong>${escapeHtml(getLudoSeatLabel(ownerId))}</strong>
          <span>${escapeHtml(`${LUDO_DISPLAY[color].title} home - ${status}`)}</span>
        </div>
        <span class="ludo-player-badge is-${color}">${escapeHtml(LUDO_DISPLAY[color].short)}</span>
      </div>
      <div class="ludo-player-stats">
        <div class="ludo-player-stat">
          <small>Base</small>
          <strong>${homeCount}</strong>
        </div>
        <div class="ludo-player-stat">
          <small>Run</small>
          <strong>${trackCount}</strong>
        </div>
        <div class="ludo-player-stat">
          <small>Goal</small>
          <strong>${goalCount}</strong>
        </div>
      </div>
    </article>
  `;
}

GAME_ENGINES.ludo.render = function renderConfiguredLudo(runtime) {
  const state = getRenderableLudoState(runtime);
  const isRolling = Boolean(runtime.ludoRolling);
  const isMoving = Boolean(runtime.ludoMoveAnimation);
  const displayDice = isRolling ? runtime.ludoRolling.currentDice : state.dice;
  const turnSummary = getLudoTurnSummary(state);
  const movesByDie = !isRolling && !isMoving && state.dice
    ? getLudoAvailableMovesByDie(state, state.turn)
    : buildEmptyLudoMovesByDie(displayDice);
  const highlightedMoves = !isRolling && !isMoving && Number.isInteger(state.selectedDie) ? (movesByDie[state.selectedDie] || []) : [];
  const activeLabel = isRolling
    ? `${turnSummary.fullLabel} rolling`
    : isMoving
      ? `${turnSummary.fullLabel} moving`
    : state.winner
      ? `${getLudoWinnerLabel(state)} wins`
      : state.dice
        ? Number.isInteger(state.selectedDie)
          ? `${turnSummary.fullLabel} - Die ${state.selectedDie + 1}`
          : `${turnSummary.fullLabel} - Choose a die`
        : `${turnSummary.fullLabel} turn`;

  return {
    title: "Nigerian Ludo Table",
    copy: isRolling
    ? "The center dice are rolling. Wait for the final roll to settle."
      : isMoving
        ? "The live chip is counting cell by cell. Wait for it to settle before the next action."
      : state.winner
        ? `${getLudoWinnerLabel(state)} closed the table first.`
        : state.dice
          ? Number.isInteger(state.selectedDie)
            ? `Use the armed die on one of the glowing ${turnSummary.colorLabel.toLowerCase()} chips.`
            : `Tap a live die at the center, then move a ${turnSummary.colorLabel.toLowerCase()} chip.`
          : `${turnSummary.fullLabel} is using the center dice.`,
    html: renderLudoBoard(state, movesByDie, highlightedMoves, activeLabel, displayDice, isRolling, isMoving),
    notes: [
      {
        label: "Turn",
        value: state.winner ? getLudoWinnerLabel(state) : turnSummary.fullLabel,
        copy: state.note
      },
      {
        label: "Die",
        value: formatLudoDiceValues(displayDice),
        copy: state.winner
          ? "Round complete."
          : isRolling
        ? "The center dice keep rolling until the rolling sound finishes."
          : isMoving
            ? "The selected chip is walking through each counted cell before the move settles."
          : state.dice
            ? "Every banked die stays live until it is spent or no legal move remains."
              : "Two dice roll from the center of the board every turn."
      }
    ],
    controls: [
      { label: "Roll", value: "Roll the two center dice. A double six keeps the turn rolling and banks both sixes before the next pair lands." },
      { label: "Move", value: "Tap a live die, then move a matching chip along the white runway and arrow direction." },
      { label: "Goal", value: state.seatMode === 2 ? "Landing on any enemy chip sends it home and scores goal for the covering chip. First seat to clear all assigned chips wins." : "Landing on any enemy chip sends it home and scores goal for the covering chip. First player to goal all four wins." }
    ],
    bind() {
      document.getElementById("rollLudoButton")?.addEventListener("click", handleLudoRoll);
      document.querySelectorAll("[data-ludo-die]").forEach((button) => {
        button.addEventListener("click", () => {
          handleLudoSelectDie(Number(button.dataset.ludoDie));
        });
      });
      document.querySelectorAll("[data-ludo-token]").forEach((button) => {
        button.addEventListener("click", () => {
          handleLudoMove(button.dataset.ludoToken);
        });
      });
    }
  };
};

function renderLudoDieShell(state, value, dieIndex, moves, isRolling = false) {
  const idle = !isRolling && !Array.isArray(state.dice);
  const used = !isRolling && !idle && !Number.isInteger(value);
  const disabled = !isRolling && !idle && !used && !moves.length;
  const selected = state.selectedDie === dieIndex;
  const className = `ludo-die-shell${selected ? " is-selected" : ""}${isRolling ? " is-rolling" : ""}${idle ? " is-idle" : ""}${used ? " is-used" : ""}${disabled ? " is-dead" : ""}`;
  const label = isRolling
    ? `Die ${dieIndex + 1} rolling`
    : idle
    ? `Die ${dieIndex + 1} waiting for roll`
    : used
      ? `Die ${dieIndex + 1} used`
      : `Die ${dieIndex + 1} shows ${value}`;
  const body = idle
    ? renderLudoDieIdleFace()
    : used
      ? renderLudoDieUsedFace()
    : renderLudoDieFace(Number.isInteger(value) ? value : 0);

  if (!state.winner && !idle && !used && moves.length) {
    return `<button class="${className}" type="button" data-ludo-die="${dieIndex}" aria-label="${escapeHtml(label)}">${body}</button>`;
  }

  return `<div class="${className}" aria-label="${escapeHtml(label)}">${body}</div>`;
}

function renderLudoDieIdleFace() {
  return `
    <div class="ludo-die-face is-idle-face" aria-hidden="true">
      <span class="ludo-die-idle-text">DICE</span>
    </div>
  `;
}

function renderLudoDieUsedFace() {
  return `
    <div class="ludo-die-face is-used-face" aria-hidden="true">
      <span class="ludo-die-status-text">PLAYED</span>
    </div>
  `;
}

function renderLudoDieFace(value) {
  const pips = {
    1: [4],
    2: [0, 8],
    3: [0, 4, 8],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 2, 3, 5, 6, 8]
  };
  const active = new Set(pips[value] || []);
  return `
    <div class="ludo-die-face" aria-hidden="true">
      ${Array.from({ length: 9 }, (_, index) => `<span class="ludo-die-pip ${active.has(index) ? "is-on" : ""}"></span>`).join("")}
    </div>
  `;
}

function getLudoAvailableMovesByDie(state, color) {
  const output = buildEmptyLudoMovesByDie(state.dice);
  if (!Array.isArray(state.dice)) {
    return output;
  }

  const activeColors = getLudoTurnColors(state, color);
  state.dice.forEach((value, index) => {
    output[index] = Number.isInteger(value)
      ? activeColors.flatMap((entryColor) => {
          return getLudoAvailableMoves(state, entryColor, value).map((tokenIndex) => ludoTokenKey(entryColor, tokenIndex));
        })
      : [];
  });

  return output;
}

function getPlayableLudoDice(movesByDie) {
  return Object.entries(movesByDie)
    .filter(([, moves]) => moves.length)
    .map(([index]) => Number(index));
}

function getAutoSelectedLudoDie(movesByDie) {
  const playable = getPlayableLudoDice(movesByDie);
  return playable.length === 1 ? playable[0] : null;
}

function getLudoAvailableMoves(state, color, die) {
  return state.players[color].tokens
    .map((position, tokenIndex) => ({ position, tokenIndex }))
    .filter((entry) => canMoveLudoToken(entry.position, die))
    .map((entry) => entry.tokenIndex);
}

function canMoveLudoToken(position, die) {
  if (isLudoGoalPosition(position)) {
    return false;
  }
  if (position === -1) {
    return die === 6;
  }
  return position + die <= LUDO_GOAL_POSITION;
}

function getLudoCaptureTargets(state, color, nextPosition) {
  if (!Number.isInteger(nextPosition) || nextPosition < 0 || nextPosition >= LUDO_GOAL_POSITION) {
    return [];
  }

  const destinationKey = ludoCellKey(...ludoCoordinateForToken(color, nextPosition));
  const captures = [];

  LUDO_TURN_ORDER.filter((entry) => entry !== color).forEach((enemyColor) => {
    state.players[enemyColor].tokens.forEach((enemyPosition, enemyTokenIndex) => {
      if (enemyPosition >= 0 && !isLudoGoalPosition(enemyPosition)) {
        const enemyKey = ludoCellKey(...ludoCoordinateForToken(enemyColor, enemyPosition));
        if (enemyKey === destinationKey) {
          captures.push({
            color: enemyColor,
            tokenIndex: enemyTokenIndex,
            stackOrder: getLudoTokenStackOrder(state, enemyColor, enemyTokenIndex)
          });
        }
      }
    });
  });

  captures.sort((left, right) => {
    if (left.stackOrder !== right.stackOrder) {
      return right.stackOrder - left.stackOrder;
    }
    if (left.color !== right.color) {
      return LUDO_TURN_ORDER.indexOf(left.color) - LUDO_TURN_ORDER.indexOf(right.color);
    }
    return left.tokenIndex - right.tokenIndex;
  });

  return captures.length
    ? [{ color: captures[0].color, tokenIndex: captures[0].tokenIndex }]
    : [];
}

function previewLudoMove(state, color, tokenIndex, die) {
  const current = state.players[color].tokens[tokenIndex];
  const nextPosition = current === -1 ? 0 : current + die;
  const captureTargets = getLudoCaptureTargets(state, color, nextPosition);
  const finalPosition = nextPosition;

  return {
    nextPosition,
    finalPosition,
    captures: captureTargets.length,
    captureTargets,
    finishes: isLudoGoalPosition(finalPosition),
    leavesHome: current === -1,
    entersLane: current >= 0 && current <= 50 && nextPosition >= 51 && nextPosition < LUDO_GOAL_POSITION
  };
}

function describeLudoMove(preview) {
  if (preview.finishes) {
    return "reached the center goal";
  }
  if (preview.captures) {
    return "covered the top rival chip";
  }
  if (preview.leavesHome) {
    return "opened from base";
  }
  if (preview.entersLane) {
    return "entered the color lane";
  }
  return "advanced on the runway";
}

function handleLudoRoll() {
  if (!activeRuntime || isLudoRuntimeBusy()) {
    return;
  }

  const state = cloneLudoState(activeRuntime.state);
  if (state.dice || state.winner || !isLudoHumanTurn(state)) {
    return;
  }

  const turnSummary = getLudoTurnSummary(state, state.turn);
  const turnColorNames = formatLudoTurnColorNames(getLudoTurnColors(state), true);
  const rolledDice = rollLudoTurnDice();
  state.dice = [...rolledDice];
  const movesByDie = getLudoAvailableMovesByDie(state, state.turn);
  const playable = getPlayableLudoDice(movesByDie);
  const rollingState = cloneLudoState(activeRuntime.state);
  rollingState.note = "Rolling dice...";
  rollingState.selectedDie = null;
  const bonusRollCopy = rolledDice.length > 2 ? " Double six kept the rack rolling, and every banked die stays live." : "";

  if (!playable.length) {
    state.selectedDie = null;
    state.note = `${turnSummary.fullLabel} rolled ${formatLudoDiceValues(state.dice)} but no ${turnColorNames} chip could move.${bonusRollCopy}`;
    startLudoRollAnimation(rollingState, state, () => {
      persistRuntime(state);
      scheduleRuntimeAction(() => {
        if (!activeRuntime || activeRuntime.finished || isLudoRuntimeBusy()) {
          return;
        }
        const passed = cloneLudoState(activeRuntime.state);
        if (!Array.isArray(passed.dice) || passed.winner) {
          return;
        }
        passed.dice = null;
        passed.selectedDie = null;
        passed.turn = nextLudoColor(passed, state.turn);
        passed.note = `${turnSummary.fullLabel} rolled ${formatLudoDiceValues(rolledDice)} but no ${turnColorNames} chip could move.${bonusRollCopy} Turn passes to ${getLudoTurnSummary(passed, passed.turn).fullLabel}.`;
        persistRuntime(passed);
        if (shouldRunLudoBotTurn(passed)) {
          scheduleRuntimeAction(runLudoBotCycle, 650);
        }
      }, 850);
    }, { syncToAudioEnd: true });
    return;
  }

  state.selectedDie = getAutoSelectedLudoDie(movesByDie);
  state.note = state.selectedDie === null
    ? `${turnSummary.fullLabel} rolled ${formatLudoDiceValues(state.dice)}.${bonusRollCopy} Tap a live die, then tap a ${turnColorNames} chip.`
    : `${turnSummary.fullLabel} rolled ${formatLudoDiceValues(state.dice)}.${bonusRollCopy} Die ${state.selectedDie + 1} is ready.`;
  startLudoRollAnimation(rollingState, state, () => {
    persistRuntime(state);
  }, { syncToAudioEnd: true });
}

function handleLudoSelectDie(dieIndex) {
  if (!activeRuntime || isLudoRuntimeBusy()) {
    return;
  }

  const state = activeRuntime.state;
  if (!state.dice || state.winner || !isLudoHumanTurn(state)) {
    return;
  }

  const movesByDie = getLudoAvailableMovesByDie(state, state.turn);
  if (!(movesByDie[dieIndex] || []).length) {
    return;
  }

  const next = cloneLudoState(state);
  next.selectedDie = dieIndex;
  next.note = `Die ${dieIndex + 1} shows ${next.dice[dieIndex]}. Choose a ${formatLudoTurnColorNames(getLudoTurnColors(state), true)} chip.`;
  persistRuntime(next);
}

function handleLudoMove(tokenKey) {
  if (!activeRuntime || isLudoRuntimeBusy()) {
    return;
  }

  if (!isLudoHumanTurn(activeRuntime.state)) {
    return;
  }

  const [color, tokenIndexText] = tokenKey.split(":");
  const turnColor = activeRuntime.state.turn;
  const turnColors = getLudoTurnColors(activeRuntime.state, turnColor);
  if (!turnColors.includes(color)) {
    return;
  }

  const tokenIndex = Number(tokenIndexText);
  const currentTokenKey = ludoTokenKey(color, tokenIndex);
  let dieIndex = activeRuntime.state.selectedDie;

  if (!Number.isInteger(dieIndex)) {
    const movesByDie = getLudoAvailableMovesByDie(activeRuntime.state, turnColor);
    const playable = getPlayableLudoDice(movesByDie);
    if (playable.length === 1 && movesByDie[playable[0]].includes(currentTokenKey)) {
      dieIndex = playable[0];
    } else {
      return;
    }
  }

  const moveResult = moveLudoToken(activeRuntime.state, color, tokenIndex, dieIndex);
  if (!moveResult) {
    return;
  }
  startLudoMoveAnimation(activeRuntime.state, moveResult, (nextState) => {
    persistRuntime(nextState);

    if (nextState.winner) {
      closeLudo(nextState);
      return;
    }

    if (shouldRunLudoBotTurn(nextState)) {
      scheduleRuntimeAction(runLudoBotCycle, 650);
    }
  });
}

function moveLudoToken(state, color, tokenIndex, dieIndex) {
  if (!state.dice || !Number.isInteger(state.dice[dieIndex])) {
    return null;
  }

  const dieValue = state.dice[dieIndex];
  const movesByDie = getLudoAvailableMovesByDie(state, state.turn);
  if (!(movesByDie[dieIndex] || []).includes(ludoTokenKey(color, tokenIndex))) {
    return null;
  }

  const next = cloneLudoState(state);
  const preview = previewLudoMove(state, color, tokenIndex, dieValue);
  next.turnCount += 1;
  next.players[color].tokens[tokenIndex] = preview.finalPosition;
  promoteLudoTokenStackOrder(next, color, tokenIndex);

  if (preview.captureTargets.length) {
    preview.captureTargets.forEach((capture) => {
      next.players[capture.color].tokens[capture.tokenIndex] = -1;
    });
  }

  const finishedTokens = next.players[color].tokens.filter((position) => isLudoGoalPosition(position)).length;
  const ownerId = getLudoColorOwner(next, color);
  if (finishedTokens === 4 && getLudoGoalCountForSeat(next, ownerId) >= getLudoGoalTargetForSeat(next, ownerId)) {
    next.dice = null;
    next.selectedDie = null;
    next.winner = color;
    next.note = getLudoOwnedColors(next, ownerId).length > 1
      ? `${getLudoSeatLabel(ownerId)} cleared both assigned homes into the center.`
      : `${getLudoTurnSummary(next, color).fullLabel} cleared every chip into the center.`;
    return {
      color,
      tokenIndex,
      dieIndex,
      dieValue,
      startPosition: state.players[color].tokens[tokenIndex],
      preview,
      nextState: next
    };
  }

  next.dice[dieIndex] = null;
  const remainingMoves = getLudoAvailableMovesByDie(next, next.turn);
  const remainingPlayable = getPlayableLudoDice(remainingMoves);
  const captureCopy = preview.captures ? ` and sent ${preview.captures} chip${preview.captures > 1 ? "s" : ""} back home` : "";
  const moveCopy = `${getLudoTurnSummary(next, color).fullLabel} used ${dieValue}, ${describeLudoMove(preview)}${captureCopy}.`;

  if (remainingPlayable.length) {
    next.selectedDie = getAutoSelectedLudoDie(remainingMoves);
    next.note = `${moveCopy} Use the remaining dice.`;
    return {
      color,
      tokenIndex,
      dieIndex,
      dieValue,
      startPosition: state.players[color].tokens[tokenIndex],
      preview,
      nextState: next
    };
  }

  next.dice = null;
  next.selectedDie = null;
  next.turn = nextLudoColor(next, state.turn);
  next.note = `${moveCopy} Turn passes to ${getLudoTurnSummary(next, next.turn).fullLabel}.`;
  return {
    color,
    tokenIndex,
    dieIndex,
    dieValue,
    startPosition: state.players[color].tokens[tokenIndex],
    preview,
    nextState: next
  };
}

function nextLudoColor(stateOrColor, maybeColor) {
  const state = typeof stateOrColor === "object" && stateOrColor ? stateOrColor : activeRuntime?.state || null;
  const color = typeof stateOrColor === "string" ? stateOrColor : maybeColor;

  if (state && normalizeLudoSeatMode(state.seatMode) === 2) {
    const currentSeat = getLudoColorOwner(state, color);
    const seatOrder = getLudoSeatIds(2);
    const currentSeatIndex = Math.max(0, seatOrder.indexOf(currentSeat));
    const nextSeat = seatOrder[(currentSeatIndex + 1) % seatOrder.length];
    const nextColors = getLudoOwnedColors(state, nextSeat);
    return nextColors[0] || (nextSeat === "player1" ? "green" : "red");
  }

  const index = LUDO_TURN_ORDER.indexOf(color);
  return LUDO_TURN_ORDER[(index + 1) % LUDO_TURN_ORDER.length];
}

function runLudoBotCycle() {
  if (!activeRuntime || isLudoRuntimeBusy()) {
    return;
  }

  const state = activeRuntime.state;
  if (!shouldRunLudoBotTurn(state) || state.dice) {
    return;
  }

  const next = cloneLudoState(state);
  const botColor = next.turn;
  const turnSummary = getLudoTurnSummary(next, botColor);
  const turnColorNames = formatLudoTurnColorNames(getLudoTurnColors(next, botColor), true);
  next.dice = rollLudoTurnDice();
  next.selectedDie = null;
  const movesByDie = getLudoAvailableMovesByDie(next, botColor);
  const playable = getPlayableLudoDice(movesByDie);
  const bonusRollCopy = next.dice.length > 2 ? " Double six kept the rack rolling." : "";
  const rollingState = cloneLudoState(activeRuntime.state);
  rollingState.note = `${turnSummary.fullLabel} is rolling the dice.`;
  rollingState.selectedDie = null;

  if (!playable.length) {
    next.note = `${turnSummary.fullLabel} rolled ${formatLudoDiceValues(next.dice)} but no ${turnColorNames} chip could move.${bonusRollCopy}`;
    startLudoRollAnimation(rollingState, next, () => {
      persistRuntime(next);
      scheduleRuntimeAction(() => {
        if (!activeRuntime || activeRuntime.finished || isLudoRuntimeBusy()) {
          return;
        }
        const passed = cloneLudoState(activeRuntime.state);
        if (!Array.isArray(passed.dice) || passed.turn !== botColor || passed.winner) {
          return;
        }
        passed.dice = null;
        passed.selectedDie = null;
        passed.turn = nextLudoColor(passed, botColor);
        passed.note = `${turnSummary.fullLabel} rolled ${formatLudoDiceValues(next.dice)} but no ${turnColorNames} chip could move.${bonusRollCopy} Turn passes to ${getLudoTurnSummary(passed, passed.turn).fullLabel}.`;
        persistRuntime(passed);
        if (shouldRunLudoBotTurn(passed)) {
          scheduleRuntimeAction(runLudoBotCycle, 650);
        }
      }, 850);
    }, { syncToAudioEnd: true });
    return;
  }

  next.note = `${turnSummary.fullLabel} rolled ${formatLudoDiceValues(next.dice)}.${bonusRollCopy}`;
  startLudoRollAnimation(rollingState, next, () => {
    persistRuntime(next);
    scheduleRuntimeAction(() => resolveLudoBotTurn(botColor), 420);
  }, { syncToAudioEnd: true });
}

function resolveLudoBotTurn(color) {
  if (!activeRuntime || isLudoRuntimeBusy()) {
    return;
  }

  const state = activeRuntime.state;
  if (state.turn !== color || state.winner || !state.dice) {
    return;
  }

  const movesByDie = getLudoAvailableMovesByDie(state, color);
  const playableDice = getPlayableLudoDice(movesByDie);

  if (!playableDice.length) {
    const next = cloneLudoState(state);
    next.note = `${getLudoTurnSummary(next, color).fullLabel} could not spend the remaining dice.`;
    next.dice = null;
    next.selectedDie = null;
    next.turn = nextLudoColor(next, color);
    persistRuntime(next);
    if (shouldRunLudoBotTurn(next)) {
      scheduleRuntimeAction(runLudoBotCycle, 650);
    }
    return;
  }

  const dieIndex = chooseLudoBotDie(state, color, movesByDie);
  const chosenMove = chooseLudoBotMove(state, color, movesByDie[dieIndex], state.dice[dieIndex]);
  if (!chosenMove || !Number.isInteger(chosenMove.tokenIndex)) {
    return;
  }
  const moveResult = moveLudoToken(state, chosenMove.color, chosenMove.tokenIndex, dieIndex);
  if (!moveResult) {
    return;
  }
  startLudoMoveAnimation(state, moveResult, (movedState) => {
    persistRuntime(movedState);

    if (movedState.winner) {
      closeLudo(movedState);
      return;
    }

    if (movedState.turn === color && movedState.dice) {
      scheduleRuntimeAction(() => resolveLudoBotTurn(color), 420);
      return;
    }

    if (shouldRunLudoBotTurn(movedState)) {
      scheduleRuntimeAction(runLudoBotCycle, 650);
    }
  });
}

function scoreLudoPreview(preview, dieValue) {
  const progress = preview.finalPosition ?? preview.nextPosition;
  return (
    (preview.finishes ? 180 : 0) +
    (preview.captures * 56) +
    (preview.entersLane ? 30 : 0) +
    (preview.leavesHome ? 18 : 0) +
    progress +
    dieValue * 0.2
  );
}

function chooseLudoBotDie(state, color, movesByDie) {
  let bestDie = getPlayableLudoDice(movesByDie)[0];
  let bestScore = -Infinity;

  getPlayableLudoDice(movesByDie).forEach((dieIndex) => {
    const dieValue = state.dice[dieIndex];
    movesByDie[dieIndex].forEach((tokenKey) => {
      const move = parseLudoTokenKey(tokenKey, color);
      if (!move.color || !Number.isInteger(move.tokenIndex)) {
        return;
      }
      const preview = previewLudoMove(state, move.color, move.tokenIndex, dieValue);
      const score = scoreLudoPreview(preview, dieValue);

      if (score > bestScore) {
        bestScore = score;
        bestDie = dieIndex;
      }
    });
  });

  return bestDie;
}

function chooseLudoBotMove(state, color, moves, dieValue) {
  let best = parseLudoTokenKey(moves[0], color);
  let bestScore = -Infinity;

  moves.forEach((tokenKey) => {
    const move = parseLudoTokenKey(tokenKey, color);
    if (!move.color || !Number.isInteger(move.tokenIndex)) {
      return;
    }
    const preview = previewLudoMove(state, move.color, move.tokenIndex, dieValue);
    const score = scoreLudoPreview(preview, dieValue);
    if (score > bestScore) {
      bestScore = score;
      best = move;
    }
  });

  return best;
}

function closeLudo(state) {
  const winnerSeatId = getLudoColorOwner(state, state.winner);
  if (winnerSeatId === (state.localSeatId || "player1")) {
    finishActiveGame("win", `${getLudoWinnerLabel(state)} cleared the assigned home colors first.`);
    return;
  }

  finishActiveGame("loss", `${getLudoWinnerLabel(state)} emptied the table first.`);
}

const CONNECT_FOUR_ROWS = 6;
const CONNECT_FOUR_COLS = 7;
const REVERSI_DIRECTIONS = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1]
];
const MEMORY_VALUES = ["AX", "BN", "CR", "DQ", "EV", "FS", "GT", "HU"];

GAME_ENGINES.connectfour = {
  createState() {
    return {
      board: Array.from({ length: CONNECT_FOUR_ROWS }, () => Array(CONNECT_FOUR_COLS).fill("")),
      turn: "player",
      winner: null,
      note: "Claim the center to open more winning lanes."
    };
  },
  render(runtime) {
    const state = runtime.state;
    const validColumns = getConnectFourValidColumns(state.board);
    return {
      title: "Connect Four Arena",
      copy: state.winner ? "The stack is locked." : state.turn === "player" ? "Drop into any open lane." : "Bot is lining up a vertical trap.",
      html: `
        <div class="section-stack">
          <div class="connect-four-controls">
            ${Array.from({ length: CONNECT_FOUR_COLS }, (_, col) => {
              const clickable = state.turn === "player" && !state.winner && validColumns.includes(col);
              return `<button class="connect-four-drop" type="button" data-connectfour-col="${col}" ${clickable ? "" : "disabled"}>Drop ${col + 1}</button>`;
            }).join("")}
          </div>
          <div class="connect-four-board">
            ${state.board
              .map((row) => {
                return row
                  .map((cell) => {
                    return `
                      <div class="connect-four-slot">
                        <span class="connect-four-disc ${cell || ""}"></span>
                      </div>
                    `;
                  })
                  .join("");
              })
              .join("")}
          </div>
        </div>
      `,
      notes: [
        {
          label: "Status",
          value: state.winner ? capitalize(state.winner) : capitalize(state.turn),
          copy: state.note
        },
        {
          label: "Open lanes",
          value: String(validColumns.length),
          copy: "Every full column closes one route to four in a row."
        }
      ],
      controls: [
        { label: "Control 1", value: "Choose any open column from the top row." },
        { label: "Control 2", value: "Four connected discs in any direction wins immediately." },
        { label: "Control 3", value: "Center columns create the most combo options." }
      ],
      bind() {
        document.querySelectorAll("[data-connectfour-col]").forEach((button) => {
          button.addEventListener("click", () => handleConnectFourDrop(Number(button.dataset.connectfourCol)));
        });
      }
    };
  }
};

function getConnectFourValidColumns(board) {
  return board[0]
    .map((cell, col) => (cell ? null : col))
    .filter((value) => value !== null);
}

function dropConnectFourDisc(state, col, piece) {
  if (col < 0 || col >= CONNECT_FOUR_COLS || state.winner) {
    return null;
  }

  const board = state.board.map((row) => [...row]);
  let rowIndex = CONNECT_FOUR_ROWS - 1;

  while (rowIndex >= 0 && board[rowIndex][col]) {
    rowIndex -= 1;
  }

  if (rowIndex < 0) {
    return null;
  }

  board[rowIndex][col] = piece;
  const next = {
    ...state,
    board,
    turn: piece === "player" ? "bot" : "player",
    lastMove: {
      row: rowIndex,
      col,
      piece
    },
    note: piece === "player" ? `You dropped into lane ${col + 1}.` : `Bot answered in lane ${col + 1}.`
  };

  if (getConnectFourWinner(board, rowIndex, col, piece)) {
    next.winner = piece;
    next.note = piece === "player" ? "Four connected discs. Round secured." : "Bot completed a four-disc line.";
  } else if (!getConnectFourValidColumns(board).length) {
    next.winner = "draw";
    next.note = "Every column is full. The stack ends level.";
  }

  return next;
}

function getConnectFourWinner(board, row, col, piece) {
  const directions = [
    [1, 0],
    [0, 1],
    [1, 1],
    [1, -1]
  ];

  return directions.some(([deltaRow, deltaCol]) => {
    const total =
      1 +
      countConnectFourDirection(board, row, col, deltaRow, deltaCol, piece) +
      countConnectFourDirection(board, row, col, -deltaRow, -deltaCol, piece);
    return total >= 4;
  });
}

function countConnectFourDirection(board, row, col, deltaRow, deltaCol, piece) {
  let total = 0;
  let currentRow = row + deltaRow;
  let currentCol = col + deltaCol;

  while (
    currentRow >= 0 &&
    currentRow < CONNECT_FOUR_ROWS &&
    currentCol >= 0 &&
    currentCol < CONNECT_FOUR_COLS &&
    board[currentRow][currentCol] === piece
  ) {
    total += 1;
    currentRow += deltaRow;
    currentCol += deltaCol;
  }

  return total;
}

function chooseConnectFourBotMove(state, difficulty) {
  const validColumns = getConnectFourValidColumns(state.board);
  if (!validColumns.length) {
    return null;
  }

  for (const col of validColumns) {
    const winningMove = dropConnectFourDisc(state, col, "bot");
    if (winningMove && winningMove.winner === "bot") {
      return col;
    }
  }

  if (difficulty !== "rookie") {
    for (const col of validColumns) {
      const blockMove = dropConnectFourDisc(state, col, "player");
      if (blockMove && blockMove.winner === "player") {
        return col;
      }
    }
  }

  let bestColumn = validColumns[0];
  let bestScore = -Infinity;

  validColumns.forEach((col) => {
    const preview = dropConnectFourDisc(state, col, "bot");
    if (!preview) {
      return;
    }

    const landingRow = preview.lastMove ? preview.lastMove.row : CONNECT_FOUR_ROWS - 1;
    const longestLine = Math.max(
      1 + countConnectFourDirection(preview.board, landingRow, col, 1, 0, "bot") + countConnectFourDirection(preview.board, landingRow, col, -1, 0, "bot"),
      1 + countConnectFourDirection(preview.board, landingRow, col, 0, 1, "bot") + countConnectFourDirection(preview.board, landingRow, col, 0, -1, "bot"),
      1 + countConnectFourDirection(preview.board, landingRow, col, 1, 1, "bot") + countConnectFourDirection(preview.board, landingRow, col, -1, -1, "bot"),
      1 + countConnectFourDirection(preview.board, landingRow, col, 1, -1, "bot") + countConnectFourDirection(preview.board, landingRow, col, -1, 1, "bot")
    );

    let score = 14 - Math.abs(3 - col) * 4 + longestLine * 12;

    if (difficulty === "elite") {
      const replyLanes = getConnectFourValidColumns(preview.board).length;
      score += replyLanes;
    }

    if (score > bestScore) {
      bestScore = score;
      bestColumn = col;
    }
  });

  return bestColumn;
}

function handleConnectFourDrop(col) {
  if (!activeRuntime || activeRuntime.state.turn !== "player" || activeRuntime.state.winner) {
    return;
  }

  const next = dropConnectFourDisc(activeRuntime.state, col, "player");
  if (!next) {
    return;
  }

  persistRuntime(next);

  if (next.winner) {
    closeConnectFour(next);
    return;
  }

  scheduleRuntimeAction(runConnectFourBotTurn, 650);
}

function runConnectFourBotTurn() {
  if (!activeRuntime || activeRuntime.state.turn !== "bot" || activeRuntime.state.winner) {
    return;
  }

  const col = chooseConnectFourBotMove(activeRuntime.state, activeRuntime.match.difficulty);
  if (col === null) {
    const drawState = { ...activeRuntime.state, winner: "draw", note: "The final lane is gone. Match drawn." };
    persistRuntime(drawState);
    closeConnectFour(drawState);
    return;
  }

  const next = dropConnectFourDisc(activeRuntime.state, col, "bot");
  if (!next) {
    return;
  }

  persistRuntime(next);

  if (next.winner) {
    closeConnectFour(next);
  }
}

function closeConnectFour(state) {
  if (state.winner === "player") {
    finishActiveGame("win", "You connected four before the bot could close the lane.");
  } else if (state.winner === "bot") {
    finishActiveGame("loss", "The bot completed a four-disc line first.");
  } else {
    finishActiveGame("draw", "The Connect Four board filled without a winning line.");
  }
}

GAME_ENGINES.reversi = {
  createState() {
    return {
      board: createReversiBoard(),
      turn: "player",
      winner: null,
      note: "Corners are premium. Avoid feeding the edges too early."
    };
  },
  render(runtime) {
    const state = runtime.state;
    const counts = countReversiDiscs(state.board);
    const legalMoves = state.turn === "player" && !state.winner ? getReversiLegalMoves(state.board, "player") : [];
    return {
      title: "Reversi Arena",
      copy: state.winner ? "The disc spread is final." : state.turn === "player" ? "Place a disc on a glowing target." : "Bot is scanning the best flip.",
      html: `
        <div class="section-stack">
          <div class="two-up">
            <div class="mini-panel">
              <small>Your discs</small>
              <strong>${counts.player}</strong>
            </div>
            <div class="mini-panel">
              <small>Bot discs</small>
              <strong>${counts.bot}</strong>
            </div>
          </div>
          <div class="reversi-board">
            ${state.board
              .map((row, rowIndex) => {
                return row
                  .map((piece, colIndex) => {
                    const legalMove = legalMoves.find((move) => move.row === rowIndex && move.col === colIndex);
                    const clickable = Boolean(legalMove);
                    return `
                      <button class="reversi-cell" type="button" data-reversi-cell="${rowIndex}-${colIndex}" ${clickable ? "" : "disabled"}>
                        ${piece ? `<span class="reversi-disc ${piece}"></span>` : ""}
                        ${!piece && legalMove ? '<span class="reversi-marker"></span>' : ""}
                      </button>
                    `;
                  })
                  .join("");
              })
              .join("")}
          </div>
        </div>
      `,
      notes: [
        {
          label: "Status",
          value: state.winner ? capitalize(state.winner) : capitalize(state.turn),
          copy: state.note
        },
        {
          label: "Playable targets",
          value: String(legalMoves.length),
          copy: "Only moves that flip enemy discs are legal."
        }
      ],
      controls: [
        { label: "Control 1", value: "Click a glowing square to place your disc." },
        { label: "Control 2", value: "Any trapped enemy line flips to your color immediately." },
        { label: "Control 3", value: "Corners are difficult to steal once secured." }
      ],
      bind() {
        document.querySelectorAll("[data-reversi-cell]").forEach((button) => {
          button.addEventListener("click", () => {
            const [row, col] = button.dataset.reversiCell.split("-").map(Number);
            handleReversiClick(row, col);
          });
        });
      }
    };
  }
};

function createReversiBoard() {
  const board = Array.from({ length: 8 }, () => Array(8).fill(""));
  board[3][3] = "bot";
  board[3][4] = "player";
  board[4][3] = "player";
  board[4][4] = "bot";
  return board;
}

function getReversiOpponent(piece) {
  return piece === "player" ? "bot" : "player";
}

function collectReversiFlips(board, piece, row, col) {
  if (board[row][col]) {
    return [];
  }

  const opponent = getReversiOpponent(piece);
  const flips = [];

  REVERSI_DIRECTIONS.forEach(([deltaRow, deltaCol]) => {
    const lane = [];
    let currentRow = row + deltaRow;
    let currentCol = col + deltaCol;

    while (currentRow >= 0 && currentRow < 8 && currentCol >= 0 && currentCol < 8 && board[currentRow][currentCol] === opponent) {
      lane.push([currentRow, currentCol]);
      currentRow += deltaRow;
      currentCol += deltaCol;
    }

    if (
      lane.length &&
      currentRow >= 0 &&
      currentRow < 8 &&
      currentCol >= 0 &&
      currentCol < 8 &&
      board[currentRow][currentCol] === piece
    ) {
      flips.push(...lane);
    }
  });

  return flips;
}

function getReversiLegalMoves(board, piece) {
  const moves = [];

  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      const flips = collectReversiFlips(board, piece, row, col);
      if (flips.length) {
        moves.push({ row, col, flips });
      }
    }
  }

  return moves;
}

function countReversiDiscs(board) {
  return board.flat().reduce(
    (counts, piece) => {
      if (piece === "player") {
        counts.player += 1;
      } else if (piece === "bot") {
        counts.bot += 1;
      }
      return counts;
    },
    { player: 0, bot: 0 }
  );
}

function resolveReversiState(state) {
  const currentMoves = getReversiLegalMoves(state.board, state.turn);
  if (currentMoves.length) {
    return state;
  }

  const otherTurn = getReversiOpponent(state.turn);
  const otherMoves = getReversiLegalMoves(state.board, otherTurn);
  if (otherMoves.length) {
    return {
      ...state,
      turn: otherTurn,
      note: `${capitalize(otherTurn)} moves next after a forced pass.`
    };
  }

  const counts = countReversiDiscs(state.board);
  return {
    ...state,
    winner: counts.player === counts.bot ? "draw" : counts.player > counts.bot ? "player" : "bot",
    note: "No legal flips remain. Final disc counts are locked."
  };
}

function applyReversiMove(state, row, col, piece) {
  const legalMove = getReversiLegalMoves(state.board, piece).find((move) => move.row === row && move.col === col);
  if (!legalMove || state.winner) {
    return null;
  }

  const board = state.board.map((line) => [...line]);
  board[row][col] = piece;
  legalMove.flips.forEach(([flipRow, flipCol]) => {
    board[flipRow][flipCol] = piece;
  });

  return resolveReversiState({
    ...state,
    board,
    turn: getReversiOpponent(piece),
    note: piece === "player" ? "You flipped a new lane." : "Bot flips the line and keeps pressure on the board."
  });
}

function chooseReversiBotMove(state, difficulty) {
  const moves = getReversiLegalMoves(state.board, "bot");
  if (!moves.length) {
    return null;
  }

  if (difficulty === "rookie") {
    return moves[Math.floor(Math.random() * moves.length)];
  }

  const corners = new Set(["0-0", "0-7", "7-0", "7-7"]);
  const dangerSquares = new Set(["0-1", "1-0", "1-1", "0-6", "1-6", "1-7", "6-0", "6-1", "7-1", "6-6", "6-7", "7-6"]);
  let bestMove = moves[0];
  let bestScore = -Infinity;

  moves.forEach((move) => {
    const key = `${move.row}-${move.col}`;
    let score = move.flips.length * 12;

    if (corners.has(key)) {
      score += 120;
    } else if (move.row === 0 || move.row === 7 || move.col === 0 || move.col === 7) {
      score += 18;
    }

    if (dangerSquares.has(key)) {
      score -= 34;
    }

    if (difficulty === "elite") {
      const preview = applyReversiMove(state, move.row, move.col, "bot");
      if (preview) {
        const replyCount = getReversiLegalMoves(preview.board, "player").length;
        const counts = countReversiDiscs(preview.board);
        score += (counts.bot - counts.player) * 2;
        score -= replyCount * 4;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  });

  return bestMove;
}

function handleReversiClick(row, col) {
  if (!activeRuntime || activeRuntime.state.turn !== "player" || activeRuntime.state.winner) {
    return;
  }

  const next = applyReversiMove(activeRuntime.state, row, col, "player");
  if (!next) {
    return;
  }

  persistRuntime(next);

  if (next.winner) {
    closeReversi(next);
    return;
  }

  if (next.turn === "bot") {
    scheduleRuntimeAction(runReversiBotTurn, 700);
  }
}

function runReversiBotTurn() {
  if (!activeRuntime || activeRuntime.state.turn !== "bot" || activeRuntime.state.winner) {
    return;
  }

  const move = chooseReversiBotMove(activeRuntime.state, activeRuntime.match.difficulty);
  if (!move) {
    const resolved = resolveReversiState({
      ...activeRuntime.state,
      note: "Bot is forced to pass this turn."
    });
    persistRuntime(resolved);

    if (resolved.winner) {
      closeReversi(resolved);
    } else if (resolved.turn === "bot") {
      scheduleRuntimeAction(runReversiBotTurn, 650);
    }
    return;
  }

  const next = applyReversiMove(activeRuntime.state, move.row, move.col, "bot");
  if (!next) {
    return;
  }

  persistRuntime(next);

  if (next.winner) {
    closeReversi(next);
  } else if (next.turn === "bot") {
    scheduleRuntimeAction(runReversiBotTurn, 650);
  }
}

function closeReversi(state) {
  if (state.winner === "player") {
    finishActiveGame("win", "You controlled the flip lines and finished with the stronger disc count.");
  } else if (state.winner === "bot") {
    finishActiveGame("loss", "The bot controlled more of the Reversi board at the end.");
  } else {
    finishActiveGame("draw", "Reversi closed level on final disc count.");
  }
}

GAME_ENGINES.memory = {
  createState() {
    return {
      cards: createMemoryDeck(),
      selected: [],
      scores: {
        player: 0,
        bot: 0
      },
      memory: {},
      turn: "player",
      winner: null,
      busy: false,
      note: "Reveal clean pairs before the bot can memorize the grid."
    };
  },
  render(runtime) {
    const state = runtime.state;
    const pairsLeft = state.cards.filter((card) => !card.matched).length / 2;
    return {
      title: "Memory Match Arena",
      copy: state.winner
        ? "The final pattern is solved."
        : state.turn === "player"
          ? state.busy
            ? "Cards are resolving..."
            : "Flip two hidden cards."
          : "Bot is reading the board.",
      html: `
        <div class="section-stack">
          <div class="two-up">
            <div class="mini-panel">
              <small>Your pairs</small>
              <strong>${state.scores.player}</strong>
            </div>
            <div class="mini-panel">
              <small>Bot pairs</small>
              <strong>${state.scores.bot}</strong>
            </div>
          </div>
          <div class="memory-grid">
            ${state.cards
              .map((card, index) => {
                const clickable = state.turn === "player" && !state.winner && !state.busy && !card.matched && !card.revealed;
                return `
                  <button class="memory-card ${card.revealed || card.matched ? "revealed" : ""} ${card.matched ? "matched" : ""}" type="button" data-memory-card="${index}" ${clickable ? "" : "disabled"}>
                    <span class="memory-card-face">${card.revealed || card.matched ? escapeHtml(card.value) : "?"}</span>
                  </button>
                `;
              })
              .join("")}
          </div>
        </div>
      `,
      notes: [
        {
          label: "Status",
          value: state.winner ? capitalize(state.winner) : capitalize(state.turn),
          copy: state.note
        },
        {
          label: "Pairs left",
          value: String(pairsLeft),
          copy: "Every reveal helps both players build memory of the grid."
        }
      ],
      controls: [
        { label: "Control 1", value: "Flip one hidden card, then find its partner." },
        { label: "Control 2", value: "Matched pairs stay visible and add to your score." },
        { label: "Control 3", value: "Missed pairs flip back and hand the turn over." }
      ],
      bind() {
        document.querySelectorAll("[data-memory-card]").forEach((button) => {
          button.addEventListener("click", () => handleMemoryPick(Number(button.dataset.memoryCard)));
        });
      }
    };
  }
};

function createMemoryDeck() {
  return shuffle([...MEMORY_VALUES, ...MEMORY_VALUES]).map((value, index) => ({
    id: `${value}-${index}`,
    value,
    revealed: false,
    matched: false
  }));
}

function cloneMemoryState(state) {
  return {
    ...state,
    cards: state.cards.map((card) => ({ ...card })),
    selected: [...state.selected],
    scores: { ...state.scores },
    memory: Object.fromEntries(Object.entries(state.memory || {}).map(([key, value]) => [key, [...value]]))
  };
}

function pruneMemoryKnowledge(state) {
  Object.keys(state.memory || {}).forEach((value) => {
    const remaining = state.memory[value].filter((index, position, list) => {
      return (
        list.indexOf(index) === position &&
        state.cards[index] &&
        !state.cards[index].matched
      );
    });

    if (remaining.length) {
      state.memory[value] = remaining;
    } else {
      delete state.memory[value];
    }
  });
}

function rememberMemoryCard(state, index) {
  const card = state.cards[index];
  if (!card || card.matched) {
    return;
  }

  const known = Array.isArray(state.memory[card.value]) ? [...state.memory[card.value]] : [];
  if (!known.includes(index)) {
    known.push(index);
  }
  state.memory[card.value] = known;
  pruneMemoryKnowledge(state);
}

function availableMemoryIndices(state, options = {}) {
  const exclude = options.exclude || [];
  return state.cards
    .map((card, index) => ({ card, index }))
    .filter(({ card, index }) => !card.matched && !card.revealed && !exclude.includes(index))
    .map(({ index }) => index);
}

function revealMemoryCard(state, index, note) {
  const next = cloneMemoryState(state);
  const card = next.cards[index];
  if (!card || card.matched || card.revealed) {
    return null;
  }

  card.revealed = true;
  next.selected.push(index);
  rememberMemoryCard(next, index);
  next.note = note;
  return next;
}

function resolveMemorySelection(state, actor) {
  const next = cloneMemoryState(state);
  if (next.selected.length < 2) {
    return next;
  }

  const [first, second] = next.selected;
  const isMatch = next.cards[first].value === next.cards[second].value;

  if (isMatch) {
    next.cards[first].matched = true;
    next.cards[second].matched = true;
    next.selected = [];
    next.busy = false;
    next.turn = actor;
    next.scores[actor] += 1;
    pruneMemoryKnowledge(next);

    if (next.cards.every((card) => card.matched)) {
      next.winner = next.scores.player === next.scores.bot ? "draw" : next.scores.player > next.scores.bot ? "player" : "bot";
      next.note = "Every pair has been claimed. Final scores are in.";
    } else {
      next.note = actor === "player" ? "Pair secured. You keep the turn." : "Bot found a pair and stays on the board.";
    }

    return next;
  }

  next.busy = true;
  next.note = actor === "player" ? "No match. Cards flip back and the bot takes the board." : "Bot missed the pattern. The board swings back to you.";
  return next;
}

function hideMemoryMismatch(state, nextTurn, note) {
  const next = cloneMemoryState(state);
  next.selected.forEach((index) => {
    if (next.cards[index] && !next.cards[index].matched) {
      next.cards[index].revealed = false;
    }
  });
  next.selected = [];
  next.busy = false;
  next.turn = nextTurn;
  next.note = note;
  pruneMemoryKnowledge(next);
  return next;
}

function findKnownMemoryPair(state, exclude = []) {
  for (const indexes of Object.values(state.memory || {})) {
    const available = indexes.filter((index) => {
      return state.cards[index] && !state.cards[index].matched && !state.cards[index].revealed && !exclude.includes(index);
    });

    if (available.length >= 2) {
      return available;
    }
  }

  return null;
}

function chooseMemoryBotFirstPick(state, difficulty) {
  const hidden = availableMemoryIndices(state);
  if (!hidden.length) {
    return null;
  }

  const knownPair = difficulty !== "rookie" ? findKnownMemoryPair(state) : null;
  if (knownPair) {
    return knownPair[0];
  }

  if (difficulty === "elite") {
    const remembered = Object.values(state.memory || {})
      .flat()
      .filter((index, position, list) => list.indexOf(index) === position && hidden.includes(index));

    if (remembered.length) {
      return remembered[Math.floor(Math.random() * remembered.length)];
    }
  }

  return hidden[Math.floor(Math.random() * hidden.length)];
}

function chooseMemoryBotSecondPick(state, firstIndex, difficulty) {
  const firstCard = state.cards[firstIndex];
  if (!firstCard) {
    return null;
  }

  if (difficulty !== "rookie") {
    const knownMatch = (state.memory[firstCard.value] || []).find((index) => {
      return index !== firstIndex && state.cards[index] && !state.cards[index].matched && !state.cards[index].revealed;
    });

    if (knownMatch !== undefined) {
      return knownMatch;
    }
  }

  const hidden = availableMemoryIndices(state, { exclude: [firstIndex] });
  if (!hidden.length) {
    return null;
  }

  return hidden[Math.floor(Math.random() * hidden.length)];
}

function handleMemoryPick(index) {
  if (!activeRuntime || activeRuntime.state.turn !== "player" || activeRuntime.state.winner || activeRuntime.state.busy) {
    return;
  }

  const next = revealMemoryCard(
    activeRuntime.state,
    index,
    activeRuntime.state.selected.length ? "Second card revealed." : "First card revealed."
  );
  if (!next) {
    return;
  }

  persistRuntime(next);

  if (next.selected.length < 2) {
    return;
  }

  const resolved = resolveMemorySelection(next, "player");
  persistRuntime(resolved);

  if (resolved.winner) {
    closeMemory(resolved);
    return;
  }

  if (resolved.busy) {
    scheduleRuntimeAction(() => {
      const hidden = hideMemoryMismatch(activeRuntime.state, "bot", "Bot turn. Track the pattern before it does.");
      persistRuntime(hidden);
      scheduleRuntimeAction(runMemoryBotTurn, 380);
    }, 850);
  }
}

function runMemoryBotTurn() {
  if (!activeRuntime || activeRuntime.state.turn !== "bot" || activeRuntime.state.winner || activeRuntime.state.busy) {
    return;
  }

  const firstIndex = chooseMemoryBotFirstPick(activeRuntime.state, activeRuntime.match.difficulty);
  if (firstIndex === null) {
    return;
  }

  const firstReveal = revealMemoryCard(activeRuntime.state, firstIndex, "Bot flips the first memory card.");
  if (!firstReveal) {
    return;
  }

  persistRuntime(firstReveal);
  scheduleRuntimeAction(() => runMemoryBotSecondPick(firstIndex), 520);
}

function runMemoryBotSecondPick(firstIndex) {
  if (!activeRuntime || activeRuntime.state.turn !== "bot" || activeRuntime.state.winner || activeRuntime.state.busy) {
    return;
  }

  const secondIndex = chooseMemoryBotSecondPick(activeRuntime.state, firstIndex, activeRuntime.match.difficulty);
  if (secondIndex === null) {
    const fallback = hideMemoryMismatch(activeRuntime.state, "player", "Bot stalled. Your turn is back.");
    persistRuntime(fallback);
    return;
  }

  const secondReveal = revealMemoryCard(activeRuntime.state, secondIndex, "Bot flips the second card.");
  if (!secondReveal) {
    return;
  }

  const resolved = resolveMemorySelection(secondReveal, "bot");
  persistRuntime(resolved);

  if (resolved.winner) {
    closeMemory(resolved);
    return;
  }

  if (resolved.busy) {
    scheduleRuntimeAction(() => {
      const hidden = hideMemoryMismatch(activeRuntime.state, "player", "Your turn is back. Use what the board revealed.");
      persistRuntime(hidden);
    }, 850);
  } else {
    scheduleRuntimeAction(runMemoryBotTurn, 650);
  }
}

function closeMemory(state) {
  if (state.winner === "player") {
    finishActiveGame("win", "You remembered more pairs than the bot and closed the board on top.");
  } else if (state.winner === "bot") {
    finishActiveGame("loss", "The bot tracked the pairs more cleanly and won the memory duel.");
  } else {
    finishActiveGame("draw", "Memory Match ended level on total pairs.");
  }
}
