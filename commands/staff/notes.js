const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getNotes } = require('../../utils/store');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('notes')
    .setDescription('View staff notes for a user')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to inspect')
        .setRequired(true)
    ),

  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const notes = getNotes(interaction.guild.id, user.id).slice(-10).reverse();

    if (notes.length === 0) {
      return interaction.reply({ content: 'No notes for this user.', ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setTitle(`📝 Notes: ${user.tag}`)
      .setColor(0x3498db)
      .setDescription(
        notes.map((n) => `**#${n.id}** — <@${n.authorId}> — ${n.text} <t:${Math.floor(n.timestamp / 1000)}:R>`).join('\n')
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};