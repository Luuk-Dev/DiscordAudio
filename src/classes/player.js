const voice = require('@discordjs/voice');
const { createAdapter } = require('../adapter.js');
const ytstream = require('yt-stream');
const playdl = require('play-dl');
const EventEmitter = require('events');
const constants = require('../util/constants.js');
const { ValueSaver } = require('valuesaver');

const wait = (ms) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve()
    }, ms);
  });
}

function connect(connection){
    return new Promise(async (resolve, reject) => {
        try{
            await voice.entersState(connection, voice.VoiceConnectionStatus.Ready, 30e3);
            resolve();
        } catch(error) {
            connection.destroy();
            reject(error);
        }
    });
}

const globals = {};

class Player extends EventEmitter {
    /**
    * Creates a music player to play your songs in
    * @param {object} channel The channel to play music in
    * @example
    * const player = new Player(<channel>);
    */
    constructor(channel){

        if(channel === undefined || typeof channel === "undefined" || channel === "") throw new Error(constants.ERRORMESSAGES.REQUIRED_PARAMETER_CHANNEL);
        super();
        this.channel = channel;

        const player = voice.createAudioPlayer({
            behaviors: {
                noSubscriber: voice.NoSubscriberBehavior.Play
            }
        });

        globals[this.channel.id] = new ValueSaver();
        globals[this.channel.id].set(`player`, player);
        
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
        return new Promise((resolve, reject) => {
            if(stream === undefined || typeof stream === "undefined" || stream === "") return reject(new Error(constants.ERRORMESSAGES.REQUIRED_PARAMETER_STREAM));

            var audiostream = stream;
            globals[this.channel.id].set(`stream`, stream);
            const settings = {
                autoleave: false,
                quality: 'low',
                selfDeaf: true,
                selfMute: false,
                youtube: null,
                audiotype: voice.StreamType.Arbitrary,
                volume: 1
            };
            const yturl = ytstream.validateURL(audiostream) ? true : false;
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
                    if(options.volume > 1 || options.volume < 0) throw new Error(constants.ERRORMESSAGES.VOLUME_MAX);
                    settings['volume'] = options.volume;
                }
                settings['youtube'] = yturl;
            }

            globals[this.channel.id].set(`settings`, settings);

            if(this.playing === true){
                this.playing = false;
            }
            if(globals[this.channel.id].get(`settings`).youtube === false){
                const resource = voice.createAudioResource(audiostream, {
                    inputType: settings.audiotype,
                    inlineVolume: true
                });
                resource.playStream.on('end', () => {
                    this.emit(constants.EVENTS.AUDIO_END, audiostream);
                    this.playing = false;
                    if(settings['autoleave'] === true) if(voice.getVoiceConnection(this.channel.guild.id)) voice.getVoiceConnection(this.channel.guild.id).disconnect();
                });
                resource.encoder.on('error', error => {
                    reject(new Error(`${constants.ERRORMESSAGES.ENCODER_ERROR} ${error}`));
                });
                resource.volume.setVolumeLogarithmic(settings['volume'] / 1);
                globals[this.channel.id].get(`player`).play(resource);
                voice.entersState(globals[this.channel.id].get(`player`), voice.AudioPlayerStatus.Playing, 5e3);
                if(globals[this.channel.id].get(`resource`)) globals[this.channel.id].get(`resource`).playStream.destroy();
                globals[this.channel.id].set(`resource`, resource);
            } else {
                const vidID = ytstream.getID(audiostream)
                const yturl = `https://www.youtube.com/watch?v=${vidID}`;
                playdl.stream(yturl, {
                    quality: settings.quality,
                    discordPlayerCompatibility: true
                }).then(playable_stream => {
                    const resource = voice.createAudioResource(playable_stream.url, {
                        inputType: playable_stream.type,
                        inlineVolume: true
                    });
                    resource.playStream.on('end', () => {
                        this.emit(constants.EVENTS.AUDIO_END, audiostream);
                        this.playing = false;
                        if(settings['autoleave'] === true) if(voice.getVoiceConnection(this.channel.guild.id)) voice.getVoiceConnection(this.channel.guild.id).disconnect();
                    });
                    resource.volume.setVolumeLogarithmic(settings['volume'] / 1);
                    globals[this.channel.id].get(`player`).play(resource);
                    voice.entersState(globals[this.channel.id].get(`player`), voice.AudioPlayerStatus.Playing, 5e3);
                    if(globals[this.channel.id].get(`resource`)) globals[this.channel.id].get(`resource`).playStream.destroy();
                    globals[this.channel.id].set(`resource`, resource);
                }).catch(err => {
                    reject(new Error(constants.ERRORMESSAGES.YOUTUBE_STREAM_FAILED));
                    return;
                });
            }
            if(!globals[this.channel.id].get(`connection`) || this.connected === false){
                const connection = voice.joinVoiceChannel({
                    channelId: this.channel.id,
                    guildId: this.channel.guild.id,
                    adapterCreator: createAdapter(this.channel),
                    selfDeaf: settings.selfDeaf,
                    selfMute: settings.selfMute
                });
                connect(connection).then(() => {
                    const subscribtion = connection.subscribe(globals[this.channel.id].get(`player`));
                    globals[this.channel.id].set(`subscription`, subscribtion);
                    globals[this.channel.id].set(`connection`, connection);
                    this.connected = true;
                    connection.on(voice.VoiceConnectionStatus.Disconnected, () => {
                        if(this.playing === false) return;
                        this.playing = false;
                        this.connected = false;
                        this.emit(constants.EVENTS.AUDIO_CONNECTION_DISCONNECT, this.channel.id);
                    });
                    connection.on(voice.VoiceConnectionStatus.Destroyed, () => {
                        if(this.playing === false) return;
                        this.playing = false;
                        this.connected = false;
                        this.removeAllListeners(`stop`);
                        this.emit(constants.EVENTS.AUDIO_CONNECTION_DESTROY, this.channel.id);
                    });
                    this.emit(constants.EVENTS.AUDIO_PLAY, globals[this.channel.id].get(`stream`));
                    this.removeAllListeners(constants.EVENTS.AUDIO_PLAY);
                    resolve(audiostream);
                }).catch(err => {
                    this.playing = false;
                    reject(`${constants.ERRORMESSAGES.CONNECTION_FAILED} ${err}`);
                });
            } else {
                const subscribtion = globals[this.channel.id].get(`connection`).subscribe(globals[this.channel.id].get(`player`));
                globals[this.channel.id].set(`subscription`, subscribtion);
                this.emit(constants.EVENTS.AUDIO_PLAY, globals[this.channel.id].get(`stream`));
                this.removeAllListeners(constants.EVENTS.AUDIO_PLAY);
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
        if(globals[this.channel.id].get(`connection`)) globals[this.channel.id].get(`connection`).destroy();
    }
    /**
     * Disconnects with the voice connection.
     * @example
     * player.disconnect();
     */
    disconnect(){
        if(globals[this.channel.id].get(`connection`)) globals[this.channel.id].get(`connection`).disconnect();
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
                reject(`${constants.ERRORMESSAGES.RECONNECT_ERROR} ${err}`);
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
        if(typeof volume !== "string" && typeof volume !== "number") throw new Error(constants.ERRORMESSAGES.INVALID_VOLUME_PARAMETER);
        if(typeof volume === "number"){
            if(volume > 10) throw new Error(constants.ERRORMESSAGES.VOLUME_MAX_10);
            globals[this.channel.id].get(`resource`).volume.setVolumeLogarithmic(volume / 10);
        } else {
            let volumestring = volume;
            if(!volumestring.includes("/")) volumestring += "/ 10";
            let vol = volumestring.split("/");
            if(Number(vol[0]) > Number(vol[1])) throw new Error(constants.ERRORMESSAGES.VOLUME_INVALID_HIGHER);
            globals[this.channel.id].get(`resource`).volume.setVolumeLogarithmic(Number(vol[0]) / Number(vol[1]));
        }
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
