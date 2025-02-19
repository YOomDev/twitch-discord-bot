import { logError } from "./discord-bot-base/utils.mjs";

// Bot imports
import { start as discord } from "./discord-bot-base/bot.mjs";

async function start() {
    const disc = await startDiscord().catch(_ => {});
}

async function startDiscord() { return discord().catch(err => logError(err)); }

start();