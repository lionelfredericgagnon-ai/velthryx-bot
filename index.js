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
  ActionRowBuilder,
  ChannelSelectMenuBuilder,
  ChannelType,
} = require('discord.js');

/* ---------------- UTILS ---------------- */

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

/* ---------------- CLIENT ---------------- */

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
  ],
});

client.commands = new Collection();

/* ---------------- STATE ---------------- */

const xpCooldowns = new Map();
const spamStates = new Map();

/* ---------------- HELPERS ---------------- */

function isOwner(interaction) {
  const ownerId = process.env.OWNER_ID;
  if (ownerId) return interaction.user.id === ownerId;
  return interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild);
}

async function sendConfiguredChannel(guild, channelId, payload) {
  if (!channelId) return;
  const channel = await guild.channels.fetch(channelId).catch(() => null);
  if (!channel || !channel.isTextBased()) return;
  await channel.send(payload).catch(() => {});
}

/* ---------------- COMMAND LOADER ---------------- */

function loadCommands(dir) {
  if (!fs.existsSync(dir)) return;

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      loadCommands(fullPath);
    } else if (entry.name.endsWith('.js')) {
      const command = require(fullPath);

      if (command?.data?.name && typeof command.execute === 'function') {
        client.commands.set(command.data.name, command);
      } else {
        console.log(`[WARNING] Bad command: ${fullPath}`);
      }
    }
  }
}

loadCommands(path.join(__dirname, 'commands'));

/* ---------------- READY ---------------- */

client.once(Events.ClientReady, (readyClient) => {
  console.log(`✅ Logged in as ${readyClient.user.tag}`);
});

/* ---------------- PANEL + COMMAND HANDLER (ONE ONLY) ---------------- */

client.on(Events.InteractionCreate, async (interaction) => {
  try {

    /* ================= PANEL ================= */

    if (interaction.isButton() || interaction.isStringSelectMenu()) {

      if (!interaction.guild) return;
      if (!isOwner(interaction)) {
        return interaction.reply({
          content: 'Only the owner can use this panel.',
          ephemeral: true,
        });
      }

      const settings = getSettings(interaction.guild.id);

      /* ---------- BUTTONS ---------- */

      if (interaction.isButton()) {

        const id = interaction.customId;

        if (id === 'toggle_automod')
          setSettings(interaction.guild.id, { automodEnabled: !settings.automodEnabled });

        if (id === 'toggle_logs')
          setSettings(interaction.guild.id, { loggingEnabled: !settings.loggingEnabled });

        if (id === 'toggle_levels')
          setSettings(interaction.guild.id, { levelingEnabled: !settings.levelingEnabled });

        if (id === 'toggle_welcome')
          setSettings(interaction.guild.id, { welcomeEnabled: !settings.welcomeEnabled });

        if (id === 'setup_log_channel') {
          const row = new ActionRowBuilder().addComponents(
            new ChannelSelectMenuBuilder()
              .setCustomId('select_log_channel')
              .setPlaceholder('Choose log channel')
              .addChannelTypes(ChannelType.GuildText)
          );

          return interaction.reply({
            content: 'Select log channel:',
            components: [row],
            ephemeral: true,
          });
        }

        if (id === 'setup_welcome_channel') {
          const row = new ActionRowBuilder().addComponents(
            new ChannelSelectMenuBuilder()
              .setCustomId('select_welcome_channel')
              .setPlaceholder('Choose welcome channel')
              .addChannelTypes(ChannelType.GuildText)
          );

          return interaction.reply({
            content: 'Select welcome channel:',
            components: [row],
            ephemeral: true,
          });
        }

        const updated = getSettings(interaction.guild.id);

        return interaction.reply({
          content: 'Updated settings.',
          embeds: [buildPanelEmbed(interaction.guild, updated)],
          components: buildPanelComponents(updated),
          ephemeral: true,
        });
      }

      /* ---------- SELECT MENUS ---------- */

      if (interaction.isStringSelectMenu()) {

        if (interaction.customId === 'theme_select') {
          setSettings(interaction.guild.id, {
            theme: interaction.values[0],
          });

          return interaction.reply({
            content: 'Theme updated.',
            ephemeral: true,
          });
        }
      }

      if (interaction.isChannelSelectMenu()) {

        if (interaction.customId === 'select_log_channel') {
          setSettings(interaction.guild.id, {
            logChannelId: interaction.values[0],
          });

          return interaction.reply({
            content: 'Log channel set.',
            ephemeral: true,
          });
        }

        if (interaction.customId === 'select_welcome_channel') {
          setSettings(interaction.guild.id, {
            welcomeChannelId: interaction.values[0],
          });

          return interaction.reply({
            content: 'Welcome channel set.',
            ephemeral: true,
          });
        }
      }
    }

    /* ================= SLASH COMMANDS ================= */

    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) {
      return interaction.reply({
        content: 'Command not found.',
        ephemeral: true,
      });
    }

    await command.execute(interaction);

  } catch (err) {
    console.error(err);

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({
        content: 'Error executing interaction.',
        ephemeral: true,
      });
    } else {
      await interaction.reply({
        content: 'Error executing interaction.',
        ephemeral: true,
      });
    }
  }
});

/* ---------------- LOGIN ---------------- */

client.login(process.env.TOKEN);