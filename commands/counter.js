const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('counter')
        .setDescription('not created yet'),
    async execute(interaction) {
        await interaction.reply("this command is not functional yet");
    },
};