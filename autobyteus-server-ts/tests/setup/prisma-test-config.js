import fs from "node:fs";
import path from "node:path";
export const getTestDatabasePath = () => {
    const dir = path.resolve(process.cwd(), "tests", ".tmp");
    fs.mkdirSync(dir, { recursive: true });
    return path.join(dir, "autobyteus-server-test.db");
};
export const getTestDatabaseUrl = () => `file:${getTestDatabasePath()}`;
