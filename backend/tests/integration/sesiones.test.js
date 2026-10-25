const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../../src/app');
const Laboratorio = require('../../src/models/laboratorio.model');
const SesionLaboratorio = require('../../src/models/sesion-laboratorio.model');
const { connectTestDatabase } = require('../setup');

const jwtSecret = 'test-only-signing-secret';
const teacherId = '66a000000000000000000002';
const studentId = '66a000000000000000000001';
const adminId = '66a000000000000000000003';

function token(userId, role) {
  return jwt.sign({ rol: role }, jwtSecret, { subject: userId, expiresIn: '1h' });
}

async function createLaboratory(overrides = {}) {
  return Laboratorio.create({
    nombre: 'Laboratorio de sesiones',
    capacidad: 16,
    ubicacion: 'Bloque B',
    ...overrides
  });
}

function sessionPayload(laboratorioId, overrides = {}) {
  const inicio = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
  return {
    laboratorioId,
    materia: ' Física ',
    actividad: ' Práctica ',
    inicio: inicio.toISOString(),
    fin: new Date(inicio.getTime() + 60 * 60 * 1000).toISOString(),
    ...overrides
  };
}

async function createSession(laboratory, overrides = {}) {
  const payload = sessionPayload(laboratory.id, overrides);
  return SesionLaboratorio.create({
    laboratorio: laboratory._id,
    docente: teacherId,
    materia: payload.materia,
    actividad: payload.actividad,
    inicio: payload.inicio,
    fin: payload.fin,
    capacidadMax: laboratory.capacidad,
    estado: payload.estado ?? 'disponible'
  });
}

describe('/api/sesiones-laboratorio', () => {
  beforeAll(async () => {
    process.env.JWT_SECRET = jwtSecret;
    await connectTestDatabase();
  });

  afterAll(() => {
    delete process.env.JWT_SECRET;
  });

  describe('POST /', () => {
    it('allows a teacher to create a session with laboratory capacity and available status', async () => {
      const laboratory = await createLaboratory();
      const response = await request(app)
        .post('/api/sesiones-laboratorio')
        .set('Authorization', `Bearer ${token(teacherId, 'docente')}`)
        .send(sessionPayload(laboratory.id))
        .expect(201);

      expect(response.body.data).toMatchObject({
        id: expect.any(String),
        laboratorio: {
          id: laboratory.id,
          nombre: laboratory.nombre,
          ubicacion: laboratory.ubicacion
        },
        docente: teacherId,
        materia: 'Física',
        actividad: 'Práctica',
        capacidadMax: laboratory.capacidad,
        inscritosCount: 0,
        estado: 'disponible'
      });
      expect(await SesionLaboratorio.countDocuments()).toBe(1);
    });

    it('rejects users other than teachers', async () => {
      const laboratory = await createLaboratory();

      await request(app)
        .post('/api/sesiones-laboratorio')
        .set('Authorization', `Bearer ${token(studentId, 'estudiante')}`)
        .send(sessionPayload(laboratory.id))
        .expect(403);

      await expect(SesionLaboratorio.countDocuments()).resolves.toBe(0);
    });

    it('rejects a session whose end is not after its start', async () => {
      const laboratory = await createLaboratory();
      const payload = sessionPayload(laboratory.id);
      payload.fin = payload.inicio;

      await request(app)
        .post('/api/sesiones-laboratorio')
        .set('Authorization', `Bearer ${token(teacherId, 'docente')}`)
        .send(payload)
        .expect(400);

      await expect(SesionLaboratorio.countDocuments()).resolves.toBe(0);
    });

    it('rejects invalid input, unknown laboratories, and inactive laboratories', async () => {
      const laboratory = await createLaboratory();
      const payload = sessionPayload(laboratory.id);

      await request(app)
        .post('/api/sesiones-laboratorio')
        .set('Authorization', `Bearer ${token(teacherId, 'docente')}`)
        .send({ ...payload, materia: ' ' })
        .expect(400);
      await request(app)
        .post('/api/sesiones-laboratorio')
        .set('Authorization', `Bearer ${token(teacherId, 'docente')}`)
        .send(sessionPayload('66a000000000000000000099'))
        .expect(404);

      await Laboratorio.updateOne({ _id: laboratory._id }, { activo: false });
      await request(app)
        .post('/api/sesiones-laboratorio')
        .set('Authorization', `Bearer ${token(teacherId, 'docente')}`)
        .send(payload)
        .expect(409);

      await expect(SesionLaboratorio.countDocuments()).resolves.toBe(0);
    });
  });

  describe('GET /', () => {
    it('lists only available sessions for active laboratories', async () => {
      const laboratory = await createLaboratory();
      const inactiveLaboratory = await createLaboratory({ nombre: 'Laboratorio inactivo', activo: false });
      const available = await createSession(laboratory);
      await createSession(laboratory, { estado: 'llena' });
      await createSession(inactiveLaboratory);

      const response = await request(app)
        .get('/api/sesiones-laboratorio')
        .set('Authorization', `Bearer ${token(studentId, 'estudiante')}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].id).toBe(available.id);
      expect(response.body.data[0].estado).toBe('disponible');
    });

    it('does not allow administrators to list student sessions', async () => {
      await request(app)
        .get('/api/sesiones-laboratorio')
        .set('Authorization', `Bearer ${token(adminId, 'administrador')}`)
        .expect(403);
    });
  });
});
