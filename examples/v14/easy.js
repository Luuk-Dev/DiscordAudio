/*
    Written by Luuk - Weijers.one developer
    Website: https://www.weijers.one
    Discord: https://www.weijers.one/discord
*/
const discordaudio = require('discordaudio');
const Discord = require('discord.js');

const config = {
    prefix: '!',
    token: 'Your-Token-Here'
};

const client = new Discord.Client({intents: [Discord.GatewayIntentBits.Guilds, Discord.GatewayIntentBits.GuildVoiceStates, Discord.GatewayIntentBits.GuildMessages, Discord.GatewayIntentBits.MessageContent]});

const audioplayers = new Map();

client.once('ready', () => console.log(`Started!`));

client.on('messageCreate', async message => {
    if(message.author.bot || message.channel.type === Discord.ChannelType.DM) return;

    if(!message.content.startsWith(config.prefix)) return console.log(`No prefix`);
    let args = message.content.substring(config.prefix.length).split(" ");

    switch(args[0].toLowerCase()){
        case 'play':
            if(!args[1]) return message.channel.send({content: `Please specify a stream URL`});
            if(!args[1].startsWith("https://") && !args[1].startsWith("http://")) return message.channel.send({content: `Wait a minute! That's not a URL!`});
            if(!message.member.voice.channel) return message.channel.send({content: `You need to join a voice channel before you can play something`});
            if(audioplayers.get(message.guild.id)) audioplayers.get(message.guild.id).destroy();
            console.log(`Connecting...`);
            const player = new discordaudio.Player(message.member.voice.channel);
            console.log(`Connected`);
            player.play(args[1], {
                quality: 'high',
                autoleave: true
            }).catch(err => {
                message.channel.send({content: `There was an error while trying to play your cool song!`});
                console.log(err);
            });
            player.on('play', () => {
                audioplayers.set(message.guild.id, player);
                message.channel.send({content: `I'm playing your cool song!`});
            });
            player.on('stop', () => {
                audioplayers.delete(message.guild.id, player);
                message.channel.send({content: `Your song is done!`});
            });
            break;
        case 'destroy':
            if(!message.member.voice.channel) return message.channel.send({content: `You need to join a voice channel before you can destroy the player`});
            if(audioplayers.get(message.guild.id)){
                audioplayers.get(message.guild.id).destroy();
                audioplayers.delete(message.guild.id);
            }
            break;
        case 'disconnect':
            if(!message.member.voice.channel) return message.channel.send({content: `You need to join a voice channel before you can disconnect the player`});
            if(audioplayers.get(message.guild.id)){
                audioplayers.get(message.guild.id).disconnect();
                audioplayers.delete(message.guild.id);
            }
            break;
        case 'reconnect':
            if(!message.member.voice.channel) return message.channel.send({content: `You need to join a voice channel before you can reconnect the player`});
            if(audioplayers.get(message.guild.id)) await audioplayers.get(message.guild.id).reconnect(5000);
            break;
        case 'pause':
            if(!message.member.voice.channel) return message.channel.send({content: `You need to join a voice channel before you can pause the player`});
            if(audioplayers.get(message.guild.id)) audioplayers.get(message.guild.id).pause();
            break;
        case 'resume':
            if(!message.member.voice.channel) return message.channel.send({content: `You need to join a voice channel before you can resume the player`});
            if(audioplayers.get(message.guild.id)) audioplayers.get(message.guild.id).resume();
            break;
        case 'volume':
            if(!message.member.voice.channel) return message.channel.send({content: `You have to be in a voice channel to change the volume of a song`});
            if(audioplayers.get(message.guild.id)){
                if(!args[1]) return message.channel.send({content: `Please provide the volume in the second argument of the command`});
                if(!isNaN(Number(args[1]))){
                    if(Number(args[1]) > 10 || Number(args[1]) < 1) message.channel.send({content: `The volume must be between the number 1-10`});
                    else {
                        audioplayers.get(message.guild.id).player.volume(Number(args[1]));
                        message.channel.send({content: `The volume has been changed`});
                    }
                } else if(!args[1].includes("/")) return message.channel.send({content: `Invalid volume`});
                else {
                    let volume = args[1].split("/");
                    if(isNaN(Number(volume[0])) || isNaN(Number(args[1]))) return message.channel.send({content: `Invalid volume`});
                    if(Number(volume[0]) > Number(volume[1])) return message.channel.send({content: `Invalid volume`});
                    audioplayers.get(message.guild.id).player.volume(`${volume[0]}/${volume[1]}`);
                    message.channel.send({content: `The volume has been changed`});
                }
            }
            break;
        case 'isplayable':
            if(!message.member.voice.channel) return message.channel.send({content: `You need to join a voice channel before you can see if the song is playable`});
            if(audioplayers.get(message.guild.id)){
                const playing = await audioplayers.get(message.guild.id).getStatus() === true ? 'The song is playable!' : 'The song is **not** playable!';
                message.channel.send({content: playing});
            }
            break;
        case 'listeners':
            if(audioplayers.get(message.guild.id)) message.channel.send({content: `There are **${String(await audioplayers.get(message.guild.id).getListeners())}** listening in the voice channel!`});
            break;
    }
});

client.login(config.token);
