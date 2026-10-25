const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../../src/app');
const Laboratorio = require('../../src/models/laboratorio.model');
const Reserva = require('../../src/models/reserva.model');
const SesionLaboratorio = require('../../src/models/sesion-laboratorio.model');
const Usuario = require('../../src/models/usuario.model');
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

  it('never exceeds the session capacity for simultaneous reservation requests', async () => {
    const studentIds = [
      '66a000000000000000000001',
      '66a000000000000000000002',
      '66a000000000000000000004',
      '66a000000000000000000005',
      '66a000000000000000000006',
      '66a000000000000000000007',
      '66a000000000000000000008',
      '66a000000000000000000009'
    ];
    await Usuario.create(studentIds.map((id, index) => ({
      _id: id,
      correo: `concurrent-${index}@utmachala.edu.ec`,
      passwordHash: 'test-password-hash',
      rol: 'estudiante'
    })));
    const laboratory = await Laboratorio.create({
      nombre: 'Laboratorio concurrente',
      capacidad: 20,
      ubicacion: 'Bloque A'
    });
    const start = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    const laboratorySession = await SesionLaboratorio.create({
      laboratorio: laboratory._id,
      docente: new mongoose.Types.ObjectId('66a000000000000000000003'),
      materia: 'Física',
      actividad: 'Práctica de capacidad',
      fecha: new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate())),
      inicio: start,
      fin: new Date(start.getTime() + 2 * 60 * 60 * 1000),
      cupos: 1
    });
    const payload = { sesionLaboratorioId: laboratorySession.id };

    const responses = await Promise.all(studentIds.map((userId) => (
      request(app)
        .post('/api/reservas')
        .set('Authorization', `Bearer ${token(userId)}`)
        .send(payload)
    )));

    expect(responses.filter(({ status }) => status === 201)).toHaveLength(1);
    expect(responses.filter(({ status }) => status === 409)).toHaveLength(studentIds.length - 1);
    expect(await Reserva.countDocuments({
      sesionLaboratorio: laboratorySession._id,
      estado: 'activa'
    })).toBe(1);
    await expect(SesionLaboratorio.findById(laboratorySession._id).lean()).resolves.toMatchObject({
      inscritosCount: 1,
      estado: 'llena'
    });
  },10000);

  it('serializes overlapping reservations submitted simultaneously by the same student', async () => {
    const studentId = '66a000000000000000000001';
    await Usuario.create({
      _id: studentId,
      correo: 'student-overlap@utmachala.edu.ec',
      passwordHash: 'test-password-hash',
      rol: 'estudiante'
    });
    const laboratories = await Laboratorio.create([
      { nombre: 'Laboratorio A', capacidad: 12, ubicacion: 'Bloque A' },
      { nombre: 'Laboratorio B', capacidad: 12, ubicacion: 'Bloque B' }
    ]);
    const start = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    const sessions = await Promise.all(laboratories.map((laboratory) => (
      SesionLaboratorio.create({
        laboratorio: laboratory._id,
        docente: new mongoose.Types.ObjectId('66a000000000000000000003'),
        materia: 'Física',
        actividad: 'Práctica concurrente',
        fecha: new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate())),
        inicio: start,
        fin: new Date(start.getTime() + 60 * 60 * 1000),
        cupos: 1
      })
    )));

    const responses = await Promise.all(sessions.map((laboratorySession) => (
      request(app)
        .post('/api/reservas')
        .set('Authorization', `Bearer ${token(studentId)}`)
        .send({ sesionLaboratorioId: laboratorySession.id })
    )));

    expect(responses.map(({ status }) => status).sort()).toEqual([201, 409]);
    await expect(Reserva.countDocuments({ usuario: studentId, estado: 'activa' })).resolves.toBe(1);
    const savedSessions = await SesionLaboratorio.find({
      _id: { $in: sessions.map(({ _id }) => _id) }
    }).lean();
    expect(savedSessions.reduce((total, item) => total + item.inscritosCount, 0)).toBe(1);
  });
});
