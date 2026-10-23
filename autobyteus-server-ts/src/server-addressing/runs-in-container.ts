import fs from "node:fs";

let cached: boolean | null = null;

/**
 * Whether this server runs in a container (one-nodes-tab REQ-708): Docker creates `/.dockerenv` in every container.
 * Read once per process. It decides only the loopback hint, never a request.
 */
export const runsInContainer = (): boolean => {
  cached ??= fs.existsSync("/.dockerenv");
  return cached;
};
