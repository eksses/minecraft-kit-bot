import { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [connected, setConnected] = useState(false);
  const [ws, setWs] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    connectWebSocket();
    return () => { if (ws) ws.close(); };
  }, []);

  useEffect(() => {
    if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const connectWebSocket = () => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    const socket = new WebSocket(`${protocol}//${host}:8081`);

    socket.onopen = () => setConnected(true);
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'chat') {
          setMessages(prev => [...prev, {
            id: Date.now(),
            username: data.username,
            message: data.message,
            timestamp: data.timestamp,
          }]);
        }
      } catch (err) { /* ignore */ }
    };
    socket.onclose = () => {
      setConnected(false);
      setTimeout(connectWebSocket, 3000);
    };
    setWs(socket);
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || !connected) return;
    try {
      await api.fleet.sendBotCommand(null, `/say ${input}`);
      setInput('');
    } catch (err) { /* ignore */ }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Chat</h1>
          <p className="page-subtitle">Real-time bot communication</p>
        </div>
        <span className="status-badge">
          <span className="status-dot" style={{background: connected ? 'var(--status-online)' : 'var(--status-offline)'}}></span>
          <span>{connected ? 'Connected' : 'Disconnected'}</span>
        </span>
      </div>

      <div className="chat-container">
        <div className="chat-messages">
          {messages.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-title">No messages yet</div>
              <div className="empty-state-text">Send a command to start chatting</div>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className="chat-msg">
                <span className="chat-msg-user">{msg.username}:</span>
                <span className="chat-msg-text">{msg.message}</span>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={sendMessage} className="chat-input-bar">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a command..."
            disabled={!connected}
            className="chat-input"
          />
          <button type="submit" className="btn btn-primary" disabled={!connected || !input.trim()}>Send</button>
        </form>
      </div>
    </div>
  );
}
