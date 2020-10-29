const { Defaults, Publisher, Subscriber, Worker } = require('redis-request-broker');
const fs = require('fs');
const path = require('path');
const Lock = require('./lock');
const startLock = new Lock();
const log = require('./log');
const _commands = require('./commands');
let current = undefined;

module.exports.start = async base_config => {
    startLock.run(async () => {
        if (current)
            return;

        try {
            current = await this.build(base_config);
        }
        catch (error) {
            await log.log('error', 'Failed to start MemeHub-Config', error);
        }
    });
}

module.exports.stop = async () => {
    startLock.run(async () => {
        if (!current)
            return;

        try {
            await current.stop();
        }
        catch (error) {
            log.log('warning', 'Failed to stop', error);
        }
        finally {
            current = undefined;
        }
    });
}

const restart = module.exports.restart = async base_config => {
    await log.log('notice', 'Restarting...');
    startLock.run(async () => {
        if (current) {
            try {
                await current.stop();
            }
            catch (error) {
                log.log('warning', 'Failed to stop', error);
            }
            finally {
                current = undefined;
            }
        }

        try {
            current = await this.build(base_config);
        }
        catch (error) {
            await log.log('error', 'Failed to start MemeHub-Config', error);
        }
    });
}

module.exports.build = async base_config => {

    // init config file lock / promise
    let lock = new Lock();

    // Read config file
    let config = await read_config();

    // Set up rrb
    Defaults.setDefaults({
        redis: {
            prefix: "mh:",
            host: "mhredis",
            port: 6379
        }
    });

    // After init, connect to logger
    await log.start(config);

    // Connect to RRB
    const workerSet = new Worker(config.rrb.channels.config.set, set);
    const workerGet = new Worker(config.rrb.channels.config.get, get);
    const publisherChanged = new Publisher(config.rrb.channels.config.changed);
    const subscriberChanged = new Subscriber(config.rrb.channels.config.changed, onChanged);

    await Promise.all([
        workerSet.listen(),
        workerGet.listen(),
        publisherChanged.connect(),
        subscriberChanged.listen()
    ]);

    // Register telegram commands
    const commands = await _commands.build(config, get, set);

    await log.log('notice', 'Startup complete');

    /**
     * Set multiple config keys to new values.
     * @param {object} keys The config keys and their new values. 
     * @returns {boolean} True, if the config has been updated.
     */
    async function set(keys) {
        if (typeof keys !== 'object') {
            await log.log('warning', "Faild to set config key: Invalid parameter keys.", keys);
            throw new Error("Invalid parameter keys: Has to be an object");
        }

        if (Object.keys(keys).some(k => typeof k !== 'string')) {
            await log.log('warning', `Faild to set config key: "${k}" is not a string`, keys);
            throw new Error(`Invalid config key: "${k}" is not a string`);
        }

        if (Object.keys(keys).length < 1) {
            await log.log('notice', 'Strange config set request: No keys to set found.', keys);
            return false;
        }

        // Run the following while having the lock:
        // Read current file, apply changes, write new file
        await lock.run(async () => {
            // Read current file
            const new_config = await read_config_no_lock();

            // Apply changes
            for (const [key, value] of Object.entries(keys)) {
                const subkeys = key.split('.');
                let current_conf_part = new_config;
                for (const subkey of subkeys.slice(0, -1)) {
                    if (!(subkey in current_conf_part))
                        current_conf_part[subkey] = {};

                    current_conf_part = current_conf_part[subkey];
                }

                const final_subkey = subkeys[subkeys.length - 1];
                current_conf_part[final_subkey] = value;
            }

            // Write new file
            config = new_config;
            await save_config_no_lock(config);
        });

        // publish changed
        await log.log('info', 'Config updated', keys);
        await publisherChanged.publish(Object.keys(keys));
    }

    /**
     * Returns the current config
     */
    async function get(keys) {
        if (!keys)
            return config;

        if (!Array.isArray(keys))
            throw 'Invalid Parameter keys: Has to be an array';

        try {
            return keys.map(key => key.split('.').reduce((c, k) => c[k], config));
        }
        catch (e) {
            log.log('warning', 'Invalid / Unknown config key requested', { keys });
            throw 'One or more requested config keys do not exist';
        }
    }

    /**
     * Restart when the rrb config is changed.
     * @param {*} keys 
     */
    async function onChanged(keys) {
        if (!Array.isArray(keys))
            return;

        if (!keys.some(k => k.startsWith('rrb')))
            return;

        restart(base_config);
    }

    /**
     * Reads ands returns the current config file. If it does not exist,
     * the template file is read instead. 
     * @retuns The current config of the config file, parsed as json.
     * @throws If the template file cannot be read.
     */
    async function read_config() {
        return await lock.run(read_config_no_lock);
    }

    /**
     * The actual implementaion of read_config, but without using a lock.
     * Do only call while having the config file lock!
     */
    async function read_config_no_lock() {
        let config;
        let is_from_template = false;
        try {
            const file = await fs.promises.readFile(base_config.file);
            config = JSON.parse(file);
        }
        catch (error) {
            // This likely means that the config file does not exist.
            await log.log('notice', 'Cannot read config file. Using template.', error);
            const file = await fs.promises.readFile('./config.template.json');
            config = JSON.parse(file);
            is_from_template = true;
        }

        // Override bot_token if provided
        if (base_config.token && config.telegram.bot_token !== base_config.token) {
            console.warn('Overwriting telegram bot token with env variable.');
            config.telegram.bot_token = base_config.token;
        }

        // Write config, if template has been used
        if (is_from_template)
            await save_config_no_lock(config);

        // Queue restart if no bot_token is provided
        if (!config.telegram.bot_token) {
            console.warn('Config does not include a bot token! Please edit the config file to include the token at "telegram.bot_token" or set the \
                environment variable "BOT_TOKEN". Restarting in 30 seconds.');
            setTimeout(() => {
                restart(base_config);
            }, 30_000);
        }

        return config;
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
        await fs.promises.mkdir(path.dirname(base_config.file), { recursive: true });
        await fs.promises.writeFile(base_config.file, JSON.stringify(config))
    }

    return {
        stop: async function () {
            await log.log('notice', 'Shutting down...');
            await Promise.all([
                workerSet.stop(),
                workerGet.stop(),
                publisherChanged.disconnect(),
                subscriberChanged.stop(),
                commands.stop
            ]);
            await log.stop();
        }
    };
}

