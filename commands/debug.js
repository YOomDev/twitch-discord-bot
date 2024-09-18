const { SlashCommandBuilder } = require('discord.js');

const debug = false;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('debug')
        .setDescription('Gives some debug info to the developer when it is enabled.'),
    async executeDiscord(interaction) {
        if (debug) { interaction.client.utils.loggers.data(interaction); }
        await interaction.reply(interaction.client.utils.buildEmbed("Debug", debug ? "Debug data has been given to devs." : "Debugging is currently turned off.", [], debug ? interaction.client.utils.color : interaction.client.utils.color_error));
    },
};