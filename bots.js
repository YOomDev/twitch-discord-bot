import { logError } from "./discord-bot-base/utils.mjs";

// Bot imports
import { start as discord } from "./discord-bot-base/bot.mjs";
import { start as twitch } from "./twitch-bot-base/bot.mjs";

async function start() {
    const disc = await startDiscord().catch(_ => {});
    const ttv = await startTwitch().catch(_ => {});

    disc.global.twitch = ttv;
    ttv.global.discord = disc;
}

async function startDiscord() { return discord().catch(err => logError(err)); }
async function startTwitch() { return twitch().catch(err => logError(err)); }

start();