import React, { useEffect, useRef, useState } from "react";
import Login from "./components/Login";
import Chat from "./components/Chat";
import ChangeLog from "./components/ChatLog";
import "./App.css";

const App: React.FC = () => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [messages, setMessages] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [user, setUser] = useState<null | { id: string; nombre: string; email: string }>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileList, setFileList] = useState<string[]>([]);
  const [editorContent, setEditorContent] = useState("");
  const [filename, setFilename] = useState("");
  const [availableDocs, setAvailableDocs] = useState<string[]>([]);
  const [changeLog, setChangeLog] = useState<string[]>([]);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [fileEditors, setFileEditors] = useState<string[]>([]);
  const autosaveRef = useRef<number | null>(null);
  const logTimeoutRef = useRef<number | null>(null);
  const timeoutIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!user) return;

    const ws = new WebSocket("ws://localhost:4000");
    ws.onopen = () => console.log("🔗 Conectado al WebSocket");

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "message") setMessages((prev) => [...prev, data.payload]);
        if (data.type === "editor") setEditorContent(data.payload);
        if (data.type === "log") setChangeLog((prev) => [...prev, data.payload]);
        if (data.type === "editing") setEditingUser(data.payload);

        if (data.type === "FileEditor") {
          setFileEditors((prev) =>
            prev.includes(data.payload.trim()) ? prev : [...prev, data.payload.trim()]
          );
        }

        if (data.type === "FileEditorDelete") {
          setFileEditors((prev) => prev.filter((item) => item !== data.payload));
        }
      } catch {
        setMessages((prev) => [...prev, event.data]);
      }
    };

    setSocket(ws);
    return () => ws.close();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    listarDocumentos();
    listarArchivos();

    autosaveRef.current = window.setInterval(() => {
      if (filename && editorContent) guardarDocumento(false);
    }, 10000);

    return () => {
      if (autosaveRef.current) clearInterval(autosaveRef.current);
    };
  }, [user, editorContent, filename]);

  const listarArchivos = async () => {
    try {
      const response = await fetch('http://localhost:4000/api/list');
      if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
      const data: string[] = await response.json();
      setFileList(data);
    } catch (error) {
      console.error('Error al obtener archivos:', error);
    }
  };

  const sendMessage = async () => {
    if (!input || !user) return;
    const hora = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const fullMessage = `[${hora}] ${user.nombre}: ${input}`;
    await fetch("http://localhost:4000/api/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: JSON.stringify({ type: "message", payload: fullMessage }) }),
    });
    setInput("");
  };

  const guardarHistorial = async () => {
    try {
      await fetch("http://localhost:4000/api/save_hist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages }),
      });
      alert("✅ Historial guardado correctamente");
    } catch {
      alert("❌ Error al guardar historial");
    }
  };

  const descargarHistorial = (formato: "json" | "txt") => {
    const url = `http://localhost:4000/api/view_hist${formato === "txt" ? "?format=txt" : ""}`;
    const link = document.createElement("a");
    link.href = url;
    link.download = `historial.${formato}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportarDocumento = (formato: "txt" | "pdf") => {
    const url = `http://localhost:4000/api/export_doc?format=${formato}`;
    const link = document.createElement("a");
    link.href = url;
    link.download = `documento.${formato}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFile(e.target.files[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("http://localhost:4000/upload", {
        method: "POST",
        body: formData,
      });
      alert(res.ok ? "✅ Archivo subido correctamente" : "❌ Error al subir archivo");
    } catch {
      alert("❌ Error de red");
    }
  };

  const handleEditorChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setEditorContent(value);
    if (socket && socket.readyState === WebSocket.OPEN && user) {
      socket.send(JSON.stringify({ type: "editor", payload: value }));
      socket.send(JSON.stringify({ type: "editing", payload: user.nombre }));

      if (logTimeoutRef.current) clearTimeout(logTimeoutRef.current);
      logTimeoutRef.current = window.setTimeout(() => {
        socket.send(JSON.stringify({ type: "log", payload: `${user.nombre} realizó cambios en el documento` }));
      }, 3000);

      if (timeoutIdRef.current !== null) {
        clearTimeout(timeoutIdRef.current);
      } else {
        socket.send(JSON.stringify({ type: "FileEditor", payload: user.nombre }));
      }

      timeoutIdRef.current = window.setTimeout(() => {
        socket.send(JSON.stringify({ type: "FileEditorDelete", payload: user.nombre }));
        timeoutIdRef.current = null;
      }, 5000);
    }
  };

  const crearNuevoDocumento = () => {
    if (window.confirm("¿Deseas crear un nuevo documento? Se perderán los cambios actuales.")) {
      setEditorContent("");
      setFilename("");
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "editor", payload: "" }));
      }
    }
  };

  const guardarDocumento = async (mostrarAlerta = true) => {
    let name = filename;
    if (!name) {
      name = prompt("Introduce un nombre para el documento (.txt):") || "";
      if (!name.endsWith(".txt")) name += ".txt";
      setFilename(name);
    }

    await fetch("http://localhost:4000/api/save_doc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: name, content: editorContent }),
    });

    if (mostrarAlerta) alert("✅ Documento guardado");
    listarDocumentos();
  };

  const listarDocumentos = async () => {
    const res = await fetch("http://localhost:4000/api/list_docs");
    const data = await res.json();
    setAvailableDocs(data.files);
  };

  const abrirDocumento = async (docName: string) => {
    const res = await fetch(`http://localhost:4000/api/open_doc/${docName}`);
    const data = await res.json();
    setEditorContent(data.content);
    setFilename(docName);
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "editor", payload: data.content }));
    }
  };

  return (
    <div className="app-container">
      {!user ? (
        <Login onLogin={setUser} />
      ) : (
        <>
          <div className="top-section">
            <div className="card editor">
              <h3>📝 Editor colaborativo</h3>
              <div className="editor-toolbar">
                <button onClick={crearNuevoDocumento} className="button">📄 Nuevo</button>
                <button onClick={() => guardarDocumento(true)} className="button">💾 Guardar</button>
                {filename && <span className="filename">🗂 {filename}</span>}
              </div>
              {editingUser && <p className="editing-user">✍️ {editingUser} está escribiendo...</p>}
              <textarea
                value={editorContent}
                onChange={handleEditorChange}
                rows={10}
                className="editor"
              />
              <div className="download-buttons">
                <button onClick={() => exportarDocumento("txt")} className="button">⬇️ Exportar TXT</button>
                <button onClick={() => exportarDocumento("pdf")} className="button">📄 Exportar PDF</button>
              </div>
              <div className="doc-list">
                <strong>📚 Abrir documento:</strong>
                <ul>
                  {availableDocs.map((doc) => (
                    <li key={doc}>
                      <button onClick={() => abrirDocumento(doc)} className="button small">{doc}</button>
                    </li>
                  ))}
                </ul>
              </div>
              <ChangeLog logs={changeLog} />
            </div>

            <div className="card chat">
              <Chat
                user={user}
                messages={messages}
                input={input}
                setInput={setInput}
                sendMessage={sendMessage}
              />
            </div>
          </div>

          <div className="grid-container">
            <div className="card upload">
              <h3>📎 Subir archivo</h3>
              <form onSubmit={handleSubmit} className="file-upload">
                <input type="file" accept=".pdf,.txt" onChange={handleFileChange} />
                <button type="submit" className="button">Subir</button>
              </form>
              <div className="doc-list">
                <strong>📄 Archivos disponibles:</strong>
                <ul>
                  {fileList.map((file, index) => (
                    <li key={index}>
                      {file} — <a href={`http://localhost:4000/api/descarga/${encodeURIComponent(file)}`} download>Descargar</a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="card historial">
              <h3>💾 Historial</h3>
              <button onClick={guardarHistorial} className="button">Guardar historial</button>
              <div className="download-buttons">
                <button onClick={() => descargarHistorial("json")} className="button">🔥 JSON</button>
                <button onClick={() => descargarHistorial("txt")} className="button">📄 TXT</button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default App;
