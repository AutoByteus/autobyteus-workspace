export interface ProjectTaskContextFile {
  storedFilename: string;
  displayName: string;
  mimeType: string;
  sizeBytes: number;
}
export const isSafeContextFilename = (name: unknown): name is string =>
  typeof name === "string" && /^ctx_[a-zA-Z0-9_-]+__[a-zA-Z0-9._-]+$/.test(name);
