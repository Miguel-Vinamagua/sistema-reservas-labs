const mongoose = require('mongoose');

const materiaSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: true,
      trim: true,
      minlength: 1
    },
    codigo: {
      type: String,
      required: true,
      trim: true,
      minlength: 1
    },
    docente: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      required: true
    }
  },
  { collection: 'materias', timestamps: true }
);

materiaSchema.index({ codigo: 1, docente: 1 }, { unique: true });

module.exports = mongoose.models.Materia || mongoose.model('Materia', materiaSchema);
