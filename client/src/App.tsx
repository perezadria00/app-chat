import React, { useEffect, useState } from "react";
import Login from "./components/Login";
import Chat from "./components/Chat";

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
  const [timeoutId, setTimeoutId] = useState<number | null>(null);
  const [fileEditors, setFileEditors] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;

    const ws = new WebSocket("ws://localhost:4000");

    ws.onopen = () => console.log("🔗 Conectado al WebSocket");

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "message") {
          setMessages((prev) => [...prev, data.payload]);
        }

        if (data.type === "editor") {
          setEditorContent(data.payload);
        }

        if(data.type ==="FileEditor"){
          setFileEditors(prev => {
            if (prev.includes(data.payload.trim())) return prev;
            return [...prev, data.payload.trim()];
          });
        }

        if(data.type === "FileEditorDelete"){
          setFileEditors(prev => prev.filter(item => item !== data.payload));
        }

      } catch {
        setMessages((prev) => [...prev, event.data]); // fallback para mensajes antiguos
      }
    };

    setSocket(ws);
    return () => ws.close();
  }, [user]);

  useEffect(() => {
    const listarArchivos = async () => {
      try {
        const response = await fetch('http://localhost:4000/api/list');

        if (!response.ok) {
          throw new Error(`Error HTTP: ${response.status}`);
        }

        const data: string[] = await response.json();
        setFileList(data);
      } catch (error) {
        console.error('Error al obtener archivos:', error);
      } 
    };
    listarArchivos();
  }, [fileList])

  const sendMessage = async () => {
    if (!input || !user) return;

    const fullMessage = `${user.nombre}: ${input}`;

    await fetch("http://localhost:4000/api/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: JSON.stringify({ type: "message", payload: fullMessage }) }),
    });

    setInput("");
  };

  const guardarHistorial = async () => {
    try {
      const response = await fetch("http://localhost:4000/api/save_hist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages }),
      });

      const data = await response.json();
      alert("✅ Historial guardado correctamente");
    } catch (error) {
      alert("❌ Error al guardar historial");
    }
  };

  const descargarHistorial = (formato: "json" | "txt") => {
    const url =
      formato === "txt"
        ? "http://localhost:4000/api/view_hist?format=txt"
        : "http://localhost:4000/api/view_hist";

    const link = document.createElement("a");
    link.href = url;
    link.download = `historial.${formato}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setFile(event.target.files[0]);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("http://localhost:4000/upload", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        alert("✅ Archivo subido correctamente");
      } else {
        alert("❌ Error al subir archivo");
      }
    } catch (error) {
      alert("❌ Error de red");
    }
  };

  const handleEditorChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setEditorContent(value);
    startIntervalWithTimeout()

    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "editor", payload: value }));
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

  const guardarDocumento = async () => {
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

    alert("✅ Documento guardado");
    listarDocumentos();
  };

  const listarDocumentos = async () => {
  console.log("🔍 Llamando a /api/list_docs");
  const res = await fetch("http://localhost:4000/api/list_docs");
  const data = await res.json();
  console.log("🧾 Documentos encontrados:", data.files);
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

  useEffect(() => {
    if (user) listarDocumentos();
  }, [user]);

  const startIntervalWithTimeout = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }else{
      console.log(user?.nombre)
      if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "FileEditor", payload: user?.nombre }));
    }
    }

    // Terminar después de 5 segundos
    const newTimeoutId = window.setTimeout(() => {
      if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "FileEditorDelete", payload: user?.nombre }));
    }
      setTimeoutId(null);
    }, 5000);
    console.log(fileEditors)
    
    setTimeoutId(newTimeoutId);
  };

  return (
    <div style={{ padding: "2rem" }}>
      {!user && (
        <>
          <Login onLogin={setUser} />
          <hr />
        </>
      )}

      {user && (
        <>
          <Chat user={user} messages={messages} input={input} setInput={setInput} sendMessage={sendMessage} />

          <button onClick={guardarHistorial} style={{ marginTop: "1rem" }}>
            💾 Guardar historial
          </button>

          <div style={{ marginTop: "1rem" }}>
            <button onClick={() => descargarHistorial("json")}>📥 Descargar historial (.json)</button>
            <button onClick={() => descargarHistorial("txt")} style={{ marginLeft: "1rem" }}>
              📄 Descargar historial (.txt)
            </button>
          </div>

          <h2 style={{ marginTop: "2rem" }}>📎 Subir archivo</h2>
          <form onSubmit={handleSubmit}>
            <input type="file" accept=".pdf,.txt" onChange={handleFileChange} />
            <button type="submit">Subir archivo</button>
          </form>

          <div>
      <h2>Lista de Archivos</h2>
      <ul>
        {fileList.map((file, index) => (
          <li key={index}>
            {file}
            <a
              href={`http://localhost:4000/api/descarga/${encodeURIComponent(file)}`}
              download
            >
              Descargar
            </a>
          </li>
        ))}
      </ul>
    </div>

          <h2 style={{ marginTop: "2rem" }}>📝 Editor colaborativo</h2>
          <div style={{ marginBottom: "0.5rem" }}>
            <button onClick={crearNuevoDocumento}>📄 Nuevo documento</button>
            <button onClick={guardarDocumento} style={{ marginLeft: "1rem" }}>
              💾 Guardar documento
            </button>
            {filename && <span style={{ marginLeft: "1rem" }}>🗂 {filename}</span>}
          </div>

          {/* mostrar quien esta editando el documento */}
          <div> 
            {fileEditors.length > 0 && (
            <ul>
              {fileEditors.map((item, index) => (
                <span key={index}>{item}, </span>
              ))}
              <span> está editando el documento</span>
            </ul>
            )}
          </div>

          <textarea
            value={editorContent}
            onChange={handleEditorChange}
            rows={10}
            style={{ width: "100%", marginBottom: "1rem" }}
          />

          <div>
            <strong>📚 Abrir documento:</strong>
            <ul>
              {availableDocs.map((doc) => (
                <li key={doc}>
                  <button onClick={() => abrirDocumento(doc)}>{doc}</button>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
};

export default App;
