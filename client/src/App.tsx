import React, { useEffect, useState } from "react";

const App: React.FC = () => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [messages, setMessages] = useState<string[]>([]);
  const [input, setInput] = useState("");

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:4000");

    ws.onopen = () => console.log("Conectado al WebSocket");
    ws.onmessage = (event) => {
      setMessages((prev) => [...prev, event.data]);
    };

    setSocket(ws);
    return () => ws.close();
  }, []);

  const sendMessage = async () => {
    if (!input) return;
    await fetch("http://localhost:4000/api/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: input }),
    });
    setInput("");
  };

  const sendFile = async () => {
    await fetch("http://localhost:4000/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: input }),
    })
  }

  return (
    <div>
      <h1>Chat REST → WebSocket</h1>
      <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Escribe un mensaje" />
      <button onClick={sendMessage}>Enviar</button>
      <div>
        {messages.map((msg, i) => (
          <p key={i}>{msg}</p>
        ))}
      </div>

      <h1>Archivos</h1>
      <form 
      id='uploadForm' 
      action={sendFile}
      method='post' 
      encType="multipart/form-data">
        <input type="file" name="file" />
        <input type='submit' value='Upload!' />
    </form> 
    </div>
  );
};

export default App;
