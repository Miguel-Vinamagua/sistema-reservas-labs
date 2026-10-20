const request = require('supertest');
const app = require('../../src/app');
const Usuario = require('../../src/models/usuario.model');
const { authenticate, authorizeRoles } = require('../../src/middleware/authorization');
const { seedUsers, readSeedUsers } = require('../../scripts/seed');

const testUserId = '66a000000000000000000001';
const testUser = {
  _id: testUserId,
  correo: 'estudiante@universidad.edu',
  rol: 'estudiante',
  passwordHash: '$2b$10$not-a-real-hash-for-route-tests'
};

app.get(
  '/api/auth-test/student',
  authenticate,
  authorizeRoles('estudiante'),
  (req, res) => res.json({ userId: req.auth.userId, role: req.auth.role })
);
app.get(
  '/api/auth-test/admin',
  authenticate,
  authorizeRoles('administrador'),
  (req, res) => res.json({ role: req.auth.role })
);

describe('authentication and role authorization', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-only-signing-secret';
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
    jest.restoreAllMocks();
  });

  it('rejects login requests without correo and password', async () => {
    await request(app)
      .post('/api/auth/login')
      .send({ correo: 'estudiante@universidad.edu' })
      .expect(400)
      .expect(({ body }) => {
        expect(body.error.code).toBe('VALIDATION_ERROR');
      });
  });

  it('normalizes correo and rejects unknown users with a generic unauthorized response', async () => {
    const select = jest.fn().mockResolvedValue(null);
    jest.spyOn(Usuario, 'findOne').mockReturnValue({ select });
    const compareDummy = jest.spyOn(Usuario, 'comparePasswordDummy');

    await request(app)
      .post('/api/auth/login')
      .send({ correo: '  NO-EXISTE@UNIVERSIDAD.EDU ', password: 'secret' })
      .expect(401)
      .expect(({ body }) => {
        expect(body.error.code).toBe('INVALID_CREDENTIALS');
      });

    expect(Usuario.findOne).toHaveBeenCalledWith({
      correo: 'no-existe@universidad.edu'
    });
    expect(compareDummy).toHaveBeenCalledWith('secret');
  });

  it('rejects an incorrect password without revealing whether the correo exists', async () => {
    const user = {
      ...testUser,
      comparePassword: jest.fn().mockResolvedValue(false)
    };
    jest.spyOn(Usuario, 'findOne').mockReturnValue({
      select: jest.fn().mockResolvedValue(user)
    });

    await request(app)
      .post('/api/auth/login')
      .send({ correo: testUser.correo, password: 'wrong-password' })
      .expect(401)
      .expect(({ body }) => {
        expect(body.error.code).toBe('INVALID_CREDENTIALS');
      });

    expect(user.comparePassword).toHaveBeenCalledWith('wrong-password');
  });

  it('issues a signed JWT with the stored role and never trusts a role in the request body', async () => {
    const user = {
      ...testUser,
      comparePassword: jest.fn().mockResolvedValue(true)
    };
    jest.spyOn(Usuario, 'findOne').mockReturnValue({
      select: jest.fn().mockResolvedValue(user)
    });

    const response = await request(app)
      .post('/api/auth/login')
      .send({
        correo: testUser.correo,
        password: 'correct-password',
        rol: 'administrador'
      })
      .expect(200);

    expect(response.body.data.user).toEqual({
      id: testUserId,
      correo: testUser.correo,
      rol: 'estudiante'
    });
    expect(response.body.data.token).toEqual(expect.any(String));
    expect(JSON.stringify(response.body)).not.toContain('passwordHash');

    const payload = JSON.parse(
      Buffer.from(response.body.data.token.split('.')[1], 'base64url').toString('utf8')
    );
    expect(payload).toMatchObject({ sub: testUserId, rol: 'estudiante' });
    expect(payload.exp).toEqual(expect.any(Number));

    const protectedResponse = await request(app)
      .get('/api/auth-test/student')
      .set('Authorization', `Bearer ${response.body.data.token}`)
      .expect(200);
    expect(protectedResponse.body).toEqual({
      userId: testUserId,
      role: 'estudiante'
    });
  });

  it('returns unauthorized for missing or invalid bearer tokens', async () => {
    await request(app)
      .get('/api/auth-test/student')
      .expect(401);
    await request(app)
      .get('/api/auth-test/student')
      .set('Authorization', 'Bearer invalid.token.value')
      .expect(401);
  });

  it('forbids a valid user from accessing routes outside their role', async () => {
    const user = {
      ...testUser,
      comparePassword: jest.fn().mockResolvedValue(true)
    };
    jest.spyOn(Usuario, 'findOne').mockReturnValue({
      select: jest.fn().mockResolvedValue(user)
    });
    const { body } = await request(app)
      .post('/api/auth/login')
      .send({ correo: testUser.correo, password: 'correct-password' })
      .expect(200);

    await request(app)
      .get('/api/auth-test/admin')
      .set('Authorization', `Bearer ${body.data.token}`)
      .expect(403);
  });

  it('fails closed when JWT_SECRET is not configured', async () => {
    const user = {
      ...testUser,
      comparePassword: jest.fn().mockResolvedValue(true)
    };
    jest.spyOn(Usuario, 'findOne').mockReturnValue({
      select: jest.fn().mockResolvedValue(user)
    });
    delete process.env.JWT_SECRET;

    await request(app)
      .post('/api/auth/login')
      .send({ correo: testUser.correo, password: 'correct-password' })
      .expect(500)
      .expect(({ body }) => {
        expect(body.error.code).toBe('AUTH_CONFIGURATION_ERROR');
      });
  });

  it('stores bcrypt hashes and can verify the original password', async () => {
    const user = new Usuario({
      correo: testUser.correo,
      rol: 'estudiante'
    });

    await user.setPassword('correct-password');

    expect(user.passwordHash).toMatch(/^\$2[aby]\$/);
    expect(user.passwordHash).not.toBe('correct-password');
    await expect(user.comparePassword('correct-password')).resolves.toBe(true);
    await expect(user.comparePassword('wrong-password')).resolves.toBe(false);
  });

  it('seeds normalized users with bcrypt hashes without overwriting existing accounts', async () => {
    const userModel = {
      updateOne: jest.fn().mockResolvedValue({ upsertedCount: 1 })
    };

    const result = await seedUsers(
      [{
        correo: '  DOCENTE@UNIVERSIDAD.EDU ',
        password: 'seed-password',
        rol: 'docente'
      }],
      userModel
    );

    expect(result).toEqual({ created: 1, existing: 0 });
    expect(userModel.updateOne).toHaveBeenCalledTimes(1);
    const [filter, update, options] = userModel.updateOne.mock.calls[0];
    expect(filter).toEqual({ correo: 'docente@universidad.edu' });
    expect(update.$setOnInsert.correo).toBe('docente@universidad.edu');
    expect(update.$setOnInsert.rol).toBe('docente');
    expect(update.$setOnInsert.passwordHash).toMatch(/^\$2[aby]\$/);
    expect(await require('bcryptjs').compare(
      'seed-password',
      update.$setOnInsert.passwordHash
    )).toBe(true);
    expect(options).toEqual({ upsert: true, runValidators: true });
  });

  it('does not replace existing users when the seed is rerun', async () => {
    const userModel = {
      updateOne: jest.fn().mockResolvedValue({ upsertedCount: 0 })
    };

    await expect(seedUsers(
      [{ correo: 'existente@universidad.edu', password: 'unused', rol: 'estudiante' }],
      userModel
    )).resolves.toEqual({ created: 0, existing: 1 });
    expect(userModel.updateOne.mock.calls[0][1]).toHaveProperty('$setOnInsert');
    expect(userModel.updateOne.mock.calls[0][1]).not.toHaveProperty('$set');
  });

  it('rejects invalid seed users before writing any account', async () => {
    const userModel = { updateOne: jest.fn() };

    await expect(seedUsers(
      [{ correo: 'admin@universidad.edu', password: 'secret', rol: 'superadmin' }],
      userModel
    )).rejects.toThrow('rol del usuario inicial');
    expect(userModel.updateOne).not.toHaveBeenCalled();
  });

  it('requires SEED_USERS to contain valid JSON', () => {
    expect(() => readSeedUsers({})).toThrow('SEED_USERS no está configurada');
    expect(() => readSeedUsers({ SEED_USERS: '{invalid' })).toThrow(
      'SEED_USERS debe contener JSON válido'
    );
    expect(readSeedUsers({
      SEED_USERS: '[{"correo":"admin@universidad.edu","password":"secret","rol":"administrador"}]'
    })).toEqual([{
      correo: 'admin@universidad.edu',
      password: 'secret',
      rol: 'administrador'
    }]);
  });
});
