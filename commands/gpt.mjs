import {SlashCommandBuilder, SlashCommandStringOption} from 'discord.js';

import { generateResponse, ROLES } from '../discord-bot-base/gpt.mjs';
import {logData, logError, logInfo} from "../discord-bot-base/utils.mjs";

export default {
    data: new SlashCommandBuilder()
        .setName('gpt')
        .setDescription('Command to prompt a GPT')
        .addStringOption(option => option.setRequired(true).setName('prompt').setDescription("The prompt you want to give to the gpt.")),
    async execute(interaction) {
        interaction.reply("Generating a response...");

        const prompt = interaction.options.getString('prompt');

        const response = await generateResponse([{ role: ROLES.SYSTEM, content: "Please answer the next question as short and concise as possible:" },{ role: ROLES.USER, content: prompt }]);
        if (!response.error) {
            // TODO: add info to the conversation list

            await interaction.editReply(response.message.content);
            return;
        }
        await interaction.editReply(response.error);
    },
};