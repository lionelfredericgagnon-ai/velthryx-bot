const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');

function onOff(value) {
  return value ? 'Enabled' : 'Disabled';
}

function buildPanelEmbed(guild, settings) {
  return new EmbedBuilder()
    .setTitle('Velthryx Control Panel')
    .setColor(0x7289da)
    .setDescription(
      'Use the buttons below to toggle the main systems. Use `/config` for channels, messages, XP, and punishments.'
    )
    .addFields(
      { name: 'Automod', value: onOff(settings.automodEnabled), inline: true },
      { name: 'Leveling', value: onOff(settings.levelingEnabled), inline: true },
      { name: 'Welcome', value: onOff(settings.welcomeEnabled), inline: true },
      { name: 'Leave', value: onOff(settings.leaveEnabled), inline: true },
      { name: 'Log Channel', value: settings.logChannelId ? `<#${settings.logChannelId}>` : 'Not set', inline: false },
      { name: 'Level Channel', value: settings.levelChannelId ? `<#${settings.levelChannelId}>` : 'Not set', inline: true }
    )
    .setFooter({ text: guild.name })
    .setTimestamp();
}

function buildSettingsEmbed(guild, settings) {
  return new EmbedBuilder()
    .setTitle('Server Settings')
    .setColor(0x2b2d31)
    .addFields(
      { name: 'Systems', value: `Automod: ${onOff(settings.automodEnabled)}\nLeveling: ${onOff(settings.levelingEnabled)}\nWelcome: ${onOff(settings.welcomeEnabled)}\nLeave: ${onOff(settings.leaveEnabled)}\nRandom XP: ${onOff(settings.randomXp)}`, inline: false },
      { name: 'Channels', value: `Log: ${settings.logChannelId ? `<#${settings.logChannelId}>` : 'Not set'}\nWelcome: ${settings.welcomeChannelId ? `<#${settings.welcomeChannelId}>` : 'Not set'}\nLeave: ${settings.leaveChannelId ? `<#${settings.leaveChannelId}>` : 'Not set'}\nLevel: ${settings.levelChannelId ? `<#${settings.levelChannelId}>` : 'Not set'}`, inline: false },
      { name: 'XP', value: `Per message: ${settings.xpPerMessage}\nCooldown: ${settings.xpCooldownMs} ms`, inline: true },
      { name: 'Auto-mod', value: `Warn limit: ${settings.warnLimit}\nSpam threshold: ${settings.spamThreshold}\nSpam timeout: ${settings.spamTimeoutMinutes} min\nWarn timeout: ${settings.warningTimeoutMinutes} min`, inline: true },
      { name: 'Messages', value: `Welcome: ${settings.welcomeMessage}\nLeave: ${settings.leaveMessage}\nLevel-up: ${settings.levelUpMessage}`, inline: false }
    )
    .setFooter({ text: guild.name })
    .setTimestamp();
}

function buildPanelRow(settings) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('panel_toggle_automod')
      .setLabel(`Automod: ${settings.automodEnabled ? 'ON' : 'OFF'}`)
      .setStyle(settings.automodEnabled ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('panel_toggle_leveling')
      .setLabel(`Leveling: ${settings.levelingEnabled ? 'ON' : 'OFF'}`)
      .setStyle(settings.levelingEnabled ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('panel_toggle_welcome')
      .setLabel(`Welcome: ${settings.welcomeEnabled ? 'ON' : 'OFF'}`)
      .setStyle(settings.welcomeEnabled ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('panel_toggle_leave')
      .setLabel(`Leave: ${settings.leaveEnabled ? 'ON' : 'OFF'}`)
      .setStyle(settings.leaveEnabled ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('panel_refresh')
      .setLabel('Refresh')
      .setStyle(ButtonStyle.Primary)
  );
}

module.exports = {
  buildPanelEmbed,
  buildPanelRow,
  buildSettingsEmbed,
};