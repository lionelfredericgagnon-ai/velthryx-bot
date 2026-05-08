const { getSettings } = require('./store');

async function sendLog(guild, embed) {
  try {
    if (!guild) return;

    const settings = getSettings(guild.id);
    const channelId = settings.logChannelId || process.env.LOG_CHANNEL_ID;
    if (!channelId) return;

    const channel = await guild.channels.fetch(channelId).catch(() => null);
    if (!channel || !channel.isTextBased()) return;

    await channel.send({ embeds: [embed] }).catch(() => {});
  } catch (err) {
    console.error('Log error:', err);
  }
}

module.exports = { sendLog };