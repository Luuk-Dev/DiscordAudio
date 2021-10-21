/*
    Written by Luuk - Extive Marketing Manager
    Website: https://www.extive.eu
    Discord: https://www.extive.eu/discord
*/
process.env.TZ = 'Europe/London'; // Timezone
const Discord = require('discord.js');
const discordaudio = require('discordaudio');
const ytdl = require('ytdl-core');

const client = new Discord.Client();

const queue = new Map();

const config = {
    token: 'Your-Secret-Token',
    prefix: '-',
    embedcolor: `#3498eb`
};

client.once('ready', () => {
    console.log(`Started up at ${new Date().toString()}`);
    client.user.setActivity(`music`, {type: 'LISTENING'});
});

client.on('message', async message => {
    if(message.author.bot || message.channel.type === `dm`) return;
    if(!message.content.startsWith(config.prefix)) return;

    let args = message.content.substring(config.prefix.length).split(" ");

    const serverQueue = queue.get(message.guild.id);

    switch(args[0].toLowerCase()){
        case 'play':
            if(!args[1]) return message.channel.send(`Please provide a stream url`);
            if(!args[1].startsWith("https://") && !args[1].startsWith("http://")) return message.channel.send(`The provided stream url is not a valid url!`);
            const voicechannel = message.member.voice.channel;
            if(!voicechannel) return message.channel.send(`You need to join a voice channel before you can play a song`);
            const permissions = voicechannel.permissionsFor(message.guild.me);
            if(!permissions.has(Discord.Permissions.FLAGS.CONNECT) || !permissions.has(Discord.Permissions.FLAGS.SPEAK)) return message.channel.send(`I don't have the permissions to play something in this channel!`);
            const yturl = ytdl.validateURL(args[1]) ? true : false;
            if(!serverQueue){
                const player = new discordaudio.Player(voicechannel);
                const songobject = {
                    url: args[1],
                    youtubeurl: yturl
                };
                const construct = {
                    voicechannel: voicechannel,
                    textchannel: message.channel,
                    songs: [songobject],
                    player: player,
                    loop: false
                };
                queue.set(message.guild.id, construct);
                play(message.guild.id, songobject);
            } else {
                serverQueue.songs.push({url: args[1], youtubeurl: yturl});
                message.channel.send(`Your song has been added to the queue!`);
            }
            break;
        case 'skip':
            if(!message.member.voice.channel) return message.channel.send(`You have to be in a voice channel to skip a song`);
            if(!serverQueue) return message.channel.send(`There is nothing in the queue at the moment`);
            serverQueue.songs.shift();
            const songobject = serverQueue.songs[0];
            play(message.guild.id, songobject);
            message.channel.send(`Song skipped!`);
            break;
        case 'loop':
            if(!message.member.voice.channel) return message.channel.send(`You have to be in a voice channel to enable/disable the loop`);
            if(!serverQueue) return message.channel.send(`There is nothing in the queue at the moment`);
            serverQueue.loop = serverQueue.loop === true ? false : true;
            message.channel.send(`Loop is now **${serverQueue.loop === true ? 'enabled' : 'disabled'}**!`);
            break;
        case 'stop':
            if(!message.member.voice.channel) return message.channel.send(`You have to be in a voice channel to stop a song`);
            if(!serverQueue) return message.channel.send(`There is nothing in the queue at the moment`);
            serverQueue.player.destroy();
            queue.delete(message.guild.id);
            message.channel.send(`Successfully stopped the player!`);
            break;
        case 'queue':
            if(!message.member.voice.channel) return message.channel.send(`You have to be in a voice channel to see the queue`);
            if(!serverQueue) return message.channel.send(`There is nothing in the queue at the moment`);
            var songs = `__**Queue**__`;
            let tot = 1;
            serverQueue.songs.forEach(song => {songs += `\n**[${tot}]** ${song.url}`; ++tot;});
            const queueEmbed = new Discord.MessageEmbed()
            .setAuthor(message.member.user.username, message.member.user.displayAvatarURL({dynamic: true}))
            .setColor(config.embedcolor)
            .setTitle(`Queue`)
            .setDescription(songs);
            message.channel.send(queueEmbed).catch(err => {});
            break;
        case 'pause':
            if(!message.member.voice.channel) return message.channel.send(`You have to be in a voice channel to pause a song`);
            if(!serverQueue) return message.channel.send(`There is nothing in the queue at the moment`);
            serverQueue.player.pause();
            message.channel.send(`Music got paused`);
            break;
        case 'resume':
            if(!message.member.voice.channel) return message.channel.send(`You have to be in a voice channel to resume a song`);
            if(!serverQueue) return message.channel.send(`There is nothing in the queue at the moment`);
            serverQueue.player.resume();
            message.channel.send(`Music is playing again`);
            break;
        case 'volume':
            if(!message.member.voice.channel) return message.channel.send(`You have to be in a voice channel to change the volume of a song`);
            if(!serverQueue) return message.channel.send(`There is nothing in the queue at the moment`);
            if(!args[1]) return message.channel.send(`Please provide the volume in the second argument of the command`);
            if(!isNaN(Number(args[1]))){
                if(Number(args[1]) > 10 || Number(args[1]) < 1) message.channel.send(`The volume must be between the number 1-10`);
                else {
                    serverQueue.player.volume(Number(args[1]));
                    message.channel.send(`The volume has been changed`);
                }
            } else if(!args[1].includes("/")) return message.channel.send(`Invalid volume`);
            else {
                let volume = args[1].split("/");
                if(isNaN(Number(volume[0])) || isNaN(Number(args[1]))) return message.channel.send(`Invalid volume`);
                if(Number(volume[0]) > Number(volume[1])) return message.channel.send(`Invalid volume`);
                serverQueue.player.volume(`${volume[0]}/${volume[1]}`);
                message.channel.send(`The volume has been changed`);
            }
            break;
        case 'reconnect':
            if(!message.member.voice.channel) return message.channel.send(`You have to be in a voice channel to change the volume of a song`);
            if(!serverQueue) return message.channel.send(`There is nothing in the queue at the moment`);
            serverQueue.player.reconnect(2500);
            message.channel.send(`Reconnected :thumbsup:`);
            break;
    }
});

function play(guildId, song){
    const serverQueue = queue.get(guildId);
    serverQueue.player.on('stop', () => {
        if(serverQueue.loop === false) serverQueue.songs.shift();
        play(guildId, serverQueue.songs[0]);
    });
    serverQueue.player.on('play', () => {
        var embed = new Discord.MessageEmbed()
        .setAuthor(client.user.username, client.user.displayAvatarURL({dynamic: true}))
        .setColor(config.embedcolor)
        .setTitle(`Playing a new song`)
        .setDescription(`I am now playing [${serverQueue.songs[0].url}](${serverQueue.songs[0].url})`);
        if(serverQueue.songs[0].youtubeurl === true){
            ytdl.getInfo(serverQueue.songs[0].url).then(info => {
                embed = new Discord.MessageEmbed()
                .setAuthor(client.user.username, client.user.displayAvatarURL({dynamic: true}))
                .setColor(config.embedcolor)
                .setTitle(`Playing ${info.videoDetails.title}`)
                .setDescription(`I am now playing **[${info.videoDetails.title}](${serverQueue.songs[0].url})** by **${info.videoDetails.author.name}**`)
                .setThumbnail(info.videoDetails.thumbnails[0].url);
                serverQueue.textchannel.send(embed);
            }).catch(err => {
                serverQueue.textchannel.send(embed);
                console.log(err);
            });
        } else serverQueue.textchannel.send(embed);
    });
    if(!song){
        serverQueue.player.destroy();
        queue.delete(guildId);
        return;
    }
    serverQueue.player.play(song.url, {
        quality: 'high',
        autoleave: false
    }).catch(err => {
        console.log(err);
        serverQueue.textchannel.send(`There was an error while connecting to the voice channel`);
    });
}

client.login(config.token);