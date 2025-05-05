const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const cors = require("cors");
const fileUpload = require('express-fileupload');

const app = express();
const port = 4000;

app.use(cors());
app.use(express.json());
app.use(fileUpload());

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// WebSocket solo para emitir mensajes
wss.on("connection", (ws) => {
  console.log("Cliente conectado");
  ws.on("close", () => {
    console.log("Cliente desconectado");
  });
});

// Endpoint para enviar mensaje a todos los WebSocket conectados
app.post("/api/message", (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: "Mensaje vacío" });

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });

  res.json({ sent: true });
});

server.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});

//Endpoint para enviar archivos
app.post("/upload", function(req, res){
  let file;
  let path;

  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400).send('No se ha subido ningún archivo');
  }

  file = req.files.file;
  path = __dirname + '/archivos/' + file.name;

  file.mv(uploadPath, function(err) {
    if (err)
      return res.status(500).send(err);

    res.send('Archivo subido correctamente');
  });
})
