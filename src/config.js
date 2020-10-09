const Redis = require('ioredis');
const { Defaults, Publisher, Subscriber, Worker } = require('redis-request-broker');
const structure = require('./structure');
const fs = require('fs');
const Lock = require('./lock');
const log = require('./log');

module.exports.build = async base_config => {

    // init config file lock / promise
    let lock = new Lock();

    // Read config file
    let config = await read_config();

    // Set up rrb
    Defaults.setDefaults(config.rrb.options);
    const workerSet = new Worker(config.rrb.queues.config.set, set);
    await workerSet.listen();

    // After init, connect to logger
    await log.start(config);

    async function set(key, value) {
        if (typeof key !== 'string')
            throw new Error('key is not a string');

        const keys = key.split('.');

        await lock.run(async () => {
            const new_config = await read_config_no_lock();
            let current_conf_part = new_config;
            for (const subkey of keys.slice(0, -1)) {
                if (!(subkey in current_conf_part))
                    current_conf_part[subkey] = {};

                current_conf_part = current_conf_part[subkey];
            }

            current_conf_part[keys[keys.length]] = value;
            await save_config_no_lock(new_config);
        });

        config = _config;
    }

    /**
     * Reads ands returns the current config file.
     * @retuns The current config of the config file, parsed as json.
     * @throws If the file cannot be read.
     */
    async function read_config() {
        return await lock.run(read_config_no_lock);
    }

    /**
     * The actual implementaion of read_config, but without using a lock.
     * Do only call while having the config file lock!
     */
    async function read_config_no_lock() {
        return await JSON.parse(await fs.promises.readFile(`../${base_config.file}`));
    }

    /**
     * Saves the contents of the provided object to the config files.
     * @param {object} config The config to save.
     * @throws If the file cannot be written.
     */
    async function save_config(config) {
        await lock.run(async () => save_config_no_lock(config));
    }
    /**
     * The actual implementation of save_config, but without using a lock.
     * Do only call while having the config file lock!
     * @param {object} config The config to save.
     * @throws If the file cannot be written.
     */
    async function save_config_no_lock(config) {
        await fs.promises.writeFile(`../${base_config.file}`, JSON.stringify(config))
    }



    return {
        stop: async function () {
            await log.log('notice', 'Shutting down...');
            await log.stop();
        }
    };
}

