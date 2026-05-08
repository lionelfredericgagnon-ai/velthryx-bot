const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Delete a number of messages')
    .addIntegerOption(option =>
      option.setName('amount')
        .setDescription('1-100 messages')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction) {
    if (!interaction.channel?.bulkDelete) {
      return interaction.reply({
        content: 'This channel does not support bulk delete.',
        ephemeral: true,
      });
    }

    const amount = interaction.options.getInteger('amount');
    const deleted = await interaction.channel.bulkDelete(amount, true).catch(() => null);

    if (!deleted) {
      return interaction.reply({
        content: 'I could not delete those messages.',
        ephemeral: true,
      });
    }

    await interaction.reply({
      content: `🧹 Deleted ${deleted.size} messages.`,
      ephemeral: true,
    });
  },
};