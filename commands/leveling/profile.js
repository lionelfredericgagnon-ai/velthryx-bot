const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUserRecord, getWarningCount, getXpNeeded, getSettings } = require('../../utils/store');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('profile')
    .setDescription('Show a user profile')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to view')
        .setRequired(false)
    ),

  async execute(interaction) {
    const settings = getSettings(interaction.guild.id);
    const user = interaction.options.getUser('user') || interaction.user;
    const record = getUserRecord(interaction.guild.id, user.id);
    const warnings = getWarningCount(interaction.guild.id, user.id);
    const needed = getXpNeeded(record.level, settings.xpCurveBase);

    const embed = new EmbedBuilder()
      .setTitle(`Profile: ${user.username}`)
      .setColor(0x2b2d31)
      .setThumbnail(user.displayAvatarURL({ size: 256 }))
      .addFields(
        { name: 'Level', value: String(record.level), inline: true },
        { name: 'XP', value: `${record.xp}/${needed}`, inline: true },
        { name: 'Messages', value: String(record.messages), inline: true },
        { name: 'Warnings', value: String(warnings), inline: true },
        { name: 'User ID', value: user.id, inline: false }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};