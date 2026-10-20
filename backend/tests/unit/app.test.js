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
});
