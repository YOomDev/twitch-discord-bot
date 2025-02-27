
////////////////////////
// Automated messages // // TODO: REFACTOR!
////////////////////////

let messagesSinceLastAutomatedMessage = 0;
let automatedMessageManager;
let currentAutomatedMessage = 0;
let runMessages = true;
let hasTimePassedSinceLastAutomatedMessage = true;
let automatedMessages = [];

async function reloadTwitchTimedMessages() {
    const config = readFile(`${automatedMessagesFolder}config.txt`);
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
        let lines = readFile(`${automatedMessagesFolder}${message.file}.txt`);
        switch (message.type) {
            case "message":
                sendMessageTwitch(twitchChannel, lines[randomInt(lines.length)]);
                break;
            case "sequence":
                for (let i = 0; i < lines.length; i++) {
                    await awaitAutomatedMessageActive();
                    hasTimePassedSinceLastAutomatedMessage = false;
                    messagesSinceLastAutomatedMessage = 0;
                    sendMessageTwitch(twitchChannel, lines[i]);
                    if (i < lines.length - 1) { sleep(minutesBetweenAutomatedMessages * 60).then(_ => { hasTimePassedSinceLastAutomatedMessage = true; }); }
                }
                break;
            case "list":
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

///////////
// Utils //
///////////
function getTimeString(date = new Date()) { return `${date.getDate()}-${date.getMonth()}-${date.getFullYear()} ${date.toLocaleTimeString()}`.toString(); }
// Log functions
function logError(err)   { console.error(`[${getTimeString()}] ERROR:\t`, err ); }

async function sleep(seconds) { return new Promise(resolve => setTimeout(resolve, Math.max(seconds, 0) * 1000)); }