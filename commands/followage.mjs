import { getTimeDifference } from './utils/utils.mjs';

export default {
    aliases: ['followtime'],
    // Twitch
    name: 'followage',
    async reply(client, channel, userState, params, message) {
        if (params.length > 0) {
            if (client.utils.isAdminLevel(userState, client.roles.MODERATOR)) {
                if (params[0].length > 0) {
                    const follower = client.utils.isFollower(params[0], 'name');
                    client.utils.sendChannelMessage(channel, follower < 0 ? `${params[0]} has not followed long enough to be checked.` : `${client.utils.getFollowerName(follower)} has followed for ${getTimeDifference(client.utils.getFollowerTime(follower))}. #${client.utils.getFollowerCount()-follower}`);
                    return;
                }
            }
        }
        const follower = client.utils.isFollower(userState['user-id']);
        client.utils.sendChannelMessage(channel, follower < 0 ? 'You have not followed long enough to check.' : `You have followed for ${getTimeDifference(client.utils.getFollowerTime(follower))}.`);
    },
};