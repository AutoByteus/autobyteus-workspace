import fs from "node:fs/promises";
import path from "node:path";
import {
  EMPTY_MESSAGE_FILE_REFERENCE_PROJECTION,
  type MessageFileReferenceProjection,
} from "./message-file-reference-types.js";

const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
};

export const getMessageFileReferenceProjectionPath = (teamMemoryDir: string): string =>
  path.join(path.resolve(teamMemoryDir), "message_file_references.json");

const emptyProjection = (): MessageFileReferenceProjection => ({
  ...EMPTY_MESSAGE_FILE_REFERENCE_PROJECTION,
  entries: [],
});

const isMissingFileError = (error: unknown): boolean =>
  typeof error === "object"
  && error !== null
  && "code" in error
  && (error as { code?: unknown }).code === "ENOENT";

export class MessageFileReferenceProjectionStore {
  async readProjection(teamMemoryDir: string): Promise<MessageFileReferenceProjection> {
    const projectionPath = getMessageFileReferenceProjectionPath(teamMemoryDir);
    try {
      const parsed = JSON.parse(await fs.readFile(projectionPath, "utf-8")) as MessageFileReferenceProjection;
      return {
        version: 1,
        entries: Array.isArray(parsed?.entries) ? parsed.entries : [],
      };
    } catch (error) {
      if (!isMissingFileError(error)) {
        logger.warn(
          `MessageFileReferenceProjectionStore: failed reading projection '${projectionPath}': ${String(error)}`,
        );
      }
      return emptyProjection();
    }
  }

  async writeProjection(
    teamMemoryDir: string,
    projection: MessageFileReferenceProjection,
  ): Promise<void> {
    const projectionPath = getMessageFileReferenceProjectionPath(teamMemoryDir);
    const projectionDir = path.dirname(projectionPath);
    const tempProjectionPath = path.join(
      projectionDir,
      `.message_file_references.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`,
    );
    await fs.mkdir(projectionDir, { recursive: true });
    try {
      await fs.writeFile(
        tempProjectionPath,
        JSON.stringify({ version: 1, entries: projection.entries }, null, 2),
        "utf-8",
      );
      await fs.rename(tempProjectionPath, projectionPath);
    } catch (error) {
      await fs.rm(tempProjectionPath, { force: true }).catch(() => undefined);
      throw error;
    }
  }
}

let cachedStore: MessageFileReferenceProjectionStore | null = null;

export const getMessageFileReferenceProjectionStore = (): MessageFileReferenceProjectionStore => {
  if (!cachedStore) {
    cachedStore = new MessageFileReferenceProjectionStore();
  }
  return cachedStore;
};
