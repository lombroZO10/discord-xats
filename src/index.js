import { config as loadEnvironment } from "dotenv";
import { loadConfig } from "./config.js";
import { SessionStore } from "./core/SessionStore.js";
import { XatClient } from "./core/XatClient.js";

loadEnvironment();

try {
    const config = loadConfig();
    const sessionStore = new SessionStore();
    const client = new XatClient(config, sessionStore);

    const shutdown = (signal) => {
        console.log(`[xat] Encerrando após ${signal}.`);
        client.stop();
    };

    process.once("SIGINT", () => shutdown("SIGINT"));
    process.once("SIGTERM", () => shutdown("SIGTERM"));

    await client.start();
} catch (error) {
    console.error(`[xat] Falha ao iniciar: ${error.message}`);
    process.exitCode = 1;
}
