import { SlashCommandBuilder } from 'discord.js';
import { logError } from "../discord-bot-base/utils.mjs";
import https from "https";
import { createRequest, getSolvedRequest, resolveRequest } from "./resolver.js";

export default {
    // Twitch
    name: "joke",
    async reply(client, channel, userState, params, message) {

    },

    // Discord
    data: new SlashCommandBuilder()
        .setName('joke')
        .setDescription('Tells a joke.'),
    async execute(interaction) {
        await interaction.reply(interaction.client.utils.buildEmbed("Joke", await getDadJoke(interaction.client.utils)));
    },
};

async function getDadJoke(utils) {
    const id = createRequest();
    const options = {
        hostname: 'icanhazdadjoke.com',
        headers: { Accept: "text/plain" }
    }
    https.get(options, r => {
        r.setEncoding('utf8');
        r.on('data', data => { resolveRequest(id, data); });
    }).on('error', err => { logError(err); resolveRequest(id, "An error occurred trying to process this command.") });
    return (await getSolvedRequest(id)).toString();
}