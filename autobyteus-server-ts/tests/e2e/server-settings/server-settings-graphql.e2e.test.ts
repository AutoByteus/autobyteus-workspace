import "reflect-metadata";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { graphql as graphqlFn, GraphQLSchema } from "graphql";
import { LLMRequestAssembler } from "autobyteus-ts/agent/llm-request-assembler.js";
import { BasePromptRenderer } from "autobyteus-ts/llm/prompt-renderers/base-prompt-renderer.js";
import { Message, MessageRole } from "autobyteus-ts/llm/utils/messages.js";
import { CompactionRuntimeSettingsResolver } from "autobyteus-ts/memory/compaction/compaction-runtime-settings.js";
import { defaultWorkingContextCompactionStrategyRegistry } from "autobyteus-ts/memory/compaction/default-working-context-compaction-strategy-registry.js";
import { PendingCompactionExecutor } from "autobyteus-ts/memory/compaction/pending-compaction-executor.js";
import { AUTOBYTEUS_COMPACTION_STRATEGY } from "autobyteus-ts/memory/compaction/working-context-compaction-strategy-setting.js";
import { WorkingContextCompactionStrategyResolver } from "autobyteus-ts/memory/compaction/working-context-compaction-strategy-resolver.js";
import type { CompactionLineageScope } from "autobyteus-ts/memory/lineage/compaction-lineage-scope.js";
import { MemoryManager } from "autobyteus-ts/memory/memory-manager.js";
import { RawTraceItem } from "autobyteus-ts/memory/models/raw-trace-item.js";
import { FileCompactionLineageStore } from "autobyteus-ts/memory/store/file-compaction-lineage-store.js";
import { FileMemoryStore } from "autobyteus-ts/memory/store/file-store.js";
import { WorkingContextSnapshotStore } from "autobyteus-ts/memory/store/working-context-snapshot-store.js";
import {
  createNaturalUserMessageProvenance,
  WorkingContextFinalizer,
} from "autobyteus-ts/memory/working-context-finalizer.js";
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
import {
  DEFAULT_STREAMING_CONTENT_FLUSH_INTERVAL_MS,
  STREAMING_CONTENT_FLUSH_INTERVAL_SETTING_KEY,
} from "../../../src/config/streaming-content-flush-interval-setting.js";
import { WORKING_CONTEXT_COMPACTION_STRATEGY_SETTING_KEY } from "../../../src/config/working-context-compaction-strategy-setting.js";

const AUTOBYTEUS_STREAM_PARSER_SETTING_KEY = "AUTOBYTEUS_STREAM_PARSER";

class RecordingPromptRenderer extends BasePromptRenderer {
  async render(messages: Message[]): Promise<Array<Record<string, unknown>>> {
    return messages.map((message) => ({ role: message.role, content: message.content }));
  }
}

describe("Server settings GraphQL e2e", () => {
  let schema: GraphQLSchema;
  let graphql: typeof graphqlFn;
  let tempDir: string;
  let originalServerHostEnv: string | undefined;
  let originalCodexSandboxEnv: string | undefined;
  let originalCompactionStrategyEnv: string | undefined;
  let originalFeaturedCatalogItemsEnv: string | undefined;
  let originalStreamParserEnv: string | undefined;
  let originalStreamingContentFlushIntervalEnv: string | undefined;
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
    originalServerHostEnv = process.env.AUTOBYTEUS_SERVER_HOST;
    originalCodexSandboxEnv = process.env[CODEX_APP_SERVER_SANDBOX_SETTING_KEY];
    originalCompactionStrategyEnv = process.env[AUTOBYTEUS_COMPACTION_STRATEGY];
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
    delete process.env[AUTOBYTEUS_COMPACTION_STRATEGY];
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
    if (originalCompactionStrategyEnv === undefined) {
      delete process.env[AUTOBYTEUS_COMPACTION_STRATEGY];
    } else {
      process.env[AUTOBYTEUS_COMPACTION_STRATEGY] = originalCompactionStrategyEnv;
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
      [DEFAULT_SPEECH_GENERATION_MODEL_SETTING_KEY]: "gemini-2.5-flash-tts",
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

  it("exposes the production compaction strategy catalog and effective default without persisting it", async () => {
    const strategyQuery = `
      query GetWorkingContextCompactionStrategyState {
        getWorkingContextCompactionStrategies {
          id
          name
        }
        getEffectiveWorkingContextCompactionStrategyId
      }
    `;

    const result = await execGraphql<{
      getWorkingContextCompactionStrategies: Array<{ id: string; name: string }>;
      getEffectiveWorkingContextCompactionStrategyId: string;
    }>(strategyQuery);

    expect(result).toEqual({
      getWorkingContextCompactionStrategies: [
        { id: "structured-json", name: "Structured JSON" },
      ],
      getEffectiveWorkingContextCompactionStrategyId: "structured-json",
    });
    expect(process.env[AUTOBYTEUS_COMPACTION_STRATEGY]).toBeUndefined();
    expect(fs.readFileSync(path.join(tempDir, ".env"), "utf8")).not.toContain(
      AUTOBYTEUS_COMPACTION_STRATEGY,
    );
  });

  it("persists a registered global compaction strategy and selects it for an existing runtime's next operation", async () => {
    const testStrategyId = "graphql-test-direct";
    if (!defaultWorkingContextCompactionStrategyRegistry.get(testStrategyId)) {
      defaultWorkingContextCompactionStrategyRegistry.register({
        id: testStrategyId,
        name: "GraphQL Test Direct",
        create: () => ({
          id: testStrategyId,
          name: "GraphQL Test Direct",
          propose: async () => ({
            selectedNewRawTraceIds: ["settings-raw-1"],
            retainedMessages: [],
            output: {
              episodes: [{ summary: "selected by GraphQL update" }],
              semanticEntries: [],
            },
            execution: {
              runtimeKind: "autobyteus",
              provider: "test-provider",
              modelIdentifier: "test-model",
              taskId: "settings-compaction-task",
              renderedInputSha256: "a".repeat(64),
            },
          }),
        }),
      });
    }

    const agentId = "existing-runtime-agent";
    const scope: CompactionLineageScope = {
      targetKind: "agent_run",
      runId: agentId,
      memberId: null,
    };
    const memoryStore = new FileMemoryStore(
      path.join(tempDir, "existing-runtime-memory"),
      agentId,
    );
    const lineageStore = new FileCompactionLineageStore(memoryStore.agentDir, scope);
    const snapshotStore = new WorkingContextSnapshotStore(
      path.join(tempDir, "existing-runtime-memory"),
      agentId,
    );
    memoryStore.add([new RawTraceItem({
      id: "settings-raw-1",
      ts: 1,
      turnId: "turn-before-setting-update",
      seq: 1,
      traceType: "user",
      content: "old context",
      sourceEvent: "api-e2e",
    })]);
    const initialContext = new WorkingContextFinalizer().finalize({
      messages: [
        new Message(MessageRole.SYSTEM, { content: "System" }),
        createNaturalUserMessageProvenance(
          new Message(MessageRole.USER, { content: "old context" }),
          {
            kind: "current_user",
            rawTraceIds: ["settings-raw-1"],
            turnId: "turn-before-setting-update",
          },
        ),
      ],
    });
    const manager = new MemoryManager({
      store: memoryStore,
      lineageStore,
      lineageScope: scope,
      workingContextSnapshotStore: snapshotStore,
      workingContext: initialContext,
      agentId,
    });
    manager.persistWorkingContextSnapshot();
    manager.requestCompaction("turn-before-setting-update");
    const strategyResolver = new WorkingContextCompactionStrategyResolver({
      registry: defaultWorkingContextCompactionStrategyRegistry,
      settingsResolver: new CompactionRuntimeSettingsResolver(),
      constructionContext: {
        agentId,
        compactionAgentRunner: null,
        inputBudgetTokens: 100,
        maxItemChars: 200,
        diagnostics: null,
      },
    });
    const assembler = new LLMRequestAssembler(
      manager,
      new RecordingPromptRenderer(),
      new PendingCompactionExecutor(manager, { strategyResolver }),
    );

    const updateMutation = `
      mutation UpdateServerSetting($key: String!, $value: String!) {
        updateServerSetting(key: $key, value: $value)
      }
    `;
    const updated = await execGraphql<{ updateServerSetting: string }>(updateMutation, {
      key: WORKING_CONTEXT_COMPACTION_STRATEGY_SETTING_KEY,
      value: `  ${testStrategyId}  `,
    });
    expect(updated.updateServerSetting).toContain("updated successfully");
    expect(process.env[AUTOBYTEUS_COMPACTION_STRATEGY]).toBe(testStrategyId);
    expect(fs.readFileSync(path.join(tempDir, ".env"), "utf8")).toContain(
      `${AUTOBYTEUS_COMPACTION_STRATEGY}=${testStrategyId}`,
    );

    const request = await assembler.prepareRequest(
      "after GraphQL update",
      {
        turnId: "turn-after-setting-update",
        requestId: "turn-after-setting-update:llm:1",
      },
      "System",
    );
    expect(request.didCompact).toBe(true);
    expect(request.canonicalMessages).toHaveLength(2);
    expect(request.canonicalMessages[0]?.content).toBe("System");
    expect(request.canonicalMessages[1]?.content).toContain("selected by GraphQL update");
    expect(request.canonicalMessages[1]?.content).toContain("after GraphQL update");
    expect(request.renderedPayload).toEqual([
      { role: MessageRole.SYSTEM, content: "System" },
      {
        role: MessageRole.USER,
        content: expect.stringContaining("selected by GraphQL update"),
      },
    ]);
    expect(lineageStore.readHead()).toMatchObject({
      scope,
      execution: {
        runtimeKind: "autobyteus",
        provider: "test-provider",
        model: "test-model",
      },
    });

    const invalid = await execGraphql<{ updateServerSetting: string }>(updateMutation, {
      key: WORKING_CONTEXT_COMPACTION_STRATEGY_SETTING_KEY,
      value: "unknown-strategy",
    });
    expect(invalid.updateServerSetting).toContain("must be one of");
    expect(process.env[AUTOBYTEUS_COMPACTION_STRATEGY]).toBe(testStrategyId);
    expect(fs.readFileSync(path.join(tempDir, ".env"), "utf8")).not.toContain(
      `${AUTOBYTEUS_COMPACTION_STRATEGY}=unknown-strategy`,
    );
  });
});
