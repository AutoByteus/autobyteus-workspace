export class RemoteAccessUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RemoteAccessUrlError";
  }
}

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
  parsed.hash = "";
  parsed.search = "";
  parsed.pathname = parsed.pathname.replace(/\/+$/, "");
  const normalized = parsed.toString().replace(/\/+$/, "");
  return normalized;
};
