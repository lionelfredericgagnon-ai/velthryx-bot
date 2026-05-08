const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { createCase } = require('../../utils/store');
const { sendLog } = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Unban a user by ID')
    .addStringOption(option =>
      option.setName('user_id')
        .setDescription('Banned user ID')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute(interaction) {
    const userId = interaction.options.getString('user_id');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    await interaction.guild.bans.remove(userId, reason).catch(() => null);

    const caseData = createCase(interaction.guild.id, {
      userId,
      moderatorId: interaction.user.id,
      action: 'unban',
      reason,
      evidence: '',
      channelId: interaction.channel.id,
    });

    const embed = new EmbedBuilder()
      .setTitle(`♻️ Unban | Case #${caseData.caseId}`)
      .setColor(0x2ecc71)
      .addFields(
        { name: 'User ID', value: userId, inline: true },
        { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
        { name: 'Reason', value: reason, inline: false }
      )
      .setTimestamp();

    sendLog(interaction.guild, embed);

    await interaction.reply({
      content: `♻️ Unbanned **${userId}**\nReason: ${reason}\nCase: #${caseData.caseId}`,
      ephemeral: true,
    });
  },
};