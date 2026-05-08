const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
} = require('discord.js');

const { getSettings, setSettings, toggleSetting } = require('../../utils/store');
const { buildSettingsEmbed } = require('../../utils/panel');

const themeChoices = [
  { name: 'default', value: 'default' },
  { name: 'cyberpunk', value: 'cyberpunk' },
  { name: 'neon', value: 'neon' },
  { name: 'minimal', value: 'minimal' },
  { name: 'anime', value: 'anime' },
  { name: 'dark', value: 'dark' },
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('config')
    .setDescription('View or change server settings')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub => sub.setName('show').setDescription('Show current settings'))
    .addSubcommand(sub =>
      sub.setName('setlogchannel')
        .setDescription('Set the log channel')
        .addChannelOption(option =>
          option.setName('channel')
            .setDescription('Log channel')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('setwelcomechannel')
        .setDescription('Set the welcome channel')
        .addChannelOption(option =>
          option.setName('channel')
            .setDescription('Welcome channel')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('setleavechannel')
        .setDescription('Set the leave channel')
        .addChannelOption(option =>
          option.setName('channel')
            .setDescription('Leave channel')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('setlevelchannel')
        .setDescription('Set the level-up channel')
        .addChannelOption(option =>
          option.setName('channel')
            .setDescription('Level channel')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('setappealchannel')
        .setDescription('Set the appeal channel')
        .addChannelOption(option =>
          option.setName('channel')
            .setDescription('Appeal channel')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('setwelcomemessage')
        .setDescription('Set welcome message text')
        .addStringOption(option =>
          option.setName('text')
            .setDescription('Use {user} and {server}')
            .setRequired(true)
            .setMaxLength(250)
        )
    )
    .addSubcommand(sub =>
      sub.setName('setleavemessage')
        .setDescription('Set leave message text')
        .addStringOption(option =>
          option.setName('text')
            .setDescription('Use {user} and {server}')
            .setRequired(true)
            .setMaxLength(250)
        )
    )
    .addSubcommand(sub =>
      sub.setName('setlevelupmessage')
        .setDescription('Set level-up message text')
        .addStringOption(option =>
          option.setName('text')
            .setDescription('Use {user}, {server}, {level}')
            .setRequired(true)
            .setMaxLength(250)
        )
    )
    .addSubcommand(sub =>
      sub.setName('setbannerurl')
        .setDescription('Set a banner image URL')
        .addStringOption(option =>
          option.setName('url')
            .setDescription('Direct image URL')
            .setRequired(true)
            .setMaxLength(500)
        )
    )
    .addSubcommand(sub =>
      sub.setName('settheme')
        .setDescription('Set the theme')
        .addStringOption(option =>
          option.setName('theme')
            .setDescription('Theme preset')
            .setRequired(true)
            .addChoices(...themeChoices)
        )
    )
    .addSubcommand(sub =>
      sub.setName('setaccentcolor')
        .setDescription('Set the accent color')
        .addStringOption(option =>
          option.setName('color')
            .setDescription('Hex color like #5865F2')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('setxppermessage')
        .setDescription('Set XP gained per message')
        .addIntegerOption(option =>
          option.setName('amount')
            .setDescription('XP amount')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(100)
        )
    )
    .addSubcommand(sub =>
      sub.setName('setxpcooldown')
        .setDescription('Set XP cooldown in seconds')
        .addIntegerOption(option =>
          option.setName('seconds')
            .setDescription('Cooldown seconds')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(3600)
        )
    )
    .addSubcommand(sub =>
      sub.setName('setwarnlimit')
        .setDescription('Set warning limit')
        .addIntegerOption(option =>
          option.setName('limit')
            .setDescription('Warning limit')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(20)
        )
    )
    .addSubcommand(sub =>
      sub.setName('setwarningtimeout')
        .setDescription('Set warning timeout in minutes')
        .addIntegerOption(option =>
          option.setName('minutes')
            .setDescription('Timeout minutes')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(10080)
        )
    )
    .addSubcommand(sub =>
      sub.setName('setspamthreshold')
        .setDescription('Set spam threshold')
        .addIntegerOption(option =>
          option.setName('amount')
            .setDescription('Spam messages')
            .setRequired(true)
            .setMinValue(2)
            .setMaxValue(20)
        )
    )
    .addSubcommand(sub =>
      sub.setName('setspamtimeout')
        .setDescription('Set spam timeout in minutes')
        .addIntegerOption(option =>
          option.setName('minutes')
            .setDescription('Timeout minutes')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(1440)
        )
    )
    .addSubcommand(sub =>
      sub.setName('toggle')
        .setDescription('Toggle a system')
        .addStringOption(option =>
          option.setName('setting')
            .setDescription('Setting to toggle')
            .setRequired(true)
            .addChoices(
              { name: 'automod', value: 'automodEnabled' },
              { name: 'leveling', value: 'levelingEnabled' },
              { name: 'logging', value: 'loggingEnabled' },
              { name: 'welcome', value: 'welcomeEnabled' },
              { name: 'leave', value: 'leaveEnabled' },
              { name: 'randomxp', value: 'randomXp' },
              { name: 'antiinvite', value: 'antiInviteEnabled' },
              { name: 'antilinks', value: 'antiLinksEnabled' },
              { name: 'antiscam', value: 'antiScamEnabled' },
              { name: 'antimention', value: 'antiMentionSpamEnabled' },
              { name: 'antieemoji', value: 'antiEmojiSpamEnabled' }
            )
        )
    ),

  async execute(interaction) {
    const ownerId = process.env.OWNER_ID;
    if (ownerId && interaction.user.id !== ownerId) {
      return interaction.reply({
        content: 'Only the owner can change settings.',
        ephemeral: true,
      });
    }

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

    if (sub === 'setappealchannel') {
      const channel = interaction.options.getChannel('channel');
      setSettings(interaction.guild.id, { appealChannelId: channel.id });
    }

    if (sub === 'setwelcomemessage') {
      setSettings(interaction.guild.id, {
        welcomeMessage: interaction.options.getString('text'),
      });
    }

    if (sub === 'setleavemessage') {
      setSettings(interaction.guild.id, {
        leaveMessage: interaction.options.getString('text'),
      });
    }

    if (sub === 'setlevelupmessage') {
      setSettings(interaction.guild.id, {
        levelUpMessage: interaction.options.getString('text'),
      });
    }

    if (sub === 'setbannerurl') {
      setSettings(interaction.guild.id, {
        bannerUrl: interaction.options.getString('url'),
      });
    }

    if (sub === 'settheme') {
      setSettings(interaction.guild.id, {
        theme: interaction.options.getString('theme'),
      });
    }

    if (sub === 'setaccentcolor') {
      setSettings(interaction.guild.id, {
        accentColor: interaction.options.getString('color'),
      });
    }

    if (sub === 'setxppermessage') {
      setSettings(interaction.guild.id, {
        xpPerMessage: interaction.options.getInteger('amount'),
      });
    }

    if (sub === 'setxpcooldown') {
      setSettings(interaction.guild.id, {
        xpCooldownMs: interaction.options.getInteger('seconds') * 1000,
      });
    }

    if (sub === 'setwarnlimit') {
      setSettings(interaction.guild.id, {
        warnLimit: interaction.options.getInteger('limit'),
      });
    }

    if (sub === 'setwarningtimeout') {
      setSettings(interaction.guild.id, {
        warningTimeoutMinutes: interaction.options.getInteger('minutes'),
      });
    }

    if (sub === 'setspamthreshold') {
      setSettings(interaction.guild.id, {
        spamThreshold: interaction.options.getInteger('amount'),
      });
    }

    if (sub === 'setspamtimeout') {
      setSettings(interaction.guild.id, {
        spamTimeoutMinutes: interaction.options.getInteger('minutes'),
      });
    }

    if (sub === 'toggle') {
      const key = interaction.options.getString('setting');
      toggleSetting(interaction.guild.id, key);
    }

    const updated = getSettings(interaction.guild.id);

    return interaction.reply({
      content: 'Settings updated.',
      embeds: [buildSettingsEmbed(interaction.guild, updated)],
      ephemeral: true,
    });
  },
};