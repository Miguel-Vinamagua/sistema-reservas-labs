const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../../src/app');
const Laboratorio = require('../../src/models/laboratorio.model');
const { connectTestDatabase } = require('../setup');

const jwtSecret = 'test-only-signing-secret';

function token(role = 'estudiante') {
  return jwt.sign(
    { rol: role },
    jwtSecret,
    { subject: '66a000000000000000000001', expiresIn: '1h' }
  );
}

describe('GET /api/laboratorios', () => {
  beforeAll(async () => {
    process.env.JWT_SECRET = jwtSecret;
    await connectTestDatabase();
  });

  afterAll(() => {
    delete process.env.JWT_SECRET;
  });

  it('lists active laboratories with the public catalog fields', async () => {
    const active = await Laboratorio.create({
      nombre: 'Laboratorio de Física',
      capacidad: 24,
      ubicacion: 'Bloque A, piso 2'
    });
    await Laboratorio.create({
      nombre: 'Laboratorio cerrado',
      capacidad: 12,
      ubicacion: 'Bloque B',
      activo: false
    });

    const response = await request(app)
      .get('/api/laboratorios')
      .set('Authorization', `Bearer ${token()}`)
      .expect(200);

    expect(response.body.data).toEqual([{
      id: active.id,
      nombre: 'Laboratorio de Física',
      capacidad: 24,
      ubicacion: 'Bloque A, piso 2'
    }]);
  });

  it('requires a valid token and allows teachers to consult the catalog', async () => {
    await request(app)
      .get('/api/laboratorios')
      .expect(401);

    await request(app)
      .get('/api/laboratorios')
      .set('Authorization', 'Bearer invalid.token.value')
      .expect(401);

    await request(app)
      .get('/api/laboratorios')
      .set('Authorization', `Bearer ${token('docente')}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.data).toEqual([]);
      });
  });
});
