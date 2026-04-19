import fs from "node:fs";
import path from "node:path";
import {
  APPLICATION_BACKEND_BUNDLE_CONTRACT_VERSION_V1,
  APPLICATION_BACKEND_DEFINITION_CONTRACT_VERSION_V2,
  APPLICATION_FRONTEND_SDK_CONTRACT_VERSION_V2,
  type ApplicationBackendBundleManifestV1,
} from "@autobyteus/application-sdk-contracts";
import type { ApplicationBackendBundle } from "../domain/models.js";

export class ApplicationBackendManifestParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApplicationBackendManifestParseError";
  }
}

const normalizeRequiredString = (value: unknown, fieldName: string): string => {
  if (typeof value !== "string") {
    throw new ApplicationBackendManifestParseError(`${fieldName} must be a string.`);
  }
  const normalized = value.trim();
  if (!normalized) {
    throw new ApplicationBackendManifestParseError(`${fieldName} is required.`);
  }
  return normalized;
};

const normalizeOptionalString = (value: unknown): string | null => {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value !== "string") {
    throw new ApplicationBackendManifestParseError("Optional backend path fields must be strings when provided.");
  }
  const normalized = value.trim();
  return normalized ? normalized : null;
};

const normalizeBackendRelativePath = (
  bundleRootPath: string,
  rawPath: unknown,
  fieldName: string,
): string => {
  const relativePath = normalizeRequiredString(rawPath, fieldName).replace(/\\/g, "/");
  if (relativePath.startsWith("/") || path.isAbsolute(relativePath)) {
    throw new ApplicationBackendManifestParseError(`${fieldName} must be a relative path inside backend/.`);
  }

  const resolved = path.resolve(bundleRootPath, relativePath);
  const normalizedBundleRoot = path.resolve(bundleRootPath);
  if (resolved !== normalizedBundleRoot && !resolved.startsWith(`${normalizedBundleRoot}${path.sep}`)) {
    throw new ApplicationBackendManifestParseError(`${fieldName} must stay inside the application bundle.`);
  }

  const normalizedRelative = path.relative(normalizedBundleRoot, resolved).replace(/\\/g, "/");
  if (!normalizedRelative.startsWith("backend/")) {
    throw new ApplicationBackendManifestParseError(`${fieldName} must point under backend/.`);
  }
  return normalizedRelative;
};

const normalizeOptionalBackendRelativePath = (
  bundleRootPath: string,
  rawPath: unknown,
  fieldName: string,
): string | null => {
  const normalized = normalizeOptionalString(rawPath);
  if (!normalized) {
    return null;
  }
  return normalizeBackendRelativePath(bundleRootPath, normalized, fieldName);
};

const normalizeBooleanRecord = (
  value: unknown,
  fieldName: string,
): ApplicationBackendBundleManifestV1["supportedExposures"] => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ApplicationBackendManifestParseError(`${fieldName} must be an object.`);
  }
  const record = value as Record<string, unknown>;
  const readFlag = (key: keyof ApplicationBackendBundleManifestV1["supportedExposures"]): boolean => {
    if (typeof record[key] !== "boolean") {
      throw new ApplicationBackendManifestParseError(`${fieldName}.${key} must be a boolean.`);
    }
    return record[key] as boolean;
  };

  return {
    queries: readFlag("queries"),
    commands: readFlag("commands"),
    routes: readFlag("routes"),
    graphql: readFlag("graphql"),
    notifications: readFlag("notifications"),
    eventHandlers: readFlag("eventHandlers"),
  };
};

export const parseApplicationBackendManifest = (
  bundleRootPath: string,
  manifestPath: string,
): ApplicationBackendBundle => {
  let payload: unknown;
  try {
    payload = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
  } catch (error) {
    throw new ApplicationBackendManifestParseError(
      `Failed to read backend bundle manifest '${manifestPath}': ${String(error)}`,
    );
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new ApplicationBackendManifestParseError("Application backend bundle manifest must be a JSON object.");
  }

  const manifest = payload as ApplicationBackendBundleManifestV1 & Record<string, unknown>;
  const contractVersion = normalizeRequiredString(manifest.contractVersion, "contractVersion");
  if (contractVersion !== APPLICATION_BACKEND_BUNDLE_CONTRACT_VERSION_V1) {
    throw new ApplicationBackendManifestParseError(
      `Unsupported backend bundle contractVersion '${contractVersion}'.`,
    );
  }

  const entryModuleRelativePath = normalizeBackendRelativePath(bundleRootPath, manifest.entryModule, "entryModule");
  const moduleFormat = normalizeRequiredString(manifest.moduleFormat, "moduleFormat");
  if (moduleFormat !== "esm") {
    throw new ApplicationBackendManifestParseError("backend.moduleFormat must be 'esm'.");
  }

  const distribution = normalizeRequiredString(manifest.distribution, "distribution");
  if (distribution !== "self-contained") {
    throw new ApplicationBackendManifestParseError("backend.distribution must be 'self-contained'.");
  }

  const targetRuntime = manifest.targetRuntime as Record<string, unknown> | undefined;
  if (!targetRuntime || typeof targetRuntime !== "object" || Array.isArray(targetRuntime)) {
    throw new ApplicationBackendManifestParseError("targetRuntime must be an object.");
  }
  const engine = normalizeRequiredString(targetRuntime.engine, "targetRuntime.engine");
  if (engine !== "node") {
    throw new ApplicationBackendManifestParseError("targetRuntime.engine must be 'node'.");
  }
  const semver = normalizeRequiredString(targetRuntime.semver, "targetRuntime.semver");

  const sdkCompatibility = manifest.sdkCompatibility as Record<string, unknown> | undefined;
  if (!sdkCompatibility || typeof sdkCompatibility !== "object" || Array.isArray(sdkCompatibility)) {
    throw new ApplicationBackendManifestParseError("sdkCompatibility must be an object.");
  }
  const backendDefinitionContractVersion = normalizeRequiredString(
    sdkCompatibility.backendDefinitionContractVersion,
    "sdkCompatibility.backendDefinitionContractVersion",
  );
  if (backendDefinitionContractVersion !== APPLICATION_BACKEND_DEFINITION_CONTRACT_VERSION_V2) {
    throw new ApplicationBackendManifestParseError(
      `Unsupported backendDefinitionContractVersion '${backendDefinitionContractVersion}'.`,
    );
  }
  const frontendSdkContractVersion = normalizeRequiredString(
    sdkCompatibility.frontendSdkContractVersion,
    "sdkCompatibility.frontendSdkContractVersion",
  );
  if (frontendSdkContractVersion !== APPLICATION_FRONTEND_SDK_CONTRACT_VERSION_V2) {
    throw new ApplicationBackendManifestParseError(
      `Unsupported frontendSdkContractVersion '${frontendSdkContractVersion}'.`,
    );
  }

  const migrationsDirRelativePath = normalizeOptionalBackendRelativePath(
    bundleRootPath,
    manifest.migrationsDir,
    "migrationsDir",
  );
  const assetsDirRelativePath = normalizeOptionalBackendRelativePath(
    bundleRootPath,
    manifest.assetsDir,
    "assetsDir",
  );

  return {
    manifestPath,
    manifestRelativePath: path.relative(bundleRootPath, manifestPath).replace(/\\/g, "/"),
    entryModulePath: path.resolve(bundleRootPath, entryModuleRelativePath),
    entryModuleRelativePath,
    moduleFormat: "esm",
    distribution: "self-contained",
    targetRuntime: {
      engine: "node",
      semver,
    },
    sdkCompatibility: {
      backendDefinitionContractVersion: APPLICATION_BACKEND_DEFINITION_CONTRACT_VERSION_V2,
      frontendSdkContractVersion: APPLICATION_FRONTEND_SDK_CONTRACT_VERSION_V2,
    },
    supportedExposures: normalizeBooleanRecord(manifest.supportedExposures, "supportedExposures"),
    migrationsDirPath: migrationsDirRelativePath ? path.resolve(bundleRootPath, migrationsDirRelativePath) : null,
    migrationsDirRelativePath,
    assetsDirPath: assetsDirRelativePath ? path.resolve(bundleRootPath, assetsDirRelativePath) : null,
    assetsDirRelativePath,
  };
};
