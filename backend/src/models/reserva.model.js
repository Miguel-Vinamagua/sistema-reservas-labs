const mongoose = require('mongoose');

const reservaSchema = new mongoose.Schema(
  {
    laboratorio: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Laboratorio',
      required: true
    },
    usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
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
    estado: {
      type: String,
      required: true,
      enum: ['activa', 'cancelada'],
      default: 'activa'
    }
  },
  { collection: 'reservas', timestamps: true }
);

reservaSchema.index({ laboratorio: 1, inicio: 1, fin: 1 });

module.exports = mongoose.models.Reserva || mongoose.model('Reserva', reservaSchema);
