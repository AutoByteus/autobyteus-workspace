import fs from "node:fs";
import fsPromises from "node:fs/promises";
import { objectRecord } from "./run-execution-tree-shared-record-schemas.js";

const isMissingFile = (error: unknown): boolean => (error as NodeJS.ErrnoException | null)?.code === "ENOENT";

/** A run's tree file as stored, before validation; `null` when the file does not exist. */
export const readRawTreeFile = async (filePath: string): Promise<Record<string, unknown> | null> => {
  try { return objectRecord(JSON.parse(await fsPromises.readFile(filePath, "utf8")), filePath); }
  catch (error) { if (isMissingFile(error)) return null; throw error; }
};

export const readRawTreeFileSync = (filePath: string): Record<string, unknown> | null => {
  try { return objectRecord(JSON.parse(fs.readFileSync(filePath, "utf8")), filePath); }
  catch (error) { if (isMissingFile(error)) return null; throw error; }
};
