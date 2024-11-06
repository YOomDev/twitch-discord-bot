import { SlashCommandBuilder } from 'discord.js';
import { sleep } from '../discord-bot-base/utils.mjs'

export default {
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
        let time = 0; // TODO: get input from message
        let name = ""; // TODO: get input from message
        sleep(time).then(_ => { interaction.channel.send(`Alarm '${name}' has ended!`); });
        await interaction.reply(`Alarm '${name}' has been started for ${time} seconds.`);
    },
};