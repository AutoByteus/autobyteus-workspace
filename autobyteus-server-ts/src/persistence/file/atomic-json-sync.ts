import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

/** Small metadata publication; callers must not await between validation and this rename. */
export function writeAtomicJsonSync(destination: string, value: unknown): void {
  const temporary = path.join(path.dirname(destination), `.${path.basename(destination)}.${randomUUID()}.tmp`);
  let fd: number | undefined;
  try {
    fd = fs.openSync(temporary, "wx", 0o600);
    fs.writeFileSync(fd, JSON.stringify(value, null, 2) + "\n", "utf8");
    fs.fsyncSync(fd);
    fs.closeSync(fd);
    fd = undefined;
    fs.renameSync(temporary, destination);
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
    try { fs.unlinkSync(temporary); } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") console.warn("Metadata temporary cleanup failed", error);
    }
  }
}
