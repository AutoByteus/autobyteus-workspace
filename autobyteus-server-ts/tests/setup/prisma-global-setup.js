import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { getTestDatabasePath, getTestDatabaseUrl } from "./prisma-test-config.js";
export default async () => {
    const databasePath = getTestDatabasePath();
    // Prisma migrate reset expects the SQLite file to exist in this environment.
    fs.closeSync(fs.openSync(databasePath, "a"));
    const databaseUrl = getTestDatabaseUrl();
    const prismaCli = path.join(process.cwd(), "node_modules", "prisma", "build", "index.js");
    execFileSync(process.execPath, [prismaCli, "migrate", "reset", "--force", "--skip-generate"], {
        stdio: "inherit",
        env: {
            ...process.env,
            DATABASE_URL: databaseUrl,
        },
    });
};
