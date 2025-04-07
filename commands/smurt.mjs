import { SlashCommandBuilder } from 'discord.js';

export default {
    // Twitch
    name: 'smurt',
    async reply(client, channel, userState, params, message) {
        client.utils.sendChannelMessage(channel, getSmurtMessage());
    },

    // Discord
    data: new SlashCommandBuilder()
        .setName('smurt')
        .setDescription('to be implemented'),
    async execute(interaction) {
        await interaction.reply({ embeds: [interaction.client.utils.buildEmbed('Smurt', getSmurtMessage())]});
    },
};

function randomInt(min, max) { return Math.floor(Math.min(+min, +max)) + Math.floor(Math.random() * (Math.max(+min, +max) - Math.min(+min, +max))); }

const messages = [
    "Smurt!",
    "Very smurt indeed!",
    "That's very smurt!",
    "You are very smurt!",
    "Smurt move!",
];

function getSmurtMessage() {
    return messages[randomInt(0,  messages.length) % messages.length]; // Modulo operator just in case the randomInt function is inclusive, TODO: test if it is inclusive and remove modulo if possible
}