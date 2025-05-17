const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const cors = require("cors");
const fileUpload = require("express-fileupload");
const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");

const app = express();
const port = 4000;

app.use(cors());
app.use(express.json());
app.use(fileUpload());

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const historialPath = path.join(__dirname, "data", "historial.json");
const documentsDir = path.join(__dirname, "documents");
const autosavePath = path.join(__dirname, "autosave");
const exportPath = path.join(__dirname, "export");

[documentsDir, autosavePath, exportPath].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);
});

let currentContent = "";

wss.on("connection", (ws) => {
  console.log("Cliente conectado");
  if (currentContent) {
    ws.send(JSON.stringify({ type: "editor", payload: currentContent }));
  }

  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message);
      if (data.type === "editor") currentContent = data.payload;

      wss.clients.forEach((client) => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(data));
        }
      });
    } catch (error) {
      console.error("Mensaje no JSON:", message);
    }
  });

  ws.on("close", () => console.log("Cliente desconectado"));
});

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

app.post("/api/save_hist", (req, res) => {
  const { messages } = req.body;
  if (!Array.isArray(messages)) {
    return res.status(400).json({ error: "Formato inválido. Se esperaba un array de mensajes." });
  }
  try {
    fs.writeFileSync(historialPath, JSON.stringify({ mensajes: messages }, null, 2), "utf8");
    res.json({ success: true });
  } catch (error) {
    console.error("Error al guardar historial:", error);
    res.status(500).json({ error: "No se pudo guardar el historial" });
  }
});

app.get("/api/view_hist", (req, res) => {
  if (!fs.existsSync(historialPath)) return res.status(404).json({ error: "No hay historial guardado." });
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

app.post("/api/save_doc", (req, res) => {
  const { filename, content } = req.body;
  if (!filename) return res.status(400).json({ error: "Nombre requerido" });
  const filePath = path.join(documentsDir, filename);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const versionedPath = path.join(autosavePath, `${filename.replace(".txt", "")}_${timestamp}.txt`);
  fs.writeFileSync(filePath, content, "utf8");
  fs.writeFileSync(versionedPath, content, "utf8");
  res.json({ success: true });
});

app.get("/api/open_doc/:filename", (req, res) => {
  const filePath = path.join(documentsDir, req.params.filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: "Documento no encontrado" });
  const content = fs.readFileSync(filePath, "utf8");
  res.json({ content });
});

app.get("/api/list_docs", (req, res) => {
  const files = fs.readdirSync(documentsDir).filter((f) => f.endsWith(".txt"));
  res.json({ files });
});

app.get("/api/export_doc", (req, res) => {
  const format = req.query.format;
  const filePath = path.join(exportPath, `exported.${format}`);
  if (format === "pdf") {
    const doc = new PDFDocument();
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);
    doc.text(currentContent);
    doc.end();
    stream.on("finish", () => {
      res.download(filePath);
    });
  } else {
    fs.writeFileSync(filePath, currentContent);
    res.download(filePath);
  }
});

server.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});
