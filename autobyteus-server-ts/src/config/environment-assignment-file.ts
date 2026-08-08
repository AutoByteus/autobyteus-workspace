import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  assignmentName,
  linesWithEndings,
  splitLineEnding,
} from "./environment-assignment-lines.js";

const serializeEnvironmentAssignment = (
  content: string,
  key: string,
  value: string,
): string => {
  let found = false;
  const updated = linesWithEndings(content).map((line) => {
    const { body, ending } = splitLineEnding(line);
    if (assignmentName(body) === key) {
      found = true;
      return `${key}=${value}${ending}`;
    }
    return line;
  }).join("");

  const preferredEnding = content.includes("\r\n") ? "\r\n" : "\n";
  return found
    ? updated
    : `${content}${content.length > 0 && !/[\r\n]$/.test(content) ? preferredEnding : ""}${key}=${value}`;
};

export const updateEnvironmentAssignmentFile = (
  configFile: string,
  key: string,
  value: string,
): void => {
  const content = fs.readFileSync(configFile, "utf-8");
  fs.writeFileSync(configFile, serializeEnvironmentAssignment(content, key, value));
};

export const removeEnvironmentAssignmentFromFile = (
  configFile: string,
  key: string,
): void => {
  const content = fs.readFileSync(configFile, "utf-8");
  const filtered = linesWithEndings(content).filter((line) => {
    const { body } = splitLineEnding(line);
    return assignmentName(body) !== key;
  }).join("");
  fs.writeFileSync(configFile, filtered);
};

export const replaceEnvironmentAssignmentFileDurably = (
  configFile: string,
  key: string,
  value: string,
): void => {
  const content = fs.readFileSync(configFile, "utf-8");
  const replacement = serializeEnvironmentAssignment(content, key, value);
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
