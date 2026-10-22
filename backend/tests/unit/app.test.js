const app = require('../../src/app');
const request = require('supertest');

describe('Express application', () => {
  it('exports an importable Express app', () => {
    expect(typeof app).toBe('function');
    expect(typeof app.listen).toBe('function');
  });

  it('parses JSON requests through Supertest without a persistent listener', async () => {
    app.post('/__test/json', (req, res) => {
      res.status(200).json(req.body);
    });

    await request(app)
      .post('/__test/json')
      .send({ ready: true })
      .expect(200, { ready: true });
  });

  it('allows the Angular frontend to preflight the login endpoint', async () => {
    await request(app)
      .options('/api/auth/login')
      .set('Origin', 'http://localhost:4200')
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'Content-Type, Authorization')
      .expect('Access-Control-Allow-Origin', 'http://localhost:4200')
      .expect('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
      .expect('Access-Control-Allow-Headers', 'Content-Type,Authorization')
      .expect(204);
  });
});
