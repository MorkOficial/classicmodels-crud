const express = require("express");
const path = require("path");
const mysql = require("mysql2/promise");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para procesar JSON y datos de formularios
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// Ruta de la API para consultar los clientes con PAGINACIÓN (Read)
app.get("/api/customers", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // Obtener total de registros para calcular el total de páginas
    const [countResult] = await pool.query("SELECT COUNT(*) as total FROM customers");
    const totalRows = countResult[0].total;
    const totalPages = Math.ceil(totalRows / limit);

    // Obtener solo la página actual de registros
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
    
    // Incluimos valores por defecto para campos NOT NULL requeridos en classicmodels (phone, addressLine1)
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
// AÑADE ESTO: Ruta para actualizar un cliente existente
app.put("/api/customers/:id", async (req, res) => {
  try {
    const { id } = req.params; // Capturamos el ID que viene en la URL
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
// AÑADE ESTO: Ruta para eliminar un cliente por su ID
app.delete("/api/customers/:id", async (req, res) => {
  try {
    const { id } = req.params; // Capturamos el ID del cliente a borrar
    
    const query = "DELETE FROM customers WHERE customerNumber = ?";
    await pool.query(query, [id]); // Ejecutamos el borrado en MySQL
    
    res.json({ mensaje: "¡Cliente eliminado con éxito!" });
  } catch (error) {
    console.error("Error al eliminar cliente:", error);
    res.status(500).json({ error: "No se pudo eliminar el cliente." });
  }
});
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});
