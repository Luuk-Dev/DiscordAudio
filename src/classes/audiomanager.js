const { Player } = require('./player.js');
const EventEmitter = require('events');
const constants = require('../util/constants.js');
const ytstream = require('yt-stream');
const { ValueSaver } = require('valuesaver');

var globals = {};

class AudioManager extends EventEmitter{
  constructor(){
    super();
  }
  play(channel, stream, options){
    if(!channel || !stream) throw new Error(constants.ERRORMESSAGES.AM_REQUIRED_PARAMETERS);
    if(typeof channel !== 'object') throw new Error(constants.ERRORMESSAGES.INVALID_CHANNEL_PARAMETER);
    if(typeof stream === 'undefined' || stream === undefined || stream === '') throw new Error(constants.ERRORMESSAGES.INVALID_STREAM_PARAMETER);

    const settings = {
      quality: 'high',
      audiotype: 'arbitrary',
      volume: 10
    };

    if(options){
      if(typeof options.quality === 'string') settings['quality'] = options.quality.toLowerCase() === 'low' ? options.quality : 'high';
      if(typeof options.audiotype === 'string') settings['audiotype'] = options.audiotype;
      if(typeof options.volume === 'number') settings['volume'] = options.volume;
    } else options = {};
    const yturl = ytstream.validateVideoURL(stream);
    const playlisturl = ytstream.validatePlaylistURL(stream);

    return new Promise(async (resolve, reject) => {
      if(globals[channel.id] instanceof ValueSaver){
        if(typeof options.volume === 'number'){
          globals[channel.id].set(`volume`, options.volume / 10);
        }
        var queue = globals[channel.id].get(`queue`);
        let loopType = globals[channel.id].get(`loop`);
        if(yturl === true){
            try{
              var info = await ytstream.getInfo(stream);
              queue.push({url: stream, quality: settings['quality'], audiotype: settings['audiotype'], info: info, volume: settings['volume'], started: 0, loopType: loopType});
            } catch {
              queue.push({url: stream, quality: settings['quality'], audiotype: settings['audiotype'], info: undefined, volume: settings['volume'], started: 0, loopType: loopType});
            }
        } else if(playlisturl === true){
          try{
            var playlist = await ytstream.getPlaylist(stream);
            var playlistInfo = playlist.videos.map(v => {
              return {url: v.video_url, quality: settings['quality'], audiotype: settings['audiotype'], info: v, volume: settings['volume'], started: 0, loopType: loopType};
            });
            queue.push(...playlistInfo);
          } catch {
            reject(`The parsed url is an invalid playlist url`);              
          }
        } else queue.push({url: stream, quality: settings['quality'], audiotype: settings['audiotype'], info: undefined, volume: settings['volume'], started: 0, loopType: loopType});
        if(globals[channel.id] instanceof ValueSaver){
          globals[channel.id].set(`queue`, queue);
          this.emit(constants.EVENTS.AM_QUEUE_ADD, stream);
          resolve(true);
        } else {
          this.play(channel, stream, options).then(resolve).catch(reject);
        }
      } else {
        globals[channel.id] = new ValueSaver();
        globals[channel.id].set(`queue`, []);
        globals[channel.id].set(`previous`, []);
        globals[channel.id].set(`loop`, 0);
        if(typeof options.volume === 'number'){
          globals[channel.id].set(`volume`, options.volume / 10);
        }

        var queue = globals[channel.id].get(`queue`);

        const player = new Player(channel);
        
        if(yturl === true){
            try{
                var info = await ytstream.getInfo(stream);
              	queue.push({url: stream, quality: settings['quality'], audiotype: settings['audiotype'], info: info, volume: settings['volume'], started: 0, loopType: 0});
            } catch {
              queue.push({url: stream, quality: settings['quality'], audiotype: settings['audiotype'], info: undefined, volume: settings['volume'], started: 0, loopType: 0});                
            }
        } else if(playlisturl === true){
          try{
              var playlist = await ytstream.getPlaylist(stream);
              var playlistInfo = playlist.videos.map(v => {
                return {url: v.video_url, quality: settings['quality'], audiotype: settings['audiotype'], info: v, volume: settings['volume'], started: 0, loopType: 0};
              });
              queue.push(...playlistInfo);
          } catch {
            reject(`The parsed url is an invalid playlist url`);              
          }
        } else queue.push({url: stream, quality: settings['quality'], audiotype: settings['audiotype'], info: undefined, volume: settings['volume'], started: 0, loopType: 0});
        queue[0].started = (new Date()).getTime();
        globals[channel.id].set(`queue`, queue);
        player.play(queue[0].url, {
          autoleave: false,
          selfDeaf: true,
          selfMute: false,
          audiotype: settings['audiotype'],
          quality: settings['quality'],
          volume: globals[channel.id].get(`volume`) || (settings['volume'] / 10)
        }).then(() => {
          this.emit(constants.EVENTS.AM_PLAY, channel, stream);

          player.on('stop', () => {
            if(!(globals[channel.id] instanceof ValueSaver)) return;
            queue = globals[channel.id].get(`queue`);
            let previous = globals[channel.id].get(`previous`);
            if(globals[channel.id].get(`loop`) === 0){
              queue[0].started = 0;
              previous.push(queue[0]);
              queue.shift();
            }
            else if(globals[channel.id].get(`loop`) === 2){
              queue[0].started = 0;
              queue.push(queue[0]);
              previous.push(queue[0]);
              queue.shift();
            }
            if(queue.length > 0){
              queue[0].started = (new Date()).getTime();
              player.play(queue[0].url, {
                autoleave: false,
                selfDeaf: true,
                selfMute: false,
                audiotype: queue[0].audiotype,
                quality: queue[0].quality,
                volume: globals[channel.id].get(`volume`) || (settings['volume'] / 10)
              }).catch(err => {
                this.emit(constants.EVENTS.AM_ERROR, err);
              });

              globals[channel.id].set(`queue`, queue);
              globals[channel.id].set(`previous`, previous);
            } else {
              player.destroy();
              globals[channel.id] = undefined;
              this.emit(constants.EVENTS.AM_END, channel);
            }
          });

          globals[channel.id].set(`connection`, player);
          resolve(false);
        }).catch(err => {
          reject(err);
          this.emit(constants.EVENTS.AM_ERROR, err);
        });

        player.once(constants.EVENTS.AUDIO_CONNECTION_DISCONNECT, (channelId) => { 
          globals[channelId].get(`connection`).destroy();
          this.emit(constants.EVENTS.AM_CONNECTION_DESTROY, channel);
          globals[channelId] = undefined;
        });
      }
    });
  };
  loop(channel, loop){
    if(!channel || typeof loop !== 'number') throw new Error(constants.ERRORMESSAGES.REQUIRED_PARAMETERS_LOOP);
    if(isNaN(loop)) throw new Error(constants.ERRORMESSAGES.LOOP_PARAMETER_NAN);
    if(loop < 0 || loop > 2) throw new Error(constants.ERRORMESSAGES.LOOP_PARAMETER_INVALID);
    if(!globals[channel.id]) throw new Error(constants.ERRORMESSAGES.PLAY_FUNCTION_NOT_CALLED);
    let queue = globals[channel.id].get(`queue`);
    queue = queue.map(i => {
      return {
        ...i,
        loopType: loop
      };
    });
    globals[channel.id].set(`queue`, queue);
    globals[channel.id].set(`loop`, loop);
  };
  looptypes = {
    off: 0,
    loop: 1,
    queueloop: 2
  };
  stop(channel){
    if(!channel) throw new Error(constants.ERRORMESSAGES.REQUIRED_PARAMETER_CHANNEL);
    if(!globals[channel.id]) throw new Error(constants.ERRORMESSAGES.PLAY_FUNCTION_NOT_CALLED);
    globals[channel.id].get(`connection`).destroy();
    this.emit(constants.EVENTS.AM_CONNECTION_DESTROY, channel);
    globals[channel.id] = undefined;
  };
  skip(channel){
    if(!channel) throw new Error(constants.ERRORMESSAGES.REQUIRED_PARAMETER_CHANNEL);
    if(!globals[channel.id]) throw new Error(constants.ERRORMESSAGES.PLAY_FUNCTION_NOT_CALLED);
    const queue = globals[channel.id].get(`queue`);
    const player = globals[channel.id].get(`connection`);
    return new Promise((resolve, reject) => {
      let previous = globals[channel.id].get(`previous`);
      if(globals[channel.id].get(`loop`) === 0){
        queue[0].started = 0;
        previous.push(queue[0]);
        globals[channel.id].set(`previous`, previous);
        queue.shift();
        if(queue.length === 0){
          resolve();
          return this.stop(channel);
        }
        queue[0].started = (new Date()).getTime();
        player.play(queue[0].url, {
          quality: queue[0].quality,
          autoleave: false,
          selfDeaf: true,
          selfMute: false,
          audiotype: queue[0].audiotype
        }).then(() => {
          resolve();
        }).catch(err => {
          reject(err);
        });
      } else if(globals[channel.id].get(`loop`) === 2){
        queue[0].started = 0;
        previous.push(queue[0]);
        globals[channel.id].set(`previous`, previous);
        queue.push(queue[0]);
        queue.shift();
        queue[0].started = (new Date()).getTime();
        player.play(queue[0].url, {
          quality: queue[0].quality,
          autoleave: false,
          selfDeaf: true,
          selfMute: false,
          audiotype: queue[0].audiotype
        }).then(() => {
          resolve();
        }).catch(err => {
          reject(err);
        });
      } else if(globals[channel.id].get(`loop`) === 1){
        queue[0].started = (new Date()).getTime();
        player.play(queue[0].url, {
          quality: queue[0].quality,
          autoleave: false,
          selfDeaf: true,
          selfMute: false,
          audiotype: queue[0].audiotype
        }).then(() => {
          resolve();
        }).catch(err => {
          reject(err);
        });
      }
    });
  };
  previous(channel){
    if(!channel) throw new Error(constants.ERRORMESSAGES.REQUIRED_PARAMETER_CHANNEL);
    if(!globals[channel.id]) throw new Error(constants.ERRORMESSAGES.PLAY_FUNCTION_NOT_CALLED);
    const queue = globals[channel.id].get(`queue`);
    const player = globals[channel.id].get(`connection`);
    return new Promise((resolve, reject) => {
      const previous = globals[channel.id].get(`previous`);
      const previousSong = previous.length > 0 ? previous[0] : queue[0];
      if(previousSong.loopType === 2){
        if(previous.length > 0){
          queue.splice(queue.length - 1, 1);
          queue.splice(0, 0, previousSong);
          previous.shift();
        }
        globals[channel.id].set(`previous`, previous);
        globals[channel.id].set(`queue`, queue);
        globals[channel.id].set(`loop`, 2);
        player.play(previousSong.url, {
          quality: previousSong.quality,
          autoleave: false,
          selfDeaf: true,
          selfMute: false,
          audiotype: previousSong.audiotype
        }).then(() => {
          resolve();
        }).catch(reject);
      } else if(previousSong.loopType === 1){
        if(previous.length > 0){
          queue.splice(0, 0, previousSong);
          previous.shift();
        }
        globals[channel.id].set(`previous`, previous);
        globals[channel.id].set(`queue`, queue);
        globals[channel.id].set(`loop`, 1);
        player.play(previousSong.url, {
          quality: previousSong.quality,
          autoleave: false,
          selfDeaf: true,
          selfMute: false,
          audiotype: previousSong.audiotype
        }).then(() => {
          resolve();
        }).catch(reject);
      } else if(previousSong.loopType === 0){
        if(previous.length > 0){
          queue.splice(0, 0, previousSong);
          previous.shift();
        }
        globals[channel.id].set(`previous`, previous);
        globals[channel.id].set(`queue`, queue);
        globals[channel.id].set(`loop`, 0);
        player.play(previousSong.url, {
          quality: previousSong.quality,
          autoleave: false,
          selfDeaf: true,
          selfMute: false,
          audiotype: previousSong.audiotype
        }).then(() => {
          resolve();
        }).catch(reject);
      }
    });
  };
  pause(channel){
    if(!channel) throw new Error(constants.ERRORMESSAGES.REQUIRED_PARAMETER_CHANNEL);
    if(!globals[channel.id]) throw new Error(constants.ERRORMESSAGES.PLAY_FUNCTION_NOT_CALLED);
    const player = globals[channel.id].get(`connection`);
    player.pause();
  };
  resume(channel){
    if(!channel) throw new Error(constants.ERRORMESSAGES.REQUIRED_PARAMETER_CHANNEL);
    if(!globals[channel.id]) throw new Error(constants.ERRORMESSAGES.PLAY_FUNCTION_NOT_CALLED);
    const player = globals[channel.id].get(`connection`);
    player.resume();
  }
  queue(channel){
    if(!channel) throw new Error(constants.ERRORMESSAGES.REQUIRED_PARAMETER_CHANNEL);
    if(!globals[channel.id]) throw new Error(constants.ERRORMESSAGES.PLAY_FUNCTION_NOT_CALLED);
    const queue = globals[channel.id].get(`queue`);
    const audioqueue = queue.reduce((total, item) => {
      var title = item.info ? item.info.title : null;
      total.push({url: item.url, title: title});
      return total;
    }, []);
    return audioqueue;
  };
  clearqueue(channel){
    if(!channel) throw new Error(constants.ERRORMESSAGES.REQUIRED_PARAMETER_CHANNEL);
    if(!globals[channel.id]) throw new Error(constants.ERRORMESSAGES.PLAY_FUNCTION_NOT_CALLED);
    globals[channel.id].set(`queue`, []);
  };
  deletequeue(channel, stream){
    if(!channel || !stream) throw new Error(constants.ERRORMESSAGES.AM_REQUIRED_PARAMETERS);
    if(!globals[channel.id]) throw new Error(constants.ERRORMESSAGES.PLAY_FUNCTION_NOT_CALLED);
    return new Promise((resolve, reject) => {
      const queue = globals[channel.id].get(`queue`);
      const song = queue.filter(song => song.url === stream);
      if(!song[0]) return reject(constants.ERRORMESSAGES.DELETE_QUEUE_SONG_NOT_EXISTS);
      const index = queue.indexOf(song[0]);
      if(index >= 0){
        queue.splice(index, 1);
        resolve();
        this.emit(constants.EVENTS.AM_QUEUE_REMOVE, stream);
      } else return reject(constants.ERRORMESSAGES.DELETE_QUEUE_SONG_NOT_EXISTS);
    });
  };
  shuffle(channel){
    if(!channel) throw new Error(constants.ERRORMESSAGES.REQUIRED_PARAMETER_CHANNEL);
    if(!globals[channel.id]) throw new Error(constants.ERRORMESSAGES.PLAY_FUNCTION_NOT_CALLED);
    var queue = [...globals[channel.id].get(`queue`)];
    const firstSong = queue[0];
    queue.shift();
    for(var i = 0; i < queue.length; i++){
      const queueVal = queue[i];
      const randIndex = Math.round(Math.random() * (queue.length - 1));
      const replaceVal = queue[randIndex];
      queue[i] = replaceVal;
      queue[randIndex] = queueVal;
    }
    queue = [firstSong, ...queue]
    globals[channel.id].set(`queue`, queue);
  }
  destroy(){
    for(const global in globals){
      globals[global].get(`connection`).destroy();
    }
    globals = {};
    this.emit(constants.EVENTS.AM_DESTROY);
  };
  volume(channel, volume){
    if(!channel || !volume) throw new Error(constants.ERRORMESSAGES.REQUIRED_PARAMETERS_VOLUME);
    if(!globals[channel.id]) throw new Error(constants.ERRORMESSAGES.PLAY_FUNCTION_NOT_CALLED);
    if(isNaN(volume)) throw new Error(constants.ERRORMESSAGES.AM_NAN_VOLUME);
    if(volume < 1 || volume > 10) throw new Error(constants.ERRORMESSAGES.AM_INVALID_VOLUME);
    const player = globals[channel.id].get(`connection`);
    globals[channel.id].set(`volume`, volume / 10);
    player.volume(`${volume}/10`);
  };
  getCurrentSong(channel){
    if(!channel) throw new Error(constants.ERRORMESSAGES.REQUIRED_PARAMETER_CHANNEL);
    if(!globals[channel.id]) throw new Error(constants.ERRORMESSAGES.PLAY_FUNCTION_NOT_CALLED);
    var queue = [...globals[channel.id].get(`queue`)];
    const firstSong = queue[0];
    return {
      url: firstSong.url,
      title: firstSong.info ? firstSong.info.title : null,
      started: firstSong.started,
      ytInfo: firstSong.info ?? null
    };
  };
  getVolume(channel){
    if(!channel) throw new Error(constants.ERRORMESSAGES.REQUIRED_PARAMETER_CHANNEL);
    if(!globals[channel.id]) throw new Error(constants.ERRORMESSAGES.PLAY_FUNCTION_NOT_CALLED);
    return globals[channel.id].get(`volume`) * 10;
  };
  set cookie(newCookie){
    ytstream.cookie = newCookie;
  };
  get cookie(){
    return ytstream.cookie;
  };
};

module.exports = {AudioManager};
