const express = require("express");

const app = express();
const PORT = 3000;

// Permite que Express lea cuerpos de solicitudes en formato JSON.
app.use(express.json());

app.get("/", (req, res) => {
  res.send("¡Hola! El servidor Express está funcionando.");
});

app.get("/api/customers", (req, res) => {
  res.json({
    mensaje: "Ruta preparada; en el siguiente paso la conectaremos a MySQL."
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});