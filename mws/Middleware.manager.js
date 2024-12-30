module.exports = class MiddlewareExecutor {
    constructor() { }

    createBolt({ stack, req, res, onDone }) {
        return {
            run: async () => {
                const results = {};
                for (const middleware of stack) {
                    if (typeof middleware === 'function') {
                        await middleware(req, res, results);
                    }
                }
                onDone({ req, res, results });
            },
        };
    }
};
