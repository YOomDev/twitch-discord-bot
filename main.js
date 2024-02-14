
//////////////////
// Dependencies //
//////////////////

const fs    = require('fs');
const https = require('https');
const tmi = require("tmi.js");
const { Client, Events, GatewayIntentBits, EmbedBuilder, ActivityType } = require('discord.js');
const { createAudioPlayer, NoSubscriberBehavior, joinVoiceChannel, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');

//////////////
// Settings //
//////////////

const color       = "#FF8888";
const color_error = "#FF3333";

// Commands
const prefix = "!";

const minutesBetweenAutomatedMessages      = 5;
const messagesNeededBeforeAutomatedMessage = 5;

// Loading followers
const timePerChunk   = 3; // The amount of seconds the program waits before requesting the next chunk of follower data
const amountPerChunk = 40; // The amount of followers requested per request to the twitch API

////////////
// Memory //
////////////

const botStartTime  = new Date().getTime();
let streamStartTime = new Date().getTime();

// Requests
let lastRequestId = -1;
const requests = [];

// automated messages
let runMessages = equals(readFile(`${__dirname}\\settings\\autoMessageOnStart.settings`)[0].toLowerCase(), "true");
let currentAutomatedMessage = 0;
let automatedMessageManager = 0; // container for the async function runner automatedMessagesManager()
const automatedMessages = [];
let hasTimePassedSinceLastAutomatedMessage = true;
let messagesSinceLastAutomatedMessage = 0;

// Queue's and busy booleans for all different parts
let tasksBusy  = { discord: false, twitch: false };
let ready   = false; // Used by bots during its start to wait till its ready
let closing = false; // Used for if any part of the program needs to know that it is shutting down.

const twitchChatters = [];

const discordAllowedGuilds   = readFile(`${__dirname}\\settings\\discordGuilds.settings`);
const discordAllowedChannels = readFile(`${__dirname}\\settings\\discordChannels.settings`);
const adminRoles             = readFile(`${__dirname}\\settings\\discordAdminRoles.settings`);

const twitchChannel          = readFile(`${__dirname}\\settings\\twitchUserInfo.settings`)[0];
const twitchIgnoreUsers      = readFile(`${__dirname}\\settings\\twitchIgnore.settings`);

// Custom commands
const commandFileTypes = ["rand"];

///////////////////////////////////
// Basic request and resolve API //
///////////////////////////////////

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
                if (requests[i].resolved) { return requests[i].data; }
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

/////////////////////
// Custom commands //
/////////////////////

function getCustomCommands() {
    const commands = getCustomCommandFiles();
    const list = [];
    for (let i = 0; i < commands.length; i++) { list.push(commands[i].split(".")[0]); }
    return concat(list, " ", prefix);
}

function getCustomCommandFiles() {
    const filesInCommandFolder = getFilenamesFromFolder(`${__dirname}\\data\\commands`);
    const commandFiles = [];
    for (let i = 0; i < filesInCommandFolder.length; i++) {
        const parts = filesInCommandFolder[i].split(".");
        if (parts.length === 2) {
            for (let j = 0; j < commandFileTypes.length; j++) {
                if (equals(parts[parts.length - 1].toLowerCase(), (`${commandFileTypes[j]}`).toLowerCase())) {
                    commandFiles.push(filesInCommandFolder[i]);
                    break;
                }
            }
        }
    }
    return commandFiles;
}

function parseCustomCommand(command) {
    const path = `${__dirname}\\data\\commands`;
    const commandFiles = getCustomCommandFiles();
    let result = "";
    for (let i = 0; i < commandFiles.length; i++) {
        const parts = commandFiles[i].split(".");
        const type = parts[parts.length - 1];
        parts.splice(parts.length - 1, 1);
        let customCommand = concat(parts, ".").toLowerCase().replaceAll(" ", ".");
        if (equals(command.toLowerCase(), customCommand)) {
            switch(type) {
                case "rand":
                    const options = readFile(`${path}\\${commandFiles[i]}`);
                    result = options.length < 1 ? "ERROR" : options[randomInt(options.length)];
                    break;
                default:
                    logError(`Custom command type \'.${type}\' has not been implemented yet for the custom command parser`);
                    break;
            }
            break;
        }
    }
    return result;
}

/////////
// BOT //
/////////

function isBusy() { return tasksBusy.discord || tasksBusy.twitch; }

async function start() {
    logInfo("Initializing bots...");
    await startTwitch();
    loadFollowers().catch(err => { logError(err); });
    setInterval(loadFollowers, 24 * 60 * 60 * 1000); // Reloads the followers list every 24 hours
    setInterval(isTwitchChannelLive, 2 * 60 * 1000); // Checks if the channel is live every 2 minutes
    isTwitchChannelLive().catch(err => { logError(err); }); // Loads the last starting time of the twitch stream if it is currently live
    await startDiscord();
    logInfo("Bots initialized successfully!");
    if (runMessages && automatedMessageManager === 0) {
        await reloadTwitchTimedMessages();
        automatedMessageManager = automatedMessagesManager();
    }
    while (isBusy()) { await sleep(1); } // Keep program alive so bots can keep responding without being on the main call thread
    logInfo("Program stopped!");
}

async function stop() {
    if (!closing) {
        closing = true;
        if (tasksBusy.discord) {
            await stopDiscord();
            logData("Stopped discord bot");
        }
        if (tasksBusy.twitch) {
            await stopTwitch();
            logData("Stopped twitch bot");
        }
        process.exit(0);
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
                logInfo("Discord Debug-info:");
                logData(message);
                break;
            case "help":
                sendEmbedDiscord(message.channel, "Commands:", "...", color, [
                    [`${prefix}help`, "Displays the help page", false],
                    [`${prefix}verify`, "This command will give you a verify code to link with your twitch account if you are not linked yet", false]
                ]);
                break;
            case "verify":
                if (!isVerifiedDiscord(message.author.id)) {
                    const code = createVerify(message.author.id);
                    if (code.length) { sendEmbedDiscord(message.author, "Verification-code", `Code: ${code}`); }
                    else { sendEmbedDiscord(message.author, "Couldn't verify", "Verify-code has already been requested before.", color_error); }
                } else { sendEmbedDiscord(message.author, "Couldn't verify", "Account is already verified!", color_error); }
                break;
            case "stop":
                if (isAdminDiscord(member)) { stop().catch(err => { logError(err); }); }
                else { sendEmbedDiscord(message.channel, "No permission", "You do not have the right permissions to use this command.", color_error); }
                break;
            default:
                const cmdResult = parseCustomCommand(command);
                if (cmdResult.length) { sendEmbedDiscord(message.channel, "Custom commands?", cmdResult); }
                else {
                    sendEmbedDiscord(message.channel, "Unknown command", `Command \'${command}\' is unknown to this bot...`);
                    logWarning(`Discord command not found! (${command})`);
                }
                break;
        }
    }
}

async function parseTwitch(channel, userState, message) {
    const userId = userState['user-id'];
    if (message.startsWith(prefix)) { // Check if the message is a command
        // Gather the needed info for the command
        const params = message.substring(prefix.length, message.length).split(" ");
        const command = params[0].toLowerCase();
        const adminLevel = getAdminLevelTwitch(getUserTypeTwitch(userState));
        params.splice(0, 1);

        // Parse
        switch (command) {
            case "debug":
                logInfo("Twitch Debug-info:");
                logInfo(`${channel}: ${message}`);
                logData(userState);
                logData(getUserTypeTwitch(userState));
                break;
            case "streamon":
                if (adminLevel >= getAdminLevelTwitch(MODERATOR)) {
                    twitchChatters.splice(0, twitchChatters.length); // Clear first time chats for this stream
                    sendMessageTwitch(channel, "Bots chat memory has been reset, have a nice stream!");
                }
                break;
            case "uptime":
                const currentTime = new Date().getTime();
                if (streamStartTime === botStartTime) { sendMessageTwitch(channel, `Bot has been running for ${getTimeDifferenceInDays(streamStartTime, currentTime, true)}, stream time might differ due to a possible bot restart.`); }
                else { sendMessageTwitch(channel, `Stream has been running for ${getTimeDifferenceInDays(streamStartTime, currentTime, true)}.`); }
                break;
            case "automsg":
            case "automessage":
            case "automatedmessage":
                if (adminLevel >= getAdminLevelTwitch(BROADCASTER)) {
                    const wasRunning = runMessages;
                    if (wasRunning) { stopAutomatedMessagesManager().catch(err => { logError(err); }); }
                    else { reloadTwitchTimedMessages().catch(err => { logError(err); }); }
                    sendMessageTwitch(channel, `Automated messages have been turned ${wasRunning ? `off` : `on`}!`);
                }
                break;
            case "dad":
            case "joke":
                sendMessageTwitch(channel, await getDadJoke());
                break;
            case "followtime":
            case "followage":
                const follower = isFollower(userId);
                sendMessageTwitch(channel, follower < 0 ? "You have not followed long enough to check" : getTimeDifferenceInDays(followerData[follower].time));
                break;
            case "commands":
            case "help":
                sendMessageTwitch(channel, `Commands: ${prefix}verify ${prefix}sync ${prefix}quote ${prefix}followage ${prefix}uptime ${prefix}dad ${getCustomCommands()}`);
                break;
            case "timer":
                if (adminLevel >= getAdminLevelTwitch(MODERATOR)) {
                    if (params.length > 1) {
                        const name = params[0];
                        const number = parseInt(params[1]);
                        if (!isNaN(number)) {
                            sleep(60 * number).then(_ => { sendMessageTwitch(channel, `Timer \'${name}\' ended`); playAudio(`${name}.mp3`).catch(err => logError(err)) });
                        } else { sendMessageTwitch(channel, `Second argument is not a number!`);}
                    } else { sendMessageTwitch(channel, `Not enough arguments given!`); }
                } else { sendMessageTwitch(channel, `You can only use this command if you are at least a mod`); }
                break;
            case "addquote":
                if (adminLevel >= getAdminLevelTwitch(SUBSCRIBER)) {
                    let quote = `\n\"${concat(params, " ")}\" - ${userState['display-name']}`;
                    fs.appendFile(`${__dirname}\\data\\commands\\quote.rand`, quote, (err) => { if (err) { logError(err); } else { sendMessageTwitch(channel, `Total quotes: ${readFile(`${__dirname}\\data\\commands\\quote.rand`).length}`); } });
                } else { sendMessageTwitch(channel, `You can only use this command if you are at least a subscriber (prime or normal)`); }
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
                        if (verify(userId, params[0])) { sendMessageTwitch(channel, `Successfully verified you, ${userState['display-name']}!`); }
                        else { sendMessageTwitch(channel, "Could not verify you, maybe it was the wrong code?"); }
                    } else { sendMessageTwitch(channel, "You have already been verified!"); }
                } else { sendMessageTwitch(channel, "Need a verification-code as argument, if you don't have this yet you can get it from the discord bot using the verify command there!"); }
                break;
            case "stop":
                if (adminLevel >= getAdminLevelTwitch(BROADCASTER)) { stop().catch(err => { logError(err); }); }
                break;
            default:
                const cmdResult = parseCustomCommand(command);
                if (cmdResult.length) { sendMessageTwitch(channel, cmdResult); }
                break;
        }
    } else {
        messagesSinceLastAutomatedMessage += 1;
        if (!contains(twitchChatters, userId)) {
            twitchChatters.push(userId);
            const lines = readFile(`${__dirname}\\automated\\messages\\welcomeMessages${userState['first-msg'] ? "First" : ""}.txt`);
            sendMessageTwitch(channel, lines[randomInt(lines.length)].replaceAll("{USER}", userState['display-name']));
        }
    }
}

function createVerify(discordId) {
    const code = `${discordId}-${Date.now()}`;
    const path = `${__dirname}\\verify\\discord\\${discordId}.txt`;
    if (sumLength(readFile(path))) { return ""; } // return empty if verify-code has already been requested
    writeLineToFile(path, code);
    return code;
}

function verify(twitchId, code) {
    if (code.indexOf("-") < 1) { return false; } // Make sure it is an actual verification-code

    const discordId   = code.split("-")[0];
    const pathDiscord = `${__dirname}\\verify\\discord\\${discordId}.txt`;
    const pathTwitch  = `${__dirname}\\verify\\twitch\\${twitchId}.txt`;

    const read = readFile(pathDiscord);
    if (read.length === 1) { // Check if there's a line used, due to how it formats, the first line is the code, and thus it can be checked to see if there was a code requested
        if (read[0] === code) { // Verify if code is the same as noted in the file
            writeLineToFile(pathDiscord, `${twitchId}`); // Add a link to the twitch account to the discord file, mostly just used to see if account is linked
            writeLineToFile(pathTwitch , discordId); // Add a backwards link for commands that will use twitch users info to do things like change roles on the discord account
            return true;
        }
    }
    return false;
}

async function getDadJoke() {
    const id = createRequest();
    const options = {
        hostname: 'icanhazdadjoke.com',
        headers: { Accept: "text/plain" }
    }
    https.get(options, r => {
        r.setEncoding('utf8');
        r.on('data', data => { resolveRequest(id, data); });
    }).on('error', err => { logError(err); resolveRequest(id, "An error occurred trying to process this command") });
    return (await getSolvedRequest(id)).toString();
}

// File structure: name: discord-id; line1: verify_code; line2: twitch-id (if verified)
function isVerifiedDiscord(discordId) { return readFile(`${__dirname}\\verify\\discord\\${discordId}.txt`).length > 1; }

// File structure: name: twitch-id line1: discord-id (if verified)
function isVerifiedTwitch(twitchId  ) { return readFile(`${__dirname}\\verify\\twitch\\${twitchId}.txt`).length > 0; }

function syncTwitchDiscord(userState) {
    const discordId = parseInt(`${readFile(`${__dirname}\\verify\\twitch\\${userState['id']}.txt`)[0]}`);
    clientDiscord.guilds.cache.forEach(guild => {
       guild.members.cache.forEach(member => {
           if (equals(discordId, `${member.id}`)) {
               // TODO: use userState to give roles to the member
               if (userState.badges['broadcaster']) {  }
               if (userState.mod                  ) {  }
               if (userState.badges['vip']        ) {  }
               if (userState.subscriber           ) {  }
               if (userState.badges['premium']    ) {  }
               return true;
           }
       });
    });
    return false;
}

async function reloadTwitchTimedMessages() {
    const config = readFile(`${__dirname}\\automated\\messages\\config.txt`);
    for (let i = 0; i < config.length; i++) {
        let line = config[i].split(" ");
        switch (line[0]) {
            case "message":
            case "sequence":
            case "list":
                if (line.length > 1) {
                    automatedMessages.push({ type: line[0], file: concat(line, " ", "", 1) });
                    break;
                }
                logError(`Couldn\'t interpret automated message from config line ${i}: ${line}`);
                break;
            default:
                logError(`Couldn\'t interpret automated message from config line ${i}: ${line}`);
                break;
        }
    }
    runMessages = false;
    await stopAutomatedMessagesManager();
    automatedMessageManager = automatedMessagesManager(); // Start new messages manager
}

async function stopAutomatedMessagesManager() {
    runMessages = false;
    if (automatedMessageManager) { await automatedMessageManager; }
    automatedMessageManager = 0;
    currentAutomatedMessage = 0;
}

function isChatActive() {
    if (messagesSinceLastAutomatedMessage < messagesNeededBeforeAutomatedMessage) { return false; }
    return hasTimePassedSinceLastAutomatedMessage;
}

async function awaitAutomatedMessageActive() { while (!isChatActive() && runMessages) { await sleep(1); } }

async function automatedMessagesManager() {
    runMessages = true;
    while (runMessages) {
        await awaitAutomatedMessageActive();
        await playAutomatedMessage();
    }
}

async function playAutomatedMessage() {
    if (!runMessages) { return; }
    if (isChatActive()) {
        if (currentAutomatedMessage >= automatedMessages.length) { currentAutomatedMessage -= automatedMessages.length; }
        const message = automatedMessages[currentAutomatedMessage];
        let lines = readFile(`${__dirname}\\automated\\messages\\${message.file}.txt`);
        switch (message.type) {
            case "message":
                sendMessageTwitch(twitchChannel, lines[randomInt(lines.length)]);
                break;
            case "sequence": // TODO: Fix double message
                for (let i = 0; i < lines.length; i++) {
                    await awaitAutomatedMessageActive();
                    hasTimePassedSinceLastAutomatedMessage = false;
                    messagesSinceLastAutomatedMessage = 0;
                    sendMessageTwitch(twitchChannel, lines[i]);
                    if (i < lines.length - 1) { sleep(minutesBetweenAutomatedMessages * 60).then(_ => { hasTimePassedSinceLastAutomatedMessage = true; }); }
                }
                break;
            case "list": // TODO: Fix messages not getting sent or loaded
                for (let i = 0; i < lines.length; i++) {
                    sendMessageTwitch(twitchChannel, lines[i]);
                    if (i < lines.length - 1) {await sleep(5); }
                }
                break;
            default:
                logError(`Message type (${message.type}) not implemented. `);
                break;
        }
        currentAutomatedMessage++;
        hasTimePassedSinceLastAutomatedMessage = false;
        messagesSinceLastAutomatedMessage = 0;
        sleep(minutesBetweenAutomatedMessages * 60).then(_ => { hasTimePassedSinceLastAutomatedMessage = true; });
    }
}

////////////////////
// Twitch backend //
////////////////////

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

// Twitch
const clientTwitch = new tmi.Client({
    options: { debug: true },
    connection: { reconnect: true, secure: true },
    identity: {
        username: readFile(`${__dirname}\\settings\\twitchUserInfo.settings`)[1],
        password: `oauth:${readFile(`${__dirname}\\settings\\twitchToken.settings`)[0]}`
    },
    channels: [`#${twitchChannel}`]
});
clientTwitch.on('message', (channel, userState, message, self) => {
    if (!self) {
        for (let i = 0; i < twitchIgnoreUsers.length; i++) { if (equals(twitchIgnoreUsers[i].toLowerCase(), userState['display-name'].toString().toLowerCase())) { return; } }
        parseTwitch(channel, userState, message);
    }
});

// Starting creates a promise that contains the current twitch client, it is stored here to make sure all the different clients can work asynchronously
let twitch = 0;

async function startTwitch() {
    if (!tasksBusy.twitch) {
        ready = false;
        twitch = clientTwitch.connect().catch(err => { logError(err); }).then(_ => { tasksBusy.twitch = true; ready = true; });
        while (!ready) { await sleep(0.25); }
        ready = false;
    }
}

async function loadFollowers() {
    console.time('followers');
    getFollowers().catch(err => { logError(err); });
    while (!hasLoadedAllFollowers()) { await sleep(5); }
    console.timeEnd('followers');
}

async function stopTwitch() { await clientTwitch.disconnect(); tasksBusy.twitch = false; }

function sendMessageTwitch(channel, msg) { if (msg.length) { clientTwitch.say(channel, msg); } }

async function isTwitchChannelLive() {
    const text = await (await fetch(`https://twitch.tv/${twitchChannel}`).catch(err => { logError(err); return { text: async function() { return ""; }}})).text();
    const liveIndex = text.indexOf("\",\"isLiveBroadcast\":true");
    if (liveIndex > 0) {
        const findStr = "\"startDate\":\"";
        streamStartTime = Date.parse(text.substring(text.indexOf(findStr) + findStr.length, liveIndex));
        return true;
    }
    streamStartTime = botStartTime;
    return false;
}

function getUserTypeTwitch(userState) {
    if (equals(userState.username, readFile(`${__dirname}\\settings\\twitchUserInfo.settings`)[2])) { return DEVELOPER; }
    if (userState.badges) { if (userState.badges['broadcaster']) { return BROADCASTER; } }
    if (userState.mod) { return MODERATOR  ; }
    if (userState.badges) { if (userState.badges['vip']) { return VIP; } }
    if (userState.subscriber) { return SUBSCRIBER ; }
    if (userState.badges) { if (userState.badges['premium']) { return PRIME; } }
    logWarning("No role determined from:");
    logData(userState.badges);
    return VIEWER;
}

function getAdminLevelTwitch(type) {
    for (let i = 0; i < adminLevels.length; ++i) { if (type === adminLevels[i]) { return i; } }
    logWarning(`No admin level found for type: ${type}`);
    return -1;
}

let parseData = "";
const parsedData = [];
let count = 0;
const followerData = [];

function isFollower(id) {
    for (let i = 0; i < followerData.length; i++) {
        if (equals(followerData[i].id, id)) { return i; }
    }
    return -1;
}

async function parseDataChunk() {
    const tempData = parseData;
    parseData = "";
    const json = JSON.parse(tempData);
    const after = `${json.pagination.cursor}`.toString();
    parsedData.push(json);
    if (!count) {
        count = json.total;
        const date = new Date();
        const estimate = (Math.ceil(count / amountPerChunk) - 1) * timePerChunk;
        date.setTime(date.getTime() + 1000 * estimate);
        logInfo(`Loading time estimation: ${estimate} seconds (ETA: ${getTimeString(date)})`);
    }
    logInfo(`Chunk loaded: ${parsedData.length}/${Math.ceil(count / amountPerChunk)}`);
    if (after.length > 10) {
        await sleep(timePerChunk);
        getFollowers(after, true).catch(err => { logError(err); });
    } else {
        followerData.splice(0, followerData.length);
        logInfo("Started parsing follower data...");
        for (let i = 0; i < parsedData.length; i++) {
            for (let j = 0; j < Math.min(amountPerChunk, count - (amountPerChunk * i)); j++) {
                followerData.push({ id: parsedData[i].data[j].user_id, name: `${parsedData[i].data[j].user_name}`, time: parseTwitchTime(`${parsedData[i].data[j].followed_at}`) });
            }
        }
        count = followerData.length;
        parsedData.splice(0, parsedData.length);
        logInfo("Finished parsing follower data!");
    }
}

function parseTwitchTime(timeString) {
    const parts = timeString.split("T");
    const dateStr = parts[0].split("-");
    const timeStr = parts[1].replaceAll("Z", "").split(":");
    const date = new Date();
    date.setFullYear(parseInt(dateStr[0]), parseInt(dateStr[1]), parseInt(dateStr[2]));
    date.setHours(parseInt(timeStr[0]));
    date.setMinutes(parseInt(timeStr[1]));
    date.setSeconds(parseInt(timeStr[2]));
    return date.getTime();
}

function hasLoadedAllFollowers() { return followerData.length > 0; }

async function getFollowers(after = "", force = false) {
    if (!force) { if (parsedData.length || parseData.length) { return; } }
    const id = readFile(`${__dirname}\\settings\\twitchId.settings`)[0];
    const options = {
        hostname: 'api.twitch.tv',
        path: `/helix/channels/followers?broadcaster_id=${readFile(`${__dirname}\\settings\\twitchRoom.settings`)[0]}&first=${amountPerChunk}${after.length < 1 ? "" : `&after=${after}`}`,
        headers: {
            Authorization: `Bearer ${readFile(`${__dirname}\\settings\\twitchToken.settings`)[0]}`,
            'Client-ID': id
        }
    }
    https.get(options, r => {
        r.setEncoding('utf8');
        r.on('data', data => {
            parseData += data;
            if (data.indexOf("\"pagination\":") > 1) { parseDataChunk(); }
        });
    }).on('error', err => { logError(err); });
}

/////////////////////
// Discord backend //
/////////////////////

const clientDiscord = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildVoiceStates] });
clientDiscord.once(Events.ClientReady, () => { ready = true; logInfo("Bot is online!"); logData(clientDiscord.options.intents); clientDiscord.user.setPresence({ activities: [{ name: `chat for ${prefix}help`, type: ActivityType.Watching }], status: "" }); });
clientDiscord.on(Events.MessageCreate, message => { if (message.author.id !== clientDiscord.user.id) { parseDiscord(message); } });

const audioPlayerDiscord = createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Pause } });
audioPlayerDiscord.on('error', error => { logError(`Audio player had an error while playing \'${error.resource.metadata.title}\'. Full error: (${error.message})`); });

let audioConnection = null;
const audioQueue = [];
let audioPlaying = false;

async function playAudio(path = "") {
    while (path.endsWith(" ")) { path = path.substring(0, path.length - 1); }
    if (path.length > 0) { audioQueue.push(path); }
    if (!audioPlaying && audioQueue.length > 0) {
        audioPlaying = true;
        while (audioQueue.length > 0) {
            while (audioPlayerDiscord.state.status !== AudioPlayerStatus.Idle) { await sleep(0.5) }
            const audio = createAudioResource(`${__dirname}\\sounds\\${audioQueue[0]}`, { metadata: { title: audioQueue[0] } });
            audioQueue.splice(0, 1);
            audioPlayerDiscord.play(audio);
        }
        audioPlaying = false;
    }
}

clientDiscord.on(Events.VoiceStateUpdate, (oldState, newState) => {
    if (oldState.member.roles.cache.some(role => { return equals(role.name, readFile(`${__dirname}\\settings\\discord.settings`)[0]); })) {
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
            playAudio().catch(err => { logError(err); });
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

// Starting creates a promise that contains the current discord client, it is stored here to make sure all the different clients can work asynchronously
let discord = 0;

async function startDiscord() {
    ready = false;
    tasksBusy.discord = true;
    discord = clientDiscord.login(readFile(`${__dirname}\\settings\\discordToken.settings`)[0]).catch(err => { logError(err); tasksBusy.discord = false; ready = true; });
    while (!ready) { await sleep(0.25); }
    ready = false;
}

async function stopDiscord() { clientDiscord.destroy(); await sleep(1); tasksBusy.discord = false; }

function sendEmbedDiscord(channel, title, description, col = color, fields = []) {
    const embed = new EmbedBuilder().setTitle(title).setColor(col).setDescription(description);
    for (let i = 0; i < fields.length; i++) { embed.addFields({ name: fields[i][0], value: fields[i][1], inline: fields[i][2] }); }
    channel.send({ embeds: [embed] });
}

function isAdminDiscord(member) { return member.roles.cache.some((role) => { return contains(adminRoles, role.name); }); }

/////////////////
// BOT backend //
/////////////////

function getTimeDifferenceInDays(milliFrom, milliTo = new Date().getTime(), showMinutes = false) {
    const totalMinutes = Math.floor((milliTo - milliFrom) / 1000 / 60);
    const totalHours = Math.floor(totalMinutes / 60);
    const totalDays = Math.floor(totalHours / 24);
    const years = Math.floor(totalDays / 365);
    const days = totalDays - (years * 365);
    const hours = totalHours - (totalDays * 24);
    const minutes = totalMinutes - (totalHours * 60);
    return `${years > 0 ? `${years} years and ` : ``}${days > 0 ? `${days} days and ` : ``}${hours} hours${showMinutes ? (minutes > 0 ? ` and ${minutes} minutes` : ``) : ``}`;
}

function randomInt(max, min = 0) { return  Math.floor(Math.min(min, max)) + Math.floor(Math.random() * (Math.max(min, max) - Math.min(min, max))); }

function equals(first, second) {
    switch (first) {
        case second: return true;
        default: return false;
    }
}

function concat(list, separator = "", prefix = "", start = 0) {
    let result = "";
    for (let i = start; i < list.length; i++) { result += (i <= start ? "" : separator) + prefix + list[i]; }
    return result;
}

function getTimeString(date = new Date()) { return date.toLocaleTimeString(); }

function contains(array, value) { for (let i = 0; i < array.length; i++) { if (equals(array[i], value)) { return true; } } return false; }

function logError(err)   { console.error(`[${getTimeString()}] ERROR:\t`, err ); }
function logWarning(err) { console.error(`[${getTimeString()}] Warning:`, err ); }
function logInfo(info)   { console.log  (`[${getTimeString()}] Info:\t` , info); }
function logData(data)   { console.log  (data); }
async function sleep(seconds) { return new Promise(resolve => setTimeout(resolve, Math.max(seconds, 0) * 1000)); }

function getFilenamesFromFolder(path) {
    return fs.readdirSync(path, function (err, files) {
        if (err) { logError(`Unable to scan directory: ${err}`); return []; }
        return files;
    });
}

function readFile(path) {
    try {
        const data = fs.readFileSync(path, 'utf8').split("\n");
        const lines = [];
        for (let i = 0; i < data.length; i++) {
            let line = data[i];
            if (line.endsWith("\r")) { line = line.substring(0, line.length - 1); } // Make sure lines don't end with the first half of the windows end line characters
            line.trim(); // Make sure lines don't start end with a spaces
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

function writeLineToFile(path, line = "") { fs.appendFile(path, `${line}\n`, err => { logError(err); }); }

///////////////////
// Program start //
///////////////////

start().catch(err => { logError(err); });