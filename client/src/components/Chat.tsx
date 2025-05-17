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
  const getHora = () => {
    const ahora = new Date();
    return ahora.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="chat-box">
      <h1 className="chat-title">Chat</h1>

      <div className="chat-messages">
        {messages.map((msg, i) => (
          <div key={i} className="chat-message">
            {msg}
          </div>
        ))}
      </div>

      <div className="chat-controls">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escribe un mensaje"
          disabled={!user}
          className="chat-input"
        />
        <button onClick={sendMessage} disabled={!user} className="button">
          Enviar
        </button>
      </div>
    </div>
  );
};

export default Chat;