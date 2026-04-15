import fs from "node:fs";
import fsPromises from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AppConfig, AppConfigError } from "../../../src/config/app-config.js";

const ENV_KEYS = [
  "AUTOBYTEUS_SERVER_HOST",
  "APP_ENV",
  "DB_TYPE",
  "DATABASE_URL",
  "AUTOBYTEUS_MEMORY_DIR",
  "AUTOBYTEUS_SKILLS_PATHS",
  "AUTOBYTEUS_AGENT_PACKAGE_ROOTS",
  "AUTOBYTEUS_APPLICATION_PACKAGE_ROOTS",
  "AUTOBYTEUS_LOG_DIR",
  "AUTOBYTEUS_TEMP_WORKSPACE_DIR",
  "LOG_LEVEL",
];

const createTempConfigDir = async (envContents = ""): Promise<string> => {
  const dir = await fsPromises.mkdtemp(path.join(os.tmpdir(), "autobyteus-config-"));
  await fsPromises.writeFile(path.join(dir, ".env"), envContents, "utf-8");
  return dir;
};

describe("AppConfig", () => {
  const originalEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of ENV_KEYS) {
      originalEnv[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(async () => {
    for (const key of ENV_KEYS) {
      if (originalEnv[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = originalEnv[key];
      }
    }
  });

  it("throws if AUTOBYTEUS_SERVER_HOST is missing", async () => {
    const configDir = await createTempConfigDir("APP_ENV=test\nDB_TYPE=sqlite\n");
    const config = new AppConfig();
    config.setCustomAppDataDir(configDir);

    expect(() => config.initialize()).toThrow(AppConfigError);

    await fsPromises.rm(configDir, { recursive: true, force: true });
  });

  it("initializes base URL and sqlite db path when sqlite DB config is selected", async () => {
    const configDir = await createTempConfigDir(
      "AUTOBYTEUS_SERVER_HOST=http://localhost:8000/\nAPP_ENV=test\nDB_TYPE=sqlite\n",
    );
    const config = new AppConfig();
    config.setCustomAppDataDir(configDir);

    config.initialize();

    expect(config.getBaseUrl()).toBe("http://localhost:8000");
    const expectedDbPath = path.resolve(configDir, "db", "test.db");
    expect(config.get("DATABASE_URL")).toBe(`file:${expectedDbPath}`);
    expect(process.env.DATABASE_URL).toBe(`file:${expectedDbPath}`);
    expect(fs.existsSync(path.join(configDir, "logs"))).toBe(true);

    await fsPromises.rm(configDir, { recursive: true, force: true });
  });

  it("preserves an explicit DATABASE_URL when sqlite DB config is selected", async () => {
    const configDir = await createTempConfigDir(
      "AUTOBYTEUS_SERVER_HOST=http://localhost:8000/\nAPP_ENV=test\nDB_TYPE=sqlite\n",
    );
    const explicitDatabaseUrl = "file:/tmp/explicit-autobyteus-test.db";
    process.env.DATABASE_URL = explicitDatabaseUrl;
    const config = new AppConfig();
    config.setCustomAppDataDir(configDir);

    config.initialize();

    expect(config.get("DATABASE_URL")).toBe(explicitDatabaseUrl);
    expect(process.env.DATABASE_URL).toBe(explicitDatabaseUrl);

    await fsPromises.rm(configDir, { recursive: true, force: true });
  });

  it("resolves AUTOBYTEUS_LOG_DIR relative to app data dir", async () => {
    const configDir = await createTempConfigDir(
      "AUTOBYTEUS_SERVER_HOST=http://localhost:8000/\nAUTOBYTEUS_LOG_DIR=custom-logs\n",
    );
    const config = new AppConfig();
    config.setCustomAppDataDir(configDir);

    config.initialize();

    expect(config.getLogsDir()).toBe(path.resolve(configDir, "custom-logs"));

    await fsPromises.rm(configDir, { recursive: true, force: true });
  });

  it("throws if getBaseUrl is called before initialize", () => {
    const config = new AppConfig();
    expect(() => config.getBaseUrl()).toThrow(AppConfigError);
  });

  it("sets custom app data dir when valid", async () => {
    const configDir = await createTempConfigDir("AUTOBYTEUS_SERVER_HOST=http://localhost:8000\n");
    const config = new AppConfig();

    config.setCustomAppDataDir(configDir);

    expect(config.getAppDataDir()).toBe(configDir);
    expect(config.getConfigFilePath()).toBe(path.join(configDir, ".env"));

    await fsPromises.rm(configDir, { recursive: true, force: true });
  });

  it("accepts an initial app data dir in the constructor", async () => {
    const configDir = await createTempConfigDir("AUTOBYTEUS_SERVER_HOST=http://localhost:8000\n");
    const config = new AppConfig({ appDataDir: configDir });

    expect(config.getAppDataDir()).toBe(configDir);
    expect(config.getConfigFilePath()).toBe(path.join(configDir, ".env"));

    await fsPromises.rm(configDir, { recursive: true, force: true });
  });

  it("clears stale AUTOBYTEUS_MEMORY_DIR when switching to a custom app data dir", async () => {
    const configDir = await createTempConfigDir("AUTOBYTEUS_SERVER_HOST=http://localhost:8000\n");
    process.env.AUTOBYTEUS_MEMORY_DIR = "/tmp/old-memory-root";
    const config = new AppConfig();

    config.setCustomAppDataDir(configDir);
    config.initialize();

    expect(config.getMemoryDir()).toBe(path.join(configDir, "memory"));
    expect(process.env.AUTOBYTEUS_MEMORY_DIR).toBe(path.join(configDir, "memory"));

    await fsPromises.rm(configDir, { recursive: true, force: true });
  });

  it("throws when setting custom app data dir after initialize", async () => {
    const configDir = await createTempConfigDir("AUTOBYTEUS_SERVER_HOST=http://localhost:8000\n");
    const config = new AppConfig();
    config.setCustomAppDataDir(configDir);
    config.initialize();

    expect(() => config.setCustomAppDataDir(configDir)).toThrow(AppConfigError);

    await fsPromises.rm(configDir, { recursive: true, force: true });
  });

  it("throws when setting custom app data dir for non-existent path", () => {
    const config = new AppConfig();
    expect(() => config.setCustomAppDataDir("/nonexistent/directory"))
      .toThrow(AppConfigError);
  });

  it("returns additional skills dirs that exist", async () => {
    const configDir = await createTempConfigDir("AUTOBYTEUS_SERVER_HOST=http://localhost:8000\n");
    const skillsDirA = path.join(configDir, "skills-a");
    const skillsDirB = path.join(configDir, "skills-b");
    await fsPromises.mkdir(skillsDirA, { recursive: true });
    await fsPromises.mkdir(skillsDirB, { recursive: true });

    process.env.AUTOBYTEUS_SKILLS_PATHS = `${skillsDirA},${skillsDirB},/nope`;
    const config = new AppConfig();

    const result = config.getAdditionalSkillsDirs();

    expect(result).toEqual([skillsDirA, skillsDirB]);

    await fsPromises.rm(configDir, { recursive: true, force: true });
  });

  it("returns additional agent package roots that are absolute and exist", async () => {
    const configDir = await createTempConfigDir("AUTOBYTEUS_SERVER_HOST=http://localhost:8000\n");
    const sourceA = path.join(configDir, "source-a");
    const sourceB = path.join(configDir, "source-b");
    await fsPromises.mkdir(sourceA, { recursive: true });
    await fsPromises.mkdir(sourceB, { recursive: true });

    process.env.AUTOBYTEUS_AGENT_PACKAGE_ROOTS = `${sourceA},relative-source,${sourceB},/nope,${sourceA}`;
    const config = new AppConfig();

    expect(config.getAdditionalAgentPackageRoots()).toEqual([sourceA, sourceB]);

    await fsPromises.rm(configDir, { recursive: true, force: true });
  });

  it("returns additional application package roots that are absolute, existing, and deduplicated", async () => {
    const configDir = await createTempConfigDir("AUTOBYTEUS_SERVER_HOST=http://localhost:8000\n");
    const packageRootA = path.join(configDir, "application-root-a");
    const packageRootB = path.join(configDir, "application-root-b");
    await fsPromises.mkdir(packageRootA, { recursive: true });
    await fsPromises.mkdir(packageRootB, { recursive: true });

    process.env.AUTOBYTEUS_APPLICATION_PACKAGE_ROOTS = [
      packageRootA,
      "relative-root",
      packageRootB,
      "/nope",
      packageRootA,
    ].join(",");
    const config = new AppConfig();

    expect(config.getAdditionalApplicationPackageRoots()).toEqual([packageRootA, packageRootB]);

    await fsPromises.rm(configDir, { recursive: true, force: true });
  });

  it("exposes md-centric agent/team path helpers", async () => {
    const configDir = await createTempConfigDir("AUTOBYTEUS_SERVER_HOST=http://localhost:8000\n");
    const config = new AppConfig();
    config.setCustomAppDataDir(configDir);
    config.initialize();

    expect(config.getAgentMdPath("agent-x")).toBe(path.join(configDir, "agents", "agent-x", "agent.md"));
    expect(config.getAgentConfigPath("agent-x")).toBe(
      path.join(configDir, "agents", "agent-x", "agent-config.json"),
    );
    expect(config.getTeamMdPath("team-x")).toBe(path.join(configDir, "agent-teams", "team-x", "team.md"));
    expect(config.getTeamConfigPath("team-x")).toBe(
      path.join(configDir, "agent-teams", "team-x", "team-config.json"),
    );
    expect(config.getTeamLocalAgentMdPath("team-x", "agent-y")).toBe(
      path.join(configDir, "agent-teams", "team-x", "agents", "agent-y", "agent.md"),
    );
    expect(config.getTeamLocalAgentConfigPath("team-x", "agent-y")).toBe(
      path.join(configDir, "agent-teams", "team-x", "agents", "agent-y", "agent-config.json"),
    );

    await fsPromises.rm(configDir, { recursive: true, force: true });
  });

  it("sets and gets config values and updates the env file", async () => {
    const configDir = await createTempConfigDir("AUTOBYTEUS_SERVER_HOST=http://localhost:8000\n");
    const config = new AppConfig();
    config.setCustomAppDataDir(configDir);

    config.set("TEST_KEY", "VALUE");

    const contents = await fsPromises.readFile(path.join(configDir, ".env"), "utf-8");
    expect(contents).toContain("TEST_KEY=VALUE");
    expect(config.get("TEST_KEY")).toBe("VALUE");
    expect(process.env.TEST_KEY).toBe("VALUE");

    await fsPromises.rm(configDir, { recursive: true, force: true });
  });

  it("creates temp workspace directory under the app data dir by default", async () => {
    const configDir = await createTempConfigDir("AUTOBYTEUS_SERVER_HOST=http://localhost:8000\n");
    const config = new AppConfig();
    config.setCustomAppDataDir(configDir);

    const tempDir = config.getTempWorkspaceDir();

    expect(tempDir).toBe(path.join(configDir, "temp_workspace"));
    expect(fs.existsSync(tempDir)).toBe(true);

    await fsPromises.rm(configDir, { recursive: true, force: true });
  });

  it("resolves AUTOBYTEUS_TEMP_WORKSPACE_DIR relative to app data dir", async () => {
    const configDir = await createTempConfigDir("AUTOBYTEUS_SERVER_HOST=http://localhost:8000\n");
    process.env.AUTOBYTEUS_TEMP_WORKSPACE_DIR = "isolated-temp-workspace";
    const config = new AppConfig();
    config.setCustomAppDataDir(configDir);

    const tempDir = config.getTempWorkspaceDir();

    expect(tempDir).toBe(path.resolve(configDir, "isolated-temp-workspace"));
    expect(fs.existsSync(tempDir)).toBe(true);

    await fsPromises.rm(configDir, { recursive: true, force: true });
  });

  it("loadEnvironment returns false when .env is missing", async () => {
    const configDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), "autobyteus-config-empty-"));
    const config = new AppConfig();
    config.setCustomAppDataDir(configDir);

    const result = config.loadEnvironment();

    expect(result).toBe(false);

    await fsPromises.rm(configDir, { recursive: true, force: true });
  });
});
