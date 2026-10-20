jest.mock('../../src/config/database', () => ({
  connectDatabase: jest.fn()
}));

jest.mock('../../src/app', () => ({
  listen: jest.fn()
}));

const { EventEmitter } = require('events');
const app = require('../../src/app');
const { connectDatabase } = require('../../src/config/database');
const { startServer } = require('../../src/server');

describe('server startup', () => {
  beforeEach(() => {
    connectDatabase.mockReset();
    app.listen.mockReset();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('does not connect or listen merely by importing the server', () => {
    expect(connectDatabase).not.toHaveBeenCalled();
    expect(app.listen).not.toHaveBeenCalled();
  });

  it('connects to MongoDB before listening', async () => {
    const order = [];
    const listener = new EventEmitter();
    connectDatabase.mockImplementation(async () => {
      order.push('database');
    });
    app.listen.mockImplementation((port, callback) => {
      order.push(`listen:${port}`);
      process.nextTick(callback);
      return listener;
    });

    await expect(startServer({ port: 4321 })).resolves.toBe(listener);

    expect(order).toEqual(['database', 'listen:4321']);
  });

  it('rejects startup when the database connection fails', async () => {
    const error = new Error('database unavailable');
    connectDatabase.mockRejectedValue(error);
    const logError = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(startServer({ port: 4321 })).rejects.toBe(error);
    expect(app.listen).not.toHaveBeenCalled();
    expect(logError).toHaveBeenCalled();
  });

  it('rejects startup when the listener emits an error', async () => {
    const error = new Error('port unavailable');
    const listener = new EventEmitter();
    connectDatabase.mockResolvedValue();
    app.listen.mockImplementation(() => {
      process.nextTick(() => listener.emit('error', error));
      return listener;
    });
    jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(startServer({ port: 4321 })).rejects.toBe(error);
  });
});
