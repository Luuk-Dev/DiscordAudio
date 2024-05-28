const { spawn } = require('child_process');
const prism = require('prism-media');

const playAudio = (url, standardFilters = [], customFilters = [], ffmpeg) => {
    if(!ffmpeg) return url;

    const iFilter = standardFilters.filter(f => f === "--audio-url")[0];
    if(!iFilter) throw new Error('Invalid filters');
    const indexFilter = standardFilters.indexOf(iFilter);
    standardFilters[indexFilter] = url;

    let custom = ['-af', customFilters.join(',')];

    let ls = spawn('ffmpeg', [...standardFilters, ...(customFilters.length > 0 ? custom : []), 'pipe:1']);
    
    const opus = new prism.opus.Encoder({ rate: 48000, channels: 2, frameSize: 960 });

    opus.on('close', () => {
        ls.kill('SIGKILL');
        ls = null;
        opus.destroy();
    });
    
    ls.stdout.pipe(opus);

    return opus;
}

module.exports = { playAudio };
