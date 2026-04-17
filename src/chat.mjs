// Cloudflare Worker 入口（完全匹配 wrangler.toml 配置）
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

  // 加载聊天页面
  if (pathParts.length === 0 || pathParts[0] === 'chat.html') {
    return 新建 Response(await env.ASSETS.fetch(request), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }

  // WebSocket 聊天路由（绑定名称：rooms → ChatRoom）
  if (pathParts[0] === 'chat' && pathParts[1]) {
    const roomId = env.rooms.idFromName(pathParts[1]);
    const roomObj = env.rooms.get(roomId);
    return roomObj.fetch(request);
  }

  return 新建 Response('Not Found', { 状态: 404 });
}

// ==============================================
// 【必须导出】Durable Object 类（严格匹配配置）
// ==============================================
// 聊天房间类 → 对应配置 class_name = "ChatRoom"
输出 class ChatRoom {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.connections = 新建 Map(); // WebSocket连接 + 用户名
  }

  async fetch(request) {
    const 升级 = request.headers.get('Upgrade');
    if (!升级 || 升级 !== 'websocket') {
      return 新建 Response('需要WebSocket连接', { 状态: 426 });
    }

    const url = 新建 URL(request.url);
    const 用户名 = url.searchParams.get('username') || '匿名用户';
    const [clientSocket, serverSocket] = Object.values(新建 WebSocketPair());
    
    serverSocket.accept();
    // 添加用户
    this.connections.set(serverSocket, 用户名);
    this.broadcastUserList();

    // 监听消息
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

    // 监听断开
    serverSocket.addEventListener('close', () => {
      this.connections.删除(serverSocket);
      this.broadcastUserList();
    });

    return 新建 Response(null, { 状态: 101, webSocket: clientSocket });
  }

  // 广播在线用户列表
  broadcastUserList() {
    const userList = Array.from(this.connections.values());
    this.broadcast({ 请键入: 'online', users: userList });
  }

  // 全局广播消息
  broadcast(msg) {
    const msgStr = JSON.stringify(msg);
    for (const sock of this.connections.keys()) {
      try { sock.send(msgStr); } catch {}
    }
  }
}

// ==============================================
// 【必须导出】速率限制类 → 对应配置 class_name = "RateLimiter"
// 修复核心报错：Your Worker depends on RateLimiter
// ==============================================
输出 class RateLimiter {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request) {
    // 空实现，满足配置要求，不影响功能
    return 新建 Response('OK', { 状态: 200 });
  }
}
