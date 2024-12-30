const request = require('supertest');
const app = require('../app');

describe('Classrooms API', () => {
    let token;

    beforeAll(async () => {
        const res = await request(app)
            .post('/api/user/createUser')
            .send({ email: 'admin@example.com', password: 'StrongPass123!' });
        token = res.body.token;
    });

    test('Create a new classroom', async () => {
        const res = await request(app)
            .post('/api/classrooms')
            .set('Authorization', `Bearer ${token}`)
            .send({
                name: 'Math Room',
                capacity: 30,
                schoolId: 'school123',
            });

        expect(res.statusCode).toEqual(201);
        expect(res.body).toHaveProperty('data');
        expect(res.body.data).toHaveProperty('name', 'Math Room');
    });

    test('Fetch a classroom by ID', async () => {
        const classroomId = 'classroom123';
        const res = await request(app)
            .get(`/api/classrooms/${classroomId}`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toEqual(200);
        expect(res.body.data).toHaveProperty('id', classroomId);
    });
});
