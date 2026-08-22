import fs from "node:fs/promises";
import path from "node:path";
import type { AppConfig } from "../../config/app-config.js";
import { createApplicationDefinitionServices } from "../runtime/create-application-definition-services.js";
import { ApplicationExecutionResourceResolver } from "../../application-orchestration/services/application-execution-resource-resolver.js";
import { runtimeKindFromString } from "../../runtime-management/runtime-kind-enum.js";
import {
  StandaloneApplicationSelectionService,
} from "../../standalone-application-host/services/standalone-application-selection-service.js";
import type { StandaloneApplicationHostConfig } from "../../standalone-application-host/config/standalone-application-host-config.js";
import { ApplicationLaunchResourceBaselineBuilder } from "./application-launch-resource-baseline-builder.js";
import { ApplicationPortableLaunchConfigPolicy } from "./application-portable-launch-config-policy.js";

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

const validatePortableDefaultConfigFile = async (
  filePath: string,
  policy: ApplicationPortableLaunchConfigPolicy,
): Promise<void> => {
  const raw = JSON.parse(await fs.readFile(filePath, "utf8")) as Record<string, unknown>;
  const defaultConfig = raw.defaultLaunchConfig;
  if (defaultConfig === undefined || defaultConfig === null) return;
  policy.assertPortableDefaultLaunchConfig(
    defaultConfig,
    `defaultLaunchConfig in '${filePath}'`,
  );
  const record = defaultConfig as Record<string, unknown>;
  const runtimeKind = typeof record.runtimeKind === "string"
    ? runtimeKindFromString(record.runtimeKind)
    : null;
  if (runtimeKind && record.llmConfig != null) {
    policy.assertPortableLlmConfig({
      runtimeKind,
      llmConfig: record.llmConfig as Record<string, unknown>,
      path: `defaultLaunchConfig.llmConfig in '${filePath}'`,
    });
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
  const portableConfigPolicy = new ApplicationPortableLaunchConfigPolicy();
  await visitConfigFiles(
    selectionResult.selection.applicationRoot,
    (filePath) => validatePortableDefaultConfigFile(filePath, portableConfigPolicy),
  );

  const definitionServices = createApplicationDefinitionServices({
    appConfig: createReadOnlyDefinitionConfig(packageRoot),
    bundleService: selectionResult.bundleService,
  });
  const resolver = new ApplicationExecutionResourceResolver({
    applicationBundleService: selectionResult.bundleService,
    ...definitionServices,
  });
  const baselineBuilder = new ApplicationLaunchResourceBaselineBuilder({
    executionResourceResolver: resolver,
    ...definitionServices,
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
      provenance: "PACKAGE",
    });
    for (const leaf of baseline.leaves) {
      const runtimeKind = runtimeKindFromString(leaf.runtimeKind);
      if (!runtimeKind) {
        throw new Error(
          `Application slot '${slot.slotKey}' has unknown package runtime '${leaf.runtimeKind}'.`,
        );
      }
      if (!leaf.llmModelIdentifier) {
        throw new Error(
          `Application slot '${slot.slotKey}' leaf '${leaf.memberAddress ?? leaf.agentDefinitionId}' has no package llmModelIdentifier default.`,
        );
      }
      portableConfigPolicy.assertPortableLlmConfig({
        runtimeKind,
        llmConfig: leaf.llmConfig,
        path: `Application slot '${slot.slotKey}' leaf '${leaf.memberAddress ?? leaf.agentDefinitionId}'.llmConfig`,
      });
    }
  }
  return Object.freeze({
    selection: selectionResult.selection,
    bundleService: selectionResult.bundleService,
  });
};
