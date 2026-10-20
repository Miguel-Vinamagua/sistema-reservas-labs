const mongoose = require('mongoose');

async function connectTestDatabase(uri = process.env.MONGODB_URI) {
  if (!uri) {
    throw new Error('MONGODB_URI debe apuntar a la base de pruebas reservas_test.');
  }

  let databaseName;
  try {
    databaseName = decodeURIComponent(new URL(uri).pathname.slice(1));
  } catch {
    throw new Error('MONGODB_URI debe ser una URI de MongoDB válida para reservas_test.');
  }

  if (databaseName !== 'reservas_test') {
    throw new Error('Las pruebas solo pueden usar la base de datos reservas_test.');
  }

  await mongoose.connect(uri);
}

async function clearTestDatabase() {
  if (mongoose.connection.readyState !== 1) {
    return;
  }

  await Promise.all(
    Object.values(mongoose.connection.collections).map((collection) => collection.deleteMany({}))
  );
}

async function disconnectTestDatabase() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}

afterEach(async () => {
  await clearTestDatabase();
});

afterAll(async () => {
  await disconnectTestDatabase();
});

module.exports = {
  clearTestDatabase,
  connectTestDatabase,
  disconnectTestDatabase
};
