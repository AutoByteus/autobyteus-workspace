export type DiscoveryRole = "registry" | "client";

export type DiscoveryRoleConfig = {
  discoveryEnabled: boolean;
  role: DiscoveryRole;
  registryUrl: string | null;
};

const normalizeOptionalString = (value: string | null | undefined): string | null => {
  if (value === null || value === undefined) {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const parseBooleanFlag = (value: string | null | undefined, defaultValue: boolean): boolean => {
  const normalized = normalizeOptionalString(value);
  if (!normalized) {
    return defaultValue;
  }
  const lowered = normalized.toLowerCase();
  return lowered === "1" || lowered === "true" || lowered === "yes" || lowered === "on";
};

const normalizeHttpUrl = (value: string, envKey: string): string => {
  let url: URL;
  try {
    url = new URL(value);
  } catch (error) {
    throw new Error(`${envKey} must be a valid absolute URL: ${String(error)}`);
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`${envKey} must use http or https protocol.`);
  }

  return value.replace(/\/+$/, "");
};

const normalizeRole = (value: string | null): DiscoveryRole => {
  const normalized = (value ?? "registry").toLowerCase();
  if (normalized === "registry" || normalized === "client") {
    return normalized;
  }
  throw new Error(
    `AUTOBYTEUS_NODE_DISCOVERY_ROLE must be one of: registry, client. Received: '${value ?? ""}'.`,
  );
};

export const resolveDiscoveryRoleConfig = (
  env: Record<string, string | undefined> = process.env,
): DiscoveryRoleConfig => {
  const rawRegistryUrl = normalizeOptionalString(env.AUTOBYTEUS_NODE_DISCOVERY_REGISTRY_URL);
  const rawRole = normalizeOptionalString(env.AUTOBYTEUS_NODE_DISCOVERY_ROLE);
  const inferredRole = rawRole ?? (rawRegistryUrl ? "client" : null);
  const discoveryEnabled = parseBooleanFlag(
    env.AUTOBYTEUS_NODE_DISCOVERY_ENABLED,
    Boolean(rawRole || rawRegistryUrl),
  );
  const role = normalizeRole(inferredRole);
  const registryUrl = rawRegistryUrl
    ? normalizeHttpUrl(rawRegistryUrl, "AUTOBYTEUS_NODE_DISCOVERY_REGISTRY_URL")
    : null;

  if (discoveryEnabled && role === "client" && !registryUrl) {
    throw new Error(
      "AUTOBYTEUS_NODE_DISCOVERY_REGISTRY_URL is required when discovery is enabled and role is client.",
    );
  }

  return {
    discoveryEnabled,
    role,
    registryUrl,
  };
};
