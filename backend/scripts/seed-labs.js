const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const { connectDatabase } = require('../src/config/database');
const Laboratorio = require('../src/models/laboratorio.model');
const Reserva = require('../src/models/reserva.model');
const Usuario = require('../src/models/usuario.model');

const laboratoryData = [
  { nombre: 'Laboratorio de Redes y Telecomunicaciones', capacidad: 24, ubicacion: 'Bloque A, aula 203' },
  { nombre: 'Laboratorio de Programación', capacidad: 20, ubicacion: 'Bloque B, aula 105' },
  { nombre: 'Laboratorio de Desarrollo de Software', capacidad: 18, ubicacion: 'Bloque C, aula 110' }
];

async function seedLaboratories(laboratoryModel = Laboratorio) {
  const laboratories = [];
  let created = 0;
  let existing = 0;

  for (const data of laboratoryData) {
    let laboratory = await laboratoryModel.findOne({ nombre: data.nombre });
    if (laboratory) {
      existing += 1;
    } else {
      laboratory = await laboratoryModel.create(data);
      created += 1;
    }

    laboratories.push(laboratory);
  }

  return { laboratories, created, existing };
}

function reservationWindow(referenceDate, daysFromReference) {
  const inicio = new Date(referenceDate);
  inicio.setUTCHours(15, 0, 0, 0);
  inicio.setUTCDate(inicio.getUTCDate() + daysFromReference);

  const fin = new Date(inicio);
  fin.setUTCHours(fin.getUTCHours() + 2);
  return { inicio, fin };
}

async function seedReservation(
  reservationModel,
  laboratoryId,
  userId,
  window,
  estado
) {
  const reservationData = {
    laboratorio: laboratoryId,
    usuario: userId,
    ...window,
    estado
  };

  const existing = await reservationModel.findOne({
    laboratorio: laboratoryId,
    usuario: userId,
    inicio: window.inicio,
    fin: window.fin
  });
  if (existing) {
    return 'existing';
  }

  if (estado === 'activa') {
    const conflict = await reservationModel.findOne({
      laboratorio: laboratoryId,
      estado: 'activa',
      inicio: { $lt: window.fin },
      fin: { $gt: window.inicio }
    });
    if (conflict) {
      return 'skipped';
    }
  }

  await reservationModel.create(reservationData);
  return 'created';
}

async function seedReservations(
  laboratories,
  userId,
  reservationModel = Reserva,
  referenceDate = new Date()
) {
  let created = 0;
  let existing = 0;
  let skipped = 0;
  const activeLaboratories = laboratories.filter((laboratory) => laboratory.activo);

  for (const [index, laboratory] of activeLaboratories.entries()) {
    const result = await seedReservation(
      reservationModel,
      laboratory._id,
      userId,
      reservationWindow(referenceDate, 30 + index),
      'activa'
    );
    if (result === 'created') created += 1;
    if (result === 'existing') existing += 1;
    if (result === 'skipped') skipped += 1;
  }

  if (activeLaboratories.length > 0) {
    const result = await seedReservation(
      reservationModel,
      activeLaboratories[0]._id,
      userId,
      reservationWindow(referenceDate, 30 + activeLaboratories.length),
      'cancelada'
    );
    if (result === 'created') created += 1;
    if (result === 'existing') existing += 1;
  }

  return { created, existing, skipped };
}

async function main() {
  dotenv.config({ path: path.resolve(__dirname, '../.env') });
  console.log('Conectando a la base de datos...');

  try {
    await connectDatabase();
    const user = await Usuario.findOne().sort({ _id: 1 });
    if (!user) {
      throw new Error('No hay usuarios registrados. Ejecuta primero el seed de usuarios.');
    }

    const laboratoryResult = await seedLaboratories();
    const reservationResult = await seedReservations(
      laboratoryResult.laboratories,
      user._id
    );

    console.log(
      `Laboratorios: ${laboratoryResult.created} creados, ${laboratoryResult.existing} ya existentes.`
    );
    console.log(
      `Reservas: ${reservationResult.created} creadas, ${reservationResult.existing} ya existentes, ${reservationResult.skipped} omitidas por conflictos.`
    );
    console.log(`Reservas asociadas al usuario ${user.correo}.`);
  } finally {
    await mongoose.disconnect();
    console.log('Conexión a la base de datos cerrada.');
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error('No se pudo completar el seed de laboratorios:', error.message);
    process.exitCode = 1;
  });
}

module.exports = { seedLaboratories, seedReservations };
