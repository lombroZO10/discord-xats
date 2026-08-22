import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

export class SessionStore {
    constructor(filePath = resolve("cache", "login.json")) {
        this.filePath = filePath;
    }

    async load() {
        try {
            const session = JSON.parse(await readFile(this.filePath, "utf8"));
            return session?.i ? session : null;
        } catch (error) {
            if (error.code === "ENOENT" || error instanceof SyntaxError) return null;
            throw error;
        }
    }

    async save(session) {
        await mkdir(dirname(this.filePath), { recursive: true });

        const temporaryPath = `${this.filePath}.tmp`;
        await writeFile(temporaryPath, JSON.stringify(session), {
            encoding: "utf8",
            mode: 0o600
        });
        await rename(temporaryPath, this.filePath);
    }

    async clear() {
        try {
            await unlink(this.filePath);
        } catch (error) {
            if (error.code !== "ENOENT") throw error;
        }
    }
}
