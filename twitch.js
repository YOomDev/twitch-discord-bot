// Bot file
import fs from "node:fs";

const commandProperties = ["data", "reply"];
const { token, clientName, channel, commandFolders, ignoreUsers, superuserName }  = require('./config.json');
const commandList = [];

let ready = false;
const prefix = "!";

export async function start(cmdProperties = []) {
    for (const properties of cmdProperties) { if (!contains(commandProperties, properties)) { commandProperties.push(properties); } }
    ready = false;
    client.connect().catch(err => { logError(err); }).then(_ => { ready = true; });
    while (!ready) { await sleep(0.25); }
    ready = false;
    reload();
}

function reload() { registerCommands(); }

//////////////////
// Dependencies //
//////////////////

import https from 'https';
import tmi from 'tmi.js';

import path, { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

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
    for (let i = 0; i < requests.length; i++) {
        if (requests[i].id !== id) { continue; }
        while (true) {
            await sleep(0.5);
            if (requests[i].resolved) {
                const returnData = requests[i].data;
                requests.splice(i, 1);
                return returnData;
            }
        }
    }
    return 0;
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

////////////////
// Twitch Bot //
////////////////

// Roles
const DEVELOPER   = "Dev"
const BROADCASTER = "Broadcaster";
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
    BROADCASTER,
    DEVELOPER
];

function getUserType(userState) {
    if (equals(userState.username, superuserName)) { return DEVELOPER; }
    if (userState.badges) { if (userState.badges['broadcaster']) { return BROADCASTER; } }
    if (userState.mod) { return MODERATOR  ; }
    if (userState.badges) { if (userState.badges['vip']) { return VIP; } }
    if (userState.subscriber) { return SUBSCRIBER ; }
    if (userState.badges) { if (userState.badges['premium']) { return PRIME; } }
    logWarning("No role determined from:");
    logData(userState.badges);
    return VIEWER;
}

function getAdminLevel(type) {
    for (let i = 0; i < adminLevels.length; ++i) { if (type === adminLevels[i]) { return i; } }
    logWarning(`No admin level found for type: ${type}`);
    return -1;
}

const client = new tmi.Client({
    options: { debug: true },
    connection: { reconnect: true, secure: true },
    identity: {
        username: clientName,
        password: `oauth:${token}`
    },
    channels: [`#${channel}`]
});
client.on('message', (channel, userState, message, self) => {
    if (self) { return; }
    if (containsIgnoreCase(ignoreUsers, userState['display-name'].toString()))
    for (let i = 0; i < ignoreUsers.length; i++) { if (equals(ignoreUsers[i].toLowerCase(), userState['display-name'].toString().toLowerCase())) { return; } }
    parseTwitch(channel, userState, message);
});

function registerCommands() {
    logInfo("Started loading commands.");
    commandList.slice(0, commandList.length);

    const folders = ["./commands"];
    for (const folder of commandFolders) { folders.push(folder); }
    for (const folder of folders) {
        const commandFiles = fs.readdirSync(folder).filter(file => file.endsWith('.js'));
        for (const file of commandFiles) {
            const filePath = path.join(folder, file);
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
            commandList.push({name: command.data.name, command: command});
        }
    }
}

const utils = {};
utils.loggers = {
    err : (err) => { logError   (err); },
    warn: (msg) => { logWarning (msg); },
    log : (msg) => { logInfo    (msg); },
    data: (dat) => { logData    (dat); },
};
utils.getRoleLevel = getAdminLevel()

async function parseTwitch(channel, userState, message) {
    if (message.startsWith(prefix)) {

        const userId = userState['user-id'];
        const adminLevel = getAdminLevel(getUserType(userState));
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
async function sleep(seconds) { return new Promise(resolve => setTimeout(resolve, Math.max(seconds, 0) * 1000)); }

function equals(first, second) {
    switch (first) {
        case second: return true;
        default: return false;
    }
}

function contains(array, value) { for (let i = 0; i < array.length; i++) { if (equals(array[i], value)) { return true; } } return false; }
function containsIgnoreCase(array, value) { const lowerName = value.toLowerCase(); for (let i = 0; i < array.length; i++) { if (equals(array[i].toLowerCase(), lowerName)) { return true; } } return false; }