const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs/promises");
const { existsSync } = require("fs");
const crypto = require("crypto");
const { MongoClient, ServerApiVersion } = require("mongodb");

const app = express();

const ROOT_DIR = path.resolve(__dirname, "..");
const FRONTEND_DIR = path.join(ROOT_DIR, "frontend");
const DATABASE_DIR = path.join(ROOT_DIR, "database");
const DATA_FILE = path.join(DATABASE_DIR, "app-data.json");
const SEED_DATA_FILE = path.join(DATABASE_DIR, "app-data.seed.json");
const LEGACY_USERS_FILE = path.join(__dirname, "users.json");
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "0.0.0.0";
const NODE_ENV = String(process.env.NODE_ENV || "development").trim().toLowerCase();
const IS_PRODUCTION = NODE_ENV === "production";
const MONGODB_URI = String(process.env.MONGODB_URI || "").trim();
const MONGODB_DB_NAME = String(process.env.MONGODB_DB_NAME || "opticoreplay").trim() || "opticoreplay";
const MONGODB_COLLECTION = String(process.env.MONGODB_COLLECTION || "app_store").trim() || "app_store";
const MONGODB_DOCUMENT_ID = String(process.env.MONGODB_DOCUMENT_ID || "primary").trim() || "primary";
const CORS_ORIGIN = String(process.env.CORS_ORIGIN || "").trim();

const TOURNAMENT_TEMPLATES = [
  {
    id: "tour-ludo-rush",
    name: "Daily Ludo Rush",
    game: "ludo",
    entryFee: 500,
    prize: 10000,
    slots: 32,
    joinedUsers: [],
    status: "OPEN",
    startsAtLabel: "Today 8:30 PM",
    headline: "Fast rounds, aggressive bots, and a clean prize pool."
  },
  {
    id: "tour-chess-masters",
    name: "Weekend Chess Masters",
    game: "chess",
    entryFee: 1000,
    prize: 25000,
    slots: 16,
    joinedUsers: [],
    status: "OPEN",
    startsAtLabel: "Saturday 6:00 PM",
    headline: "Position-heavy chess with higher stakes and sharper rewards."
  },
  {
    id: "tour-ayo-clash",
    name: "Ayo Kings Clash",
    game: "ayo",
    entryFee: 300,
    prize: 6000,
    slots: 24,
    joinedUsers: [],
    status: "OPEN",
    startsAtLabel: "Friday 7:00 PM",
    headline: "Seed capture specialists only. Quick ladder, real bragging rights."
  }
];

const DEFAULT_CORS_ORIGIN_PATTERNS = [
  "http://127.0.0.1:3000",
  "http://localhost:3000",
  "http://127.0.0.1:5173",
  "http://localhost:5173"
];

function useMongoStore() {
  return Boolean(MONGODB_URI);
}

function assertRuntimeConfiguration() {
  if (IS_PRODUCTION && !useMongoStore()) {
    throw new Error("MONGODB_URI is required in production because the local file store is ephemeral.");
  }
}

function normalizeOriginPattern(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function parseOriginPatterns(value) {
  return String(value || "")
    .split(",")
    .map(normalizeOriginPattern)
    .filter(Boolean);
}

function escapeRegex(value) {
  return value.replace(/[|\\{}()[\]^$+?.]/g, "\\$&");
}

function originMatchesPattern(origin, pattern) {
  if (!origin || !pattern) {
    return false;
  }

  const normalizedOrigin = normalizeOriginPattern(origin);
  const normalizedPattern = normalizeOriginPattern(pattern);

  if (normalizedPattern.includes("*")) {
    const regex = new RegExp(`^${normalizedPattern.split("*").map(escapeRegex).join(".*")}$`, "i");
    return regex.test(normalizedOrigin);
  }

  return normalizedOrigin === normalizedPattern;
}

const configuredCorsOrigins = parseOriginPatterns(CORS_ORIGIN);
const corsOriginPatterns = configuredCorsOrigins.length ? configuredCorsOrigins : DEFAULT_CORS_ORIGIN_PATTERNS;

if (IS_PRODUCTION && !configuredCorsOrigins.length) {
  console.warn("CORS_ORIGIN is not set. Cross-origin browser requests are disabled until you configure an allowed frontend origin.");
}

const corsOptions = {
  origin(origin, callback) {
    if (!origin) {
      callback(null, true);
      return;
    }

    const allowed = corsOriginPatterns.some((pattern) => originMatchesPattern(origin, pattern));
    callback(null, allowed);
  }
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.static(FRONTEND_DIR));

function createId(prefix) {
  return `${prefix}-${crypto.randomBytes(5).toString("hex")}`;
}

function now() {
  return new Date().toISOString();
}

function clampNumber(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return min;
  }
  return Math.min(max, Math.max(min, number));
}

const LUDO_COLORS = ["green", "red", "yellow", "blue"];
const LUDO_GOAL_POSITION = 56;
const LUDO_INITIAL_NOTE = "Roll the two center dice. Any die showing 6 can open a chip onto its colored gate square.";
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

function normalizeLudoSeatMode(value) {
  return Number(value) === 2 ? 2 : 4;
}

function ludoSeatIds(seatMode = 4) {
  return normalizeLudoSeatMode(seatMode) === 2
    ? ["player1", "player2"]
    : ["player1", "player2", "player3", "player4"];
}

function defaultLudoColorOwners(seatMode = 4) {
  return { ...LUDO_COLOR_OWNERS_BY_MODE[normalizeLudoSeatMode(seatMode)] };
}

function normalizeLudoColorOwners(input, seatMode = 4) {
  const normalizedSeatMode = normalizeLudoSeatMode(seatMode);
  const defaults = defaultLudoColorOwners(normalizedSeatMode);
  const seats = ludoSeatIds(normalizedSeatMode);

  if (!input || typeof input !== "object") {
    return defaults;
  }

  const counts = new Map(seats.map((seatId) => [seatId, 0]));
  const owners = {};

  for (const color of LUDO_COLORS) {
    const candidate = typeof input[color] === "string" ? input[color] : defaults[color];
    owners[color] = seats.includes(candidate) ? candidate : defaults[color];
    counts.set(owners[color], Number(counts.get(owners[color]) || 0) + 1);
  }

  const expectedPerSeat = normalizedSeatMode === 2 ? 2 : 1;
  if (seats.some((seatId) => Number(counts.get(seatId) || 0) !== expectedPerSeat)) {
    return defaults;
  }

  return owners;
}

function cloneJsonValue(value) {
  if (value === undefined) {
    return null;
  }
  return value === null ? null : JSON.parse(JSON.stringify(value));
}

function normalizePrivateMatchStateVersion(value) {
  const version = Number(value);
  return Number.isInteger(version) && version >= 0 ? version : 0;
}

function defaultLudoStackOrder(color, tokenIndex) {
  return Math.max(0, LUDO_COLORS.indexOf(color)) * 4 + tokenIndex;
}

function normalizePrivateLudoPlayerState(color, playerState = {}) {
  const rawTokens = Array.isArray(playerState && playerState.tokens) ? playerState.tokens : [];
  const rawStackOrder = Array.isArray(playerState && playerState.stackOrder) ? playerState.stackOrder : [];
  return {
    tokens: Array.from({ length: 4 }, (_, tokenIndex) => {
      const value = Number(rawTokens[tokenIndex]);
      return Number.isInteger(value) && value >= -1 && value <= LUDO_GOAL_POSITION ? value : -1;
    }),
    stackOrder: Array.from({ length: 4 }, (_, tokenIndex) => {
      const value = Number(rawStackOrder[tokenIndex]);
      return Number.isInteger(value) ? value : defaultLudoStackOrder(color, tokenIndex);
    })
  };
}

function normalizePrivateLudoPlayers(players = {}) {
  const source = players && typeof players === "object" ? players : {};
  return Object.fromEntries(
    LUDO_COLORS.map((color) => [color, normalizePrivateLudoPlayerState(color, source[color])])
  );
}

function getPrivateLudoMaxStackOrder(players) {
  const normalizedPlayers = normalizePrivateLudoPlayers(players);
  return LUDO_COLORS.reduce((maxOrder, color) => {
    return Math.max(maxOrder, ...normalizedPlayers[color].stackOrder);
  }, -1);
}

function createInitialPrivateLudoState(session) {
  const seatMode = normalizeLudoSeatMode(session.ludoSeatMode || 4);
  const colorOwners = normalizeLudoColorOwners(session.ludoColorOwners, seatMode);
  const players = normalizePrivateLudoPlayers({
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
    note: LUDO_INITIAL_NOTE,
    turnCount: 0,
    stackSerial: getPrivateLudoMaxStackOrder(players),
    seatMode,
    colorOwners,
    botMode: false
  };
}

function sanitizePrivateMatchState(session, rawState, options = {}) {
  const fallbackToInitial = Boolean(options.fallbackToInitial);

  if (!rawState || typeof rawState !== "object" || Array.isArray(rawState)) {
    return fallbackToInitial && session.game === "ludo"
      ? createInitialPrivateLudoState(session)
      : null;
  }

  const state = cloneJsonValue(rawState);

  if (session.game !== "ludo") {
    return state;
  }

  const seatMode = normalizeLudoSeatMode(session.ludoSeatMode || state.seatMode || 4);
  const colorOwners = normalizeLudoColorOwners(session.ludoColorOwners || state.colorOwners, seatMode);
  const players = normalizePrivateLudoPlayers(state.players);
  const maxStackOrder = getPrivateLudoMaxStackOrder(players);
  const selectedDie = Number(state.selectedDie);
  const turnCount = Number(state.turnCount);
  const stackSerial = Number(state.stackSerial);

  return {
    players,
    turn: LUDO_COLORS.includes(state.turn) ? state.turn : "green",
    dice: Array.isArray(state.dice)
      ? state.dice.map((value) => {
          const dieValue = Number(value);
          return Number.isInteger(dieValue) && dieValue >= 1 && dieValue <= 6 ? dieValue : null;
        })
      : null,
    selectedDie: Number.isInteger(selectedDie) && Array.isArray(state.dice) && selectedDie >= 0 && selectedDie < state.dice.length
      ? selectedDie
      : null,
    winner: LUDO_COLORS.includes(state.winner) ? state.winner : null,
    note: String(state.note || "").trim() || LUDO_INITIAL_NOTE,
    turnCount: Number.isInteger(turnCount) && turnCount >= 0 ? turnCount : 0,
    stackSerial: Number.isInteger(stackSerial) ? stackSerial : maxStackOrder,
    seatMode,
    colorOwners,
    botMode: false
  };
}

function privateMatchViewerSeatId(session, viewerUsername = "") {
  return sameUsername(session.guestUsername, viewerUsername) ? "player2" : "player1";
}

function serializePrivateMatchState(session, viewerUsername = "") {
  const state = sanitizePrivateMatchState(session, session.privateState, {
    fallbackToInitial: false
  });

  if (!state) {
    return null;
  }

  if (session.game !== "ludo") {
    return state;
  }

  return {
    ...state,
    seatMode: normalizeLudoSeatMode(session.ludoSeatMode || state.seatMode || 4),
    colorOwners: normalizeLudoColorOwners(session.ludoColorOwners || state.colorOwners, session.ludoSeatMode || state.seatMode || 4),
    localSeatId: privateMatchViewerSeatId(session, viewerUsername),
    botMode: false
  };
}

function normalizeUsername(value) {
  return String(value || "").trim();
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const digest = crypto.scryptSync(String(password), salt, 64).toString("hex");
  return `${salt}:${digest}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(":")) {
    return false;
  }

  const [salt, digest] = storedHash.split(":");
  const candidate = crypto.scryptSync(String(password), salt, 64);
  const actual = Buffer.from(digest, "hex");

  if (candidate.length !== actual.length) {
    return false;
  }

  return crypto.timingSafeEqual(candidate, actual);
}

function sortByCoins(users) {
  return [...users].sort((left, right) => {
    if (right.coins !== left.coins) {
      return right.coins - left.coins;
    }
    return right.wins - left.wins;
  });
}

function getUser(data, username) {
  const key = normalizeUsername(username).toLowerCase();
  return data.users.find((user) => user.username.toLowerCase() === key) || null;
}

function getUserByLogin(data, identifier) {
  const usernameKey = normalizeUsername(identifier).toLowerCase();
  const emailKey = normalizeEmail(identifier);
  return data.users.find((user) => user.username.toLowerCase() === usernameKey || user.email === emailKey) || null;
}

function getTournament(data, tournamentId) {
  return data.tournaments.find((item) => item.id === tournamentId) || null;
}

function getSession(data, matchId) {
  return data.sessions.find((item) => item.id === matchId) || null;
}

function sessionIsPrivate(session) {
  return Boolean(session && (session.queueType === "private" || session.mode === "private"));
}

function sessionIncludesUser(session, username) {
  if (!session) {
    return false;
  }

  return (
    sameUsername(session.username, username) ||
    sameUsername(session.hostUsername, username) ||
    sameUsername(session.guestUsername, username)
  );
}

function sessionFinishedForUser(session, username) {
  if (!session || !Array.isArray(session.finishedUsers)) {
    return false;
  }

  return session.finishedUsers.some((entry) => sameUsername(entry, username));
}

function serializeMatch(session, viewerUsername = "") {
  if (!session) {
    return null;
  }

  const isPrivate = sessionIsPrivate(session);
  const hostUsername = normalizeUsername(session.hostUsername || session.username);
  const guestUsername = normalizeUsername(session.guestUsername);
  const viewerIsHost = sameUsername(hostUsername, viewerUsername);
  const viewerIsGuest = sameUsername(guestUsername, viewerUsername);
  const opponentName = viewerIsHost
    ? guestUsername || ""
    : viewerIsGuest
      ? hostUsername
      : guestUsername || hostUsername;

  return {
    ...session,
    hostUsername: hostUsername || "",
    guestUsername: guestUsername || "",
    opponentName,
    queueType: isPrivate ? "private" : "solo",
    joinCode: isPrivate ? String(session.joinCode || session.id) : "",
    playersReady: [hostUsername, guestUsername].filter(Boolean).length,
    isHost: viewerIsHost,
    isGuest: viewerIsGuest,
    canJoin: Boolean(isPrivate && session.status === "LOBBY" && !guestUsername && !sessionIncludesUser(session, viewerUsername))
  };
}

function buildPrivateMatchStatePayload(session, viewerUsername = "") {
  return {
    match: serializeMatch(session, viewerUsername),
    state: serializePrivateMatchState(session, viewerUsername),
    version: normalizePrivateMatchStateVersion(session.privateStateVersion),
    updatedAt: session.privateStateUpdatedAt || "",
    updatedBy: normalizeUsername(session.privateStateUpdatedBy) || ""
  };
}

function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    coins: user.coins,
    wins: user.wins,
    games: user.games,
    isBanned: Boolean(user.isBanned),
    joinedAt: user.joinedAt,
    favoriteGame: user.favoriteGame || "tictactoe"
  };
}

function recordTransaction(data, transaction) {
  data.transactions.unshift({
    id: createId("tx"),
    createdAt: now(),
    ...transaction
  });
}

function seedLegacyUser(rawUser, index) {
  const username = normalizeUsername(rawUser.username) || `player${index + 1}`;
  const email = `${username.replace(/\s+/g, "").toLowerCase()}@opticore.local`;

  return {
    id: createId("usr"),
    username,
    email,
    passwordHash: hashPassword("play1234"),
    coins: clampNumber(rawUser.coins || 2500, 0, 500000),
    wins: 0,
    games: 0,
    isBanned: false,
    favoriteGame: "ludo",
    joinedAt: now()
  };
}

async function loadLegacyUsers() {
  if (!existsSync(LEGACY_USERS_FILE)) {
    return [];
  }

  try {
    const contents = await fs.readFile(LEGACY_USERS_FILE, "utf8");
    const parsed = JSON.parse(contents);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map(seedLegacyUser);
  } catch (error) {
    console.error("Failed to read legacy users:", error.message);
    return [];
  }
}

async function loadSeedStore() {
  if (!existsSync(SEED_DATA_FILE)) {
    return null;
  }

  try {
    const contents = await fs.readFile(SEED_DATA_FILE, "utf8");
    return normalizeStore(JSON.parse(contents.replace(/^\uFEFF/, "")));
  } catch (error) {
    console.error("Failed to read seed store:", error.message);
    return null;
  }
}

function createDefaultStore(legacyUsers) {
  const users = legacyUsers.length
    ? legacyUsers
    : [
        {
          id: createId("usr"),
          username: "opticore demo",
          email: "demo@opticore.local",
          passwordHash: hashPassword("play1234"),
          coins: 2500,
          wins: 4,
          games: 7,
          isBanned: false,
          favoriteGame: "ludo",
          joinedAt: now()
        }
      ];

  return {
    version: 4,
    users,
    transactions: [],
    withdrawals: [],
    sessions: [],
    matchHistory: [],
    tournaments: TOURNAMENT_TEMPLATES.map((item) => ({ ...item })),
    friendships: [],
    friendRequests: [],
    messages: [],
    posts: []
  };
}

function normalizeStore(data) {
  data.version = 4;
  data.users = Array.isArray(data.users) ? data.users : [];
  data.transactions = Array.isArray(data.transactions) ? data.transactions : [];
  data.withdrawals = Array.isArray(data.withdrawals) ? data.withdrawals : [];
  data.sessions = Array.isArray(data.sessions) ? data.sessions : [];
  data.matchHistory = Array.isArray(data.matchHistory) ? data.matchHistory : [];
  data.friendships = Array.isArray(data.friendships) ? data.friendships : [];
  data.friendRequests = Array.isArray(data.friendRequests) ? data.friendRequests : [];
  data.messages = Array.isArray(data.messages) ? data.messages : [];
  data.posts = Array.isArray(data.posts) ? data.posts : [];

  if (!Array.isArray(data.tournaments) || data.tournaments.length === 0) {
    data.tournaments = TOURNAMENT_TEMPLATES.map((item) => ({ ...item }));
  }

  for (const tournament of data.tournaments) {
    tournament.joinedUsers = Array.isArray(tournament.joinedUsers)
      ? tournament.joinedUsers
      : [];

    if (tournament.joinedUsers.length >= tournament.slots) {
      tournament.status = "LIVE";
    } else if (tournament.joinedUsers.length > 0) {
      tournament.status = "OPEN";
    }
  }

  for (const friendship of data.friendships) {
    friendship.users = Array.isArray(friendship.users) ? friendship.users.filter(Boolean).slice(0, 2) : [];
    if (friendship.users.length === 2) {
      friendship.pairKey = threadKeyForUsers(friendship.users[0], friendship.users[1]);
    }
    friendship.createdAt = friendship.createdAt || now();
  }

  for (const request of data.friendRequests) {
    request.fromUsername = normalizeUsername(request.fromUsername);
    request.toUsername = normalizeUsername(request.toUsername);
    request.status = request.status || "pending";
    request.createdAt = request.createdAt || now();
  }

  for (const message of data.messages) {
    message.sender = normalizeUsername(message.sender);
    message.recipient = normalizeUsername(message.recipient);
    message.participants = Array.isArray(message.participants)
      ? message.participants.filter(Boolean).slice(0, 2)
      : [message.sender, message.recipient].filter(Boolean);
    message.threadKey = message.threadKey || threadKeyForUsers(message.sender, message.recipient);
    message.createdAt = message.createdAt || now();
    message.body = String(message.body || "").trim();
    message.matchId = message.matchId ? String(message.matchId) : null;
  }

  for (const post of data.posts) {
    post.id = post.id || createId("pst");
    post.username = normalizeUsername(post.username);
    post.body = String(post.body || "").trim();
    post.createdAt = post.createdAt || now();
    post.game = post.game ? String(post.game) : null;
  }

  for (const session of data.sessions) {
    session.id = String(session.id || createId("match"));
    session.username = normalizeUsername(session.username || session.hostUsername);
    session.hostUsername = normalizeUsername(session.hostUsername || session.username);
    session.guestUsername = normalizeUsername(session.guestUsername);
    session.queueType = sessionIsPrivate(session) ? "private" : "solo";
    session.joinCode = session.queueType === "private" ? String(session.joinCode || session.id) : "";
    session.finishedUsers = Array.isArray(session.finishedUsers)
      ? session.finishedUsers.map((entry) => normalizeUsername(entry)).filter(Boolean)
      : [];
    session.createdAt = session.createdAt || now();
    if (session.game === "ludo") {
      session.ludoSeatMode = normalizeLudoSeatMode(session.ludoSeatMode || 4);
      session.ludoColorOwners = normalizeLudoColorOwners(session.ludoColorOwners, session.ludoSeatMode);
    }
    if (session.queueType === "private") {
      session.privateState = sanitizePrivateMatchState(session, session.privateState, {
        fallbackToInitial: false
      });
      session.privateStateVersion = Math.max(
        normalizePrivateMatchStateVersion(session.privateStateVersion),
        session.privateState ? 1 : 0
      );
      session.privateStateUpdatedAt = session.privateStateVersion > 0
        ? (session.privateStateUpdatedAt || session.startedAt || session.createdAt || now())
        : "";
      session.privateStateUpdatedBy = session.privateStateVersion > 0
        ? normalizeUsername(session.privateStateUpdatedBy || session.hostUsername || session.username)
        : "";
    } else {
      session.privateState = null;
      session.privateStateVersion = 0;
      session.privateStateUpdatedAt = "";
      session.privateStateUpdatedBy = "";
    }
  }

  return data;
}

let mongoClientPromise = null;

async function getMongoClient() {
  if (!useMongoStore()) {
    return null;
  }

  if (!mongoClientPromise) {
    mongoClientPromise = (async () => {
      const client = new MongoClient(MONGODB_URI, {
        serverApi: {
          version: ServerApiVersion.v1,
          strict: true,
          deprecationErrors: true
        }
      });
      await client.connect();
      return client;
    })().catch((error) => {
      mongoClientPromise = null;
      throw error;
    });
  }

  return mongoClientPromise;
}

async function getMongoStoreCollection() {
  const client = await getMongoClient();
  return client.db(MONGODB_DB_NAME).collection(MONGODB_COLLECTION);
}

function createMongoStoreDocument(data) {
  return {
    _id: MONGODB_DOCUMENT_ID,
    ...normalizeStore(data)
  };
}

function stripMongoStoreDocument(document) {
  const { _id, ...store } = document || {};
  return store;
}

async function loadInitialStore() {
  if (existsSync(DATA_FILE)) {
    const contents = await fs.readFile(DATA_FILE, "utf8");
    return normalizeStore(JSON.parse(contents.replace(/^\uFEFF/, "")));
  }

  const seededStore = await loadSeedStore();
  if (seededStore) {
    return seededStore;
  }

  const legacyUsers = await loadLegacyUsers();
  return createDefaultStore(legacyUsers);
}

async function ensureMongoStore() {
  const collection = await getMongoStoreCollection();
  const existing = await collection.findOne({ _id: MONGODB_DOCUMENT_ID }, { projection: { _id: 1 } });
  if (existing) {
    return;
  }

  const store = await loadInitialStore();
  await collection.replaceOne(
    { _id: MONGODB_DOCUMENT_ID },
    createMongoStoreDocument(store),
    { upsert: true }
  );
}

async function ensureStore() {
  if (useMongoStore()) {
    await ensureMongoStore();
    return;
  }

  await fs.mkdir(DATABASE_DIR, { recursive: true });

  if (existsSync(DATA_FILE)) {
    return;
  }

  const store = await loadInitialStore();
  await fs.writeFile(DATA_FILE, JSON.stringify(store, null, 2), "utf8");
}

async function readStore() {
  await ensureStore();
  if (useMongoStore()) {
    const collection = await getMongoStoreCollection();
    const document = await collection.findOne({ _id: MONGODB_DOCUMENT_ID });
    if (!document) {
      throw new Error("Store document not found.");
    }

    return normalizeStore(stripMongoStoreDocument(document));
  }
  const contents = await fs.readFile(DATA_FILE, "utf8");
  return normalizeStore(JSON.parse(contents.replace(/^\uFEFF/, "")));
}

async function writeStore(data) {
  if (useMongoStore()) {
    const collection = await getMongoStoreCollection();
    await collection.replaceOne(
      { _id: MONGODB_DOCUMENT_ID },
      createMongoStoreDocument(data),
      { upsert: true }
    );
    return;
  }

  await fs.writeFile(DATA_FILE, JSON.stringify(normalizeStore(data), null, 2), "utf8");
}

let writeQueue = Promise.resolve();

function mutateStore(mutator) {
  const task = writeQueue.then(async () => {
    const data = await readStore();
    const value = await mutator(data);
    await writeStore(data);
    return value;
  });

  writeQueue = task.catch(() => {});
  return task;
}

function sendError(res, code, message) {
  res.status(code).json({ error: message });
}

function summarizeHistory(data, username) {
  return data.matchHistory
    .filter((item) => item.username === username)
    .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));
}

function summarizeTransactions(data, username) {
  return data.transactions.filter((item) => item.username === username).slice(0, 20);
}

function summarizeWithdrawals(data, username) {
  return data.withdrawals
    .filter((item) => item.username === username)
    .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));
}

function leaderboardRows(data) {
  return sortByCoins(data.users).map(publicUser);
}

function usernameKey(value) {
  return normalizeUsername(value).toLowerCase();
}

function sameUsername(left, right) {
  const leftKey = usernameKey(left);
  const rightKey = usernameKey(right);
  return Boolean(leftKey) && leftKey === rightKey;
}

function threadKeyForUsers(left, right) {
  return [usernameKey(left), usernameKey(right)]
    .filter(Boolean)
    .sort()
    .join("::");
}

function activeSessionForUser(data, username) {
  return data.sessions.find((item) => {
    if (!sessionIncludesUser(item, username)) {
      return false;
    }

    if (sessionFinishedForUser(item, username)) {
      return false;
    }

    return item.status === "ACTIVE" || item.status === "LOBBY";
  }) || null;
}

function canAutoRetireSessionForUser(session, username) {
  if (!session || !sessionIncludesUser(session, username) || sessionFinishedForUser(session, username)) {
    return false;
  }

  if (!(session.status === "ACTIVE" || session.status === "LOBBY")) {
    return false;
  }

  if (!sessionIsPrivate(session)) {
    return true;
  }

  return session.status === "LOBBY"
    && sameUsername(session.hostUsername || session.username, username)
    && !normalizeUsername(session.guestUsername);
}

function retireOpenSessionsForUser(data, username) {
  let retired = 0;

  data.sessions.forEach((session) => {
    if (!canAutoRetireSessionForUser(session, username)) {
      return;
    }

    if (sessionIsPrivate(session)) {
      session.finishedUsers = Array.isArray(session.finishedUsers) ? session.finishedUsers : [];
      if (!sessionFinishedForUser(session, username)) {
        session.finishedUsers.push(username);
      }
    }

    session.status = "FINISHED";
    session.result = session.result || "abandoned";
    session.finishedAt = session.finishedAt || now();
    retired += 1;
  });

  return retired;
}

function socialUserRow(data, user) {
  const session = activeSessionForUser(data, user.username);
  return {
    ...publicUser(user),
    activeMatch: Boolean(session),
    activeGame: session ? session.game : null,
    activeMatchId: session ? session.id : null
  };
}

function hasFriendship(data, left, right) {
  const pairKey = threadKeyForUsers(left, right);
  return data.friendships.some((item) => {
    if (item.pairKey) {
      return item.pairKey === pairKey;
    }

    return Array.isArray(item.users) && threadKeyForUsers(item.users[0], item.users[1]) === pairKey;
  });
}

function friendUsernames(data, username) {
  const viewerKey = usernameKey(username);
  const names = new Set();

  for (const friendship of data.friendships) {
    if (!Array.isArray(friendship.users) || friendship.users.length < 2) {
      continue;
    }

    if (usernameKey(friendship.users[0]) === viewerKey) {
      names.add(friendship.users[1]);
    } else if (usernameKey(friendship.users[1]) === viewerKey) {
      names.add(friendship.users[0]);
    }
  }

  return [...names];
}

function pendingRequestBetween(data, left, right) {
  return data.friendRequests.find((item) => {
    if (item.status !== "pending") {
      return false;
    }

    return (
      (sameUsername(item.fromUsername, left) && sameUsername(item.toUsername, right)) ||
      (sameUsername(item.fromUsername, right) && sameUsername(item.toUsername, left))
    );
  });
}

function latestThreadMessage(data, left, right) {
  const key = threadKeyForUsers(left, right);
  let latest = null;

  for (const message of data.messages) {
    if (message.threadKey !== key) {
      continue;
    }

    if (!latest || new Date(message.createdAt) > new Date(latest.createdAt)) {
      latest = message;
    }
  }

  return latest;
}

function serializeChatMessage(message, viewerUsername) {
  return {
    id: message.id,
    sender: message.sender,
    recipient: message.recipient,
    body: message.body,
    createdAt: message.createdAt,
    matchId: message.matchId || null,
    fromSelf: sameUsername(message.sender, viewerUsername)
  };
}

function conversationThread(data, left, right) {
  const key = threadKeyForUsers(left, right);
  return data.messages
    .filter((item) => item.threadKey === key)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

function serializeFeedPost(data, post, viewerUsername) {
  const author = getUser(data, post.username);
  if (!author) {
    return null;
  }

  return {
    id: post.id,
    body: post.body,
    createdAt: post.createdAt,
    game: post.game || null,
    fromSelf: sameUsername(post.username, viewerUsername),
    author: socialUserRow(data, author)
  };
}

function socialFeed(data, username) {
  const user = getUser(data, username);
  if (!user) {
    return null;
  }

  const visibleKeys = new Set([
    usernameKey(user.username),
    ...friendUsernames(data, user.username).map((item) => usernameKey(item))
  ]);

  return data.posts
    .filter((item) => visibleKeys.has(usernameKey(item.username)))
    .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))
    .slice(0, 60)
    .map((item) => serializeFeedPost(data, item, user.username))
    .filter(Boolean);
}

function socialSnapshot(data, username) {
  const user = getUser(data, username);
  if (!user) {
    return null;
  }

  const friends = friendUsernames(data, username)
    .map((friendUsername) => {
      const friend = getUser(data, friendUsername);
      if (!friend) {
        return null;
      }

      const latest = latestThreadMessage(data, username, friend.username);
      const friendship = data.friendships.find((item) => {
        return Array.isArray(item.users) && hasFriendship({ friendships: [item] }, username, friend.username);
      });

      return {
        ...socialUserRow(data, friend),
        friendsSince: friendship ? friendship.createdAt : now(),
        lastMessage: latest
          ? {
              sender: latest.sender,
              body: latest.body,
              createdAt: latest.createdAt,
              matchId: latest.matchId || null
            }
          : null
      };
    })
    .filter(Boolean)
    .sort((left, right) => {
      if (Number(right.activeMatch) !== Number(left.activeMatch)) {
        return Number(right.activeMatch) - Number(left.activeMatch);
      }

      const leftTime = left.lastMessage ? new Date(left.lastMessage.createdAt).getTime() : 0;
      const rightTime = right.lastMessage ? new Date(right.lastMessage.createdAt).getTime() : 0;
      if (rightTime !== leftTime) {
        return rightTime - leftTime;
      }

      return right.coins - left.coins;
    });

  const incomingRequests = data.friendRequests
    .filter((item) => item.status === "pending" && sameUsername(item.toUsername, username))
    .map((item) => {
      const from = getUser(data, item.fromUsername);
      return from
        ? {
            id: item.id,
            createdAt: item.createdAt,
            from: socialUserRow(data, from)
          }
        : null;
    })
    .filter(Boolean)
    .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));

  const outgoingRequests = data.friendRequests
    .filter((item) => item.status === "pending" && sameUsername(item.fromUsername, username))
    .map((item) => {
      const to = getUser(data, item.toUsername);
      return to
        ? {
            id: item.id,
            createdAt: item.createdAt,
            to: socialUserRow(data, to)
          }
        : null;
    })
    .filter(Boolean)
    .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));

  const hiddenKeys = new Set([
    usernameKey(username),
    ...friends.map((item) => usernameKey(item.username)),
    ...incomingRequests.map((item) => usernameKey(item.from.username)),
    ...outgoingRequests.map((item) => usernameKey(item.to.username))
  ]);

  const discover = sortByCoins(data.users)
    .filter((item) => !hiddenKeys.has(usernameKey(item.username)))
    .slice(0, 12)
    .map((item) => socialUserRow(data, item));

  return {
    stats: {
      friendsCount: friends.length,
      incomingCount: incomingRequests.length,
      outgoingCount: outgoingRequests.length,
      activeFriendsCount: friends.filter((item) => item.activeMatch).length
    },
    friends,
    incomingRequests,
    outgoingRequests,
    discover
  };
}

app.get("/api/health", async (_req, res) => {
  const data = await readStore();

  res.json({
    ok: true,
    storage: useMongoStore() ? "mongodb" : "file",
    users: data.users.length,
    tournaments: data.tournaments.length,
    activeSessions: data.sessions.filter((item) => item.status === "ACTIVE").length
  });
});

app.post("/api/register", async (req, res) => {
  try {
    const username = normalizeUsername(req.body.username);
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || "");

    if (username.length < 3) {
      return sendError(res, 400, "Username must be at least 3 characters.");
    }

    if (!email.includes("@")) {
      return sendError(res, 400, "Enter a valid email address.");
    }

    if (password.length < 4) {
      return sendError(res, 400, "Password must be at least 4 characters.");
    }

    const user = await mutateStore(async (data) => {
      if (getUser(data, username)) {
        throw new Error("Username already exists.");
      }

      if (data.users.some((item) => item.email === email)) {
        throw new Error("Email already exists.");
      }

      const created = {
        id: createId("usr"),
        username,
        email,
        passwordHash: hashPassword(password),
        coins: 2500,
        wins: 0,
        games: 0,
        isBanned: false,
        favoriteGame: "ludo",
        joinedAt: now()
      };

      data.users.push(created);

      recordTransaction(data, {
        username,
        type: "welcome_bonus",
        amount: 2500,
        status: "success",
        reference: null
      });

      return publicUser(created);
    });

    res.status(201).json(user);
  } catch (error) {
    sendError(res, 400, error.message || "Registration failed.");
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const username = normalizeUsername(req.body.username);
    const password = String(req.body.password || "");
    const data = await readStore();
    const user = getUserByLogin(data, username);

    if (!user || !verifyPassword(password, user.passwordHash)) {
      return sendError(res, 401, "Wrong username or password.");
    }

    if (user.isBanned) {
      return sendError(res, 403, "This account is suspended.");
    }

    res.json(publicUser(user));
  } catch (error) {
    sendError(res, 500, "Login failed.");
  }
});

app.get("/api/me/:username", async (req, res) => {
  const data = await readStore();
  const user = getUser(data, req.params.username);

  if (!user) {
    return sendError(res, 404, "User not found.");
  }

  res.json(publicUser(user));
});

app.get("/api/users", async (_req, res) => {
  const data = await readStore();
  res.json(leaderboardRows(data));
});

app.get("/api/transactions/:username", async (req, res) => {
  const data = await readStore();
  res.json(summarizeTransactions(data, normalizeUsername(req.params.username)));
});

app.get("/api/withdrawals/:username", async (req, res) => {
  const data = await readStore();
  res.json(summarizeWithdrawals(data, normalizeUsername(req.params.username)));
});

app.get("/api/history/:username", async (req, res) => {
  const data = await readStore();
  res.json(summarizeHistory(data, normalizeUsername(req.params.username)));
});

app.get("/api/bootstrap/:username", async (req, res) => {
  const username = normalizeUsername(req.params.username);
  const data = await readStore();
  const user = getUser(data, username);

  if (!user) {
    return sendError(res, 404, "User not found.");
  }

  res.json({
    user: publicUser(user),
    leaderboard: leaderboardRows(data).slice(0, 5),
    transactions: summarizeTransactions(data, username).slice(0, 5),
    history: summarizeHistory(data, username).slice(0, 6),
    tournaments: data.tournaments.map((item) => ({
      ...item,
      joinedCount: item.joinedUsers.length,
      joined: item.joinedUsers.includes(username)
    })),
    activeSessions: data.sessions.filter((item) => item.status === "ACTIVE").length
  });
});

app.get("/api/social/:username", async (req, res) => {
  const username = normalizeUsername(req.params.username);
  const data = await readStore();
  const snapshot = socialSnapshot(data, username);

  if (!snapshot) {
    return sendError(res, 404, "User not found.");
  }

  res.json(snapshot);
});

app.get("/api/feed/:username", async (req, res) => {
  const username = normalizeUsername(req.params.username);
  const data = await readStore();
  const posts = socialFeed(data, username);

  if (!posts) {
    return sendError(res, 404, "User not found.");
  }

  res.json({
    posts
  });
});

app.post("/api/feed/post", async (req, res) => {
  try {
    const username = normalizeUsername(req.body.username);
    const body = String(req.body.body || "").trim();
    const game = req.body.game ? String(req.body.game) : null;

    if (!body) {
      return sendError(res, 400, "Post cannot be empty.");
    }

    if (body.length > 280) {
      return sendError(res, 400, "Post is too long.");
    }

    const payload = await mutateStore(async (data) => {
      const user = getUser(data, username);

      if (!user) {
        throw new Error("User not found.");
      }

      const post = {
        id: createId("pst"),
        username: user.username,
        body,
        createdAt: now(),
        game: game || user.favoriteGame || null
      };

      data.posts.unshift(post);

      return {
        post: serializeFeedPost(data, post, user.username)
      };
    });

    res.status(201).json(payload);
  } catch (error) {
    sendError(res, 400, error.message || "Could not publish post.");
  }
});

app.post("/api/friends/request", async (req, res) => {
  try {
    const username = normalizeUsername(req.body.username);
    const targetUsername = normalizeUsername(req.body.targetUsername);

    if (!targetUsername) {
      return sendError(res, 400, "Enter a username to add.");
    }

    const payload = await mutateStore(async (data) => {
      const user = getUser(data, username);
      const target = getUser(data, targetUsername);

      if (!user) {
        throw new Error("User not found.");
      }

      if (!target) {
        throw new Error("That player does not exist yet.");
      }

      if (sameUsername(user.username, target.username)) {
        throw new Error("You cannot add yourself.");
      }

      if (hasFriendship(data, user.username, target.username)) {
        throw new Error("You are already friends.");
      }

      if (pendingRequestBetween(data, user.username, target.username)) {
        throw new Error("A friend request is already pending between both players.");
      }

      const request = {
        id: createId("frq"),
        fromUsername: user.username,
        toUsername: target.username,
        status: "pending",
        createdAt: now()
      };

      data.friendRequests.unshift(request);

      return {
        request,
        snapshot: socialSnapshot(data, user.username)
      };
    });

    res.status(201).json(payload);
  } catch (error) {
    sendError(res, 400, error.message || "Could not send friend request.");
  }
});

app.post("/api/friends/respond", async (req, res) => {
  try {
    const username = normalizeUsername(req.body.username);
    const requestId = String(req.body.requestId || "");
    const action = String(req.body.action || "").toLowerCase();

    if (!["accept", "decline"].includes(action)) {
      return sendError(res, 400, "Invalid request action.");
    }

    const payload = await mutateStore(async (data) => {
      const user = getUser(data, username);
      const request = data.friendRequests.find((item) => item.id === requestId);

      if (!user) {
        throw new Error("User not found.");
      }

      if (!request || !sameUsername(request.toUsername, username)) {
        throw new Error("Friend request not found.");
      }

      if (request.status !== "pending") {
        throw new Error("That request has already been handled.");
      }

      request.status = action === "accept" ? "accepted" : "declined";
      request.respondedAt = now();

      for (const other of data.friendRequests) {
        if (other.id === request.id || other.status !== "pending") {
          continue;
        }

        const samePair =
          sameUsername(other.fromUsername, request.fromUsername) && sameUsername(other.toUsername, request.toUsername);
        const reversePair =
          sameUsername(other.fromUsername, request.toUsername) && sameUsername(other.toUsername, request.fromUsername);

        if (samePair || reversePair) {
          other.status = request.status;
          other.respondedAt = request.respondedAt;
        }
      }

      if (action === "accept" && !hasFriendship(data, request.fromUsername, request.toUsername)) {
        const users = [request.fromUsername, request.toUsername].sort((left, right) => {
          return usernameKey(left).localeCompare(usernameKey(right));
        });

        data.friendships.push({
          id: createId("frd"),
          users,
          pairKey: threadKeyForUsers(users[0], users[1]),
          createdAt: now()
        });
      }

      return {
        snapshot: socialSnapshot(data, user.username)
      };
    });

    res.json(payload);
  } catch (error) {
    sendError(res, 400, error.message || "Could not update friend request.");
  }
});

app.get("/api/chat/thread", async (req, res) => {
  const username = normalizeUsername(req.query.username || "");
  const friendUsername = normalizeUsername(req.query.friend || req.query.friendUsername || "");
  const data = await readStore();
  const user = getUser(data, username);
  const friend = getUser(data, friendUsername);

  if (!user || !friend) {
    return sendError(res, 404, "Conversation user not found.");
  }

  if (!hasFriendship(data, user.username, friend.username)) {
    return sendError(res, 403, "You can only chat with confirmed friends.");
  }

  res.json({
    friend: socialUserRow(data, friend),
    messages: conversationThread(data, user.username, friend.username)
      .slice(-80)
      .map((item) => serializeChatMessage(item, user.username))
  });
});

app.post("/api/chat/send", async (req, res) => {
  try {
    const username = normalizeUsername(req.body.username);
    const friendUsername = normalizeUsername(req.body.friendUsername || req.body.friend);
    const body = String(req.body.body || "").trim();
    const matchId = req.body.matchId ? String(req.body.matchId) : null;

    if (!body) {
      return sendError(res, 400, "Message cannot be empty.");
    }

    if (body.length > 400) {
      return sendError(res, 400, "Message is too long.");
    }

    const payload = await mutateStore(async (data) => {
      const user = getUser(data, username);
      const friend = getUser(data, friendUsername);

      if (!user || !friend) {
        throw new Error("Conversation user not found.");
      }

      if (!hasFriendship(data, user.username, friend.username)) {
        throw new Error("You can only chat with confirmed friends.");
      }

      if (matchId) {
        const session = getSession(data, matchId);
        if (!session || !sameUsername(session.username, user.username) || session.status !== "ACTIVE") {
          throw new Error("Live match chat is only available while your match is active.");
        }
      }

      const participants = [user.username, friend.username].sort((left, right) => {
        return usernameKey(left).localeCompare(usernameKey(right));
      });

      const message = {
        id: createId("msg"),
        threadKey: threadKeyForUsers(user.username, friend.username),
        participants,
        sender: user.username,
        recipient: friend.username,
        body,
        createdAt: now(),
        matchId: matchId || null
      };

      data.messages.push(message);

      return {
        message: serializeChatMessage(message, user.username),
        friend: socialUserRow(data, friend)
      };
    });

    res.status(201).json(payload);
  } catch (error) {
    sendError(res, 400, error.message || "Could not send message.");
  }
});

app.post("/api/wallet/deposit", async (req, res) => {
  try {
    const username = normalizeUsername(req.body.username);
    const amount = clampNumber(req.body.amount, 100, 100000);

    const user = await mutateStore(async (data) => {
      const account = getUser(data, username);
      if (!account) {
        throw new Error("User not found.");
      }

      account.coins += amount;

      recordTransaction(data, {
        username,
        type: "deposit",
        amount,
        status: "success",
        reference: createId("dep")
      });

      return publicUser(account);
    });

    res.json(user);
  } catch (error) {
    sendError(res, 400, error.message || "Deposit failed.");
  }
});

app.post("/api/wallet/withdraw", async (req, res) => {
  try {
    const username = normalizeUsername(req.body.username);
    const amount = clampNumber(req.body.amount, 100, 100000);
    const bankName = normalizeUsername(req.body.bankName);
    const accountName = normalizeUsername(req.body.accountName);
    const accountNumber = normalizeUsername(req.body.accountNumber);

    if (!bankName || !accountName || !accountNumber) {
      return sendError(res, 400, "Complete every withdrawal field.");
    }

    const payload = await mutateStore(async (data) => {
      const user = getUser(data, username);
      if (!user) {
        throw new Error("User not found.");
      }

      if (user.coins < amount) {
        throw new Error("Insufficient balance.");
      }

      user.coins -= amount;

      const withdrawal = {
        id: createId("wd"),
        username,
        amount,
        bankName,
        accountName,
        accountNumber,
        status: "pending",
        createdAt: now()
      };

      data.withdrawals.unshift(withdrawal);

      recordTransaction(data, {
        username,
        type: "withdraw_request",
        amount: -amount,
        status: "pending",
        reference: withdrawal.id
      });

      return {
        user: publicUser(user),
        withdrawal
      };
    });

    res.json(payload);
  } catch (error) {
    sendError(res, 400, error.message || "Withdrawal failed.");
  }
});

app.get("/api/tournaments", async (req, res) => {
  const username = normalizeUsername(req.query.username || "");
  const data = await readStore();

  res.json(
    data.tournaments.map((item) => ({
      ...item,
      joinedCount: item.joinedUsers.length,
      joined: username ? item.joinedUsers.includes(username) : false
    }))
  );
});

app.post("/api/tournaments/join", async (req, res) => {
  try {
    const username = normalizeUsername(req.body.username);
    const tournamentId = String(req.body.tournamentId || "");

    const result = await mutateStore(async (data) => {
      const user = getUser(data, username);
      const tournament = getTournament(data, tournamentId);

      if (!user) {
        throw new Error("User not found.");
      }

      if (!tournament) {
        throw new Error("Tournament not found.");
      }

      if (tournament.joinedUsers.includes(username)) {
        throw new Error("You already joined this tournament.");
      }

      if (tournament.joinedUsers.length >= tournament.slots) {
        throw new Error("Tournament is already full.");
      }

      if (user.coins < tournament.entryFee) {
        throw new Error("Not enough balance to join this tournament.");
      }

      user.coins -= tournament.entryFee;
      user.games += 1;
      tournament.joinedUsers.push(username);
      tournament.status = tournament.joinedUsers.length >= tournament.slots ? "LIVE" : "OPEN";

      recordTransaction(data, {
        username,
        type: "tournament_entry",
        amount: -tournament.entryFee,
        status: "success",
        reference: tournament.id
      });

      data.matchHistory.unshift({
        id: createId("hist"),
        username,
        game: tournament.game,
        mode: "tournament",
        result: "registered",
        cost: tournament.entryFee,
        payout: 0,
        summary: `Joined ${tournament.name}.`,
        createdAt: now()
      });

      return {
        user: publicUser(user),
        tournament: {
          ...tournament,
          joinedCount: tournament.joinedUsers.length,
          joined: true
        }
      };
    });

    res.json(result);
  } catch (error) {
    sendError(res, 400, error.message || "Could not join tournament.");
  }
});

app.post("/api/games/start", async (req, res) => {
  try {
    const username = normalizeUsername(req.body.username);
    const game = String(req.body.game || "tictactoe");
    const mode = req.body.mode === "ranked" ? "ranked" : "practice";
    const difficulty = String(req.body.difficulty || "balanced");
    const requestedCost = clampNumber(req.body.cost || 0, 0, 5000);
    const cost = mode === "practice" ? 0 : requestedCost;
    const ludoSeatMode = game === "ludo" ? normalizeLudoSeatMode(req.body.ludoSeatMode || 4) : 4;
    const ludoColorOwners = game === "ludo" ? normalizeLudoColorOwners(req.body.ludoColorOwners, ludoSeatMode) : null;

    const payload = await mutateStore(async (data) => {
      const user = getUser(data, username);

      if (!user) {
        throw new Error("User not found.");
      }

      if (user.isBanned) {
        throw new Error("This account is suspended.");
      }

      retireOpenSessionsForUser(data, username);

      const existing = activeSessionForUser(data, username);
      if (existing) {
        throw new Error("Finish or leave your current match before starting a new one.");
      }

      if (user.coins < cost) {
        throw new Error("Not enough balance for this match.");
      }

      user.coins -= cost;
      user.games += 1;
      user.favoriteGame = game;

      const match = {
        id: createId("match"),
        username,
        hostUsername: username,
        guestUsername: "",
        game,
        mode,
        difficulty,
        cost,
        payout: cost * 2,
        queueType: "solo",
        status: "ACTIVE",
        createdAt: now(),
        result: null,
        finishedUsers: []
      };

      if (game === "ludo") {
        match.ludoSeatMode = ludoSeatMode;
        match.ludoColorOwners = ludoColorOwners;
      }

      data.sessions.unshift(match);

      if (cost > 0) {
        recordTransaction(data, {
          username,
          type: `${game}_entry`,
          amount: -cost,
          status: "success",
          reference: match.id
        });
      }

      return {
        match,
        user: publicUser(user)
      };
    });

    res.status(201).json(payload);
  } catch (error) {
    sendError(res, 400, error.message || "Could not start match.");
  }
});

app.post("/api/private-matches/create", async (req, res) => {
  try {
    const username = normalizeUsername(req.body.username);
    const game = String(req.body.game || "whot");
    const ludoSeatMode = game === "ludo" ? normalizeLudoSeatMode(req.body.ludoSeatMode || 4) : 4;
    const ludoColorOwners = game === "ludo" ? normalizeLudoColorOwners(req.body.ludoColorOwners, ludoSeatMode) : null;

    const payload = await mutateStore(async (data) => {
      const user = getUser(data, username);

      if (!user) {
        throw new Error("User not found.");
      }

      if (user.isBanned) {
        throw new Error("This account is suspended.");
      }

      retireOpenSessionsForUser(data, username);

      const existing = activeSessionForUser(data, username);
      if (existing) {
        throw new Error("Finish or leave your current match before creating a private one.");
      }

      const matchId = createId("match");
      const match = {
        id: matchId,
        joinCode: matchId,
        username,
        hostUsername: username,
        guestUsername: "",
        game,
        mode: "private",
        difficulty: "direct",
        cost: 0,
        payout: 0,
        queueType: "private",
        status: "LOBBY",
        createdAt: now(),
        result: null,
        finishedUsers: [],
        privateState: null,
        privateStateVersion: 0,
        privateStateUpdatedAt: "",
        privateStateUpdatedBy: ""
      };

      if (game === "ludo") {
        match.ludoSeatMode = ludoSeatMode;
        match.ludoColorOwners = ludoColorOwners;
        match.privateState = createInitialPrivateLudoState(match);
        match.privateStateVersion = 1;
        match.privateStateUpdatedAt = now();
        match.privateStateUpdatedBy = username;
      }

      data.sessions.unshift(match);

      return {
        match: serializeMatch(match, username),
        user: publicUser(user)
      };
    });

    res.status(201).json(payload);
  } catch (error) {
    sendError(res, 400, error.message || "Could not create private match.");
  }
});

app.post("/api/private-matches/join", async (req, res) => {
  try {
    const username = normalizeUsername(req.body.username);
    const joinCode = String(req.body.matchId || req.body.joinCode || "").trim();

    const payload = await mutateStore(async (data) => {
      const user = getUser(data, username);

      if (!user) {
        throw new Error("User not found.");
      }

      if (user.isBanned) {
        throw new Error("This account is suspended.");
      }

      retireOpenSessionsForUser(data, username);

      const existing = activeSessionForUser(data, username);
      if (existing) {
        throw new Error("Finish or leave your current match before joining another one.");
      }

      const session = data.sessions.find((item) => {
        return sessionIsPrivate(item) && (item.id === joinCode || item.joinCode === joinCode);
      });

      if (!session) {
        throw new Error("Private match not found.");
      }

      if (session.status !== "LOBBY") {
        throw new Error("This private match is no longer open to join.");
      }

      if (sameUsername(session.hostUsername, username)) {
        return {
          match: serializeMatch(session, username),
          user: publicUser(user)
        };
      }

      if (session.guestUsername) {
        throw new Error("This private match already has a second player.");
      }

      session.guestUsername = username;
      session.status = "ACTIVE";
      session.startedAt = now();

      return {
        match: serializeMatch(session, username),
        user: publicUser(user)
      };
    });

    res.json(payload);
  } catch (error) {
    sendError(res, 400, error.message || "Could not join private match.");
  }
});

app.get("/api/private-matches/:matchId", async (req, res) => {
  try {
    const matchId = String(req.params.matchId || "").trim();
    const username = normalizeUsername(req.query.username || "");
    const data = await readStore();
    const session = data.sessions.find((item) => {
      return sessionIsPrivate(item) && (item.id === matchId || item.joinCode === matchId);
    });

    if (!session) {
      return sendError(res, 404, "Private match not found.");
    }

    res.json({
      match: serializeMatch(session, username)
    });
  } catch (error) {
    sendError(res, 400, error.message || "Could not load private match.");
  }
});

app.get("/api/private-matches/:matchId/state", async (req, res) => {
  try {
    const matchId = String(req.params.matchId || "").trim();
    const username = normalizeUsername(req.query.username || "");
    const data = await readStore();
    const session = data.sessions.find((item) => {
      return sessionIsPrivate(item) && (item.id === matchId || item.joinCode === matchId);
    });

    if (!session) {
      return sendError(res, 404, "Private match not found.");
    }

    if (!sessionIncludesUser(session, username)) {
      return sendError(res, 403, "You can only load the board for a room you joined.");
    }

    if (session.game === "ludo" && !session.privateState) {
      const payload = await mutateStore(async (store) => {
        const liveSession = store.sessions.find((item) => {
          return sessionIsPrivate(item) && (item.id === matchId || item.joinCode === matchId);
        });

        if (!liveSession) {
          throw new Error("Private match not found.");
        }

        liveSession.privateState = createInitialPrivateLudoState(liveSession);
        liveSession.privateStateVersion = Math.max(1, normalizePrivateMatchStateVersion(liveSession.privateStateVersion));
        liveSession.privateStateUpdatedAt = now();
        liveSession.privateStateUpdatedBy = normalizeUsername(liveSession.hostUsername || liveSession.username) || "system";

        return buildPrivateMatchStatePayload(liveSession, username);
      });

      return res.json(payload);
    }

    res.json(buildPrivateMatchStatePayload(session, username));
  } catch (error) {
    sendError(res, 400, error.message || "Could not load the shared board.");
  }
});

app.post("/api/private-matches/:matchId/state", async (req, res) => {
  try {
    const matchId = String(req.params.matchId || "").trim();
    const username = normalizeUsername(req.body.username);
    const baseVersion = normalizePrivateMatchStateVersion(req.body.baseVersion);

    const payload = await mutateStore(async (data) => {
      const session = data.sessions.find((item) => {
        return sessionIsPrivate(item) && (item.id === matchId || item.joinCode === matchId);
      });

      if (!session) {
        throw new Error("Private match not found.");
      }

      if (!sessionIncludesUser(session, username)) {
        throw new Error("You can only update the board for a room you joined.");
      }

      if (session.status === "FINISHED") {
        return {
          conflict: true,
          payload: buildPrivateMatchStatePayload(session, username),
          message: "This private room is already finished."
        };
      }

      if (!session.privateState && session.game === "ludo") {
        session.privateState = createInitialPrivateLudoState(session);
        session.privateStateVersion = Math.max(1, normalizePrivateMatchStateVersion(session.privateStateVersion));
        session.privateStateUpdatedAt = now();
        session.privateStateUpdatedBy = normalizeUsername(session.hostUsername || session.username) || "system";
      }

      const currentVersion = normalizePrivateMatchStateVersion(session.privateStateVersion);
      if (baseVersion !== currentVersion) {
        return {
          conflict: true,
          payload: buildPrivateMatchStatePayload(session, username),
          message: "Private match state is out of date."
        };
      }

      const nextState = sanitizePrivateMatchState(session, req.body.state, {
        fallbackToInitial: false
      });
      if (!nextState) {
        throw new Error("Invalid private match state.");
      }

      session.privateState = nextState;
      session.privateStateVersion = currentVersion + 1;
      session.privateStateUpdatedAt = now();
      session.privateStateUpdatedBy = username;

      return {
        conflict: false,
        payload: buildPrivateMatchStatePayload(session, username)
      };
    });

    if (payload.conflict) {
      return res.status(409).json({
        error: payload.message,
        ...payload.payload
      });
    }

    res.json(payload.payload);
  } catch (error) {
    sendError(res, 400, error.message || "Could not sync the shared board.");
  }
});

app.post("/api/games/finish", async (req, res) => {
  try {
    const matchId = String(req.body.matchId || "");
    const username = normalizeUsername(req.body.username);
    const result = String(req.body.result || "").toLowerCase();
    const summary = String(req.body.summary || "").trim();

    if (!["win", "loss", "draw", "forfeit"].includes(result)) {
      return sendError(res, 400, "Invalid match result.");
    }

    const payload = await mutateStore(async (data) => {
      const session = getSession(data, matchId);
      const user = getUser(data, username);

      if (!session || !sessionIncludesUser(session, username)) {
        throw new Error("Match not found.");
      }

      if (!user) {
        throw new Error("User not found.");
      }

      const isPrivate = sessionIsPrivate(session);
      if (sessionFinishedForUser(session, username)) {
        return {
          user: publicUser(user),
          match: serializeMatch(session, username),
          payout: 0
        };
      }

      if (session.status !== "ACTIVE") {
        return {
          user: publicUser(user),
          match: serializeMatch(session, username),
          payout: 0
        };
      }

      let payout = 0;

      if (isPrivate) {
        session.finishedUsers = Array.isArray(session.finishedUsers) ? session.finishedUsers : [];
        session.finishedUsers.push(username);

        user.games += 1;
        if (result === "win") {
          user.wins += 1;
        }

        data.matchHistory.unshift({
          id: createId("hist"),
          username,
          game: session.game,
          mode: "private",
          difficulty: session.difficulty || "direct",
          result,
          cost: 0,
          payout: 0,
          summary: summary || `${session.game} private match finished with a ${result}.`,
          createdAt: now()
        });

        const hostDone = sessionFinishedForUser(session, session.hostUsername);
        const guestDone = session.guestUsername ? sessionFinishedForUser(session, session.guestUsername) : false;
        if (!session.guestUsername || (hostDone && guestDone)) {
          session.status = "FINISHED";
          session.result = "completed";
          session.finishedAt = now();
        }

        return {
          user: publicUser(user),
          match: serializeMatch(session, username),
          payout: 0
        };
      }

      session.status = "FINISHED";
      session.result = result;
      session.finishedAt = now();

      if (result === "win") {
        payout = session.payout;
        user.coins += payout;
        user.wins += 1;

        recordTransaction(data, {
          username,
          type: `${session.game}_win`,
          amount: payout,
          status: "success",
          reference: session.id
        });
      } else if (result === "draw" && session.cost > 0) {
        payout = session.cost;
        user.coins += payout;

        recordTransaction(data, {
          username,
          type: `${session.game}_draw_refund`,
          amount: payout,
          status: "success",
          reference: session.id
        });
      }

      data.matchHistory.unshift({
        id: createId("hist"),
        username,
        game: session.game,
        mode: session.mode,
        difficulty: session.difficulty,
        result,
        cost: session.cost,
        payout,
        summary: summary || `${session.game} finished with a ${result}.`,
        createdAt: now()
      });

      return {
        user: publicUser(user),
        match: serializeMatch(session, username),
        payout
      };
    });

    res.json(payload);
  } catch (error) {
    sendError(res, 400, error.message || "Could not close the match.");
  }
});

app.get("/api/admin/overview", async (_req, res) => {
  const data = await readStore();

  res.json({
    users: leaderboardRows(data),
    withdrawals: data.withdrawals,
    history: data.matchHistory.slice(0, 50),
    tournaments: data.tournaments,
    activeSessions: data.sessions.filter((item) => item.status === "ACTIVE")
  });
});

app.post("/api/admin/withdraw/:id/approve", async (req, res) => {
  try {
    const result = await mutateStore(async (data) => {
      const withdrawal = data.withdrawals.find((item) => item.id === req.params.id);

      if (!withdrawal) {
        throw new Error("Withdrawal not found.");
      }

      withdrawal.status = "approved";
      return withdrawal;
    });

    res.json(result);
  } catch (error) {
    sendError(res, 400, error.message || "Approval failed.");
  }
});

app.post("/api/admin/withdraw/:id/reject", async (req, res) => {
  try {
    const result = await mutateStore(async (data) => {
      const withdrawal = data.withdrawals.find((item) => item.id === req.params.id);

      if (!withdrawal) {
        throw new Error("Withdrawal not found.");
      }

      if (withdrawal.status === "rejected") {
        return withdrawal;
      }

      const user = getUser(data, withdrawal.username);
      if (user && withdrawal.status !== "approved") {
        user.coins += withdrawal.amount;

        recordTransaction(data, {
          username: user.username,
          type: "withdraw_refund",
          amount: withdrawal.amount,
          status: "success",
          reference: withdrawal.id
        });
      }

      withdrawal.status = "rejected";
      return withdrawal;
    });

    res.json(result);
  } catch (error) {
    sendError(res, 400, error.message || "Rejection failed.");
  }
});

app.get("/", (_req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, "index.html"));
});

Promise.resolve()
  .then(() => {
    assertRuntimeConfiguration();
  })
  .then(() => ensureStore())
  .then(() => {
    app.listen(PORT, HOST, () => {
      console.log(`Opticore Play running on http://${HOST}:${PORT} (${useMongoStore() ? "mongodb" : "file"} store)`);
    });
  })
  .catch((error) => {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  });
