const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  StringSelectMenuBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  ChannelType,
} = require('discord.js');

const {
  getSettings,
  setSettings,
} = require('../../utils/store');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('panel')
    .setDescription('Open the Velthryx control panel')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {

    const settings = getSettings(interaction.guild.id);

    const embed = new EmbedBuilder()
      .setTitle('🎛️ Velthryx Control Panel')
      .setDescription(
        [
          'Manage your server directly from Discord.',
          '',
          `🛡️ AutoMod: ${settings.automodEnabled ? '✅ Enabled' : '❌ Disabled'}`,
          `📜 Logs: ${settings.loggingEnabled ? '✅ Enabled' : '❌ Disabled'}`,
          `📈 Levels: ${settings.levelingEnabled ? '✅ Enabled' : '❌ Disabled'}`,
          `👋 Welcome: ${settings.welcomeEnabled ? '✅ Enabled' : '❌ Disabled'}`,
          `🎨 Theme: ${settings.theme}`,
        ].join('\n')
      )
      .setColor(settings.accentColor || '#5865F2')
      .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
      .setFooter({
        text: 'Velthryx UI System',
      });

    const toggles = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('toggle_automod')
        .setLabel('Toggle AutoMod')
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId('toggle_logs')
        .setLabel('Toggle Logs')
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setCustomId('toggle_levels')
        .setLabel('Toggle Levels')
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId('toggle_welcome')
        .setLabel('Toggle Welcome')
        .setStyle(ButtonStyle.Danger),
    );

    const themeMenu = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('theme_select')
        .setPlaceholder('Choose a theme')
        .addOptions([
          {
            label: 'Neon',
            value: 'neon',
            description: 'Bright neon cyber style',
          },
          {
            label: 'Cyberpunk',
            value: 'cyberpunk',
            description: 'Purple futuristic theme',
          },
          {
            label: 'Minimal',
            value: 'minimal',
            description: 'Clean minimal theme',
          },
          {
            label: 'Anime',
            value: 'anime',
            description: 'Anime style theme',
          },
          {
            label: 'Dark',
            value: 'dark',
            description: 'Dark mode style',
          },
        ])
    );

    const channels = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('setup_log_channel')
        .setLabel('Set Log Channel')
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setCustomId('setup_welcome_channel')
        .setLabel('Set Welcome Channel')
        .setStyle(ButtonStyle.Secondary),
    );

    await interaction.reply({
      embeds: [embed],
      components: [
        toggles,
        themeMenu,
        channels,
      ],
      ephemeral: true,
    });
  },
};