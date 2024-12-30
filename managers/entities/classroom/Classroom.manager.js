module.exports = class Classroom {
    constructor({ utils, cache, config, managers, validators, mongomodels }) {
        this.config = config;
        this.cache = cache;
        this.validators = validators;
        this.mongomodels = mongomodels;
        this.classroomsCollection = 'classrooms';
        this.classroomExposed = [
            'post=createClassroom',
            'get=getClassroomById',
            'put=updateClassroom',
            'delete=deleteClassroom',
        ];
    }

    async createClassroom({ name, capacity, schoolId }) {
        const classroom = { name, capacity, schoolId };

        const validationError = await this.validators.classroom.createClassroom(classroom);
        if (validationError) return validationError;

        const createdClassroom = { _id: new Date().getTime(), ...classroom };
        await this.cache.set(`${this.classroomsCollection}:${createdClassroom._id}`, JSON.stringify(createdClassroom));

        return { success: true, classroom: createdClassroom };
    }

    async getClassroomById({ classroomId }) {
        const cachedClassroom = await this.cache.get(`${this.classroomsCollection}:${classroomId}`);
        if (cachedClassroom) return { success: true, classroom: JSON.parse(cachedClassroom) };

        const classroom = { _id: classroomId, name: 'Math Room', capacity: 30, schoolId: 'school123' };
        if (!classroom) return { error: 'Classroom not found' };

        await this.cache.set(`${this.classroomsCollection}:${classroomId}`, JSON.stringify(classroom));
        return { success: true, classroom };
    }

    async updateClassroom({ classroomId, updates }) {
        const classroom = { _id: classroomId, ...updates };
        await this.cache.set(`${this.classroomsCollection}:${classroomId}`, JSON.stringify(classroom));

        return { success: true, classroom };
    }

    async deleteClassroom({ classroomId }) {
        await this.cache.del(`${this.classroomsCollection}:${classroomId}`);
        return { success: true, message: 'Classroom deleted successfully' };
    }
};
