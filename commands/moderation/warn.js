const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

const warningsFile = path.join(__dirname, '../../data/warnings.json');

function loadWarnings() {
  if (!fs.existsSync(warningsFile)) return {};
  return JSON.parse(fs.readFileSync(warningsFile, 'utf8'));
}

function saveWarnings(data) {
  fs.writeFileSync(warningsFile, JSON.stringify(data, null, 2));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn a user')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to warn')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    const warnings = loadWarnings();

    const userId = user.id;
    const current = warnings[userId] || 0;
    warnings[userId] = current + 1;

    saveWarnings(warnings);

    await interaction.reply(
      `⚠️ ${user.tag} has been warned (${warnings[userId]}/3)\nReason: ${reason}`
    );
  },
};