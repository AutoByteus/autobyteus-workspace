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
  AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID,
  DEFAULT_IMAGE_EDIT_MODEL_SETTING_KEY,
  DEFAULT_IMAGE_GENERATION_MODEL_SETTING_KEY,
  DEFAULT_SPEECH_GENERATION_MODEL_SETTING_KEY,
} from "../../../src/services/server-settings-service.js";
import {
  CODEX_APP_SERVER_SANDBOX_SETTING_KEY,
  CODEX_SANDBOX_MODES,
} from "../../../src/runtime-management/codex/codex-sandbox-mode-setting.js";

describe("Server settings GraphQL e2e", () => {
  let schema: GraphQLSchema;
  let graphql: typeof graphqlFn;
  let tempDir: string;
  let originalServerHostEnv: string | undefined;
  let originalCodexSandboxEnv: string | undefined;
  let originalCompactionAgentEnv: string | undefined;
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
    originalCompactionAgentEnv = process.env[AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID];
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
    delete process.env[AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID];
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
    if (originalCompactionAgentEnv === undefined) {
      delete process.env[AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID];
    } else {
      process.env[AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID] = originalCompactionAgentEnv;
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

  it("persists the selected compactor agent definition id as a predefined GraphQL setting", async () => {
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

    const selectedDefinitionId = "memory-compactor-agent";
    const updated = await execGraphql<{ updateServerSetting: string }>(updateMutation, {
      key: AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID,
      value: selectedDefinitionId,
    });
    expect(updated.updateServerSetting).toContain("updated successfully");
    expect(process.env[AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID]).toBe(selectedDefinitionId);

    const listed = await execGraphql<{
      getServerSettings: Array<{
        key: string;
        value: string;
        description: string;
        isEditable: boolean;
        isDeletable: boolean;
      }>;
    }>(listQuery);

    const compactorSetting = listed.getServerSettings.find(
      (entry) => entry.key === AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID,
    );
    expect(compactorSetting).toMatchObject({
      value: selectedDefinitionId,
      isEditable: true,
      isDeletable: false,
    });
    expect(compactorSetting?.description).toContain("memory compactor agent");
    expect(compactorSetting?.description).not.toBe("Custom user-defined setting");
    expect(
      listed.getServerSettings.find(
        (entry) => entry.key === "AUTOBYTEUS_COMPACTION_MODEL_IDENTIFIER",
      ),
    ).toBeUndefined();

    const envFileContents = fs.readFileSync(path.join(tempDir, ".env"), "utf-8");
    expect(envFileContents).toContain(
      `${AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID}=${selectedDefinitionId}`,
    );
    expect(envFileContents).not.toContain("AUTOBYTEUS_COMPACTION_MODEL_IDENTIFIER=");
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
});
