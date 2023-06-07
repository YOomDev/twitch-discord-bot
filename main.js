const TESTING = true

//////////////
// Settings //
//////////////

require('dotenv').config()

// Commands
const prefix = "!";

// Roles
const BROADCASTER = "Broadcaster";
const ADMIN       = "Admin";
const MODERATOR   = "Moderator";
const VIP         = "VIP";
const SUBSCRIBER  = "Subscriber";
const VIEWER      = "Viewer";

const adminLevels = [
    VIEWER,
    SUBSCRIBER,
    VIP,
    MODERATOR,
    ADMIN,
    BROADCASTER,
];

// Interfaces
const TWITCH = "Twitch";
const DISCORD = "Discord"

const IDs = {
    TWITCH,
    DISCORD,
};

const TWITCH_ID = getInterfaceID(TWITCH);
const DISCORD_ID = getInterfaceID(DISCORD);

////////////
// Memory //
////////////

// Queue's and busy booleans for all different parts
let tasksBusy  = { discord: false, twitch: false, console: false };
let program = null;
let closing = false;

/////////
// BOT //
/////////

function isBusy() { return tasksBusy.discord || tasksBusy.twitch || tasksBusy.console; }

async function start() {
    logInfo("Console started, initializing bots...");
    // await startTwitch();
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

}

function parseTwitch(channel, userState, message) {

}

async function parseConsole(url) {
    const params = url.split("/");
    const command = params[2].toLowerCase();
    params.splice(0, 3);
    switch (command) {
        // TODO
        case "stop":
            await stopServer();
            break;
        default:
            logWarning(`Unknown command: ${command}`);
            break;
    }
}

////////////////////
// Twitch backend //
////////////////////

const channel = "#" + (TESTING ? "thattouch" : "missdokidoki");

// Twitch
const tmi = require("tmi.js");
const clientTwitch = new tmi.Client({
    options: { debug: true },
    connection: { reconnect: true, secure: true },
    identity: {
        username: "BanananaBotto",
        password: "oauth:ybomr1iw89kxr7yyu058h9g3l9jwyz" // TODO: reset OAuth since it expired
    },
    channels: ['#thattouch'/*, '#missdokidoki'*/]
});
clientTwitch.on('message', (channel, userState, message, self) => { if (!self) { parseTwitch(channel, userState, message); } });

// starting returns a promise, keep it here, so we can asynchronously use discord as well
let twitch = 0;

async function startTwitch() {
    // TODO
}

async function stopTwitch() { await clientTwitch.disconnect(); tasksBusy.twitch = false; }

// TODO: add backend to send message back

/////////////////////
// Discord backend //
/////////////////////

const { Client, Events, GatewayIntentBits, EmbedBuilder, ActivityType } = require('discord.js');
const clientDiscord = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

clientDiscord.once(Events.ClientReady, () => { console.log("Phasmo randomizer bot is online!"); console.log(clientDiscord.options.intents); clientDiscord.user.setPresence({ activities: [{ name: "chat for " + prefix + "help", type: ActivityType.Watching }], status: "" }); });

clientDiscord.on('messageCreate', message => { parseDiscord(message); });

let discord = 0;

async function startDiscord() {
    discord = clientDiscord.login(process.env.DISCORD).catch(err => { console.log(err); });
    // TODO
}

function sendReplyDiscord() {
    // TODO
}

function sendChannelMessageDiscord() {
    // TODO
}

function sendDMDiscord() {
    // TODO
}

async function stopDiscord() { await clientDiscord.close(); tasksBusy.discord = false; }

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
    if (tasksBusy.console) { parseConsole(req.url).catch((err) => { logError(err); }); }
    sleep(0.05).then(() => { res.redirect("/"); }); // redirects back to the home page
});

// Set main page get implementation
app.get("/"     , (req, res) => { res.render("index", { status: (program === null ? "<button onclick=\"command('start')\" type=\"button\">Start</button>" : "") }); }); // TODO change program to actual used thing

// Start the server
const server = http.createServer(app);
server.listen(3000, () => { tasksBusy.console = true; program = start(); });

// Used to kill the server
async function stopServer() { server.close((err) => { logError(err); }); logInfo("Shutting down..."); if (program !== null) { tasksBusy.console = false; await program; } process.exit(); }

/////////////////
// BOT backend //
/////////////////

function equalsIgnoreCase(first, second) {
    switch (first) {
        case second: return true;
        default: return false;
    }
}

function getInterfaceID(interfaceName) { for (let i = 0; i < IDs.length; i++) { if (equalsIgnoreCase(IDs[i], interfaceName)) { return i; } } return -1; }

function logError(err)   { console.error("ERROR:\t", err ); }
function logWarning(err) { console.error("Warning:", err ); }
function logInfo(info)   { console.log("Info:\t"   , info); }
function logData(data)   { console.log(              data); }

async function sleep(seconds) { return new Promise((resolve) => setTimeout(resolve, seconds * 1000)); }