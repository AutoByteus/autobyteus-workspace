import "reflect-metadata";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { graphql as graphqlFn, GraphQLSchema } from "graphql";
import { buildGraphqlSchema } from "../../../src/api/graphql/schema.js";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { normalizeSandboxMode } from "../../../src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.js";
import {
  DEFAULT_IMAGE_EDIT_MODEL_SETTING_KEY,
  DEFAULT_IMAGE_GENERATION_MODEL_SETTING_KEY,
  DEFAULT_SPEECH_GENERATION_MODEL_SETTING_KEY,
} from "../../../src/services/server-settings-service.js";
import {
  CODEX_APP_SERVER_SANDBOX_SETTING_KEY,
  CODEX_SANDBOX_MODES,
} from "../../../src/runtime-management/codex/codex-sandbox-mode-setting.js";
import { FEATURED_CATALOG_ITEMS_SETTING_KEY } from "../../../src/config/featured-catalog-items-setting.js";
import { CLAUDE_ONE_HOUR_PROMPT_CACHE_SETTING_KEY } from "../../../src/runtime-management/claude/claude-prompt-cache-setting.js";
import { buildClaudeSdkSpawnEnvironment } from "../../../src/runtime-management/claude/client/claude-sdk-spawn-environment.js";
import {
  DEFAULT_STREAMING_CONTENT_FLUSH_INTERVAL_MS,
  STREAMING_CONTENT_FLUSH_INTERVAL_SETTING_KEY,
} from "../../../src/config/streaming-content-flush-interval-setting.js";

// Saved by the removed compaction-model setting; may linger in an existing .env.
const COMPACTION_MODEL_SETTINGS_KEY = "AUTOBYTEUS_COMPACTION_MODEL_SETTINGS";

const AUTOBYTEUS_STREAM_PARSER_SETTING_KEY = "AUTOBYTEUS_STREAM_PARSER";

describe("Server settings GraphQL e2e", () => {
  let schema: GraphQLSchema;
  let graphql: typeof graphqlFn;
  let tempDir: string;
  let originalServerHostEnv: string | undefined;
  let originalCodexSandboxEnv: string | undefined;
  let originalFeaturedCatalogItemsEnv: string | undefined;
  let originalStreamParserEnv: string | undefined;
  let originalStreamingContentFlushIntervalEnv: string | undefined;
  let originalCompactionModelEnv: string | undefined;
  let originalInitializationEnv: Record<string, string | undefined>;
  let originalMediaModelEnv: Record<string, string | undefined>;

  beforeAll(async () => {
    schema = await buildGraphqlSchema();
    const require = createRequire(import.meta.url);
    const typeGraphqlRoot = path.dirname(require.resolve("type-graphql"));
    const graphqlPath = require.resolve("graphql", { paths: [typeGraphqlRoot] });
    const graphqlModule = await import(graphqlPath);
    graphql = graphqlModule.graphql as typeof graphqlFn;
  });

  beforeEach(() => {
    appConfigProvider.resetForTests();
    originalInitializationEnv = Object.fromEntries(
      ["APP_ENV", "DB_TYPE", "DATABASE_URL", "AUTOBYTEUS_MEMORY_DIR"].map(key => [key, process.env[key]]),
    );
    originalServerHostEnv = process.env.AUTOBYTEUS_SERVER_HOST;
    originalCompactionModelEnv = process.env[COMPACTION_MODEL_SETTINGS_KEY];
    delete process.env[COMPACTION_MODEL_SETTINGS_KEY];
    originalCodexSandboxEnv = process.env[CODEX_APP_SERVER_SANDBOX_SETTING_KEY];
    originalFeaturedCatalogItemsEnv = process.env[FEATURED_CATALOG_ITEMS_SETTING_KEY];
    originalStreamParserEnv = process.env[AUTOBYTEUS_STREAM_PARSER_SETTING_KEY];
    originalStreamingContentFlushIntervalEnv =
      process.env[STREAMING_CONTENT_FLUSH_INTERVAL_SETTING_KEY];
    originalMediaModelEnv = {
      [DEFAULT_IMAGE_EDIT_MODEL_SETTING_KEY]: process.env[DEFAULT_IMAGE_EDIT_MODEL_SETTING_KEY],
      [DEFAULT_IMAGE_GENERATION_MODEL_SETTING_KEY]: process.env[DEFAULT_IMAGE_GENERATION_MODEL_SETTING_KEY],
      [DEFAULT_SPEECH_GENERATION_MODEL_SETTING_KEY]: process.env[DEFAULT_SPEECH_GENERATION_MODEL_SETTING_KEY],
    };
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "autobyteus-server-settings-graphql-"));
    fs.writeFileSync(
      path.join(tempDir, ".env"),
      "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n",
      "utf-8",
    );
    process.env.AUTOBYTEUS_SERVER_HOST = "http://localhost:8000";
    delete process.env[CODEX_APP_SERVER_SANDBOX_SETTING_KEY];
    delete process.env[FEATURED_CATALOG_ITEMS_SETTING_KEY];
    delete process.env[AUTOBYTEUS_STREAM_PARSER_SETTING_KEY];
    delete process.env[STREAMING_CONTENT_FLUSH_INTERVAL_SETTING_KEY];
    delete process.env[DEFAULT_IMAGE_EDIT_MODEL_SETTING_KEY];
    delete process.env[DEFAULT_IMAGE_GENERATION_MODEL_SETTING_KEY];
    delete process.env[DEFAULT_SPEECH_GENERATION_MODEL_SETTING_KEY];
    appConfigProvider.config.setCustomAppDataDir(tempDir);
  });

  afterEach(() => {
    appConfigProvider.resetForTests();
    for (const [key, value] of Object.entries(originalInitializationEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    if (originalCompactionModelEnv === undefined) delete process.env[COMPACTION_MODEL_SETTINGS_KEY];
    else process.env[COMPACTION_MODEL_SETTINGS_KEY] = originalCompactionModelEnv;
    if (originalServerHostEnv === undefined) {
      delete process.env.AUTOBYTEUS_SERVER_HOST;
    } else {
      process.env.AUTOBYTEUS_SERVER_HOST = originalServerHostEnv;
    }
    if (originalCodexSandboxEnv === undefined) {
      delete process.env[CODEX_APP_SERVER_SANDBOX_SETTING_KEY];
    } else {
      process.env[CODEX_APP_SERVER_SANDBOX_SETTING_KEY] = originalCodexSandboxEnv;
    }
    if (originalFeaturedCatalogItemsEnv === undefined) {
      delete process.env[FEATURED_CATALOG_ITEMS_SETTING_KEY];
    } else {
      process.env[FEATURED_CATALOG_ITEMS_SETTING_KEY] = originalFeaturedCatalogItemsEnv;
    }
    if (originalStreamParserEnv === undefined) {
      delete process.env[AUTOBYTEUS_STREAM_PARSER_SETTING_KEY];
    } else {
      process.env[AUTOBYTEUS_STREAM_PARSER_SETTING_KEY] = originalStreamParserEnv;
    }
    if (originalStreamingContentFlushIntervalEnv === undefined) {
      delete process.env[STREAMING_CONTENT_FLUSH_INTERVAL_SETTING_KEY];
    } else {
      process.env[STREAMING_CONTENT_FLUSH_INTERVAL_SETTING_KEY] =
        originalStreamingContentFlushIntervalEnv;
    }
    for (const [key, value] of Object.entries(originalMediaModelEnv)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  const execGraphql = async <T>(
    query: string,
    variables?: Record<string, unknown>,
  ): Promise<T> => {
    const result = await graphql({
      schema,
      source: query,
      variableValues: variables,
    });
    if (result.errors?.length) {
      throw result.errors[0];
    }
    return result.data as T;
  };

  it("supports update/list/delete lifecycle for custom server settings", async () => {
    const key = `CUSTOM_SETTING_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const value = "http://legacy-host:9000";

    const upsertMutation = `
      mutation UpdateServerSetting($key: String!, $value: String!) {
        updateServerSetting(key: $key, value: $value)
      }
    `;

    const updated = await execGraphql<{ updateServerSetting: string }>(upsertMutation, {
      key,
      value,
    });
    expect(updated.updateServerSetting).toContain("updated successfully");

    const listQuery = `
      query GetServerSettings {
        getServerSettings {
          key
          value
          description
          isEditable
          isDeletable
        }
      }
    `;

    const listed = await execGraphql<{
      getServerSettings: Array<{
        key: string;
        value: string;
        description: string;
        isEditable: boolean;
        isDeletable: boolean;
      }>;
    }>(listQuery);

    const created = listed.getServerSettings.find((entry) => entry.key === key);
    expect(created).toBeTruthy();
    expect(created?.value).toBe(value);
    expect(created?.description).toBe("Custom user-defined setting");
    expect(created?.isEditable).toBe(true);
    expect(created?.isDeletable).toBe(true);

    const publicHost = listed.getServerSettings.find((entry) => entry.key === "AUTOBYTEUS_SERVER_HOST");
    expect(publicHost).toBeTruthy();
    expect(publicHost?.isEditable).toBe(false);
    expect(publicHost?.isDeletable).toBe(false);

    const protectedUpdate = await execGraphql<{ updateServerSetting: string }>(upsertMutation, {
      key: "AUTOBYTEUS_SERVER_HOST",
      value: "http://example.com:9000",
    });
    expect(protectedUpdate.updateServerSetting).toContain("cannot be updated");

    const deleteMutation = `
      mutation DeleteServerSetting($key: String!) {
        deleteServerSetting(key: $key)
      }
    `;

    const deleted = await execGraphql<{ deleteServerSetting: string }>(deleteMutation, { key });
    expect(deleted.deleteServerSetting).toContain("deleted successfully");

    const listedAfterDelete = await execGraphql<{
      getServerSettings: Array<{ key: string }>;
    }>(listQuery);

    expect(listedAfterDelete.getServerSettings.find((entry) => entry.key === key)).toBeUndefined();
  });

  it("persists featured catalog items through the GraphQL settings boundary", async () => {
    const updateMutation = `
      mutation UpdateServerSetting($key: String!, $value: String!) {
        updateServerSetting(key: $key, value: $value)
      }
    `;
    const listQuery = `
      query GetServerSettings {
        getServerSettings {
          key
          value
          description
          isEditable
          isDeletable
        }
      }
    `;
    const rawValue = JSON.stringify({
      version: 1,
      items: [
        { resourceKind: "AGENT_TEAM", definitionId: " e2e-team ", sortOrder: 30 },
        { resourceKind: "AGENT", definitionId: "e2e-agent" },
      ],
    });

    const updated = await execGraphql<{ updateServerSetting: string }>(updateMutation, {
      key: FEATURED_CATALOG_ITEMS_SETTING_KEY,
      value: rawValue,
    });
    expect(updated.updateServerSetting).toContain("updated successfully");

    const listed = await execGraphql<{
      getServerSettings: Array<{
        key: string;
        value: string;
        description: string;
        isEditable: boolean;
        isDeletable: boolean;
      }>;
    }>(listQuery);
    const featuredSetting = listed.getServerSettings.find(
      (entry) => entry.key === FEATURED_CATALOG_ITEMS_SETTING_KEY,
    );

    expect(featuredSetting).toMatchObject({
      description: expect.stringContaining("featured catalog"),
      isEditable: true,
      isDeletable: false,
    });
    expect(JSON.parse(featuredSetting?.value ?? "")).toEqual({
      version: 1,
      items: [
        { resourceKind: "AGENT", definitionId: "e2e-agent", sortOrder: 20 },
        { resourceKind: "AGENT_TEAM", definitionId: "e2e-team", sortOrder: 30 },
      ],
    });
  });

  it("rejects duplicate featured catalog items through GraphQL without replacing the saved value", async () => {
    const updateMutation = `
      mutation UpdateServerSetting($key: String!, $value: String!) {
        updateServerSetting(key: $key, value: $value)
      }
    `;
    const listQuery = `
      query GetServerSettings {
        getServerSettings {
          key
          value
        }
      }
    `;
    const baselineValue = JSON.stringify({
      version: 1,
      items: [{ resourceKind: "AGENT", definitionId: "baseline-agent", sortOrder: 10 }],
    });

    await execGraphql<{ updateServerSetting: string }>(updateMutation, {
      key: FEATURED_CATALOG_ITEMS_SETTING_KEY,
      value: baselineValue,
    });

    const duplicateUpdate = await execGraphql<{ updateServerSetting: string }>(updateMutation, {
      key: FEATURED_CATALOG_ITEMS_SETTING_KEY,
      value: JSON.stringify({
        version: 1,
        items: [
          { resourceKind: "AGENT", definitionId: "baseline-agent", sortOrder: 10 },
          { resourceKind: "AGENT", definitionId: "baseline-agent", sortOrder: 20 },
        ],
      }),
    });
    expect(duplicateUpdate.updateServerSetting).toContain("duplicated");

    const listed = await execGraphql<{
      getServerSettings: Array<{ key: string; value: string }>;
    }>(listQuery);
    expect(
      listed.getServerSettings.find((entry) => entry.key === FEATURED_CATALOG_ITEMS_SETTING_KEY)
        ?.value,
    ).toBe(baselineValue);
  });

  it("validates and exposes Codex sandbox mode through the GraphQL settings boundary", async () => {
    const updateMutation = `
      mutation UpdateServerSetting($key: String!, $value: String!) {
        updateServerSetting(key: $key, value: $value)
      }
    `;
    const listQuery = `
      query GetServerSettings {
        getServerSettings {
          key
          value
          description
          isEditable
          isDeletable
        }
      }
    `;

    for (const mode of CODEX_SANDBOX_MODES) {
      const updated = await execGraphql<{ updateServerSetting: string }>(updateMutation, {
        key: CODEX_APP_SERVER_SANDBOX_SETTING_KEY,
        value: mode,
      });
      expect(updated.updateServerSetting).toContain("updated successfully");
      expect(process.env[CODEX_APP_SERVER_SANDBOX_SETTING_KEY]).toBe(mode);
      expect(normalizeSandboxMode()).toBe(mode);

      const listed = await execGraphql<{
        getServerSettings: Array<{
          key: string;
          value: string;
          description: string;
          isEditable: boolean;
          isDeletable: boolean;
        }>;
      }>(listQuery);
      const codexSandboxSetting = listed.getServerSettings.find(
        (entry) => entry.key === CODEX_APP_SERVER_SANDBOX_SETTING_KEY,
      );
      expect(codexSandboxSetting).toMatchObject({
        value: mode,
        isEditable: true,
        isDeletable: false,
      });
      expect(codexSandboxSetting?.description).toContain(
        "Codex app server filesystem sandbox mode",
      );
      expect(codexSandboxSetting?.description).not.toBe("Custom user-defined setting");
    }

    const invalidUpdate = await execGraphql<{ updateServerSetting: string }>(updateMutation, {
      key: CODEX_APP_SERVER_SANDBOX_SETTING_KEY,
      value: "danger_full_access",
    });
    expect(invalidUpdate.updateServerSetting).toContain(
      "read-only, workspace-write, danger-full-access",
    );
    expect(process.env[CODEX_APP_SERVER_SANDBOX_SETTING_KEY]).toBe("danger-full-access");
    expect(normalizeSandboxMode()).toBe("danger-full-access");

    const envFileContents = fs.readFileSync(path.join(tempDir, ".env"), "utf-8");
    expect(envFileContents).toContain(
      `${CODEX_APP_SERVER_SANDBOX_SETTING_KEY}=danger-full-access`,
    );
    expect(envFileContents).not.toContain(
      `${CODEX_APP_SERVER_SANDBOX_SETTING_KEY}=danger_full_access`,
    );
  });

  it("saves the Claude one-hour prompt cache toggle through GraphQL, rejects other values, and the next Claude spawn follows it (autobyteus-273 AC-006)", async () => {
    const originalClaudeCacheEnv = process.env[CLAUDE_ONE_HOUR_PROMPT_CACHE_SETTING_KEY];
    const originalEnableOneHourEnv = process.env.ENABLE_PROMPT_CACHING_1H;
    delete process.env[CLAUDE_ONE_HOUR_PROMPT_CACHE_SETTING_KEY];
    delete process.env.ENABLE_PROMPT_CACHING_1H;
    const updateMutation = `
      mutation UpdateServerSetting($key: String!, $value: String!) {
        updateServerSetting(key: $key, value: $value)
      }
    `;
    const listQuery = `
      query GetServerSettings {
        getServerSettings { key value description isEditable isDeletable }
      }
    `;
    type Listed = { getServerSettings: Array<{ key: string; value: string; description: string; isEditable: boolean; isDeletable: boolean }> };
    const listedSetting = async () =>
      (await execGraphql<Listed>(listQuery)).getServerSettings.find((entry) => entry.key === CLAUDE_ONE_HOUR_PROMPT_CACHE_SETTING_KEY);
    // What the server hands the next Claude Code child (ClaudeSdkClient builds it from process.env at spawn time).
    const nextSpawnOneHourVariable = () => buildClaudeSdkSpawnEnvironment(process.env).ENABLE_PROMPT_CACHING_1H;
    const envFile = () => fs.readFileSync(path.join(tempDir, ".env"), "utf-8");

    try {
      // Never saved: not listed with a value, and the next spawn gets the default.
      expect(await listedSetting()).toBeUndefined();
      expect(nextSpawnOneHourVariable()).toBe("1");

      const off = await execGraphql<{ updateServerSetting: string }>(updateMutation, {
        key: CLAUDE_ONE_HOUR_PROMPT_CACHE_SETTING_KEY,
        value: " false ",
      });
      expect(off.updateServerSetting).toContain("updated successfully");
      expect(process.env[CLAUDE_ONE_HOUR_PROMPT_CACHE_SETTING_KEY]).toBe("false");
      expect(envFile()).toContain(`${CLAUDE_ONE_HOUR_PROMPT_CACHE_SETTING_KEY}=false`);
      expect(nextSpawnOneHourVariable()).toBeUndefined();
      const listedOff = await listedSetting();
      expect(listedOff).toMatchObject({ value: "false", isEditable: true, isDeletable: false });
      expect(listedOff?.description).toContain("one-hour prompt cache");

      for (const invalid of ["1h", "off", "TRUE", ""]) {
        const rejected = await execGraphql<{ updateServerSetting: string }>(updateMutation, {
          key: CLAUDE_ONE_HOUR_PROMPT_CACHE_SETTING_KEY,
          value: invalid,
        });
        expect(rejected.updateServerSetting).not.toContain("updated successfully");
        expect(process.env[CLAUDE_ONE_HOUR_PROMPT_CACHE_SETTING_KEY]).toBe("false");
      }
      expect(envFile()).toContain(`${CLAUDE_ONE_HOUR_PROMPT_CACHE_SETTING_KEY}=false`);

      const on = await execGraphql<{ updateServerSetting: string }>(updateMutation, {
        key: CLAUDE_ONE_HOUR_PROMPT_CACHE_SETTING_KEY,
        value: "true",
      });
      expect(on.updateServerSetting).toContain("updated successfully");
      expect(envFile()).toContain(`${CLAUDE_ONE_HOUR_PROMPT_CACHE_SETTING_KEY}=true`);
      expect(envFile()).not.toContain(`${CLAUDE_ONE_HOUR_PROMPT_CACHE_SETTING_KEY}=false`);
      expect((await listedSetting())?.value).toBe("true");
      expect(nextSpawnOneHourVariable()).toBe("1");
    } finally {
      if (originalClaudeCacheEnv === undefined) delete process.env[CLAUDE_ONE_HOUR_PROMPT_CACHE_SETTING_KEY];
      else process.env[CLAUDE_ONE_HOUR_PROMPT_CACHE_SETTING_KEY] = originalClaudeCacheEnv;
      if (originalEnableOneHourEnv === undefined) delete process.env.ENABLE_PROMPT_CACHING_1H;
      else process.env.ENABLE_PROMPT_CACHING_1H = originalEnableOneHourEnv;
    }
  });

  it("discards and rejects the retired stream-parser key through the GraphQL settings boundary", async () => {
    const updateMutation = `
      mutation UpdateServerSetting($key: String!, $value: String!) {
        updateServerSetting(key: $key, value: $value)
      }
    `;
    const listQuery = `
      query GetServerSettings {
        getServerSettings {
          key
          value
          description
          isEditable
          isDeletable
        }
      }
    `;
    fs.writeFileSync(
      path.join(tempDir, ".env"),
      [
        "AUTOBYTEUS_SERVER_HOST=http://localhost:8000",
        "APP_ENV=test",
        `${AUTOBYTEUS_STREAM_PARSER_SETTING_KEY}=xml`,
        "UNRELATED_SETTING=preserved",
        "",
      ].join("\n"),
      "utf-8",
    );
    process.env[AUTOBYTEUS_STREAM_PARSER_SETTING_KEY] = "sentinel";
    appConfigProvider.config.initialize();

    const listed = await execGraphql<{
      getServerSettings: Array<{ key: string; value: string }>;
    }>(listQuery);
    expect(listed.getServerSettings.find(
      (entry) => entry.key === AUTOBYTEUS_STREAM_PARSER_SETTING_KEY,
    )).toBeUndefined();
    expect(listed.getServerSettings.find(
      (entry) => entry.key === "UNRELATED_SETTING",
    )).toMatchObject({ value: "preserved" });
    expect(process.env[AUTOBYTEUS_STREAM_PARSER_SETTING_KEY]).toBeUndefined();

    const rejectedUpdate = await execGraphql<{ updateServerSetting: string }>(updateMutation, {
      key: AUTOBYTEUS_STREAM_PARSER_SETTING_KEY,
      value: "api_tool_call",
    });
    expect(rejectedUpdate.updateServerSetting).toBe(
      "Error updating server setting: SERVER_SETTING_UPDATE_REJECTED",
    );
    expect(process.env[AUTOBYTEUS_STREAM_PARSER_SETTING_KEY]).toBeUndefined();

    const envFileContents = fs.readFileSync(path.join(tempDir, ".env"), "utf-8");
    expect(envFileContents).not.toContain(`${AUTOBYTEUS_STREAM_PARSER_SETTING_KEY}=`);
    expect(envFileContents).toContain("UNRELATED_SETTING=preserved");
  });

  it("persists and reports the effective live response interval through GraphQL", async () => {
    const query = `
      query GetStreamingContentFlushInterval {
        getEffectiveStreamingContentFlushIntervalMs
        getServerSettings {
          key
          value
          description
          isEditable
          isDeletable
        }
      }
    `;
    const updateMutation = `
      mutation UpdateServerSetting($key: String!, $value: String!) {
        updateServerSetting(key: $key, value: $value)
      }
    `;

    const absent = await execGraphql<{
      getEffectiveStreamingContentFlushIntervalMs: number;
      getServerSettings: Array<{ key: string }>;
    }>(query);
    expect(absent.getEffectiveStreamingContentFlushIntervalMs).toBe(
      DEFAULT_STREAMING_CONTENT_FLUSH_INTERVAL_MS,
    );
    expect(absent.getServerSettings.some(
      (setting) => setting.key === STREAMING_CONTENT_FLUSH_INTERVAL_SETTING_KEY,
    )).toBe(false);
    expect(fs.readFileSync(path.join(tempDir, ".env"), "utf-8")).not.toContain(
      STREAMING_CONTENT_FLUSH_INTERVAL_SETTING_KEY,
    );

    for (const interval of [100, 500, 1_000, 2_000]) {
      const updated = await execGraphql<{ updateServerSetting: string }>(updateMutation, {
        key: STREAMING_CONTENT_FLUSH_INTERVAL_SETTING_KEY,
        value: interval === 500 ? " 0500 " : String(interval),
      });
      expect(updated.updateServerSetting).toContain("updated successfully");

      const current = await execGraphql<{
        getEffectiveStreamingContentFlushIntervalMs: number;
        getServerSettings: Array<{
          key: string;
          value: string;
          description: string;
          isEditable: boolean;
          isDeletable: boolean;
        }>;
      }>(query);
      expect(current.getEffectiveStreamingContentFlushIntervalMs).toBe(interval);
      expect(current.getServerSettings.find(
        (setting) => setting.key === STREAMING_CONTENT_FLUSH_INTERVAL_SETTING_KEY,
      )).toMatchObject({
        value: String(interval),
        description: expect.stringContaining("Recommended default: 500"),
        isEditable: true,
        isDeletable: false,
      });
      expect(process.env[STREAMING_CONTENT_FLUSH_INTERVAL_SETTING_KEY]).toBe(String(interval));
      expect(fs.readFileSync(path.join(tempDir, ".env"), "utf-8")).toContain(
        `${STREAMING_CONTENT_FLUSH_INTERVAL_SETTING_KEY}=${String(interval)}`,
      );
    }

    for (const invalid of ["99", "2001", "500.5", "5e2"]) {
      const rejected = await execGraphql<{ updateServerSetting: string }>(updateMutation, {
        key: STREAMING_CONTENT_FLUSH_INTERVAL_SETTING_KEY,
        value: invalid,
      });
      expect(rejected.updateServerSetting).toContain("whole number from 100 through 2000");
      expect(process.env[STREAMING_CONTENT_FLUSH_INTERVAL_SETTING_KEY]).toBe("2000");
    }

    process.env[STREAMING_CONTENT_FLUSH_INTERVAL_SETTING_KEY] = "invalid-direct-input";
    const invalidDirectInput = await execGraphql<{
      getEffectiveStreamingContentFlushIntervalMs: number;
    }>(query);
    expect(invalidDirectInput.getEffectiveStreamingContentFlushIntervalMs).toBe(
      DEFAULT_STREAMING_CONTENT_FLUSH_INTERVAL_MS,
    );

    const reset = await execGraphql<{ updateServerSetting: string }>(updateMutation, {
      key: STREAMING_CONTENT_FLUSH_INTERVAL_SETTING_KEY,
      value: String(DEFAULT_STREAMING_CONTENT_FLUSH_INTERVAL_MS),
    });
    expect(reset.updateServerSetting).toContain("updated successfully");
    expect(process.env[STREAMING_CONTENT_FLUSH_INTERVAL_SETTING_KEY]).toBe("500");
    expect(fs.readFileSync(path.join(tempDir, ".env"), "utf-8")).toContain(
      `${STREAMING_CONTENT_FLUSH_INTERVAL_SETTING_KEY}=500`,
    );
  });

  it("persists media default model identifiers as predefined GraphQL settings without catalog allow-list validation", async () => {
    const updateMutation = `
      mutation UpdateServerSetting($key: String!, $value: String!) {
        updateServerSetting(key: $key, value: $value)
      }
    `;
    const deleteMutation = `
      mutation DeleteServerSetting($key: String!) {
        deleteServerSetting(key: $key)
      }
    `;
    const listQuery = `
      query GetServerSettings {
        getServerSettings {
          key
          value
          description
          isEditable
          isDeletable
        }
      }
    `;

    const selectedModels = {
      [DEFAULT_IMAGE_EDIT_MODEL_SETTING_KEY]: "nano-banana-pro-app-rpa@host",
      [DEFAULT_IMAGE_GENERATION_MODEL_SETTING_KEY]: "gpt-image-1.5",
      [DEFAULT_SPEECH_GENERATION_MODEL_SETTING_KEY]: "gemini-3.8-flash-tts",
    };

    for (const [key, value] of Object.entries(selectedModels)) {
      const updated = await execGraphql<{ updateServerSetting: string }>(updateMutation, {
        key,
        value,
      });
      expect(updated.updateServerSetting).toContain("updated successfully");
      expect(process.env[key]).toBe(value);
    }

    const listed = await execGraphql<{
      getServerSettings: Array<{
        key: string;
        value: string;
        description: string;
        isEditable: boolean;
        isDeletable: boolean;
      }>;
    }>(listQuery);

    for (const [key, value] of Object.entries(selectedModels)) {
      const setting = listed.getServerSettings.find((entry) => entry.key === key);
      expect(setting).toMatchObject({
        value,
        isEditable: true,
        isDeletable: false,
      });
      expect(setting?.description).toContain("future");
      expect(setting?.description).not.toBe("Custom user-defined setting");

      const deleteResult = await execGraphql<{ deleteServerSetting: string }>(deleteMutation, { key });
      expect(deleteResult.deleteServerSetting).toContain("managed by the system");
    }

    const envFileContents = fs.readFileSync(path.join(tempDir, ".env"), "utf-8");
    for (const [key, value] of Object.entries(selectedModels)) {
      expect(envFileContents).toContain(`${key}=${value}`);
    }
  });

  it("lists effective Codex sandbox values with predefined metadata even when not persisted", async () => {
    process.env[CODEX_APP_SERVER_SANDBOX_SETTING_KEY] = "read-only";
    const listQuery = `
      query GetServerSettings {
        getServerSettings {
          key
          value
          description
          isEditable
          isDeletable
        }
      }
    `;

    const listed = await execGraphql<{
      getServerSettings: Array<{
        key: string;
        value: string;
        description: string;
        isEditable: boolean;
        isDeletable: boolean;
      }>;
    }>(listQuery);

    const codexSandboxSetting = listed.getServerSettings.find(
      (entry) => entry.key === CODEX_APP_SERVER_SANDBOX_SETTING_KEY,
    );
    expect(codexSandboxSetting).toMatchObject({
      value: "read-only",
      isEditable: true,
      isDeletable: false,
    });
    expect(codexSandboxSetting?.description).toContain(
      "future sessions",
    );
    expect(codexSandboxSetting?.description).not.toBe("Custom user-defined setting");
    expect(fs.readFileSync(path.join(tempDir, ".env"), "utf-8")).not.toContain(
      CODEX_APP_SERVER_SANDBOX_SETTING_KEY,
    );
  });

  const initializeOwnedSettingsConfig = () => {
    // Durable writes require the same initialized AppConfig used by the server.
    process.env.APP_ENV = "test";
    process.env.DB_TYPE = "sqlite";
    process.env.DATABASE_URL = `file:${path.join(tempDir, "db", "test.db")}`;
    process.env.AUTOBYTEUS_MEMORY_DIR = path.join(tempDir, "memory");
    appConfigProvider.config.initialize();
  };

  it("keeps a compaction-model value saved before its removal inert, deletable, and not a compaction setting", async () => {
    initializeOwnedSettingsConfig();
    const leftover = JSON.stringify({ modelIdentifier: "old-compaction-model", llmConfig: null });
    fs.appendFileSync(path.join(tempDir, ".env"), `\n${COMPACTION_MODEL_SETTINGS_KEY}='${leftover}'\n`);
    // Restart from the persisted file: startup is unaffected by the leftover value.
    appConfigProvider.resetForTests();
    delete process.env[COMPACTION_MODEL_SETTINGS_KEY];
    appConfigProvider.config.setCustomAppDataDir(tempDir);
    initializeOwnedSettingsConfig();
    const query = `{ getServerSettings { key value description isEditable isDeletable } }`;
    const listed = await execGraphql<{ getServerSettings: Array<{ key: string; value: string; description: string; isEditable: boolean; isDeletable: boolean }> }>(query);
    const current = listed.getServerSettings.find(item => item.key === COMPACTION_MODEL_SETTINGS_KEY);
    expect(current).toMatchObject({ value: leftover, description: "Custom user-defined setting", isEditable: true, isDeletable: true });
    expect(current!.description).not.toMatch(/compaction/i);

    const deleted = await execGraphql<{ deleteServerSetting: string }>(
      `mutation Delete($key: String!) { deleteServerSetting(key: $key) }`, { key: COMPACTION_MODEL_SETTINGS_KEY },
    );
    expect(deleted.deleteServerSetting).not.toContain("managed by the system");
    expect(fs.readFileSync(path.join(tempDir, ".env"), "utf8")).not.toContain(COMPACTION_MODEL_SETTINGS_KEY);
    expect(schema.getQueryType()?.getFields()).not.toHaveProperty("getWorkingContextCompactionStrategies");
    expect(schema.getQueryType()?.getFields()).not.toHaveProperty("getEffectiveWorkingContextCompactionStrategyId");
  });

  it("saves the numeric compaction context ceiling through ordinary settings", async () => {
    const key = "AUTOBYTEUS_ACTIVE_CONTEXT_TOKENS_OVERRIDE";
    const originalValue = process.env[key];
    delete process.env[key];
    try {
      initializeOwnedSettingsConfig();
      const updated = await execGraphql<{ updateServerSetting: string }>(
        `mutation Set($key: String!, $value: String!) { updateServerSetting(key: $key, value: $value) }`,
        { key, value: "16000" },
      );
      expect(updated.updateServerSetting).toContain("updated successfully");
      const listed = await execGraphql<{
        getServerSettings: Array<{ key: string; value: string; isEditable: boolean }>;
      }>("{ getServerSettings { key value isEditable } }");
      expect(listed.getServerSettings.find(setting => setting.key === key)).toMatchObject({
        value: "16000", isEditable: true,
      });
    } finally {
      if (originalValue === undefined) delete process.env[key];
      else process.env[key] = originalValue;
    }
  });

  it("keeps credential-like settings out of the ordinary numeric-control write path", async () => {
    initializeOwnedSettingsConfig();
    const updated = await execGraphql<{ updateServerSetting: string }>(
      `mutation Set($key: String!, $value: String!) { updateServerSetting(key: $key, value: $value) }`,
      { key: "API5_SYNTHETIC_API_KEY", value: "not-a-real-credential" },
    );
    expect(updated.updateServerSetting).toContain("write-only credential editor");
    expect(appConfigProvider.config.get("API5_SYNTHETIC_API_KEY")).toBeUndefined();
    expect(fs.readFileSync(path.join(tempDir, ".env"), "utf8")).not.toContain("API5_SYNTHETIC_API_KEY");
  });

});
