const voice = require('@discordjs/voice');
const EventEmitter = require('events');
const { createAdapter } = require('../adapter.js');
const constants = require('../util/constants.js');

function connect(connection){
    return new Promise(async (resolve, reject) => {
        try{
            await voice.entersState(connection, voice.VoiceConnectionStatus.Ready, 30e3);
            resolve();
        } catch (error) {
            connection.destroy();
            reject(error);
        }
    });
};

const globals = {};

class Connection extends EventEmitter {
    /**
     * Creates a voice connection with a voice channel.
     * @param channel The voice channel to play a stream in.
     * @param {object} options Optional options.
     * @example
     * const connection = new Connection(<channel>, {
     *   selfDeaf: true,
     *   selfMute: false
     * });
     */
    constructor(channel, options){
        if(typeof channel === 'undefined' || channel === undefined || channel === "") throw new Error(constants.ERRORMESSAGES.REQUIRED_PARAMETER_CHANNEL);
        super();

        this.channel = channel;
        globals[this.channel.id] = new Map();

        const settings = {
            selfDeaf: true,
            selfMute: false
        };

        if(options){
            if(typeof options.selfDeaf === 'boolean') settings.selfDeaf = options.selfDeaf;
            if(typeof options.selfMute === 'boolean') settings.selfMute = options.selfMute;
        }

        const connection = voice.joinVoiceChannel({
            channelId: this.channel.id,
            guildId: this.channel.guild.id,
            adapterCreator: createAdapter(this.channel),
            selfDeaf: settings.selfDeaf,
            selfMute: settings.selfMute
        });
        globals[this.channel.id].set(`connection`, connection);
        globals[this.channel.id].set(`settings`, settings);
    }
    /**
     * 
     * @param {string} stream The stream to play in the voice connection.
     * @param {object} options Optional options.
     * @returns {Promise} Returns an error if there was an error while connecting to the voice channnel.
     * @example
     * connection.play('https://somecoolsite.com/somereallycoolstream.mp3', {
     *   noListeners: 'play', // What to do if there are no members in the voice channel
     *   volume: 1 // The volume of the stream, max volume is 1
     * })
     * .then(() => console.log(`The stream is playing!`))
     * .catch(console.error);
     */
    play(stream, options){
        return new Promise((resolve, reject) => {
            if(typeof stream === 'undefined' || stream === undefined || stream === "") return reject(new Error(constants.ERRORMESSAGES.REQUIRED_PARAMETER_STREAM));

            var volume = 1;
            var noSubscriberBehavior = voice.NoSubscriberBehavior.Play;
            var audiotype = voice.StreamType.Arbitrary;

            if(options){
                if(options.noListeners){
                    if(options.noListeners.toLowerCase() === 'pause') noSubscriberBehavior = voice.NoSubscriberBehavior.Pause;
                    else if(options.noListeners.toLowerCase() === 'play') noSubscriberBehavior = voice.NoSubscriberBehavior.Play;
                    else if(options.noListeners.toLowerCase() === 'stop') noSubscriberBehavior = voice.NoSubscriberBehavior.Stop;
                }

                if(options.volume){
                    if(isNaN(options.volume)) throw new Error(constants.ERRORMESSAGES.VOLUME_NAN);
                    else if(options.volume > 1) throw new Error(constants.ERRORMESSAGES.VOLUME_MAX_1);
                    else volume = options.volume;
                }
                if(options.audiotype) if(typeof options.audiotype === 'string') audiotype = options.audiotype.toLowerCase();
            }

            const player = voice.createAudioPlayer({
                behaviors: {
                    noSubscriber: noSubscriberBehavior
                }
            });
                
            const resource = voice.createAudioResource(stream, {
                inputType: audiotype,
                inlineVolume: true
            });
            resource.volume.setVolume(volume);

            resource.playStream.on('end', () => {
                this.emit(constants.EVENTS.CONNECTION_END, stream);
            });

            resource.encoder.on('error', error => {
                throw new Error(`${constants.ERRORMESSAGES.ENCODER_ERROR} ${error}`);
            });

            player.play(resource);
            voice.entersState(player, voice.AudioPlayerStatus.Playing, 5e3);

            globals[this.channel.id].set(`resource`, resource);
            globals[this.channel.id].set(`player`, player);

            connect(globals[this.channel.id].get(`connection`)).then(() => {
                globals[this.channel.id].set(`subscription`, globals[this.channel.id].get(`connection`).subscribe(player));
                this.type = 'stream';
                globals[this.channel.id].get(`connection`).on(voice.VoiceConnectionStatus.Disconnected, () => {
                    this.emit(constants.EVENTS.CONNECTION_DISCONNECT, this.channel.id);
                });
                globals[this.channel.id].get(`connection`).on(voice.VoiceConnectionStatus.Destroyed, () => {
                    this.emit(constants.EVENTS.CONNECTION_DESTROY, this.channel.id);
                });
                this.emit(constants.EVENTS.CONNECTION_PLAY, stream);
                resolve(stream);
            }).catch(err => {
                reject(`${constants.ERRORMESSAGES.CONNECTION_FAILED} ${err}`);
            });
        });
    }
    /**
     * Plays a broadcast in the voice connection. You can create a broadcast by using the Broadcast class.
     * @param broadcast The broadcast to play.
     * @returns {Promise} Returns an error if there is an error.
     * @example
     * connection.subscribe(<broadcast>)
     * .then(() => console.log(`Successfully started playing the broadcast`))
     * .catch(console.error);
     */
    subscribe(broadcast){
        return new Promise((resolve, reject) => {
            if(typeof broadcast === 'undefined' || broadcast === undefined || broadcast === "") throw new Error(constants.ERRORMESSAGES.REQUIRED_PARAMETER_BROADCAST);

            globals[this.channel.id].set(`broadcast`, broadcast);
            connect(globals[this.channel.id].get(`connection`)).then(() => {
                const map = broadcast._getValueSaver();
                globals[this.channel.id].set(`subscription`, globals[this.channel.id].get(`connection`).subscribe(map.get(`player`)));
                this.type = 'broadcast';
                this.emit(constants.EVENTS.CONNECTION_BROADCAST_SUBSCRIBE);
                globals[this.channel.id].get(`connection`).on(voice.VoiceConnectionStatus.Disconnected, () => {
                    this.emit(constants.EVENTS.CONNECTION_BROADCAST_DISCONNECT, this.channel.id);
                });
                globals[this.channel.id].get(`connection`).on(voice.VoiceConnectionStatus.Destroyed, () => {
                    this.emit(constants.EVENTS.CONNECTION_BROADCAST_DESTROY, this.channel.id);
                });
                this.emit(constants.EVENTS.CONNECTION_PLAY);
                resolve();
            }).catch(err => {
                reject(`${constants.ERRORMESSAGES.CONNECTION_FAILED} ${err}`);
            });
        });
    }
    /**
     * Unsubscribes to an broadcast.
     * @example
     * connection.unsubscribe();
     */
    unsubscribe(){
        globals[this.channel.id].get(`subscription`).unsubscribe();
        this.emit(constants.EVENTS.CONNECTION_BROADCAST_UNSUBSCRIBE);
    }
    /**
     * Changes the volume of the stream. Does NOT work for broadcasts.
     * @param {number} volume The volume of the stream.
     * @example
     * connection.volume(0.6); // Sets the volume to 0.6
     */
    volume(volume){
        if(this.type === `broadcast`) throw new Error(constants.ERRORMESSAGES.VOLUME_CONNECTION_BROADCAST_ERROR);
        if(typeof volume === 'undefined' || volume === undefined || volume === "") throw new Error(constants.ERRORMESSAGES.REQUIRED_PARAMETER_VOLUME);
        if(isNaN(volume)) throw new Error(constants.ERRORMESSAGES.VOLUME_NAN);
        else if(volume > 1) throw new Error(constants.ERRORMESSAGES.VOLUME_MAX_1);

        globals[this.channel.id].get(`resource`).volume.setVolume(volume);
    }
    /**
     * Disconnects to the voice connection.
     * @example
     * connection.disconnect();
     */
    disconnect(){
        if(this.type === `broadcast`) globals[this.channel.id].get(`subscription`).unsubscribe();
        globals[this.channel.id].get(`connection`).disconnect();
    }
    /**
     * Destroys the voice connection.
     * @example
     * connection.destroy();
     */
    destroy(){
        if(this.type === 'broadcast') globals[this.channel.id].get(`subscription`).unsubscribe();
        globals[this.channel.id].get(`connection`).destroy();
    }
    /**
     * Pauses the stream. This does NOT work for broadcasts.
     * @example
     * connection.pause();
     */
    pause(){
        if(this.type !== 'stream') return;

        globals[this.channel.id].get(`player`).pause();
    }
    /**
     * Resumes the stream if it is paused. This does NOT work for broadcasts.
     * @example
     * connection.resume();
     */
    resume(){
        if(this.type !== 'stream') return;

        globals[this.channel.id].get(`player`).unpause();
    }
};

module.exports = {Connection};
