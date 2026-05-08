const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { createCase } = require('../../utils/store');
const { sendLog } = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a member')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to kick')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('evidence')
        .setDescription('Evidence link or note')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const evidence = interaction.options.getString('evidence') || '';
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    if (!member) {
      return interaction.reply({ content: 'User not found in this server.', ephemeral: true });
    }
    if (!member.kickable) {
      return interaction.reply({ content: 'I cannot kick this user (role hierarchy or permission issue).', ephemeral: true });
    }

    await member.kick(reason);

    const caseData = createCase(interaction.guild.id, {
      userId: user.id,
      moderatorId: interaction.user.id,
      action: 'kick',
      reason,
      evidence,
      channelId: interaction.channel.id,
    });

    const embed = new EmbedBuilder()
      .setTitle(`👢 Kick | Case #${caseData.caseId}`)
      .setColor(0xe67e22)
      .addFields(
        { name: 'User', value: `${user.tag}`, inline: true },
        { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
        { name: 'Reason', value: reason, inline: false },
        { name: 'Evidence', value: evidence || 'None', inline: false }
      )
      .setTimestamp();

    sendLog(interaction.guild, embed);

    await interaction.reply({
      content: `👢 Kicked **${user.tag}**\nReason: ${reason}\nCase: #${caseData.caseId}`,
      ephemeral: true,
    });
  },
};