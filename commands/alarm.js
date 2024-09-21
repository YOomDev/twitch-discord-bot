const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('alarm')
        .setDescription('Sets a alarm of a specified amount of minutes')
        .addStringOption( option => option
            .setName('name')
            .setDescription('The name of the timer.'))
        .addNumberOption(option => option
            .setName("minutes")
            .setDescription("The amount of minutes the timer should be running for.")),
    async execute(interaction) {
        // TODO
        await interaction.reply("alarm1");
        interaction.channel.send("alarm2");
    },
};