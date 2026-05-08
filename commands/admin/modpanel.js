const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getSettings } = require('../../utils/store');
const { buildPanelEmbed, buildPanelComponents } = require('../../utils/panel');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('modpanel')
    .setDescription('Open the Velthryx control panel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const ownerId = process.env.OWNER_ID;
    if (ownerId && interaction.user.id !== ownerId) {
      return interaction.reply({
        content: 'Only the owner can use this panel.',
        ephemeral: true,
      });
    }

    const settings = getSettings(interaction.guild.id);

    await interaction.reply({
      embeds: [buildPanelEmbed(interaction.guild, settings)],
      components: buildPanelComponents(settings),
      ephemeral: true,
    });
  },
};