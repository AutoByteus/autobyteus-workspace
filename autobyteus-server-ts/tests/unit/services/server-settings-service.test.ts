import { beforeEach, describe, expect, it, vi } from "vitest";

const mockConfig = vi.hoisted(() => ({
  getConfigData: vi.fn(),
  get: vi.fn(),
  set: vi.fn(),
  setDurably: vi.fn(() => ({persisted: true})),
  delete: vi.fn(),
}));

const mockReloadMediaToolSchemas = vi.hoisted(() => vi.fn());

vi.mock("../../../src/config/app-config-provider.js", () => ({
  appConfigProvider: {
    get config() {
      return mockConfig;
    },
  },
}));

vi.mock("../../../src/agent-tools/media/register-media-tools.js", () => ({
  reloadMediaToolSchemas: mockReloadMediaToolSchemas,
}));

import {
  DEFAULT_IMAGE_EDIT_MODEL_SETTING_KEY,
  DEFAULT_IMAGE_GENERATION_MODEL_SETTING_KEY,
  DEFAULT_SPEECH_GENERATION_MODEL_SETTING_KEY,
  ServerSettingsService,
} from "../../../src/services/server-settings-service.js";
import {
  FEATURED_CATALOG_ITEMS_SETTING_KEY,
  serializeFeaturedCatalogItemsSetting,
} from "../../../src/config/featured-catalog-items-setting.js";
import { COMPACTION_MODEL_SETTINGS_KEY } from "../../../src/config/compaction-model-settings.js";
import { STREAMING_CONTENT_FLUSH_INTERVAL_SETTING_KEY } from "../../../src/config/streaming-content-flush-interval-setting.js";

describe("ServerSettingsService", () => {
  beforeEach(() => {
    mockConfig.getConfigData.mockReset();
    mockConfig.get.mockReset();
    mockConfig.set.mockReset();
    mockConfig.setDurably.mockClear();
    mockConfig.delete.mockReset();
    mockReloadMediaToolSchemas.mockReset();
    mockConfig.get.mockImplementation((key: string) => mockConfig.getConfigData.mock.results.at(-1)?.value?.[key]);
  });

  it("lists available settings excluding API keys", () => {
    mockConfig.getConfigData.mockReturnValue({
      AUTOBYTEUS_SERVER_HOST: "http://localhost:8000",
      CUSTOM_SETTING: "value",
      OPENAI_API_KEY: "secret",
    });

    const service = new ServerSettingsService();
    const settings = service.getAvailableSettings();

    expect(settings).toHaveLength(2);
    expect(settings.find((item) => item.key === "OPENAI_API_KEY")).toBeUndefined();
    expect(settings.find((item) => item.key === "CUSTOM_SETTING")?.description).toBe(
      "Custom user-defined setting",
    );
    expect(settings.find((item) => item.key === "CUSTOM_SETTING")).toMatchObject({
      isEditable: true,
      isDeletable: true,
    });
    expect(settings.find((item) => item.key === "AUTOBYTEUS_SERVER_HOST")).toMatchObject({
      isEditable: false,
      isDeletable: false,
    });
    expect(settings.find((item) => item.key === "AUTOBYTEUS_STREAM_PARSER")).toBeUndefined();
  });

  it("sorts settings by key", () => {
    mockConfig.getConfigData.mockReturnValue({
      ZETA: "1",
      ALPHA: "2",
    });

    const service = new ServerSettingsService();
    const settings = service.getAvailableSettings();

    expect(settings.map((item) => item.key)).toEqual(["ALPHA", "ZETA"]);
  });

  it("includes predefined settings from effective runtime values even when not persisted in config data", () => {
    mockConfig.getConfigData.mockReturnValue({
      CUSTOM_SETTING: "value",
    });
    mockConfig.get.mockImplementation((key: string) =>
      ({
        AUTOBYTEUS_SERVER_HOST: "http://127.0.0.1:29695",
        CUSTOM_SETTING: "value",
      })[key],
    );

    const service = new ServerSettingsService();
    const settings = service.getAvailableSettings();

    expect(settings.find((item) => item.key === "AUTOBYTEUS_SERVER_HOST")).toMatchObject({
      value: "http://127.0.0.1:29695",
      isEditable: false,
      isDeletable: false,
    });
  });

  it("exposes compaction predefined settings with typed descriptions", () => {
    mockConfig.getConfigData.mockReturnValue({});
    mockConfig.get.mockImplementation((key: string) =>
      ({
        AUTOBYTEUS_COMPACTION_TRIGGER_RATIO: "0.8",
        [COMPACTION_MODEL_SETTINGS_KEY]: '{"modelIdentifier":null,"llmConfig":null}',
        AUTOBYTEUS_ACTIVE_CONTEXT_TOKENS_OVERRIDE: "4096",
        AUTOBYTEUS_COMPACTION_DEBUG_LOGS: "true",
      })[key],
    );

    const service = new ServerSettingsService();
    const settings = service.getAvailableSettings();

    expect(settings.find((item) => item.key === "AUTOBYTEUS_COMPACTION_TRIGGER_RATIO")).toMatchObject({
      value: "0.8",
      description: expect.stringContaining("compaction trigger ratio"),
      isEditable: true,
      isDeletable: false,
    });
    expect(settings.find((item) => item.key === "AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID")).toBeUndefined();
    expect(settings.find((item) => item.key === COMPACTION_MODEL_SETTINGS_KEY)).toMatchObject({
      value: '{"modelIdentifier":null,"llmConfig":null}',
      description: expect.stringContaining("compaction model"),
      isEditable: true,
      isDeletable: false,
    });
    expect(settings.find((item) => item.key === "AUTOBYTEUS_ACTIVE_CONTEXT_TOKENS_OVERRIDE")).toMatchObject({
      value: "4096",
      description: expect.stringContaining("effective context ceiling override"),
      isEditable: true,
      isDeletable: false,
    });
    expect(settings.find((item) => item.key === "AUTOBYTEUS_COMPACTION_DEBUG_LOGS")).toMatchObject({
      value: "true",
      description: expect.stringContaining("detailed compaction"),
      isEditable: true,
      isDeletable: false,
    });
  });

  it("saves and reads the nonsecret numeric context override, including clearing it", () => {
    const key = "AUTOBYTEUS_ACTIVE_CONTEXT_TOKENS_OVERRIDE";
    const data: Record<string, string> = {};
    mockConfig.getConfigData.mockReturnValue(data);
    mockConfig.get.mockImplementation((name: string) => data[name]);
    mockConfig.set.mockImplementation((name: string, value: string) => { data[name] = value; });
    const service = new ServerSettingsService();

    expect(service.updateSetting(key, "16000")[0]).toBe(true);
    expect(mockConfig.set).toHaveBeenCalledWith(key, "16000");
    expect(new ServerSettingsService().getAvailableSettings()).toContainEqual(
      expect.objectContaining({ key, value: "16000", isEditable: true, isDeletable: false }),
    );
    expect(service.updateSetting(key, "")[0]).toBe(true);
    expect(service.getAvailableSettings()).toContainEqual(
      expect.objectContaining({ key, value: "" }),
    );
    expect(service.deleteSetting(key)[0]).toBe(false);
    expect(mockConfig.delete).not.toHaveBeenCalled();
    expect(mockConfig.setDurably).not.toHaveBeenCalled();
  });

  it.each([
    "OPENAI_API_KEY",
    "CUSTOM_APIKEY",
    "CUSTOM_API-KEY",
    "CUSTOM_ACCESS_TOKEN",
    "customPassword",
    "CUSTOM_SECRET",
    "CUSTOM_PRIVATE_KEY",
    "CUSTOM_PRIVATE-KEY",
    "CUSTOM_CREDENTIAL",
    "CUSTOM_TOKENS",
    "AUTOBYTEUS_ACTIVE_CONTEXT_TOKENS_OVERRIDE_SECRET",
    "PREFIX_AUTOBYTEUS_ACTIVE_CONTEXT_TOKENS_OVERRIDE",
  ])("keeps credential-like setting %s write-only and absent from ordinary reads", (key) => {
    mockConfig.getConfigData.mockReturnValue({ [key]: "synthetic-not-a-credential" });
    const service = new ServerSettingsService();

    expect(service.updateSetting(key, "replacement")).toEqual([
      false, "Sensitive settings must use their write-only credential editor.",
    ]);
    expect(service.getAvailableSettings().find((setting) => setting.key === key)).toBeUndefined();
    expect(mockConfig.set).not.toHaveBeenCalled();
    expect(mockConfig.setDurably).not.toHaveBeenCalled();
  });

  it("exposes Codex sandbox mode as predefined editable metadata", () => {
    mockConfig.getConfigData.mockReturnValue({
      CODEX_APP_SERVER_SANDBOX: "workspace-write",
    });

    const service = new ServerSettingsService();
    const settings = service.getAvailableSettings();

    expect(settings.find((item) => item.key === "CODEX_APP_SERVER_SANDBOX")).toMatchObject({
      value: "workspace-write",
      description: expect.stringContaining("Codex app server filesystem sandbox mode"),
      isEditable: true,
      isDeletable: false,
    });
    expect(
      settings.find((item) => item.key === "CODEX_APP_SERVER_SANDBOX")?.description,
    ).toContain("danger-full-access disables filesystem sandboxing");
  });

  it("exposes media default model settings as predefined editable metadata", () => {
    mockConfig.getConfigData.mockReturnValue({
      DEFAULT_IMAGE_EDIT_MODEL: "nano-banana-pro-app-rpa@host",
      DEFAULT_IMAGE_GENERATION_MODEL: "gpt-image-1.5",
      DEFAULT_SPEECH_GENERATION_MODEL: "gemini-3.8-flash-tts",
    });

    const service = new ServerSettingsService();
    const settings = service.getAvailableSettings();

    expect(settings.find((item) => item.key === "DEFAULT_IMAGE_EDIT_MODEL")).toMatchObject({
      value: "nano-banana-pro-app-rpa@host",
      description: expect.stringContaining("Default image editing model identifier"),
      isEditable: true,
      isDeletable: false,
    });
    expect(settings.find((item) => item.key === "DEFAULT_IMAGE_GENERATION_MODEL")).toMatchObject({
      value: "gpt-image-1.5",
      description: expect.stringContaining("Default image generation model identifier"),
      isEditable: true,
      isDeletable: false,
    });
    expect(settings.find((item) => item.key === "DEFAULT_SPEECH_GENERATION_MODEL")).toMatchObject({
      value: "gemini-3.8-flash-tts",
      description: expect.stringContaining("Default speech generation model identifier"),
      isEditable: true,
      isDeletable: false,
    });
  });

  it("exposes and validates the live response update interval", () => {
    mockConfig.getConfigData.mockReturnValue({
      [STREAMING_CONTENT_FLUSH_INTERVAL_SETTING_KEY]: "1000",
    });
    mockConfig.get.mockImplementation((key: string) =>
      key === STREAMING_CONTENT_FLUSH_INTERVAL_SETTING_KEY ? "1000" : undefined,
    );

    const service = new ServerSettingsService();
    expect(service.getAvailableSettings().find(
      (item) => item.key === STREAMING_CONTENT_FLUSH_INTERVAL_SETTING_KEY,
    )).toMatchObject({
      value: "1000",
      description: expect.stringContaining("Recommended default: 500"),
      isEditable: true,
      isDeletable: false,
    });
    expect(service.getEffectiveStreamingContentFlushIntervalMs()).toBe(1000);

    expect(service.updateSetting(
      STREAMING_CONTENT_FLUSH_INTERVAL_SETTING_KEY,
      " 0500 ",
    )[0]).toBe(true);
    expect(mockConfig.set).toHaveBeenCalledWith(
      STREAMING_CONTENT_FLUSH_INTERVAL_SETTING_KEY,
      "500",
    );

    const [invalid, message] = service.updateSetting(
      STREAMING_CONTENT_FLUSH_INTERVAL_SETTING_KEY,
      "500.5",
    );
    expect(invalid).toBe(false);
    expect(message).toContain("whole number");
  });

  it("updates settings successfully", () => {
    mockConfig.set.mockImplementation(() => undefined);

    const service = new ServerSettingsService();
    const [ok, message] = service.updateSetting("CUSTOM_SETTING", "next");

    expect(ok).toBe(true);
    expect(message).toMatch(/updated successfully/i);
    expect(mockConfig.set).toHaveBeenCalledWith("CUSTOM_SETTING", "next");
  });

  it("persists the compound model/config with the durable setting writer", () => {
    const service = new ServerSettingsService();
    expect(service.updateSetting(COMPACTION_MODEL_SETTINGS_KEY, '{"modelIdentifier":" custom ","llmConfig":{"temperature":0.2}}')[0]).toBe(true);
    expect(mockConfig.setDurably).toHaveBeenCalledWith(COMPACTION_MODEL_SETTINGS_KEY, '{"modelIdentifier":"custom","llmConfig":{"temperature":0.2}}');
    expect(service.updateSetting(COMPACTION_MODEL_SETTINGS_KEY, 'unknown')[0]).toBe(false);
  });

  it("rejects invalid predefined Codex sandbox values before persistence", () => {
    const service = new ServerSettingsService();
    const [ok, message] = service.updateSetting("CODEX_APP_SERVER_SANDBOX", "full-access");

    expect(ok).toBe(false);
    expect(message).toContain("read-only, workspace-write, danger-full-access");
    expect(mockConfig.set).not.toHaveBeenCalled();
  });

  it("preserves custom setting values without predefined normalization", () => {
    mockConfig.set.mockImplementation(() => undefined);

    const service = new ServerSettingsService();
    const [ok] = service.updateSetting("CUSTOM_SETTING", "  raw value  ");

    expect(ok).toBe(true);
    expect(mockConfig.set).toHaveBeenCalledWith("CUSTOM_SETTING", "  raw value  ");
  });

  it("persists dynamic media model identifiers without static allowed-value validation", () => {
    mockConfig.set.mockImplementation(() => undefined);

    const service = new ServerSettingsService();
    const [ok] = service.updateSetting("DEFAULT_IMAGE_EDIT_MODEL", "nano-banana-pro-app-rpa@host");

    expect(ok).toBe(true);
    expect(mockConfig.set).toHaveBeenCalledWith(
      "DEFAULT_IMAGE_EDIT_MODEL",
      "nano-banana-pro-app-rpa@host",
    );
  });

  it("exposes featured catalog items as predefined editable metadata", () => {
    const featuredValue = serializeFeaturedCatalogItemsSetting({
      version: 1,
      items: [{ resourceKind: "AGENT", definitionId: "assistant", sortOrder: 10 }],
    });
    mockConfig.getConfigData.mockReturnValue({
      [FEATURED_CATALOG_ITEMS_SETTING_KEY]: featuredValue,
    });

    const service = new ServerSettingsService();
    const settings = service.getAvailableSettings();

    expect(settings.find((item) => item.key === FEATURED_CATALOG_ITEMS_SETTING_KEY)).toMatchObject({
      value: featuredValue,
      description: expect.stringContaining("featured catalog"),
      isEditable: true,
      isDeletable: false,
    });
  });

  it("normalizes valid featured catalog settings before persistence", () => {
    mockConfig.set.mockImplementation(() => undefined);
    const service = new ServerSettingsService();

    const [ok] = service.updateSetting(
      FEATURED_CATALOG_ITEMS_SETTING_KEY,
      JSON.stringify({
        version: 1,
        items: [
          { resourceKind: "AGENT_TEAM", definitionId: "team-a", sortOrder: 20 },
          { resourceKind: "AGENT", definitionId: " agent-a " },
        ],
      }),
    );

    expect(ok).toBe(true);
    expect(mockConfig.set).toHaveBeenCalledWith(
      FEATURED_CATALOG_ITEMS_SETTING_KEY,
      JSON.stringify({
        version: 1,
        items: [
          { resourceKind: "AGENT_TEAM", definitionId: "team-a", sortOrder: 20 },
          { resourceKind: "AGENT", definitionId: "agent-a", sortOrder: 20 },
        ],
      }),
    );
  });

  it("rejects duplicate featured catalog identities before persistence", () => {
    const service = new ServerSettingsService();

    const [ok, message] = service.updateSetting(
      FEATURED_CATALOG_ITEMS_SETTING_KEY,
      JSON.stringify({
        version: 1,
        items: [
          { resourceKind: "AGENT", definitionId: "assistant", sortOrder: 10 },
          { resourceKind: "AGENT", definitionId: "assistant", sortOrder: 20 },
        ],
      }),
    );

    expect(ok).toBe(false);
    expect(message).toContain("duplicated");
    expect(mockConfig.set).not.toHaveBeenCalled();
  });

  it("rejects invalid featured catalog JSON before persistence", () => {
    const service = new ServerSettingsService();

    const [ok, message] = service.updateSetting(
      FEATURED_CATALOG_ITEMS_SETTING_KEY,
      JSON.stringify({
        version: 1,
        items: [{ resourceKind: "WORKSPACE", definitionId: "bad" }],
      }),
    );

    expect(ok).toBe(false);
    expect(message).toContain("AGENT or AGENT_TEAM");
    expect(mockConfig.set).not.toHaveBeenCalled();
  });

  it.each([
    DEFAULT_IMAGE_EDIT_MODEL_SETTING_KEY,
    DEFAULT_IMAGE_GENERATION_MODEL_SETTING_KEY,
    DEFAULT_SPEECH_GENERATION_MODEL_SETTING_KEY,
  ])("reloads media tool schemas after successful media default update for %s", (key) => {
    mockConfig.set.mockImplementation(() => undefined);

    const service = new ServerSettingsService();
    const [ok, message] = service.updateSetting(key, "next-media-model");

    expect(ok).toBe(true);
    expect(message).toMatch(/updated successfully/i);
    expect(mockConfig.set).toHaveBeenCalledWith(key, "next-media-model");
    expect(mockReloadMediaToolSchemas).toHaveBeenCalledTimes(1);
  });

  it("does not reload media tool schemas after successful unrelated setting updates", () => {
    mockConfig.set.mockImplementation(() => undefined);

    const service = new ServerSettingsService();
    const [ok] = service.updateSetting("CUSTOM_SETTING", "next");

    expect(ok).toBe(true);
    expect(mockReloadMediaToolSchemas).not.toHaveBeenCalled();
  });

  it("does not reload media tool schemas when an update fails before persistence", () => {
    const service = new ServerSettingsService();
    const [ok] = service.updateSetting("CODEX_APP_SERVER_SANDBOX", "invalid-mode");

    expect(ok).toBe(false);
    expect(mockConfig.set).not.toHaveBeenCalled();
    expect(mockReloadMediaToolSchemas).not.toHaveBeenCalled();
  });

  it("does not reload media tool schemas when media default persistence fails", () => {
    mockConfig.set.mockImplementation(() => {
      throw new Error("boom");
    });

    const service = new ServerSettingsService();
    const [ok, message] = service.updateSetting(
      DEFAULT_IMAGE_GENERATION_MODEL_SETTING_KEY,
      "next-media-model",
    );

    expect(ok).toBe(false);
    expect(message).toBe("Error updating server setting: SERVER_SETTING_UPDATE_REJECTED");
    expect(mockReloadMediaToolSchemas).not.toHaveBeenCalled();
  });

  it("returns error when update fails", () => {
    mockConfig.set.mockImplementation(() => {
      throw new Error("boom");
    });

    const service = new ServerSettingsService();
    const [ok, message] = service.updateSetting("CUSTOM_SETTING", "next");

    expect(ok).toBe(false);
    expect(message).toBe("Error updating server setting: SERVER_SETTING_UPDATE_REJECTED");
  });

  it("rejects updating system-managed settings", () => {
    const service = new ServerSettingsService();
    const [ok, message] = service.updateSetting("AUTOBYTEUS_SERVER_HOST", "http://example.com:9000");

    expect(ok).toBe(false);
    expect(message).toContain("cannot be updated");
    expect(mockConfig.set).not.toHaveBeenCalled();
  });

  it("accepts any setting key", () => {
    const service = new ServerSettingsService();
    expect(service.isValidSetting("anything")).toBe(true);
  });

  it("deletes custom settings successfully", () => {
    mockConfig.getConfigData.mockReturnValue({
      CUSTOM_SETTING: "value",
    });
    mockConfig.delete.mockImplementation(() => undefined);

    const service = new ServerSettingsService();
    const [ok, message] = service.deleteSetting("CUSTOM_SETTING");

    expect(ok).toBe(true);
    expect(message).toMatch(/deleted successfully/i);
    expect(mockConfig.delete).toHaveBeenCalledWith("CUSTOM_SETTING");
  });

  it("rejects deleting predefined settings", () => {
    mockConfig.getConfigData.mockReturnValue({
      AUTOBYTEUS_SERVER_HOST: "http://localhost:8000",
    });

    const service = new ServerSettingsService();
    const [ok, message] = service.deleteSetting("AUTOBYTEUS_SERVER_HOST");

    expect(ok).toBe(false);
    expect(message).toContain("cannot be removed");
    expect(mockConfig.delete).not.toHaveBeenCalled();
  });

  it("returns error when deleting missing settings", () => {
    mockConfig.getConfigData.mockReturnValue({});

    const service = new ServerSettingsService();
    const [ok, message] = service.deleteSetting("MISSING_SETTING");

    expect(ok).toBe(false);
    expect(message).toContain("does not exist");
    expect(mockConfig.delete).not.toHaveBeenCalled();
  });

  it("reads a boolean setting as true, false, or null for the requested key", () => {
    const service = new ServerSettingsService();

    mockConfig.get.mockReturnValueOnce(' true ');
    expect(service.getBooleanSetting('ENABLE_APPLICATIONS')).toBe(true);
    expect(mockConfig.get).toHaveBeenLastCalledWith('ENABLE_APPLICATIONS');

    mockConfig.get.mockReturnValueOnce('false');
    expect(service.getBooleanSetting('ENABLE_SKILL_IMPROVEMENT')).toBe(false);
    expect(mockConfig.get).toHaveBeenLastCalledWith('ENABLE_SKILL_IMPROVEMENT');

    mockConfig.get.mockReturnValueOnce('   ');
    expect(service.getBooleanSetting('ENABLE_SKILL_IMPROVEMENT')).toBeNull();

    mockConfig.get.mockReturnValueOnce(undefined);
    expect(service.getBooleanSetting('ENABLE_APPLICATIONS')).toBeNull();
  });

  it("persists a boolean setting as normalized strings for the requested key", () => {
    const service = new ServerSettingsService();

    service.setBooleanSetting('ENABLE_APPLICATIONS', true);
    service.setBooleanSetting('ENABLE_SKILL_IMPROVEMENT', false);

    expect(mockConfig.set).toHaveBeenNthCalledWith(1, 'ENABLE_APPLICATIONS', 'true');
    expect(mockConfig.set).toHaveBeenNthCalledWith(2, 'ENABLE_SKILL_IMPROVEMENT', 'false');
  });

  // projects-always-on (AC-002, DEC-001): the retired Projects flag is no longer a predefined setting.
  // A value stored by an earlier release is not read; it lists as an ordinary custom setting the user can delete.
  it("lists a stored retired ENABLE_PROJECTS value as an ordinary, deletable custom setting", () => {
    mockConfig.getConfigData.mockReturnValue({ ENABLE_PROJECTS: 'false' });
    mockConfig.delete.mockImplementation(() => undefined);

    const service = new ServerSettingsService();
    expect(service.getAvailableSettings().find((entry) => entry.key === 'ENABLE_PROJECTS')).toMatchObject({
      value: 'false', description: 'Custom user-defined setting', isEditable: true, isDeletable: true,
    });
    expect(service.deleteSetting('ENABLE_PROJECTS')[0]).toBe(true);
    expect(mockConfig.delete).toHaveBeenCalledWith('ENABLE_PROJECTS');
  });

  // idle-shutdown-background-tasks (AC-004, REQ-003): delegated copies have no idle shutdown, so its delay
  // setting is no longer offered. A value stored by an earlier release is not read; it lists as an ordinary
  // custom setting the user can delete.
  it("does not offer the removed idle-shutdown delay and lists a stored value as an ordinary, deletable custom setting", () => {
    const key = 'AUTOBYTEUS_TASK_EXECUTION_IDLE_SHUTDOWN_GRACE_MS';
    mockConfig.getConfigData.mockReturnValue({});
    expect(new ServerSettingsService().getAvailableSettings().find((entry) => entry.key === key)).toBeUndefined();

    mockConfig.getConfigData.mockReturnValue({ [key]: '60000' });
    mockConfig.delete.mockImplementation(() => undefined);
    const service = new ServerSettingsService();
    expect(service.getAvailableSettings().find((entry) => entry.key === key)).toMatchObject({
      value: '60000', description: 'Custom user-defined setting', isEditable: true, isDeletable: true,
    });
    expect(service.deleteSetting(key)[0]).toBe(true);
    expect(mockConfig.delete).toHaveBeenCalledWith(key);
  });


});
