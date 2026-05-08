const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getSettings, addWarning, resetWarningCount, createCase } = require('../../utils/store');
const { sendLog } = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn a member')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to warn')
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
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    const settings = getSettings(interaction.guild.id);
    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const evidence = interaction.options.getString('evidence') || '';
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    if (!member) {
      return interaction.reply({ content: 'User not found in this server.', ephemeral: true });
    }

    const warnings = addWarning(interaction.guild.id, user.id);

    const caseData = createCase(interaction.guild.id, {
      userId: user.id,
      moderatorId: interaction.user.id,
      action: 'warn',
      reason,
      evidence,
      channelId: interaction.channel.id,
    });

    const embed = new EmbedBuilder()
      .setTitle(`⚠️ Warning | Case #${caseData.caseId}`)
      .setColor(0xffcc00)
      .addFields(
        { name: 'User', value: `${user.tag}`, inline: true },
        { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
        { name: 'Warnings', value: `${warnings}/${settings.warnLimit}`, inline: true },
        { name: 'Reason', value: reason, inline: false },
        { name: 'Evidence', value: evidence || 'None', inline: false }
      )
      .setTimestamp();

    sendLog(interaction.guild, embed);

    await interaction.reply({
      content: `⚠️ Warned **${user.tag}** (${warnings}/${settings.warnLimit})\nReason: ${reason}\nCase: #${caseData.caseId}`,
      ephemeral: true,
    });

    if (warnings >= settings.warnLimit && member.moderatable) {
      await member.timeout(settings.warningTimeoutMinutes * 60_000, 'Reached warning limit').catch(() => {});
      resetWarningCount(interaction.guild.id, user.id);

      const timeoutCase = createCase(interaction.guild.id, {
        userId: user.id,
        moderatorId: clientUserId(interaction),
        action: 'timeout',
        reason: 'Reached warning limit',
        evidence: '',
        channelId: interaction.channel.id,
        durationMinutes: settings.warningTimeoutMinutes,
      });

      const timeoutEmbed = new EmbedBuilder()
        .setTitle(`⏳ Timeout (Warnings) | Case #${timeoutCase.caseId}`)
        .setColor(0xff0000)
        .addFields(
          { name: 'User', value: `${user.tag}`, inline: true },
          { name: 'Duration', value: `${settings.warningTimeoutMinutes} minute(s)`, inline: true },
          { name: 'Reason', value: 'Reached warning limit', inline: false }
        )
        .setTimestamp();

      sendLog(interaction.guild, timeoutEmbed);
    }
  },
};

function clientUserId(interaction) {
  return interaction.client.user?.id || 'unknown';
}