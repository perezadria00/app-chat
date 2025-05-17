import React from "react";

interface Props {
  logs: string[];
}

const ChangeLog: React.FC<Props> = ({ logs }) => {
  const formatLog = (log: string) => {
    const time = new Date().toLocaleTimeString();
    return `${time} - ${log}`;
  };

  return (
    <div className="changelog">
      <h4>📋 Registro de cambios</h4>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {logs.slice(-10).reverse().map((log, index) => (
          <li key={index}>{formatLog(log)}</li>
        ))}
      </ul>
    </div>
  );
};

export default ChangeLog;
