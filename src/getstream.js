const { Readable } = require('stream');
const prism = require('prism-media');

const playAudio = (url, standardFilters = [], customFilters = [], ffmpeg) => {
    if(!ffmpeg){
        if(url instanceof Readable){
            const opus = new prism.opus.Encoder({ rate: 48000, channels: 2, frameSize: 960 });

            opus.on('close', () => {
                opus.destroy();
            });

            url.on('error', err => opus.emit('error', err));

            return url.pipe(opus);
        } else return url;
    }

    if(typeof url === 'string'){
        const iFilter = standardFilters.filter(f => f === "--audio-url")[0];
        if(!iFilter) throw new Error('Invalid filters');
        const indexFilter = standardFilters.indexOf(iFilter);
        standardFilters[indexFilter] = url;
    } else {
        const indexInput = standardFilters.indexOf('--audio-url');
        if(indexInput >= 0) standardFilters[indexInput] = "-";
    }

    let custom = ['-af', customFilters.join(',')];

    let ffmpegArgs = [...standardFilters, ...(customFilters.length > 0 ? custom : [])];
    if(typeof url === 'string') ffmpegArgs.push('pipe:1');
    let ls = new prism.FFmpeg({
        args: [...standardFilters, ...(customFilters.length > 0 ? custom : [])]
    });

    let output = ls;

    if(url instanceof Readable){
        output = url.pipe(ls);
    }
    
    const opus = new prism.opus.Encoder({ rate: 48000, channels: 2, frameSize: 960 });
    
    const outputPipe = output.pipe(opus);

    output.on('error', err => outputPipe.emit('error', err));

    opus.on('close', () => {
        ls.destroy();
        ls = null;
        opus.destroy();
    });

    return outputPipe;
}

module.exports = { playAudio };
