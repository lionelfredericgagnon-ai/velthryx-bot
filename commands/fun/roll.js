const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('roll')
    .setDescription('Roll a number')
    .addIntegerOption(option =>
      option.setName('max')
        .setDescription('Maximum number')
        .setRequired(true)
        .setMinValue(2)
        .setMaxValue(1000000)
    ),

  async execute(interaction) {
    const max = interaction.options.getInteger('max');
    const result = Math.floor(Math.random() * max) + 1;
    await interaction.reply(`🎲 I rolled **${result}** out of **${max}**`);
  },
};