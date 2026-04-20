// Debug utility to store logs persistently across page reloads/redirects
const DEBUG_LOG_KEY = '__debug_logs_';

export const addDebugLog = (message, data = null) => {
  const timestamp = new Date().toLocaleTimeString();
  const fullMessage = `[${timestamp}] ${message}`;
  
  // Log to console
  console.log(fullMessage, data || '');
  
  // Store in localStorage for persistence
  try {
    const logs = JSON.parse(localStorage.getItem(DEBUG_LOG_KEY) || '[]');
    logs.push({ message: fullMessage, data, timestamp: Date.now() });
    // Keep only last 50 logs to avoid bloating localStorage
    if (logs.length > 50) logs.shift();
    localStorage.setItem(DEBUG_LOG_KEY, JSON.stringify(logs));
  } catch (e) {
    console.error('Failed to store debug log', e);
  }
};

export const getDebugLogs = () => {
  try {
    return JSON.parse(localStorage.getItem(DEBUG_LOG_KEY) || '[]');
  } catch {
    return [];
  }
};

export const clearDebugLogs = () => {
  localStorage.removeItem(DEBUG_LOG_KEY);
};

// Debug Panel Component
import { useState, useEffect } from 'react';

export const DebugPanel = () => {
  const [logs, setLogs] = useState([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setLogs(getDebugLogs());
    }, 500);
    return () => clearInterval(interval);
  }, []);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 bg-black text-white px-3 py-2 text-xs rounded-lg z-[9999] hover:bg-gray-800"
      >
        🐛 Debug ({logs.length})
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black text-white p-4 rounded-lg z-[9999] max-w-sm max-h-96 overflow-y-auto font-mono text-xs">
      <div className="flex justify-between items-center mb-2">
        <span>Debug Logs</span>
        <button
          onClick={() => {
            setIsOpen(false);
            clearDebugLogs();
            setLogs([]);
          }}
          className="text-red-400 hover:text-red-300"
        >
          ✕
        </button>
      </div>
      <div className="space-y-1">
        {logs.length === 0 ? (
          <div className="text-gray-500">No logs yet...</div>
        ) : (
          logs.map((log, idx) => (
            <div key={idx} className="text-gray-300">
              <div>{log.message}</div>
              {log.data && <div className="text-gray-500 ml-2">{JSON.stringify(log.data).slice(0, 100)}</div>}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
