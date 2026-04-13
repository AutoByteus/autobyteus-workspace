const APPLICATION_ID_PREFIX = "bundle-app__";
const AGENT_ID_PREFIX = "bundle-agent__";
const TEAM_ID_PREFIX = "bundle-team__";
const PART_DELIMITER = "__";

const toHex = (value: string): string => Buffer.from(value, "utf-8").toString("hex");
const fromHex = (value: string): string => Buffer.from(value, "hex").toString("utf-8");

const normalizeRequiredPart = (value: string, fieldName: string): string => {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }
  return normalized;
};

const buildId = (prefix: string, parts: string[]): string =>
  `${prefix}${parts.map((part) => toHex(normalizeRequiredPart(part, "id part"))).join(PART_DELIMITER)}`;

const parseId = (
  value: string,
  prefix: string,
  expectedParts: number,
): string[] | null => {
  const normalized = value.trim();
  if (!normalized.startsWith(prefix)) {
    return null;
  }

  const payload = normalized.slice(prefix.length);
  const parts = payload.split(PART_DELIMITER);
  if (parts.length !== expectedParts || parts.some((part) => !part)) {
    return null;
  }

  try {
    return parts.map((part) => fromHex(part));
  } catch {
    return null;
  }
};

export const buildCanonicalApplicationId = (
  packageId: string,
  localApplicationId: string,
): string => buildId(APPLICATION_ID_PREFIX, [packageId, localApplicationId]);

export const parseCanonicalApplicationId = (
  value: string,
): { packageId: string; localApplicationId: string } | null => {
  const parts = parseId(value, APPLICATION_ID_PREFIX, 2);
  if (!parts) {
    return null;
  }
  return {
    packageId: parts[0]!,
    localApplicationId: parts[1]!,
  };
};

export const buildCanonicalApplicationOwnedAgentId = (
  packageId: string,
  localApplicationId: string,
  localAgentId: string,
): string => buildId(AGENT_ID_PREFIX, [packageId, localApplicationId, localAgentId]);

export const parseCanonicalApplicationOwnedAgentId = (
  value: string,
): { packageId: string; localApplicationId: string; localAgentId: string } | null => {
  const parts = parseId(value, AGENT_ID_PREFIX, 3);
  if (!parts) {
    return null;
  }
  return {
    packageId: parts[0]!,
    localApplicationId: parts[1]!,
    localAgentId: parts[2]!,
  };
};

export const buildCanonicalApplicationOwnedTeamId = (
  packageId: string,
  localApplicationId: string,
  localTeamId: string,
): string => buildId(TEAM_ID_PREFIX, [packageId, localApplicationId, localTeamId]);

export const parseCanonicalApplicationOwnedTeamId = (
  value: string,
): { packageId: string; localApplicationId: string; localTeamId: string } | null => {
  const parts = parseId(value, TEAM_ID_PREFIX, 3);
  if (!parts) {
    return null;
  }
  return {
    packageId: parts[0]!,
    localApplicationId: parts[1]!,
    localTeamId: parts[2]!,
  };
};

export const isCanonicalApplicationOwnedAgentId = (value: string): boolean =>
  parseCanonicalApplicationOwnedAgentId(value) !== null;

export const isCanonicalApplicationOwnedTeamId = (value: string): boolean =>
  parseCanonicalApplicationOwnedTeamId(value) !== null;
