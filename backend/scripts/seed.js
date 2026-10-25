const path = require('path');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const Usuario = require('../src/models/usuario.model');
const Materia = require('../src/models/materia.model');
const { connectDatabase } = require('../src/config/database');

const validRoles = ['estudiante', 'docente', 'administrador'];
const teacherEmail = 'docente@utmachala.edu.ec';
const demoSubjects = [
  { nombre: 'Matemática', codigo: 'MAT-101' },
  { nombre: 'Física', codigo: 'FIS-101' }
];

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

async function seedTeacher(userModel = Usuario, password) {
  if (typeof password !== 'string' || password.length === 0) {
    throw new Error('La contraseña de docente@utmachala.edu.ec debe estar configurada.');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const result = await userModel.updateOne(
    { correo: teacherEmail },
    {
      $setOnInsert: {
        correo: teacherEmail,
        passwordHash,
        rol: 'docente'
      }
    },
    { upsert: true, runValidators: true }
  );

  return result.upsertedCount === 1
    ? { created: 1, existing: 0 }
    : { created: 0, existing: 1 };
}

async function seedMaterias(materiaModel = Materia, teacherId) {
  if (!teacherId || !mongoose.isValidObjectId(teacherId)) {
    throw new Error('El identificador del docente para las materias no es válido.');
  }

  let created = 0;
  let existing = 0;
  for (const subject of demoSubjects) {
    const result = await materiaModel.updateOne(
      { codigo: subject.codigo, docente: teacherId },
      {
        $setOnInsert: {
          ...subject,
          docente: teacherId
        }
      },
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
  const configuredTeacher = users.find(
    ({ correo }) => correo.trim().toLowerCase() === teacherEmail
  );
  const teacherPassword = configuredTeacher?.password || process.env.SEED_TEACHER_PASSWORD;
  if (configuredTeacher && configuredTeacher.rol !== 'docente') {
    throw new Error(`${teacherEmail} debe tener rol docente en SEED_USERS.`);
  }

  await connectDatabase();
  try {
    const result = await seedUsers(users);
    const teacherResult = await seedTeacher(Usuario, teacherPassword);
    const teacher = await Usuario.findOne({ correo: teacherEmail }).select('_id rol');
    if (!teacher || teacher.rol !== 'docente') {
      throw new Error(`No se pudo confirmar el usuario docente ${teacherEmail}.`);
    }
    const subjectResult = await seedMaterias(Materia, teacher._id);
    console.log(`Seed completado: ${result.created} creados, ${result.existing} ya existentes.`);
    console.log(`Docente: ${teacherResult.created} creado, ${teacherResult.existing} ya existente.`);
    console.log(`Materias: ${subjectResult.created} creadas, ${subjectResult.existing} ya existentes.`);
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

module.exports = { readSeedUsers, seedMaterias, seedTeacher, seedUsers };
