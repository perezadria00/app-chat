import React, { useState } from "react";

interface Props {
  onLogin: (user: { id: string; nombre: string; email: string }) => void;
}

const Login: React.FC<Props> = ({ onLogin }) => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async () => {
    setError("");
    if (!email) {
      setError("Introduce un email");
      return;
    }

    try {
      const res = await fetch("http://localhost:4000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Error al iniciar sesión");
        return;
      }

      onLogin(data.user);
    } catch (err) {
      console.error(err);
      setError("Error de conexión con el servidor");
    }
  };

  return (
    <div className="login-container">
      <h2 className="login-title">🔐 Iniciar sesión</h2>
      <input
        type="email"
        placeholder="Email del usuario"
        className="login-input"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <button onClick={handleLogin} className="login-button">Entrar</button>
      {error && <p className="login-error">{error}</p>}
    </div>
  );
};

export default Login;
