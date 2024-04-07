const voice = require('@discordjs/voice');
const EventEmitter = require('events');
const { ValueSaver } = require('valuesaver');
const constants = require('../util/constants.js');
const { playAudio } = require('../getstream.js');
const AudioStream = require('./audiostream.js');

const globals = {};

async function reloadStream(customId, options){
    const player = globals[customId].get(`player`);
    const oldStream = globals[customId].get(`stream`);
    if(oldStream instanceof AudioStream){
        oldStream.abort();
    }
    var playableStream = typeof oldStream.url == 'string' ? oldStream.url : oldStream;
    if(typeof oldStream.url === 'string'){
        try {
            playableStream = playAudio(playableStream);
        } catch(err) {
            playableStream = {stream: oldStream.url, url: oldStream.url};
        }
    }
    const resource = voice.createAudioResource(playableStream instanceof AudioStream ? playableStream : playableStream.stream, {
        inlineVolume: true,
        inputType: options.audiotype
    });
    resource.volume.setVolume(options.volume);
    player.play(resource);
    globals[customId].set(`resource`, resource);
}

function checkStatus(customId, options){
    const player = globals[customId].get(`player`);
    player.on('stateChange', (oldState, newState) => {
        if(newState.status === voice.AudioPlayerStatus.Idle){
            reloadStream(customId, options);
        }
    });
}

const custom = (length = 20) => {
    var characters = '0123456789abcdefghijklmnopqrstuvwxyz';
    var string = '';
    for(var i = 0; i < length; i++){
        string += characters.charAt(Math.round(Math.random() * (characters.length - 1))) + 1;
    }
    if(!globals[string]) return string;
    else return custom(length);
};

class Broadcast extends EventEmitter{
    /**
     * Creates a broadcast.
     * @param {string} stream The stream to play in the broadcast.
     * @param {object} options Optional options.
     * 
     * @example
     * const broadcast = new Broadcast('https://somecoolsite.com/somereallycoolstream.mp3', {
     *   noListeners: 'play', // What to do if there are no members in the voice channel
     *   volume: 1, // The volume of the stream, max volume is 1
     * });
     */
    constructor(stream, options){
        if(typeof stream === 'undefined' || stream === undefined || stream === "") throw new Error (constants.ERRORMESSAGES.REQUIRED_PARAMETER_STREAM);
        super();

        const id = custom();
        this.id = id;
        globals[id] = new ValueSaver();

        var volume = 1;
        var noSubscribers = voice.NoSubscriberBehavior.Play;
        var audiotype = voice.StreamType.Arbitrary;
        if(options){
            if(options.noListeners){
                if(options.noListeners.toLowerCase() === 'pause') noSubscribers = voice.NoSubscriberBehavior.Pause;
                else if(options.noListeners.toLowerCase() === 'stop') noSubscribers = voice.NoSubscriberBehavior.Stop;
                else if(options.noListeners.toLowerCase() === 'play') noSubscribers = voice.NoSubscriberBehavior.Play;
            }
            if(options.volume){
                if(isNaN(options.volume)) throw new Error(constants.ERRORMESSAGES.VOLUME_NAN);
                else if(options.volume > 1) throw new Error(constants.ERRORMESSAGES.VOLUME_MAX_1);
                else volume = options.volume;
            }
            if(options.audiotype) if(typeof options.audiotype === 'string') audiotype = options.audiotype.toLowerCase();
        }

        (async () => {
            var playableStream = stream;
            try{
                playableStream = playAudio(stream);
            } catch(error) {
                playableStream = {stream: stream, url: stream};
            }
            globals[id].set(`stream`, playableStream);

            const player = voice.createAudioPlayer({
                behaviors: {
                    noSubscriber: noSubscribers
                }
            });

            globals[id].set(`player`, player);

            const resource = voice.createAudioResource(playableStream instanceof AudioStream ? playableStream : (typeof playableStream === 'string' ? playableStream : playableStream.stream), {
                inlineVolume: true,
                inputType: audiotype
            });
            resource.volume.setVolume(volume);

            resource.playStream.on('end', () => {
                this.emit(constants.EVENTS.BROADCAST_END, stream);
            });

            resource.volume.setVolumeLogarithmic(volume / 1);

            globals[id].set(`resource`, resource);

            globals[id].get(`player`).play(resource);
            checkStatus(id, {volume: volume, audiotype: audiotype});
            this.emit(constants.EVENTS.BROADCAST_PLAY, stream);
            voice.entersState(player, voice.AudioPlayerStatus.Playing, 5e3);

            globals[id].get(`player`).pause();
        })();
    }
    /**
     * Passes the globals ValueSaver
     * @private
     */
    _getValueSaver(){
        return globals[this.id];
    }
    /**
     * Pauses the stream
     * @example
     * broadcast.pause();
     */
    pause(){
        globals[this.id].get(`player`).pause();
    }
    /**
     * Resumes the paused stream.
     * @example
     * broadcast.resume();
     */
    resume(){
        globals[this.id].get(`player`).unpause();
    }
    /**
     * Destroys the broadcast.
     * @example
     * broadcast.destroy();
     */
    destroy(){
        const stream = globals[this.id].get(`stream`);
        if(stream instanceof AudioStream){
            stream.abort();
        }
        globals[this.id].get(`player`).removeAllListeners();
        globals[this.id].get(`resource`).playStream.destroy();
    }
    /**
     * Changes the volume of the broadcast.
     * @param {number} volume The volume of the broadcast.
     * @example
     * broadcast.volume(1); // Sets the volume to 1/1.
     */
    volume(volume){
        if(typeof volume === 'undefined' || volume === undefined || volume === "") throw new Error(constants.ERRORMESSAGES.REQUIRED_PARAMETER_VOLUME);
        if(isNaN(volume)) throw new Error(constants.ERRORMESSAGES.VOLUME_NAN);
        else if(volume > 1) throw new Error(constants.ERRORMESSAGES.VOLUME_MAX_1);

        globals[this.id].get(`resource`).volume.setVolume(volume);
    }
}

module.exports = {Broadcast};
