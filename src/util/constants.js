var constantexports = {};
const Package = (constantexports.Package = require('../../package.json'));

constantexports.version = Package.version;

constantexports.EVENTS = {
  AUDIO_END: 'stop',
  AUDIO_PLAY: 'play',
  AUDIO_CONNECTION_DISCONNECT: 'disconnect',
  AUDIO_CONNECTION_DESTROY: 'destroy',
  BROADCAST_PLAY: 'play',
  BROADCAST_END: 'end',
  CONNECTION_END: 'end',
  CONNECTION_DISCONNECT: 'disconnect',
  CONNECTION_DESTROY: 'destroy',
  CONNECTION_PLAY: 'play',
  CONNECTION_BROADCAST_SUBSCRIBE: 'subscribe',
  CONNECTION_BROADCAST_UNSUBSCRIBE: 'unsubscribe',
  CONNECTION_BROADCAST_DISCONNECT: 'disconnect',
  CONNECTION_BROADCAST_DESTROY: 'destroy',
  AM_PLAY: 'play',
  AM_QUEUE_ADD: 'queue_add',
  AM_QUEUE_REMOVE: 'queue_remove',
  AM_END: 'end',
  AM_ERROR: 'error',
  AM_DESTROY: 'destroy',
  AM_CONNECTION_DESTROY: 'connection_destroy'
};

constantexports.ERRORMESSAGES = {
  /* Player */
  CONNECTION_FAILED: 'There was an error while connecting to the voice channel',
  RECONNECT_ERROR: 'There was an error while reconnecting to the voice channel',
  /* */
  UNPLAYABLE_STREAM: 'The stream is an unplayable stream',
  REQUIRED_PARAMETER_CHANNEL: 'The channel parameter is a required parameter',
  REQUIRED_PARAMETER_STREAM: 'The stream parameter is a required parameter',
  REQUIRED_PARAMETER_VOLUME: 'The volume parameter is a required parameter',
  /* Connection */
  REQUIRED_PARAMETER_BROADCAST: 'The broadcast parameter is a required parameter',
  /* */
  INVALID_VOLUME_PARAMETER: 'The volume parameter is not a number or a string',
  /* Connection */
  VOLUME_CONNECTION_BROADCAST_ERROR: 'You can not change the volume of a broadcast',
  /* */
  VOLUME_NAN: 'The volume is not a number',
  VOLUME_MAX: 'The volume may not be higher than 1',
  ENCODER_ERROR: 'There was an error while encoding the stream',
  /* Player */
  YOUTUBE_INFO_FAILED: 'There was an error while getting the YouTube information',
  YOUTUBE_STREAM_FAILED: 'There was an error while creating the YouTube stream',
  /* AudioManager */
  AM_REQUIRED_PARAMETERS: 'The channel and stream parameters are required',
  INVALID_CHANNEL_PARAMETER: 'The channel parameter is not an object',
  INVALID_STREAM_PARAMETER: 'The stream parameter is not a string',
  REQUIRED_PARAMETERS_LOOP: 'The channel and loop parameter are required parameters',
  REQUIRED_PARAMETERS_VOLUME: 'The channel and volume parameter are required parameters',
  LOOP_PARAMETER_NAN: 'The loop parameter is not a number',
  LOOP_PARAMETER_INVALID: 'The loop parameter may not be lower than 0 and not be higher than 2',
  PLAY_FUNCTION_NOT_CALLED: 'You need to use the play function before you can use this function',
  DELETE_QUEUE_SONG_NOT_EXISTS: 'The song you are trying to delete from the queue is not in the queue',
  AM_NAN_VOLUME: 'The volume parameter is not a number',
  AM_INVALID_VOLUME: 'The volume must be at least 1 and can maximum be 10',
  /* Stream creator */
  INVALID_STREAM_PARAMETER_CREATOR: 'The stream parameter may only be a url or a Readable stream',
  INVALID_STREAM_URL: 'The stream parameter is not a valid url',
  STREAM_NOT_AUDIO: 'The stream parameter is not a valid audio file'
};

constantexports.WARNMESSAGES = {
  VERSION_WARNING: 'Your discordaudio version is older and may include some bugs. Please install the latest discordaudio version.'
};

module.exports = constantexports;
