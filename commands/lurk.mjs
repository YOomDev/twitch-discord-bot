import { SlashCommandBuilder } from 'discord.js';
import { logData } from "../discord-bot-base/utils.mjs";

export default {
    data: new SlashCommandBuilder()
        .setName('debug')
        .setDescription('Gives some debug info to the developer when it is enabled.'),
    async execute(interaction) {
        await interaction.reply(interaction.client.utils.buildEmbed("Error", "Lurking is not possible on discord?", [], interaction.client.utils.color_error));
    },
};