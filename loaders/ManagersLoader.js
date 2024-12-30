const MiddlewaresLoader = require('./MiddlewaresLoader');
const ApiHandler = require("../managers/api/Api.manager");
const LiveDB = require('../managers/live_db/LiveDb.manager');
const UserServer = require('../managers/http/UserServer.manager');
const SchoolServer = require('../managers/http/SchoolServer.manager');
const ClassroomServer = require('../managers/http/ClassroomServer.manager');
const StudentServer = require('../managers/http/StudentServer.manager');
const ResponseDispatcher = require('../managers/response_dispatcher/ResponseDispatcher.manager');
const VirtualStack = require('../managers/virtual_stack/VirtualStack.manager');
const ValidatorsLoader = require('./ValidatorsLoader');
const ResourceMeshLoader = require('./ResourceMeshLoader');
const utils = require('../libs/utils');

const systemArch = require('../static_arch/main.system');
const TokenManager = require('../managers/token/Token.manager');
const SharkFin = require('../managers/shark_fin/SharkFin.manager');
const TimeMachine = require('../managers/time_machine/TimeMachine.manager');
const User = require('../managers/entities/user/User.manager');
const SchoolManager = require('../managers/entities/school/School.manager');
const ClassroomManager = require('../managers/entities/classroom/Classroom.manager');
const StudentManager = require('../managers/entities/student/Student.manager');
const MiddlewareExecutor = require('../mws/Middleware.manager');
const { createClient } = require('../cache/redis-client');

module.exports = class ManagersLoader {
    constructor({ config, cortex, cache, oyster, aeon }) {
        this.managers = {};
        this.config = config;
        this.cache = cache;
        this.cortex = cortex;
        this.methodMatrix = {};

        this.cache = createClient({
            prefix: this.config.dotEnv.CACHE_PREFIX,
            url: this.config.dotEnv.CACHE_REDIS,
        });

        this._preload();
        this.injectable = {
            utils,
            cache,
            config,
            cortex,
            oyster,
            aeon,
            managers: this.managers,
            validators: this.validators,
            resourceNodes: this.resourceNodes,
            methodMatrix: this.methodMatrix,
        };
    }

    _preload() {
        const validatorsLoader = new ValidatorsLoader({
            models: require('../managers/_common/schema.models'),
            customValidators: require('../managers/_common/schema.validators'),
        });
        const resourceMeshLoader = new ResourceMeshLoader();

        this.validators = validatorsLoader.load();
        this.resourceNodes = resourceMeshLoader.load();
    }

    load() {
        this.managers.responseDispatcher = new ResponseDispatcher();
        this.managers.liveDb = new LiveDB(this.injectable);
        const middlewaresLoader = new MiddlewaresLoader(this.injectable);
        const mwsRepo = middlewaresLoader.load();
        const { layers, actions } = systemArch;
        this.injectable.mwsRepo = mwsRepo;

        /*****************************************CUSTOM MANAGERS*****************************************/
        this.managers.shark = new SharkFin({ ...this.injectable, layers, actions });
        this.managers.timeMachine = new TimeMachine(this.injectable);
        this.managers.token = new TokenManager(this.injectable);
        this.managers.mwsExec = new MiddlewareExecutor();

        // Register School, Classroom, and Student Managers
        this.managers.user = new User(this.injectable);
        this.managers.school = new SchoolManager(this.injectable);
        this.managers.classroom = new ClassroomManager(this.injectable);
        this.managers.student = new StudentManager(this.injectable);

        // API Handlers
        this.managers.userApi = new ApiHandler({ ...this.injectable, ...{ prop: 'userExposed' }, methodMatrix: this.methodMatrix, });
        this.managers.schoolApi = new ApiHandler({
            ...this.injectable,
            prop: 'schoolExposed',
            methodMatrix: this.methodMatrix,
        });
        this.managers.classroomApi = new ApiHandler({
            ...this.injectable,
            prop: 'classroomExposed',
            methodMatrix: this.methodMatrix,
        });

        this.managers.studentApi = new ApiHandler({
            ...this.injectable,
            prop: 'studentExposed',
            methodMatrix: this.methodMatrix,
        });

        // HTTP Servers
        this.managers.userServer = new UserServer({ config: this.config, managers: this.managers });
        this.managers.schoolServer = new SchoolServer({ config: this.config, managers: this.managers });
        this.managers.classroomServer = new ClassroomServer({ config: this.config, managers: this.managers });
        this.managers.studentServer = new StudentServer({ config: this.config, managers: this.managers });

        return this.managers;
    }
};
