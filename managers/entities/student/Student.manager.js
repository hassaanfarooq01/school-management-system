module.exports = class Student {
    constructor({ utils, cache, config, managers, validators, mongomodels }) {
        this.config = config;
        this.cache = cache;
        this.validators = validators;
        this.mongomodels = mongomodels;
        this.studentsCollection = 'students';
        this.studentExposed = [
            'post=createStudent',
            'get=getStudentById',
            'put=updateStudent',
            'delete=deleteStudent',
        ];
    }

    async createStudent({ name, age, schoolId, classroomId }) {
        const student = { name, age, schoolId, classroomId };

        const validationError = await this.validators.student.createStudent(student);
        if (validationError) return validationError;

        const createdStudent = { _id: new Date().getTime(), ...student };
        await this.cache.set(`${this.studentsCollection}:${createdStudent._id}`, JSON.stringify(createdStudent));

        return { success: true, student: createdStudent };
    }

    async getStudentById({ studentId }) {
        const cachedStudent = await this.cache.get(`${this.studentsCollection}:${studentId}`);
        if (cachedStudent) return { success: true, student: JSON.parse(cachedStudent) };

        const student = { _id: studentId, name: 'John Doe', age: 16, schoolId: 'school123', classroomId: 'classroom123' };
        if (!student) return { error: 'Student not found' };

        await this.cache.set(`${this.studentsCollection}:${studentId}`, JSON.stringify(student));
        return { success: true, student };
    }

    async updateStudent({ studentId, updates }) {
        const student = { _id: studentId, ...updates };
        await this.cache.set(`${this.studentsCollection}:${studentId}`, JSON.stringify(student));

        return { success: true, student };
    }

    async deleteStudent({ studentId }) {
        await this.cache.del(`${this.studentsCollection}:${studentId}`);
        return { success: true, message: 'Student deleted successfully' };
    }
};
