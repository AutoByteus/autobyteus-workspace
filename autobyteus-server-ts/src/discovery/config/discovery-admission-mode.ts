export type DiscoveryAdmissionMode = "lan_open";

const normalizeOptionalString = (value: string | null | undefined): string | null => {
  if (value === null || value === undefined) {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

export const resolveDiscoveryAdmissionMode = (
  env: Record<string, string | undefined> = process.env,
): DiscoveryAdmissionMode => {
  const rawMode = normalizeOptionalString(env.AUTOBYTEUS_NODE_DISCOVERY_ADMISSION_MODE);
  if (!rawMode) {
    return "lan_open";
  }

  const normalized = rawMode.toLowerCase();
  if (normalized === "lan_open") {
    return "lan_open";
  }

  throw new Error(
    `UNSUPPORTED_DISCOVERY_ADMISSION_MODE: '${rawMode}'. Supported modes: lan_open.`,
  );
};
