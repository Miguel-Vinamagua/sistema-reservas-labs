const mongoose = require('mongoose');
const { connectDatabase } = require('../../src/config/database');

describe('connectDatabase', () => {
  afterEach(() => {
    delete process.env.MONGODB_URI;
    jest.restoreAllMocks();
  });

  it('connects using MONGODB_URI', async () => {
    const uri = 'mongodb://localhost:27017/reservas_test';
    process.env.MONGODB_URI = uri;
    const connect = jest.spyOn(mongoose, 'connect').mockResolvedValue(mongoose);

    await connectDatabase();

    expect(connect).toHaveBeenCalledWith(uri);
  });

  it('fails clearly when MONGODB_URI is missing', async () => {
    delete process.env.MONGODB_URI;
    const connect = jest.spyOn(mongoose, 'connect').mockResolvedValue(mongoose);

    await expect(connectDatabase()).rejects.toThrow('MONGODB_URI no está configurada');
    expect(connect).not.toHaveBeenCalled();
  });
});
