const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('debug')
        .setDescription('Gives some debug info to the developer when it is enabled'),
    async execute(interaction) {

        await interaction.reply("");
    },
};