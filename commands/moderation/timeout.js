const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Timeout a member')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to timeout')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option.setName('minutes')
        .setDescription('Duration in minutes')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for timeout')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const minutes = interaction.options.getInteger('minutes');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    if (!member) {
      return interaction.reply({
        content: 'User not found in this server.',
        ephemeral: true,
      });
    }

    if (!member.moderatable) {
      return interaction.reply({
        content: 'I cannot timeout this user (role hierarchy issue).',
        ephemeral: true,
      });
    }

    const ms = minutes * 60 * 1000;

    await member.timeout(ms, reason);

    await interaction.reply({
      content: `⏳ Timed out **${user.tag}** for ${minutes} minute(s)\nReason: ${reason}`,
    });
  },
};