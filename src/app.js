const express = require("express");
const path = require("path");
const mysql = require("mysql2/promise");
require("dotenv").config();
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para procesar JSON y datos de formularios
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==========================================
// CONFIGURACIÓN DE SESIONES Y PASSPORT
// ==========================================

// 1. Configurar express-session para mantener la sesión del usuario activa
app.use(session({
    secret: process.env.SESSION_SECRET || 'clave_secreta_temporal',
    resave: false,
    saveUninitialized: false
}));

// 2. Inicializar Passport y el manejo de sesiones en la aplicación
app.use(passport.initialize());
app.use(passport.session());

// 3. Configurar la estrategia de inicio de sesión con Google OAuth 2.0
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/callback"
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Aquí recibes el perfil de Google del usuario (correo, nombre, etc.)
      console.log("Usuario autenticado con Google:", profile.emails[0].value);
      return done(null, profile);
    } catch (err) {
      return done(err, null);
    }
  }
));

// 4. Métodos para guardar y recuperar el usuario de la sesión
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

// ==========================================
// ARCHIVOS ESTÁTICOS Y FAVICON
// ==========================================

// Servir el favicon explícitamente antes de los archivos estáticos
app.get("/favicon.png", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/favicon.png"));
});

// Servir archivos estáticos de la carpeta public
app.use(express.static(path.join(__dirname, "../public")));

// Crear la conexión a la base de datos usando variables de entorno
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306
});

// ==========================================
// RUTAS DE AUTENTICACIÓN GOOGLE OAUTH
// ==========================================

// Inicia el flujo de autenticación pidiendo perfil y correo a Google
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// Callback: Google redirige aquí tras el login exitoso
app.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => {
    // Autenticación correcta, redirigimos a la página principal (dashboard)
    res.redirect('/');
  }
);

// Ruta para cerrar sesión del usuario
app.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) { return next(err); }
    res.redirect('/');
  });
});

// ==========================================
// RUTAS DE LA API (CUSTOMERS CRUD)
// ==========================================

// Ruta de la API para consultar los clientes con PAGINACIÓN (Read)
app.get("/api/customers", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const [countResult] = await pool.query("SELECT COUNT(*) as total FROM customers");
    const totalRows = countResult[0].total;
    const totalPages = Math.ceil(totalRows / limit);

    const query = "SELECT customerNumber, customerName, contactLastName, contactFirstName, city, country FROM customers LIMIT ? OFFSET ?";
    const [rows] = await pool.query(query, [limit, offset]);

    res.json({
      mensaje: "¡Conectado a MySQL con éxito!",
      clientes: rows,
      currentPage: page,
      totalPages: totalPages
    });
  } catch (error) {
    console.error("Error al consultar MySQL:", error);
    res.status(500).json({ error: "No se pudo conectar a la base de datos" });
  }
});

// Ruta de la API para registrar un nuevo cliente (Create)
app.post("/api/customers", async (req, res) => {
  try {
    const { customerNumber, customerName, contactLastName, contactFirstName, city, country } = req.body;
    
    const query = `
      INSERT INTO customers 
      (customerNumber, customerName, contactLastName, contactFirstName, phone, addressLine1, city, country) 
      VALUES (?, ?, ?, ?, '555-0000', 'Dirección por defecto', ?, ?)
    `;
    
    await pool.query(query, [customerNumber, customerName, contactLastName, contactFirstName, city, country]);
    res.status(201).json({ mensaje: "¡Cliente registrado con éxito!" });
  } catch (error) {
    console.error("Error al insertar cliente:", error);
    res.status(500).json({ error: "No se pudo registrar el cliente" });
  }
});

// Ruta para actualizar un cliente existente (Update)
app.put("/api/customers/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { customerName, contactLastName, contactFirstName, city, country } = req.body; 
    
    const query = `
      UPDATE customers 
      SET customerName = ?, contactLastName = ?, contactFirstName = ?, city = ?, country = ? 
      WHERE customerNumber = ?
    `;
    
    await pool.query(query, [customerName, contactLastName, contactFirstName, city, country, id]);
    res.json({ mensaje: "¡Cliente actualizado con éxito!" });
  } catch (error) {
    console.error("Error al actualizar cliente:", error);
    res.status(500).json({ error: "No se pudo actualizar el cliente" });
  }
});

// Ruta para eliminar un cliente por su ID (Delete)
app.delete("/api/customers/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = "DELETE FROM customers WHERE customerNumber = ?";
    await pool.query(query, [id]);
    
    res.json({ mensaje: "¡Cliente eliminado con éxito!" });
  } catch (error) {
    console.error("Error al eliminar cliente:", error);
    res.status(500).json({ error: "No se pudo eliminar el cliente." });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});