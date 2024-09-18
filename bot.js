// Bot file
const commandProperties = ["data", "executeDiscord"];
const token = "";

async function start() {
    registerCommands();
    client.login(token).catch(err => logError(err));
}

//////////////
// Resolver //
//////////////

let lastRequestId = -1;
const requests = [];

function createRequest() {
    lastRequestId += 1;
    const id = lastRequestId;
    requests.push({ id: id, resolved: false, data: 0 });
    return id;
}

async function getSolvedRequest(id){
    while (true) {
        await sleep(0.5);
        for (let i = 0; i < requests.length; i++) {
            if (requests[i].id === id) {
                if (requests[i].resolved) {
                    const returnData = requests[i].data;
                    requests.splice(i, 1);
                    return returnData;
                }
                break;
            }
        }
    }
}

function resolveRequest(id, data) {
    for (let i = 0; i < requests.length; i++) {
        if (requests[i].id === id) {
            requests[i].data = data;
            requests[i].resolved = true;
            return;
        }
    }
}

/////////////////
// Discord bot //
/////////////////

const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, Events, GatewayIntentBits, EmbedBuilder, ActivityType } = require('discord.js');

// client
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);
client.commands = new Collection();

client.once(Events.ClientReady, readyClient => { logInfo(`Discord bot is ready! Logged in as ${readyClient.user.tag}`); });

client.on(Events.InteractionCreate, async interaction => {
    // TODO: add message reply option?
    if (!interaction.isChatInputCommand()) return;
    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
        logWarning(`No command matching ${interaction.commandName} was found.`);
        return;
    }

    try { await command.executeDiscord(interaction); }
    catch (error) {
        logError(error);
        if (interaction.replied || interaction.deferred) { await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true }); }
        else { await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true }); }
    }
});

// Make logging functions available for all the commands in other folders
client.utils = {};
client.utils.color = "#FFFFFF";
client.utils.color_error = "#FF3333";
client.utils.createField = (name = "no title specified", message = "No message specified", inline = false) => { return { name: name, message: message, inline: inline}; };
client.utils.buildEmbed = (title, message, fields = [], color = client.utils.color) => {
    if (!title || !message) { logError("Tried sending a discord message without specifying the required arguments!"); return; }
    const embed = new EmbedBuilder().setTitle(title).setColor(color).setDescription(message);

    // Fields
    for (const field in fields) { embed.addFields({ name: fields[i].name, value: fields[i][1], inline: fields[i][2] }) }

    return embed;
};
client.utils.loggers = {
    err : (err) => { logError   (err); },
    warn: (msg) => { logWarning (msg); },
    log : (msg) => { logInfo    (msg); },
    data: (dat) => { logData    (dat); },
};
client.utils.resolver = {
    createRequest: createRequest,
    resolveRequest: resolveRequest,
    getSolvedRequest: getSolvedRequest
};

function registerCommands() {
    client.commands.clear();

    for (const folder of commandFolders) {
        const commandsPath = path.join(foldersPath, folder);
        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
        for (const file of commandFiles) {
            const filePath = path.join(commandsPath, file);
            const command = require(filePath);

            // Check if command has all the needed properties
            let failed = false;
            for (let i = 0; i < commandProperties.length; i++) {
                if (!(commandProperties[i] in command)) {
                    logWarning(`${filePath} is missing "${commandProperties[i]}" property.`);
                    failed = true;
                }
            }
            if (failed) { continue; } // Skip

            // Set a new item in the Collection with the key as the command name and the value as the exported module
            client.commands.set(command.data.name, command);
        }
    }
}

///////////
// Utils //
///////////

function getTimeString(date = new Date()) { return `${date.getDate()}-${date.getMonth()}-${date.getFullYear()} ${date.toLocaleTimeString()}`.toString(); }

// Log functions
function logError(err)   { console.error(`[${getTimeString()}] ERROR:\t`, err ); }
function logWarning(err) { console.error(`[${getTimeString()}] Warning:`, err ); }
function logInfo(info)   { console.log  (`[${getTimeString()}] Info:\t` , info); }
function logData(data)   { console.log  (data); }

/////////////
// Run bot //
/////////////

start().catch(err => logError(err));