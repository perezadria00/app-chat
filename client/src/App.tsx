import React, { useEffect, useState } from "react";
import Login from "./components/Login";
import Chat from "./components/Chat";

const App: React.FC = () => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [messages, setMessages] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [user, setUser] = useState<null | { id: string; nombre: string; email: string }>(null);
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (!user) return;

    const ws = new WebSocket("ws://localhost:4000");
    ws.onopen = () => console.log("🔗 Conectado al WebSocket");
    ws.onmessage = (event) => {
      setMessages((prev) => [...prev, event.data]);
    };

    setSocket(ws);
    return () => ws.close();
  }, [user]);

  const sendMessage = async () => {
    if (!input || !user) return;

    await fetch("http://localhost:4000/api/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: `${user.nombre}: ${input}` }),
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
        console.log("Archivo subido con éxito");
      } else {
        console.error("Error al subir el archivo");
      }
    } catch (error) {
      console.error("Error:", error);
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
      console.log("✅ Historial guardado:", data);
      alert("Historial guardado correctamente");
    } catch (error) {
      console.error("❌ Error al guardar historial:", error);
      alert("Error al guardar el historial");
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
          <h1 style={{ marginTop: "2rem" }}>Archivos</h1>
          <form onSubmit={handleSubmit}>
            <input type="file" accept=".pdf, .txt" onChange={handleFileChange} />
            <button type="submit">Subir archivo</button>
          </form>
        </>
      )}
      
    </div>
  );
};

export default App;
