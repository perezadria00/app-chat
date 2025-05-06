import React from "react";

interface ChatProps {
  user: {
    id: string;
    nombre: string;
    email: string;
  };
  messages: string[];
  input: string;
  setInput: React.Dispatch<React.SetStateAction<string>>;
  sendMessage: () => Promise<void>;
}

const Chat: React.FC<ChatProps> = ({ user, messages, input, setInput, sendMessage }) => {
  return (
    <div style={{ marginTop: "2rem", borderTop: "1px solid #ccc", paddingTop: "1rem" }}>
      <h1>Chat REST → WebSocket</h1>
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Escribe un mensaje"
        disabled={!user}
        style={{
          padding: "0.5rem",
          width: "70%",
          color: "black", // color del texto del input
        }}
      />
      <button
        onClick={sendMessage}
        disabled={!user}
        style={{ marginLeft: "1rem", padding: "0.5rem 1rem" }}
      >
        Enviar
      </button>
      <div
        style={{
          marginTop: "1rem",
          maxHeight: "200px",
          overflowY: "auto",
          background: "#ffffff", // fondo blanco
          color: "#000000", // texto negro
          padding: "1rem",
          border: "1px solid #ccc",
          borderRadius: "4px",
        }}
      >
        {messages.map((msg, i) => (
          <p key={i} style={{ margin: "0.25rem 0" }}>
            {msg}
          </p>
        ))}
      </div>
    </div>
  );
};

export default Chat;
