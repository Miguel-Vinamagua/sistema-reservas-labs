const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = require('./app');
const { connectDatabase } = require('./config/database');

async function startServer({ port = process.env.PORT || 3000 } = {}) {
  try {
    await connectDatabase();

    return await new Promise((resolve, reject) => {
      const server = app.listen(port, () => {
        server.removeListener('error', onError);
        resolve(server);
      });
      const onError = (error) => reject(error);

      server.once('error', onError);
    });
  } catch (error) {
    console.error('No se pudo iniciar el servidor:', error.message);
    throw error;
  }
}

if (require.main === module) {
  startServer().catch(() => {
    process.exitCode = 1;
  });
}

module.exports = { startServer };
