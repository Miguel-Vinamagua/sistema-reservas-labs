const mongoose = require('mongoose');

const reservaSchema = new mongoose.Schema(
  {
    sesionLaboratorio: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SesionLaboratorio',
      required: true
    },
    usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      required: true
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

reservaSchema.index({ sesionLaboratorio: 1, usuario: 1 });

module.exports = mongoose.models.Reserva || mongoose.model('Reserva', reservaSchema);
