import { EventEmitter } from "node:events";
import { WebSocket } from "ws";
import { buildPacket, parsePackets } from "../protocol/xml.js";

const TRANSIENT_LOGOUT_ERRORS = new Set(["e03", "e16", "f011", "e43"]);

export class XatClient extends EventEmitter {
    constructor(config, sessionStore) {
        super();

        this.config = config;
        this.sessionStore = sessionStore;

        this.session = null;
        this.socket = null;
        this.authenticating = false;
        this.ready = false;
        this.stopped = false;

        this.reconnectAttempt = 0;
        this.reconnectTimer = null;
        this.requestedReconnectDelay = null;
        this.keepaliveTimers = [];
        this.packetQueue = Promise.resolve();
        this.users = new Map();
    }

    async start() {
        this.session = await this.sessionStore.load();
        this.authenticating = !this.session;
        this.connect();
    }

    connect() {
        if (this.stopped || this.reconnectTimer) return;
        if (
            this.socket?.readyState === WebSocket.OPEN ||
            this.socket?.readyState === WebSocket.CONNECTING
        ) return;

        const room = this.authenticating ? 3 : this.config.chatId;
        const userId = this.session?.i || 2;

        console.log(this.authenticating
            ? "[xat] Conectando para autenticar."
            : `[xat] Conectando ao chat ${this.config.chatId}.`
        );

        const socket = new WebSocket(this.config.websocketUrl, {
            headers: {
                Origin: this.config.websocketOrigin,
                "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36"
            }
        });

        this.socket = socket;

        socket.on("open", () => {
            this.send("y", { r: room, v: 0, u: userId });
        });

        socket.on("message", (data) => {
            this.packetQueue = this.packetQueue
                .then(() => this.handleMessage(data.toString()))
                .catch((error) => {
                    console.error(`[xat] Erro ao processar pacote: ${error.message}`);
                    this.restart();
                });
        });

        socket.on("close", () => {
            const wasReady = this.ready;
            if (this.socket === socket) this.socket = null;
            this.ready = false;
            this.clearKeepalive();

            if (wasReady) this.emit("disconnected");

            if (this.stopped) return;

            const requestedDelay = this.requestedReconnectDelay;
            this.requestedReconnectDelay = null;
            this.scheduleReconnect(requestedDelay);
        });

        socket.on("error", (error) => {
            console.error(`[xat] Erro de WebSocket: ${error.message}`);
            socket.terminate();
        });
    }

    async handleMessage(data) {
        for (const [type, packet] of parsePackets(data)) {
            await this.handlePacket(type.toLowerCase(), packet);
        }
    }

    async handlePacket(type, packet) {
        switch (type) {
            case "y":
                await this.handleHandshake(packet);
                break;
            case "v":
                await this.handleLogin(packet);
                break;
            case "done":
                this.handleReady();
                break;
            case "idle":
                console.warn("[xat] Conexão encerrada por inatividade.");
                this.restart(0);
                break;
            case "dup":
                console.error("[xat] Outra conexão está usando esta conta. Cliente parado.");
                this.stop();
                break;
            case "logout":
                await this.handleLogout(packet);
                break;
            case "c":
                this.handleChatControl(packet);
                break;
            case "a":
                this.handleAccountEvent(packet);
                break;
            case "u":
                this.handleUserJoined(packet);
                break;
            case "l":
                this.handleUserLeft(packet);
                break;
            case "m":
                this.handleChatMessage(packet);
                break;
            default:
                break;
        }
    }

    async handleHandshake(packet) {
        if (!packet.i) {
            throw new Error("Handshake recebido sem identificador de conexão.");
        }

        if (this.authenticating) {
            this.send("v", {
                n: this.config.username,
                a: this.config.apiKey
            });
            return;
        }

        if (!this.session?.k1) {
            await this.sessionStore.clear();
            this.session = null;
            this.authenticating = true;
            this.restart(0);
            return;
        }

        this.send("j2", this.buildJoinPacket(packet));
    }

    async handleLogin(packet) {
        if (packet.e) {
            console.error(`[xat] Login recusado com código ${packet.e}.`);
            await this.sessionStore.clear();
            this.session = null;
            this.authenticating = true;
            this.restart();
            return;
        }

        if (!packet.n || !packet.i || !packet.k1) return;

        await this.sessionStore.save(packet);
        this.session = packet;
        this.authenticating = false;
        console.log("[xat] Sessão autenticada e salva.");
        this.restart(0);
    }

    handleReady() {
        this.ready = true;
        this.reconnectAttempt = 0;
        this.startKeepalive();
        console.log(`[xat] Conectado ao chat ${this.config.chatId}.`);
        this.emit("connected", { chatId: this.config.chatId });
    }

    async handleLogout(packet) {
        const error = packet.e?.toLowerCase();

        if (error === "e45") {
            console.error("[xat] Conta temporariamente banida. Cliente parado.");
            this.stop();
            return;
        }

        if (error && TRANSIENT_LOGOUT_ERRORS.has(error)) {
            this.restart();
            return;
        }

        console.warn(`[xat] Sessão encerrada${error ? ` (${error})` : ""}; autenticando novamente.`);
        await this.sessionStore.clear();
        this.session = null;
        this.authenticating = true;
        this.restart();
    }

    handleChatControl(packet) {
        const action = packet.t?.slice(0, 2);
        if (
            ["/u", "/k", "/g"].includes(action) &&
            String(packet.d) === String(this.session?.i)
        ) {
            this.restart();
        }
    }

    handleAccountEvent(packet) {
        if (packet.k === "T" && this.session?.i) {
            this.send("v", { n: this.session.i, p: 0 });
        }
    }

    handleUserJoined(packet) {
        const userId = this.normalizeUserId(packet.u);
        if (!userId || Number(userId) >= 1_900_000_000) return;

        this.users.set(userId, {
            id: userId,
            regname: packet.N || null,
            nickname: this.cleanNickname(packet.n)
        });
    }

    handleUserLeft(packet) {
        const userId = this.normalizeUserId(packet.u);
        if (userId) this.users.delete(userId);
    }

    handleChatMessage(packet) {
        const text = packet.t?.trim();
        if (!text || packet.s === "1" || text.startsWith("/")) return;

        const userId = this.normalizeUserId(packet.u);
        if (!userId) return;

        const user = this.users.get(userId);
        this.emit("message", {
            userId,
            regname: user?.regname || null,
            nickname: user?.nickname || null,
            text
        });
    }

    normalizeUserId(value) {
        if (value === null || value === undefined) return null;
        return String(value).split("_", 1)[0] || null;
    }

    cleanNickname(value) {
        if (!value) return null;
        return value
            .split("##", 1)[0]
            .replace(/\(glow[^)]*\)|\(hat[^)]*\)/gi, "")
            .trim() || null;
    }

    buildJoinPacket(handshake) {
        const packet = {
            cb: handshake.c,
            Y: 2,
            l5: 65535,
            l4: 500,
            l3: 500,
            l2: 0,
            y: handshake.i,
            k: this.session.k1,
            k3: this.session.k3,
            d1: this.session.d1 || false,
            z: "m1.67,3",
            p: 0,
            c: this.config.chatId,
            f: 0,
            u: this.session.i,
            d0: this.session.d0 || false,
            dO: this.session.dO || false,
            dx: this.session.dx || false,
            dt: this.session.dt || false,
            N: this.session.n,
            n: `${this.config.profile.nick}##${this.config.profile.status}`,
            a: this.config.profile.pcback
                ? `${this.config.profile.avatar}#${this.config.profile.pcback}`
                : this.config.profile.avatar,
            h: this.config.profile.home || false,
            v: this.session.d1 ? 1 : 0
        };

        for (let index = 2; index <= 35; index += 1) {
            const key = `d${index}`;
            if (this.session[key]) packet[key] = this.session[key];
        }

        return packet;
    }

    send(name, attributes = {}) {
        if (this.socket?.readyState !== WebSocket.OPEN) return false;
        this.socket.send(`${buildPacket(name, attributes)}\x00`);
        return true;
    }

    startKeepalive() {
        this.clearKeepalive();

        this.keepaliveTimers.push(
            setInterval(() => {
                if (this.socket?.readyState === WebSocket.OPEN) this.socket.ping();
            }, 30_000),
            setInterval(() => this.send("ping"), 60_000),
            setInterval(() => {
                if (this.ready && this.session?.i) {
                    this.send("c", { u: this.session.i, t: "/KEEPALIVE" });
                }
            }, 900_000)
        );
    }

    clearKeepalive() {
        for (const timer of this.keepaliveTimers) clearInterval(timer);
        this.keepaliveTimers = [];
    }

    restart(delay = null) {
        if (this.stopped) return;

        this.ready = false;
        this.clearKeepalive();
        this.requestedReconnectDelay = delay;

        if (this.socket) {
            this.socket.terminate();
        } else {
            this.requestedReconnectDelay = null;
            this.scheduleReconnect(delay);
        }
    }

    scheduleReconnect(delay = null) {
        if (this.stopped || this.reconnectTimer) return;

        const waitMs = delay ?? Math.min(
            1_000 * (2 ** this.reconnectAttempt),
            this.config.reconnectMaxMs
        );

        if (delay === null) this.reconnectAttempt += 1;

        console.log(`[xat] Nova tentativa em ${waitMs} ms.`);
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.connect();
        }, waitMs);
    }

    stop() {
        if (this.stopped) return;
        this.stopped = true;
        this.ready = false;
        this.clearKeepalive();

        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        this.socket?.terminate();
        this.socket = null;
        this.users.clear();
    }
}
