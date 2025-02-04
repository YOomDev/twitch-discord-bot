import { SlashCommandBuilder } from 'discord.js';
import { sleep } from '../discord-bot-base/utils.mjs'

export default {
    data: new SlashCommandBuilder()
        .setName('alarm')
        .setDescription('Sets a alarm of a specified amount of minutes')
        .addStringOption( option => option
            .setName('name')
            .setDescription('The name of the timer.')
            .setRequired(true))
        .addNumberOption(option => option
            .setName('minutes')
            .setDescription('The amount of minutes the timer should be running for.')
            .setRequired(true)),
    async execute(interaction) {
        // Get the inputs
        let time =  interaction.options.getNumber('minutes');
        let name = interaction.options.getString('name').trim().replaceAll("  ", " ");

        // Make sure the name is able to be displayed
        if (name.length < 1) {
            await interaction.reply("No displayable name has been supplied");
            return;
        }

        // Clamp the time to make sure it is within normal limits
        time = Math.min(Math.max(time, 0.016 /* 1 second */), 1440 /* 1 day */);

        // Start the timer and make sure the user knows it's been started
        await interaction.reply(`Alarm '${name}' has been started for ${time} minutes.`);
        sleep(time * 60).then(_ => { interaction.channel.send(`Alarm '${name}' has ended!`); });
    },
};