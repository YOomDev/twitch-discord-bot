import { loadJSON, saveJSON } from './utils/utils.mjs';

const counter_path = '../data/counters.json';

export default {
    // Twitch
    name: 'counter',
    async reply(client, channel, userState, params, message) {
        if (params.length < 2) { client.utils.sendChannelMessage(channel, client.replies.ARG_NEEDED); }
        const subcommand = params.shift().toLowerCase();
        const counter = params.shift().toLowerCase();
        const maybe_number = (params.length > 0 ? Number.parseInt(params.shift()) : Number.NaN); // third parameter
        const json = loadJSON(counter_path);
        const exists = counter in json;
        if (!exists) { client.utils.logWarn('counter not found'); }
        switch (subcommand) {
            case 'show':
                if (!exists) { client.utils.sendChannelMessage(channel, `Counter ${subcommand} does not exist.`); }
                else { client.utils.sendChannelMessage(channel, `Counter ${counter} is currently ${json[counter]}`); }
                break;
            case 'set':
                if (!client.utils.isAdminLevel(userState, client.roles.MODERATOR)) { client.utils.sendChannelMessage(channel, client.replies.MOD_NEEDED); return; }
                if (Number.isNaN(maybe_number)) { client.utils.sendChannelMessage(channel, client.replies.INVALID_NUMBER); return; }
                json[counter] = maybe_number;
                saveJSON(counter_path, json);
                client.utils.sendChannelMessage(channel, `Counter ${counter} has been set to ${maybe_number}`);
                break;
            case 'add':
                if (!client.utils.isAdminLevel(userState, client.roles.MODERATOR)) { client.utils.sendChannelMessage(channel, client.replies.MOD_NEEDED); return; }
                if (Number.isNaN(maybe_number)) { client.utils.sendChannelMessage(channel, client.replies.INVALID_NUMBER); return; }
                if (!exists) { json[counter] = maybe_number; }
                else { json[counter] += maybe_number; }
                saveJSON(counter_path, json);
                client.utils.sendChannelMessage(channel, `${maybe_number} has been added to ${counter}.`);
                break;
            default:
                client.utils.sendChannelMessage(channel, `Subcommand ${subcommand} not found.`);
                break;
        }
    },
};