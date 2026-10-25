const { seedLaboratories, seedReservations } = require('../../scripts/seed-labs');

function createMemoryModel(initialRecords = []) {
  const records = [...initialRecords];

  function matches(record, filter) {
    return Object.entries(filter).every(([field, expected]) => {
      const actual = record[field];
      if (expected instanceof Date) {
        return actual.getTime() === expected.getTime();
      }
      if (expected && typeof expected === 'object') {
        return Object.entries(expected).every(([operator, value]) => (
          operator === '$lt'
            ? actual < value
            : operator === '$gt'
              ? actual > value
              : false
        ));
      }
      return actual === expected;
    });
  }

  return {
    records,
    async findOne(filter) {
      return records.find((record) => matches(record, filter)) || null;
    },
    async create(data) {
      const record = { ...data, _id: `id-${records.length + 1}` };
      if (Object.hasOwn(data, 'capacidad')) {
        record.activo = true;
      }
      records.push(record);
      return record;
    }
  };
}

describe('seed-labs', () => {
  it('does not create laboratories with names that already exist', async () => {
    const model = createMemoryModel();

    const firstRun = await seedLaboratories(model);
    const secondRun = await seedLaboratories(model);

    expect(firstRun.created).toBe(3);
    expect(firstRun.existing).toBe(0);
    expect(secondRun.created).toBe(0);
    expect(secondRun.existing).toBe(3);
    expect(model.records).toHaveLength(3);
  });

  it('creates linked, valid and idempotent reservations', async () => {
    const reservationModel = createMemoryModel();
    const sessionModel = createMemoryModel();
    const laboratories = [
      { _id: 'lab-1', activo: true, capacidad: 20 },
      { _id: 'lab-2', activo: true, capacidad: 18 },
      { _id: 'lab-3', activo: true, capacidad: 24 }
    ];
    const referenceDate = new Date('2030-01-01T00:00:00.000Z');

    const firstRun = await seedReservations(
      laboratories,
      'user-1',
      reservationModel,
      referenceDate,
      sessionModel,
      'teacher-1'
    );
    const secondRun = await seedReservations(
      laboratories,
      'user-1',
      reservationModel,
      referenceDate,
      sessionModel,
      'teacher-1'
    );

    expect(firstRun).toEqual({ created: 4, existing: 0, skipped: 0 });
    expect(secondRun).toEqual({ created: 0, existing: 4, skipped: 0 });
    expect(reservationModel.records).toHaveLength(4);
    expect(sessionModel.records).toHaveLength(4);
    expect(reservationModel.records).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sesionLaboratorio: expect.any(String),
          usuario: 'user-1',
          estado: 'cancelada'
        }),
        expect.objectContaining({
          sesionLaboratorio: expect.any(String),
          usuario: 'user-1',
          estado: 'activa'
        })
      ])
    );
    for (const reservation of reservationModel.records) {
      const linkedSession = sessionModel.records.find(
        ({ _id }) => _id === reservation.sesionLaboratorio
      );
      expect(linkedSession).toBeDefined();
      expect(linkedSession.fin.getTime()).toBeGreaterThan(linkedSession.inicio.getTime());
      expect(linkedSession.laboratorio).toBeDefined();
      expect(linkedSession.docente).toBe('teacher-1');
    }
  });
});
