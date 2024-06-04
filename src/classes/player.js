const voice = require('@discordjs/voice');
const { createAdapter } = require('../adapter.js');
const ytstream = require('yt-stream');
const EventEmitter = require('events');
const { ValueSaver } = require('valuesaver');
const { URL } = require('url');
const https = require('https');
const http = require('http');
const dns = require('dns');
const { promisify } = require('util');
const { spawn } = require('child_process');
const { playAudio } = require('../getstream.js');
const reqTypes = {https: https, http: http};
const lookup = promisify(dns.lookup);

let ffmpeg = true;

const ffmpegCheck = spawn('ffmpeg', ['-version']);

ffmpegCheck.on('error', () => {
    ffmpeg = false;
});

const wait = (ms) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve()
    }, ms);
  });
}

const validateURL = (url) => {
    try{
        let u = new URL(url);
        return u.host !== "";
    } catch {
        return false;
    }
}

const globals = {};

let defaultArgs = ['-reconnect', '1', '-reconnect_streamed', '1', '-reconnect_delay_max', '5', '-i', '--audio-url', '-analyzeduration', '0', '-loglevel', '0', '-f', 's16le', '-ar', '48000', '-ac', '2'];

const validateAudio = (url) => {
    return new Promise(async (resolve, reject) => {
        const parsed = new URL(url);

        let family = 4;
        try{
            let _lr = await lookup(parsed.hostname, {hints: 0});
            family = _lr.family;
        } catch {};

        const reqType = reqTypes[parsed.protocol.split(':')[0].toLowerCase()];

        const req = reqType.request({
            host: parsed.hostname,
            path: parsed.pathname + parsed.search,
            headers: {},
            method: 'GET',
            family: family
        }, res => {
            if(res.statusCode >= 400){
                return reject(`Invalid url`);
            } else if(!res.headers['content-type'].startsWith('audio/')){
                return reject(`Url is not an audio`);
            }

            res.on('error', err => {
                reject(err);
            });

            resolve();
        });

        req.on('error', err => {
            reject(err);
        });

        req.end();
    });
}

function connect(connection){
    return new Promise(async (resolve, reject) => {
        try{
            await voice.entersState(connection, voice.VoiceConnectionStatus.Ready, 30e3);
            resolve();
        } catch(error) {
            console.log(`Unable to connect to voice channel`, error);
            connection.destroy();
            reject(error);
        }
    });
}

function createResource(info, player, setPlayerValue){
    return new Promise(async (resolve, reject) => {
        if(globals[player.channel.id].get(`settings`).youtube === false){
            let resource;
            if(typeof info.stream === 'string'){
                if(validateURL(info.stream)){
                    try{
                        await validateAudio(info.stream);
                    } catch (err){
                        reject(err);
                        return;
                    }
                    const _stream = playAudio(info.stream, defaultArgs, globals[player.channel.id].get(`filters`), ffmpeg);
                    resource = voice.createAudioResource(_stream, {
                        inputType: voice.StreamType.Opus,
                        inlineVolume: ffmpeg
                    });
                }
            } else {
                resource = voice.createAudioResource(info.stream, {
                    inputType: info.settings.audiotype,
                    inlineVolume: ffmpeg
                });
            }
            if(ffmpeg) resource.volume.setVolumeLogarithmic(info.settings['volume'] / 1);
            globals[player.channel.id].get(`player`).play(resource);
            try{
                await voice.entersState(globals[player.channel.id].get(`player`), voice.AudioPlayerStatus.Playing, 10e3);
            } catch(err) {
                reject(err);
                return;
            }
            setPlayerValue('playing', true);
            if(globals[player.channel.id].get(`resource`)){
                var oldResource = globals[player.channel.id].get(`resource`);
                if(typeof oldResource.playStream !== 'undefined'){
                    globals[player.channel.id].get(`resource`).playStream.destroy();
                }
            }
            globals[player.channel.id].set(`resource`, resource);
            resolve(resource);
        } else {
            const vidID = ytstream.getID(info.stream);
            const yturl = `https://www.youtube.com/watch?v=${vidID}`;
            
            let playable_stream;
            try{
                playable_stream = await ytstream.stream(yturl, {
                    quality: info.settings.quality,
                    type: 'audio',
                    highWaterMark: 1048576 * 16,
                    download: true
                });
            } catch (err){
                reject(`There was an error while getting the YouTube video url: ${err}`);
                return;
            }
            let _stream;
            if(ffmpeg){
                _stream = playAudio(playable_stream.url, [...defaultArgs], [...globals[player.channel.id].get(`filters`)], ffmpeg);
            } else {
                _stream = playable_stream.stream;
            }
            const resource = voice.createAudioResource(_stream, {
                inputType: ffmpeg ? voice.StreamType.Opus : (playable_stream.type === "webm/opus" ? voice.StreamType.WebmOpus : voice.StreamType.Arbitrary),
                inlineVolume: ffmpeg
            });
            
            if(ffmpeg) resource.volume.setVolumeLogarithmic(info.settings['volume'] / 1);

            globals[player.channel.id].get(`player`).play(resource);
            try{
                await voice.entersState(globals[player.channel.id].get(`player`), voice.AudioPlayerStatus.Playing, 5e3);
            } catch(err){
                reject(err);
                return;
            }
            setPlayerValue('playing', true);
            if(globals[player.channel.id].get(`resource`)){
                var oldResource = globals[player.channel.id].get(`resource`);
                if(typeof oldResource.playStream !== 'undefined'){
                    globals[player.channel.id].get(`resource`).playStream.destroy();
                }
            }
            globals[player.channel.id].set(`resource`, resource);
            resolve(resource);
        }
    });
}

function idleCallback(channelId, guildId, playerC){
    if(globals[channelId] instanceof ValueSaver){
        if(!globals[channelId].get(`resource`) || playerC.playing === false) return;
        globals[channelId].delete(`resource`);
        if(globals[channelId].get(`settings`)['autoleave'] === true) if(voice.getVoiceConnection(guildId)) voice.getVoiceConnection(guildId).disconnect();
        playerC.playing = false;
        playerC.emit(`stop`, globals[channelId].get(`stream`));
    }
}

function createPlayer(channelId, guildId, playerC){
    const player = voice.createAudioPlayer({
        behaviors: {
            noSubscriber: voice.NoSubscriberBehavior.Play
        }
    });

    player.on(voice.AudioPlayerStatus.Idle, () => {
        idleCallback(channelId, guildId, playerC);
    });

    return player;
}

class Player extends EventEmitter {
    /**
    * Creates a music player to play your songs in
    * @param {object} channel The channel to play music in
    * @example
    * const player = new Player(<channel>);
    */
    constructor(channel, options){

        if(channel === undefined || typeof channel === "undefined" || channel === "") throw new Error(`A valid channel is required to provide as an argument`);
        if(typeof options !== 'object' || options === null || Array.isArray(options)) options = {};
        super();
        if(options.ffmpeg === false){
            ffmpeg = false;
        }
        this.channel = channel;
        this.destroyed = false;

        const player = createPlayer(this.channel.id, this.channel.guild.id, this);

        globals[this.channel.id] = new ValueSaver();
        globals[this.channel.id].set(`player`, player);
        globals[this.channel.id].set(`filters`, []);
        
    }
    /**
    * To play a song in a voice channel.
    * @param {string} stream The stream to play in the voice channel.
    * @param {object} options Optional options.
    * @returns {Promise<string>} Returns an error if the connection failed.
    * 
    * @example
    * player.play('https://www.youtube.com/watch?v=dQw4w9WgXcQ', {
    *     autoleave: true,
    *     quality: 'high',
    *     selfDeaf: true,
    *     selfMute: false
    * })
    * .then(() => console.log(`Playing the song`))
    * .catch(console.error);
    * */
    play(stream, options){
        return new Promise(async (resolve, reject) => {
            if(!globals[this.channel.id]){
                globals[this.channel.id] = new ValueSaver();
                globals[this.channel.id].set(`player`, createPlayer(this.channel.id, this.channel.guild.id, this));
                globals[this.channel.id].set(`filters`, []);
            }
            if(stream === undefined || typeof stream === "undefined" || stream === "") return reject(c`A valid channel is required to provide as an argument`);

            var currentResource = globals[this.channel.id].get(`resource`);
            var subscribtion = globals[this.channel.id].get(`subscription`);
            if(subscribtion){
                subscribtion.unsubscribe();
                globals[this.channel.id].delete(`subscription`);
            }
            if(currentResource){
                if(this.playing === true){
                    this.playing = false;
                }
                if(currentResource.audioPlayer){
                    try{
                        currentResource.audioPlayer.stop(true);
                        currentResource.audioPlayer.destroy();
                    } catch {}
                }
                globals[this.channel.id].delete(`resource`);
            }

            globals[this.channel.id].set(`stream`, stream);
            const settings = {
                autoleave: false,
                quality: 'high',
                selfDeaf: true,
                selfMute: false,
                youtube: null,
                audiotype: voice.StreamType.Arbitrary,
                volume: globals[this.channel.id].get(`volume`) || 1
            };
            const yturl = ytstream.validateVideoURL(stream) ? true : false;
            if(options){
                if(typeof options.autoleave === 'boolean') settings['autoleave'] = Boolean(options.autoleave);
                if(typeof options.selfDeaf === 'boolean') settings['selfDeaf'] = Boolean(options.selfDeaf);
                if(typeof options.selfMute === 'boolean') settings['selfMute'] = Boolean(options.selfMute);
                if(typeof options.quality === 'string'){
                    var qu = options.quality.toLowerCase() === 'high' ? 1000 : 0;
                    settings['quality'] = qu;
                }
                if(typeof options.audiotype === 'string') settings['audiotype'] = options.audiotype.toLowerCase();
                if(typeof options.volume === 'number'){
                    if(options.volume > 1 || options.volume < 0) throw new Error(`Please provide a number between 0-1 for the volume`);
                    settings['volume'] = options.volume;
                    globals[this.channel.id].set(`volume`, settings['volume'] / 1);
                }
                settings['youtube'] = yturl;
            }
            globals[this.channel.id].set(`currentOptions`, options);

            globals[this.channel.id].set(`settings`, settings);
            try{
                await createResource({
                    settings: settings,
                    stream: stream
                }, this, (key, val) => {
                    this[key] = val;
                });
            } catch (err){
                reject(err);
            }
            if(!globals[this.channel.id].get(`connection`) || this.connected === false){
                const connection = voice.joinVoiceChannel({
                    channelId: this.channel.id,
                    guildId: this.channel.guild.id,
                    adapterCreator: createAdapter(this.channel),
                    selfDeaf: settings.selfDeaf,
                    selfMute: settings.selfMute
                });
                connect(connection).then(async () => {
                    const subscribtion = connection.subscribe(globals[this.channel.id].get(`player`));
                    globals[this.channel.id].set(`subscription`, subscribtion);
                    globals[this.channel.id].set(`connection`, connection);
                    this.connected = true;
                    connection.on(voice.VoiceConnectionStatus.Disconnected, () => {
                        if(this.playing === false) return;
                        this.playing = false;
                        this.connected = false;
                        this.emit(`disconnect`, this.channel.id);
                    });
                    connection.on(voice.VoiceConnectionStatus.Destroyed, () => {
                        if(this.playing === false) return;
                        this.playing = false;
                        this.connected = false;
                        this.removeAllListeners(`stop`);
                        this.emit(`destroy`, this.channel.id);
                    });
                    this.emit(`play`, globals[this.channel.id].get(`stream`));
                    this.removeAllListeners(`play`);
                    resolve(stream);
                }).catch(err => {
                    this.playing = false;
                    reject(`There was an error while establishing a stable connection ${err}`);
                });
            } else {
                const subscribtion = globals[this.channel.id].get(`connection`).subscribe(globals[this.channel.id].get(`player`));
                globals[this.channel.id].set(`subscription`, subscribtion);
                this.emit(`play`, globals[this.channel.id].get(`stream`));
                this.removeAllListeners(`play`);
                resolve();
            }
        });
    }
    /**
     * Destroys the voice connection.
     * @example
     * player.destroy();
     */
    destroy(){
        this.destroyed = true;
        if(globals[this.channel.id].get(`connection`)) globals[this.channel.id].get(`connection`).destroy();
        idleCallback(this.channel.id, this.channel.guild.id, this);
        delete globals[this.channel.id];
    }
    /**
     * Disconnects with the voice connection.
     * @example
     * player.disconnect();
     */
    disconnect(){
        if(globals[this.channel.id].get(`connection`)) globals[this.channel.id].get(`connection`).disconnect();
        idleCallback(this.channel.id, this.channel.guild.id, this);
    }
    /**
     * Reconnects to a voice connection.
     * @param {number} timeout How many miliseconds the bot needs to wait before connecting to the voice connection again. Default is 2000 miliseconds.
     * @returns {Promise} Returns an error if the connection failed
     * @example
     * player.reconnect(3000)
     *   .then(() => console.log(`Successfully reconnected`))
     *   .catch(console.error);
     */
    reconnect(timeout){
        return new Promise(async (resolve, reject) => {
            globals[this.channel.id].get(`connection`).destroy();
            await wait(timeout || 2000);
            const connection = voice.joinVoiceChannel({
                channelId: this.channel.id,
                guildId: this.channel.guild.id,
                adapterCreator: createAdapter(this.channel),
                selfDeaf: globals[this.channel.id].get(`settings`).selfDeaf,
                selfMute: globals[this.channel.id].get(`settings`).selfMute
            });
            connect(connection).then(() => {
                globals[this.channel.id].set(`subscription`, connection.subscribe(globals[this.channel.id].get(`player`)));
                globals[this.channel.id].set(`connection`, connection);
                this.playing = true;
                resolve();
            }).catch(err => {
                reject(`There was an error while reconnecting to the channel ${err}`);
                this.playing = false;
            });
        });
    }
    /**
     * Pauses the song that's playing.
     * @example
     * player.pause();
     */
    pause(){
        globals[this.channel.id].get(`subscription`).player.pause();
    }
    /**
     * Resumes a song that has been paused.
     * @example
     * player.resume();
     */
    resume(){
        globals[this.channel.id].get(`subscription`).player.unpause();
    }
    /**
     * Checks if the song is playable.
     * @returns {Boolean} Returns true if the song is playable, returns false if the song is not playable.
     * @example
     *  if(player.getStatus() === true) console.log(`The song is playable!`);
     *  else console.log(`The song is not playable!`);
     */
    getStatus(){
        return globals[this.channel.id].get(`subscription`).player.checkPlayable();
    }
    /**
     * Gets the amount of members in the same voice channel with the bot
     * @returns {number} The amount of members in the voice channel
     */
    getListeners(){
        return this.channel.members.size;
    }
    /**
     * Changes the volume of the song
     * @param {number | string} volume The volume of the song
     * @example
     * player.volume("3/20"); // Sets the volume to 3/20
     * player.volume(3); // Sets the volume to 3/10
     */
    volume(volume){
        if(ffmpeg === false) return false;
        if(typeof volume !== "string" && typeof volume !== "number") throw new Error(`The volume must be a string or a number`);
        if(!globals[this.channel.id].get(`resource`)) return;
        if(typeof volume === "number"){
            if(volume > 10) throw new Error(`The maximum volume number is 10`);
            globals[this.channel.id].set(`volume`, volume / 10);
            globals[this.channel.id].get(`resource`).volume.setVolumeLogarithmic(volume / 10);
        } else {
            let volumestring = volume;
            if(!volumestring.includes("/")) volumestring += "/ 10";
            let vol = volumestring.split("/");
            if(Number(vol[0]) > Number(vol[1])) throw new Error(`The base volume may not be higher than the max volume`);
            globals[this.channel.id].set(`volume`, parseInt(vol[0]) / parseInt(vol[1]));
            globals[this.channel.id].get(`resource`).volume.setVolumeLogarithmic(parseInt(vol[0]) / parseInt(vol[1]));
        }
    }
    setFilter(...filters){
        return new Promise(async (resolve, reject) => {
            let _f = globals[this.channel.id].get(`filters`);
            for(let i = 0; i < filters.length; i++){
                if(Array.isArray(filters[i])){
                    for(let z = 0; z < filters[i].length; z++){
                        if(typeof filters[i][z] === 'string' && _f.indexOf(filters[i][z]) < 0 && defaultArgs.indexOf(filters[i][z]) < 0){
                            _f.push(filters[i][z]);
                        }
                    }
                } else if(typeof filters[i] === 'string' && _f.indexOf(filters[i]) < 0 && defaultArgs.indexOf(filters[i]) < 0){
                    _f.push(filters[i]);
                }
            }

            globals[this.channel.id].set(`filters`, _f);

            if(this.playing === false) resolve();
            else {
                let currentStream = globals[this.channel.id].get(`stream`);
                let currentOptions = globals[this.channel.id].get(`currentOptions`);

                this.play(currentStream, currentOptions).then(() => resolve()).catch(reject);
            }
        });
    }
    removeFilter(...filters){
        return new Promise(async (resolve, reject) => {
            let _f = globals[this.channel.id].get(`filters`);
            for(let i = 0; i < filters.length; i++){
                let filterIndex = _f.indexOf(filters[i]);
                if(Array.isArray(filters[i])){
                    for(let z = 0; z < filters[i].length; z++){
                        filterIndex = _f.indexOf(filters[i][z]);
                        if(typeof filters[i][z] === 'string' && filterIndex >= 0){
                            _f.splice(filterIndex, 1);
                        }
                    }
                } else if(typeof filters[i] === 'string' && filterIndex >= 0){
                    _f.splice(filterIndex, 1);
                }
            }
            globals[this.channel.id].set(`filters`, _f);

            if(this.playing === false) resolve();
            else {
                let currentStream = globals[this.channel.id].get(`stream`);
                let currentOptions = globals[this.channel.id].get(`currentOptions`);

                this.play(currentStream, currentOptions).then(() => resolve()).catch(reject);
            }
        });
    }
    getFilters(){
        return [...globals[this.channel.id].get(`filters`)];
    }
};

module.exports = {Player};

/**
 * Emitted when the audio starts playing
 * @event Player#play
 * @param {string} url The url of the stream
 */

/**
 * Emitted when the audio ended or stopped
 * @event Player#stop
 * @param {string} url The url of the stream that ended
 */

/**
 * Emitted when the bot gets disconnected of the voice channel
 * @event Player#disconnect
 * @param {string} channelid The id of the channel where the bot got disconnected of
 */

/**
 * Emitted when the player gets destroyed
 * @event Player#destroy
 * @param {string} channelid The id of the channel where the connection of the bot got destroyed
 */
