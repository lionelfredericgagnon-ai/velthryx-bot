const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show all commands'),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('Velthryx Bot Help')
      .setColor(0x7289da)
      .addFields(
        { name: 'Utility', value: '`/ping` `/help`', inline: false },
        { name: 'Leveling', value: '`/rank` `/profile` `/leaderboard`', inline: false },
        { name: 'Moderation', value: '`/kick` `/ban` `/timeout` `/warn` `/warnings` `/clear`', inline: false },
        { name: 'Admin', value: '`/modpanel` `/config`', inline: false },
        { name: 'Fun', value: '`/coinflip` `/roll` `/8ball`', inline: false }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};