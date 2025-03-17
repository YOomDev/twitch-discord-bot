import { SlashCommandBuilder } from 'discord.js';
import { generateResponse, ROLES } from '../discord-bot-base/gpt.mjs';
import { concat } from "./utils/utils.mjs";

export default {
    // Twitch
    name: "translate",
    async reply(client, channel, userState, params, message) {
        if (!client.utils.isAdminLevel(userState, client.roles.BROADCASTER)) { client.utils.sendChannelMessage(channel, "You do not have the permissions to use this command!"); return; }
        const promptMsg = concat(params, " ");
        const response = await generateResponse([{ role: ROLES.SYSTEM, content: "Please translate the following message to english while replying as short and concise as possible:" },{ role: ROLES.USER, content: promptMsg }]);
        if (!response.error) {
            // TODO: add info to the conversation list
        }
        client.utils.sendChannelMessage(channel, response.error ?  "An error occurred while trying to process the prompt translation." : `${response.message.content}`);
    },

    // Discord
    data: new SlashCommandBuilder()
        .setName('translate')
        .setDescription('Translate a message to english')
        .addStringOption(option => option
            .setName('sentence')
            .setDescription("The sentence you want to have translated to english.")
            .setRequired(true)),
    async execute(interaction) {
        await interaction.reply("Generating a response...");

        // Start generating response
        const promptMsg = interaction.options.getString('sentence');
        const response = await generateResponse([{ role: ROLES.SYSTEM, content: "Please translate the following message to english while replying as short and concise as possible:" },{ role: ROLES.USER, content: promptMsg }]);
        if (!response.error) {
            // TODO: add info to the conversation list
        }
        await interaction.editReply(response.error ?  "An error occurred while trying to process the prompt translation." : `**Sentence:** ${promptMsg}\n**Translation:** ${response.message.content}`);
    },
}