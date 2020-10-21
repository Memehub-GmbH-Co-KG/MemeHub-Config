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
        token: process.env.BOT_TOKEN,
        file: process.env.FILE || 'config.json'
    };

    // Check for token
    if (!base_config.token) {
        console.error("Cannot start without a bot token. Set BOT_TOKEN when starting.");
        process.exit(1);
    }

    // Start the service
    try {
        await _config.start(base_config);
        await log.log('notice', 'Startup complete');
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