const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { addNote } = require('../../utils/store');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('note')
    .setDescription('Add a private staff note')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to note')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('text')
        .setDescription('Note text')
        .setRequired(true)
        .setMaxLength(500)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const text = interaction.options.getString('text');
    const note = addNote(interaction.guild.id, user.id, {
      authorId: interaction.user.id,
      text,
      timestamp: Date.now(),
    });

    await interaction.reply({
      content: `📝 Note #${note.id} added for ${user.tag}.`,
      ephemeral: true,
    });
  },
};