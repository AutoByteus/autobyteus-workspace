import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { appConfigProvider } from "../../src/config/app-config-provider.js";

type EnvironmentKey =
  | "DATABASE_URL"
  | "DATABASE_URL_TEST"
  | "APP_ENV"
  | "DB_TYPE"
  | "AUTOBYTEUS_SERVER_HOST"
  | "AUTOBYTEUS_MEMORY_DIR"
  | "AUTOBYTEUS_LOG_DIR"
  | "LOG_LEVEL";

const ENVIRONMENT_KEYS: readonly EnvironmentKey[] = [
  "DATABASE_URL",
  "DATABASE_URL_TEST",
  "APP_ENV",
  "DB_TYPE",
  "AUTOBYTEUS_SERVER_HOST",
  "AUTOBYTEUS_MEMORY_DIR",
  "AUTOBYTEUS_LOG_DIR",
  "LOG_LEVEL",
];

export type TestAppConfigHandle = {
  appDataDir: string;
  cleanup: () => void;
};

/**
 * Initialize AppConfig for direct GraphQL/ledger tests that use the configured
 * Prisma client. The global Prisma setup owns the test database URL; this
 * helper supplies the missing AppConfig state without changing that database.
 */
export const initializeTestAppConfig = (): TestAppConfigHandle => {
  const originalEnvironment = new Map<EnvironmentKey, string | undefined>(
    ENVIRONMENT_KEYS.map((key) => [key, process.env[key]]),
  );
  const appDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "autobyteus-e2e-app-config-"));
  const databaseUrl = process.env.DATABASE_URL ?? "";

  fs.writeFileSync(
    path.join(appDataDir, ".env"),
    [
      "AUTOBYTEUS_SERVER_HOST=http://127.0.0.1:8000",
      "APP_ENV=test",
      "DB_TYPE=sqlite",
      `DATABASE_URL=${databaseUrl}`,
    ].join("\n") + "\n",
    "utf8",
  );

  process.env.AUTOBYTEUS_SERVER_HOST = "http://127.0.0.1:8000";
  process.env.APP_ENV = "test";
  process.env.DB_TYPE = "sqlite";
  appConfigProvider.resetForTests();
  const config = appConfigProvider.initialize({ appDataDir });
  config.initialize();

  return {
    appDataDir,
    cleanup: () => {
      appConfigProvider.resetForTests();
      for (const key of ENVIRONMENT_KEYS) {
        const value = originalEnvironment.get(key);
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
      fs.rmSync(appDataDir, { recursive: true, force: true });
    },
  };
};
