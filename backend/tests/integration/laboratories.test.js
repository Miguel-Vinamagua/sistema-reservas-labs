const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../../src/app');
const Laboratorio = require('../../src/models/laboratorio.model');
const SesionLaboratorio = require('../../src/models/sesion-laboratorio.model');
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
      ubicacion: 'Bloque A, piso 2',
      ocupado: false,
      ocupadoHasta: null
    }]);
  });

  it('reports occupied laboratories only for sessions currently in progress', async () => {
    const occupied = await Laboratorio.create({
      nombre: 'Laboratorio ocupado',
      capacidad: 18,
      ubicacion: 'Bloque A'
    });
    const finished = await Laboratorio.create({
      nombre: 'Laboratorio libre',
      capacidad: 12,
      ubicacion: 'Bloque B'
    });
    const now = Date.now();
    const makeSession = (laboratory, state, start, end) => SesionLaboratorio.create({
      laboratorio: laboratory._id,
      docente: '66a000000000000000000002',
      materia: 'Física',
      actividad: 'Práctica',
      fecha: new Date(start),
      inicio: new Date(start),
      fin: new Date(end),
      cupos: laboratory.capacidad,
      estado: state
    });
    await makeSession(occupied, 'abierta', now - 60_000, now + 60_000);
    await makeSession(finished, 'abierta', now - 120_000, now - 60_000);
    await makeSession(finished, 'cancelada', now - 60_000, now + 60_000);

    const response = await request(app)
      .get('/api/laboratorios')
      .set('Authorization', `****** 'estudiante')}`)
      .expect(200);

    expect(response.body.data).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: occupied.id,
        ocupado: true,
        ocupadoHasta: expect.any(String)
      }),
      expect.objectContaining({
        id: finished.id,
        ocupado: false,
        ocupadoHasta: null
      })
    ]));
    await expect(
      SesionLaboratorio.findOne({ laboratorio: finished._id, fin: { $lt: new Date(now) } }).lean()
    ).resolves.toMatchObject({ estado: 'finalizada' });
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
