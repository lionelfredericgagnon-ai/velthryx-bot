const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Delete multiple messages')
    .addIntegerOption(option =>
      option.setName('amount')
        .setDescription('Number of messages to delete (1-100)')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction) {
    const amount = interaction.options.getInteger('amount');

    if (amount < 1 || amount > 100) {
      return interaction.reply({
        content: 'You must choose a number between 1 and 100.',
        ephemeral: true,
      });
    }

    const channel = interaction.channel;

    const deleted = await channel.bulkDelete(amount, true);

    await interaction.reply({
      content: `🧹 Deleted ${deleted.size} messages.`,
      ephemeral: true,
    });
  },
};