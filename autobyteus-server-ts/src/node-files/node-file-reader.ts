import fs from "node:fs";
import path from "node:path";
import { lookup as lookupMime } from "mime-types";

/**
 * A node file (autobyteus-436): a file on the node's computer (a Docker node: inside its container) addressed by its
 * absolute path, not through a workspace. The reader decides which path is servable and opens it read-only; who may
 * ask is the node access gate's decision (node access model NA-7, NAS-39, NAS-40). No HTTP here.
 */
export type NodeFileRefusalCode =
  | "NODE_FILE_PATH_INVALID"
  | "NODE_FILE_NOT_FOUND"
  | "NODE_FILE_IS_FOLDER"
  /** The operating system refuses the node's user, the path loops, or it is not a regular file (a socket, a device). */
  | "NODE_FILE_UNREADABLE";

export type NodeFileRefusal = Readonly<{ ok: false; statusCode: 400 | 404; code: NodeFileRefusalCode; message: string }>;

export type OpenedNodeFile = Readonly<{
  ok: true;
  realPath: string;
  mimeType: string;
  /** Its length in bytes and modification time, from the opened handle: its version (autobyteus-574 D-1). */
  size: number;
  modifiedMs: number;
}>;

const refusal = (statusCode: 400 | 404, code: NodeFileRefusalCode, message: string): NodeFileRefusal =>
  Object.freeze({ ok: false, statusCode, code, message });

export const NODE_FILE_REFUSALS = Object.freeze({
  pathInvalid: refusal(400, "NODE_FILE_PATH_INVALID", "The path must be an absolute path without '..' segments."),
  notFound: refusal(404, "NODE_FILE_NOT_FOUND", "No file exists at this path."),
  isFolder: refusal(400, "NODE_FILE_IS_FOLDER", "This path is a folder, not a file."),
  unreadable: refusal(400, "NODE_FILE_UNREADABLE", "This file cannot be read by the node."),
});

const NOT_FOUND_ERRORS = new Set(["ENOENT", "ENOTDIR"]);

/** The refusal for a failed `fs` call; its message and the path are never logged or answered (QR-001). */
const refusalForError = (error: unknown): NodeFileRefusal =>
  NOT_FOUND_ERRORS.has((error as NodeJS.ErrnoException | null)?.code ?? "") ? NODE_FILE_REFUSALS.notFound : NODE_FILE_REFUSALS.unreadable;

/** An absolute path without `..` segments and without NUL bytes, in either separator. */
const isServablePathText = (value: unknown): value is string =>
  typeof value === "string"
  && value.length > 0
  && !value.includes("\0")
  && path.isAbsolute(value)
  && !value.split(/[\\/]+/).includes("..");

export class NodeFileReader {
  /**
   * Checks one node file: the path is resolved to its real path (symbolic links followed), opened read-only, and
   * servable only when the opened file is a regular file. The reply reads it from that real path, by range
   * (autobyteus-574 D-1). A refusal says why, never which part of the path failed.
   */
  async open(requestedPath: unknown): Promise<OpenedNodeFile | NodeFileRefusal> {
    if (!isServablePathText(requestedPath)) return NODE_FILE_REFUSALS.pathInvalid;
    let realPath: string;
    let handle: fs.promises.FileHandle;
    try {
      realPath = await fs.promises.realpath(requestedPath);
      handle = await fs.promises.open(realPath, fs.constants.O_RDONLY);
    } catch (error) {
      return refusalForError(error);
    }
    let stat: fs.Stats;
    try {
      stat = await handle.stat();
    } catch (error) {
      return refusalForError(error);
    } finally {
      await handle.close().catch(() => undefined);
    }
    if (stat.isDirectory()) return NODE_FILE_REFUSALS.isFolder;
    if (!stat.isFile()) return NODE_FILE_REFUSALS.unreadable;
    return Object.freeze({
      ok: true,
      realPath,
      mimeType: (lookupMime(realPath) || "application/octet-stream").toString(),
      size: stat.size,
      modifiedMs: stat.mtimeMs,
    });
  }
}
