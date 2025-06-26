import { SlashCommandBuilder } from 'discord.js';

export default {
    // Twitch
    name: 'cookie',
    aliases: ['cookies'],
    async reply(client, channel, userState, params, message) {
        client.utils.sendChannelMessage(channel, `You have ${client.utils.getCookies(userState['display-name'])} cookie(s). ${!client.utils.isAdminLevel(userState, client.utils.PRIME) ? '(You need to have a subscription to earn more cookies)' : ''}`);
    },

    // Discord
    data: new SlashCommandBuilder()
        .setName('cookie')
        .setDescription('Cookies!'),
    async execute(interaction) {
        await interaction.reply({ embeds: [interaction.client.utils.buildEmbed('Error', 'Not implemented yet', [], interaction.client.utils.color_error)]});
    },
};