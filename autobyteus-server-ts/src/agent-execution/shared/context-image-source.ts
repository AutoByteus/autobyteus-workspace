import path from "node:path";
import { fileURLToPath } from "node:url";

const HTTP_URL_PATTERN = /^https?:\/\//i;
const IMAGE_DATA_URL_PATTERN = /^data:image\//i;

/**
 * Where an image context file's bytes live. One policy for every runtime that
 * sends images inline (Codex `localImage`/`image`, Claude image content blocks).
 */
export type ContextImageSource =
  | Readonly<{ kind: "data_url"; url: string }>
  | Readonly<{ kind: "local_path"; path: string }>
  | Readonly<{ kind: "http_url"; url: string }>;

const resolveLocalPathUri = (uri: string): string | null => {
  if (uri.startsWith("file://")) {
    try {
      return fileURLToPath(uri);
    } catch {
      return null;
    }
  }
  return path.isAbsolute(uri) ? uri : null;
};

/**
 * Classifies an image context-file URI: `data:image/...` URLs, local paths
 * (absolute or `file://`), http(s) URLs, and otherwise the raw value as a path.
 */
export const resolveContextImageSource = (rawUri: string): ContextImageSource | null => {
  const uri = rawUri.trim();
  if (!uri) {
    return null;
  }
  if (IMAGE_DATA_URL_PATTERN.test(uri)) {
    return { kind: "data_url", url: uri };
  }
  const localPath = resolveLocalPathUri(uri);
  if (localPath) {
    return { kind: "local_path", path: localPath };
  }
  if (HTTP_URL_PATTERN.test(uri)) {
    return { kind: "http_url", url: uri };
  }
  return { kind: "local_path", path: uri };
};
