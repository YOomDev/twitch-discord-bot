import { getTimeDifference } from './utils/utils.mjs';

export default {
    aliases: ['followtime'],
    // Twitch
    name: 'followage',
    async reply(client, channel, userState, params, message) {
        const follower = client.utils.isFollower(userState['user-id']);
        client.utils.sendChannelMessage(channel, follower < 0 ? 'You have not followed long enough to check' : getTimeDifference(client.utils.getFollowerTime(follower)));
    },
};