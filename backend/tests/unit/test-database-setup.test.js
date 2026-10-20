const mongoose = require('mongoose');
const { connectTestDatabase } = require('../setup');

describe('test database setup', () => {
  afterEach(() => {
    delete process.env.MONGODB_URI;
    jest.restoreAllMocks();
  });

  it('rejects a URI that does not select reservas_test', async () => {
    process.env.MONGODB_URI = 'mongodb://localhost:27017/reservas_labs';
    const connect = jest.spyOn(mongoose, 'connect').mockResolvedValue(mongoose);

    await expect(connectTestDatabase()).rejects.toThrow(
      'Las pruebas solo pueden usar la base de datos reservas_test.'
    );
    expect(connect).not.toHaveBeenCalled();
  });

  it('connects only to the reservas_test database', async () => {
    const uri = 'mongodb://localhost:27017/reservas_test?replicaSet=rs0';
    process.env.MONGODB_URI = uri;
    const connect = jest.spyOn(mongoose, 'connect').mockResolvedValue(mongoose);

    await connectTestDatabase();

    expect(connect).toHaveBeenCalledWith(uri);
  });
});
