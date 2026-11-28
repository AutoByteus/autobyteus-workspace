import { createHash } from "node:crypto";
import { constants as fsConstants, type Stats } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { errorText } from "./definition-files.js";

/** The largest package picture the node reads (autobyteus-669 DEC-001). */
export const DEFINITION_AVATAR_MAX_BYTES = 1024 * 1024;

/** The picture file names a definition folder may hold, and their types. SVG and GIF are excluded (script, animation). */
export const DEFINITION_AVATAR_FILES: Readonly<Record<string, string>> = Object.freeze({
  "avatar.png": "image/png",
  "avatar.jpg": "image/jpeg",
  "avatar.jpeg": "image/jpeg",
  "avatar.webp": "image/webp",
});

/**
 * A definition's package picture: one file beside its `agent.md`, `team.md` or `org.md`, read at each read of the
 * definition and never stored. `version` is the first 12 hex digits of its SHA-256, the address's `?v=`.
 */
export type PackageAvatar = Readonly<{
  /** The definition's own folder, where the reader found it; the route serves only `folder/fileName`. */
  folder: string;
  fileName: string;
  mimeType: string;
  version: string;
  hash: string;
}>;

export type DefinitionAvatarRead =
  | Readonly<{ status: "none" }>
  | Readonly<{ status: "valid"; avatar: PackageAvatar }>
  | Readonly<{ status: "invalid"; reason: string }>;

const startsWith = (bytes: Buffer, signature: readonly number[], offset = 0): boolean =>
  bytes.length >= offset + signature.length && signature.every((byte, index) => bytes[offset + index] === byte);

/** Whether the bytes are of the type the name says: PNG `89 50 4E 47`, JPEG `FF D8 FF`, WebP `RIFF….WEBP`. */
const bytesAreOfType = (mimeType: string, bytes: Buffer): boolean => {
  if (mimeType === "image/png") return startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (mimeType === "image/jpeg") return startsWith(bytes, [0xff, 0xd8, 0xff]);
  if (mimeType === "image/webp") return startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8);
  return false;
};

/**
 * Per file path: the last size and modification time read, and what its bytes were (their hash, or not of their type).
 * A reload reuses it while both are unchanged, so an unchanged picture is not read again (ARCH-REV-002 N-3).
 */
const contentByPath = new Map<string, Readonly<{ size: number; mtimeMs: number; hash: string | null }>>();

/** Reads a regular file without following a link at its last part (no-op flag where the platform has none). */
const readRegularFile = async (filePath: string): Promise<Buffer> => {
  const handle = await fs.open(filePath, fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW ?? 0));
  try {
    return await handle.readFile();
  } finally {
    await handle.close();
  }
};

/**
 * The package picture of one definition folder (autobyteus-669 S-1, the one rule for agents, teams and orgs). None:
 * no candidate file. Invalid, with its reason: more than one candidate, not a regular file (a symbolic link included,
 * N-1), larger than 1 MiB, bytes not of its type, or unreadable. Never throws.
 */
export const readDefinitionAvatar = async (folder: string): Promise<DefinitionAvatarRead> => {
  let names: string[];
  try {
    names = (await fs.readdir(folder)).filter((name) => Object.hasOwn(DEFINITION_AVATAR_FILES, name)).sort();
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT" || code === "ENOTDIR") return { status: "none" };
    return { status: "invalid", reason: `the folder could not be listed (${errorText(error)})` };
  }
  if (names.length === 0) return { status: "none" };
  if (names.length > 1) return { status: "invalid", reason: `more than one picture (${names.join(", ")})` };
  const fileName = names[0]!;
  const mimeType = DEFINITION_AVATAR_FILES[fileName]!;
  const filePath = path.join(folder, fileName);
  let stat: Stats;
  try {
    stat = await fs.lstat(filePath);
  } catch (error) {
    return { status: "invalid", reason: `${fileName} could not be read (${errorText(error)})` };
  }
  if (stat.isSymbolicLink()) return { status: "invalid", reason: `${fileName} is a symbolic link, not a file` };
  if (!stat.isFile()) return { status: "invalid", reason: `${fileName} is not a regular file` };
  if (stat.size > DEFINITION_AVATAR_MAX_BYTES) {
    return { status: "invalid", reason: `${fileName} is larger than 1 MiB (${stat.size} bytes)` };
  }
  let content = contentByPath.get(filePath);
  if (!content || content.size !== stat.size || content.mtimeMs !== stat.mtimeMs) {
    let bytes: Buffer;
    try {
      bytes = await readRegularFile(filePath);
    } catch (error) {
      return { status: "invalid", reason: `${fileName} could not be read (${errorText(error)})` };
    }
    if (bytes.length > DEFINITION_AVATAR_MAX_BYTES) {
      return { status: "invalid", reason: `${fileName} is larger than 1 MiB (${bytes.length} bytes)` };
    }
    content = {
      size: stat.size,
      mtimeMs: stat.mtimeMs,
      hash: bytesAreOfType(mimeType, bytes) ? createHash("sha256").update(bytes).digest("hex") : null,
    };
    contentByPath.set(filePath, content);
  }
  if (content.hash === null) return { status: "invalid", reason: `${fileName} is not a ${mimeType.slice("image/".length).toUpperCase()} picture` };
  return { status: "valid", avatar: { folder, fileName, mimeType, version: content.hash.slice(0, 12), hash: content.hash } };
};

/** Per folder, the reason its picture was last ignored for: a reason is logged only when it changes (N-2). */
const ignoredReasonByFolder = new Map<string, string>();

/**
 * A definition reader's package picture: the valid one, else null. An invalid picture is ignored (the definition
 * loads, the fallback shows) and logged with its folder and reason, once until that folder's reason changes.
 */
export const readPackageAvatar = async (folder: string): Promise<PackageAvatar | null> => {
  const read = await readDefinitionAvatar(folder);
  const reason = read.status === "invalid" ? read.reason : null;
  if (reason !== (ignoredReasonByFolder.get(folder) ?? null)) {
    if (reason === null) ignoredReasonByFolder.delete(folder);
    else {
      ignoredReasonByFolder.set(folder, reason);
      console.warn(`DEFINITION_AVATAR_IGNORED: the picture in ${folder} is ignored: ${reason}.`);
    }
  }
  return read.status === "valid" ? read.avatar : null;
};
