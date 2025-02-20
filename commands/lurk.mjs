import { SlashCommandBuilder } from 'discord.js';
import { logData } from "../discord-bot-base/utils.mjs";

export default {
    // Twitch
    name: "",
    async reply(client, channel, userState, params, message) {

    },

    // Discord
    data: new SlashCommandBuilder()
        .setName('lurk')
        .setDescription('Lets others know you are lurking.'),
    async execute(interaction) {
        await interaction.reply(interaction.client.utils.buildEmbed("Error", "We dont know how to implement this command for now?", [], interaction.client.utils.color_error));
    },
};