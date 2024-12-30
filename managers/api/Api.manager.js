const getParamNames = require('./_common/getParamNames');
/** 
 * scans all managers for exposed methods 
 * and makes them available through a handler middleware
 */

module.exports = class ApiHandler {

    /**
     * @param {object} containing instance of all managers
     * @param {string} prop with key to scan for exposed methods
     */

    constructor({ config, cortex, cache, managers, mwsRepo, prop, methodMatrix }) {
        this.config = config;
        this.cache = cache;
        this.cortex = cortex;
        this.managers = managers;
        this.mwsRepo = mwsRepo;
        this.mwsExec = this.managers?.mwsExec || {};
        this.prop = prop;
        this.methodMatrix = methodMatrix || {};
        this.mwsStack = {};
        this.mw = this.mw.bind(this);

        this.registerMethods();
    }

    /** filter only the modules that have interceptors */
    // console.log(`# Http API`);
    // Object.keys(this.managers).forEach(mk => {
    //     if (this.managers[mk][this.prop]) {
    //         console.log(`Registering module: ${mk} with exposed methods:`, this.managers[mk][this.prop]);
    //         this.methodMatrix[mk] = {};
    //         // console.log(`## ${mk}`);
    //         this.managers[mk][this.prop].forEach(i => {
    //             console.log(`Exposing method: ${i} in module: ${mk}`);
    //             let method = 'post';
    //             let fnName = i;
    //             if (i.includes("=")) {
    //                 let frags = i.split('=');
    //                 method = frags[0];
    //                 fnName = frags[1];
    //             }
    //             if (!this.methodMatrix[mk][method]) {
    //                 this.methodMatrix[mk][method] = [];
    //             }
    //             this.methodMatrix[mk][method].push(fnName);

    //             let params = getParamNames(this.managers[mk][fnName], fnName, mk);
    //             params = params.split(',').map(i => {
    //                 i = i.trim();
    //                 i = i.replace('{', '');
    //                 i = i.replace('}', '');
    //                 return i;
    //             })
    //             /** building middlewares stack */

    //             params.forEach(param => {
    //                 if (!this.mwsStack[`${mk}.${fnName}`]) {
    //                     this.mwsStack[`${mk}.${fnName}`] = [];
    //                 }
    //                 if (param.startsWith('__')) {
    //                     // this is a middleware identifier 
    //                     // mws are executed in the same order they existed
    //                     /** check if middleware exists */
    //                     // console.log(this.mwsRepo);
    //                     if (!this.mwsRepo[param]) {
    //                         throw Error(`Unable to find middleware ${param}`)
    //                     } else {
    //                         this.mwsStack[`${mk}.${fnName}`].push(param);
    //                     }
    //                 }
    //             })

    //             // console.log(`* ${i} :`, 'args=', params);

    //         });
    //     }
    // });
    registerMethods() {
        Object.keys(this.managers).forEach(mk => {
            if (this.managers[mk][this.prop]) {
                console.log(`Registering module: ${mk} with exposed methods:`, this.managers[mk][this.prop]);
                this.methodMatrix[mk] = {};
                this.managers[mk][this.prop].forEach(i => {
                    console.log(`Exposing method: ${i} in module: ${mk}`);
                    let method = 'post'; // Default to POST
                    let fnName = i;
                    if (i.includes("=")) {
                        let frags = i.split('=');
                        method = frags[0];
                        fnName = frags[1];
                    }
                    if (!this.methodMatrix[mk][method]) {
                        this.methodMatrix[mk][method] = [];
                    }
                    this.methodMatrix[mk][method].push(fnName);

                    // Build middlewares stack
                    if (!this.mwsStack[`${mk}.${fnName}`]) {
                        this.mwsStack[`${mk}.${fnName}`] = [];
                    }
                });
            } else {
                console.log(`Skipping module: ${mk} - No exposed methods for prop: ${this.prop}`);
            }
        });

        // Final log for methodMatrix
        console.log('Constructed Method Matrix:', JSON.stringify(this.methodMatrix, null, 2));

        //     /** expose apis through cortex */
        //     Object.keys(this.managers).forEach(mk => {
        //         if (this.managers[mk].interceptor) {
        //             this.exposed[mk] = this.managers[mk];
        //             // console.log(`## ${mk}`);
        //             if (this.exposed[mk].cortexExposed) {
        //                 this.exposed[mk].cortexExposed.forEach(i => {
        //                     // console.log(`* ${i} :`,getParamNames(this.exposed[mk][i]));
        //                 })
        //             }
        //         }
        //     });

        //     /** expose apis through cortex */
        //     this.cortex.sub('*', (d, meta, cb) => {
        //         let [moduleName, fnName] = meta.event.split('.');
        //         let targetModule = this.exposed[moduleName];
        //         if (!targetModule) return cb({ error: `module ${moduleName} not found` });
        //         try {
        //             targetModule.interceptor({ data: d, meta, cb, fnName });
        //         } catch (err) {
        //             cb({ error: `failed to execute ${fnName}` });
        //         }
        //     });

    }


    async _exec({ targetModule, fnName, cb, data }) {
        let result = {};

        try {
            result = await targetModule[`${fnName}`](data);
        } catch (err) {
            console.log(`error`, err);
            result.error = `${fnName} failed to execute`;
        }

        if (cb) cb(result);
        return result;
    }

    /** a middle for executing admin apis trough HTTP */
    async mw(req, res, next) {

        let method = req.method.toLowerCase();
        let moduleName = req.params.moduleName;
        let context = req.params.context;
        let fnName = req.params.fnName;
        let moduleMatrix = this.methodMatrix[moduleName];

        console.log('Initial Method Matrix:', JSON.stringify(this.methodMatrix, null, 2));
        this.registerMethods(); // Ensure this updates the shared methodMatrix
        console.log('Updated Method Matrix:', JSON.stringify(this.methodMatrix, null, 2));


        if (!moduleMatrix) {
            console.error(`Module not found: ${moduleName}`);
            return this.managers.responseDispatcher.dispatch(res, { ok: false, message: `module ${moduleName} not found` });
        }

        /** validate module */
        // if (!moduleMatrix) return this.managers.responseDispatcher.dispatch(res, { ok: false, message: `module ${moduleName} not found` });

        /** validate method */
        if (!moduleMatrix[method]) {
            console.error(`Unsupported method ${method} for module ${moduleName}`);
            return this.managers.responseDispatcher.dispatch(res, { ok: false, message: `unsupported method ${method} for ${moduleName}` });
        }

        if (!moduleMatrix[method].includes(fnName)) {
            console.error(`Function ${fnName} not found with method ${method} for module ${moduleName}`);
            return this.managers.responseDispatcher.dispatch(res, { ok: false, message: `unable to find function ${fnName} with method ${method}` });
        }

        // console.log(`${moduleName}.${fnName}`);

        const targetStack = this.mwsStack[`${moduleName}.${fnName}`] || [];
        console.log(`Middleware Stack for ${moduleName}.${fnName}:`, targetStack);

        // if (targetStack.length === 0) {
        //     console.log(`No middleware found for ${moduleName}.${fnName}. Proceeding without middleware.`);
        // }

        let hotBolt = this.mwsExec.createBolt({
            stack: targetStack, req, res, onDone: async ({ req, res, results }) => {

                /** executed after all middleware finished */

                let body = req.body || {};
                let result = await this._exec({
                    targetModule: this.managers[moduleName], fnName, data: {
                        ...body,
                        ...results,
                        res,
                    }
                });
                if (!result) result = {}

                if (result.selfHandleResponse) {
                    // do nothing if response handeled
                } else {

                    if (result.errors) {
                        return this.managers.responseDispatcher.dispatch(res, { ok: false, errors: result.errors });
                    } else if (result.error) {
                        return this.managers.responseDispatcher.dispatch(res, { ok: false, message: result.error });
                    } else {
                        return this.managers.responseDispatcher.dispatch(res, { ok: true, data: result });
                    }
                }
            }
        });
        hotBolt.run();
    }
}