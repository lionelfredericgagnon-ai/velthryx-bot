const { EmbedBuilder } = require('discord.js');
const { getSettings } = require('./store');

async function sendLog(guild, embed) {
  try {
    if (!guild) return;

    const settings = getSettings(guild.id);
    if (!settings.loggingEnabled) return;

    const channelId = settings.logChannelId;
    if (!channelId) return;

    const channel = await guild.channels.fetch(channelId).catch(() => null);
    if (!channel || !channel.isTextBased()) return;

    await channel.send({ embeds: [embed] }).catch(() => {});
  } catch (err) {
    console.error('Log error:', err);
  }
}

function buildSimpleLog(title, description, color = 0x5865f2) {
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(color)
    .setTimestamp();
}

module.exports = {
  sendLog,
  buildSimpleLog,
};