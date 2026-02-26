export type PersistenceProfile = "sqlite" | "postgresql" | "file";

const SUPPORTED_PERSISTENCE_PROFILES: PersistenceProfile[] = ["sqlite", "postgresql", "file"];
const SQL_PROFILES = new Set<PersistenceProfile>(["sqlite", "postgresql"]);
const DEFAULT_PERSISTENCE_PROFILE: PersistenceProfile = "sqlite";

export const normalizePersistenceProfile = (rawValue: string | null | undefined): PersistenceProfile => {
  const normalized = (rawValue ?? DEFAULT_PERSISTENCE_PROFILE).trim().toLowerCase();
  if (normalized === "sqlite" || normalized === "postgresql" || normalized === "file") {
    return normalized;
  }

  throw new Error(
    `PERSISTENCE_PROVIDER must be one of: ${SUPPORTED_PERSISTENCE_PROFILES.join(", ")}. Received: '${rawValue ?? ""}'.`,
  );
};

export const isAndroidRuntime = (
  env: NodeJS.ProcessEnv = process.env,
  platform: NodeJS.Platform = process.platform,
): boolean =>
  platform === "android" || Boolean(env.ANDROID_ROOT) || Boolean(env.ANDROID_DATA);

export const getPersistenceProfile = (
  env: NodeJS.ProcessEnv = process.env,
  platform: NodeJS.Platform = process.platform,
): PersistenceProfile => {
  const resolvedProfile = normalizePersistenceProfile(env.PERSISTENCE_PROVIDER);
  if (isAndroidRuntime(env, platform)) {
    return "file";
  }

  return resolvedProfile;
};

export const isSqlPersistenceProfile = (profile: PersistenceProfile): boolean => SQL_PROFILES.has(profile);

export const isFilePersistenceProfile = (profile: PersistenceProfile): boolean => profile === "file";
