import fs from "node:fs";
import path from "node:path";
import type { ApplicationRuntimeTargetKind } from "../domain/models.js";

export const APPLICATION_MANIFEST_FILE_NAME = "application.json";

type ParsedManifest = {
  id: string;
  name: string;
  description: string | null;
  iconRelativePath: string | null;
  entryHtmlRelativePath: string;
  runtimeTarget: {
    kind: ApplicationRuntimeTargetKind;
    localId: string;
  };
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
  if (!normalizedRelative.startsWith("ui/")) {
    throw new ApplicationManifestParseError(`${fieldName} must point to a file under ui/.`);
  }
  return normalizedRelative;
};

const normalizeRuntimeTarget = (value: unknown): ParsedManifest["runtimeTarget"] => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ApplicationManifestParseError("runtimeTarget must be an object.");
  }

  const candidate = value as Record<string, unknown>;
  const kind = normalizeRequiredString(candidate.kind, "runtimeTarget.kind");
  if (kind !== "AGENT" && kind !== "AGENT_TEAM") {
    throw new ApplicationManifestParseError("runtimeTarget.kind must be 'AGENT' or 'AGENT_TEAM'.");
  }

  return {
    kind,
    localId: normalizeRequiredString(candidate.localId, "runtimeTarget.localId"),
  };
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
  } catch (error) {
    throw new ApplicationManifestParseError(`Application manifest '${manifestPath}' is not valid JSON.`);
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new ApplicationManifestParseError("Application manifest must be a JSON object.");
  }

  const manifest = payload as Record<string, unknown>;
  return {
    id: normalizeRequiredString(manifest.id, "id"),
    name: normalizeRequiredString(manifest.name, "name"),
    description: normalizeOptionalString(manifest.description),
    iconRelativePath:
      manifest.icon === undefined || manifest.icon === null
        ? null
        : normalizeBundleRelativePath(bundleRootPath, manifest.icon, "icon"),
    entryHtmlRelativePath: normalizeBundleRelativePath(
      bundleRootPath,
      (manifest.ui as Record<string, unknown> | undefined)?.entryHtml,
      "ui.entryHtml",
    ),
    runtimeTarget: normalizeRuntimeTarget(manifest.runtimeTarget),
  };
};

export const getApplicationManifestPath = (bundleRootPath: string): string =>
  path.join(bundleRootPath, APPLICATION_MANIFEST_FILE_NAME);
