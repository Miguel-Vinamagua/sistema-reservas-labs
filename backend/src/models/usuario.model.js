const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dummyPasswordHash = bcrypt.hashSync('invalid-password', 12);

const usuarioSchema = new mongoose.Schema(
  {
    correo: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    },
    passwordHash: {
      type: String,
      required: true,
      select: false
    },
    rol: {
      type: String,
      required: true,
      enum: ['estudiante', 'docente', 'administrador']
    },
    reservationRevision: {
      type: Number,
      required: true,
      default: 0
    }
  },
  { collection: 'usuarios' }
);

usuarioSchema.methods.setPassword = async function setPassword(password) {
  if (typeof password !== 'string' || password.length === 0) {
    throw new TypeError('La contraseña debe ser una cadena no vacía.');
  }

  this.passwordHash = await bcrypt.hash(password, 12);
};

usuarioSchema.methods.comparePassword = function comparePassword(password) {
  if (typeof password !== 'string' || typeof this.passwordHash !== 'string') {
    return Promise.resolve(false);
  }

  return bcrypt.compare(password, this.passwordHash);
};

usuarioSchema.statics.comparePasswordDummy = function comparePasswordDummy(password) {
  return bcrypt.compare(password, dummyPasswordHash);
};

usuarioSchema.set('toJSON', {
  transform(_document, returnedObject) {
    delete returnedObject.passwordHash;
    return returnedObject;
  }
});

module.exports = mongoose.models.Usuario || mongoose.model('Usuario', usuarioSchema);
