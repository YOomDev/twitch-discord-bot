const TESTING = true

start().catch(err => { console.error(err); });

//////////////
// Settings //
//////////////

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

const TWITCH_ID = getInterfaceID(TWITCH);
const DISCORD_ID = getInterfaceID(DISCORD);

const IDs = [
    TWITCH,
    DISCORD,
];

////////////
// Memory //
////////////

// Queue's and busy booleans for all different parts
let tasksBusy  = { discord: false, twitch: false, console: false };
let program = null;

/////////
// BOT //
/////////

function isBusy() {
    return tasksBusy.discord || tasksBusy.twitch || tasksBusy.console;
}

async function start() {
    logInfo("Initializing...")
    await startTwitch();
    await startConsole();
    await startDiscord();
    logInfo("Initialized successfully!")
}

function parseDiscord(message) {

}

function parseTwitch(channel, userState, message) {

}

function parseCommand() {

}

////////////////////
// Twitch backend //
////////////////////

const channel = "#" + (testing ? "thattouch" : "missdokidoki");

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

}

// TODO: add backend to send message back

/////////////////////
// Discord backend //
/////////////////////

const { Client, GatewayIntentBits } = require('discord.js');
const clientDiscord = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

clientDiscord.on('messageCreate', message => { parseDiscord(message); });

let discord = 0;

async function startDiscord() {

}

function sendReplyDiscord() {

}

function sendChannelMessageDiscord() {

}

function sendDMDiscord() {

}

//////////////
// DATABASE //
//////////////

function NO_CALLBACK() {}

// FIle name
const dbName = TESTING ? "./testing.db" : "./twitch.db";
console.log(dbName);

// Tables
const QUOTE = "quote"
const AUTOMSG = "automsg";
const SOUND = "sound";
const tables = [QUOTE, AUTOMSG, SOUND];

// tableID's
const AUTOMATED_MESSAGES = tables.indexOf(AUTOMSG);
const QUOTES = tables.indexOf(QUOTE);
const SOUNDS = tables.indexOf(SOUND);

// Database backend
const sqlite = require('sqlite3').verbose();

function connect() { return new sqlite.Database(dbName, sqlite.OPEN_READWRITE, (err) => { if (err) { console.error(err); } }); }

// make sure an error gets logged on startup if file doesn't exist
let db = connect();
db.close();
db.serialize(() => {
    createTables();
    // TODO start();
});

function createTables() {
    // console.log("Creating tables");
    db = connect();
    db.run("CREATE TABLE tmp(NAME TEXT PRIMARY KEY, TIMER INTEGER, MESSAGE TEXT, ENABLED INTEGER, CHANNEL TEXT)", (err) => { if (err) { if (err.errno != 1) { console.error(err); } } } );
    for (let i = 0; i < tables.length; i++) {
        const create = "CREATE TABLE tmp(NAME TEXT PRIMARY KEY, TIMER INTEGER, MESSAGE TEXT, ENABLED INTEGER, CHANNEL TEXT)";
        const sql = create.replace("tmp", tables[i]);
        db.run(sql, (err) => { if (err) { if (err.errno != 1) { console.error(err); } } } );
    }
    db.close();
}

function insertInTable(tableID, NAME, TIMER, MESSAGE, ENABLED, CHANNEL) {
    const insert = "INSERT INTO tmp(NAME, TIMER, MESSAGE, ENABLED, CHANNEL) VALUES (?,?,?,?,?)";
    const sql = insert.replace("tmp", tables[tableID]);

    console.log(sql)

    db = connect();
    db.run(sql, [NAME, TIMER, MESSAGE, ENABLED, CHANNEL], (err) => { if (err) { console.error(err); } });
    db.close();
}

function getTableContents(tableID, callback) {
    const select = "SELECT * FROM tmp";
    const sql = select.replace("tmp", tables[tableID]);
    db = connect();
    db.all(sql, [], (err, rows) => {
        if (err) { console.error(err); }
        else { if (rows.length > 0) {
            console.log("Reading table");
            console.log(tables[tableID]);
            console.log(rows);
            callback(rows);
        } }
    });
    db.close();
}

///////////////////
// Control panel //
///////////////////

// Console
const http = require('http');
const express = require('express');
const app = express();

// Setup express for usage
app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/public'));

// Set command interface through page get
app.get("/cmd/*", (req, res) => {
    if (tasksBusy.console) { parseCommand(req.url).catch((err) => { console.error(err); }); }
    sleep(0.05).then(() => { res.redirect("/"); }); // redirects back to the home page
});

// Set main page get implementation
app.get("/", (req, res) => { res.render("index", { status: (program === null ? "<button onclick=\"command('start')\" type=\"button\">Start</button>" : "") }); }); // TODO change program to actual used thing

async function startConsole() {

}

// Start the server
const server = http.createServer(app);
server.listen(3000, () => { tasksBusy.console = true; });

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

function getInterfaceID(interface) { for (let i = 0; i < IDs.length; i++) { if (equalsIgnoreCase(IDs[i], interface)) { return i; } } return -1; }

function logError(err) { console.error("ERROR:\t", err); }
function logWarning(err) { console.error("Warning:\t", err); }
function logInfo(info) { console.log("Info:\t", info); }
async function sleep(seconds) { return new Promise((resolve) => setTimeout(resolve, seconds * 1000)); }