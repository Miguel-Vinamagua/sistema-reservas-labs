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
      trim: true
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
    capacidadMax: {
      type: Number,
      required: true
    },
    inscritosCount: {
      type: Number,
      default: 0
    },
    estado: {
      type: String,
      required: true,
      enum: ['disponible', 'llena', 'finalizada'],
      default: 'disponible'
    }
  },
  { collection: 'sesioneslaboratorio', timestamps: true }
);

module.exports =
  mongoose.models.SesionLaboratorio ||
  mongoose.model('SesionLaboratorio', sesionLaboratorioSchema);
