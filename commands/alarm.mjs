import { SlashCommandBuilder } from 'discord.js';
import { sleep } from './utils/utils.mjs'

export default {
    // Twitch
    name: 'alarm',
    async reply(client, channel, userState, params, message) {
        if (!client.utils.isAdminLevel(userState, client.roles.BROADCASTER)) { client.utils.sendChannelMessage(channel, 'You do not have the permissions to use this command!'); return; }
        if (params.length < 2) { client.utils.sendChannelMessage(channel, 'Not enough arguments to run this command!'); return; }
        const name = params[0];
        const number = parseInt(params[1]);
        if (isNaN(number)) { client.utils.sendChannelMessage(channel, 'Second argument is not a number!'); return; }
        const total = Math.max(number, 0.017); // Clamp the timer to anything above one second
        const hours = Math.floor(total / 60);
        const minutes = Math.floor(total - (hours * 60));
        const seconds = Math.floor((total - (hours * 60 + minutes)) * 60);
        let time = hours > 0 ? `${hours} hour${hours > 1 ? 's' : ''}`.toString() : '';
        if (minutes > 0) { time += `${time.length > 0 ? ' and ' : ''}${minutes} minute${minutes > 1 ? 's' : ''}`.toString(); }
        if (seconds > 0) { time += `${time.length > 0 ? ' and ' : ''}${seconds} second${seconds > 1 ? 's' : ''}`.toString(); }
        client.utils.sendChannelMessage(channel, `Timer \'${name}\' started for ${time}.`);
        sleep(60 * total).then(_ => { client.utils.sendChannelMessage(channel, `Timer \'${name}\' ended.`); /*playAudio(`${name}.mp3`).catch(err => logError(err))*/ });
    },

    // Discord
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
            await interaction.reply('No displayable name has been supplied');
            return;
        }

        // Clamp the time to make sure it is within normal limits
        time = Math.min(Math.max(time, 0.016 /* 1 second */), 1440 /* 1 day */);

        // Start the timer and make sure the user knows it's been started
        await interaction.reply(`Alarm '${name}' has been started for ${time} minutes.`);
        sleep(time * 60).then(_ => { interaction.channel.send(`Alarm '${name}' has ended!`); });
    },
};