const TESTING = true
let tmp = 0;

//////////////
// Settings //
//////////////

const color = "#ff8888"

// Commands
const prefix = "!";
let adminRoles = ["Admin", "Dev"];

////////////
// Memory //
////////////

// settings file
require('dotenv').config();

// Queue's and busy booleans for all different parts
let tasksBusy  = { discord: false, twitch: false, console: false };
let program = null;
let closing = false; // Tells the program thread that closing has already been initiated so it cant be called twice at the same time
let ready = false; // Used by bots during its start to wait till its ready

const discordAllowedGuilds = ("" + process.env.DISCORDGUILDS).split(",");
const discordAllowedChannels = ("" + process.env.DISCORDCHANNELS).split(",");

const audioFormats = [".mp3", ".ogg", ".wav"];

/////////
// BOT //
/////////

function isBusy() { return tasksBusy.discord || tasksBusy.twitch || tasksBusy.console; }

async function start() {
    logInfo("Console started, initializing bots...");
    await startTwitch();
    await startDiscord();
    logInfo("Bots initialized successfully!");
    while (isBusy()) { await sleep(1); } // Keep program alive so bots can keep responding without being on the main call thread
    logInfo("Program stopped!");
}

async function stop() {
    if (!closing) {
        closing = true;
        if (tasksBusy.discord) { await stopDiscord(); }
        if (tasksBusy.twitch) { await stopTwitch(); }
    }
}

function parseDiscord(message) {
    if (message.content.startsWith(prefix)) { // Check if the message is a command
        // Grab needed info for the commands
        const params = message.content.substring(prefix.length, message.content.length).split(" ");
        const command = params[0].toLowerCase();
        const member = message.guild.members.cache.get(message.author.id); // Get member variable for admin check and for roles
        params.splice(0, 1);

        // Only execute debug command if message comes from a non-verified server or channel, so we avoid spam in the wrong channels or message in the wrong server
        if (!contains(discordAllowedGuilds, message.guildId) || !contains(discordAllowedChannels, message.channelId)) { if (!equals(command, "debug")) { return; } }

        switch (command) {
            case "debug":
                logInfo("Debug-info:");
                logData(message);
                break;
            case "help":
                sendChannelEmbedDiscord(message.channel, "Commands:", "...", color, [
                    [`${prefix}help`, "Displays the help page", false],
                    [`${prefix}verify`, "This command will give you a verify code to link with your twitch account if you are not linked yet", false]
                ]);
                break;
            case "stop":
                if (isAdminDiscord(member)) { sendChannelMessageDiscord(message.channel, "Command successful", "Stopping the bots"); stopConsole().catch(); }
                else { sendChannelEmbedDiscord(message.channel, "No permission", "You do not have the required role to use this command!", "#ff5555", []); }
                break;
            case "verify":
                if (!isVerifiedDiscord(message.author.id)) {
                    const code = createVerify(message.author.id);
                    if (code.length) { sendDMDiscord(message.author, "Verification-code", `Code: ${code}`); }
                    else { sendDMDiscord(message.author, "Couldn't verify", "Verify-code has already been requested before."); }
                } else { sendDMDiscord(message.author, "Couldn't verify", "Account is already verified!"); }
                break;
            default:
                sendChannelMessageDiscord(message.channel, "Unknown command", `Command \'${command}\' is unknown to this bot...`);
                logWarning("Discord command not found! (" + command + ")");
                break;
        }
    }
}

function parseTwitch(channel, userState, message) {
    if (message.startsWith(prefix)) { // Check if the message is a command
        // Gather the needed info for the command
        const params = message.substring(prefix.length, message.length).split(" ");
        const command = params[0].toLowerCase();
        const userId = userState['id'];
        const adminLevel = getAdminLevelTwitch(getUserTypeTwitch(userState));
        params.splice(0, 1);

        switch (command) {
            case "debug":
                logInfo("Twitch Debug-info:");
                logInfo(channel + ": " + message);
                logData(userState);
                break;
            case "help":
                sendMessageTwitch(channel, `Commands:\n${prefix}verify\n${prefix}sync`);
                break;
            case "sync":
                if (isVerifiedTwitch(userId)) {
                     if (syncTwitchDiscord(userState)) { sendMessageTwitch(channel, "Synced roles!"); }
                     else { sendMessageTwitch(channel, "There was a problem syncing the roles, could not find the user in the servers"); }
                } else { sendMessageTwitch(channel, "You can only use this command if you have linked your discord account!"); }
                break;
            case "verify":
                if (params.length > 0) {
                    if (!isVerifiedTwitch(userId)) {
                        if (verify(userId, params[0])) {
                            sendMessageTwitch(channel, `Successfully verified you, ${userState['display-name']}!`);
                        } else { sendMessageTwitch(channel, "Could not verify you, maybe it was the wrong code?"); }
                    } else { sendMessageTwitch(channel, "You have already been verified!"); }
                } else { sendMessageTwitch(channel, "Need a verification-code as argument, if oyu don't have this yet you can get it from the discord bot using the verify command there!"); }
                break;
            default:
                sendMessageTwitch(channel, `Command \'${command}\' not found!`);
                logData(params);
                break;
        }
    }
}

async function parseConsole(url) {
    const params = url.split("/");
    const command = params[2].toLowerCase();
    params.splice(0, 3);
    switch (command) {
        case "stop":
            await stopConsole();
            break;
        case "audio":
            if (equals("clear", params[0])) { audioQueue = []; logInfo("Console cleared the audio queue!") }
            else if (equals("stop", params[0])) { if (!audioPlayerDiscord.stop()) { logWarning("Console tried to stop the audio player while it was not playing anything!"); } }
            else if (equals("play", params[0]) && params.length > 1) {
                params.splice(0, 1);
                const name = concatenateList(params, " ");
                logInfo(`Console added audio to queue: '${name.substring(1, name.length)}'`);
                if (audioPlayerDiscord.state.status === AudioPlayerStatus.Idle) { playAudio(name.substring(1, name.length)).catch(_ => {}); }
                else { await playAudio(name.substring(1, name.length)); }
            } else { logWarning(`Invalid console command received! (${command + concatenateList(params, "\/", "")})`); }
            break;
        default:
            logWarning(`Unknown console command: ${command}`);
            break;
    }
}

function createVerify(discordId) {
    const code = "" + discordId + "-" + Date.now();
    const path = __dirname + "/verify/discord/" + discordId + ".txt";
    if (sumLength(readFile(path))) { return ""; } // return empty if verify-code has already been requested
    writeLineToFile(path, code);
    return code;
}

function verify(twitchId, code) {
    if (code.indexOf("-") < 1) { return false; } // Make sure it is an actual verification-code

    const discordId   = code.split("-")[0];
    const pathDiscord = __dirname + "/verify/discord/" + discordId + ".txt";
    const pathTwitch  = __dirname + "/verify/twitch/" + twitchId + ".txt";

    const read = readFile(pathDiscord);
    if (read.length === 1) { // Check if there's a line used, due to how it formats, the first line is the code, and thus it can be checked to see if there was a code requested
        if (read[0] === code) { // Verify if code is the same as noted in the file
            writeLineToFile(pathDiscord, "" + twitchId);
            writeLineToFile(pathTwitch , discordId);
            return true;
        }
    }
    return false;
}

// File structure: name: discord-id; line1: verify_code; line2: twitch-id (if verified)
function isVerifiedDiscord(discordId) { return readFile(__dirname + "/verify/discord/" + discordId + ".txt").length > 1; }

// File structure: name: twitch-id line1: discord-id (if verified)
function isVerifiedTwitch(twitchId) { return readFile(__dirname + "/verify/twitch/" + twitchId + ".txt").length > 0; }

function syncTwitchDiscord(userState) {
    const discordId = parseInt("" + readFile(__dirname + "/verify/twitch/" + userState['id'] + ".txt")[0]);
    clientDiscord.guilds.cache.forEach(guild => {
       guild.members.cache.forEach(member => {
           if (equals(discordId, "" + member.id)) {
               // TODO: use userState to give roles to the member
               if (userState.badges['broadcaster']) {  }
               if (userState.mod                  ) {  }
               if (userState.badges['vip']        ) {  }
               if (userState.subscriber           ) {  }
               if (userState.badges['premium']    ) {  }
               return true
           }
       });
    });
    return false;
}

////////////////////
// Twitch backend //
////////////////////

// Roles
const BROADCASTER = "Broadcaster";
const ADMIN       = "Admin";
const MODERATOR   = "Moderator";
const VIP         = "VIP";
const SUBSCRIBER  = "Subscriber";
const PRIME       = "Prime sub";
const VIEWER      = "Viewer";

const adminLevels = [
    VIEWER,
    PRIME,
    SUBSCRIBER,
    VIP,
    MODERATOR,
    ADMIN,
    BROADCASTER,
];

// Twitch
const tmi = require("tmi.js");
const clientTwitch = new tmi.Client({
    options: { debug: true },
    connection: { reconnect: true, secure: true },
    identity: {
        username: process.env.TWITCHNAME,
        password: "oauth:" + process.env.TWITCH
    },
    channels: ["#" + process.env.TWITCHCHANNEL]
});
clientTwitch.on('message', (channel, userState, message, self) => { if (!self) { parseTwitch(channel, userState, message); } });

// starting returns a promise, keep it here, so we can asynchronously use discord as well
let twitch = 0;

async function startTwitch() { twitch = clientTwitch.connect().catch(err => { logError(err); }).then(_ => { tasksBusy.twitch = true; }); }

async function stopTwitch() { await clientTwitch.disconnect(); tasksBusy.twitch = false; }

function sendMessageTwitch(channel, msg) { clientTwitch.say(channel, msg); }

function getUserTypeTwitch(userState) {
    if (userState.badges['broadcaster']) { return BROADCASTER; }
    if (userState.mod                  ) { return MODERATOR;   }
    if (userState.badges['vip']        ) { return VIP;         }
    if (userState.subscriber           ) { return SUBSCRIBER;  }
    if (userState.badges['premium']    ) { return PRIME;  }
    logWarning("No role determined from:");
    logData(userState.badges);
    return VIEWER;
}

function getAdminLevelTwitch(type) {
    for (let i = 0; i < adminLevels.length; ++i) { if (type === adminLevels[i]) { return i; } }
    logWarning("No admin level found for type: " + type);
    return -1;
}

/////////////////////
// Discord backend //
/////////////////////

const { Client, Events, GatewayIntentBits, EmbedBuilder, ActivityType } = require('discord.js');
const clientDiscord = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildVoiceStates] });
clientDiscord.once(Events.ClientReady, () => { ready = true; logInfo("Bot is online!"); logData(clientDiscord.options.intents); clientDiscord.user.setPresence({ activities: [{ name: "chat for " + prefix + "help", type: ActivityType.Watching }], status: "" }); });

clientDiscord.on(Events.MessageCreate, message => { if (message.author.id !== clientDiscord.user.id) { parseDiscord(message); } });

const { createAudioPlayer, NoSubscriberBehavior, joinVoiceChannel, createAudioResource, VoiceConnectionStatus, AudioPlayerStatus } = require('@discordjs/voice');

const audioPlayerDiscord = createAudioPlayer({
    behaviors: {
        noSubscriber: NoSubscriberBehavior.Pause,
    },
});

audioPlayerDiscord.on('error', error => { logError(`Audio player had an error while playing '${error.resource.metadata.title}'. Full error: (${error.message})`); });

let audioConnection = null;
let audioQueue = [];
let audioPlaying = false;

async function playAudio(path = "") {
    while (path.endsWith(" ")) { path = path.substring(0, path.length - 1); }
    if (path.length > 0) { audioQueue.push(path); }
    if (!audioPlaying && audioQueue.length > 0) {
        audioPlaying = true;
        while (audioQueue.length > 0) {
            while (audioPlayerDiscord.state.status !== AudioPlayerStatus.Idle) { await sleep(0.25) }
            const audio = createAudioResource(__dirname + "/sounds/" + audioQueue[0], { metadata: { title: audioQueue[0] } });
            audioQueue.splice(0, 1);
            audioPlayerDiscord.play(audio);
        }
        audioPlaying = false;
    }
}

function createAudioButtons() {
    let result = "";
    const files = listFilesInFolder(__dirname + "/sounds/");
    if (files.length < 1) { return "No audio files in sounds directory."; }
    for (let i = 0; i < files.length; i++) {
        for (let j = 0; j < audioFormats.length; j++) {
            if (files[i].endsWith(audioFormats[j])) { // Check if file is audio file
                result += `<button onclick=\"command(\'audio/play/${files[i].replaceAll(" ", "\/")}\')\" type=\"button\">${files[i]}</button>`;
                break;
            }
        }
    }
    return result;
}

clientDiscord.on(Events.VoiceStateUpdate, (oldState, newState) => {
    if (oldState.member.roles.cache.some(role => { return equals(role.name, process.env.STREAMER_ROLE_NAME); })) {
        if (newState.channel !== null) {
            logInfo(`User ${oldState.member.user.username} joined channel ${newState.channel.id}`);

            // Member joined channel
            if (audioConnection) {
                audioConnection.destroy();
                audioConnection = null;
            }
            const channel = newState.channel;
            audioConnection = joinVoiceChannel({
                channelId: channel.id,
                guildId: channel.guild.id,
                adapterCreator: channel.guild.voiceAdapterCreator
            });
            audioConnection.subscribe(audioPlayerDiscord);
            playAudio().catch(_ => {});
        } else {
            logInfo(`User ${oldState.member.user.username} left channel ${oldState.channel.id}`);
            // Member left channel
            if (audioConnection) {
                audioConnection.destroy();
                audioConnection = null;
            }
        }
    }
})

let discord = 0;

async function startDiscord() {
    ready = false;
    tasksBusy.discord = true;
    discord = clientDiscord.login(process.env.DISCORD).catch(err => { logError(err); tasksBusy.discord = false; ready = true; });
    while (!ready) { await sleep(0.25); }
    ready = false;
}

async function stopDiscord() { clientDiscord.destroy(); await sleep(0.25); tasksBusy.discord = false; }

function sendChannelMessageDiscord(channel, title, message) { if (channel != null) { sendChannelEmbedDiscord(channel, title, message, color, []); } else { logInfo(title + ": " + message); } }
function sendDMDiscord(user, title, message) { user.send(message); }

function sendChannelEmbedDiscord(channel, title, description, col, fields) {
    let embed = new EmbedBuilder().setTitle(title).setColor(col).setDescription(description);
    for (let i = 0; i < fields.length; i++) { embed.addFields({ name: fields[i][0], value: fields[i][1], inline: fields[i][2] }); }
    channel.send({ embeds: [embed] });
}

function isAdminDiscord(member) { return member.roles.cache.some((role) => { return contains(adminRoles, role.name); }); }

///////////////////
// Control panel //
///////////////////

// Console
const http    = require('http');
const express = require('express');
const app     = express();

// Setup express for usage
app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/public'));

// Set command interface through page get
app.get("/cmd/*", (req, res) => {
    if (tasksBusy.console) { parseConsole(req.url).catch((err) => { logError(err); }).then(_ => { res.redirect("/"); }); }
});

// Set main page get implementation
app.get("/"     , (req, res) => { res.render("index", { status: (program === null ? "<button onclick=\"command('start')\" type=\"button\">Start</button>" : ""), audioButtons: createAudioButtons(), audioQueued: concatenateList(audioQueue, "<li>", "<\/li>") }); });

// Start the server
const server = http.createServer(app);
server.listen(parseInt(process.env.CONSOLEPORT, 10), () => { tasksBusy.console = true; program = start(); });

async function stopConsole() { server.close((err) => { logError(err); }); logInfo("Shutting down..."); if (program !== null) { tasksBusy.console = false; await stop(); await program; } process.exit(); }

/////////////////
// BOT backend //
/////////////////

function equals(first, second) {
    switch (first) {
        case second: return true;
        default: return false;
    }
}

function contains(array, value) { for (let i = 0; i < array.length; i++) { if (array[i] == value) { return true; } } return false; }

function logError(err)   { console.error("ERROR:\t", err ); }
function logWarning(err) { console.error("Warning:", err ); }
function logInfo(info)   { console.log("Info:\t"   , info); }
function logData(data)   { console.log(              data); }
async function sleep(seconds) { return new Promise((resolve) => setTimeout(resolve, seconds * 1000)); }

const fs = require('fs');

function readFile(path) {
    try {
        const data = fs.readFileSync(path, 'utf8').split("\n");
        let lines = [];
        for (let i = 0; i < data.length; i++) {
            let line = data[i];
            if (line.endsWith("\r")) { line = line.substring(0, line.length - 1); } // Make sure lines don't end with the first half of the windows end line characters
            while (line.endsWith(" ")) { line = line.substring(0, line.length - 1); } // Make sure lines don't end with a space character
            if (line.length) { lines.push(line); }
        }
        return lines;
    } catch (err) { logError(err); return []; }
}

function sumLength(array) {
    let total = 0;
    for (let i = 0; i < array.length; i++) { total += array[i].length; }
    return total;
}

function writeLineToFile(path, line) { fs.appendFile(path, line + "\n", err => { logError(err); }); }

function concatenateList(list, prefix = "", suffix = "") {
    let result = "";
    for (let i = 0; i < list.length; i++) { result += prefix + list[i] + suffix; }
    return result;
}

function listFilesInFolder(path) {
    let result = [];
    if (!fs.statSync(path).isDirectory()) { return result; } // Return early if file is not a directory
    const files = fs.readdirSync(path);
    for (let i = 0; i < files.length; i++) { result.push("" + files[i]); }
    return result;
}