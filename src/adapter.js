"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAdapter = void 0;
const discord_js_1 = require("discord.js");
const adapters = new Map();
const trackedClients = new Set();
/**
 * Tracks a Discord.js client, listening to VOICE_SERVER_UPDATE and VOICE_STATE_UPDATE events.
 * @param client - The Discord.js Client to track
 */
function trackClient(client) {
    if (trackedClients.has(client))
        return;
    trackedClients.add(client);
    client.ws.on(discord_js_1.Constants.WSEvents.VOICE_SERVER_UPDATE, (payload) => {
        if(adapters.get(payload.guild_id)) adapters.get(payload.guild_id).onVoiceServerUpdate(payload);
    });
    client.ws.on(discord_js_1.Constants.WSEvents.VOICE_STATE_UPDATE, (payload) => {
        var user;
        if(client.user) user = client.user;
        else user = {id: null};
        if (payload.guild_id && payload.session_id && payload.user_id === user.id) {
            if(adapters.get(payload.guild_id)) adapters.get(payload.guild_id).onVoiceStateUpdate(payload);
        }
    });
}
const trackedGuilds = new Map();
function cleanupGuilds(shard) {
    const guilds = trackedGuilds.get(shard);
    if (guilds) {
        for (const guildID of guilds.values()) {
            if(adapters.get(guildID)) adapters.get(guildID).destroy();
        }
    }
}
function trackGuild(guild) {
    let guilds = trackedGuilds.get(guild.shard);
    if (!guilds) {
        const cleanup = () => cleanupGuilds(guild.shard);
        guild.shard.on('close', cleanup);
        guild.shard.on('destroyed', cleanup);
        guilds = new Set();
        trackedGuilds.set(guild.shard, guilds);
    }
    guilds.add(guild.id);
}
/**
 * Creates an adapter for a Voice Channel
 * @param channel - The channel to create the adapter for
 */
function createAdapter(channel) {
    return (methods) => {
        adapters.set(channel.guild.id, methods);
        trackClient(channel.client);
        trackGuild(channel.guild);
        return {
            sendPayload(data) {
                if (channel.guild.shard.status === discord_js_1.Constants.Status.READY) {
                    channel.guild.shard.send(data);
                    return true;
                }
                return false;
            },
            destroy() {
                return adapters.delete(channel.guild.id);
            },
        };
    };
}
exports.createAdapter = createAdapter;
