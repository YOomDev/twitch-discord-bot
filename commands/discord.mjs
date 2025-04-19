import { loadJSON } from "./utils/utils.mjs";

const json = loadJSON('../data/discord.json');

export default {
    // Twitch
    name: 'discord',
    async reply(client, channel, userState, params, message) { client.utils.sendChannelMessage(channel, json.text.toString()); },
};