const http = require('http');
const express = require('express');
const cors = require('cors');
const app = express();

module.exports = class SchoolServer {
    constructor({ config, managers }) {
        this.config = config;
        this.schoolApi = managers.schoolApi;
        this.mws = managers.mwsRepo;
        this.schoolManager = managers.school;
    }

    /** For injecting additional middlewares */
    use(args) {
        app.use(args);
    }

    /** Define server configurations and routes */
    run() {
        app.use(cors({ origin: '*' }));
        app.use(express.json());
        app.use(express.urlencoded({ extended: true }));
        app.use('/static', express.static('public'));

        // Define routes
        this.defineRoutes();

        /** Error handler */
        app.use((err, req, res, next) => {
            console.error(err.stack);
            res.status(500).send('Something broke!');
        });

        const server = http.createServer(app);
        server.listen(this.config.dotEnv.USER_PORT, () => {
            console.log(`${(this.config.dotEnv.SERVICE_NAME).toUpperCase()} is running on port: ${this.config.dotEnv.USER_PORT}`);
        });
    }

    /** Define API routes */
    defineRoutes() {
        app.post('/api/schools', async (req, res) => {
            try {
                const { name, address, adminId } = req.body;
                const result = await this.schoolApi.mw({
                    method: 'post',
                    params: { moduleName: 'school', fnName: 'createSchool' },
                    body: { name, address, adminId }
                }, res);
                res.json(result);
            } catch (err) {
                console.error('Error in createSchool route:', err);
                res.status(500).json({ error: 'Failed to create school' });
            }
        });

        // Route for fetching school by ID
        app.get('/api/schools/:id', async (req, res) => {
            try {
                const { id } = req.params;
                const result = await this.schoolApi.mw({
                    method: 'get',
                    params: { moduleName: 'school', fnName: 'getSchoolById' },
                    body: { schoolId: id }
                }, res);
                res.json(result);
            } catch (err) {
                console.error('Error in getSchoolById route:', err);
                res.status(500).json({ error: 'Failed to fetch school' });
            }
        });
    }
};
