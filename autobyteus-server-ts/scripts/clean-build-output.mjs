import fs from "node:fs/promises";
import path from "node:path";

const rootDir = path.resolve(import.meta.dirname, "..");
await fs.rm(path.join(rootDir, "dist"), { recursive: true, force: true });
