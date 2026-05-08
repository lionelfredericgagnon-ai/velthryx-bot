const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getSettings, getUserRecord, getXpNeeded, buildProgressBar } = require('../../utils/store');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription('Show your rank')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to view')
        .setRequired(false)
    ),

  async execute(interaction) {
    const settings = getSettings(interaction.guild.id);
    const user = interaction.options.getUser('user') || interaction.user;
    const record = getUserRecord(interaction.guild.id, user.id);
    const needed = getXpNeeded(record.level, settings.xpCurveBase);
    const bar = buildProgressBar(record.xp, needed, 12);

    const embed = new EmbedBuilder()
      .setTitle(`${user.username}'s Rank`)
      .setColor(0x00b0f4)
      .setThumbnail(user.displayAvatarURL({ size: 256 }))
      .addFields(
        { name: 'Level', value: String(record.level), inline: true },
        { name: 'XP', value: `${record.xp}/${needed}`, inline: true },
        { name: 'Messages', value: String(record.messages), inline: true },
        { name: 'Progress', value: `${bar}\n${Math.round((record.xp / needed) * 100)}%`, inline: false }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};