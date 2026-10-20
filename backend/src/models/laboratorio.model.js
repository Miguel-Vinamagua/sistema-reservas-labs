const mongoose = require('mongoose');

const laboratorioSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: true,
      trim: true,
      minlength: 1
    },
    capacidad: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: 'La capacidad debe ser un entero positivo.'
      }
    },
    ubicacion: {
      type: String,
      required: true,
      trim: true,
      minlength: 1
    },
    activo: {
      type: Boolean,
      required: true,
      default: true
    },
    reservationRevision: {
      type: Number,
      required: true,
      default: 0
    }
  },
  { collection: 'laboratorios', timestamps: true }
);

module.exports =
  mongoose.models.Laboratorio || mongoose.model('Laboratorio', laboratorioSchema);
