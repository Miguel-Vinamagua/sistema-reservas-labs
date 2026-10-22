const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth.routes');
const laboratoryRoutes = require('./routes/laboratorios.routes');
const reservationRoutes = require('./routes/reservas.routes');

const app = express();

app.use(express.json());
app.use(cors({
	origin: process.env.FRONTEND_URL || 'http://localhost:4200',
	methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
	allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use('/api/auth', authRoutes);
app.use('/api/laboratorios', laboratoryRoutes);
app.use('/api/reservas', reservationRoutes);

module.exports = app;
