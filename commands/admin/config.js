const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
} = require('discord.js');

const { getSettings, setSettings } = require('../../utils/store');
const { buildSettingsEmbed } = require('../../utils/panel');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('config')
    .setDescription('View or change server settings')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub =>
      sub.setName('show').setDescription('Show current settings')
    )
    .addSubcommand(sub =>
      sub
        .setName('setlogchannel')
        .setDescription('Set the log channel')
        .addChannelOption(option =>
          option
            .setName('channel')
            .setDescription('Log channel')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('setwelcomechannel')
        .setDescription('Set the welcome channel')
        .addChannelOption(option =>
          option
            .setName('channel')
            .setDescription('Welcome channel')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('setleavechannel')
        .setDescription('Set the leave channel')
        .addChannelOption(option =>
          option
            .setName('channel')
            .setDescription('Leave channel')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('setlevelchannel')
        .setDescription('Set the level-up channel')
        .addChannelOption(option =>
          option
            .setName('channel')
            .setDescription('Level channel')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('setxppermessage')
        .setDescription('Set XP gained per message')
        .addIntegerOption(option =>
          option
            .setName('amount')
            .setDescription('XP amount')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(100)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('setxpcooldown')
        .setDescription('Set XP cooldown in seconds')
        .addIntegerOption(option =>
          option
            .setName('seconds')
            .setDescription('Cooldown seconds')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(3600)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('setwarnlimit')
        .setDescription('Set warning limit')
        .addIntegerOption(option =>
          option
            .setName('limit')
            .setDescription('Warning limit')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(20)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('setspamthreshold')
        .setDescription('Set spam message threshold')
        .addIntegerOption(option =>
          option
            .setName('amount')
            .setDescription('Spam threshold')
            .setRequired(true)
            .setMinValue(2)
            .setMaxValue(20)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('setspamtimeout')
        .setDescription('Set spam timeout in minutes')
        .addIntegerOption(option =>
          option
            .setName('minutes')
            .setDescription('Timeout minutes')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(1440)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('setwarningtimeout')
        .setDescription('Set warning timeout in minutes')
        .addIntegerOption(option =>
          option
            .setName('minutes')
            .setDescription('Timeout minutes')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(10080)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('setwelcomemessage')
        .setDescription('Set welcome message text')
        .addStringOption(option =>
          option
            .setName('text')
            .setDescription('Use {user} and {server}')
            .setRequired(true)
            .setMaxLength(200)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('setleavemessage')
        .setDescription('Set leave message text')
        .addStringOption(option =>
          option
            .setName('text')
            .setDescription('Use {user} and {server}')
            .setRequired(true)
            .setMaxLength(200)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('setlevelupmessage')
        .setDescription('Set level-up message text')
        .addStringOption(option =>
          option
            .setName('text')
            .setDescription('Use {user}, {server}, {level}')
            .setRequired(true)
            .setMaxLength(200)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('setrandomxp')
        .setDescription('Enable or disable random XP')
        .addBooleanOption(option =>
          option
            .setName('enabled')
            .setDescription('True or false')
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const settings = getSettings(interaction.guild.id);

    if (sub === 'show') {
      return interaction.reply({
        embeds: [buildSettingsEmbed(interaction.guild, settings)],
        ephemeral: true,
      });
    }

    if (sub === 'setlogchannel') {
      const channel = interaction.options.getChannel('channel');
      setSettings(interaction.guild.id, { logChannelId: channel.id });
    }

    if (sub === 'setwelcomechannel') {
      const channel = interaction.options.getChannel('channel');
      setSettings(interaction.guild.id, { welcomeChannelId: channel.id });
    }

    if (sub === 'setleavechannel') {
      const channel = interaction.options.getChannel('channel');
      setSettings(interaction.guild.id, { leaveChannelId: channel.id });
    }

    if (sub === 'setlevelchannel') {
      const channel = interaction.options.getChannel('channel');
      setSettings(interaction.guild.id, { levelChannelId: channel.id });
    }

    if (sub === 'setxppermessage') {
      const amount = interaction.options.getInteger('amount');
      setSettings(interaction.guild.id, { xpPerMessage: amount });
    }

    if (sub === 'setxpcooldown') {
      const seconds = interaction.options.getInteger('seconds');
      setSettings(interaction.guild.id, { xpCooldownMs: seconds * 1000 });
    }

    if (sub === 'setwarnlimit') {
      const limit = interaction.options.getInteger('limit');
      setSettings(interaction.guild.id, { warnLimit: limit });
    }

    if (sub === 'setspamthreshold') {
      const amount = interaction.options.getInteger('amount');
      setSettings(interaction.guild.id, { spamThreshold: amount });
    }

    if (sub === 'setspamtimeout') {
      const minutes = interaction.options.getInteger('minutes');
      setSettings(interaction.guild.id, { spamTimeoutMinutes: minutes });
    }

    if (sub === 'setwarningtimeout') {
      const minutes = interaction.options.getInteger('minutes');
      setSettings(interaction.guild.id, { warningTimeoutMinutes: minutes });
    }

    if (sub === 'setwelcomemessage') {
      const text = interaction.options.getString('text');
      setSettings(interaction.guild.id, { welcomeMessage: text });
    }

    if (sub === 'setleavemessage') {
      const text = interaction.options.getString('text');
      setSettings(interaction.guild.id, { leaveMessage: text });
    }

    if (sub === 'setlevelupmessage') {
      const text = interaction.options.getString('text');
      setSettings(interaction.guild.id, { levelUpMessage: text });
    }

    if (sub === 'setrandomxp') {
      const enabled = interaction.options.getBoolean('enabled');
      setSettings(interaction.guild.id, { randomXp: enabled });
    }

    const updated = getSettings(interaction.guild.id);

    return interaction.reply({
      content: 'Settings updated.',
      embeds: [buildSettingsEmbed(interaction.guild, updated)],
      ephemeral: true,
    });
  },
};