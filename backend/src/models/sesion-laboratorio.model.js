const mongoose = require('mongoose');

const sesionLaboratorioSchema = new mongoose.Schema(
  {
    laboratorio: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Laboratorio',
      required: true
    },
    docente: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      required: true
    },
    materia: {
      type: String,
      required: true,
      trim: true
    },
    actividad: {
      type: String,
      required: true,
      trim: true,
      minlength: 1
    },
    fecha: {
      type: Date,
      required: true
    },
    inicio: {
      type: Date,
      required: true
    },
    fin: {
      type: Date,
      required: true,
      validate: {
        validator(value) {
          return !this.inicio || value > this.inicio;
        },
        message: 'La fecha de fin debe ser posterior a la fecha de inicio.'
      }
    },
    cupos: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: 'Los cupos deben ser un entero positivo.'
      }
    },
    inscritosCount: {
      type: Number,
      default: 0
    },
    estado: {
      type: String,
      required: true,
      enum: ['abierta', 'llena', 'cancelada'],
      default: 'abierta'
    }
  },
  { collection: 'sesiones', timestamps: true }
);

module.exports =
  mongoose.models.SesionLaboratorio ||
  mongoose.model('SesionLaboratorio', sesionLaboratorioSchema);
