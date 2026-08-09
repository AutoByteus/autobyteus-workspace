import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  removeEnvironmentAssignment,
  upsertEnvironmentAssignment,
} from "./environment-assignment-lines.js";

export const updateEnvironmentAssignmentFile = (
  configFile: string,
  key: string,
  value: string,
): void => {
  const content = fs.readFileSync(configFile, "utf-8");
  fs.writeFileSync(configFile, upsertEnvironmentAssignment(content, key, value));
};

export const removeEnvironmentAssignmentFromFile = (
  configFile: string,
  key: string,
): void => {
  const content = fs.readFileSync(configFile, "utf-8");
  fs.writeFileSync(configFile, removeEnvironmentAssignment(content, key));
};

export const replaceEnvironmentAssignmentFileDurably = (
  configFile: string,
  key: string,
  value: string,
): void => {
  const content = fs.readFileSync(configFile, "utf-8");
  const replacement = upsertEnvironmentAssignment(content, key, value);
  const mode = fs.statSync(configFile).mode & 0o777;
  const temporaryFile = path.join(
    path.dirname(configFile),
    `.${path.basename(configFile)}.${process.pid}.${randomUUID()}.tmp`,
  );
  let descriptor: number | null = null;
  let renamed = false;

  try {
    descriptor = fs.openSync(temporaryFile, "wx", mode);
    fs.writeFileSync(descriptor, replacement, { encoding: "utf-8" });
    fs.fsyncSync(descriptor);
    fs.closeSync(descriptor);
    descriptor = null;
    fs.renameSync(temporaryFile, configFile);
    renamed = true;
  } finally {
    if (descriptor !== null) {
      try {
        fs.closeSync(descriptor);
      } catch {
        // Preserve the original pre-commit failure.
      }
    }
    if (!renamed) {
      try {
        fs.unlinkSync(temporaryFile);
      } catch {
        // The temporary file may not have been created.
      }
    }
  }
};
