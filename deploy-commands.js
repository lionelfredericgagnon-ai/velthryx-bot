require('dotenv').config();

const fs = require('node:fs');
const path = require('node:path');
const { REST, Routes } = require('discord.js');

function loadCommands(dir, commands = []) {
  if (!fs.existsSync(dir)) return commands;

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      loadCommands(fullPath, commands);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      const command = require(fullPath);
      if (command?.data?.toJSON) {
        commands.push(command.data.toJSON());
      }
    }
  }

  return commands;
}

const commands = loadCommands(path.join(__dirname, 'commands'));
const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log(`Refreshing ${commands.length} application commands...`);

    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );

    console.log('Slash commands registered successfully.');
  } catch (error) {
    console.error(error);
  }
})();