const { Readable } = require('stream');

class AudioStream extends Readable{
    constructor(ls, opus){
        super({read(){}, highWaterMark: 1048576 * 16});
        this.stream = ls;
        this.opusStream = opus;
    }
    abort(){
        this.stream.destroy();
        this.opusStream.destroy();
        this.destroy();
    }
}

module.exports = AudioStream;
