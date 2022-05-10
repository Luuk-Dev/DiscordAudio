const https = require('https');
const http = require('http');
const { Readable } = require('stream');
const AudioStream = require('./classes/audiostream.js');
const constants = require('./util/constants.js');;

function validateURL(url){
    try {
        return new URL(url);
    } catch {
        return false;
    }
}

const types = {https, http};

module.exports = (stream) => {
    return new Promise((resolve, reject) => {
        if(stream instanceof Readable) return resolve(new AudioStream(stream));
        if(typeof stream !== 'string') return reject(constants.ERRORMESSAGES.INVALID_STREAM_PARAMETER_CREATOR);

        const url = validateURL(stream);
        if(!url) return reject(constants.ERRORMESSAGES.INVALID_STREAM_URL);

        const readableStream = new Readable({highWaterMark: 1048576 * 32, read() {}}); 

        const req = types[url.protocol.split(':')[0].toLowerCase()].request({
            host: url.hostname,
            path: url.pathname + url.search,
            method: 'GET',
            headers: {
                'user-agent': 'Mozilla/5.0 (Windows NT 6.3) AppleWebKit/537.36.0 (KHTML, like Gecko) Chrome/61.0.0.0 Safari/537.36.0',
                'accept-language': 'en-US,en-IN;q=0.9,en;q=0.8,hi;q=0.7'
            }
        }, res => {
            if(!res.headers['content-type'].toLowerCase().startsWith('audio/')) return reject(constants.ERRORMESSAGES.STREAM_NOT_AUDIO);

            res.on('data', data => {
                readableStream.push(data);
            });

            res.on('error', error => {
                reject(error);
            });
        });

        req.on('error', error => {
            reject(error);
        });

        req.end();

        resolve(new AudioStream(readableStream, url.toString(), req));
    });
}
