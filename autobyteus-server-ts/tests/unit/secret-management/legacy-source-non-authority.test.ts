import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AppConfig, AppConfigError } from "../../../src/config/app-config.js";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import {
  CustomLlmProviderStore,
  CustomLlmProviderStoreError,
} from "../../../src/llm-management/llm-providers/stores/custom-llm-provider-store.js";
import { LOCAL_IMPORT_CREDENTIAL_ALIAS_NAMES } from "../../../src/secret-management/provisioning/local-import-credential-alias-registry.js";

const MANAGED_CREDENTIAL_NAMES = [
  ...LOCAL_IMPORT_CREDENTIAL_ALIAS_NAMES,
  "QWEN_API_KEY",
  "ZHIPU_API_KEY",
  "OLLAMA_API_KEY",
  "GOOGLE_CSE_API_KEY",
  "CLAUDE_CODE_API_KEY",
  "CLAUDE_CODE_API_KEY_FILE_DESCRIPTOR",
] as const;

const MUTATED_ENVIRONMENT_KEYS = [
  ...MANAGED_CREDENTIAL_NAMES,
  "AUTOBYTEUS_SERVER_HOST",
  "APP_ENV",
  "DB_TYPE",
  "DATABASE_URL",
  "AUTOBYTEUS_MEMORY_DIR",
  "LOG_LEVEL",
] as const;

describe("legacy source non-authority", () => {
  let root: string;
  const originalParentValues = new Map<string, string | undefined>();

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), "legacy-source-non-authority-"));
    for (const key of MUTATED_ENVIRONMENT_KEYS) {
      originalParentValues.set(key, process.env[key]);
      delete process.env[key];
    }
    appConfigProvider.resetForTests();
  });

  afterEach(async () => {
    appConfigProvider.resetForTests();
    for (const key of MUTATED_ENVIRONMENT_KEYS) {
      const previous = originalParentValues.get(key);
      if (previous === undefined) delete process.env[key];
      else process.env[key] = previous;
    }
    originalParentValues.clear();
    await fs.rm(root, { recursive: true, force: true });
  });

  it("preserves full dotenv projection while rejecting generic managed-credential writes", async () => {
    const configPath = path.join(root, ".env");
    const source = Buffer.from([
      "AUTOBYTEUS_SERVER_HOST=http://localhost:8000",
      "APP_ENV=test",
      "DB_TYPE=sqlite",
      "OPENAI_API_KEY=synthetic-file-openai",
      "DASHSCOPE_API_KEY=synthetic-file-qwen",
      "",
    ].join("\r\n"));
    await fs.writeFile(configPath, source);

    const config = new AppConfig({ appDataDir: root });
    config.initialize();

    expect(await fs.readFile(configPath)).toEqual(source);
    expect(config.get("OPENAI_API_KEY")).toBe("synthetic-file-openai");
    expect(config.get("DASHSCOPE_API_KEY")).toBe("synthetic-file-qwen");
    expect(config.getConfigData()).toEqual(expect.objectContaining({
      OPENAI_API_KEY: "synthetic-file-openai",
      DASHSCOPE_API_KEY: "synthetic-file-qwen",
    }));
    expect(process.env.OPENAI_API_KEY).toBe("synthetic-file-openai");
    expect(process.env.DASHSCOPE_API_KEY).toBe("synthetic-file-qwen");

    expect(() => config.set("OPENAI_API_KEY", "synthetic-replacement")).toThrow(AppConfigError);
    expect(() => config.delete("OPENAI_API_KEY")).toThrow(AppConfigError);
    expect(await fs.readFile(configPath)).toEqual(source);
  });

  it("keeps the current provider store v2-only without interpreting custom-provider v1", async () => {
    const providerDirectory = path.join(root, "llm");
    const providerPath = path.join(providerDirectory, "custom-llm-providers.json");
    await fs.mkdir(providerDirectory, { recursive: true });
    const source = Buffer.from(JSON.stringify({
      version: 1,
      providers: [{
        id: "provider_synthetic",
        name: "Synthetic Legacy Provider",
        providerType: "OPENAI_COMPATIBLE",
        baseUrl: "https://synthetic.invalid/v1",
        apiKey: "synthetic-legacy-provider-value",
      }],
    }, null, 2));
    await fs.writeFile(providerPath, source);
    appConfigProvider.initialize({ appDataDir: root });

    const error = await new CustomLlmProviderStore().listProviders().catch((caught) => caught);

    expect(error).toBeInstanceOf(CustomLlmProviderStoreError);
    expect(error.toJSON()).toEqual({ code: "CUSTOM_PROVIDER_CONFIG_INVALID" });
    expect(JSON.stringify(error)).not.toContain("synthetic-legacy-provider-value");
    expect(await fs.readFile(providerPath)).toEqual(source);
    await expect(fs.stat(path.join(root, "migrations"))).rejects.toMatchObject({ code: "ENOENT" });
    await expect(fs.stat(path.join(root, "secret-store"))).rejects.toMatchObject({ code: "ENOENT" });
  });
});
