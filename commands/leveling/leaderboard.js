const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getLeaderboard } = require('../../utils/store');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Show the XP leaderboard'),

  async execute(interaction) {
    const board = getLeaderboard(interaction.guild.id);

    if (board.length === 0) {
      return interaction.reply({ content: 'No leaderboard data yet.' });
    }

    const lines = [];
    for (const entry of board) {
      let name = `<@${entry.userId}>`;
      const member = await interaction.guild.members.fetch(entry.userId).catch(() => null);
      if (member) name = member.user.tag;

      lines.push(`**#${entry.rank}** — ${name} • Level ${entry.level} • ${entry.xp} XP`);
    }

    const embed = new EmbedBuilder()
      .setTitle('XP Leaderboard')
      .setColor(0xf1c40f)
      .setDescription(lines.join('\n'))
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};