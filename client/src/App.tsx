import React, { useEffect, useState } from "react";
import Login from "./components/Login";
import Chat from "./components/Chat";

const App: React.FC = () => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [messages, setMessages] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [user, setUser] = useState<null | { id: string; nombre: string; email: string }>(null);
  const [file, setFile] = useState<File | null>(null);
  const [editorContent, setEditorContent] = useState("");

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
      } catch {
        // Mensaje plano antiguo
        setMessages((prev) => [...prev, event.data]);
      }
    };

    setSocket(ws);
    return () => ws.close();
  }, [user]);

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
        alert("✅ Archivo subido con éxito");
      } else {
        alert("❌ Error al subir el archivo");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("❌ Error de red");
    }
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
      console.error("❌ Error al guardar historial:", error);
      alert("❌ Error al guardar el historial");
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

  const handleEditorChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setEditorContent(value);

    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "editor", payload: value }));
    }
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
          <Chat
            user={user}
            messages={messages}
            input={input}
            setInput={setInput}
            sendMessage={sendMessage}
          />

          <button onClick={guardarHistorial} style={{ marginTop: "1rem" }}>
            💾 Guardar historial
          </button>

          <div style={{ marginTop: "1rem" }}>
            <button onClick={() => descargarHistorial("json")}>
              📥 Descargar historial (.json)
            </button>
            <button onClick={() => descargarHistorial("txt")} style={{ marginLeft: "1rem" }}>
              📄 Descargar historial (.txt)
            </button>
          </div>

          <h2 style={{ marginTop: "2rem" }}>📄 Subir archivo</h2>
          <form onSubmit={handleSubmit}>
            <input type="file" accept=".pdf, .txt" onChange={handleFileChange} />
            <button type="submit">Subir archivo</button>
          </form>

          <h2 style={{ marginTop: "2rem" }}>📝 Edición colaborativa</h2>
          <textarea
            value={editorContent}
            onChange={handleEditorChange}
            rows={10}
            style={{ width: "100%", marginTop: "0.5rem" }}
          />
        </>
      )}
    </div>
  );
};

export default App;
