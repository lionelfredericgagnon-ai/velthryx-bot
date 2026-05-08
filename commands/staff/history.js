const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getCases } = require('../../utils/store');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('history')
    .setDescription('View punishment history for a user')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to inspect')
        .setRequired(true)
    ),

  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const cases = getCases(interaction.guild.id, user.id).slice(-10).reverse();

    if (cases.length === 0) {
      return interaction.reply({ content: 'No history for this user.', ephemeral: true });
    }

    const lines = cases.map((entry) =>
      `**#${entry.caseId}** — ${entry.action.toUpperCase()} — ${entry.reason} <t:${Math.floor(entry.timestamp / 1000)}:R>`
    );

    const embed = new EmbedBuilder()
      .setTitle(`📜 History: ${user.tag}`)
      .setColor(0x7289da)
      .setDescription(lines.join('\n'))
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};