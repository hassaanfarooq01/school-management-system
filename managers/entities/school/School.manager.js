module.exports = class School {
    constructor({ utils, cache, config, managers, validators, mongomodels }) {
        this.config = config;
        this.cache = cache;
        this.validators = validators;
        this.mongomodels = mongomodels;
        this.schoolsCollection = 'schools';
        this.schoolExposed = [
            'post=createSchool',
            'get=getSchoolById',
            'put=updateSchool',
            'delete=deleteSchool'
        ];
    }

    async createSchool({ name, address, adminId }) {
        const school = { name, address, adminId };

        const validationError = await this.validators.school.createSchool(school);
        if (validationError) {
            console.error('Validation Error:', validationError);
            return validationError;
        }

        const createdSchool = { _id: new Date().getTime(), ...school };

        const cacheKey = `${this.schoolsCollection}:${createdSchool._id}`;

        await this.cache.key.set(cacheKey, JSON.stringify(createdSchool));

        return { success: true, school: createdSchool };
    }

    async getSchoolById({ schoolId }) {
        if (!schoolId) {
            return { error: 'School ID is required' };
        }

        const cachedSchool = await this.cache.get(`${this.schoolsCollection}:${schoolId}`);
        if (cachedSchool) return { success: true, school: JSON.parse(cachedSchool) };

        const school = await this.mongomodels.School.findById(schoolId);
        if (!school) return { error: 'School not found' };

        await this.cache.key.set(`${this.schoolsCollection}:${schoolId}`, JSON.stringify(school));
        return { success: true, school };
    }

    async updateSchool({ schoolId, updates }) {
        if (!schoolId) return { error: 'School ID is required' };

        const school = { _id: schoolId, ...updates };
        await this.cache.set(`${this.schoolsCollection}:${schoolId}`, school);

        return { success: true, school };
    }

    async deleteSchool({ schoolId }) {
        if (!schoolId) return { error: 'School ID is required' };

        await this.cache.del(`${this.schoolsCollection}:${schoolId}`);
        return { success: true, message: 'School deleted successfully' };
    }
};
