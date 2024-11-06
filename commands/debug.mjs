import { SlashCommandBuilder } from 'discord.js';
import { logData } from "../discord-bot-base/utils.mjs";
const debug = false;

export default {
    data: new SlashCommandBuilder()
        .setName('debug')
        .setDescription('Gives some debug info to the developer when it is enabled.'),
    async execute(interaction) {
        if (debug) { logData(interaction); }
        await interaction.reply(interaction.client.utils.buildEmbed("Debug", debug ? "Debug data has been given to devs." : "Debugging is currently turned off.", [], debug ? interaction.client.utils.color : interaction.client.utils.color_error));
    },
};