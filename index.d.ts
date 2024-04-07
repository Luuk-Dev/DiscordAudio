import { VoiceChannel } from "discord.js";
import { Broadcast } from "./src/classes/broadcast";

type QualityOptions = 'high' | 'low';

type AudioTypeOptions = 'arbitrary' | 'raw' | 'ogg/opus' | 'webm/opus' | 'opus';

type StreamPlayOptions = {
  autoleave: boolean;
  quality: QualityOptions;
  selfDeaf: boolean;
  selfMute: boolean;
  audiotype: AudioTypeOptions;
  volume: number;
};

type NoListeners = 'pause' | 'play' | 'stop';

type StreamBroadcastOptions = {
    noListeners: NoListeners;
    volume: number;
    audiotype: AudioTypeOptions;
};

type StreamConnectionOptions = {
    noListeners: NoListeners;
    volume: number;
    audiotype: AudioTypeOptions;
};

type StreamAudioManagerOptions = {
    volume: number;
    quality: QualityOptions;
    audiotype: AudioTypeOptions;
};

interface PlayerEvents {
    play: [string];
    stop: [string];
    destroy: [string];
    disconnect: [string];
}

interface BroadcastEvents {
    play: [string];
    end: [string];
}

interface ConnectionEvents {
    end: [string];
    play: [string];
    disconnect: [string];
    destroy: [string];
    subscribe: [void];
    unsubscribe: [void];
}

interface AudioManagerEvents {
    play: [VoiceChannel, StreamTypes];
    queue_add: [StreamTypes];
    queue_remove: [StreamTypes];
    end: [void];
    error: [Error];
    destroy: [void];
    connection_destroy: [VoiceChannel];
}

type ConnectionOptions = {
    selfDeaf: boolean;
    selfMute: boolean;
}

type StreamTypes = string | object;

export declare class Player {
    /**
    * Creates a music player to play your songs in
    * @param {object} channel The channel to play music in
    * @example
    * const player = new Player(<channel>);
    */
  constructor(channel: VoiceChannel);
  /**
    * To play a song in a voice channel.
    * @param {string | object} stream The stream to play in the voice channel.
    * @param {object} options Optional options.
    * @returns {Promise<string>} Returns the stream or an error.
    * 
    * @example
    * player.play('https://www.youtube.com/watch?v=dQw4w9WgXcQ', {
    *     autoleave: true,
    *     quality: 'high',
    *     selfDeaf: true,
    *     selfMute: false,
    *     audiotype: 'arbitrary'
    * })
    * .then(stream => console.log(`Playing ${stream}`))
    * .catch(console.error);
    * */
  play(stream: StreamTypes, options: StreamPlayOptions) : Promise<string>;
  /**
     * Destroys the voice connection.
     * @example
     * player.destroy();
     */
   destroy();
   /**
    * Disconnects with the voice connection.
    * @example
    * player.disconnect();
    */
   disconnect();
   /**
    * Reconnects to a voice connection.
    * @param {number} timeout How many miliseconds the bot needs to wait before connecting to the voice connection again. Default is 2000 miliseconds.
    * @returns {Promise} Returns an error if the connection failed
    * @example
    * player.reconnect(3000)
    *   .then(() => console.log(`Successfully reconnected`))
    *   .catch(console.error);
    */
   reconnect(miliseconds: number);
   /**
    * Pauses the song that's playing.
    * @example
    * player.pause();
    */
   pause();
   /**
    * Resumes a song that has been paused.
    * @example
    * player.resume();
    */
   resume();
   /**
    * Checks if the song is playable.
    * @returns {boolean} Returns true if the song is playable, returns false if the song is not playable.
    * @example
    *  if(player.getStatus() === true) console.log(`The song is playable!`);
    *  else console.log(`The song is not playable!`);
    */
   getStatus();
   /**
    * Gets the amount of members in the same voice channel with the bot
    * @returns {number} The amount of members in the voice channel
    */
   getListeners();
   /**
    * Adds new filter arguments for the music and restarts with playing the current song so the new filters will apply
    * @param {Array | string} filters An array or a set of parameters of strings which represent an encoding argument
    */
   setFilter(...filters: [string]) : Promise<void>;
   /**
    * Removes one or more filters for the music and restarts with playing the current song so the new filters will apply
    * @param {Array | string} filters An array or a set of parameters of strings which represent an encoding argument and should be removed as a filter
    */
   removeFilter(...filters: [string]) : Promise<void>;
   /**
     * Gets the current set filters for the music
     * @returns {Array} The filter arguments which have been set
    */
   getFilters() : [string];
   /**
    * Changes the volume of the song
    * @param {number | string} volume The volume of the song
    * @example
    * player.volume("3/20"); // Sets the volume to 3/20
    * player.volume(3); // Sets the volume to 3/10
    */
   volume(volume : number | string);
   on<T extends keyof PlayerEvents>(eventName: T, listener: (...args: PlayerEvents[T]) => void);
   once<T extends keyof PlayerEvents>(eventName: T, listener: (...args: PlayerEvents[T]) => void);
   emit<T extends keyof PlayerEvents>(eventName: T, listener: (...args: PlayerEvents[T]) => void);
};

export declare class Broadcast{
    /**
     * Creates a broadcast.
     * @param {string | object} stream The stream to play in the broadcast.
     * @param {object} options Optional options.
     * 
     * @example
     * const broadcast = new Broadcast('https://somecoolsite.com/somereallycoolstream.mp3', {
     *   noListeners: 'play', // What to do if there are no members in the voice channel
     *   volume: 1, // The volume of the stream, max volume is 1
     *   audiotype: 'arbitrary'
     * });
     */
    constructor(stream: StreamTypes, options: StreamBroadcastOptions);
    /**
     * Passes the globals ValueSaver
     * @private
     */
     private _getValueSaver();
     /**
     * Pauses the stream
     * @example
     * broadcast.pause();
     */
    pause();
    /**
     * Resumes the paused stream.
     * @example
     * broadcast.resume();
     */
    resume();
    /**
     * Destroys the broadcast.
     * @example
     * broadcast.destroy();
     */
    destroy();
    /**
     * Changes the volume of the broadcast.
     * @param {number} volume The volume of the broadcast.
     * @example
     * broadcast.volume(1); // Sets the volume to 1/1.
     */
    volume(volume: number);
    on<T extends keyof BroadcastEvents>(eventName: T, listener: (...args: BroadcastEvents[T]) => void);
    once<T extends keyof BroadcastEvents>(eventName: T, listener: (...args: BroadcastEvents[T]) => void);
    emit<T extends keyof BroadcastEvents>(eventName: T, listener: (...args: BroadcastEvents[T]) => void);
};

export declare class Connection{
    /**
     * Creates a voice connection with a voice channel.
     * @param {object} channel The voice channel to play a stream in.
     * @param {object} options Optional options.
     * @example
     * const connection = new Connection(<channel>, {
     *   selfDeaf: true,
     *   selfMute: false
     * });
     */
    constructor(channel: VoiceChannel, options: ConnectionOptions);
    /**
     * 
     * @param {string | object} stream The stream to play in the voice connection.
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
    play(stream: StreamTypes, options: StreamConnectionOptions) : Promise<string>;
    /**
     * Plays a broadcast in the voice connection. You can create a broadcast by using the Broadcast class.
     * @param broadcast The broadcast to play.
     * @returns {Promise} Returns an error if there is an error.
     * @example
     * connection.subscribe(<broadcast>)
     * .then(() => console.log(`Successfully started playing the broadcast`))
     * .catch(console.error);
     */
    subscribe(broadcast: Broadcast) : Promise<void>;
    /**
     * Unsubscribes to an broadcast.
     * @example
     * connection.unsubscribe();
     */
    unsubscribe();
    /**
     * Changes the volume of the stream. Does NOT work for broadcasts.
     * @param {number} volume The volume of the stream.
     * @example
     * connection.volume(0.6); // Sets the volume to 0.6/1
     */
    volume(volume: number);
    /**
     * Disconnects to the voice connection.
     * @example
     * connection.disconnect();
     */
    disconnect();
    /**
     * Destroys the voice connection.
     * @example
     * connection.destroy();
     */
    destroy();
    /**
     * Pauses the stream. This does NOT work for broadcasts.
     * @example
     * connection.pause();
     */
    pause();
    /**
     * Resumes the stream if it is paused. This does NOT work for broadcasts.
     * @example
     * connection.resume();
     */
    resume();
    on<T extends keyof ConnectionEvents>(eventName: T, listener: (...args: ConnectionEvents[T]) => void);
    once<T extends keyof ConnectionEvents>(eventName: T, listener: (...args: ConnectionEvents[T]) => void);
    emit<T extends keyof ConnectionEvents>(eventName: T, listener: (...args: ConnectionEvents[T]) => void);

    /**
     * Whether the bot is playing a stream or a Broadcast
     */
    type: string;
}

export declare class Adapter{
    /**
     * Creates an adapter for voice connections. Works for multiple Discord.js versions.
     * @param {object} channel The voice channel to create an adapter for.
     * @returns A Discord.js music adapter.
     * @example
     * const adapter = new Adapter(<channel>);
     */
    constructor(channel: VoiceChannel);
};

export declare class AudioManager{
    /**
     * Creates an AudioManager which can be used for multiple guilds
     * @example
     * const audioManager = new AudioManager();
     */
    constructor();
    /**
     * Plays a song in a voice channel or adds it to the queue
     * @param {object} channel The voice channel where the bot needs to play the song
     * @param {stream | object} stream The stream to play in the voice channel
     * @param {object} options Optional options.
     * @returns {Promise}
     * @example
     * audioManager.play(<channel>, `https://somecoolstream.com/stream.mp3`, {
     *    quality: 'high',
     *    volume: 1,
     *    audiotype: 'arbitrary'
     * }).then(queue => {
     *    if(queue === false) console.log(`The song is playing`);
     *    else console.log(`The song has been added to the queue`);
     * }).catch(console.log);
     */
    play(channel: VoiceChannel, stream: StreamTypes, options: StreamAudioManagerOptions) : Promise<boolean>;
    /**
     * The available looptypes
     */
    looptypes: {
        off: 0,
        loop: 1,
        queueloop: 2
    }
    /**
     * Sets a loop
     * @param {object} channel The voice channel where the loop should be enabled or disabled
     * @param {number} loop The type of loop
     * @example
     * audioManager.loop(<channel>, audioManager.looptypes.loop);
     */
    loop(channel: VoiceChannel, loop: number);
    /**
     * Stops with playing songs in a channel and disconnects of it
     * @param {object} channel The voice channel to stop playing songs
     * @example
     * audioManager.stop(<channel>);
     */
    stop(channel: VoiceChannel);
    /**
     * Skips the song that's currently playing
     * @param {object} channel The voice channel where to skip a song
     * @example
     * audioManager.skip(<channel>);
     */
    skip(channel: VoiceChannel) : Promise<void>;

    /**
     * Plays the previous song again
     * @param {object} channel The voice channel where you would like the previous song in
     * @example
     * audioManager.previous(<channel>);
     */
    previous(channel: VoiceChannel) : Promise<void>;
    /**
     * Shows the full queue
     * @param {object} channel The voice channel where you want to get the queue of
     * @returns {array} Returns an array with the songs
     * @example
     * audioManager.queue(<channel>)
     */
    queue(channel: VoiceChannel): [{url: string, title: string}];
    /**
     * Clears the queue
     * @param {object} channel The voice channel where you want to clear the queue of
     * @example
     * audioManager.clearqueue(<channel>);
     */
    clearqueue(channel: VoiceChannel);
    /**
     * Delete a song from the queue
     * @param {object} channel The voice channel where you want to delete a song from the queue
     * @param {stream | object} stream The stream that you want to delete from the queue
     * @example
     * await audioManager.deletequeue(<channel>, `https://somecoolsite.com/somestream.mp3`);
     */
    deletequeue(channel: VoiceChannel, stream: StreamTypes) : Promise<void>;
    /**
     * Destroys all players
     * @example
     * audioManager.destroy();
     */
    destroy();
    /**
     * Changes the volume of a song
     * @param {object} channel The voice channel to change the volume of
     * @param {number} volume The volume
     * @example
     * audioManager.volume(<channel>, 1); // Changes the volume to 1/10 
     */
    volume(channel: VoiceChannel, volume: number);
    /**
     * Resumes the song if it's paused
     * @param {object} channel The voice channel where the song is paused
     * @example
     * audioManager.resume(<channel>);
     */
    resume(channel: VoiceChannel);
    /**
     * Pauses the song that's playing in a voice channel
     * @param {object} channel The voice channel of the song that you want to pause
     * @example
     * audioManager.pause(<channel>);
     */
    pause(channel: VoiceChannel);

    /**
     * Shuffles the queue
     * @param {object} channel The voice channel of the queue that should be shuffled
     * @example
     * audioManager.shuffle(<channel>);
     */
    shuffle(channel: VoiceChannel);

    /**
     * Gives information about the song which is currently playing
     * @param {object} channel The voice channel where the song is being played you'd like to receive the information of
     * @example
     * audioManager.getCurrentSong(<channel>);
     */
    getCurrentSong(channel: VoiceChannel) : {url: string; title?: string | null; started: number; ytInfo?: object | null; paused: boolean; pauses: [{started: number; ended: number | null;}]};

    /**
     * Provides the current set volume
     * @param channel The voice channel where you'd like to get the set volume of
     * @example
     * audioManager.getVolume(<channel>);
     */
    getVolume(channel: VoiceChannel) : number;
    /**
     * Adds new filter arguments for the music and restarts with playing the current song so the new filters will apply
     * @param {Array | string} filters An array or a set of parameters of strings which represent an encoding argument
     */
    setFilter(...filters: [string]) : Promise<void>;
    /**
     * Removes one or more filters for the music and restarts with playing the current song so the new filters will apply
     * @param {Array | string} filters An array or a set of parameters of strings which represent an encoding argument and should be removed as a filter
     */
    removeFilter(...filters: [string]) : Promise<void>;
    /**
      * Gets the current set filters for the music
      * @returns {Array} The filter arguments which have been set
     */
    getFilters() : [string];

    on<T extends keyof AudioManagerEvents>(eventName: T, listener: (...args: AudioManagerEvents[T]) => void);
    once<T extends keyof AudioManagerEvents>(eventName: T, listener: (...args: AudioManagerEvents[T]) => void);
    emit<T extends keyof AudioManagerEvents>(eventName: T, listener: (...args: AudioManagerEvents[T]) => void);
}
