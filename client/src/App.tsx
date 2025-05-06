import React, { useEffect, useState } from "react";
import Login from "./components/Login";
import Chat from "./components/Chat";

const App: React.FC = () => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [messages, setMessages] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [user, setUser] = useState<null | { id: string; nombre: string; email: string }>(null);

  // Conectar al WebSocket si hay usuario
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

  // Enviar mensaje al backend (REST)
  const sendMessage = async () => {
    if (!input || !user) return;

    await fetch("http://localhost:4000/api/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: `${user.nombre}: ${input}` }),
    });

    setInput("");
  };

  // Guardar historial en historial.json
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

  return (
    <div>
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
        </>
      )}
    </div>
  );
};

export default App;
