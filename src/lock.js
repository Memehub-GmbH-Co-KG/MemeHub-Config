
module.exports = class Lock {
    /**
     * Creates a new lock.
     * Async code executed using the run function is guaranteed to
     * run in sequence.
     */
    constructor() {
        this.lock = undefined;
    }

    /**
     * Runs an executor function as soon as the lock is avaialable and
     * locks until the executor either returns or throws.
     * @returns What ever the executor returns
     * @throws whatever the executor throws
     * @param {Promise<any>} executor The async function to run with the lock
     */
    async run(executor) {
        while (lock)
            await lock;

        let error = undefined;
        let result = undefined;
        lock = new Promise(async (resolve, reject) => {
            try {
                result = await executor();
            }
            catch (e) {
                error = e;
            }
            finally {
                // release the lock
                lock = undefined;
                resolve();
            }
        });

        await lock;

        if (error)
            throw error;

        return result;
    }
}
