/**
 * @exports Player Creates a music player.
 * @exports Connection Creates a connection to play stream.
 * @exports Broadcast Creates a broadcast to play a stream in multiple guilds.
 * @exports Adapter Creates an adapter. Works for multiple Discord.js versions.
 * @exports AudioManager Creates an audio manager.
 */
 const constants = require('./src/util/constants.js');
 const audversion = constants.version.split(".");
 if(Number(audversion[0]) < 2) console.warn(constants.WARNMESSAGES.VERSION_WARNING);
 
 module.exports = {
    Player: require('./src/classes/player').Player,
    Broadcast: require('./src/classes/broadcast').Broadcast,
    Connection: require('./src/classes/connection').Connection,
    Adapter: require('./src/classes/adapter').Adapter,
    AudioManager: require('./src/classes/audiomanager').AudioManager
};