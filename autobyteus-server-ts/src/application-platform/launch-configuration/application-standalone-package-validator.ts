import fs from "node:fs/promises";
import path from "node:path";
import type { AppConfig } from "../../config/app-config.js";
import { createApplicationDefinitionServices } from "../runtime/create-application-definition-services.js";
import { ApplicationExecutionResourceResolver } from "../../application-orchestration/services/application-execution-resource-resolver.js";
import {
  RuntimeKind,
  runtimeKindFromString,
} from "../../runtime-management/runtime-kind-enum.js";
import {
  StandaloneApplicationSelectionService,
} from "../../standalone-application-host/services/standalone-application-selection-service.js";
import type { StandaloneApplicationHostConfig } from "../../standalone-application-host/config/standalone-application-host-config.js";
import { ApplicationLaunchPackageBaselineBuilder } from "./application-launch-package-baseline-builder.js";

const DEFAULT_CONFIG_KEYS = new Set([
  "runtimeKind",
  "llmModelIdentifier",
  "llmConfig",
]);
const CODEX_CONFIG_KEYS = new Set(["reasoning_effort", "service_tier"]);
const CLAUDE_CONFIG_KEYS = new Set(["thinking_enabled", "reasoning_effort"]);
const AUTOBYTEUS_CONFIG_KEYS = new Set([
  "rate_limit",
  "token_limit",
  "system_message",
  "temperature",
  "max_tokens",
  "compaction_ratio",
  "safety_margin_tokens",
  "top_p",
  "frequency_penalty",
  "presence_penalty",
  "stop_sequences",
  "extra_params",
  "pricing_config",
]);
const FORBIDDEN_PORTABLE_KEY_FRAGMENTS = [
  "credential",
  "secret",
  "apikey",
  "endpoint",
  "baseurl",
  "workspace",
];

const createReadOnlyDefinitionConfig = (packageRoot: string): AppConfig => ({
  getAgentsDir: () => path.join(packageRoot, ".validation-only", "agents"),
  getAgentTeamsDir: () => path.join(packageRoot, ".validation-only", "agent-teams"),
  getAdditionalAgentPackageRoots: () => [],
}) as unknown as AppConfig;

const visitConfigFiles = async (
  directory: string,
  visitor: (filePath: string) => Promise<void>,
): Promise<void> => {
  const entries = await fs.readdir(directory, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    const nextPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await visitConfigFiles(nextPath, visitor);
    } else if (entry.name === "agent-config.json" || entry.name === "team-config.json") {
      await visitor(nextPath);
    }
  }
};

const assertNoForbiddenPortableKeys = (value: unknown, fieldName: string): void => {
  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      assertNoForbiddenPortableKeys(entry, `${fieldName}[${index}]`));
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    const normalizedKey = key.replace(/[^a-z0-9]/gi, "").toLowerCase();
    if (
      FORBIDDEN_PORTABLE_KEY_FRAGMENTS.some((fragment) => normalizedKey.includes(fragment))
      || normalizedKey.endsWith("token")
    ) {
      throw new Error(`${fieldName} contains host-only field '${key}'.`);
    }
    assertNoForbiddenPortableKeys(entry, `${fieldName}.${key}`);
  }
};

const validatePortableLlmConfig = (input: {
  runtimeKind: RuntimeKind;
  llmConfig: Record<string, unknown> | null;
  label: string;
}): void => {
  if (!input.llmConfig) return;
  const allowedKeys = input.runtimeKind === RuntimeKind.CODEX_APP_SERVER
    ? CODEX_CONFIG_KEYS
    : input.runtimeKind === RuntimeKind.CLAUDE_AGENT_SDK
      ? CLAUDE_CONFIG_KEYS
      : AUTOBYTEUS_CONFIG_KEYS;
  const unknown = Object.keys(input.llmConfig).find((key) => !allowedKeys.has(key));
  if (unknown) {
    throw new Error(
      `${input.label} llmConfig key '${unknown}' is not portable for runtime '${input.runtimeKind}'.`,
    );
  }
  assertNoForbiddenPortableKeys(input.llmConfig, `${input.label}.llmConfig`);
  if (
    input.llmConfig.reasoning_effort !== undefined
    && (typeof input.llmConfig.reasoning_effort !== "string"
      || !input.llmConfig.reasoning_effort.trim())
  ) {
    throw new Error(`${input.label}.llmConfig.reasoning_effort must be a non-empty string.`);
  }
  if (
    input.llmConfig.service_tier !== undefined
    && input.llmConfig.service_tier !== "fast"
  ) {
    throw new Error(`${input.label}.llmConfig.service_tier must be 'fast'.`);
  }
  if (
    input.llmConfig.thinking_enabled !== undefined
    && typeof input.llmConfig.thinking_enabled !== "boolean"
  ) {
    throw new Error(`${input.label}.llmConfig.thinking_enabled must be a boolean.`);
  }
};

const validatePortableDefaultConfigFile = async (filePath: string): Promise<void> => {
  const raw = JSON.parse(await fs.readFile(filePath, "utf8")) as Record<string, unknown>;
  const defaultConfig = raw.defaultLaunchConfig;
  if (defaultConfig === undefined || defaultConfig === null) return;
  if (!defaultConfig || typeof defaultConfig !== "object" || Array.isArray(defaultConfig)) {
    throw new Error(`defaultLaunchConfig in '${filePath}' must be an object.`);
  }
  const record = defaultConfig as Record<string, unknown>;
  const unsupported = Object.keys(record).find((key) => !DEFAULT_CONFIG_KEYS.has(key));
  if (unsupported) {
    throw new Error(
      `defaultLaunchConfig in '${filePath}' contains forbidden host field '${unsupported}'.`,
    );
  }
  if (record.llmConfig !== undefined && record.llmConfig !== null) {
    if (!record.llmConfig || typeof record.llmConfig !== "object" || Array.isArray(record.llmConfig)) {
      throw new Error(`defaultLaunchConfig.llmConfig in '${filePath}' must be an object.`);
    }
    assertNoForbiddenPortableKeys(
      record.llmConfig,
      `defaultLaunchConfig.llmConfig in '${filePath}'`,
    );
  }
};

export const validateStandaloneApplicationPackage = async (input: {
  packageRoot: string;
  localApplicationId: string;
}) => {
  const packageRoot = path.resolve(input.packageRoot);
  const localApplicationId = input.localApplicationId.trim();
  if (!localApplicationId) throw new Error("localApplicationId is required.");
  const selectionResult = await new StandaloneApplicationSelectionService().resolve({
    packageRoot,
    localApplicationId,
  } as StandaloneApplicationHostConfig);
  await visitConfigFiles(selectionResult.selection.applicationRoot, validatePortableDefaultConfigFile);

  const definitionServices = createApplicationDefinitionServices({
    appConfig: createReadOnlyDefinitionConfig(packageRoot),
    bundleService: selectionResult.bundleService,
  });
  const resolver = new ApplicationExecutionResourceResolver({
    applicationBundleService: selectionResult.bundleService,
    ...definitionServices,
  });
  const baselineBuilder = new ApplicationLaunchPackageBaselineBuilder({
    executionResourceResolver: resolver,
    ...definitionServices,
    resolveWorkspaceRootPath: () => path.join(packageRoot, ".validation-only", "runtime"),
  });
  for (const slot of selectionResult.selection.bundle.executionResourceSlots) {
    const defaultRef = slot.defaultExecutionResourceRef ?? null;
    if (!defaultRef) {
      if (slot.required) {
        throw new Error(`Required application slot '${slot.slotKey}' has no package default.`);
      }
      continue;
    }
    if (defaultRef.source !== "bundle") {
      throw new Error(`Application slot '${slot.slotKey}' package default must be bundle-owned.`);
    }
    const baseline = await baselineBuilder.build({
      applicationId: selectionResult.selection.applicationId,
      slot,
      executionResourceRef: defaultRef,
    });
    for (const leaf of baseline.leaves) {
      const runtimeKind = runtimeKindFromString(leaf.runtimeKind);
      if (!runtimeKind) {
        throw new Error(
          `Application slot '${slot.slotKey}' has unknown package runtime '${leaf.runtimeKind}'.`,
        );
      }
      validatePortableLlmConfig({
        runtimeKind,
        llmConfig: leaf.llmConfig,
        label: `Application slot '${slot.slotKey}' leaf '${leaf.memberRouteKey ?? leaf.agentDefinitionId}'`,
      });
    }
  }
  return Object.freeze({
    selection: selectionResult.selection,
    bundleService: selectionResult.bundleService,
  });
};
