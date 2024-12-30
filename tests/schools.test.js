const request = require('supertest');
const app = require('../app');

describe('Schools API', () => {
    let token;

    beforeAll(async () => {
        // Login to get a token
        const res = await request(app)
            .post('/api/user/createUser')
            .send({ email: 'superadmin@example.com', password: 'StrongPass123!' });
        token = res.body.token;
    });

    test('Create a new school', async () => {
        const res = await request(app)
            .post('/api/schools')
            .set('Authorization', `Bearer ${token}`)
            .send({
                name: 'Springfield High',
                address: '123 Main St',
                adminId: 'admin123',
            });

        expect(res.statusCode).toEqual(201);
        expect(res.body).toHaveProperty('data');
        expect(res.body.data).toHaveProperty('name', 'Springfield High');
    });

    test('Fetch a school by ID', async () => {
        const schoolId = '1735206484466';
        const res = await request(app)
            .get(`/api/schools/${schoolId}`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('data');
        expect(res.body.data).toHaveProperty('id', schoolId);
    });

    test('Fail to fetch school without token', async () => {
        const schoolId = 'school123';
        const res = await request(app).get(`/api/schools/${schoolId}`);

        expect(res.statusCode).toEqual(403);
        expect(res.body).toHaveProperty('message', 'Access denied');
    });
});
