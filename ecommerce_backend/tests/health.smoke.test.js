const request = require('supertest');
const app = require('../src/app');

describe('Backend smoke test', () => {
  test('GET / should return a healthy status payload', async () => {
    const res = await request(app).get('/');

    expect(res.statusCode).toBe(200);

    // Keep assertions minimal but meaningful; the timestamp is dynamic.
    expect(res.body).toEqual(
      expect.objectContaining({
        status: 'ok',
        message: 'Service is healthy',
        environment: expect.any(String),
        timestamp: expect.any(String),
      })
    );
  });
});
