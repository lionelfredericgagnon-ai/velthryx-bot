const fs = require('node:fs');
const path = require('node:path');

const dataDir = path.join(__dirname, '..', 'data');
const settingsFile = path.join(dataDir, 'settings.json');
const warningsFile = path.join(dataDir, 'warnings.json');
const levelsFile = path.join(dataDir, 'levels.json');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

function ensureFile(filePath) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, '{}');
  }
}

ensureFile(settingsFile);
ensureFile(warningsFile);
ensureFile(levelsFile);

function readJSON(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8') || '{}');
  } catch {
    return {};
  }
}

function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

const defaultSettings = {
  automodEnabled: true,
  levelingEnabled: true,
  welcomeEnabled: true,
  leaveEnabled: false,
  randomXp: false,

  logChannelId: '',
  welcomeChannelId: '',
  leaveChannelId: '',
  levelChannelId: '',

  welcomeMessage: 'Welcome {user} to {server}!',
  leaveMessage: '{user} left the server.',
  levelUpMessage: 'GG {user}, you reached level {level}!',

  xpPerMessage: 10,
  xpCooldownMs: 60000,

  warnLimit: 3,
  spamThreshold: 5,
  spamWindowMs: 5000,
  spamTimeoutMinutes: 1,
  warningTimeoutMinutes: 5,

  capsMinLength: 8,
  capsRatio: 0.7,
};

let settingsStore = readJSON(settingsFile);
let warningsStore = readJSON(warningsFile);
let levelsStore = readJSON(levelsFile);

function getSettings(guildId) {
  return {
    ...defaultSettings,
    ...(settingsStore[guildId] || {}),
  };
}

function setSettings(guildId, patch) {
  settingsStore[guildId] = {
    ...defaultSettings,
    ...(settingsStore[guildId] || {}),
    ...patch,
  };
  writeJSON(settingsFile, settingsStore);
  return settingsStore[guildId];
}

function getWarningCount(guildId, userId) {
  if (!warningsStore[guildId]) warningsStore[guildId] = {};
  return warningsStore[guildId][userId] ?? 0;
}

function setWarningCount(guildId, userId, count) {
  if (!warningsStore[guildId]) warningsStore[guildId] = {};
  warningsStore[guildId][userId] = count;
  writeJSON(warningsFile, warningsStore);
}

function getUserRecord(guildId, userId) {
  if (!levelsStore[guildId]) levelsStore[guildId] = {};

  if (!levelsStore[guildId][userId]) {
    levelsStore[guildId][userId] = {
      xp: 0,
      level: 0,
      messages: 0,
      lastXpAt: 0,
    };
    writeJSON(levelsFile, levelsStore);
  }

  return levelsStore[guildId][userId];
}

function addXp(guildId, userId, amount) {
  const user = getUserRecord(guildId, userId);

  const oldLevel = Math.floor(user.xp / 100);
  user.xp += amount;
  user.messages += 1;

  const newLevel = Math.floor(user.xp / 100);
  user.level = newLevel;

  writeJSON(levelsFile, levelsStore);

  return {
    user,
    oldLevel,
    newLevel,
    leveledUp: newLevel > oldLevel,
  };
}

function getLeaderboard(guildId) {
  if (!levelsStore[guildId]) return [];

  return Object.entries(levelsStore[guildId])
    .sort((a, b) => b[1].xp - a[1].xp)
    .slice(0, 10)
    .map(([userId, data], index) => ({
      rank: index + 1,
      userId,
      ...data,
    }));
}

function buildProgressBar(current, total, size = 12) {
  const safeTotal = total <= 0 ? 1 : total;
  const filled = Math.round((current / safeTotal) * size);
  const empty = size - filled;

  return `${'█'.repeat(Math.max(0, filled))}${'░'.repeat(Math.max(0, empty))}`;
}

module.exports = {
  defaultSettings,
  getSettings,
  setSettings,
  getWarningCount,
  setWarningCount,
  getUserRecord,
  addXp,
  getLeaderboard,
  buildProgressBar,
};