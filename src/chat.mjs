export default {
    async fetch(request, env) {
        try {
            return await handleRequest(request, env);
        } catch (e) {
            return new Response(e.message, { status: 500 });
        }
    },
};

async function handleRequest(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.split('/').filter(Boolean);
    if (path.length === 0 || path[0] === 'chat.html') {
        return new Response(await env.ASSETS.fetch(request), {
            headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });
    }
    if (path[0] === 'chat' && path[1]) {
        const id = env.ChatRoom.idFromName(path[1]);
        const obj = env.ChatRoom.get(id);
        return obj.fetch(request);
    }
    return new Response('Not Found', { status: 404 });
}

export class ChatRoom {
    constructor(state, env) {
        this.state = state;
        this.env = env;
        this.users = new Map(); // socket => username
    }

    async fetch(request) {
        const upgrade = request.headers.get('Upgrade');
        if (!upgrade || upgrade !== 'websocket') {
            return new Response('Expected WebSocket', { status: 426 });
        }
        const url = new URL(request.url);
        const username = url.searchParams.get('username') || '匿名用户';
        const [client, server] = Object.values(new WebSocketPair());
        server.accept();

        // 加入
        this.users.set(server, username);
        this.broadcastOnline();

        // 消息
        server.addEventListener('message', e => {
            try {
                const data = JSON.parse(e.data);
                this.broadcast({
                    type: 'message',
                    username,
                    text: data.text,
                    timestamp: new Date().toISOString()
                });
            } catch {}
        });

        // 关闭
        server.addEventListener('close', () => {
            this.users.delete(server);
            this.broadcastOnline();
        });

        return new Response(null, { status: 101, webSocket: client });
    }

    broadcastOnline() {
        const users = Array.from(this.users.values());
        this.broadcast({ type: 'online', users });
    }

    broadcast(msg) {
        const str = JSON.stringify(msg);
        for (const sock of this.users.keys()) {
            try { sock.send(str); } catch {}
        }
    }
}