import React from "react";

interface ChangeLogProps {
  logs: string[];
}

const ChangeLog: React.FC<ChangeLogProps> = ({ logs }) => {
  return (
    <div className="change-log">
      <h4>📜 Registro de cambios</h4>
      <div className="log-list">
        {logs.length > 0 ? (
          logs.map((log, i) => (
            <div key={i} className="log-entry">{log}</div>
          ))
        ) : (
          <p className="log-empty">Sin cambios aún.</p>
        )}
      </div>
    </div>
  );
};

export default ChangeLog;
