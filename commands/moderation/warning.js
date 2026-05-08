const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getWarningCount } = require('../../utils/store');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('Check warnings for a user')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to check')
        .setRequired(true)
    ),

  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const warnings = getWarningCount(interaction.guild.id, user.id);

    const embed = new EmbedBuilder()
      .setTitle('Warning Check')
      .setColor(0xf1c40f)
      .setThumbnail(user.displayAvatarURL({ size: 256 }))
      .addFields(
        { name: 'User', value: `${user.tag}`, inline: true },
        { name: 'Warnings', value: `${warnings}`, inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};