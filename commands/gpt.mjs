import { SlashCommandBuilder } from 'discord.js';

import { generateResponse, ROLES } from '../discord-bot-base/gpt.mjs';

export default {
    data: new SlashCommandBuilder()
        .setName('gpt')
        .setDescription('Command to prompt a GPT')
        .addStringOption(option => option
            .setName('prompt')
            .setDescription("The prompt you want to give to the gpt.")
            .setRequired(true)),
    async execute(interaction) {
        await interaction.reply("Generating a response...");

        // Start generating response
        const response = await generateResponse([{ role: ROLES.SYSTEM, content: "Please answer the next question as short and concise as possible:" },{ role: ROLES.USER, content: interaction.options.getString('prompt') }]);
        if (!response.error) {
            // TODO: add info to the conversation list
        }
        await interaction.editReply(response.error ?  "An error occured while trying to process the prompt." : response.message.content);
    },
};