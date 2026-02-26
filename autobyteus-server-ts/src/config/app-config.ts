import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { getPersistenceProfile, isSqlPersistenceProfile } from "../persistence/profile.js";

export class AppConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AppConfigError";
  }
}

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
  debug: (...args: unknown[]) => console.debug(...args),
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class AppConfig {
  private isWindows: boolean;
  private appRootDir: string;
  private dataDir: string;
  private configFile: string | null = null;
  private configData: Record<string, string> = {};
  private initialized = false;
  private baseUrl: string | null = null;

  constructor() {
    this.isWindows = process.platform === "win32";
    console.info(`Platform detection: Windows=${this.isWindows}`);

    this.appRootDir = this.getAppRootDirInternal();
    console.info(`App root directory: ${this.appRootDir}`);

    this.dataDir = this.appRootDir;
    console.info(`Data directory: ${this.dataDir}`);

    logger.debug("AppConfig instance created.");
  }

  initialize(): void {
    if (this.initialized) {
      console.info("initialize() called more than once. Ignoring.");
      return;
    }

    if (!this.configFile || !fs.existsSync(this.configFile)) {
      try {
        this.configFile = this.getConfigFilePath();
        console.info(`Config file path: ${this.configFile}`);
      } catch (error) {
        const message = `Configuration file not found: ${String(error)}`;
        console.error(`ERROR: ${message}`);
        throw new AppConfigError(message);
      }
    }

    this.loadConfigData();
    this.initializeBaseUrl();

    const profile = getPersistenceProfile();
    if (isSqlPersistenceProfile(profile) && this.get("DB_TYPE", "sqlite") === "sqlite") {
      try {
        this.initSqlitePath();
      } catch (error) {
        const message = `Failed to initialize SQLite path: ${String(error)}`;
        console.error(`ERROR: ${message}`);
        throw new AppConfigError(message);
      }
    }

    try {
      this.initMemoryPath();
    } catch (error) {
      const message = `Failed to initialize memory path: ${String(error)}`;
      console.error(`ERROR: ${message}`);
      throw new AppConfigError(message);
    }

    try {
      this.configureLogger();
    } catch (error) {
      const message = `Failed to configure logging: ${String(error)}`;
        console.error(`ERROR: ${message}`);
        throw new AppConfigError(message);
    }

    this.initialized = true;

    logger.info("=".repeat(60));
    logger.info(`SERVER PUBLIC URL: ${this.getBaseUrl()}`);
    logger.info(`APP ROOT DIRECTORY: ${this.getAppRootDir()}`);
    logger.info(`APP DATA DIRECTORY: ${this.getAppDataDir()}`);
    logger.info(`DB DIRECTORY: ${this.getDbDir()}`);
    logger.info(`LOGS DIRECTORY: ${this.getLogsDir()}`);
    logger.info(`DOWNLOAD DIRECTORY: ${this.getDownloadDir()}`);
    logger.info(`MEMORY DIRECTORY: ${this.getMemoryDir()}`);
    logger.info("=".repeat(60));
    logger.info("AppConfig initialization completed successfully");
  }

  private loadConfigData(): void {
    try {
      this.loadEnvironmentInternal();
    } catch (error) {
      const message = `Failed to load environment variables: ${String(error)}`;
      console.error(`ERROR: ${message}`);
      throw new AppConfigError(message);
    }

    try {
      if (!this.configFile) {
        throw new Error("Config file path not set");
      }
      const contents = fs.readFileSync(this.configFile, "utf-8");
      this.configData = dotenv.parse(contents);
    } catch (error) {
      const message = `Failed to parse configuration file: ${String(error)}`;
      console.error(`ERROR: ${message}`);
      throw new AppConfigError(message);
    }
  }

  private getAppRootDirInternal(): string {
    const preferredCandidates = [
      path.resolve(__dirname, "..", ".."),
      path.resolve(__dirname, "..", "..", ".."),
    ];

    for (const candidate of preferredCandidates) {
      if (this.isValidAppRoot(candidate)) {
        return candidate;
      }
    }

    let current = __dirname;
    while (true) {
      if (this.isValidAppRoot(current)) {
        return current;
      }
      const parent = path.dirname(current);
      if (parent === current) {
        break;
      }
      current = parent;
    }

    return path.resolve(__dirname, "..", "..", "..");
  }

  private isValidAppRoot(candidate: string): boolean {
    const pkgPath = path.join(candidate, "package.json");
    const prismaPath = path.join(candidate, "prisma", "schema.prisma");
    const srcAppPath = path.join(candidate, "src", "app.ts");
    const distAppPath = path.join(candidate, "dist", "app.js");
    return (
      fs.existsSync(pkgPath) &&
      (fs.existsSync(prismaPath) || fs.existsSync(srcAppPath) || fs.existsSync(distAppPath))
    );
  }

  private initSqlitePath(): void {
    const dbPath = this.getSqlitePath();
    const expectedUrl = `file:${dbPath}`;
    if (process.env.DATABASE_URL !== expectedUrl) {
      this.set("DATABASE_URL", expectedUrl);
    }
  }

  private getSqlitePath(): string {
    const dbDir = this.getDbDir();
    const env = this.get("APP_ENV", "production");
    const dbName = env === "test" ? "test.db" : "production.db";
    return path.resolve(dbDir, dbName);
  }

  private configureLogger(): void {
    console.info("=== Starting logging configuration ===");
    const appRoot = this.getAppRootDir();
    const configPath = path.join(appRoot, "logging_config.ini");
    console.info(`Logging config file is ignored in Node.js: ${configPath}`);
    this.getLogsDir();
  }

  private initMemoryPath(): void {
    const memoryDir = this.getMemoryDir();
    if (!this.get("AUTOBYTEUS_MEMORY_DIR")) {
      this.set("AUTOBYTEUS_MEMORY_DIR", memoryDir);
    }
    process.env.AUTOBYTEUS_MEMORY_DIR ??= memoryDir;
  }

  private loadEnvironmentInternal(): void {
    const envPath = this.getConfigFilePath();
    console.info(`Loading environment from: ${envPath}`);
    const result = dotenv.config({ path: envPath });
    if (result.error) {
      const message = `Failed to load environment variables from ${envPath}`;
      console.error(`ERROR: ${message}`);
      throw new Error(message);
    }
    process.env.LOG_LEVEL ??= "INFO";
    console.info("Environment variables loaded successfully");
  }

  private initializeBaseUrl(): void {
    const hostFromEnv = this.get("AUTOBYTEUS_SERVER_HOST");

    if (!hostFromEnv || !hostFromEnv.trim()) {
      const message =
        "CRITICAL: The 'AUTOBYTEUS_SERVER_HOST' environment variable is not set. " +
        "This variable is mandatory and must be provided by the environment that launches the server " +
        "(e.g., Docker Compose, Electron app, or a developer's .env file) to ensure correct " +
        "URL generation for clients. The server cannot start without it.";
      logger.error(message);
      throw new AppConfigError(message);
    }

    if (!hostFromEnv.includes("://")) {
      const message =
        `CRITICAL: The 'AUTOBYTEUS_SERVER_HOST' value '${hostFromEnv}' is invalid. ` +
        "It must be a full, absolute URL including the scheme (e.g., 'http://localhost:8000' " +
        "or 'http://host.docker.internal:8001').";
      logger.error(message);
      throw new AppConfigError(message);
    }

    this.baseUrl = hostFromEnv.trim().replace(/\/+$/, "");
    logger.info(`Server public base URL configured to: ${this.baseUrl}`);
  }

  getBaseUrl(): string {
    if (!this.initialized) {
      throw new AppConfigError("getBaseUrl() cannot be called before AppConfig is initialized.");
    }
    if (!this.baseUrl) {
      throw new AppConfigError("Base URL was not initialized. Check for configuration errors.");
    }
    return this.baseUrl;
  }

  getAppRootDir(): string {
    return this.appRootDir;
  }

  getAppDataDir(): string {
    return this.dataDir;
  }

  getConfigFilePath(): string {
    const configPath = path.join(this.dataDir, ".env");
    if (!fs.existsSync(configPath)) {
      throw new Error(`Configuration file not found: ${configPath}`);
    }
    return configPath;
  }

  getDbDir(): string {
    const dbDir = path.join(this.dataDir, "db");
    fs.mkdirSync(dbDir, { recursive: true });
    return dbDir;
  }

  getLogsDir(): string {
    const logsDir = path.join(this.dataDir, "logs");
    fs.mkdirSync(logsDir, { recursive: true });
    return logsDir;
  }

  getDownloadDir(): string {
    const downloadDir = path.join(this.dataDir, "download");
    fs.mkdirSync(downloadDir, { recursive: true });
    return downloadDir;
  }

  getMemoryDir(): string {
    const memoryDir = path.join(this.dataDir, "memory");
    fs.mkdirSync(memoryDir, { recursive: true });
    return memoryDir;
  }

  getSkillsDir(): string {
    const skillsDir = path.join(this.dataDir, "skills");
    fs.mkdirSync(skillsDir, { recursive: true });
    return skillsDir;
  }

  getTempWorkspaceDir(): string {
    const tempWorkspaceDir = path.join(this.dataDir, "temp_workspace");
    try {
      fs.mkdirSync(tempWorkspaceDir, { recursive: true });
    } catch (error) {
      throw new AppConfigError(`Failed to create temp workspace directory: ${String(error)}`);
    }
    return tempWorkspaceDir;
  }

  getAdditionalSkillsDirs(): string[] {
    const raw = this.get("AUTOBYTEUS_SKILLS_PATHS", "");
    if (!raw || !raw.trim()) {
      return [];
    }

    const paths: string[] = [];
    for (const rawPath of raw.split(",")) {
      const trimmed = rawPath.trim();
      if (!trimmed) {
        continue;
      }
      if (fs.existsSync(trimmed) && fs.statSync(trimmed).isDirectory()) {
        paths.push(trimmed);
      } else {
        logger.warn(`Skill path does not exist or is not a directory: ${trimmed}`);
      }
    }

    return paths;
  }

  getChannelCallbackBaseUrl(): string | null {
    const raw = this.get("CHANNEL_CALLBACK_BASE_URL");
    if (!raw) {
      return null;
    }
    const normalized = raw.trim().replace(/\/+$/, "");
    return normalized.length > 0 ? normalized : null;
  }

  getChannelCallbackSharedSecret(): string | null {
    const raw = this.get("CHANNEL_CALLBACK_SHARED_SECRET");
    if (!raw) {
      return null;
    }
    const normalized = raw.trim();
    return normalized.length > 0 ? normalized : null;
  }

  getChannelCallbackTimeoutMs(defaultValue = 5000): number {
    const raw = this.get("CHANNEL_CALLBACK_TIMEOUT_MS");
    if (!raw) {
      return defaultValue;
    }
    const parsed = Number(raw.trim());
    if (!Number.isFinite(parsed) || parsed <= 0) {
      throw new AppConfigError("CHANNEL_CALLBACK_TIMEOUT_MS must be a positive number.");
    }
    return parsed;
  }

  loadEnvironment(): boolean {
    console.info("loadEnvironment() is deprecated. Use initialize() instead.");
    try {
      this.loadEnvironmentInternal();
      return true;
    } catch (error) {
      console.error(`Failed to load environment: ${String(error)}`);
      return false;
    }
  }

  setCustomAppDataDir(customPath: string): void {
    if (this.initialized) {
      throw new AppConfigError("Cannot set custom app data directory after initialize() has been called.");
    }

    if (!fs.existsSync(customPath)) {
      throw new AppConfigError(`Data directory does not exist: ${customPath}`);
    }
    if (!fs.statSync(customPath).isDirectory()) {
      throw new AppConfigError(`Path is not a directory: ${customPath}`);
    }

    this.dataDir = customPath;
    console.info(`Custom app data directory set to: ${this.dataDir}`);

    try {
      this.configFile = this.getConfigFilePath();
      console.info(`Updated config file path to ${this.configFile}`);
    } catch (error) {
      console.info(`Config file not found in new data directory: ${String(error)}`);
      this.configFile = null;
    }
  }

  get(key: string, defaultValue?: string): string | undefined {
    return process.env[key] ?? this.configData[key] ?? defaultValue;
  }

  getConfigData(): Record<string, string> {
    return { ...this.configData };
  }

  set(key: string, value: string): void {
    this.configData[key] = value;
    process.env[key] = value;

    if (this.configFile) {
      try {
        this.updateEnvFile(this.configFile, key, value);
      } catch (error) {
        console.info(
          `Could not update config file ${this.configFile}: ${String(error)}. ` +
            "Changes will only be valid for the current session.",
        );
      }
    }
  }

  delete(key: string): void {
    delete this.configData[key];
    delete process.env[key];

    if (this.configFile) {
      try {
        this.removeKeyFromEnvFile(this.configFile, key);
      } catch (error) {
        console.info(
          `Could not update config file ${this.configFile}: ${String(error)}. ` +
            "Changes will only be valid for the current session.",
        );
      }
    }
  }

  setLlmApiKey(provider: string, apiKey: string): void {
    this.set(`${provider.toUpperCase()}_API_KEY`, apiKey);
  }

  getLlmApiKey(provider: string): string | undefined {
    return this.get(`${provider.toUpperCase()}_API_KEY`);
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  private updateEnvFile(configFile: string, key: string, value: string): void {
    const content = fs.readFileSync(configFile, "utf-8");
    const lines = content.split(/\r?\n/);
    let found = false;

    const updatedLines = lines.map((line) => {
      if (!line || line.trim().startsWith("#")) {
        return line;
      }
      const [currentKey] = line.split("=");
      if (currentKey === key) {
        found = true;
        return `${key}=${value}`;
      }
      return line;
    });

    if (!found) {
      updatedLines.push(`${key}=${value}`);
    }

    fs.writeFileSync(configFile, updatedLines.filter((line) => line !== undefined).join("\n"));
  }

  private removeKeyFromEnvFile(configFile: string, key: string): void {
    const content = fs.readFileSync(configFile, "utf-8");
    const lines = content.split(/\r?\n/);
    const filteredLines = lines.filter((line) => {
      if (!line || line.trim().startsWith("#")) {
        return true;
      }
      const [currentKey] = line.split("=");
      return currentKey !== key;
    });

    fs.writeFileSync(configFile, filteredLines.join("\n"));
  }
}
