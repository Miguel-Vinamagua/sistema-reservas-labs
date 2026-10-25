const mongoose = require('mongoose');
const Usuario = require('../../src/models/usuario.model');
const Laboratorio = require('../../src/models/laboratorio.model');
const Materia = require('../../src/models/materia.model');
const SesionLaboratorio = require('../../src/models/sesion-laboratorio.model');
const Reserva = require('../../src/models/reserva.model');

describe('Usuario model', () => {
  it('uses usuarios and requires a supported role', () => {
    const missingRole = new Usuario({
      correo: 'test@universidad.edu',
      passwordHash: 'hash'
    });
    const invalidRole = new Usuario({
      correo: 'test@universidad.edu',
      passwordHash: 'hash',
      rol: 'invitado'
    });

    expect(Usuario.collection.name).toBe('usuarios');
    expect(missingRole.validateSync().errors.rol).toBeDefined();
    expect(invalidRole.validateSync().errors.rol).toBeDefined();

    for (const rol of ['estudiante', 'docente', 'administrador']) {
      expect(new Usuario({
        correo: 'test@universidad.edu',
        passwordHash: 'hash',
        rol
      }).validateSync()).toBeUndefined();
    }
  });
});

describe('Laboratorio model', () => {
  it('requires a non-empty name and location and a positive integer capacity', () => {
    const laboratory = new Laboratorio({
      nombre: '   ',
      capacidad: 0,
      ubicacion: ''
    });
    const errors = laboratory.validateSync().errors;

    expect(errors.nombre).toBeDefined();
    expect(errors.capacidad).toBeDefined();
    expect(errors.ubicacion).toBeDefined();
  });

  it('defaults active and reservationRevision values', () => {
    const laboratory = new Laboratorio({
      nombre: 'Laboratorio de prueba',
      capacidad: 10,
      ubicacion: 'Bloque A'
    });

    expect(laboratory.activo).toBe(true);
    expect(laboratory.reservationRevision).toBe(0);
    expect(laboratory.validateSync()).toBeUndefined();
  });
});

describe('Materia model', () => {
  it('uses materias and requires trimmed name, code and teacher reference', () => {
    const missing = new Materia({});
    const errors = missing.validateSync().errors;

    expect(Materia.collection.name).toBe('materias');
    expect(errors.nombre).toBeDefined();
    expect(errors.codigo).toBeDefined();
    expect(errors.docente).toBeDefined();
    expect(Materia.schema.path('docente').options.ref).toBe('Usuario');
  });

  it('accepts a subject linked to a teacher', () => {
    const materia = new Materia({
      nombre: ' Física ',
      codigo: 'FIS-101',
      docente: new mongoose.Types.ObjectId()
    });

    expect(materia.nombre).toBe('Física');
    expect(materia.validateSync()).toBeUndefined();
  });
});

describe('SesionLaboratorio model', () => {
  const validSession = () => new SesionLaboratorio({
    laboratorio: new mongoose.Types.ObjectId(),
    docente: new mongoose.Types.ObjectId(),
    materia: '  Física  ',
    actividad: '  Práctica de óptica  ',
    fecha: new Date('2030-01-01T00:00:00Z'),
    inicio: new Date('2030-01-01T10:00:00Z'),
    fin: new Date('2030-01-01T11:00:00Z'),
    cupos: 20
  });

  it('uses sesiones and requires references, date, times, subject, activity and quotas', () => {
    const missing = new SesionLaboratorio({});
    const errors = missing.validateSync().errors;

    expect(SesionLaboratorio.collection.name).toBe('sesiones');
    expect(errors.laboratorio).toBeDefined();
    expect(errors.docente).toBeDefined();
    expect(errors.materia).toBeDefined();
    expect(errors.actividad).toBeDefined();
    expect(errors.fecha).toBeDefined();
    expect(errors.inicio).toBeDefined();
    expect(errors.fin).toBeDefined();
    expect(errors.cupos).toBeDefined();
    expect(SesionLaboratorio.schema.path('laboratorio').options.ref).toBe('Laboratorio');
    expect(SesionLaboratorio.schema.path('docente').options.ref).toBe('Usuario');
  });

  it('trims text, validates time and positive integer quotas, and defaults status', () => {
    const session = validSession();
    const invalidRange = validSession();
    invalidRange.fin = invalidRange.inicio;
    const invalidQuotas = validSession();
    invalidQuotas.cupos = 0;
    const fractionalQuotas = validSession();
    fractionalQuotas.cupos = 1.5;

    expect(session.materia).toBe('Física');
    expect(session.actividad).toBe('Práctica de óptica');
    expect(session.estado).toBe('abierta');
    expect(session.validateSync()).toBeUndefined();
    expect(invalidRange.validateSync().errors.fin).toBeDefined();
    expect(invalidQuotas.validateSync().errors.cupos).toBeDefined();
    expect(fractionalQuotas.validateSync().errors.cupos).toBeDefined();
    expect(SesionLaboratorio.schema.path('estado').enumValues).toEqual(['abierta', 'llena', 'cancelada']);
  });
});

describe('Reserva model', () => {
  const validReservation = () => new Reserva({
    sesionLaboratorio: new mongoose.Types.ObjectId(),
    usuario: new mongoose.Types.ObjectId()
  });

  it('requires a laboratory session and the reserving user', () => {
    const missing = new Reserva({});

    expect(missing.validateSync().errors.sesionLaboratorio).toBeDefined();
    expect(missing.validateSync().errors.usuario).toBeDefined();
  });

  it('defaults to active and declares the required compound index', () => {
    const reservation = validReservation();
    const indexes = Reserva.schema.indexes();

    expect(reservation.estado).toBe('activa');
    expect(reservation.validateSync()).toBeUndefined();
    expect(Reserva.schema.path('estado').enumValues).toEqual(['activa', 'cancelada']);
    expect(Reserva.schema.path('sesionLaboratorio').options.ref).toBe('SesionLaboratorio');
    expect(Reserva.schema.path('usuario').options.ref).toBe('Usuario');
    expect(indexes).toContainEqual([
      { sesionLaboratorio: 1, usuario: 1 },
      expect.any(Object)
    ]);
  });
});
