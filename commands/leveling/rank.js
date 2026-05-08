const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUserRecord, buildProgressBar } = require('../../utils/store');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription('Show your rank')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to view')
        .setRequired(false)
    ),

  async execute(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    const record = getUserRecord(interaction.guild.id, user.id);

    const currentXp = record.xp % 100;
    const bar = buildProgressBar(currentXp, 100, 12);

    const embed = new EmbedBuilder()
      .setTitle(`${user.username}'s Rank`)
      .setColor(0x00b0f4)
      .setThumbnail(user.displayAvatarURL({ size: 256 }))
      .addFields(
        { name: 'Level', value: String(record.level), inline: true },
        { name: 'XP', value: `${currentXp}/100`, inline: true },
        { name: 'Messages', value: String(record.messages), inline: true },
        { name: 'Progress', value: `${bar}\n${currentXp}%`, inline: false }
      )
      .setTimestamp();

    if (member?.joinedAt) {
      embed.addFields({ name: 'Joined Server', value: `<t:${Math.floor(member.joinedAt.getTime() / 1000)}:R>`, inline: false });
    }

    await interaction.reply({ embeds: [embed] });
  },
};