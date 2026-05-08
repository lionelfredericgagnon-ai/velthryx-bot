const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { createCase } = require('../../utils/store');
const { sendLog } = require('../../utils/logger');

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
        .setMinValue(1)
        .setMaxValue(40320)
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
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const minutes = interaction.options.getInteger('minutes');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const evidence = interaction.options.getString('evidence') || '';
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    if (!member) {
      return interaction.reply({ content: 'User not found in this server.', ephemeral: true });
    }
    if (!member.moderatable) {
      return interaction.reply({ content: 'I cannot timeout this user (role hierarchy or permission issue).', ephemeral: true });
    }

    await member.timeout(minutes * 60_000, reason);

    const caseData = createCase(interaction.guild.id, {
      userId: user.id,
      moderatorId: interaction.user.id,
      action: 'timeout',
      reason,
      evidence,
      channelId: interaction.channel.id,
      durationMinutes: minutes,
    });

    const embed = new EmbedBuilder()
      .setTitle(`⏳ Timeout | Case #${caseData.caseId}`)
      .setColor(0x9b59b6)
      .addFields(
        { name: 'User', value: `${user.tag}`, inline: true },
        { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
        { name: 'Duration', value: `${minutes} minute(s)`, inline: true },
        { name: 'Reason', value: reason, inline: false },
        { name: 'Evidence', value: evidence || 'None', inline: false }
      )
      .setTimestamp();

    sendLog(interaction.guild, embed);

    await interaction.reply({
      content: `⏳ Timed out **${user.tag}** for ${minutes} minute(s)\nReason: ${reason}\nCase: #${caseData.caseId}`,
      ephemeral: true,
    });
  },
};