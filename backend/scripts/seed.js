const path = require('path');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const Usuario = require('../src/models/usuario.model');
const { connectDatabase } = require('../src/config/database');

const validRoles = ['estudiante', 'docente', 'administrador'];

function validateSeedUsers(users) {
  if (!Array.isArray(users) || users.length === 0) {
    throw new Error('SEED_USERS debe ser un arreglo JSON no vacío.');
  }

  for (const [index, user] of users.entries()) {
    if (!user || typeof user !== 'object' || Array.isArray(user)) {
      throw new Error(`El usuario inicial en la posición ${index} no es válido.`);
    }

    if (
      typeof user.correo !== 'string' ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.correo.trim())
    ) {
      throw new Error(`El correo del usuario inicial en la posición ${index} no es válido.`);
    }

    if (typeof user.password !== 'string' || user.password.length === 0) {
      throw new Error(`La contraseña del usuario inicial en la posición ${index} no es válida.`);
    }

    if (!validRoles.includes(user.rol)) {
      throw new Error(`El rol del usuario inicial en la posición ${index} no es válido.`);
    }
  }
}

function readSeedUsers(env = process.env) {
  if (!env.SEED_USERS) {
    throw new Error('SEED_USERS no está configurada.');
  }

  let users;
  try {
    users = JSON.parse(env.SEED_USERS);
  } catch {
    throw new Error('SEED_USERS debe contener JSON válido.');
  }

  validateSeedUsers(users);
  return users;
}

async function seedUsers(users, userModel = Usuario) {
  validateSeedUsers(users);

  let created = 0;
  let existing = 0;

  for (const user of users) {
    const correo = user.correo.trim().toLowerCase();
    const passwordHash = await bcrypt.hash(user.password, 12);
    const result = await userModel.updateOne(
      { correo },
      { $setOnInsert: { correo, passwordHash, rol: user.rol } },
      { upsert: true, runValidators: true }
    );

    if (result.upsertedCount === 1) {
      created += 1;
    } else {
      existing += 1;
    }
  }

  return { created, existing };
}

async function main() {
  dotenv.config({ path: path.resolve(__dirname, '../.env') });
  const users = readSeedUsers();

  await connectDatabase();
  try {
    const result = await seedUsers(users);
    console.log(`Seed completado: ${result.created} creados, ${result.existing} ya existentes.`);
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error('No se pudo completar el seed:', error.message);
    process.exitCode = 1;
  });
}

module.exports = { readSeedUsers, seedUsers };
