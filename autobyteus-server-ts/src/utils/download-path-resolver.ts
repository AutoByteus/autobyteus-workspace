import os from "node:os";
import path from "node:path";
import fs from "node:fs";

export function getDownloadsDir(): string {
  const homeDir = os.homedir();
  let downloadsDir = path.join(homeDir, "Downloads");

  if (process.platform === "win32") {
    downloadsDir = path.join(process.env.USERPROFILE ?? homeDir, "Downloads");
  }

  fs.mkdirSync(downloadsDir, { recursive: true });
  return downloadsDir;
}
