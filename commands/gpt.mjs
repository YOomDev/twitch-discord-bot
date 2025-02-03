import { SlashCommandBuilder } from 'discord.js';

import { generateResponse, ROLES } from '../discord-bot-base/gpt.mjs';
import {logData, logError, logInfo} from "../discord-bot-base/utils.mjs";

export default {
    data: new SlashCommandBuilder()
        .setName('gpt')
        .setDescription('Command to prompt a GPT')
        .addStringOption(option => { option.setRequired(true).setName('prompt').setDescription("The prompt you want to give to the gpt.") }),
    async execute(interaction) {
        interaction.reply("Generating a response...");

        const response = await generateResponse(); // TODO: pass prompt to the gpt
        if (!response.error) {
            // TODO: add info to the conversation list

            await interaction.editReply(response.message.content);
            return;
        }
        await interaction.editReply(response.error);
    },
};