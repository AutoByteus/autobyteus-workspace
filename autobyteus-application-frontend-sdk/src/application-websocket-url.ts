export class ApplicationWebSocketUrlError extends Error {
  constructor(readonly code: "INVALID_BASE" | "INVALID_PATH", message: string) {
    super(message);
    this.name = "ApplicationWebSocketUrlError";
  }
}

export const parseApplicationWebSocketPath = (path: string): string[] => {
  const value = path.trim();
  if (!value || value.includes("?") || value.includes("#") || value.includes("://")) {
    throw new ApplicationWebSocketUrlError("INVALID_PATH", "The application backend WebSocket path is invalid.");
  }
  const segments = value.replace(/^\/+/, "").split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) {
    throw new ApplicationWebSocketUrlError("INVALID_PATH", "The application backend WebSocket path is invalid.");
  }
  return segments;
};

export const composeApplicationWebSocketUrl = (input: {
  baseUrl: string;
  pathSegments: string[];
  query?: Record<string, string | string[]>;
}): string => {
  let url: URL;
  try { url = new URL(input.baseUrl); } catch {
    throw new ApplicationWebSocketUrlError("INVALID_BASE", "The application WebSocket base URL is invalid.");
  }
  if (url.protocol !== "ws:" && url.protocol !== "wss:") {
    throw new ApplicationWebSocketUrlError("INVALID_BASE", "The application WebSocket base URL is invalid.");
  }
  if (input.pathSegments.length === 0 || input.pathSegments.some((segment) => !segment.trim())) {
    throw new ApplicationWebSocketUrlError("INVALID_PATH", "The application WebSocket path is invalid.");
  }
  const basePath = url.pathname.replace(/\/+$/, "");
  url.pathname = `${basePath}/${input.pathSegments.map((segment) => encodeURIComponent(segment)).join("/")}`;
  for (const [key, value] of Object.entries(input.query ?? {})) {
    for (const entry of Array.isArray(value) ? value : [value]) url.searchParams.append(key, entry);
  }
  return url.toString();
};
