const required = (name) => {
    const value = process.env[name]?.trim();
    if (!value) throw new Error(`A variável ${name} é obrigatória.`);
    return value;
};

const positiveInteger = (name, value) => {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isSafeInteger(parsed) || parsed <= 0) {
        throw new Error(`A variável ${name} deve ser um número inteiro positivo.`);
    }
    return parsed;
};

const validUrl = (name, value, protocol) => {
    let parsed;
    try {
        parsed = new URL(value);
    } catch {
        throw new Error(`A variável ${name} deve conter uma URL válida.`);
    }

    if (protocol && parsed.protocol !== protocol) {
        throw new Error(`A variável ${name} deve usar o protocolo ${protocol}`);
    }

    return parsed.toString();
};

const snowflake = (name, value) => {
    if (!/^\d{17,20}$/.test(value)) {
        throw new Error(`A variável ${name} deve conter um ID válido do Discord.`);
    }
    return value;
};

export const loadConfig = () => {
    const reconnectMaxMs = positiveInteger(
        "BOT_RECONNECT_MAX_MS",
        process.env.BOT_RECONNECT_MAX_MS || "30000"
    );

    return {
        username: required("BOT_USER"),
        apiKey: required("BOT_APIKEY"),
        chatId: positiveInteger("BOT_CHAT_ID", required("BOT_CHAT_ID")),
        websocketUrl: validUrl(
            "WEBSOCKET_URL",
            process.env.WEBSOCKET_URL || "wss://bots.xat.com/v2",
            "wss:"
        ),
        websocketOrigin: validUrl(
            "WEBSOCKET_ORIGIN",
            process.env.WEBSOCKET_ORIGIN || "https://xat.com",
            "https:"
        ),
        reconnectMaxMs,
        sessionFile: process.env.BOT_SESSION_FILE?.trim() || undefined,
        discord: {
            token: required("DISCORD_BOT_TOKEN"),
            channelId: snowflake(
                "DISCORD_CHANNEL_ID",
                required("DISCORD_CHANNEL_ID")
            ),
            activity: process.env.DISCORD_ACTIVITY?.trim() || "xat.com"
        },
        profile: {
            nick: process.env.BOT_NICK?.trim() || "Bot",
            status: process.env.BOT_STATUS?.trim() || "",
            avatar: process.env.BOT_AVATAR?.trim() || "171",
            home: process.env.BOT_HOME?.trim() || "",
            pcback: process.env.BOT_PCBACK?.trim() || ""
        }
    };
};
