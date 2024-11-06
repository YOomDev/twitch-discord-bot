import { SlashCommandBuilder } from 'discord.js';

import { generateResponse, ROLES } from '../discord-bot-base/gpt.mjs';
import { logInfo } from "../discord-bot-base/utils.mjs";

export default {
    data: new SlashCommandBuilder()
        .setName('gpt')
        .setDescription('not created yet'),
    async execute(interaction) {

        interaction.reply("this command is not working yet!"); // TODO: TMP

        // TODO: get input from user (this currently breaks!)
        logInfo(`Message: ${interaction.content}`);

        const response = await generateResponse(); // TODO: pass prompt to the gpt
        if (!response.error) {
            // TODO: add info to the conversation list

            await interaction.reply(response.message.content);
            return;
        }

        await interaction.reply(response.error);
    },
};