const mongoose = require('mongoose');

async function connectDatabase() {
  const uri = process.env.MONGODB_URI;

  if (!uri || !uri.trim()) {
    throw new Error('MONGODB_URI no está configurada.');
  }

  return mongoose.connect(uri);
}

module.exports = { connectDatabase };
