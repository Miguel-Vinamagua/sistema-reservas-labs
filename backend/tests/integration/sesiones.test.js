const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../../src/app');
const Laboratorio = require('../../src/models/laboratorio.model');
const Materia = require('../../src/models/materia.model');
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
  const start = new Date(payload.inicio);
  return SesionLaboratorio.create({
    laboratorio: laboratory._id,
    docente: teacherId,
    materia: payload.materia,
    actividad: payload.actividad,
    fecha: new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate())),
    inicio: start,
    fin: payload.fin,
    cupos: payload.cupos ?? laboratory.capacidad,
    estado: payload.estado ?? 'abierta'
  });
}

async function createTeacherSubject(name = 'Física', docente = teacherId) {
  return Materia.create({
    nombre: name,
    codigo: name === 'Física' ? 'FIS-101' : 'MAT-101',
    docente: new mongoose.Types.ObjectId(docente)
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
      await createTeacherSubject();
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
        cupos: laboratory.capacidad,
        fecha: expect.any(String),
        estado: 'abierta'
      });
      expect(await SesionLaboratorio.countDocuments()).toBe(1);
    });

    it('allows a teacher to reduce quotas below laboratory capacity', async () => {
      const laboratory = await createLaboratory();
      await createTeacherSubject();

      const response = await request(app)
        .post('/api/sesiones-laboratorio')
        .set('Authorization', `Bearer ${token(teacherId, 'docente')}`)
        .send({ ...sessionPayload(laboratory.id), cupos: laboratory.capacidad - 2 })
        .expect(201);

      expect(response.body.data.cupos).toBe(laboratory.capacidad - 2);
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

    it('requires authentication', async () => {
      const laboratory = await createLaboratory();

      await request(app)
        .post('/api/sesiones-laboratorio')
        .send(sessionPayload(laboratory.id))
        .expect(401);
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
      await createSession(laboratory, { estado: 'cancelada' });
      await createSession(inactiveLaboratory);

      const response = await request(app)
        .get('/api/sesiones-laboratorio')
        .set('Authorization', `Bearer ${token(studentId, 'estudiante')}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].id).toBe(available.id);
      expect(response.body.data[0].estado).toBe('abierta');
    });

    it('finalizes expired open sessions before returning available sessions', async () => {
      const laboratory = await createLaboratory();
      const end = new Date(Date.now() - 60 * 1000);
      const expiredSession = await createSession(laboratory, {
        inicio: new Date(end.getTime() - 60 * 60 * 1000).toISOString(),
        fin: end.toISOString()
      });

      const response = await request(app)
        .get('/api/sesiones-laboratorio')
        .set('Authorization', `****** 'estudiante')}`)
        .expect(200);

      expect(response.body.data).toEqual([]);
      await expect(SesionLaboratorio.findById(expiredSession._id).lean())
        .resolves.toMatchObject({ estado: 'finalizada' });
    });

    it('does not allow administrators to list student sessions', async () => {
      await request(app)
        .get('/api/sesiones-laboratorio')
        .set('Authorization', `Bearer ${token(adminId, 'administrador')}`)
        .expect(403);
    });

    it('does not allow administrators to access the teacher session list', async () => {
      await request(app)
        .get('/api/sesiones-laboratorio/mias')
        .set('Authorization', `Bearer ${token(adminId, 'administrador')}`)
        .expect(403);
    });

    it('requires authentication', async () => {
      await request(app).get('/api/sesiones-laboratorio/mias').expect(401);
    });

    it('requires authentication', async () => {
      await request(app).get('/api/sesiones-laboratorio').expect(401);
    });
  });

  describe('GET /mias', () => {
    it('returns all sessions created by the authenticated teacher only', async () => {
      const laboratory = await createLaboratory();
      const ownSession = await createSession(laboratory, {
        estado: 'llena',
        cupos: 16
      });
      const otherSession = await createSession(laboratory);
      await SesionLaboratorio.updateOne(
        { _id: otherSession._id },
        { docente: '66a000000000000000000004' }
      );

      const response = await request(app)
        .get('/api/sesiones-laboratorio/mias')
        .set('Authorization', `Bearer ${token(teacherId, 'docente')}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]).toMatchObject({
        id: ownSession.id,
        estado: 'llena',
        laboratorio: {
          id: laboratory.id,
          nombre: laboratory.nombre
        }
      });
    });

    it('does not allow students to access the teacher session list', async () => {
      await request(app)
        .get('/api/sesiones-laboratorio/mias')
        .set('Authorization', `Bearer ${token(studentId, 'estudiante')}`)
        .expect(403);
    });

    it('marks expired open and full sessions as finished when listing the teacher sessions', async () => {
      const laboratory = await createLaboratory();
      const expiredEnd = new Date(Date.now() - 60 * 1000);
      const openSession = await createSession(laboratory, {
        inicio: new Date(expiredEnd.getTime() - 60 * 60 * 1000).toISOString(),
        fin: expiredEnd.toISOString(),
        estado: 'abierta'
      });
      const fullSession = await createSession(laboratory, {
        inicio: new Date(expiredEnd.getTime() - 60 * 60 * 1000).toISOString(),
        fin: expiredEnd.toISOString(),
        estado: 'llena'
      });

      const response = await request(app)
        .get('/api/sesiones-laboratorio/mias')
        .set('Authorization', `****** 'docente')}`)
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.data.map(({ estado }) => estado)).toEqual(['finalizada', 'finalizada']);
      await expect(SesionLaboratorio.findById(openSession._id).lean())
        .resolves.toMatchObject({ estado: 'finalizada' });
      await expect(SesionLaboratorio.findById(fullSession._id).lean())
        .resolves.toMatchObject({ estado: 'finalizada' });
    });
  });

  describe('/api/materias', () => {
    it('lists the subjects of the authenticated teacher', async () => {
      const teacherObjectId = new mongoose.Types.ObjectId(teacherId);
      await Materia.create({ nombre: 'Matemática', codigo: 'MAT-101', docente: teacherObjectId });
      await Materia.create({ nombre: 'Física', codigo: 'FIS-101', docente: teacherObjectId });

      const response = await request(app)
        .get('/api/materias')
        .set('Authorization', `Bearer ${token(teacherId, 'docente')}`)
        .expect(200);

      expect(response.body.data).toHaveLength(2);
    });

    it('does not allow students to list subjects', async () => {
      await request(app)
        .get('/api/materias')
        .set('Authorization', `Bearer ${token(studentId, 'estudiante')}`)
        .expect(403);
    });

    it('does not allow administrators to list subjects', async () => {
      await request(app)
        .get('/api/materias')
        .set('Authorization', `Bearer ${token(adminId, 'administrador')}`)
        .expect(403);
    });

    it('requires authentication to list subjects', async () => {
      await request(app).get('/api/materias').expect(401);
    });
  });

  describe('POST /api/sesiones-laboratorio - teacher session validations', () => {
    it('does not allow an administrator to create a session', async () => {
      const laboratory = await createLaboratory();

      await request(app)
        .post('/api/sesiones-laboratorio')
        .set('Authorization', `Bearer ${token(adminId, 'administrador')}`)
        .send(sessionPayload(laboratory.id))
        .expect(403);
    });

    it.each([0, -1, 1.5, 21])('rejects invalid cupos: %s', async (cupos) => {
      const laboratory = await createLaboratory();
      await createTeacherSubject();

      await request(app)
        .post('/api/sesiones-laboratorio')
        .set('Authorization', `Bearer ${token(teacherId, 'docente')}`)
        .send({ ...sessionPayload(laboratory.id), cupos })
        .expect(400);

      await expect(SesionLaboratorio.countDocuments()).resolves.toBe(0);
    });

    it('rejects overlapping sessions for the same laboratory', async () => {
      const laboratory = await createLaboratory();
      await createTeacherSubject();
      const first = await createSession(laboratory);
      const secondPayload = sessionPayload(laboratory.id);
      secondPayload.inicio = new Date(first.inicio.getTime() + 30 * 60 * 1000).toISOString();
      secondPayload.fin = new Date(first.fin.getTime() + 30 * 60 * 1000).toISOString();

      const response = await request(app)
        .post('/api/sesiones-laboratorio')
        .set('Authorization', `Bearer ${token(teacherId, 'docente')}`)
        .send(secondPayload)
        .expect(409);

      expect(response.body.error.code).toBe('SESSION_TIME_CONFLICT');
      await expect(SesionLaboratorio.countDocuments()).resolves.toBe(1);
    });

    it('rejects subjects that are not associated with the teacher', async () => {
      const laboratory = await createLaboratory();
      const otherTeacherId = new mongoose.Types.ObjectId('66a000000000000000000009');
      await Materia.create({ nombre: 'Química', codigo: 'QUI-101', docente: otherTeacherId });

      const response = await request(app)
        .post('/api/sesiones-laboratorio')
        .set('Authorization', `Bearer ${token(teacherId, 'docente')}`)
        .send({ ...sessionPayload(laboratory.id), materia: 'Química' })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      await expect(SesionLaboratorio.countDocuments()).resolves.toBe(0);
    });

    it('rejects sessions whose start date is in the past', async () => {
      const laboratory = await createLaboratory();
      const payload = sessionPayload(laboratory.id);
      payload.inicio = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      payload.fin = new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString();

      const response = await request(app)
        .post('/api/sesiones-laboratorio')
        .set('Authorization', `Bearer ${token(teacherId, 'docente')}`)
        .send(payload)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      await expect(SesionLaboratorio.countDocuments()).resolves.toBe(0);
    });

    it('requires non-empty activity and subject', async () => {
      const laboratory = await createLaboratory();
      await createTeacherSubject();
      const authorization = `Bearer ${token(teacherId, 'docente')}`;

      await request(app)
        .post('/api/sesiones-laboratorio')
        .set('Authorization', authorization)
        .send({ ...sessionPayload(laboratory.id), actividad: '  ' })
        .expect(400);
      await request(app)
        .post('/api/sesiones-laboratorio')
        .set('Authorization', authorization)
        .send({ ...sessionPayload(laboratory.id), materia: '  ' })
        .expect(400);
      await expect(SesionLaboratorio.countDocuments()).resolves.toBe(0);
    });
  });

  describe('PATCH /api/sesiones-laboratorio/:id/cancelar', () => {
    it('allows the owning teacher to cancel a session', async () => {
      const laboratory = await createLaboratory();
      const session = await createSession(laboratory);

      const response = await request(app)
        .patch(`/api/sesiones-laboratorio/${session.id}/cancelar`)
        .set('Authorization', `Bearer ${token(teacherId, 'docente')}`)
        .expect(200);

      expect(response.body.data.estado).toBe('cancelada');
    });

    it('does not allow a student to cancel a session', async () => {
      const laboratory = await createLaboratory();
      const session = await createSession(laboratory);

      const response = await request(app)
        .patch(`/api/sesiones-laboratorio/${session.id}/cancelar`)
        .set('Authorization', `Bearer ${token(studentId, 'estudiante')}`)
        .expect(403);

      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('does not allow an administrator to cancel a session', async () => {
      const laboratory = await createLaboratory();
      const session = await createSession(laboratory);

      const response = await request(app)
        .patch(`/api/sesiones-laboratorio/${session.id}/cancelar`)
        .set('Authorization', `Bearer ${token(adminId, 'administrador')}`)
        .expect(403);

      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('requires authentication to cancel a session', async () => {
      const response = await request(app)
        .patch('/api/sesiones-laboratorio/66a000000000000000000099/cancelar')
        .expect(401);

      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('does not allow a teacher to cancel another teacher session', async () => {
      const laboratory = await createLaboratory();
      const session = await createSession(laboratory);

      await request(app)
        .patch(`/api/sesiones-laboratorio/${session.id}/cancelar`)
        .set('Authorization', `Bearer ${token('66a000000000000000000009', 'docente')}`)
        .expect(404);
    });
  });
});
