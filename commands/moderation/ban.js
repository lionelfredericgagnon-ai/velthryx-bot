const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { createCase } = require('../../utils/store');
const { sendLog } = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a member')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to ban')
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
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const evidence = interaction.options.getString('evidence') || '';
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    if (!member) {
      return interaction.reply({ content: 'User not found in this server.', ephemeral: true });
    }
    if (!member.bannable) {
      return interaction.reply({ content: 'I cannot ban this user (role hierarchy or permission issue).', ephemeral: true });
    }

    await member.ban({ reason });

    const caseData = createCase(interaction.guild.id, {
      userId: user.id,
      moderatorId: interaction.user.id,
      action: 'ban',
      reason,
      evidence,
      channelId: interaction.channel.id,
    });

    const embed = new EmbedBuilder()
      .setTitle(`🔨 Ban | Case #${caseData.caseId}`)
      .setColor(0xc0392b)
      .addFields(
        { name: 'User', value: `${user.tag}`, inline: true },
        { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
        { name: 'Reason', value: reason, inline: false },
        { name: 'Evidence', value: evidence || 'None', inline: false }
      )
      .setTimestamp();

    sendLog(interaction.guild, embed);

    await interaction.reply({
      content: `🔨 Banned **${user.tag}**\nReason: ${reason}\nCase: #${caseData.caseId}`,
      ephemeral: true,
    });
  },
};