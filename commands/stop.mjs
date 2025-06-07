import { SlashCommandBuilder } from 'discord.js';

export default {
    hidden: true, // Set command flag to hidden

    // Twitch
    name: 'stop',
    async reply(client, channel, userState, params, message) {
        client.utils.sendChannelMessage(channel, `Thank you for testing the stop command ${userState['display-name']}! Sadly it is not implemented yet...`);
    },

    // Discord
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Command for stopping the bot'),
    async execute(interaction) {
        await interaction.reply({ embeds: [interaction.client.utils.buildEmbed('Error', 'Not implemented yet', [], interaction.client.utils.color_error)]});
    },
};