const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const warningsFile = path.join(__dirname, '../../data/warnings.json');

function loadWarnings() {
  if (!fs.existsSync(warningsFile)) return {};
  return JSON.parse(fs.readFileSync(warningsFile, 'utf8'));
}

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
    const warnings = loadWarnings();

    const count = warnings[user.id] || 0;

    await interaction.reply(
      `⚠️ ${user.tag} has ${count}/3 warnings`
    );
  },
};