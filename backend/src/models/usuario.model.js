const mongoose = require('mongoose');

const usuarioSchema = new mongoose.Schema(
  {
    rol: {
      type: String,
      required: true,
      enum: ['estudiante', 'docente', 'administrador']
    }
  },
  { collection: 'usuarios' }
);

module.exports = mongoose.models.Usuario || mongoose.model('Usuario', usuarioSchema);
