# Discord Audio
[![downloadsBadge](https://img.shields.io/npm/dt/discordaudio?style=for-the-badge)](https://npmjs.com/package/discordaudio)
[![versionBadge](https://img.shields.io/npm/v/discordaudio?style=for-the-badge)](https://npmjs.com/package/discordaudio)
[![documentationBadge](https://img.shields.io/badge/Documentation-Click%20here-blue?style=for-the-badge)](https://zyno-studio.gitbook.io/discord-audio)

## 🔧 Installation
Install [Discord Audio](https://npmjs.com/package/discordaudio)
```
$ npm install discordaudio@latest
```
```
$ yarn add discordaudio@latest
```

## ℹ️ About
Discord Audio is a stable and easy to use discord voice channel framework which is compatible with multiple Discord.js versions. Discord Audio makes you able to play your favorite songs in a voice channel with your Discord bot.

## 🔑 Features
* [AudioManager](https://zyno-studio.gitbook.io/discord-audio/classes/audiomanager) - Create a music bot if you are a developer with not many experience
* [Player](https://zyno-studio.gitbook.io/discord-audio/classes/player) - Create a music bot if you are a developer with experience
* [Connection](https://zyno-studio.gitbook.io/discord-audio/classes/connection) - Create a bot that plays a stream that never ends
* [Broadcast](https://zyno-studio.gitbook.io/discord-audio/classes/broadcast) - Create a broadcast to play in multiple servers
* [Adapter](https://zyno-studio.gitbook.io/discord-audio/classes/adapter) - Create an adapter to play a song in a voice channel if you are not using Discord Audio

## 🔗 Links
* [Full documentation](https://zyno-studio.gitbook.io/discord-audio)
* [Support Server](https://www.extive.eu/discord)

## 📖 Example
```js
const { AudioManager } = require('discordaudio');
const discord = require('discord.js');

const client = new discord.Client({intents: [discord.Intents.FLAGS.GUILDS, discord.Intents.FLAGS.GUILD_MESSAGES, discord.Intents.FLAGS.GUILD_VOICE_STATES]});

const config = {
    token: 'Your-Secret-Token',
    prefix: '-'
};

const connections = new Map();

const audioManager = new AudioManager();

client.once('ready', () => console.log(`${client.user.username} is online!`));

client.on('messageCreate', message => {
    if(message.author.bot || message.channel.type === `DM`) return;
    
    if(!message.content.startsWith(config.prefix)) return;
    
    let args = message.content.substring(config.prefix.length).split(" ");
    
    const vc = connections.get(message.guild.me.voice.channel?.id);
    
    switch(args[0].toLowerCase()){
        case 'play':
            if(!message.member.voice.channel && !message.guild.me.voice.channel) return message.channel.send({content: `Please join a voice channel in order to play a song!`});
            if(!args[1]) return message.channel.send({content: `Please provide a song`});
            const uvc = message.member.voice.channel || message.guild.me.voice.channel;
            audioManager.play(uvc, args[1], {
                quality: 'high',
                audiotype: 'arbitrary',
                volume: 10
            }).then(queue => {
                connections.set(uvc.id, uvc);
                if(queue === false) message.channel.send({content: `Your song is now playing!`});
                else message.channel.send({content: `Your song has been added to the queue!`});
            }).catch(err => {
                console.log(err);
                message.channel.send({content: `There was an error while trying to connect to the voice channel!`});
            });
            break;
        case 'skip':
            if(!vc) return message.channel.send({content: `There is currently nothing playing!`});
            audioManager.skip(vc).then(() => message.channel.send({content: `Successfully skipped the song!`})).catch(err => {
                console.log(err);
                message.channel.send({content: `There was an error while skipping the song!`});
            });
            break;
        case 'stop':
            if(!vc) return message.channel.send({content: `There is currently nothing playing!`});
            audioManager.stop(vc);
            message.channel.send({content: `Player successfully stopped!`});            
            break;
        case 'queue':
            if(!vc) return message.channel.send({content: `There is currently nothing playing!`});
            const queue = audioManager.queue(vc).reduce((text, song, index) => {
                if(song.title) text += `**[${index + 1}]** ${song.title}`;
                else text += `**[${index + 1}]** ${song.url}`;
                return text;
            }, `__**QUEUE**__`);
            const queueEmbed = new discord.MessageEmbed()
            .setColor(`BLURPLE`)
            .setTitle(`Queue`)
            .setDescription(queue);
            message.channel.send({embeds: [queueEmbed]});
            break;
        case 'volume':
            if(!vc) return message.channel.send({content: `There is currently nothing playing!`});
            if(!args[1]) return message.channel.send({content: `Please provide the volume`});
            if(Number(args[1]) < 1 || Number(args[1]) > 10) return message.channel.send({content: `Please provide a volume between 1-10`});
            audioManager.volume(vc, Number(args[1]));
            break;
    }
});

client.login(config.token);
```

Do you have an issue or a question? Go to the [issue page](https://github.com/Luuk-Dev/DiscordAudio) or send me a DM on Discord (Luuk#8524)
