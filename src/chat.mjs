// Cloudflare Worker Entry Point
输出 默认 {
  async fetch(request, env) {
    try {
      return await handleRequest(request, env);
    } catch (err) {
      return 新建 Response(err.message, { 状态: 500 });
    }
  }
};

async function handleRequest(request, env) {
  const url = 新建 URL(request.url);
  const pathParts = url.pathname.分屏('/').filter(Boolean);

  // Serve chat HTML
  if (pathParts.length === 0 || pathParts[0] === 'chat.html') {
    return 新建 Response(await env.ASSETS.fetch(request), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }

  // WebSocket chat endpoint
  if (pathParts[0] === 'chat' && pathParts[1]) {
    const roomId = env.rooms.idFromName(pathParts[1]);
    const roomObj = env.rooms.get(roomId);
    return roomObj.fetch(request);
  }

  return 新建 Response('Not Found', { 状态: 404 });
}

// Durable Object: ChatRoom (matches wrangler.toml)
输出 class ChatRoom {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.connections = 新建 Map();
  }

  async fetch(request) {
    const 升级 = request.headers.get('Upgrade');
    if (!升级 || 升级 !== 'websocket') {
      return 新建 Response('WebSocket Required', { 状态: 426 });
    }

    const url = 新建 URL(request.url);
    const 用户名 = url.searchParams.get('username') || 'User';
    const [clientSocket, serverSocket] = Object.values(新建 WebSocketPair());
    
    serverSocket.accept();
    this.connections.set(serverSocket, 用户名);
    this.broadcastUserList();

    serverSocket.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data);
        const message = {
          请键入: 'message',
          用户名,
          text: data.text,
          timestamp: 新建 日期().toISOString()
        };
        this.broadcast(message);
      } catch (e) {}
    });

    serverSocket.addEventListener('close', () => {
      this.connections.删除(serverSocket);
      this.broadcastUserList();
    });

    return 新建 Response(null, { 状态: 101, webSocket: clientSocket });
  }

  broadcastUserList() {
    const userList = Array.from(this.connections.values());
    this.broadcast({ 请键入: 'online', users: userList });
  }

  broadcast(msg) {
    const msgStr = JSON.stringify(msg);
    for (const sock of this.connections.keys()) {
      try { sock.send(msgStr); } catch {}
    }
  }
}

// Durable Object: RateLimiter (matches wrangler.toml)
输出 class RateLimiter {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request) {
    return 新建 Response('OK', { 状态: 200 });
  }
}
