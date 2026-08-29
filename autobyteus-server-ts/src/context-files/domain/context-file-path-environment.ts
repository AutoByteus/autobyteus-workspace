export type ContextFilePathEnvironment = Readonly<{
  appDataDir: string;
  baseUrl: string;
}>;

const required = (value: unknown, field: string): string => {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) throw new Error(`${field} is required.`);
  return normalized;
};

export const createContextFilePathEnvironment = (input: {
  appDataDir: string;
  baseUrl: string;
}): ContextFilePathEnvironment => {
  const appDataDir = required(input?.appDataDir, "appDataDir");
  const baseUrl = required(input?.baseUrl, "baseUrl");
  let parsed: URL;
  try {
    parsed = new URL(baseUrl);
  } catch {
    throw new Error("baseUrl must be an absolute HTTP(S) URL.");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("baseUrl must be an absolute HTTP(S) URL.");
  }
  return Object.freeze({ appDataDir, baseUrl });
};
