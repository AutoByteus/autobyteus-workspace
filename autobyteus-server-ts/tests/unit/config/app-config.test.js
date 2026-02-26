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
    "LOG_LEVEL",
];
const createTempConfigDir = async (envContents = "") => {
    const dir = await fsPromises.mkdtemp(path.join(os.tmpdir(), "autobyteus-config-"));
    await fsPromises.writeFile(path.join(dir, ".env"), envContents, "utf-8");
    return dir;
};
describe("AppConfig", () => {
    const originalEnv = {};
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
            }
            else {
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
    it("initializes base URL and sqlite db path", async () => {
        const configDir = await createTempConfigDir("AUTOBYTEUS_SERVER_HOST=http://localhost:8000/\nAPP_ENV=test\nDB_TYPE=sqlite\n");
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
    it("uses AUTOBYTEUS_MEMORY_DIR when provided", async () => {
        const configDir = await createTempConfigDir("AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\nDB_TYPE=sqlite\nAUTOBYTEUS_MEMORY_DIR=./custom-memory\n");
        const config = new AppConfig();
        config.setCustomAppDataDir(configDir);
        config.initialize();
        const expectedMemoryDir = path.resolve(configDir, "custom-memory");
        expect(config.getMemoryDir()).toBe(expectedMemoryDir);
        expect(process.env.AUTOBYTEUS_MEMORY_DIR).toBe(expectedMemoryDir);
        expect(fs.existsSync(expectedMemoryDir)).toBe(true);
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
    it("creates temp workspace directory", async () => {
        const configDir = await createTempConfigDir("AUTOBYTEUS_SERVER_HOST=http://localhost:8000\n");
        const config = new AppConfig();
        config.setCustomAppDataDir(configDir);
        const tempDir = config.getTempWorkspaceDir();
        expect(tempDir).toBe(path.join(configDir, "temp_workspace"));
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
