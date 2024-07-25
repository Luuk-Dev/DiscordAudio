const { Readable } = require('stream');
const https = require('https');
const http = require('http');
const { URL } = require('url');
const reqTypes = {https: https, http: http};

function validateURL(url){
    try{
        return new URL(url);
    } catch {
        return false;
    }
}

function createStream(url){
    return new Promise((resolve, reject) => {
        if(typeof url !== 'string') return reject(`URL is not a type of string`);

        const parsed = validateURL(url);
        if(!parsed) return reject(`URL is not a valid URL`);

        const req = reqTypes[parsed.protocol.split(':')[0].toLowerCase()].request({
            host: parsed.hostname,
            path: parsed.pathname + parsed.search,
            method: 'GET'
        }, res => {
            const readable = new Readable({highWaterMark: 1048576 * 16, read(){}});

            let resolved = false;
            let chunkCount = 0;

            res.on('data', chunk => {
                readable.push(chunk);
                ++chunkCount;
                if(!resolved && chunkCount >= 3){
                    resolved = true;
                    resolve({stream: readable, mimeType: res.headers['content-type']});
                }
            });

            res.on('error', err => {
                reject(err);
            });

            res.on('end', () => {
                if(!resolved) return resolve({stream: readable, mimeType: res.headers['content-type']});
            });
        });

        req.on('error', err => {
            reject(err);
        });

        req.end();
    });
}

module.exports = createStream;
