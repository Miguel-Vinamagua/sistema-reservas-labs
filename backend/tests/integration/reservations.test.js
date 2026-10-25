const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../../src/app');
const Laboratorio = require('../../src/models/laboratorio.model');
const Reserva = require('../../src/models/reserva.model');
const SesionLaboratorio = require('../../src/models/sesion-laboratorio.model');
const { connectTestDatabase } = require('../setup');

const jwtSecret = 'test-only-signing-secret';
const studentId = '66a000000000000000000001';
const teacherId = '66a000000000000000000002';
const adminId = '66a000000000000000000003';

function token(userId = studentId, role = 'estudiante') {
  return jwt.sign({ rol: role }, jwtSecret, { subject: userId, expiresIn: '1h' });
}

function futureDate(daysFromNow = 3) {
  const date = new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000);
  return `${date.toISOString().slice(0, 10)}T10:00:00-05:00`;
}

async function createSession(laboratory, overrides = {}) {
  const start = new Date(futureDate());
  return SesionLaboratorio.create({
    laboratorio: laboratory._id,
    docente: new mongoose.Types.ObjectId(teacherId),
    materia: 'Física',
    actividad: 'Práctica de laboratorio',
    fecha: new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate())),
    inicio: start,
    fin: new Date(start.getTime() + 2 * 60 * 60 * 1000),
    cupos: laboratory.capacidad,
    ...overrides
  });
}

async function createReservation(laboratorySession, userId = studentId, estado = 'activa') {
  if (estado === 'activa') {
    laboratorySession.inscritosCount += 1;
    if (laboratorySession.inscritosCount >= laboratorySession.cupos) {
      laboratorySession.estado = 'llena';
    }
    await laboratorySession.save();
  }

  return Reserva.create({
    sesionLaboratorio: laboratorySession._id,
    usuario: new mongoose.Types.ObjectId(userId),
    estado
  });
}

describe('POST /api/reservas', () => {
  let laboratory;

  beforeAll(async () => {
    process.env.JWT_SECRET = jwtSecret;
    await connectTestDatabase();
  });

  beforeEach(async () => {
    laboratory = await Laboratorio.create({
      nombre: 'Laboratorio de prueba',
      capacidad: 20,
      ubicacion: 'Bloque A'
    });
  });

  afterAll(() => {
    delete process.env.JWT_SECRET;
  });

  it('creates a reservation for an available laboratory session', async () => {
    const laboratorySession = await createSession(laboratory);
    const response = await request(app)
      .post('/api/reservas')
      .set('Authorization', `Bearer ${token()}`)
      .send({ sesionLaboratorioId: laboratorySession.id })
      .expect(201);

    expect(response.body.data).toEqual({
      id: expect.any(String),
      sesionLaboratorio: laboratorySession.id,
      usuario: studentId,
      estado: 'activa'
    });
    await expect(Reserva.countDocuments()).resolves.toBe(1);
    await expect(SesionLaboratorio.findById(laboratorySession._id).lean()).resolves.toMatchObject({
      inscritosCount: 1,
      estado: 'abierta'
    });
  });

  it('allows a teacher to reserve a session using their authenticated identity', async () => {
    const laboratorySession = await createSession(laboratory);
    const response = await request(app)
      .post('/api/reservas')
      .set('Authorization', `Bearer ${token(teacherId, 'docente')}`)
      .send({ sesionLaboratorioId: laboratorySession.id })
      .expect(201);

    expect(response.body.data.usuario).toBe(teacherId);
    await expect(Reserva.countDocuments()).resolves.toBe(1);
  });

  it('rejects unauthenticated users and administrators from creating reservations', async () => {
    const laboratorySession = await createSession(laboratory);
    const payload = { sesionLaboratorioId: laboratorySession.id };

    await request(app)
      .post('/api/reservas')
      .send(payload)
      .expect(401);

    await request(app)
      .post('/api/reservas')
      .set('Authorization', `Bearer ${token(adminId, 'administrador')}`)
      .send(payload)
      .expect(403);

    await expect(Reserva.countDocuments()).resolves.toBe(0);
  });

  it.each([{}, { sesionLaboratorioId: 'invalid-id' }])(
    'rejects missing or malformed session identifiers',
    async (payload) => {
      await request(app)
        .post('/api/reservas')
        .set('Authorization', `Bearer ${token()}`)
        .send(payload)
        .expect(400);

      await expect(Reserva.countDocuments()).resolves.toBe(0);
    }
  );

  it('returns not found for an unknown laboratory session', async () => {
    await request(app)
      .post('/api/reservas')
      .set('Authorization', `Bearer ${token()}`)
      .send({ sesionLaboratorioId: new mongoose.Types.ObjectId().toString() })
      .expect(404);

    await expect(Reserva.countDocuments()).resolves.toBe(0);
  });

  it.each(['llena', 'cancelada'])('rejects a session with state "%s"', async (estado) => {
    const laboratorySession = await createSession(laboratory, { estado });

    await request(app)
      .post('/api/reservas')
      .set('Authorization', `Bearer ${token()}`)
      .send({ sesionLaboratorioId: laboratorySession.id })
      .expect(409);

    await expect(Reserva.countDocuments()).resolves.toBe(0);
  });

  it('rejects a session at capacity even if its state has not been updated', async () => {
    const laboratorySession = await createSession(laboratory, {
      cupos: 1,
      inscritosCount: 1
    });

    await request(app)
      .post('/api/reservas')
      .set('Authorization', `Bearer ${token()}`)
      .send({ sesionLaboratorioId: laboratorySession.id })
      .expect(409);

    await expect(Reserva.countDocuments()).resolves.toBe(0);
  });

  it('marks a session full at capacity and rejects further reservations', async () => {
    const laboratorySession = await createSession(laboratory, { cupos: 2 });
    const payload = { sesionLaboratorioId: laboratorySession.id };

    await request(app)
      .post('/api/reservas')
      .set('Authorization', `Bearer ${token()}`)
      .send(payload)
      .expect(201);
    await request(app)
      .post('/api/reservas')
      .set('Authorization', `Bearer ${token(teacherId, 'docente')}`)
      .send(payload)
      .expect(201);

    await expect(SesionLaboratorio.findById(laboratorySession._id).lean()).resolves.toMatchObject({
      inscritosCount: 2,
      estado: 'llena'
    });
    await request(app)
      .post('/api/reservas')
      .set('Authorization', `Bearer ${token('66a000000000000000000004')}`)
      .send(payload)
      .expect(409);

    await expect(Reserva.countDocuments()).resolves.toBe(2);
  });

  it('rejects reservations for sessions in an inactive laboratory', async () => {
    const laboratorySession = await createSession(laboratory);
    await Laboratorio.updateOne({ _id: laboratory._id }, { activo: false });

    await request(app)
      .post('/api/reservas')
      .set('Authorization', `Bearer ${token()}`)
      .send({ sesionLaboratorioId: laboratorySession.id })
      .expect(409);

    await expect(Reserva.countDocuments()).resolves.toBe(0);
    await expect(SesionLaboratorio.findById(laboratorySession._id).lean()).resolves.toMatchObject({
      inscritosCount: 0,
      estado: 'abierta'
    });
  });
});

describe('GET /api/reservas and PATCH /api/reservas/:id/cancelar', () => {
  let laboratory;

  beforeAll(async () => {
    process.env.JWT_SECRET = jwtSecret;
    await connectTestDatabase();
  });

  beforeEach(async () => {
    laboratory = await Laboratorio.create({
      nombre: 'Laboratorio de consulta',
      capacidad: 18,
      ubicacion: 'Bloque C'
    });
  });

  afterAll(() => {
    delete process.env.JWT_SECRET;
  });

  it('lists only the authenticated user reservations with session and laboratory details', async () => {
    const ownSession = await createSession(laboratory);
    const otherSession = await createSession(laboratory, {
      materia: 'Química',
      actividad: 'Preparación de soluciones'
    });
    const ownReservation = await createReservation(ownSession, studentId);
    await createReservation(otherSession, teacherId);

    const response = await request(app)
      .get('/api/reservas')
      .set('Authorization', `Bearer ${token()}`)
      .expect(200);

    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0]).toMatchObject({
      id: ownReservation.id,
      sesionLaboratorio: ownSession.id,
      laboratorio: {
        id: laboratory.id,
        nombre: laboratory.nombre,
        ubicacion: laboratory.ubicacion
      },
      materia: ownSession.materia,
      actividad: ownSession.actividad,
      inicio: ownSession.inicio.toISOString(),
      fin: ownSession.fin.toISOString(),
      estado: 'activa'
    });
  });

  it('requires authentication to list reservations', async () => {
    await request(app)
      .get('/api/reservas')
      .expect(401);
  });

  it('cancels an owned reservation and frees a place in its session', async () => {
    const laboratorySession = await createSession(laboratory, { cupos: 1 });
    const reservation = await createReservation(laboratorySession);

    const cancellation = await request(app)
      .patch(`/api/reservas/${reservation.id}/cancelar`)
      .set('Authorization', `Bearer ${token()}`)
      .expect(200);

    expect(cancellation.body.data).toMatchObject({
      id: reservation.id,
      sesionLaboratorio: laboratorySession.id,
      estado: 'cancelada'
    });
    await expect(Reserva.findById(reservation._id).lean()).resolves.toMatchObject({
      estado: 'cancelada'
    });
    await expect(SesionLaboratorio.findById(laboratorySession._id).lean()).resolves.toMatchObject({
      inscritosCount: 0,
      estado: 'abierta'
    });

    await request(app)
      .post('/api/reservas')
      .set('Authorization', `Bearer ${token(teacherId, 'docente')}`)
      .send({ sesionLaboratorioId: laboratorySession.id })
      .expect(201);
  });

  it('does not allow cancelling another user reservation', async () => {
    const laboratorySession = await createSession(laboratory);
    const reservation = await createReservation(laboratorySession, teacherId);

    await request(app)
      .patch(`/api/reservas/${reservation.id}/cancelar`)
      .set('Authorization', `Bearer ${token()}`)
      .expect(404);

    await expect(Reserva.findById(reservation._id).lean()).resolves.toMatchObject({
      estado: 'activa'
    });
  });

  it('rejects cancelling an already cancelled or nonexistent reservation', async () => {
    const laboratorySession = await createSession(laboratory);
    const cancelledReservation = await createReservation(laboratorySession, studentId, 'cancelada');

    await request(app)
      .patch(`/api/reservas/${cancelledReservation.id}/cancelar`)
      .set('Authorization', `Bearer ${token()}`)
      .expect(409);

    await request(app)
      .patch(`/api/reservas/${new mongoose.Types.ObjectId()}/cancelar`)
      .set('Authorization', `Bearer ${token()}`)
      .expect(404);
  });
});
