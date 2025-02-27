import { SlashCommandBuilder } from 'discord.js';
const debug = false;

export default {
    // Twitch
    name: "debug",
    async reply(client, channel, userState, params, message) {
        if (debug) {
            client.utils.log(`Debug data for ${userState['display-name']} in ${channel}:`);
            client.utils.log("Message:");
            client.utils.data(message);
            client.utils.log("Params:");
            client.utils.data(params);
            client.utils.log("Userstate:");
            client.utils.data(userState);
        }
        client.utils.sendChannelMessage(channel, debug ? "Debug data has been given to devs." : "Debugging is currently turned off.");
    },

    // Discord
    data: new SlashCommandBuilder()
        .setName('debug')
        .setDescription('Gives some debug info to the developer when it is enabled.'),
    async execute(interaction) {
        if (debug) { interaction.client.utils.data(interaction); }
        await interaction.reply(interaction.client.utils.buildEmbed("Debug", debug ? "Debug data has been given to devs." : "Debugging is currently turned off.", [], debug ? interaction.client.utils.color : interaction.client.utils.color_error));
    },
};