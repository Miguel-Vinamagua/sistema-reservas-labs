const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../../src/app');
const Laboratorio = require('../../src/models/laboratorio.model');
const Reserva = require('../../src/models/reserva.model');
const { connectTestDatabase } = require('../setup');

const jwtSecret = 'test-only-signing-secret';
const studentId = '66a000000000000000000001';

function token(userId = studentId, role = 'estudiante') {
  return jwt.sign(
    { rol: role },
    jwtSecret,
    { subject: userId, expiresIn: '1h' }
  );
}

function futureDate(daysFromNow = 3) {
  const date = new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000);
  return `${date.toISOString().slice(0, 10)}T10:00:00-05:00`;
}

function dateAt(date, hour) {
  return `${date.slice(0, 10)}T${String(hour).padStart(2, '0')}:00:00-05:00`;
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

  it('creates a valid reservation associated with the authenticated user', async () => {
    const start = futureDate();
    const response = await request(app)
      .post('/api/reservas')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        laboratorioId: laboratory.id,
        inicio: start,
        fin: dateAt(start, 12)
      })
      .expect(201);

    expect(response.body.data).toMatchObject({
      id: expect.any(String),
      laboratorio: laboratory.id,
      usuario: studentId,
      inicio: expect.any(String),
      fin: expect.any(String),
      estado: 'activa'
    });
    expect(await Reserva.countDocuments()).toBe(1);
  });

  it('allows a teacher to create a reservation associated with their identity', async () => {
    const teacherId = '66a000000000000000000002';
    const start = futureDate();
    const response = await request(app)
      .post('/api/reservas')
      .set('Authorization', `Bearer ${token(teacherId, 'docente')}`)
      .send({
        laboratorioId: laboratory.id,
        inicio: start,
        fin: dateAt(start, 12)
      })
      .expect(201);

    expect(response.body.data.usuario).toBe(teacherId);
    expect(await Reserva.countDocuments()).toBe(1);
  });

  it('rejects unauthenticated users and administrators from creating reservations', async () => {
    const start = futureDate();
    const payload = {
      laboratorioId: laboratory.id,
      inicio: start,
      fin: dateAt(start, 12)
    };

    await request(app)
      .post('/api/reservas')
      .send(payload)
      .expect(401);

    await request(app)
      .post('/api/reservas')
      .set('Authorization', `Bearer ${token('66a000000000000000000003', 'administrador')}`)
      .send(payload)
      .expect(403);

    expect(await Reserva.countDocuments()).toBe(0);
  });

  it('rejects dates in the past', async () => {
    const pastDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    await request(app)
      .post('/api/reservas')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        laboratorioId: laboratory.id,
        inicio: `${pastDate}T10:00:00-05:00`,
        fin: `${pastDate}T12:00:00-05:00`
      })
      .expect(400);

    expect(await Reserva.countDocuments()).toBe(0);
  });

  it.each([
    ['the end equals the start', (start) => start],
    ['the end precedes the start', (start) => dateAt(start, 9)]
  ])('rejects a range where %s', async (_description, endDate) => {
    const start = futureDate();

    await request(app)
      .post('/api/reservas')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        laboratorioId: laboratory.id,
        inicio: start,
        fin: endDate(start)
      })
      .expect(400);

    expect(await Reserva.countDocuments()).toBe(0);
  });

  it.each([
    'not-a-date',
    '2030-02-30T10:00:00-05:00',
    '2030-10-20T10:00:00'
  ])('rejects an invalid or timezone-ambiguous date: %s', async (date) => {
    await request(app)
      .post('/api/reservas')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        laboratorioId: laboratory.id,
        inicio: date,
        fin: futureDate()
      })
      .expect(400);

    expect(await Reserva.countDocuments()).toBe(0);
  });

  it('rejects missing or malformed reservation input', async () => {
    await request(app)
      .post('/api/reservas')
      .set('Authorization', `Bearer ${token()}`)
      .send({ laboratorioId: 'invalid-id' })
      .expect(400);

    expect(await Reserva.countDocuments()).toBe(0);
  });

  it('returns not found for an unknown laboratory', async () => {
    const start = futureDate();

    await request(app)
      .post('/api/reservas')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        laboratorioId: new mongoose.Types.ObjectId().toString(),
        inicio: start,
        fin: dateAt(start, 12)
      })
      .expect(404);

    expect(await Reserva.countDocuments()).toBe(0);
  });

  it('rejects reservations for inactive laboratories', async () => {
    await Laboratorio.updateOne({ _id: laboratory._id }, { activo: false });
    const start = futureDate();

    await request(app)
      .post('/api/reservas')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        laboratorioId: laboratory.id,
        inicio: start,
        fin: dateAt(start, 12)
      })
      .expect(409);

    expect(await Reserva.countDocuments()).toBe(0);
  });

  it('rejects overlapping active reservations', async () => {
    const start = futureDate();
    await Reserva.create({
      laboratorio: laboratory._id,
      usuario: new mongoose.Types.ObjectId(studentId),
      inicio: new Date(start),
      fin: new Date(dateAt(start, 12))
    });

    await request(app)
      .post('/api/reservas')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        laboratorioId: laboratory.id,
        inicio: dateAt(start, 11),
        fin: dateAt(start, 13)
      })
      .expect(409);

    expect(await Reserva.countDocuments()).toBe(1);
  });

  it('allows reservations whose intervals are contiguous', async () => {
    const start = futureDate();
    await Reserva.create({
      laboratorio: laboratory._id,
      usuario: new mongoose.Types.ObjectId(studentId),
      inicio: new Date(start),
      fin: new Date(dateAt(start, 12))
    });

    await request(app)
      .post('/api/reservas')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        laboratorioId: laboratory.id,
        inicio: dateAt(start, 12),
        fin: dateAt(start, 14)
      })
      .expect(201);

    expect(await Reserva.countDocuments()).toBe(2);
  });
});
