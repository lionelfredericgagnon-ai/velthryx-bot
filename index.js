require('dotenv').config();

const fs = require('node:fs');
const path = require('node:path');
const {
  Client,
  Collection,
  Events,
  GatewayIntentBits,
  EmbedBuilder,
  PermissionFlagsBits,
} = require('discord.js');

const {
  getSettings,
  setSettings,
  toggleSetting,
  getWarningCount,
  addWarning,
  resetWarningCount,
  awardXp,
  getUserRecord,
  getLeaderboard,
  getXpNeeded,
} = require('./utils/store');

const { sendLog } = require('./utils/logger');
const {
  buildPanelEmbed,
  buildSettingsEmbed,
  buildPanelComponents,
  THEMES,
} = require('./utils/panel');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
  ],
});

client.commands = new Collection();
const xpCooldowns = new Map();
const spamStates = new Map();

function isOwner(interaction) {
  const ownerId = process.env.OWNER_ID;
  if (ownerId) return interaction.user.id === ownerId;
  return interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild);
}

function loadCommands(dir) {
  if (!fs.existsSync(dir)) return;

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      loadCommands(fullPath);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      const command = require(fullPath);

      if (command?.data?.name && typeof command.execute === 'function') {
        client.commands.set(command.data.name, command);
      } else {
        console.log(`[WARNING] Missing data or execute in ${fullPath}`);
      }
    }
  }
}

loadCommands(path.join(__dirname, 'commands'));

function replaceTokens(template, member, level) {
  return template
    .replaceAll('{user}', member.toString())
    .replaceAll('{username}', member.user.username)
    .replaceAll('{server}', member.guild.name)
    .replaceAll('{level}', String(level));
}

async function sendConfiguredChannel(guild, channelId, payload) {
  if (!channelId) return;
  const channel = await guild.channels.fetch(channelId).catch(() => null);
  if (!channel || !channel.isTextBased()) return;
  await channel.send(payload).catch(() => {});
}

function countMentions(message) {
  const direct = message.mentions.users.size + message.mentions.roles.size;
  const everyoneHere = /@everyone|@here/i.test(message.content || '') ? 10 : 0;
  return direct + everyoneHere;
}

function countCustomEmojis(content) {
  const matches = content.match(/<a?:\w+:\d+>/g);
  return matches ? matches.length : 0;
}

function getAutomodReason(message, settings) {
  const content = message.content || '';
  const lower = content.toLowerCase();

  const capsLetters = content.replace(/[^A-Za-z]/g, '');
  const capsUpper = content.replace(/[^A-Z]/g, '');
  const capsRatio = capsLetters.length ? capsUpper.length / capsLetters.length : 0;

  if (settings.antiMentionSpamEnabled && countMentions(message) >= settings.mentionThreshold) {
    return 'Mention spam detected';
  }

  if (settings.antiEmojiSpamEnabled && countCustomEmojis(content) >= settings.emojiThreshold) {
    return 'Emoji spam detected';
  }

  if (settings.antiInviteEnabled && /(?:https?:\/\/)?(?:www\.)?(?:discord\.gg|discord(?:app)?\.com\/invite)\/[^\s]+/i.test(content)) {
    return 'Invite link detected';
  }

  if (settings.antiLinksEnabled && /https?:\/\/\S+/i.test(content)) {
    return 'Link detected';
  }

  if (settings.antiScamEnabled) {
    const scamWords = [
      'free nitro',
      'steam gift',
      'discord nitro',
      'claim now',
      'crypto giveaway',
      'airdrop',
      'wallet connect',
      'hacked account',
      'trade offer',
    ];
    if (scamWords.some((word) => lower.includes(word))) {
      return 'Potential scam detected';
    }
  }

  if (content.length >= settings.capsMinLength && capsRatio > settings.capsRatio) {
    return 'Excessive caps';
  }

  return null;
}

client.once(Events.ClientReady, (readyClient) => {
  console.log(`✅ Logged in as ${readyClient.user.tag}`);
});

client.on(Events.MessageCreate, async (message) => {
  try {
    if (!message.guild || message.author.bot) return;

    const settings = getSettings(message.guild.id);
    const content = message.content || '';
    const userId = message.author.id;
    const now = Date.now();

    const member = await message.guild.members.fetch(userId).catch(() => null);
    if (!member) return;

    if (settings.automodEnabled) {
      const automodReason = getAutomodReason(message, settings);

      const spamKey = `${message.guild.id}:${userId}`;
      const state = spamStates.get(spamKey) || {
        count: 0,
        lastMessage: '',
        lastTime: 0,
      };

      if (now - state.lastTime > settings.spamWindowMs) {
        state.count = 0;
      }

      state.lastTime = now;
      state.count = content === state.lastMessage ? state.count + 1 : 1;
      state.lastMessage = content;

      spamStates.set(spamKey, state);

      const shouldSpamTimeout = state.count >= settings.spamThreshold;

      if (automodReason) {
        const warningCount = addWarning(message.guild.id, userId);

        await message.reply({
          content: `⚠️ Warning (${warningCount}/${settings.warnLimit}): ${automodReason}`,
        }).catch(() => {});

        const caseEntry = {
          userId,
          moderatorId: client.user.id,
          action: 'warn',
          reason: automodReason,
          evidence: '',
          channelId: message.channel.id,
          messageId: message.id,
          automatic: true,
        };

        const warningEmbed = new EmbedBuilder()
          .setTitle('⚠️ Warning Issued')
          .setColor(0xffcc00)
          .addFields(
            { name: 'User', value: `${message.author.tag}`, inline: true },
            { name: 'Reason', value: automodReason, inline: true },
            { name: 'Warnings', value: `${warningCount}/${settings.warnLimit}`, inline: true }
          )
          .setTimestamp();

        sendLog(message.guild, warningEmbed);

        if (warningCount >= settings.warnLimit && member.moderatable) {
          await member.timeout(settings.warningTimeoutMinutes * 60_000, 'Too many warnings (auto-mod)').catch(() => {});
          resetWarningCount(message.guild.id, userId);

          const timeoutEmbed = new EmbedBuilder()
            .setTitle('⏳ Timeout (Warnings)')
            .setColor(0xff0000)
            .addFields(
              { name: 'User', value: `${message.author.tag}`, inline: true },
              { name: 'Duration', value: `${settings.warningTimeoutMinutes} minute(s)`, inline: true },
              { name: 'Reason', value: 'Reached warning limit', inline: false }
            )
            .setTimestamp();

          sendLog(message.guild, timeoutEmbed);
        }
      } else if (shouldSpamTimeout && member.moderatable) {
        await member.timeout(settings.spamTimeoutMinutes * 60_000, 'Spam detected (auto-mod)').catch(() => {});
        await message.channel.send(`⏳ ${message.author} was timed out for spam.`).catch(() => {});

        const spamEmbed = new EmbedBuilder()
          .setTitle('⏳ Auto Timeout (Spam)')
          .setColor(0xff0000)
          .addFields(
            { name: 'User', value: `${message.author.tag}`, inline: true },
            { name: 'Duration', value: `${settings.spamTimeoutMinutes} minute(s)`, inline: true },
            { name: 'Reason', value: 'Spam detected', inline: false }
          )
          .setTimestamp();

        sendLog(message.guild, spamEmbed);

        spamStates.delete(spamKey);
      }
    }

    if (settings.levelingEnabled) {
      const xpKey = `${message.guild.id}:${userId}`;
      const lastXpAt = xpCooldowns.get(xpKey) || 0;

      if (now - lastXpAt >= settings.xpCooldownMs) {
        xpCooldowns.set(xpKey, now);

        const amount = settings.randomXp
          ? Math.floor(Math.random() * 11) + 5
          : settings.xpPerMessage;

        const result = awardXp(message.guild.id, userId, amount, settings.xpCurveBase);

        if (result.leveledUp) {
          const levelUpText = replaceTokens(settings.levelUpMessage, member, result.newLevel);
          const levelUpEmbed = new EmbedBuilder()
            .setTitle('Level Up!')
            .setColor(0x57f287)
            .setDescription(levelUpText)
            .addFields(
              { name: 'Level', value: String(result.newLevel), inline: true },
              { name: 'XP', value: String(result.user.xp), inline: true },
              { name: 'Next Level XP', value: String(getXpNeeded(result.newLevel, settings.xpCurveBase)), inline: true }
            )
            .setThumbnail(message.author.displayAvatarURL({ size: 256 }))
            .setTimestamp();

          if (settings.levelChannelId) {
            await sendConfiguredChannel(message.guild, settings.levelChannelId, { embeds: [levelUpEmbed] });
          } else {
            await message.channel.send({ embeds: [levelUpEmbed] }).catch(() => {});
          }
        }
      }
    }
  } catch (err) {
    console.error('AutoMod error:', err);
  }
});

client.on(Events.GuildMemberAdd, async (member) => {
  try {
    const settings = getSettings(member.guild.id);

    if (settings.welcomeEnabled && settings.welcomeChannelId) {
      const embed = new EmbedBuilder()
        .setTitle('Welcome!')
        .setColor(0x57f287)
        .setDescription(replaceTokens(settings.welcomeMessage, member, 0))
        .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
        .setTimestamp();

      await sendConfiguredChannel(member.guild, settings.welcomeChannelId, { embeds: [embed] });
    }
  } catch (err) {
    console.error('Welcome error:', err);
  }
});

client.on(Events.GuildMemberRemove, async (member) => {
  try {
    const settings = getSettings(member.guild.id);

    if (settings.leaveEnabled && settings.leaveChannelId) {
      const embed = new EmbedBuilder()
        .setTitle('Goodbye')
        .setColor(0xed4245)
        .setDescription(replaceTokens(settings.leaveMessage, member, 0))
        .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
        .setTimestamp();

      await sendConfiguredChannel(member.guild, settings.leaveChannelId, { embeds: [embed] });
    }
  } catch (err) {
    console.error('Leave error:', err);
  }
});
/* ---------------- PANEL UI SYSTEM ---------------- */

const {
  ActionRowBuilder,
  ChannelSelectMenuBuilder,
  ChannelType,
  EmbedBuilder,
} = require('discord.js');

const {
  getSettings,
  setSettings,
} = require('./utils/store');

client.on(Events.InteractionCreate, async (interaction) => {

  /* ---------------- BUTTONS ---------------- */

  if (interaction.isButton()) {

    const guildId = interaction.guild.id;
    const settings = getSettings(guildId);

    /* ---------- TOGGLE AUTOMOD ---------- */

    if (interaction.customId === 'toggle_automod') {

      setSettings(guildId, {
        automodEnabled: !settings.automodEnabled,
      });

      return interaction.reply({
        content: `🛡️ AutoMod is now ${
          !settings.automodEnabled ? 'enabled' : 'disabled'
        }.`,
        ephemeral: true,
      });
    }

    /* ---------- TOGGLE LOGS ---------- */

    if (interaction.customId === 'toggle_logs') {

      setSettings(guildId, {
        loggingEnabled: !settings.loggingEnabled,
      });

      return interaction.reply({
        content: `📜 Logs are now ${
          !settings.loggingEnabled ? 'enabled' : 'disabled'
        }.`,
        ephemeral: true,
      });
    }

    /* ---------- TOGGLE LEVELS ---------- */

    if (interaction.customId === 'toggle_levels') {

      setSettings(guildId, {
        levelingEnabled: !settings.levelingEnabled,
      });

      return interaction.reply({
        content: `📈 Levels are now ${
          !settings.levelingEnabled ? 'enabled' : 'disabled'
        }.`,
        ephemeral: true,
      });
    }

    /* ---------- TOGGLE WELCOME ---------- */

    if (interaction.customId === 'toggle_welcome') {

      setSettings(guildId, {
        welcomeEnabled: !settings.welcomeEnabled,
      });

      return interaction.reply({
        content: `👋 Welcome system is now ${
          !settings.welcomeEnabled ? 'enabled' : 'disabled'
        }.`,
        ephemeral: true,
      });
    }

    /* ---------- SET LOG CHANNEL ---------- */

    if (interaction.customId === 'setup_log_channel') {

      const row = new ActionRowBuilder().addComponents(
        new ChannelSelectMenuBuilder()
          .setCustomId('select_log_channel')
          .setPlaceholder('Choose a log channel')
          .addChannelTypes(ChannelType.GuildText)
      );

      return interaction.reply({
        content: '📜 Select your log channel:',
        components: [row],
        ephemeral: true,
      });
    }

    /* ---------- SET WELCOME CHANNEL ---------- */

    if (interaction.customId === 'setup_welcome_channel') {

      const row = new ActionRowBuilder().addComponents(
        new ChannelSelectMenuBuilder()
          .setCustomId('select_welcome_channel')
          .setPlaceholder('Choose a welcome channel')
          .addChannelTypes(ChannelType.GuildText)
      );

      return interaction.reply({
        content: '👋 Select your welcome channel:',
        components: [row],
        ephemeral: true,
      });
    }
  }

  /* ---------------- STRING SELECT MENU ---------------- */

  if (interaction.isStringSelectMenu()) {

    const guildId = interaction.guild.id;

    /* ---------- THEME SELECT ---------- */

    if (interaction.customId === 'theme_select') {

      const theme = interaction.values[0];

      const colors = {
        neon: '#00ffee',
        cyberpunk: '#ff00ff',
        minimal: '#ffffff',
        anime: '#ff99cc',
        dark: '#2b2d31',
      };

      setSettings(guildId, {
        theme,
        accentColor: colors[theme] || '#5865F2',
      });

      return interaction.reply({
        content: `🎨 Theme updated to **${theme}**.`,
        ephemeral: true,
      });
    }
  }

  /* ---------------- CHANNEL SELECT MENUS ---------------- */

  if (interaction.isChannelSelectMenu()) {

    const guildId = interaction.guild.id;

    /* ---------- LOG CHANNEL ---------- */

    if (interaction.customId === 'select_log_channel') {

      const channelId = interaction.values[0];

      setSettings(guildId, {
        logChannelId: channelId,
      });

      return interaction.reply({
        content: `📜 Log channel set.`,
        ephemeral: true,
      });
    }

    /* ---------- WELCOME CHANNEL ---------- */

    if (interaction.customId === 'select_welcome_channel') {

      const channelId = interaction.values[0];

      setSettings(guildId, {
        welcomeChannelId: channelId,
      });

      return interaction.reply({
        content: `👋 Welcome channel set.`,
        ephemeral: true,
      });
    }
  }
});
client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isButton() || interaction.isStringSelectMenu()) {
      if (!interaction.guild) return;

      if (!isOwner(interaction)) {
        return interaction.reply({
          content: 'Only the owner can change these settings.',
          ephemeral: true,
        });
      }

      const settings = getSettings(interaction.guild.id);

      if (interaction.isButton()) {
        const parts = interaction.customId.split(':');

        if (parts[0] !== 'panel') return;

        if (parts[1] === 'toggle') {
          const key = parts[2];
          const map = {
            automod: 'automodEnabled',
            leveling: 'levelingEnabled',
            logging: 'loggingEnabled',
            welcome: 'welcomeEnabled',
            leave: 'leaveEnabled',
            randomXp: 'randomXp',
          };

          const settingKey = map[key];
          if (!settingKey) return;

          setSettings(interaction.guild.id, {
            [settingKey]: !settings[settingKey],
          });
        }

        if (parts[1] === 'refresh') {
          // no-op
        }

        if (parts[1] === 'showsettings') {
          return interaction.update({
            embeds: [buildSettingsEmbed(interaction.guild, getSettings(interaction.guild.id))],
            components: buildPanelComponents(getSettings(interaction.guild.id)),
          });
        }

        const updated = getSettings(interaction.guild.id);

        return interaction.update({
          embeds: [buildPanelEmbed(interaction.guild, updated)],
          components: buildPanelComponents(updated),
        });
      }

      if (interaction.isStringSelectMenu() && interaction.customId === 'panel:theme') {
        const theme = interaction.values[0];
        if (!THEMES[theme]) return;

        setSettings(interaction.guild.id, { theme });

        const updated = getSettings(interaction.guild.id);
        return interaction.update({
          embeds: [buildPanelEmbed(interaction.guild, updated)],
          components: buildPanelComponents(updated),
        });
      }
    }

    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) {
      return interaction.reply({
        content: 'Command not found.',
        ephemeral: true,
      });
    }

    await command.execute(interaction);
  } catch (error) {
    console.error(error);

    const reply = {
      content: 'There was an error executing this interaction.',
      ephemeral: true,
    };

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(reply).catch(() => {});
    } else {
      await interaction.reply(reply).catch(() => {});
    }
  }
});

client.login(process.env.TOKEN);