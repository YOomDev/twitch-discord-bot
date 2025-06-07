import { SlashCommandBuilder } from 'discord.js';

export default {
    hidden: true, // Set command flag to hidden

    // Twitch
    name: 'test',
    async reply(client, channel, userState, params, message) {
        client.utils.sendChannelMessage(channel, `Thank you for testing ${userState['display-name']}!`);
    },

    // Discord
    data: new SlashCommandBuilder()
        .setName('test')
        .setDescription('Test command'),
    async execute(interaction) {
        await interaction.reply({ embeds: [interaction.client.utils.buildEmbed('Error', 'We dont know how to implement this command for now?', [], interaction.client.utils.color_error)]});
    },
};