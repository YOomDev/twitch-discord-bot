import { logError } from "./discord-bot-base/utils.mjs";

// Bot imports
import { start as twitch } from "./twitch-bot-base/bot.mjs";

async function start() {
    const ttv = await startTwitch().catch(_ => {});
}

async function startTwitch() { return twitch().catch(err => logError(err)); }

start();