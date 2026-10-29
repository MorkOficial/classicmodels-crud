const http = require("node:http");

const server = http.createServer((request, response) => {
  response.writeHead(200, {
    "Content-Type": "text/plain; charset=utf-8"
  });

  response.end("¡Hola! El servidor Node.js está funcionando.");
});

server.listen(3000, "0.0.0.0", () => {
  console.log("Servidor escuchando en el puerto 3000");
});