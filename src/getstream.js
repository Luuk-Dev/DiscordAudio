const { pipeline } = require('stream');
const prism = require('prism-media');

const playAudio = (url, standardFilters = [], customFilters = []) => {

    const iFilter = standardFilters.filter(f => f === "--audio-url")[0];
    if(!iFilter) throw new Error('Invalid filters');
    const indexFilter = standardFilters.indexOf(iFilter);
    standardFilters[indexFilter] = url;

    let custom = ['-af', customFilters.join(',')];

    const transcoder = new prism.FFmpeg({
        args: [
            ...standardFilters,
            ...(customFilters.length > 0 ? custom : [])
        ],
        shell: false,
    });
    const opus = new prism.opus.Encoder({ rate: 48000, channels: 2, frameSize: 960 });
    
    return pipeline([transcoder, opus], () => {});
}

module.exports = { playAudio };
