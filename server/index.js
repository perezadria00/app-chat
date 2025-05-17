const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const cors = require("cors");
const fileUpload = require("express-fileupload");

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

const fs = require("fs");
const path = require("path");

// Endpoint para el login de usuarios
app.post("/login", (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email requerido" });

  const dataPath = path.join(__dirname, "data", "data.json");
  let data;
  try {
    const raw = fs.readFileSync(dataPath, "utf8");
    data = JSON.parse(raw);
  } catch (err) {
    console.error("Error leyendo data.json:", err);
    return res.status(500).json({ error: "Error interno del servidor" });
  }

  const user = data.usuarios.find((u) => u.email === email);
  if (!user) return res.status(401).json({ error: "Usuario no encontrado" });

  res.json({ success: true, user });
});
const historialPath = path.join(__dirname, "data", "historial.json");

// Endpoint para guardar historial
app.post("/api/save_hist", (req, res) => {
  const { messages } = req.body;
  if (!Array.isArray(messages)) {
    return res.status(400).json({ error: "Formato inválido. Se esperaba un array de mensajes." });
  }

  try {
    fs.writeFileSync(historialPath, JSON.stringify({ mensajes: messages }, null, 2), "utf8");
    res.json({ success: true, message: "Historial guardado correctamente" });
  } catch (error) {
    console.error("Error al guardar historial:", error);
    res.status(500).json({ error: "No se pudo guardar el historial" });
  }
});

// Endpoint para visualizar/exportar el historial
app.get("/api/view_hist", (req, res) => {
  const format = req.query.format;
  const historialPath = path.join(__dirname, "data", "historial.json");

  if (!fs.existsSync(historialPath)) {
    return res.status(404).json({ error: "No hay historial guardado." });
  }

  const raw = fs.readFileSync(historialPath, "utf8");
  const data = JSON.parse(raw);

  if (format === "txt") {
    const textoPlano = data.mensajes.join("\n");
    res.setHeader("Content-Disposition", "attachment; filename=historial.txt");
    res.setHeader("Content-Type", "text/plain");
    res.send(textoPlano);
  } else {
    // Por defecto, devuelve JSON
    res.setHeader("Content-Disposition", "attachment; filename=historial.json");
    res.setHeader("Content-Type", "application/json");
    res.send(JSON.stringify(data, null, 2));
  }
});


server.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});

//Endpoint para enviar archivos
app.post("/upload", function(req, res){
  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400).send('No se ha subido ningún archivo');
  }

  const file = req.files.file;
  let path = __dirname + '/archivos/' + file.name;
  const maxSize = 2 * 1024 * 1024;

  if (file.size > maxSize) {
    return res.status(400).json({ error: "El archivo es demasiado grande. Máximo 2 MB." });
  }
  

  file.mv(path, function(err) {
    if (err)
      return res.status(500).send(err);

    res.send('Archivo subido correctamente.' + file.size);
  });
})

const FILES_DIR = path.join(__dirname, 'archivos');

//Endpoint para listar archivos
app.get('/api/list', (req, res) => {
  fs.readdir(FILES_DIR, (err, files) => {
    if (err) {
      return res.status(500).json({ error: 'Error al leer los archivos' });
    }
    res.json(files);
  });
});

//Endpoint para descargar archivos
app.get('/api/descarga/:filename', (req, res) => {
  const filename = req.params.filename;

  if (filename.includes('..')) {
    return res.status(400).send('Nombre de archivo no válido');
  }

  const filePath = FILES_DIR + '/' + filename;

  res.download(filePath, filename, (err) => {
    if (err) {
      console.error('Error al descargar:', err);
      res.status(404).send('Archivo no encontrado');
    }
  });
});
