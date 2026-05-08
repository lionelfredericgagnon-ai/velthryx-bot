const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');

const rootDir = path.join(__dirname, '..');
const databaseDir = path.join(rootDir, 'database');
const legacyDataDir = path.join(rootDir, 'data');
const dbPath = path.join(databaseDir, 'velthryx.db');

if (!fs.existsSync(databaseDir)) {
  fs.mkdirSync(databaseDir, { recursive: true });
}

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS guild_settings (
  guild_id TEXT PRIMARY KEY,
  settings_json TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS warnings (
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  warnings INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (guild_id, user_id)
);

CREATE TABLE IF NOT EXISTS levels (
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 0,
  messages INTEGER NOT NULL DEFAULT 0,
  last_xp_at INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (guild_id, user_id)
);

CREATE TABLE IF NOT EXISTS cases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  moderator_id TEXT NOT NULL,
  action TEXT NOT NULL,
  reason TEXT NOT NULL,
  evidence TEXT NOT NULL DEFAULT '',
  channel_id TEXT NOT NULL,
  message_id TEXT NOT NULL DEFAULT '',
  duration_minutes INTEGER DEFAULT NULL,
  automatic INTEGER NOT NULL DEFAULT 0,
  timestamp INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  author_id TEXT NOT NULL,
  text TEXT NOT NULL,
  timestamp INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS economy (
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  wallet INTEGER NOT NULL DEFAULT 0,
  bank INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (guild_id, user_id)
);

CREATE TABLE IF NOT EXISTS tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  claim_id TEXT DEFAULT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  transcript_url TEXT DEFAULT NULL,
  created_at INTEGER NOT NULL,
  closed_at INTEGER DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS appeals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  case_id INTEGER DEFAULT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  response TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  resolved_at INTEGER DEFAULT NULL
);
`);

const defaultSettings = {
  ownerOnlyControls: true,

  automodEnabled: true,
  levelingEnabled: true,
  loggingEnabled: true,
  welcomeEnabled: false,
  leaveEnabled: false,
  randomXp: false,

  theme: 'default',
  accentColor: '#5865F2',
  bannerUrl: '',
  customBrandName: 'Velthryx Bot',

  logChannelId: '',
  welcomeChannelId: '',
  leaveChannelId: '',
  levelChannelId: '',
  appealChannelId: '',
  ticketCategoryId: '',
  ticketPanelChannelId: '',
  ticketSupportRoleId: '',
  autoRoleId: '',
  modRoleIds: [],

  welcomeMessage: 'Welcome {user} to {server}!',
  leaveMessage: '{user} left {server}.',
  levelUpMessage: 'GG {user}, you reached level {level}!',
  levelUpChannelMode: 'same',

  xpPerMessage: 10,
  xpCooldownMs: 60000,
  xpCurveBase: 100,

  warnLimit: 3,
  warningTimeoutMinutes: 5,
  spamThreshold: 5,
  spamWindowMs: 5000,
  spamTimeoutMinutes: 1,

  capsMinLength: 8,
  capsRatio: 0.7,
  mentionThreshold: 5,
  emojiThreshold: 6,

  antiInviteEnabled: true,
  antiLinksEnabled: true,
  antiScamEnabled: true,
  antiMentionSpamEnabled: true,
  antiEmojiSpamEnabled: true,
  antiRaidEnabled: false,
  antiAltAccountsEnabled: false,
  antiWebhookEnabled: false,
  antiRoleProtectionEnabled: false,
  antiNukeEnabled: false,
};

const stmtGetSettings = db.prepare(
  'SELECT settings_json FROM guild_settings WHERE guild_id = ?'
);
const stmtUpsertSettings = db.prepare(
  'INSERT INTO guild_settings (guild_id, settings_json) VALUES (?, ?) ' +
  'ON CONFLICT(guild_id) DO UPDATE SET settings_json = excluded.settings_json'
);

const stmtGetWarning = db.prepare(
  'SELECT warnings FROM warnings WHERE guild_id = ? AND user_id = ?'
);
const stmtUpsertWarning = db.prepare(
  'INSERT INTO warnings (guild_id, user_id, warnings) VALUES (?, ?, ?) ' +
  'ON CONFLICT(guild_id, user_id) DO UPDATE SET warnings = excluded.warnings'
);

const stmtGetLevel = db.prepare(
  'SELECT xp, level, messages, last_xp_at FROM levels WHERE guild_id = ? AND user_id = ?'
);
const stmtUpsertLevel = db.prepare(
  'INSERT INTO levels (guild_id, user_id, xp, level, messages, last_xp_at) VALUES (?, ?, ?, ?, ?, ?) ' +
  'ON CONFLICT(guild_id, user_id) DO UPDATE SET xp = excluded.xp, level = excluded.level, messages = excluded.messages, last_xp_at = excluded.last_xp_at'
);

const stmtInsertCase = db.prepare(`
  INSERT INTO cases
  (id, guild_id, user_id, moderator_id, action, reason, evidence, channel_id, message_id, duration_minutes, automatic, timestamp)
  VALUES (@id, @guild_id, @user_id, @moderator_id, @action, @reason, @evidence, @channel_id, @message_id, @duration_minutes, @automatic, @timestamp)
`);

const stmtGetCasesByGuild = db.prepare(
  'SELECT * FROM cases WHERE guild_id = ? ORDER BY id DESC LIMIT ?'
);
const stmtGetCasesByUser = db.prepare(
  'SELECT * FROM cases WHERE guild_id = ? AND user_id = ? ORDER BY id DESC LIMIT ?'
);
const stmtGetCaseById = db.prepare(
  'SELECT * FROM cases WHERE guild_id = ? AND id = ?'
);
const stmtGetStaffActivity = db.prepare(
  'SELECT * FROM cases WHERE guild_id = ? AND moderator_id = ? ORDER BY id DESC LIMIT ?'
);

const stmtInsertNote = db.prepare(
  'INSERT INTO notes (guild_id, user_id, author_id, text, timestamp) VALUES (?, ?, ?, ?, ?)'
);
const stmtGetNotes = db.prepare(
  'SELECT * FROM notes WHERE guild_id = ? AND user_id = ? ORDER BY id DESC LIMIT ?'
);

const stmtGetEconomy = db.prepare(
  'SELECT wallet, bank FROM economy WHERE guild_id = ? AND user_id = ?'
);
const stmtUpsertEconomy = db.prepare(
  'INSERT INTO economy (guild_id, user_id, wallet, bank) VALUES (?, ?, ?, ?) ' +
  'ON CONFLICT(guild_id, user_id) DO UPDATE SET wallet = excluded.wallet, bank = excluded.bank'
);

const stmtInsertTicket = db.prepare(
  'INSERT INTO tickets (guild_id, channel_id, user_id, claim_id, status, transcript_url, created_at, closed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
);
const stmtGetTicketByChannel = db.prepare(
  'SELECT * FROM tickets WHERE channel_id = ? ORDER BY id DESC LIMIT 1'
);
const stmtGetTicketById = db.prepare(
  'SELECT * FROM tickets WHERE id = ?'
);
const stmtGetOpenTicketsByGuild = db.prepare(
  "SELECT * FROM tickets WHERE guild_id = ? AND status = 'open' ORDER BY id DESC"
);
const stmtUpdateTicketStatus = db.prepare(
  "UPDATE tickets SET status = ?, transcript_url = COALESCE(?, transcript_url), closed_at = COALESCE(?, closed_at) WHERE id = ?"
);
const stmtUpdateTicketClaim = db.prepare(
  'UPDATE tickets SET claim_id = ? WHERE id = ?'
);

const stmtInsertAppeal = db.prepare(
  'INSERT INTO appeals (guild_id, user_id, case_id, reason, status, response, created_at, resolved_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
);
const stmtGetAppeals = db.prepare(
  'SELECT * FROM appeals WHERE guild_id = ? ORDER BY id DESC LIMIT ?'
);
const stmtGetAppealsByStatus = db.prepare(
  'SELECT * FROM appeals WHERE guild_id = ? AND status = ? ORDER BY id DESC LIMIT ?'
);
const stmtUpdateAppeal = db.prepare(
  'UPDATE appeals SET status = ?, response = ?, resolved_at = ? WHERE id = ?'
);

function safeReadJSON(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function getXpNeeded(level, base = 100) {
  return base + level * 50;
}

function buildProgressBar(current, total, size = 12) {
  const safeTotal = total <= 0 ? 1 : total;
  const ratio = Math.max(0, Math.min(1, current / safeTotal));
  const filled = Math.round(ratio * size);
  const empty = Math.max(0, size - filled);
  return `${'█'.repeat(filled)}${'░'.repeat(empty)}`;
}

function getSettings(guildId) {
  const row = stmtGetSettings.get(guildId);

  if (!row) {
    stmtUpsertSettings.run(guildId, JSON.stringify(defaultSettings));
    return { ...defaultSettings };
  }

  let parsed = {};
  try {
    parsed = JSON.parse(row.settings_json || '{}');
  } catch {
    parsed = {};
  }

  return {
    ...defaultSettings,
    ...parsed,
  };
}

function setSettings(guildId, patch) {
  const current = getSettings(guildId);
  const updated = {
    ...current,
    ...patch,
  };

  stmtUpsertSettings.run(guildId, JSON.stringify(updated));
  return updated;
}

function toggleSetting(guildId, key) {
  const current = getSettings(guildId);
  return setSettings(guildId, { [key]: !Boolean(current[key]) });
}

function getWarningCount(guildId, userId) {
  const row = stmtGetWarning.get(guildId, userId);
  return row ? row.warnings : 0;
}

function setWarningCount(guildId, userId, count) {
  stmtUpsertWarning.run(guildId, userId, count);
  return count;
}

function addWarning(guildId, userId) {
  const next = getWarningCount(guildId, userId) + 1;
  setWarningCount(guildId, userId, next);
  return next;
}

function resetWarningCount(guildId, userId) {
  setWarningCount(guildId, userId, 0);
}

function getUserRecord(guildId, userId) {
  const row = stmtGetLevel.get(guildId, userId);

  if (!row) {
    const created = {
      xp: 0,
      level: 0,
      messages: 0,
      last_xp_at: 0,
    };
    stmtUpsertLevel.run(guildId, userId, created.xp, created.level, created.messages, created.last_xp_at);
    return created;
  }

  return {
    xp: row.xp,
    level: row.level,
    messages: row.messages,
    last_xp_at: row.last_xp_at,
  };
}

function awardXp(guildId, userId, amount, base = 100) {
  const user = getUserRecord(guildId, userId);
  const oldLevel = user.level;
  let xp = user.xp + amount;
  let level = user.level;
  const messages = user.messages + 1;
  const lastXpAt = Date.now();

  while (xp >= getXpNeeded(level, base)) {
    xp -= getXpNeeded(level, base);
    level += 1;
  }

  stmtUpsertLevel.run(guildId, userId, xp, level, messages, lastXpAt);

  return {
    user: {
      xp,
      level,
      messages,
      last_xp_at: lastXpAt,
    },
    oldLevel,
    newLevel: level,
    leveledUp: level > oldLevel,
    xpNeeded: getXpNeeded(level, base),
  };
}

function getLeaderboard(guildId) {
  const rows = db
    .prepare(
      'SELECT user_id AS userId, xp, level, messages, last_xp_at AS lastXpAt FROM levels WHERE guild_id = ? ORDER BY level DESC, xp DESC, messages DESC LIMIT 10'
    )
    .all(guildId);

  return rows.map((row, index) => ({
    rank: index + 1,
    ...row,
  }));
}

function createCase(payload) {
  const info = stmtInsertCase.run({
    id: Number.isInteger(payload.id) ? payload.id : null,
    guild_id: String(payload.guildId),
    user_id: String(payload.userId),
    moderator_id: String(payload.moderatorId),
    action: String(payload.action),
    reason: String(payload.reason || 'No reason provided'),
    evidence: String(payload.evidence || ''),
    channel_id: String(payload.channelId || ''),
    message_id: String(payload.messageId || ''),
    duration_minutes: payload.durationMinutes ?? null,
    automatic: payload.automatic ? 1 : 0,
    timestamp: payload.timestamp || Date.now(),
  });

  const caseId = Number.isInteger(payload.id)
    ? payload.id
    : Number(info.lastInsertRowid);

  return {
    caseId,
    ...payload,
  };
}

function getCases(guildId, userId = null, limit = 100) {
  if (userId) {
    return stmtGetCasesByUser.all(guildId, userId, limit);
  }
  return stmtGetCasesByGuild.all(guildId, limit);
}

function getCaseById(guildId, caseId) {
  return stmtGetCaseById.get(guildId, caseId) || null;
}

function getStaffActivity(guildId, moderatorId, limit = 100) {
  return stmtGetStaffActivity.all(guildId, moderatorId, limit);
}

function addNote(guildId, userId, noteData) {
  const entry = {
    guildId,
    userId,
    authorId: String(noteData.authorId),
    text: String(noteData.text),
    timestamp: noteData.timestamp || Date.now(),
  };

  const info = stmtInsertNote.run(
    entry.guildId,
    entry.userId,
    entry.authorId,
    entry.text,
    entry.timestamp
  );

  return {
    id: Number(info.lastInsertRowid),
    ...entry,
  };
}

function getNotes(guildId, userId, limit = 100) {
  return stmtGetNotes.all(guildId, userId, limit);
}

function getEconomyRecord(guildId, userId) {
  const row = stmtGetEconomy.get(guildId, userId);

  if (!row) {
    stmtUpsertEconomy.run(guildId, userId, 0, 0);
    return { wallet: 0, bank: 0 };
  }

  return {
    wallet: row.wallet,
    bank: row.bank,
  };
}

function setEconomyRecord(guildId, userId, wallet, bank) {
  stmtUpsertEconomy.run(guildId, userId, wallet, bank);
  return { wallet, bank };
}

function addWallet(guildId, userId, amount) {
  const current = getEconomyRecord(guildId, userId);
  return setEconomyRecord(guildId, userId, current.wallet + amount, current.bank);
}

function removeWallet(guildId, userId, amount) {
  const current = getEconomyRecord(guildId, userId);
  return setEconomyRecord(guildId, userId, Math.max(0, current.wallet - amount), current.bank);
}

function addBank(guildId, userId, amount) {
  const current = getEconomyRecord(guildId, userId);
  return setEconomyRecord(guildId, userId, current.wallet, current.bank + amount);
}

function removeBank(guildId, userId, amount) {
  const current = getEconomyRecord(guildId, userId);
  return setEconomyRecord(guildId, userId, current.wallet, Math.max(0, current.bank - amount));
}

function createTicket(payload) {
  const createdAt = payload.createdAt || Date.now();

  const info = stmtInsertTicket.run(
    String(payload.guildId),
    String(payload.channelId),
    String(payload.userId),
    payload.claimId ? String(payload.claimId) : null,
    payload.status || 'open',
    payload.transcriptUrl || null,
    createdAt,
    payload.closedAt || null
  );

  return getTicketById(Number(info.lastInsertRowid));
}

function getTicketById(ticketId) {
  return stmtGetTicketById.get(ticketId) || null;
}

function getTicketByChannel(channelId) {
  return stmtGetTicketByChannel.get(channelId) || null;
}

function getOpenTicketsByGuild(guildId) {
  return stmtGetOpenTicketsByGuild.all(guildId);
}

function claimTicket(ticketId, claimId) {
  stmtUpdateTicketClaim.run(claimId ? String(claimId) : null, ticketId);
  return getTicketById(ticketId);
}

function closeTicket(ticketId, transcriptUrl = null) {
  stmtUpdateTicketStatus.run('closed', transcriptUrl, Date.now(), ticketId);
  return getTicketById(ticketId);
}

function createAppeal(payload) {
  const info = stmtInsertAppeal.run(
    String(payload.guildId),
    String(payload.userId),
    payload.caseId ?? null,
    String(payload.reason || 'No reason provided'),
    payload.status || 'open',
    payload.response || '',
    payload.createdAt || Date.now(),
    payload.resolvedAt || null
  );

  return getAppealById(Number(info.lastInsertRowid));
}

function getAppealById(appealId) {
  return db.prepare('SELECT * FROM appeals WHERE id = ?').get(appealId) || null;
}

function getAppeals(guildId, status = null, limit = 100) {
  if (status) {
    return stmtGetAppealsByStatus.all(guildId, status, limit);
  }
  return stmtGetAppeals.all(guildId, limit);
}

function resolveAppeal(appealId, status = 'resolved', response = '') {
  stmtUpdateAppeal.run(status, response, Date.now(), appealId);
  return getAppealById(appealId);
}

function importLegacySettings() {
  const existingCount = db.prepare('SELECT COUNT(*) AS count FROM guild_settings').get().count;
  if (existingCount > 0) return;

  const legacy = safeReadJSON(path.join(legacyDataDir, 'settings.json'));
  if (!legacy || typeof legacy !== 'object' || Array.isArray(legacy)) return;

  const tx = db.transaction((source) => {
    for (const [guildId, settings] of Object.entries(source)) {
      if (!settings || typeof settings !== 'object') continue;
      const merged = {
        ...defaultSettings,
        ...settings,
      };
      stmtUpsertSettings.run(guildId, JSON.stringify(merged));
    }
  });

  tx(legacy);
}

function importLegacyWarnings() {
  const existingCount = db.prepare('SELECT COUNT(*) AS count FROM warnings').get().count;
  if (existingCount > 0) return;

  const legacy = safeReadJSON(path.join(legacyDataDir, 'warnings.json'));
  if (!legacy || typeof legacy !== 'object' || Array.isArray(legacy)) return;

  const tx = db.transaction((source) => {
    for (const [guildId, guildWarnings] of Object.entries(source)) {
      if (!guildWarnings || typeof guildWarnings !== 'object') continue;

      for (const [userId, count] of Object.entries(guildWarnings)) {
        stmtUpsertWarning.run(guildId, userId, Number(count) || 0);
      }
    }
  });

  tx(legacy);
}

function importLegacyLevels() {
  const existingCount = db.prepare('SELECT COUNT(*) AS count FROM levels').get().count;
  if (existingCount > 0) return;

  const legacy = safeReadJSON(path.join(legacyDataDir, 'levels.json'));
  if (!legacy || typeof legacy !== 'object' || Array.isArray(legacy)) return;

  const tx = db.transaction((source) => {
    for (const [guildId, guildLevels] of Object.entries(source)) {
      if (!guildLevels || typeof guildLevels !== 'object') continue;

      for (const [userId, data] of Object.entries(guildLevels)) {
        if (!data || typeof data !== 'object') continue;

        stmtUpsertLevel.run(
          guildId,
          userId,
          Number(data.xp) || 0,
          Number(data.level) || 0,
          Number(data.messages) || 0,
          Number(data.last_xp_at || data.lastXpAt) || 0
        );
      }
    }
  });

  tx(legacy);
}

function importLegacyCases() {
  const existingCount = db.prepare('SELECT COUNT(*) AS count FROM cases').get().count;
  if (existingCount > 0) return;

  const legacy = safeReadJSON(path.join(legacyDataDir, 'cases.json'));
  if (!legacy || typeof legacy !== 'object') return;

  const tx = db.transaction((source) => {
    for (const [guildId, guildCases] of Object.entries(source)) {
      const items = Array.isArray(guildCases)
        ? guildCases
        : Array.isArray(guildCases?.items)
          ? guildCases.items
          : [];

      for (const item of items) {
        if (!item || typeof item !== 'object') continue;

        stmtInsertCase.run({
          id: Number.isInteger(item.caseId ?? item.id) ? Number(item.caseId ?? item.id) : null,
          guild_id: String(item.guildId || guildId),
          user_id: String(item.userId || ''),
          moderator_id: String(item.moderatorId || 'unknown'),
          action: String(item.action || 'unknown'),
          reason: String(item.reason || 'No reason provided'),
          evidence: String(item.evidence || ''),
          channel_id: String(item.channelId || ''),
          message_id: String(item.messageId || ''),
          duration_minutes: item.durationMinutes ?? null,
          automatic: item.automatic ? 1 : 0,
          timestamp: Number(item.timestamp) || Date.now(),
        });
      }
    }
  });

  tx(legacy);
}

function importLegacyNotes() {
  const existingCount = db.prepare('SELECT COUNT(*) AS count FROM notes').get().count;
  if (existingCount > 0) return;

  const legacy = safeReadJSON(path.join(legacyDataDir, 'notes.json'));
  if (!legacy || typeof legacy !== 'object' || Array.isArray(legacy)) return;

  const tx = db.transaction((source) => {
    for (const [guildId, guildNotes] of Object.entries(source)) {
      if (!guildNotes || typeof guildNotes !== 'object') continue;

      for (const [userId, notes] of Object.entries(guildNotes)) {
        if (!Array.isArray(notes)) continue;

        for (const note of notes) {
          if (!note || typeof note !== 'object') continue;

          stmtInsertNote.run(
            String(guildId),
            String(userId),
            String(note.authorId || 'unknown'),
            String(note.text || ''),
            Number(note.timestamp) || Date.now()
          );
        }
      }
    }
  });

  tx(legacy);
}

function importLegacyEconomy() {
  const existingCount = db.prepare('SELECT COUNT(*) AS count FROM economy').get().count;
  if (existingCount > 0) return;

  const legacy = safeReadJSON(path.join(legacyDataDir, 'economy.json'));
  if (!legacy || typeof legacy !== 'object' || Array.isArray(legacy)) return;

  const tx = db.transaction((source) => {
    for (const [guildId, guildEconomy] of Object.entries(source)) {
      if (!guildEconomy || typeof guildEconomy !== 'object') continue;

      for (const [userId, data] of Object.entries(guildEconomy)) {
        if (!data || typeof data !== 'object') continue;

        stmtUpsertEconomy.run(
          String(guildId),
          String(userId),
          Number(data.wallet) || 0,
          Number(data.bank) || 0
        );
      }
    }
  });

  tx(legacy);
}

importLegacySettings();
importLegacyWarnings();
importLegacyLevels();
importLegacyCases();
importLegacyNotes();
importLegacyEconomy();

module.exports = {
  db,
  defaultSettings,
  getSettings,
  setSettings,
  toggleSetting,
  getWarningCount,
  setWarningCount,
  addWarning,
  resetWarningCount,
  getUserRecord,
  awardXp,
  getLeaderboard,
  buildProgressBar,
  getXpNeeded,
  createCase,
  getCases,
  getCaseById,
  getStaffActivity,
  addNote,
  getNotes,
  getEconomyRecord,
  setEconomyRecord,
  addWallet,
  removeWallet,
  addBank,
  removeBank,
  createTicket,
  getTicketById,
  getTicketByChannel,
  getOpenTicketsByGuild,
  claimTicket,
  closeTicket,
  createAppeal,
  getAppealById,
  getAppeals,
  resolveAppeal,
};