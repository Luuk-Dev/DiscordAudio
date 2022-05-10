class AudioStream{
    constructor(stream, url, req){
        this.stream = stream;
        this.req = req;
        this.url = url;
        this.createdAt = new Date().getTime();
    }
    abort(){
        if(typeof this.req !== 'undefined'){
            this.req.destroy();
        }
    }
}

module.exports = AudioStream;
