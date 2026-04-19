import fs from "node:fs";
import path from "node:path";
import {
  APPLICATION_FRONTEND_SDK_CONTRACT_VERSION_V2,
  APPLICATION_MANIFEST_VERSION_V3,
  type ApplicationManifestV3,
} from "@autobyteus/application-sdk-contracts";

export const APPLICATION_MANIFEST_FILE_NAME = "application.json";

type ParsedManifest = {
  id: string;
  name: string;
  description: string | null;
  iconRelativePath: string | null;
  entryHtmlRelativePath: string;
  backendBundleManifestRelativePath: string;
};

export class ApplicationManifestParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApplicationManifestParseError";
  }
}

const normalizeRequiredString = (value: unknown, fieldName: string): string => {
  if (typeof value !== "string") {
    throw new ApplicationManifestParseError(`${fieldName} must be a string.`);
  }
  const normalized = value.trim();
  if (!normalized) {
    throw new ApplicationManifestParseError(`${fieldName} is required.`);
  }
  return normalized;
};

const normalizeOptionalString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const normalizeBundleRelativePath = (
  bundleRootPath: string,
  rawPath: unknown,
  fieldName: string,
  options: {
    requiredPrefix: string;
  },
): string => {
  const relativePath = normalizeRequiredString(rawPath, fieldName).replace(/\\/g, "/");
  if (relativePath.startsWith("/") || path.isAbsolute(relativePath)) {
    throw new ApplicationManifestParseError(`${fieldName} must be a relative path inside the application bundle.`);
  }

  const resolved = path.resolve(bundleRootPath, relativePath);
  const normalizedBundleRoot = path.resolve(bundleRootPath);
  if (resolved !== normalizedBundleRoot && !resolved.startsWith(`${normalizedBundleRoot}${path.sep}`)) {
    throw new ApplicationManifestParseError(`${fieldName} must stay inside the application bundle.`);
  }

  const normalizedRelative = path.relative(normalizedBundleRoot, resolved).replace(/\\/g, "/");
  if (!normalizedRelative || normalizedRelative.startsWith("..")) {
    throw new ApplicationManifestParseError(`${fieldName} must stay inside the application bundle.`);
  }
  if (!normalizedRelative.startsWith(options.requiredPrefix)) {
    throw new ApplicationManifestParseError(`${fieldName} must point under ${options.requiredPrefix}.`);
  }
  return normalizedRelative;
};

export const parseApplicationManifest = (
  bundleRootPath: string,
  manifestPath: string,
): ParsedManifest => {
  let rawContent = "";
  try {
    rawContent = fs.readFileSync(manifestPath, "utf-8");
  } catch (error) {
    throw new ApplicationManifestParseError(`Failed to read application manifest '${manifestPath}': ${String(error)}`);
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawContent);
  } catch {
    throw new ApplicationManifestParseError(`Application manifest '${manifestPath}' is not valid JSON.`);
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new ApplicationManifestParseError("Application manifest must be a JSON object.");
  }

  const manifest = payload as ApplicationManifestV3 & Record<string, unknown>;
  const manifestVersion = normalizeRequiredString(manifest.manifestVersion, "manifestVersion");
  if (manifestVersion !== APPLICATION_MANIFEST_VERSION_V3) {
    throw new ApplicationManifestParseError(
      `Unsupported application manifestVersion '${manifestVersion}'. Expected '${APPLICATION_MANIFEST_VERSION_V3}'.`,
    );
  }

  const frontendSdkContractVersion = normalizeRequiredString(
    (manifest.ui as Record<string, unknown> | undefined)?.frontendSdkContractVersion,
    "ui.frontendSdkContractVersion",
  );
  if (frontendSdkContractVersion !== APPLICATION_FRONTEND_SDK_CONTRACT_VERSION_V2) {
    throw new ApplicationManifestParseError(
      `Unsupported ui.frontendSdkContractVersion '${frontendSdkContractVersion}'.`,
    );
  }

  return {
    id: normalizeRequiredString(manifest.id, "id"),
    name: normalizeRequiredString(manifest.name, "name"),
    description: normalizeOptionalString(manifest.description),
    iconRelativePath:
      manifest.icon === undefined || manifest.icon === null
        ? null
        : normalizeBundleRelativePath(bundleRootPath, manifest.icon, "icon", {
            requiredPrefix: "ui/",
          }),
    entryHtmlRelativePath: normalizeBundleRelativePath(
      bundleRootPath,
      (manifest.ui as Record<string, unknown> | undefined)?.entryHtml,
      "ui.entryHtml",
      { requiredPrefix: "ui/" },
    ),
    backendBundleManifestRelativePath: normalizeBundleRelativePath(
      bundleRootPath,
      (manifest.backend as Record<string, unknown> | undefined)?.bundleManifest,
      "backend.bundleManifest",
      { requiredPrefix: "backend/" },
    ),
  };
};

export const getApplicationManifestPath = (bundleRootPath: string): string =>
  path.join(bundleRootPath, APPLICATION_MANIFEST_FILE_NAME);
