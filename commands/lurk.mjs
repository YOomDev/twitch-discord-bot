import { SlashCommandBuilder } from 'discord.js';

export default {
    // Twitch
    name: "lurk",
    async reply(client, channel, userState, params, message) {
        client.utils.sendChannelMessage(channel, `Thank you for lurking ${userState['display-name']}!`);
    },

    // Discord
    data: new SlashCommandBuilder()
        .setName('lurk')
        .setDescription('Lets others know you are lurking.'),
    async execute(interaction) {
        await interaction.reply(interaction.client.utils.buildEmbed("Error", "We dont know how to implement this command for now?", [], interaction.client.utils.color_error));
    },
};