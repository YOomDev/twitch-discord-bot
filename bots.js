import { logError } from "./discord-bot-base/utils.mjs";

// Bot imports
import { start as discord } from "./discord-bot-base/bot.mjs";
import { start as twitch } from "./twitch-bot-base/bot.mjs";

function start() {
    startDiscord().catch(_ => {});
    startTwitch().catch(_ => {});
}

async function startDiscord() { discord().catch(err => logError(err)); }
async function startTwitch() { twitch().catch(err => logError(err)); }

start();