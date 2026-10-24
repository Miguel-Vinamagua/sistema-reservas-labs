const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../../src/app');
const Laboratorio = require('../../src/models/laboratorio.model');
const Reserva = require('../../src/models/reserva.model');
const SesionLaboratorio = require('../../src/models/sesion-laboratorio.model');
const { connectTestDatabase } = require('../setup');

const jwtSecret = 'test-only-signing-secret';
const adminId = '66a000000000000000000003';
const studentId = '66a000000000000000000001';
const teacherId = '66a000000000000000000002';


function token(userId, role) {
  return jwt.sign(
    { rol: role },
    jwtSecret,
    { subject: userId, expiresIn: '1h' }
  );
}

function laboratoryInput(overrides = {}) {
  return {
    nombre: 'Laboratorio de Química',
    capacidad: 24,
    ubicacion: 'Bloque D, piso 1',
    ...overrides
  };
}

describe('administrator laboratory management', () => {
  beforeAll(async () => {
    process.env.JWT_SECRET = jwtSecret;
    await connectTestDatabase();
  });

  afterAll(() => {
    delete process.env.JWT_SECRET;
  });

  it('creates an active laboratory with valid catalog fields as administrator', async () => {
    const response = await request(app)
      .post('/api/laboratorios')
      .set('Authorization', `Bearer ${token(adminId, 'administrador')}`)
      .send(laboratoryInput())
      .expect(201);

    expect(response.body.data).toMatchObject({
      id: expect.any(String),
      nombre: 'Laboratorio de Química',
      capacidad: 24,
      ubicacion: 'Bloque D, piso 1',
      activo: true
    });
    expect(await Laboratorio.countDocuments()).toBe(1);
  });

  it.each([
    ['zero capacity', { capacidad: 0 }],
    ['negative capacity', { capacidad: -3 }],
    ['fractional capacity', { capacidad: 2.5 }],
    ['empty location', { ubicacion: '   ' }],
    ['empty name', { nombre: '   ' }]
  ])('rejects creation with %s and leaves the catalog unchanged', async (_case, overrides) => {
    await request(app)
      .post('/api/laboratorios')
      .set('Authorization', `Bearer ${token(adminId, 'administrador')}`)
      .send(laboratoryInput(overrides))
      .expect(400);

    expect(await Laboratorio.countDocuments()).toBe(0);
  });

  it('edits allowed laboratory fields as administrator', async () => {
    const laboratory = await Laboratorio.create(laboratoryInput());

    const response = await request(app)
      .patch(`/api/laboratorios/${laboratory.id}`)
      .set('Authorization', `Bearer ${token(adminId, 'administrador')}`)
      .send({ nombre: 'Laboratorio de Química Analítica', capacidad: 30 })
      .expect(200);

    expect(response.body.data).toMatchObject({
      id: laboratory.id,
      nombre: 'Laboratorio de Química Analítica',
      capacidad: 30,
      ubicacion: 'Bloque D, piso 1',
      activo: true
    });
    await expect(Laboratorio.findById(laboratory._id).lean()).resolves.toMatchObject({
      nombre: 'Laboratorio de Química Analítica',
      capacidad: 30
    });
  });

  it.each([
    ['zero capacity', { capacidad: 0 }],
    ['fractional capacity', { capacidad: 4.5 }],
    ['empty location', { ubicacion: '  ' }],
    ['unknown field', { activo: false }],
    ['empty body', {}]
  ])('rejects an edit with %s and keeps the original laboratory', async (_case, changes) => {
    const laboratory = await Laboratorio.create(laboratoryInput());

    await request(app)
      .patch(`/api/laboratorios/${laboratory.id}`)
      .set('Authorization', `Bearer ${token(adminId, 'administrador')}`)
      .send(changes)
      .expect(400);

    await expect(Laboratorio.findById(laboratory._id).lean()).resolves.toMatchObject({
      nombre: laboratory.nombre,
      capacidad: laboratory.capacidad,
      ubicacion: laboratory.ubicacion,
      activo: true
    });
  });

  it('deactivates a laboratory without deleting or changing its reservations', async () => {
    const laboratory = await Laboratorio.create(laboratoryInput());
    const laboratorySession = await SesionLaboratorio.create({
      laboratorio: laboratory._id,
      docente: teacherId,
      materia: 'Química',
      actividad: 'Práctica',
      inicio: new Date('2030-05-10T15:00:00.000Z'),
      fin: new Date('2030-05-10T17:00:00.000Z'),
      capacidadMax: laboratory.capacidad,
      inscritosCount: 1
    });
    const reservation = await Reserva.create({
      sesionLaboratorio: laboratorySession._id,
      usuario: studentId,
    });

    const response = await request(app)
      .patch(`/api/laboratorios/${laboratory.id}/desactivar`)
      .set('Authorization', `Bearer ${token(adminId, 'administrador')}`)
      .send({})
      .expect(200);

    expect(response.body.data).toMatchObject({
      id: laboratory.id,
      activo: false,      
    });
    expect(await Laboratorio.countDocuments()).toBe(1);
    
    const savedReserva = await Reserva.findById(reservation._id).lean();
    expect(savedReserva.usuario.toString()).toBe(studentId);
    expect(savedReserva.estado).toBe('activa');

  });

  it('returns not found when an administrator targets an unknown laboratory', async () => {
    await request(app)
      .patch('/api/laboratorios/66a000000000000000000099/desactivar')
      .set('Authorization', `Bearer ${token(adminId, 'administrador')}`)
      .expect(404);
  });

  it.each([
    ['estudiante', studentId],
    ['docente', teacherId]
  ])('forbids %s from creating, editing, or deactivating laboratories', async (role, userId) => {
    const laboratory = await Laboratorio.create(laboratoryInput());
    const authorization = `Bearer ${token(userId, role)}`;

    await request(app)
      .post('/api/laboratorios')
      .set('Authorization', authorization)
      .send(laboratoryInput({ nombre: 'No autorizado' }))
      .expect(403);

    await request(app)
      .patch(`/api/laboratorios/${laboratory.id}`)
      .set('Authorization', authorization)
      .send({ capacidad: 50 })
      .expect(403);

    await request(app)
      .patch(`/api/laboratorios/${laboratory.id}/desactivar`)
      .set('Authorization', authorization)
      .send({})
      .expect(403);

    expect(await Laboratorio.countDocuments()).toBe(1);
    await expect(Laboratorio.findById(laboratory._id).lean()).resolves.toMatchObject({
      activo: true,
      capacidad: 24
    });
  });

  it('requires authentication for laboratory administration', async () => {
    await request(app)
      .post('/api/laboratorios')
      .send(laboratoryInput())
      .expect(401);
  });
});