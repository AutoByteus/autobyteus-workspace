import path from "node:path";
import { fileURLToPath } from "node:url";

export class ApplicationDatabaseLocationError extends Error {
  constructor() {
    super("DATABASE_URL must be a non-empty SQLite file URL.");
    this.name = "ApplicationDatabaseLocationError";
  }
}

const decodeConfiguredPath = (databaseUrl: string, requireAbsolute: boolean): string => {
  const value = databaseUrl.trim();
  if (!value.startsWith("file:") || value.length === "file:".length) {
    throw new ApplicationDatabaseLocationError();
  }

  const configuredPath = value.slice("file:".length);
  if (!configuredPath || configuredPath.includes("?") || configuredPath.includes("#")) {
    throw new ApplicationDatabaseLocationError();
  }

  const hasAbsoluteUrlPath = configuredPath.startsWith("/") || /^[A-Za-z]:[\\/]/.test(configuredPath);
  if (requireAbsolute && !hasAbsoluteUrlPath) {
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

export const toPrismaSqliteUrl = (databasePath: string): string =>
  `file:${databasePath.replace(/\\/g, "/")}`;

export class ApplicationDatabaseLocation {
  readonly databaseUrl: string;
  readonly databasePath: string;
  readonly rootKeyPath: string;

  private constructor(databasePath: string) {
    this.databasePath = databasePath;
    this.databaseUrl = toPrismaSqliteUrl(databasePath);
    this.rootKeyPath = `${databasePath}.secret.key`;
    Object.freeze(this);
  }

  static fromConfiguredFileUrl(
    databaseUrl: string,
    appRootDir: string,
  ): ApplicationDatabaseLocation {
    const configuredPath = decodeConfiguredPath(databaseUrl, false);
    return new ApplicationDatabaseLocation(path.resolve(appRootDir, configuredPath));
  }

  static fromAbsoluteFileUrl(databaseUrl: string): ApplicationDatabaseLocation {
    const configuredPath = decodeConfiguredPath(databaseUrl, true);
    let databasePath: string;
    try {
      databasePath = configuredPath.startsWith("//")
        ? configuredPath
        : fileURLToPath(databaseUrl.trim());
    } catch {
      throw new ApplicationDatabaseLocationError();
    }
    if (!path.isAbsolute(databasePath) || databasePath.includes("\0")) {
      throw new ApplicationDatabaseLocationError();
    }
    return new ApplicationDatabaseLocation(path.resolve(databasePath));
  }
}
