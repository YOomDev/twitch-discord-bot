import { SlashCommandBuilder } from 'discord.js';
import { getTimeDifference } from './utils/utils.mjs';

export default {
    // Twitch
    name: 'uptime',
    async reply(client, channel, userState, params, message) {
        if (params.length < 1) { params.push(""); }
        switch (params[0].toLowerCase()) {
            case 'bot':
                client.utils.sendChannelMessage(channel, `Bot has been running for ${getTimeDifference(client.utils.startTime, new Date().getTime(), true)}!`);
                break;
            case 'stream':
            default:
                client.utils.sendChannelMessage(channel, (client.utils.streamStartTime === client.utils.startTime && client.utils.streamStartTime > 0) ? `Stream has been live for ${getTimeDifference(client.utils.streamStartTime, new Date().getTime(), true)}!` : 'Stream is currently not live.');
                break;
        }
    },

    // Discord
    data: new SlashCommandBuilder()
        .setName('uptime')
        .setDescription('Displays bot uptime.'),
    async execute(interaction) {
        await interaction.reply(`Bot has been live for ${getTimeDifference(interaction.client.utils.startTime, new Date().getTime(), true)}.`);
    },
};