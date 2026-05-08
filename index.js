require('dotenv').config();

const fs = require('node:fs');
const path = require('node:path');

const {
  Client,
  Collection,
  Events,
  GatewayIntentBits,
} = require('discord.js');

/* ---------------- CLIENT ---------------- */

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.commands = new Collection();

/* ---------------- COMMAND HANDLER ---------------- */

const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
  const commandsPath = path.join(foldersPath, folder);

  const commandFiles = fs
    .readdirSync(commandsPath)
    .filter(file => file.endsWith('.js'));

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);

    if (command?.data && command?.execute) {
      client.commands.set(command.data.name, command);
    } else {
      console.log(`[WARNING] Missing data or execute in ${filePath}`);
    }
  }
}

/* ---------------- READY ---------------- */

client.once(Events.ClientReady, (readyClient) => {
  console.log(`✅ Logged in as ${readyClient.user.tag}`);
});

/* ---------------- SLASH COMMANDS ---------------- */

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);

    const reply = {
      content: 'There was an error executing this command.',
      ephemeral: true,
    };

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(reply);
    } else {
      await interaction.reply(reply);
    }
  }
});

const userMessageMap = new Map();
client.on(Events.MessageCreate, async (message) => {
  try {
    if (!message.guild || message.author.bot) return;

    const userId = message.author.id;
    const now = Date.now();

    /* ---------------- SPAM TRACKING ---------------- */

    const userData = userMessageMap.get(userId) || {
      count: 0,
      lastMessage: '',
      lastTime: 0,
    };

    // reset if too old (5 seconds window)
    if (now - userData.lastTime > 5000) {
      userData.count = 0;
    }

    userData.lastTime = now;

    // repeated message spam
    if (message.content === userData.lastMessage) {
      userData.count += 1;
    } else {
      userData.count = 1;
    }

    userData.lastMessage = message.content;

    userMessageMap.set(userId, userData);

    /* ---------------- AUTO ACTION ---------------- */

    if (userData.count >= 5) {
      const member = await message.guild.members.fetch(userId).catch(() => null);
      if (!member) return;

      if (member.moderatable) {
        await member.timeout(60_000, 'Spam detected (auto-mod)');
        message.channel.send(`⏳ ${message.author} was timed out for spam.`);
      }

      userMessageMap.delete(userId);
    }

  } catch (err) {
    console.error('AutoMod error:', err);
  }
});

/* ---------------- MESSAGE DELETE (DISABLED FOR NOW) ---------------- */
/*
client.on(Events.MessageDelete, async (message) => {
  console.log("DELETE EVENT FIRED");
});
*/

/* ---------------- LOGIN ---------------- */

client.login(process.env.TOKEN);