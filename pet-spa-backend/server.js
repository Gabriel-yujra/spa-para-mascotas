// server.js
// Punto de entrada de la app Pet Spa
require('dotenv').config();

const express = require('express');
const passport = require('passport');
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// --- Middlewares globales ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Passport (JWT)
app.use(passport.initialize());
require('./src/config/passport')(passport);

// Archivos estáticos (para futuras imágenes de mascotas, productos, etc.)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rutas
const authRoutes = require('./src/routes/authRoutes');
const employeeRoutes = require('./src/routes/employeeRoutes');
const usersRoutes = require('./src/routes/usersRoutes');
const auditRoutes = require('./src/routes/auditRoutes'); // NUEVO
const agendaRoutes = require('./src/routes/agendaRoutes');
const citaRoutes = require('./src/routes/citaRoutes');

authRoutes(app);
employeeRoutes(app);
usersRoutes(app);
auditRoutes(app); // NUEVO
agendaRoutes(app); // NUEVO
citaRoutes(app); // NUEVO

// Healthcheck simple
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'pet-spa-backend', time: new Date().toISOString() });
});

// --- Middleware de error global (fallback) ---
// Cualquier error no capturado en controllers cae aquí
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[GLOBAL ERROR]', err);
  res.status(err.status || 500).json({
    error: 'Internal server error',
    message: err.message || 'Algo salió mal'
  });
});

app.listen(port, () => {
  console.log(`🐾 Pet Spa backend listening on port ${port}`);
});

module.exports = app;
