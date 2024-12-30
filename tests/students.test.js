const request = require('supertest');
const app = require('../app');


describe('Students API', () => {
    let token;

    beforeAll(async () => {
        const res = await request(app)
            .post('/api/user/createUser')
            .send({ email: 'admin@example.com', password: 'StrongPass123!' });
        token = res.body.token;
    });

    test('Enroll a new student', async () => {
        const res = await request(app)
            .post('/api/students')
            .set('Authorization', `Bearer ${token}`)
            .send({
                name: 'John Doe',
                age: 16,
                schoolId: 'school123',
                classroomId: 'classroom123',
            });

        expect(res.statusCode).toEqual(201);
        expect(res.body).toHaveProperty('data');
        expect(res.body.data).toHaveProperty('name', 'John Doe');
    });

    test('Fetch a student by ID', async () => {
        const studentId = 'student123';
        const res = await request(app)
            .get(`/api/students/${studentId}`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toEqual(200);
        expect(res.body.data).toHaveProperty('id', studentId);
    });
});
