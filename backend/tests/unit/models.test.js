const mongoose = require('mongoose');
const Usuario = require('../../src/models/usuario.model');
const Laboratorio = require('../../src/models/laboratorio.model');
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

describe('Reserva model', () => {
  const validReservation = () => new Reserva({
    laboratorio: new mongoose.Types.ObjectId(),
    usuario: new mongoose.Types.ObjectId(),
    inicio: new Date('2030-01-01T10:00:00Z'),
    fin: new Date('2030-01-01T11:00:00Z')
  });

  it('requires references and dates and validates the time range', () => {
    const missing = new Reserva({});
    const invalidRange = validReservation();
    invalidRange.fin = invalidRange.inicio;

    expect(missing.validateSync().errors.laboratorio).toBeDefined();
    expect(missing.validateSync().errors.usuario).toBeDefined();
    expect(missing.validateSync().errors.inicio).toBeDefined();
    expect(missing.validateSync().errors.fin).toBeDefined();
    expect(invalidRange.validateSync().errors.fin).toBeDefined();
  });

  it('defaults to active and declares the required compound index', () => {
    const reservation = validReservation();
    const indexes = Reserva.schema.indexes();

    expect(reservation.estado).toBe('activa');
    expect(reservation.validateSync()).toBeUndefined();
    expect(Reserva.schema.path('estado').enumValues).toEqual(['activa', 'cancelada']);
    expect(Reserva.schema.path('laboratorio').options.ref).toBe('Laboratorio');
    expect(Reserva.schema.path('usuario').options.ref).toBe('Usuario');
    expect(indexes).toContainEqual([
      { laboratorio: 1, inicio: 1, fin: 1 },
      expect.any(Object)
    ]);
  });
});
