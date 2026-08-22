import {
    ActivityType,
    Client,
    Events,
    GatewayIntentBits,
    escapeMarkdown
} from "discord.js";

export class DiscordBridge {
    constructor(config) {
        this.config = config;
        this.channel = null;
        this.queue = Promise.resolve();

        this.client = new Client({
            intents: [GatewayIntentBits.Guilds]
        });

        this.client.on(Events.Error, (error) => {
            console.error(`[discord] Erro do cliente: ${error.message}`);
        });
    }

    async start() {
        const ready = new Promise((resolve) => {
            this.client.once(Events.ClientReady, resolve);
        });

        await this.client.login(this.config.token);
        await ready;

        const channel = await this.client.channels.fetch(this.config.channelId);
        if (!channel?.isSendable()) {
            throw new Error(
                `O canal ${this.config.channelId} não existe ou não permite mensagens.`
            );
        }

        this.channel = channel;
        this.client.user.setPresence({
            activities: [{
                name: this.config.activity,
                type: ActivityType.Watching
            }],
            status: "online"
        });

        console.log(`[discord] Conectado como ${this.client.user.tag}.`);
    }

    relayXatMessage(message) {
        const displayName = message.nickname || message.regname || message.userId;
        const header = `**${escapeMarkdown(displayName)}** \`(${message.userId})\``;
        const availableLength = Math.max(0, 2_000 - header.length - 1);
        const text = message.text.slice(0, availableLength);

        this.queue = this.queue
            .then(() => this.channel?.send({
                content: `${header}\n${text}`,
                allowedMentions: { parse: [] }
            }))
            .catch((error) => {
                console.error(`[discord] Falha ao encaminhar mensagem: ${error.message}`);
            });

        return this.queue;
    }

    stop() {
        this.channel = null;
        this.client.destroy();
    }
}
