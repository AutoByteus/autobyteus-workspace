import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { ServerSettingsService } from "../../../src/services/server-settings-service.js";

const CONTEXT_KEY = "AUTOBYTEUS_ACTIVE_CONTEXT_TOKENS_OVERRIDE";
const CREDENTIAL_KEY = "IR006_SYNTHETIC_ACCESS_TOKEN";
const CUSTOM_KEY = "IR006_CUSTOM_SETTING";
const ENV_KEYS = [
  CONTEXT_KEY, CREDENTIAL_KEY, CUSTOM_KEY, "AUTOBYTEUS_SERVER_HOST", "APP_ENV",
  "DB_TYPE", "DATABASE_URL", "AUTOBYTEUS_MEMORY_DIR", "LOG_LEVEL", "AUTOBYTEUS_STREAM_PARSER",
];

describe("ServerSettingsService with persisted AppConfig", () => {
  let tempDir: string;
  let originalEnv: Record<string, string | undefined>;

  const reopen = (): ServerSettingsService => {
    appConfigProvider.resetForTests();
    appConfigProvider.config.setCustomAppDataDir(tempDir);
    appConfigProvider.config.initialize();
    return new ServerSettingsService();
  };

  beforeEach(() => {
    originalEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
    for (const key of ENV_KEYS) delete process.env[key];
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "server-settings-service-"));
    // Bootstrap only the isolated test configuration, never the setting under test.
    fs.writeFileSync(path.join(tempDir, ".env"),
      "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\nDB_TYPE=sqlite\n");
  });

  afterEach(() => {
    appConfigProvider.resetForTests();
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("persists the normal numeric setting write across reload, then persists clearing it", () => {
    const service = reopen();
    expect(service.getAvailableSettings().find((setting) => setting.key === CONTEXT_KEY))
      .toBeUndefined();
    expect(service.updateSetting(CONTEXT_KEY, "16000")[0]).toBe(true);
    expect(service.getAvailableSettings()).toContainEqual(expect.objectContaining({
      key: CONTEXT_KEY, value: "16000", isEditable: true, isDeletable: false,
    }));
    expect(fs.readFileSync(path.join(tempDir, ".env"), "utf8"))
      .toContain(`${CONTEXT_KEY}=16000`);

    // Remove the process cache so only the normal persisted reader can prove reload.
    delete process.env[CONTEXT_KEY];
    const reopened = reopen();
    expect(reopened.getAvailableSettings()).toContainEqual(expect.objectContaining({
      key: CONTEXT_KEY, value: "16000",
    }));
    expect(reopened.updateSetting(CONTEXT_KEY, "")[0]).toBe(true);
    delete process.env[CONTEXT_KEY];
    expect(reopen().getAvailableSettings()).toContainEqual(expect.objectContaining({
      key: CONTEXT_KEY, value: "",
    }));
  });

  it("retains credential rejection, system-managed and retired guards, and custom semantics", () => {
    const service = reopen();
    const before = fs.readFileSync(path.join(tempDir, ".env"), "utf8");
    expect(service.updateSetting(CREDENTIAL_KEY, "synthetic-not-a-credential")).toEqual([
      false, "Sensitive settings must use their write-only credential editor.",
    ]);
    expect(service.updateSetting("AUTOBYTEUS_SERVER_HOST", "http://example.invalid")[0])
      .toBe(false);
    expect(service.updateSetting("AUTOBYTEUS_STREAM_PARSER", "sentinel")[0]).toBe(false);
    expect(fs.readFileSync(path.join(tempDir, ".env"), "utf8")).toBe(before);
    expect(appConfigProvider.config.get(CREDENTIAL_KEY)).toBeUndefined();
    expect(service.getAvailableSettings().find((setting) => setting.key === CREDENTIAL_KEY))
      .toBeUndefined();

    expect(service.updateSetting(CUSTOM_KEY, "  ordinary value  ")[0]).toBe(true);
    expect(service.getAvailableSettings()).toContainEqual(expect.objectContaining({
      key: CUSTOM_KEY, value: "  ordinary value  ", isEditable: true, isDeletable: true,
    }));
    expect(service.deleteSetting(CUSTOM_KEY)[0]).toBe(true);
    expect(service.getAvailableSettings().find((setting) => setting.key === CUSTOM_KEY))
      .toBeUndefined();
  });
});
