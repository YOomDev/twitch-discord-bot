import { getTimeDifference } from './utils/utils.mjs';

export default {
    // Twitch
    name: 'accountage',
    async reply(client, channel, userState, params, message) {
        if (!client.utils.isAdminLevel(userState, client.roles.MODERATOR)) { client.utils.sendChannelMessage(channel, client.replies.MOD_NEEDED); return; }
        const username = (params.length < 1 || params[0].length < 1) ? userState['username'] : params[0];
        const creationTime = await client.utils.getAccountAge(username);
        if (creationTime < 0) { client.utils.sendChannelMessage(channel, 'Username does not exist or there was an error getting the required information.'); return; }
        client.utils.sendChannelMessage(channel,`${(params.length < 1 || params[0].length < 1) ? `You have had your account for` : `${username} has had their account for`}  ${getTimeDifference(creationTime)}`);
    },
};