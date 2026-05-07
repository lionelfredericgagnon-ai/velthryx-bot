require('dotenv').config();

const fs = require('node:fs');
const path = require('node:path');

const {
  Client,
  Collection,
  Events,
  GatewayIntentBits,
} = require('discord.js');

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

/* ---------------- READY EVENT ---------------- */

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

/* ---------------- MESSAGE DELETE LOGGING ---------------- */

client.on(Events.MessageDelete, async (message) => {
  try {
    if (!message.guild) return;

    const channel = await message.guild.channels.fetch(process.env.LOG_CHANNEL_ID);
    if (!channel || !channel.isTextBased()) return;

    const author = message.author?.tag || "Unknown user";

    await channel.send({
      content: `🗑️ **Message Deleted**
👤 Author: ${author}
💬 Content: ${message.content || "No content (cached or embed)"}`,
    });

  } catch (err) {
    console.error("Delete log error:", err);
  }
});

// ---------------- MESSAGE DELETE TEST ----------------

client.on(Events.MessageDelete, async (message) => {
  console.log("DELETE EVENT FIRED");
});

/* ---------------- LOGIN ---------------- */

client.login(process.env.TOKEN);