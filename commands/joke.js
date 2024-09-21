const { SlashCommandBuilder } = require('discord.js');
const https = require("https");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('joke')
        .setDescription('Tells a joke.'),
    async execute(interaction) {
        await interaction.reply(interaction.client.utils.buildEmbed("Joke", await getDadJoke(interaction.client.utils)));
    },
};

async function getDadJoke(utils) {
    const id = utils.resolver.createRequest();
    const options = {
        hostname: 'icanhazdadjoke.com',
        headers: { Accept: "text/plain" }
    }
    https.get(options, r => {
        r.setEncoding('utf8');
        r.on('data', data => { utils.resolver.resolveRequest(id, data); });
    }).on('error', err => { utils.loggers.err(err); utils.resolver.resolveRequest(id, "An error occurred trying to process this command.") });
    return (await utils.resolver.getSolvedRequest(id)).toString();
}