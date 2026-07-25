import { useState, useEffect, useRef } from 'react';

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [connected, setConnected] = useState(false);
  const wsRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const ws = new WebSocket(`ws://${window.location.hostname}:8081`);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === 'chat') {
        setMessages(prev => [...prev, {
          user: data.username,
          text: data.message,
          time: new Date(data.timestamp).toLocaleTimeString()
        }]);
      }
    };

    return () => ws.close();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendCommand = (cmd) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'command', command: cmd }));
    }
  };

  return (
    <div className="page">
      <h1>Chat</h1>
      
      <div className="card chat-container">
        <div className="chat-status">
          <span className={`dot ${connected ? 'green' : 'red'}`} />
          {connected ? 'Connected' : 'Disconnected'}
        </div>
        
        <div className="messages">
          {messages.map((msg, i) => (
            <div key={i} className="message">
              <span className="time">{msg.time}</span>
              <span className="user">{msg.user}:</span>
              <span className="text">{msg.text}</span>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        
        <div className="chat-commands">
          <button onClick={() => sendCommand('!list')}>!list</button>
          <button onClick={() => sendCommand('!help')}>!help</button>
        </div>
      </div>
    </div>
  );
}