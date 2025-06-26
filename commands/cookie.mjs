import { SlashCommandBuilder } from 'discord.js';

export default {
    // Twitch
    name: 'cookie',
    async reply(client, channel, userState, params, message) {
        client.utils.sendChannelMessage(channel, `Cookies!?!?? (To be continued)`);
        // TODO
    },

    // Discord
    data: new SlashCommandBuilder()
        .setName('cookie')
        .setDescription('Cookies!'),
    async execute(interaction) {
        await interaction.reply({ embeds: [interaction.client.utils.buildEmbed('Error', 'Not implemented yet', [], interaction.client.utils.color_error)]});
    },
};