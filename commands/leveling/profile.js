const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUserRecord, getWarningCount } = require('../../utils/store');

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
    const user = interaction.options.getUser('user') || interaction.user;
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    const record = getUserRecord(interaction.guild.id, user.id);
    const warnings = getWarningCount(interaction.guild.id, user.id);

    const embed = new EmbedBuilder()
      .setTitle(`Profile: ${user.username}`)
      .setColor(0x2b2d31)
      .setThumbnail(user.displayAvatarURL({ size: 256 }))
      .addFields(
        { name: 'Level', value: String(record.level), inline: true },
        { name: 'XP', value: String(record.xp), inline: true },
        { name: 'Messages', value: String(record.messages), inline: true },
        { name: 'Warnings', value: `${warnings}`, inline: true },
        { name: 'User ID', value: user.id, inline: false }
      )
      .setTimestamp();

    if (member?.joinedAt) {
      embed.addFields({ name: 'Joined Server', value: `<t:${Math.floor(member.joinedAt.getTime() / 1000)}:R>`, inline: false });
    }

    await interaction.reply({ embeds: [embed] });
  },
};