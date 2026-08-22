import { config as loadEnvironment } from "dotenv";
import { loadConfig } from "./config.js";
import { SessionStore } from "./core/SessionStore.js";
import { XatClient } from "./core/XatClient.js";
import { DiscordBridge } from "./discord/DiscordBridge.js";

loadEnvironment();

let xatClient = null;
let discordBridge = null;

try {
    const config = loadConfig();
    const sessionStore = new SessionStore();
    discordBridge = new DiscordBridge(config.discord);
    xatClient = new XatClient(config, sessionStore);

    xatClient.on("message", (message) => {
        discordBridge.relayXatMessage(message);
    });

    const shutdown = (signal) => {
        console.log(`[xat] Encerrando após ${signal}.`);
        xatClient.stop();
        discordBridge.stop();
    };

    process.once("SIGINT", () => shutdown("SIGINT"));
    process.once("SIGTERM", () => shutdown("SIGTERM"));

    await discordBridge.start();
    await xatClient.start();
} catch (error) {
    xatClient?.stop();
    discordBridge?.stop();
    console.error(`[xat] Falha ao iniciar: ${error.message}`);
    process.exitCode = 1;
}
