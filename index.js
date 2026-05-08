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
  getWarningCount,
  setWarningCount,
  addXp,
  getUserRecord,
  getLeaderboard,
  buildProgressBar,
} = require('./utils/store');

const { sendLog } = require('./utils/logger');
const { buildPanelEmbed, buildPanelRow } = require('./utils/panel');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
  ],
});

client.commands = new Collection();

const spamStates = new Map();
const xpCooldowns = new Map();

function loadCommands(dir) {
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

function buildLevelEmbed(member, userRecord, settings) {
  const currentXp = userRecord.xp % 100;
  const nextXp = 100;
  const bar = buildProgressBar(currentXp, nextXp, 12);

  return new EmbedBuilder()
    .setTitle(`${member.user.username}'s Level`)
    .setColor(0x00b0f4)
    .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
    .addFields(
      { name: 'Level', value: String(userRecord.level), inline: true },
      { name: 'XP', value: `${currentXp}/100`, inline: true },
      { name: 'Messages', value: String(userRecord.messages), inline: true },
      { name: 'Progress', value: `${bar}\n${Math.round((currentXp / nextXp) * 100)}%`, inline: false }
    )
    .setFooter({ text: settings.levelUpMessage })
    .setTimestamp();
}

function replaceTokens(template, member, level) {
  return template
    .replaceAll('{user}', member.toString())
    .replaceAll('{username}', member.user.username)
    .replaceAll('{server}', member.guild.name)
    .replaceAll('{level}', String(level));
}

async function maybeSendToChannel(guild, channelId, payload) {
  if (!channelId) return;

  const channel = await guild.channels.fetch(channelId).catch(() => null);
  if (!channel || !channel.isTextBased()) return;

  await channel.send(payload).catch(() => {});
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

    /* ---------------- AUTOMOD ---------------- */

    if (settings.automodEnabled) {
      let warnReason = null;

      const lettersOnly = content.replace(/[^A-Za-z]/g, '');
      const upperOnly = content.replace(/[^A-Z]/g, '');
      const capsRatio = lettersOnly.length ? upperOnly.length / lettersOnly.length : 0;

      const inviteRegex = /(?:https?:\/\/)?(?:www\.)?(?:discord\.gg|discord(?:app)?\.com\/invite)\/[^\s]+/i;

      if (content.length >= settings.capsMinLength && capsRatio > settings.capsRatio) {
        warnReason = 'Excessive caps';
      }

      if (inviteRegex.test(content)) {
        warnReason = warnReason || 'Invite link detected';
      }

      if (warnReason) {
        const newWarnings = getWarningCount(message.guild.id, userId) + 1;
        setWarningCount(message.guild.id, userId, newWarnings);

        await message.reply(`⚠️ Warning (${newWarnings}/${settings.warnLimit}): ${warnReason}`).catch(() => {});

        const warningEmbed = new EmbedBuilder()
          .setTitle('⚠️ Warning Issued')
          .setColor(0xffcc00)
          .addFields(
            { name: 'User', value: `${message.author.tag}`, inline: true },
            { name: 'Reason', value: warnReason, inline: true },
            { name: 'Warnings', value: `${newWarnings}/${settings.warnLimit}`, inline: true }
          )
          .setTimestamp();

        sendLog(message.guild, warningEmbed);

        if (newWarnings >= settings.warnLimit && member.moderatable) {
          await member.timeout(settings.warningTimeoutMinutes * 60_000, 'Too many warnings (auto-mod)').catch(() => {});
          setWarningCount(message.guild.id, userId, 0);

          await message.channel.send(`⏳ ${message.author} has been timed out.`).catch(() => {});

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
      }

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

      if (state.count >= settings.spamThreshold) {
        if (member.moderatable) {
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
        }

        spamStates.delete(spamKey);
      }
    }

    /* ---------------- LEVELING ---------------- */

    if (settings.levelingEnabled) {
      const xpKey = `${message.guild.id}:${userId}`;
      const lastXpAt = xpCooldowns.get(xpKey) || 0;

      if (now - lastXpAt >= settings.xpCooldownMs) {
        xpCooldowns.set(xpKey, now);

        const amount = settings.randomXp
          ? Math.floor(Math.random() * 11) + 5
          : settings.xpPerMessage;

        const result = addXp(message.guild.id, userId, amount);

        if (result.leveledUp) {
          const levelMessage = replaceTokens(settings.levelUpMessage, member, result.newLevel);

          const levelUpEmbed = new EmbedBuilder()
            .setTitle('Level Up!')
            .setColor(0x57f287)
            .setDescription(levelMessage)
            .addFields(
              { name: 'Level', value: String(result.newLevel), inline: true },
              { name: 'XP', value: String(result.user.xp), inline: true }
            )
            .setThumbnail(message.author.displayAvatarURL({ size: 256 }))
            .setTimestamp();

          if (settings.levelChannelId) {
            await maybeSendToChannel(message.guild, settings.levelChannelId, {
              embeds: [levelUpEmbed],
            });
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
    if (!settings.welcomeEnabled || !settings.welcomeChannelId) return;

    const embed = new EmbedBuilder()
      .setTitle('Welcome!')
      .setColor(0x57f287)
      .setDescription(
        replaceTokens(settings.welcomeMessage, member, 0)
      )
      .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
      .setTimestamp();

    await maybeSendToChannel(member.guild, settings.welcomeChannelId, {
      embeds: [embed],
    });
  } catch (err) {
    console.error('Welcome error:', err);
  }
});

client.on(Events.GuildMemberRemove, async (member) => {
  try {
    const settings = getSettings(member.guild.id);
    if (!settings.leaveEnabled || !settings.leaveChannelId) return;

    const embed = new EmbedBuilder()
      .setTitle('Goodbye')
      .setColor(0xed4245)
      .setDescription(
        replaceTokens(settings.leaveMessage, member, 0)
      )
      .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
      .setTimestamp();

    await maybeSendToChannel(member.guild, settings.leaveChannelId, {
      embeds: [embed],
    });
  } catch (err) {
    console.error('Leave error:', err);
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isButton()) {
      if (!interaction.guild) return;

      const settings = getSettings(interaction.guild.id);

      if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
        return interaction.reply({
          content: 'You need Manage Guild to use the control panel.',
          ephemeral: true,
        });
      }

      if (interaction.customId === 'panel_toggle_automod') {
        setSettings(interaction.guild.id, { automodEnabled: !settings.automodEnabled });
      } else if (interaction.customId === 'panel_toggle_leveling') {
        setSettings(interaction.guild.id, { levelingEnabled: !settings.levelingEnabled });
      } else if (interaction.customId === 'panel_toggle_welcome') {
        setSettings(interaction.guild.id, { welcomeEnabled: !settings.welcomeEnabled });
      } else if (interaction.customId === 'panel_toggle_leave') {
        setSettings(interaction.guild.id, { leaveEnabled: !settings.leaveEnabled });
      } else if (interaction.customId === 'panel_refresh') {
        // no setting change, just refresh
      } else {
        return;
      }

      const updated = getSettings(interaction.guild.id);

      return interaction.update({
        embeds: [buildPanelEmbed(interaction.guild, updated)],
        components: [buildPanelRow(updated)],
      });
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