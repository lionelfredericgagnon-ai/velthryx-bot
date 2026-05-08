require('dotenv').config();

const fs = require('node:fs');
const path = require('node:path');

const {
  Client,
  Collection,
  Events,
  GatewayIntentBits,
} = require('discord.js');

/* ---------------- CLIENT ---------------- */

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.commands = new Collection();

/* ---------------- WARNING SYSTEM (JSON PERSISTENT) ---------------- */

const warningsFile = path.join(__dirname, 'data', 'warnings.json');

function loadWarnings() {
  if (!fs.existsSync(warningsFile)) return {};
  return JSON.parse(fs.readFileSync(warningsFile, 'utf8'));
}

function saveWarnings(data) {
  fs.writeFileSync(warningsFile, JSON.stringify(data, null, 2));
}

let warnings = loadWarnings();

/* ---------------- SPAM STORAGE ---------------- */

const userMessageMap = new Map();

/* ---------------- MESSAGE AUTOMOD (B4 + B5 + B6 CORE) ---------------- */

client.on(Events.MessageCreate, async (message) => {
  try {
    if (!message.guild || message.author.bot) return;

    const content = message.content || "";
    const userId = message.author.id;
    const now = Date.now();

    const member = await message.guild.members.fetch(userId).catch(() => null);
    if (!member) return;

    let warnReason = null;

    /* ---------------- ANTI CAPS ---------------- */

    const capsRatio =
      content.replace(/[^A-Z]/g, '').length / (content.length || 1);

    if (content.length > 8 && capsRatio > 0.7) {
      warnReason = "Excessive caps";
    }

    /* ---------------- ANTI INVITES ---------------- */

    if (
      content.includes("discord.gg") ||
      content.includes("discord.com/invite")
    ) {
      warnReason = "Invite link detected";
    }

    /* ---------------- WARN SYSTEM (PERSISTENT) ---------------- */

    if (warnReason) {
      const current = warnings[userId] || 0;
      const newWarnings = current + 1;

      warnings[userId] = newWarnings;
      saveWarnings(warnings);

      await message.reply(`⚠️ Warning (${newWarnings}/3): ${warnReason}`);

      if (newWarnings >= 3 && member.moderatable) {
        await member.timeout(5 * 60 * 1000, "Too many warnings (auto-mod)");

        warnings[userId] = 0;
        saveWarnings(warnings);

        message.channel.send(
          `⏳ ${message.author} has been timed out.`
        );
      }
    }

    /* ---------------- SPAM DETECTION ---------------- */

    const userData = userMessageMap.get(userId) || {
      count: 0,
      lastMessage: '',
      lastTime: 0,
    };

    if (now - userData.lastTime > 5000) {
      userData.count = 0;
    }

    userData.lastTime = now;

    if (content === userData.lastMessage) {
      userData.count += 1;
    } else {
      userData.count = 1;
    }

    userData.lastMessage = content;

    userMessageMap.set(userId, userData);

    if (userData.count >= 5) {
      if (member.moderatable) {
        await member.timeout(60_000, 'Spam detected (auto-mod)');
        message.channel.send(
          `⏳ ${message.author} was timed out for spam.`
        );
      }

      userMessageMap.delete(userId);
    }

  } catch (err) {
    console.error("AutoMod error:", err);
  }
});

/* ---------------- COMMAND HANDLER ---------------- */

const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
  const commandsPath = path.join(foldersPath, folder);

  const commandFiles = fs
    .readdirSync(commandsPath)
    .filter(file => file.endsWith('.js'));

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);

    if (command?.data && command?.execute) {
      client.commands.set(command.data.name, command);
    } else {
      console.log(`[WARNING] Missing data or execute in ${filePath}`);
    }
  }
}

/* ---------------- READY ---------------- */

client.once(Events.ClientReady, (readyClient) => {
  console.log(`✅ Logged in as ${readyClient.user.tag}`);
});

/* ---------------- SLASH COMMANDS ---------------- */

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);

    const reply = {
      content: 'There was an error executing this command.',
      ephemeral: true,
    };

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(reply);
    } else {
      await interaction.reply(reply);
    }
  }
});

/* ---------------- LOGIN ---------------- */

client.login(process.env.TOKEN);