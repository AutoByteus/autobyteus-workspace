import fs from "node:fs";
import path from "node:path";
import {
  APPLICATION_FRONTEND_SDK_CONTRACT_VERSION_V2,
  APPLICATION_MANIFEST_VERSION_V3,
  type ApplicationManifestV3,
  type ApplicationResourceSlotDeclaration,
  type ApplicationRuntimeResourceKind,
  type ApplicationRuntimeResourceOwner,
  type ApplicationRuntimeResourceRef,
  type ApplicationSupportedAgentLaunchConfigDeclaration,
  type ApplicationSupportedLaunchConfigDeclaration,
  type ApplicationSupportedTeamLaunchConfigDeclaration,
  type ApplicationSupportedTeamMemberOverrideDeclaration,
} from "@autobyteus/application-sdk-contracts";

export const APPLICATION_MANIFEST_FILE_NAME = "application.json";

const SLOT_KEY_PATTERN = /^[A-Za-z][A-Za-z0-9_-]*$/;
const RESOURCE_KINDS = new Set<ApplicationRuntimeResourceKind>(["AGENT", "AGENT_TEAM"]);
const RESOURCE_OWNERS = new Set<ApplicationRuntimeResourceOwner>(["bundle", "shared"]);
const DEFAULT_ALLOWED_RESOURCE_OWNERS: ApplicationRuntimeResourceOwner[] = ["bundle", "shared"];
const SUPPORTED_AGENT_LAUNCH_KEYS = new Set<keyof ApplicationSupportedAgentLaunchConfigDeclaration>([
  "llmModelIdentifier",
  "runtimeKind",
  "workspaceRootPath",
]);
const SUPPORTED_TEAM_MEMBER_OVERRIDE_KEYS =
  new Set<keyof ApplicationSupportedTeamMemberOverrideDeclaration>([
    "llmModelIdentifier",
    "runtimeKind",
  ]);
const SUPPORTED_TEAM_LAUNCH_KEYS = new Set<keyof ApplicationSupportedTeamLaunchConfigDeclaration>([
  "llmModelIdentifier",
  "runtimeKind",
  "workspaceRootPath",
  "memberOverrides",
]);

const normalizeFlagMap = <TKey extends string>(input: {
  value: unknown;
  fieldName: string;
  allowedKeys: ReadonlySet<TKey>;
}): Partial<Record<TKey, true>> | null => {
  if (input.value === undefined || input.value === null) {
    return null;
  }
  if (!input.value || typeof input.value !== "object" || Array.isArray(input.value)) {
    throw new ApplicationManifestParseError(`${input.fieldName} must be an object when provided.`);
  }

  const record = input.value as Record<string, unknown>;
  const unknownKeys = Object.keys(record).filter((key) => !input.allowedKeys.has(key as TKey));
  if (unknownKeys.length > 0) {
    throw new ApplicationManifestParseError(
      `${input.fieldName} contains unsupported key '${unknownKeys[0]}'.`,
    );
  }

  const normalized: Partial<Record<TKey, true>> = {};
  for (const key of input.allowedKeys) {
    const candidate = record[key];
    if (candidate === undefined || candidate === null) {
      continue;
    }
    if (typeof candidate !== "boolean") {
      throw new ApplicationManifestParseError(`${input.fieldName}.${key} must be a boolean when provided.`);
    }
    if (candidate) {
      normalized[key] = true;
    }
  }

  return Object.keys(normalized).length > 0 ? normalized : null;
};

type ParsedManifest = {
  id: string;
  name: string;
  description: string | null;
  iconRelativePath: string | null;
  entryHtmlRelativePath: string;
  backendBundleManifestRelativePath: string;
  resourceSlots: ApplicationResourceSlotDeclaration[];
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

const normalizeUniqueStringList = <TValue extends string>(input: {
  value: unknown;
  fieldName: string;
  allowedValues: ReadonlySet<TValue>;
  defaultValue?: TValue[];
}): TValue[] => {
  if (input.value === undefined || input.value === null) {
    return [...(input.defaultValue ?? [])];
  }
  if (!Array.isArray(input.value) || input.value.length === 0) {
    throw new ApplicationManifestParseError(`${input.fieldName} must be a non-empty array.`);
  }
  const normalized: TValue[] = [];
  const seen = new Set<string>();
  for (const candidate of input.value) {
    if (typeof candidate !== "string") {
      throw new ApplicationManifestParseError(`${input.fieldName} entries must be strings.`);
    }
    const nextValue = candidate.trim() as TValue;
    if (!input.allowedValues.has(nextValue)) {
      throw new ApplicationManifestParseError(`${input.fieldName} contains unsupported value '${candidate}'.`);
    }
    if (seen.has(nextValue)) {
      continue;
    }
    seen.add(nextValue);
    normalized.push(nextValue);
  }
  if (normalized.length === 0) {
    throw new ApplicationManifestParseError(`${input.fieldName} must contain at least one supported value.`);
  }
  return normalized;
};

const normalizeRuntimeResourceRef = (
  value: unknown,
  fieldName: string,
): ApplicationRuntimeResourceRef => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ApplicationManifestParseError(`${fieldName} must be an object.`);
  }
  const record = value as Record<string, unknown>;
  const owner = normalizeRequiredString(record.owner, `${fieldName}.owner`) as ApplicationRuntimeResourceOwner;
  if (!RESOURCE_OWNERS.has(owner)) {
    throw new ApplicationManifestParseError(`${fieldName}.owner must be 'bundle' or 'shared'.`);
  }
  const kind = normalizeRequiredString(record.kind, `${fieldName}.kind`) as ApplicationRuntimeResourceKind;
  if (!RESOURCE_KINDS.has(kind)) {
    throw new ApplicationManifestParseError(`${fieldName}.kind must be 'AGENT' or 'AGENT_TEAM'.`);
  }
  if (owner === "bundle") {
    return {
      owner,
      kind,
      localId: normalizeRequiredString(record.localId, `${fieldName}.localId`),
    } as ApplicationRuntimeResourceRef;
  }
  return {
    owner,
    kind,
    definitionId: normalizeRequiredString(record.definitionId, `${fieldName}.definitionId`),
  } as ApplicationRuntimeResourceRef;
};

const normalizeSupportedLaunchConfig = (
  value: unknown,
  fieldName: string,
  allowedResourceKinds: ApplicationRuntimeResourceKind[],
): ApplicationSupportedLaunchConfigDeclaration | null => {
  if (value === undefined || value === null) {
    return null;
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ApplicationManifestParseError(`${fieldName} must be an object when provided.`);
  }

  const record = value as Record<string, unknown>;
  const normalized: ApplicationSupportedLaunchConfigDeclaration = {};
  const unknownKinds = Object.keys(record).filter((key) => !RESOURCE_KINDS.has(key as ApplicationRuntimeResourceKind));
  if (unknownKinds.length > 0) {
    throw new ApplicationManifestParseError(`${fieldName} contains unsupported key '${unknownKinds[0]}'.`);
  }

  if (record.AGENT !== undefined) {
    if (!allowedResourceKinds.includes("AGENT")) {
      throw new ApplicationManifestParseError(
        `${fieldName}.AGENT is not allowed when ${fieldName.replace(/\.supportedLaunchConfig$/, ".allowedResourceKinds")} does not include 'AGENT'.`,
      );
    }
    normalized.AGENT = normalizeFlagMap({
      value: record.AGENT,
      fieldName: `${fieldName}.AGENT`,
      allowedKeys: SUPPORTED_AGENT_LAUNCH_KEYS,
    }) as ApplicationSupportedAgentLaunchConfigDeclaration | null;
  }

  if (record.AGENT_TEAM !== undefined) {
    if (!allowedResourceKinds.includes("AGENT_TEAM")) {
      throw new ApplicationManifestParseError(
        `${fieldName}.AGENT_TEAM is not allowed when ${fieldName.replace(/\.supportedLaunchConfig$/, ".allowedResourceKinds")} does not include 'AGENT_TEAM'.`,
      );
    }
    if (!record.AGENT_TEAM || typeof record.AGENT_TEAM !== "object" || Array.isArray(record.AGENT_TEAM)) {
      throw new ApplicationManifestParseError(`${fieldName}.AGENT_TEAM must be an object when provided.`);
    }
    const teamRecord = record.AGENT_TEAM as Record<string, unknown>;
    const unknownKeys = Object.keys(teamRecord).filter((key) => !SUPPORTED_TEAM_LAUNCH_KEYS.has(
      key as keyof ApplicationSupportedTeamLaunchConfigDeclaration,
    ));
    if (unknownKeys.length > 0) {
      throw new ApplicationManifestParseError(
        `${fieldName}.AGENT_TEAM contains unsupported key '${unknownKeys[0]}'.`,
      );
    }

    const teamBase = normalizeFlagMap({
      value: Object.fromEntries(
        Object.entries(teamRecord).filter(([key]) => key !== "memberOverrides"),
      ),
      fieldName: `${fieldName}.AGENT_TEAM`,
      allowedKeys: SUPPORTED_AGENT_LAUNCH_KEYS,
    }) as ApplicationSupportedTeamLaunchConfigDeclaration | null;

    const memberOverrides = normalizeFlagMap({
      value: teamRecord.memberOverrides,
      fieldName: `${fieldName}.AGENT_TEAM.memberOverrides`,
      allowedKeys: SUPPORTED_TEAM_MEMBER_OVERRIDE_KEYS,
    }) as ApplicationSupportedTeamMemberOverrideDeclaration | null;

    const normalizedTeam: ApplicationSupportedTeamLaunchConfigDeclaration = {
      ...(teamBase ?? {}),
      ...(memberOverrides ? { memberOverrides } : {}),
    };
    normalized.AGENT_TEAM = Object.keys(normalizedTeam).length > 0 ? normalizedTeam : null;
  }

  return Object.keys(normalized).length > 0 ? normalized : null;
};

const normalizeResourceSlots = (value: unknown): ApplicationResourceSlotDeclaration[] => {
  if (value === undefined || value === null) {
    return [];
  }
  if (!Array.isArray(value)) {
    throw new ApplicationManifestParseError("resourceSlots must be an array when provided.");
  }

  const seenSlotKeys = new Set<string>();
  return value.map((entry, index) => {
    const fieldName = `resourceSlots[${index}]`;
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new ApplicationManifestParseError(`${fieldName} must be an object.`);
    }
    const record = entry as Record<string, unknown>;
    const slotKey = normalizeRequiredString(record.slotKey, `${fieldName}.slotKey`);
    if (!SLOT_KEY_PATTERN.test(slotKey)) {
      throw new ApplicationManifestParseError(
        `${fieldName}.slotKey must match ${SLOT_KEY_PATTERN.source}.`,
      );
    }
    if (seenSlotKeys.has(slotKey)) {
      throw new ApplicationManifestParseError(`resourceSlots contains duplicate slotKey '${slotKey}'.`);
    }
    seenSlotKeys.add(slotKey);

    const allowedResourceKinds = normalizeUniqueStringList<ApplicationRuntimeResourceKind>({
      value: record.allowedResourceKinds,
      fieldName: `${fieldName}.allowedResourceKinds`,
      allowedValues: RESOURCE_KINDS,
    });
    const allowedResourceOwners = normalizeUniqueStringList<ApplicationRuntimeResourceOwner>({
      value: record.allowedResourceOwners,
      fieldName: `${fieldName}.allowedResourceOwners`,
      allowedValues: RESOURCE_OWNERS,
      defaultValue: DEFAULT_ALLOWED_RESOURCE_OWNERS,
    });
    const defaultResourceRef = record.defaultResourceRef === undefined || record.defaultResourceRef === null
      ? null
      : normalizeRuntimeResourceRef(record.defaultResourceRef, `${fieldName}.defaultResourceRef`);

    if (defaultResourceRef) {
      if (!allowedResourceKinds.includes(defaultResourceRef.kind)) {
        throw new ApplicationManifestParseError(
          `${fieldName}.defaultResourceRef.kind must be allowed by ${fieldName}.allowedResourceKinds.`,
        );
      }
      if (!allowedResourceOwners.includes(defaultResourceRef.owner)) {
        throw new ApplicationManifestParseError(
          `${fieldName}.defaultResourceRef.owner must be allowed by ${fieldName}.allowedResourceOwners.`,
        );
      }
    }

    return {
      slotKey,
      name: normalizeRequiredString(record.name, `${fieldName}.name`),
      description: normalizeOptionalString(record.description),
      allowedResourceKinds,
      allowedResourceOwners,
      required: typeof record.required === "boolean" ? record.required : null,
      supportedLaunchConfig: normalizeSupportedLaunchConfig(
        record.supportedLaunchConfig,
        `${fieldName}.supportedLaunchConfig`,
        allowedResourceKinds,
      ),
      defaultResourceRef,
    } satisfies ApplicationResourceSlotDeclaration;
  });
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
    resourceSlots: normalizeResourceSlots(manifest.resourceSlots),
  };
};

export const getApplicationManifestPath = (bundleRootPath: string): string =>
  path.join(bundleRootPath, APPLICATION_MANIFEST_FILE_NAME);
