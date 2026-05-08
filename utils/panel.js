const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
} = require('discord.js');

const THEMES = {
  default: { name: 'Default', color: 0x5865f2 },
  cyberpunk: { name: 'Cyberpunk', color: 0x00f5ff },
  neon: { name: 'Neon', color: 0xff00ff },
  minimal: { name: 'Minimal', color: 0x2f3136 },
  anime: { name: 'Anime', color: 0xf47fff },
  dark: { name: 'Dark', color: 0x111111 },
};

function onOff(value) {
  return value ? 'ON' : 'OFF';
}

function themeData(theme) {
  return THEMES[theme] || THEMES.default;
}

function buildPanelEmbed(guild, settings) {
  const theme = themeData(settings.theme);

  const embed = new EmbedBuilder()
    .setTitle(`🎛️ ${settings.customBrandName || 'Velthryx Bot'} Panel`)
    .setColor(theme.color)
    .setDescription(
      [
        '**Quick Toggles**',
        'Use the buttons and theme selector below.',
        '',
        '**Owner Settings**',
        `Automod: **${onOff(settings.automodEnabled)}**`,
        `Leveling: **${onOff(settings.levelingEnabled)}**`,
        `Logging: **${onOff(settings.loggingEnabled)}**`,
        `Welcome: **${onOff(settings.welcomeEnabled)}**`,
        `Leave: **${onOff(settings.leaveEnabled)}**`,
        `Random XP: **${onOff(settings.randomXp)}**`,
      ].join('\n')
    )
    .addFields(
      {
        name: 'Channels',
        value: [
          `Log: ${settings.logChannelId ? `<#${settings.logChannelId}>` : 'Not set'}`,
          `Welcome: ${settings.welcomeChannelId ? `<#${settings.welcomeChannelId}>` : 'Not set'}`,
          `Leave: ${settings.leaveChannelId ? `<#${settings.leaveChannelId}>` : 'Not set'}`,
          `Level: ${settings.levelChannelId ? `<#${settings.levelChannelId}>` : 'Not set'}`,
          `Appeals: ${settings.appealChannelId ? `<#${settings.appealChannelId}>` : 'Not set'}`,
        ].join('\n'),
        inline: false,
      },
      {
        name: 'Theme',
        value: `\`${settings.theme}\``,
        inline: true,
      },
      {
        name: 'XP',
        value: `\`${settings.xpPerMessage} XP\` per message`,
        inline: true,
      },
      {
        name: 'Warnings',
        value: `\`${settings.warnLimit}\` before timeout`,
        inline: true,
      }
    )
    .setFooter({ text: guild.name })
    .setTimestamp();

  if (settings.bannerUrl) {
    embed.setImage(settings.bannerUrl);
  }

  return embed;
}

function buildSettingsEmbed(guild, settings) {
  const theme = themeData(settings.theme);

  return new EmbedBuilder()
    .setTitle('⚙️ Server Settings')
    .setColor(theme.color)
    .addFields(
      {
        name: 'Systems',
        value: [
          `Automod: ${onOff(settings.automodEnabled)}`,
          `Leveling: ${onOff(settings.levelingEnabled)}`,
          `Logging: ${onOff(settings.loggingEnabled)}`,
          `Welcome: ${onOff(settings.welcomeEnabled)}`,
          `Leave: ${onOff(settings.leaveEnabled)}`,
          `Random XP: ${onOff(settings.randomXp)}`,
        ].join('\n'),
        inline: false,
      },
      {
        name: 'Channels',
        value: [
          `Log: ${settings.logChannelId ? `<#${settings.logChannelId}>` : 'Not set'}`,
          `Welcome: ${settings.welcomeChannelId ? `<#${settings.welcomeChannelId}>` : 'Not set'}`,
          `Leave: ${settings.leaveChannelId ? `<#${settings.leaveChannelId}>` : 'Not set'}`,
          `Level: ${settings.levelChannelId ? `<#${settings.levelChannelId}>` : 'Not set'}`,
          `Appeals: ${settings.appealChannelId ? `<#${settings.appealChannelId}>` : 'Not set'}`,
        ].join('\n'),
        inline: false,
      },
      {
        name: 'Messages',
        value: [
          `Welcome: ${settings.welcomeMessage}`,
          `Leave: ${settings.leaveMessage}`,
          `Level-up: ${settings.levelUpMessage}`,
        ].join('\n'),
        inline: false,
      },
      {
        name: 'Moderation',
        value: [
          `Warn limit: ${settings.warnLimit}`,
          `Warn timeout: ${settings.warningTimeoutMinutes} min`,
          `Spam threshold: ${settings.spamThreshold}`,
          `Spam timeout: ${settings.spamTimeoutMinutes} min`,
        ].join('\n'),
        inline: false,
      }
    )
    .setFooter({ text: guild.name })
    .setTimestamp();
}

function buildPanelComponents(settings) {
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('panel:toggle:automod')
      .setLabel(`Automod ${onOff(settings.automodEnabled)}`)
      .setStyle(settings.automodEnabled ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('panel:toggle:leveling')
      .setLabel(`Leveling ${onOff(settings.levelingEnabled)}`)
      .setStyle(settings.levelingEnabled ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('panel:toggle:logging')
      .setLabel(`Logging ${onOff(settings.loggingEnabled)}`)
      .setStyle(settings.loggingEnabled ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('panel:toggle:welcome')
      .setLabel(`Welcome ${onOff(settings.welcomeEnabled)}`)
      .setStyle(settings.welcomeEnabled ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('panel:toggle:leave')
      .setLabel(`Leave ${onOff(settings.leaveEnabled)}`)
      .setStyle(settings.leaveEnabled ? ButtonStyle.Success : ButtonStyle.Secondary)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('panel:toggle:randomXp')
      .setLabel(`Random XP ${onOff(settings.randomXp)}`)
      .setStyle(settings.randomXp ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('panel:refresh')
      .setLabel('Refresh')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('panel:showsettings')
      .setLabel('Show Settings')
      .setStyle(ButtonStyle.Primary)
  );

  const themeMenu = new StringSelectMenuBuilder()
    .setCustomId('panel:theme')
    .setPlaceholder('Choose a theme')
    .addOptions(
      Object.entries(THEMES).map(([key, value]) => ({
        label: value.name,
        value: key,
        default: key === settings.theme,
      }))
    );

  const row3 = new ActionRowBuilder().addComponents(themeMenu);

  return [row1, row2, row3];
}

module.exports = {
  THEMES,
  buildPanelEmbed,
  buildSettingsEmbed,
  buildPanelComponents,
};