const loader = require('./_common/fileLoader');
const Pine = require('qantra-pineapple');

/** 
 * Load any file that matches the pattern of function file and require them 
 * @return an array of the required functions
 */
module.exports = class ValidatorsLoader {
    constructor({ models, customValidators } = {}) {
        this.models = models;
        this.customValidators = customValidators;
    }

    load() {
        const validators = {};

        /**
         * Load schemas, models, and custom validators
         */
        const schemes = loader('./managers/**/*.schema.js');

        Object.keys(schemes).forEach((sk) => {
            let pine = new Pine({ models: this.models, customValidators: this.customValidators });
            validators[sk] = {};
            Object.keys(schemes[sk]).forEach((s) => {
                validators[sk][s] = async (data) => {
                    return await pine.validate(data, schemes[sk][s]);
                };
                validators[sk][`${s}Trimmer`] = async (data) => {
                    return await pine.trim(data, schemes[sk][s]);
                };
            });
        });

        // Add validators for School, Classroom, and Student
        validators.school = {
            ...schemes.school,
            ...this.customValidators.school,
        };

        validators.classroom = schemes.classroom;
        validators.student = schemes.student;

        return validators;
    }
};
