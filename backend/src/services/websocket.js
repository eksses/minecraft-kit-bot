import { WebSocketServer, WebSocket } from 'ws';

export function wsHandler(wss, botService) {
  const clients = new Set();
  
  wss.on('connection', (ws) => {
    ws.isAlive = true;
    clients.add(ws);
    
    ws.on('pong', () => { ws.isAlive = true; });
    
    ws.on('message', (data) => {
      try {
        const message = data.toString();
        if (botService.getBot() && botService.getBot().chat) {
          botService.getBot().chat(message);
        }
      } catch (error) {
        console.error('WS message error:', error);
      }
    });
    
    ws.on('close', () => {
      clients.delete(ws);
    });
    
    ws.on('error', (error) => {
      console.error('WS error:', error);
      clients.delete(ws);
    });
  });
  
  // Heartbeat
  const interval = setInterval(() => {
    for (const ws of clients) {
      if (!ws.isAlive) {
        clients.delete(ws);
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    }
  }, 30000);
  
  wss.on('close', () => clearInterval(interval));
  
  // Forward bot chat to all clients
  botService.on('chat', (data) => {
    const message = JSON.stringify(data);
    for (const ws of clients) {
      if (ws.readyState === 1) ws.send(message);
    }
  });
  
  botService.on('whisper', (data) => {
    const message = JSON.stringify({ type: 'whisper', ...data });
    for (const ws of clients) {
      if (ws.readyState === 1) ws.send(message);
    }
  });
  
  botService.on('error', (error) => {
    const message = JSON.stringify({ type: 'error', message: error.message });
    for (const ws of clients) {
      if (ws.readyState === 1) ws.send(message);
    }
  });
}