import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export type ApplicationDatabaseLocation = Readonly<{
  databaseUrl: string;
  databasePath: string;
  rootKeyPath: string;
}>;

export class ApplicationDatabaseLocationError extends Error {
  constructor() {
    super("DATABASE_URL must be a non-empty SQLite file URL.");
    this.name = "ApplicationDatabaseLocationError";
  }
}

const decodeConfiguredPath = (databaseUrl: string): string => {
  const value = databaseUrl.trim();
  if (!value.startsWith("file:") || value.length === "file:".length) {
    throw new ApplicationDatabaseLocationError();
  }

  const configuredPath = value.slice("file:".length);
  if (!configuredPath || configuredPath.includes("?") || configuredPath.includes("#")) {
    throw new ApplicationDatabaseLocationError();
  }

  if (configuredPath.startsWith("//")) {
    try {
      return fileURLToPath(value);
    } catch {
      throw new ApplicationDatabaseLocationError();
    }
  }
  return configuredPath;
};

export const resolveApplicationDatabaseLocation = (
  databaseUrl: string,
  appRootDir: string,
): ApplicationDatabaseLocation => {
  const configuredPath = decodeConfiguredPath(databaseUrl);
  const databasePath = path.resolve(appRootDir, configuredPath);
  const canonicalDatabaseUrl = pathToFileURL(databasePath).href;
  return Object.freeze({
    databaseUrl: canonicalDatabaseUrl,
    databasePath,
    rootKeyPath: `${databasePath}.secret.key`,
  });
};
