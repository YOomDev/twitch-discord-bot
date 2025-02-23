import { SlashCommandBuilder } from 'discord.js';
import { logData as logDataDiscord } from "../discord-bot-base/utils.mjs";
import { logInfo, logData as logDataTwitch } from "../twitch-bot-base/utils.mjs";
const debug = false;

export default {
    // Twitch
    name: "debug",
    async reply(client, channel, userState, params, message) {
        if (debug) {
            logInfo(`Debug data for ${userState['display-name']} in ${channel}:`);
            logInfo("Message:");
            logDataTwitch(message);
            logInfo("Params:");
            logDataTwitch(params);
            logInfo("Userstate:");
            logDataTwitch(userState);
        }
        client.utils.sendChannelMessage(channel, debug ? "Debug data has been given to devs." : "Debugging is currently turned off.");
    },

    // Discord
    data: new SlashCommandBuilder()
        .setName('debug')
        .setDescription('Gives some debug info to the developer when it is enabled.'),
    async execute(interaction) {
        if (debug) { logDataDiscord(interaction); }
        await interaction.reply(interaction.client.utils.buildEmbed("Debug", debug ? "Debug data has been given to devs." : "Debugging is currently turned off.", [], debug ? interaction.client.utils.color : interaction.client.utils.color_error));
    },
};