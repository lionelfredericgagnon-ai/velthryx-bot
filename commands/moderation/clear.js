const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Delete messages in bulk')
    .addIntegerOption(option =>
      option.setName('amount')
        .setDescription('1-100 messages')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction) {
    const amount = interaction.options.getInteger('amount');

    if (!interaction.channel?.bulkDelete) {
      return interaction.reply({ content: 'This channel does not support bulk delete.', ephemeral: true });
    }

    const deleted = await interaction.channel.bulkDelete(amount, true).catch(() => null);

    if (!deleted) {
      return interaction.reply({ content: 'Could not delete messages here.', ephemeral: true });
    }

    await interaction.reply({ content: `🧹 Deleted ${deleted.size} messages.`, ephemeral: true });
  },
};