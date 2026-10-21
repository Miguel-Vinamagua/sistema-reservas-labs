const express = require('express');
const authRoutes = require('./routes/auth.routes');
const laboratoryRoutes = require('./routes/laboratorios.routes');
const reservationRoutes = require('./routes/reservas.routes');

const app = express();

app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/laboratorios', laboratoryRoutes);
app.use('/api/reservas', reservationRoutes);

module.exports = app;
