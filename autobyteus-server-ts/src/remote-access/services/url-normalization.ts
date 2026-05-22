export class RemoteAccessUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RemoteAccessUrlError";
  }
}

const RESERVED_SURFACE_SEGMENTS = new Set(["mobile", "rest", "graphql", "ws"]);

const stripReservedSurfacePath = (pathname: string): string => {
  const withoutTrailingSlash = pathname.replace(/\/+$/, "");
  const segments = withoutTrailingSlash.split("/").filter(Boolean);
  const reservedIndex = segments.findIndex((segment) => RESERVED_SURFACE_SEGMENTS.has(segment.toLowerCase()));
  const baseSegments = reservedIndex >= 0 ? segments.slice(0, reservedIndex) : segments;
  return baseSegments.length > 0 ? `/${baseSegments.join("/")}` : "";
};

export const normalizeNodeBaseUrl = (value: string): string => {
  const raw = String(value ?? "").trim();
  if (!raw) {
    throw new RemoteAccessUrlError("Server base URL is required.");
  }
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `http://${raw}`;
  let parsed: URL;
  try {
    parsed = new URL(withScheme);
  } catch {
    throw new RemoteAccessUrlError(`Invalid server base URL: ${value}`);
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new RemoteAccessUrlError("Server base URL must use http or https.");
  }
  const normalizedPath = stripReservedSurfacePath(parsed.pathname);
  return `${parsed.protocol}//${parsed.host}${normalizedPath}`.replace(/\/+$/, "");
};
