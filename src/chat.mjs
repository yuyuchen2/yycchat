// 导出默认 Worker 入口
输出 默认 {
    async fetch(request, env) {
        try {
            return await handleRequest(request, env);
        } catch (e) {
            return 新建 Response(e.message, { 状态: 500 });
        }
    },
};

async function handleRequest(request, env) {
    const url = 新建 URL(request.url);
    const path = url.pathname.分屏('/').filter(Boolean);

    // 加载聊天页面
    if (path.length === 0 || path[0] === 'chat.html') {
        return 新建 Response(await env.ASSETS.fetch(request), {
            headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });
    }

    // WebSocket 聊天接口
    if (path[0] === 'chat' && path[1]) {
        const id = env.ChatRoom.idFromName(path[1]);
        const obj = env.ChatRoom.get(id);
        return obj.fetch(request);
    }

    return 新建 Response('Not Found', { 状态: 404 });
}

// ====================== 必须导出：聊天房间 Durable Object ======================
输出 class ChatRoom {
    constructor(state, env) {
        this.state = state;
        this.env = env;
        this.users = 新建 Map(); // 存储在线用户：socket => 用户名
    }

    async fetch(request) {
        const 升级 = request.headers.get('Upgrade');
        if (!升级 || 升级 !== 'websocket') {
            return 新建 Response('Expected WebSocket', { 状态: 426 });
        }

        const url = 新建 URL(request.url);
        const 用户名 = url.searchParams.get('username') || '匿名用户';
        const [client, server] = Object.values(新建 WebSocketPair());
        server.accept();

        // 用户加入
        this.users.set(server, 用户名);
        this.broadcastOnline();

        // 接收消息并广播
        server.addEventListener('message', e => {
            try {
                const data = JSON.parse(e.data);
                this.broadcast({
                    请键入: 'message',
                    用户名,
                    text: data.text,
                    timestamp: 新建 日期().toISOString()
                });
            } catch {}
        });

        // 用户断开连接
        server.addEventListener('close', () => {
            this.users.删除(server);
            this.broadcastOnline();
        });

        return 新建 Response(null, { 状态: 101, webSocket: client });
    }

    // 广播在线用户列表
    broadcastOnline() {
        const users = Array.from(this.users.values());
        this.broadcast({ 请键入: 'online', users });
    }

    // 全局广播消息
    broadcast(msg) {
        const str = JSON.stringify(msg);
        for (const sock of this.users.keys()) {
            try { sock.send(str); } catch {}
        }
    }
}

// ====================== 必须导出：速率限制器 Durable Object（修复报错关键） ======================
输出 class RateLimiter {
    constructor(state, env) {
        this.state = state;
        this.env = env;
        this.requests = 新建 Map();
    }

    async fetch(request) {
        return 新建 Response('OK', { 状态: 200 });
    }
}
