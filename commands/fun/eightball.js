const { SlashCommandBuilder } = require('discord.js');

const answers = [
  'Yes.',
  'No.',
  'Maybe.',
  'Definitely.',
  'Absolutely not.',
  'Ask again later.',
  'Very likely.',
  'Unclear.',
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('8ball')
    .setDescription('Ask the magic 8-ball a question')
    .addStringOption(option =>
      option.setName('question')
        .setDescription('Your question')
        .setRequired(true)
    ),

  async execute(interaction) {
    const answer = answers[Math.floor(Math.random() * answers.length)];
    await interaction.reply(`🎱 ${answer}`);
  },
};