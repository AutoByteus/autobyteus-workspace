import path from "node:path";

export type StandaloneApplicationHostConfig = Readonly<{
  packageRoot: string;
  localApplicationId: string;
  appDataDir: string;
  host: string;
  port: number;
  publicBaseUrl: string | null;
}>;

export type StandaloneApplicationHostConfigInput = {
  packageRoot: string;
  localApplicationId: string;
  appDataDir: string;
  host?: string | null;
  port?: number | null;
  publicBaseUrl?: string | null;
};

const normalizeRequiredString = (value: unknown, fieldName: string): string => {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${fieldName} is required.`);
  }
  return value.trim();
};

const isLoopbackHost = (host: string): boolean =>
  host === "127.0.0.1" || host === "::1" || host.toLowerCase() === "localhost";

const normalizePublicBaseUrl = (
  value: string | null | undefined,
  required: boolean,
): string | null => {
  const normalized = value?.trim() ?? "";
  if (!normalized) {
    if (required) {
      throw new Error("publicBaseUrl is required for a non-loopback standalone bind.");
    }
    return null;
  }
  const parsed = new URL(normalized);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("publicBaseUrl must use HTTP or HTTPS.");
  }
  if (parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== "/") {
    throw new Error("publicBaseUrl must contain only an HTTP(S) origin.");
  }
  return parsed.origin;
};

export const resolveStandaloneApplicationHostConfig = (
  input: StandaloneApplicationHostConfigInput,
): StandaloneApplicationHostConfig => {
  const packageRoot = path.resolve(normalizeRequiredString(input.packageRoot, "packageRoot"));
  const appDataDir = path.resolve(normalizeRequiredString(input.appDataDir, "appDataDir"));
  const localApplicationId = normalizeRequiredString(
    input.localApplicationId,
    "localApplicationId",
  );
  if (!/^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/i.test(localApplicationId)) {
    throw new Error("localApplicationId contains unsupported characters.");
  }
  const host = input.host?.trim() || "127.0.0.1";
  const port = input.port ?? 43124;
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error("port must be an integer from 0 through 65535.");
  }
  const publicBaseUrl = normalizePublicBaseUrl(
    input.publicBaseUrl,
    !isLoopbackHost(host),
  );
  return Object.freeze({
    packageRoot,
    localApplicationId,
    appDataDir,
    host,
    port,
    publicBaseUrl,
  });
};
