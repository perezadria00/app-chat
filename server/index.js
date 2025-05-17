const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const cors = require("cors");
const fileUpload = require("express-fileupload");
const fs = require("fs");
const path = require("path");

const app = express();
const port = 4000;

app.use(cors());
app.use(express.json());
app.use(fileUpload());

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const historialPath = path.join(__dirname, "data", "historial.json");
const documentsDir = path.join(__dirname, "documents");
if (!fs.existsSync(documentsDir)) fs.mkdirSync(documentsDir);

// WebSocket: gestionar mensajes colaborativos y del editor
wss.on("connection", (ws) => {
  console.log("Cliente conectado");

  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message);
      // Reenviar a todos los demás clientes
      wss.clients.forEach((client) => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(data));
        }
      });
    } catch (error) {
      console.error("Mensaje no JSON:", message);
    }
  });

  ws.on("close", () => {
    console.log("Cliente desconectado");
  });
});

// Endpoint: enviar mensajes (tipo: message)
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

// Endpoint: login de usuario
app.post("/login", (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email requerido" });

  const dataPath = path.join(__dirname, "data", "data.json");
  try {
    const raw = fs.readFileSync(dataPath, "utf8");
    const data = JSON.parse(raw);
    const user = data.usuarios.find((u) => u.email === email);

    if (!user) return res.status(401).json({ error: "Usuario no encontrado" });
    res.json({ success: true, user });
  } catch (err) {
    console.error("Error leyendo data.json:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Endpoint: guardar historial
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

// Endpoint: visualizar/exportar historial
app.get("/api/view_hist", (req, res) => {
  if (!fs.existsSync(historialPath)) {
    return res.status(404).json({ error: "No hay historial guardado." });
  }

  const raw = fs.readFileSync(historialPath, "utf8");
  const data = JSON.parse(raw);
  const format = req.query.format;

  if (format === "txt") {
    res.setHeader("Content-Disposition", "attachment; filename=historial.txt");
    res.setHeader("Content-Type", "text/plain");
    res.send(data.mensajes.join("\n"));
  } else {
    res.setHeader("Content-Disposition", "attachment; filename=historial.json");
    res.setHeader("Content-Type", "application/json");
    res.send(JSON.stringify(data, null, 2));
  }
});

// Endpoint: subir archivo (máximo 2MB)
app.post("/upload", (req, res) => {
  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400).send("No se ha subido ningún archivo");
  }

  const file = req.files.file;
  const savePath = path.join(__dirname, "archivos", file.name);
  const maxSize = 2 * 1024 * 1024;

  if (file.size > maxSize) {
    return res.status(400).json({ error: "El archivo es demasiado grande. Máximo 2 MB." });
  }

  file.mv(savePath, (err) => {
    if (err) return res.status(500).send(err);
    res.send("Archivo subido correctamente. Tamaño: " + file.size + " bytes");
  });
});

// Endpoint: guardar documento colaborativo
app.post("/api/save_doc", (req, res) => {
  const { filename, content } = req.body;
  if (!filename) return res.status(400).json({ error: "Nombre requerido" });

  const filePath = path.join(documentsDir, filename);
  fs.writeFileSync(filePath, content, "utf8");
  res.json({ success: true, message: "Documento guardado" });
});

// Endpoint: abrir documento existente
app.get("/api/open_doc/:filename", (req, res) => {
  const filePath = path.join(documentsDir, req.params.filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "Documento no encontrado" });
  }

  const content = fs.readFileSync(filePath, "utf8");
  res.json({ content });
});

// Endpoint: listar documentos
app.get("/api/list_docs", (req, res) => {
  const files = fs.readdirSync(documentsDir).filter((f) => f.endsWith(".txt"));
  res.json({ files });
});

server.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});

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


//Endpoint para recuperar editores de documento
app.get('/api/show_editors', (req, res) => {

})

//Endpoint para borrar editores de documento
app.get('/api/delete_editors', (req, res) => {

})