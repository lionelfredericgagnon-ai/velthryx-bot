const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getSettings, getWarningCount, setWarningCount } = require('../../utils/store');
const { sendLog } = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn a user')
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
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    const settings = getSettings(interaction.guild.id);
    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    if (!member) {
      return interaction.reply({ content: 'User not found in this server.', ephemeral: true });
    }

    const current = getWarningCount(interaction.guild.id, user.id);
    const next = current + 1;

    setWarningCount(interaction.guild.id, user.id, next);

    await interaction.reply({ content: `⚠️ Warned **${user.tag}** (${next}/${settings.warnLimit})\nReason: ${reason}`, ephemeral: true });

    const warnLog = new EmbedBuilder()
      .setTitle('⚠️ Warning Issued')
      .setColor(0xffcc00)
      .addFields(
        { name: 'User', value: `${user.tag}`, inline: true },
        { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
        { name: 'Warnings', value: `${next}/${settings.warnLimit}`, inline: true },
        { name: 'Reason', value: reason, inline: false }
      )
      .setTimestamp();

    sendLog(interaction.guild, warnLog);

    if (next >= settings.warnLimit && member.moderatable) {
      await member.timeout(settings.warningTimeoutMinutes * 60_000, 'Too many warnings').catch(() => {});
      setWarningCount(interaction.guild.id, user.id, 0);

      const timeoutLog = new EmbedBuilder()
        .setTitle('⏳ Timeout (Warnings)')
        .setColor(0xff0000)
        .addFields(
          { name: 'User', value: `${user.tag}`, inline: true },
          { name: 'Moderator', value: 'Auto-mod', inline: true },
          { name: 'Reason', value: 'Reached warning limit', inline: false }
        )
        .setTimestamp();

      sendLog(interaction.guild, timeoutLog);
    }
  },
};