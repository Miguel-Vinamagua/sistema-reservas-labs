const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../../src/app');
const Laboratorio = require('../../src/models/laboratorio.model');
const Reserva = require('../../src/models/reserva.model');
const SesionLaboratorio = require('../../src/models/sesion-laboratorio.model');
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
      inicio: start,
      fin: new Date(start.getTime() + 2 * 60 * 60 * 1000),
      capacidadMax: 1
    });
    const payload = { sesionLaboratorioId: laboratorySession.id };

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
      sesionLaboratorio: laboratorySession._id,
      estado: 'activa'
    })).toBe(1);
    await expect(SesionLaboratorio.findById(laboratorySession._id).lean()).resolves.toMatchObject({
      inscritosCount: 1,
      estado: 'llena'
    });
  });
});
