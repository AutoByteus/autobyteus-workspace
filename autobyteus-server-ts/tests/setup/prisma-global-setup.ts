import { execSync } from "node:child_process";
import fs from "node:fs";
import { getTestDatabasePath, getTestDatabaseUrl } from "./prisma-test-config.js";

export default async (): Promise<void> => {
  const databasePath = getTestDatabasePath();
  // Prisma migrate reset expects the SQLite file to exist in this environment.
  fs.closeSync(fs.openSync(databasePath, "a"));
  const databaseUrl = getTestDatabaseUrl();
  execSync("./node_modules/.bin/prisma migrate reset --force --skip-generate", {
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
    },
  });
};
