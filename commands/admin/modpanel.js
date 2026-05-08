const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getSettings } = require('../../utils/store');
const { buildPanelEmbed, buildPanelRow } = require('../../utils/panel');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('modpanel')
    .setDescription('Open the moderation control panel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const settings = getSettings(interaction.guild.id);

    await interaction.reply({
      embeds: [buildPanelEmbed(interaction.guild, settings)],
      components: [buildPanelRow(settings)],
      ephemeral: true,
    });
  },
};