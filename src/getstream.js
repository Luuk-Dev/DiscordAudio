const { Readable, PassThrough, Duplex } = require('stream');
const { spawn } = require('child_process');

const playAudio = (url, standardFilters = [], customFilters = [], ffmpeg) => {
    if(!ffmpeg){
        return url;
    }
    
    let audioIndex = standardFilters.indexOf('-i');
    if(typeof url === 'string'){
        standardFilters.splice(audioIndex + 1, 0, url);
    } else {
        standardFilters.splice(audioIndex + 1, 0, 'pipe:0');
    }

    let custom = ['-af', customFilters.join(',')];

    let ffmpegArgs = [...standardFilters, ...(customFilters.length > 0 ? custom : []), 'pipe:1'];

    let ls = spawn('ffmpeg', ffmpegArgs);

    if(url instanceof Readable || url instanceof PassThrough || url instanceof Duplex){
        url.pipe(ls.stdin);
    }

    const readable = new Readable({highWaterMark: 1048576 * 16, read(){}});
    const readableDuplicate = new Readable({highWaterMark: 1048576 * 16, read(){}});

    ls.stdout.on('data', chunk => {
        readable.push(chunk);
        readableDuplicate.push(chunk);
    });

    ls.stdout.on('end', () => {
        readable.push(null);
        readableDuplicate.push(null);
        ls.kill('SIGKILL');
        ls = null;
    });

    return {stream: readable, duplicate: readableDuplicate};
}

module.exports = { playAudio };
