const { Defaults } = require('redis-request-broker');
const log = require('./src/log');
const _config = require('./src/config');
let config;
let shuttingDown = false;

async function start() {
    console.log("Starting up...");

    // Get config from default / env
    const base_config = {
        env: process.env.NODE_ENV,
        token: process.env.BOT_TOKEN || undefined,
        file: process.env.FILE || '/etc/memehub/config.json'
    };

    // Start the service
    try {
        await _config.start(base_config);
    }
    catch (error) {
        log.log('error', 'Error during startup', error);
        await stop();
    }
}


async function stop() {
    if (shuttingDown)
        return;
    shuttingDown = true;

    try {
        if (config)
            await config.stop();
        console.log('Shutdown complete.');
    }
    catch (error) {
        console.error('Error duing shutdown:', error);
        process.exit(1);
    }
    finally {
        process.exit(0);
    }
}

start();
process.on('SIGINT', stop);
process.on('SIGQUIT', stop);
process.on('SIGTERM', stop);