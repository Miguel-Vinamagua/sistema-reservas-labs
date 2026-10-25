const mongoose = require('mongoose');
const { seedTeacher, seedMaterias } = require('../../scripts/seed');

describe('seed teacher and subjects', () => {
  it('creates the configured teacher idempotently with the standard bcrypt cost', async () => {
    const userModel = {
      updateOne: jest.fn().mockResolvedValue({ upsertedCount: 1 })
    };

    const result = await seedTeacher(userModel, 'seed-teacher-password');

    expect(result).toEqual({ created: 1, existing: 0 });
    const [filter, update, options] = userModel.updateOne.mock.calls[0];
    expect(filter).toEqual({ correo: 'docente@utmachala.edu.ec' });
    expect(update.$setOnInsert.rol).toBe('docente');
    expect(update.$setOnInsert.passwordHash).toMatch(/^\$2[aby]\$12\$/);
    expect(options).toEqual({ upsert: true, runValidators: true });
  });

  it('seeds the demo teacher with a bcrypt hash without overwriting existing accounts', async () => {
    const userModel = {
      updateOne: jest.fn().mockResolvedValue({ upsertedCount: 0 })
    };

    const result = await seedTeacher(userModel, 'seed-teacher-password');

    expect(result).toEqual({ created: 0, existing: 1 });
    expect(userModel.updateOne).toHaveBeenCalledTimes(1);
    const [filter, update, options] = userModel.updateOne.mock.calls[0];
    expect(filter).toEqual({ correo: 'docente@utmachala.edu.ec' });
    expect(update.$setOnInsert.correo).toBe('docente@utmachala.edu.ec');
    expect(update.$setOnInsert.rol).toBe('docente');
    expect(update.$setOnInsert.passwordHash).toMatch(/^\$2[aby]\$/);
    expect(options).toEqual({ upsert: true, runValidators: true });
  });

  it('seeds two demo subjects for the teacher idempotently', async () => {
    const teacherId = new mongoose.Types.ObjectId();
    const materiaModel = {
      updateOne: jest.fn().mockResolvedValue({ upsertedCount: 1 })
    };

    const result = await seedMaterias(materiaModel, teacherId);

    expect(result).toEqual({ created: 2, existing: 0 });
    expect(materiaModel.updateOne).toHaveBeenCalledTimes(2);
    expect(materiaModel.updateOne.mock.calls.map(([filter]) => filter)).toEqual([
      { codigo: 'MAT-101', docente: teacherId },
      { codigo: 'FIS-101', docente: teacherId }
    ]);
    expect(materiaModel.updateOne.mock.calls.every(([, update, options]) => (
      Boolean(update.$setOnInsert.nombre) &&
      options.upsert === true &&
      options.runValidators === true
    ))).toBe(true);
  });

  it('reports existing subjects without creating duplicates on subsequent seeds', async () => {
    const materiaModel = {
      updateOne: jest.fn().mockResolvedValue({ upsertedCount: 0 })
    };

    const result = await seedMaterias(materiaModel, new mongoose.Types.ObjectId());

    expect(result).toEqual({ created: 0, existing: 2 });
    expect(materiaModel.updateOne).toHaveBeenCalledTimes(2);
  });
});
