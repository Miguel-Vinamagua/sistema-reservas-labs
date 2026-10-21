const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../../src/app');
const Laboratorio = require('../../src/models/laboratorio.model');
const Reserva = require('../../src/models/reserva.model');
const { connectTestDatabase } = require('../setup');

const jwtSecret = 'test-only-signing-secret';

function token(userId) {
  return jwt.sign(
    { rol: 'estudiante' },
    jwtSecret,
    { subject: userId, expiresIn: '1h' }
  );
}

describe('concurrent reservation requests', () => {
  beforeAll(async () => {
    process.env.JWT_SECRET = jwtSecret;
    await connectTestDatabase();
  });

  afterAll(() => {
    delete process.env.JWT_SECRET;
  });

  it('creates at most one active reservation for simultaneous overlapping requests', async () => {
    const laboratory = await Laboratorio.create({
      nombre: 'Laboratorio concurrente',
      capacidad: 20,
      ubicacion: 'Bloque A'
    });
    const date = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const payload = {
      laboratorioId: laboratory.id,
      inicio: `${date}T10:00:00-05:00`,
      fin: `${date}T12:00:00-05:00`
    };

    const responses = await Promise.all([
      request(app)
        .post('/api/reservas')
        .set('Authorization', `Bearer ${token('66a000000000000000000001')}`)
        .send(payload),
      request(app)
        .post('/api/reservas')
        .set('Authorization', `Bearer ${token('66a000000000000000000002')}`)
        .send(payload)
    ]);

    expect(responses.map(({ status }) => status).sort()).toEqual([201, 409]);
    expect(await Reserva.countDocuments({
      laboratorio: laboratory._id,
      estado: 'activa'
    })).toBe(1);
  });
});
