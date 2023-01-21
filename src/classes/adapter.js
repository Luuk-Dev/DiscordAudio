const { createAdapter } = require('../adapter.js');
const constants = require('../util/constants.js');

class Adapter{
    /**
     * Creates an adapter for voice connections. Works for multiple Discord.js versions.
     * @param {object} channel The voice channel to create an adapter for.
     * @returns A Discord.js music adapter.
     * @example
     * const adapter = new Adapter(<channel>);
     */
    constructor(channel){
        if(typeof channel === 'undefined' || channel === undefined || channel === "") throw new Error(constants.ERRORMESSAGES.REQUIRED_PARAMETER_CHANNEL);
        
        const adapter = createAdapter(channel);

        return adapter;
    }
}

module.exports = {Adapter};
