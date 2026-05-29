import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const resolveWatcherRuntimeEntrypoint = (): string => {
  const siblingJsPath = fileURLToPath(new URL("./watcher-runtime-process.js", import.meta.url));
  if (fs.existsSync(siblingJsPath)) {
    return siblingJsPath;
  }

  const currentPath = fileURLToPath(import.meta.url);
  const sourceMarker = `${path.sep}src${path.sep}`;
  if (currentPath.includes(sourceMarker)) {
    const distCandidate = siblingJsPath.replace(sourceMarker, `${path.sep}dist${path.sep}`);
    if (fs.existsSync(distCandidate)) {
      return distCandidate;
    }
  }

  throw new Error(`Watcher runtime entrypoint not found at ${siblingJsPath}`);
};
