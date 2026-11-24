import fs from "node:fs";
import type { FastifyReply, FastifyRequest } from "fastify";

/**
 * Wherever a user file is opened (a viewer, a browser tab, the in-app browser, an agent's browser tool),
 * it runs in an opaque origin, never with this node's origin and rights; scripts still run, walled off.
 * PDFs included: the viewer renders under this policy (measured, autobyteus-416 A1).
 */
const USER_FILE_SANDBOX = "sandbox allow-scripts";

/**
 * A user file a route answers with: a regular file the route resolved, served by byte range with its version
 * (autobyteus-574 D-1).
 */
export type UserFileContent = Readonly<{
  mimeType: string;
  /** The resolved path the route checked; read here, from the requested offset. */
  path: string;
  /** Length in bytes and modification time, from the route's `stat`: together the file's version. */
  size: number;
  modifiedMs: number;
}>;

type ByteRange = Readonly<{ start: number; end: number }>;

/** The file's version: its size and modification time, so a rewrite changes it. Strong: the bytes are the file's. */
const versionOf = (content: Readonly<{ size: number; modifiedMs: number }>): string =>
  `"${content.size}-${Math.floor(content.modifiedMs)}"`;

const opaqueTag = (tag: string): string => tag.trim().replace(/^W\//, "");

/** `If-None-Match` (weak comparison, RFC 9110 13.1.2): `*`, or a list naming the current version. */
const matchesNoneMatch = (header: string | undefined, version: string): boolean =>
  header !== undefined
  && (header.trim() === "*" || header.split(",").some((tag) => opaqueTag(tag) === version));

/**
 * One `bytes=` range of a file of `size` bytes (`a-b`, `a-`, `-n`). `"ignore"` for a header this reply does not honour:
 * a malformed one or several ranges, which are answered with the whole file (RFC 9110 14.2); `"unsatisfiable"` for a
 * well-formed range outside the file.
 */
const parseRange = (header: string, size: number): ByteRange | "ignore" | "unsatisfiable" => {
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match || (match[1] === "" && match[2] === "")) return "ignore";
  if (match[1] === "") {
    const suffix = Number(match[2]);
    if (suffix === 0 || size === 0) return "unsatisfiable";
    return { start: Math.max(0, size - suffix), end: size - 1 };
  }
  const start = Number(match[1]);
  const lastRequested = match[2] === "" ? null : Number(match[2]);
  if (lastRequested !== null && lastRequested < start) return "ignore";
  if (start >= size) return "unsatisfiable";
  return { start, end: Math.min(lastRequested ?? size - 1, size - 1) };
};

/** The range to serve: none without a `Range`, or when `If-Range` names another version than the current one. */
const requestedRange = (request: FastifyRequest, size: number, version: string): ByteRange | "unsatisfiable" | null => {
  const range = request.headers.range;
  if (typeof range !== "string") return null;
  const ifRange = request.headers["if-range"];
  if (typeof ifRange === "string" && ifRange.trim() !== version) return null;
  const parsed = parseRange(range, size);
  return parsed === "ignore" ? null : parsed;
};

/** The one way a node route answers with a user file's content. Route-specific headers (cache) stay with the route. */
export const sendUserFile = (reply: FastifyReply, content: UserFileContent, request: FastifyRequest): FastifyReply => {
  reply.header("Content-Security-Policy", USER_FILE_SANDBOX);
  reply.header("X-Content-Type-Options", "nosniff");
  reply.type(content.mimeType);
  const version = versionOf(content);
  reply.header("Accept-Ranges", "bytes");
  reply.header("ETag", version);
  // Revalidate before every reuse (a 304 when unchanged, the new bytes when rewritten), so no cache shows an old copy
  // of a file an agent rewrote. A route that forbids storing it at all (`no-store`) keeps that.
  if (!reply.hasHeader("cache-control")) reply.header("Cache-Control", "no-cache");
  if (matchesNoneMatch(request.headers["if-none-match"], version)) return reply.code(304).send();

  const range = requestedRange(request, content.size, version);
  if (range === "unsatisfiable") {
    reply.header("Content-Range", `bytes */${content.size}`);
    return reply.code(416).send();
  }
  if (range === null) {
    reply.header("Content-Length", String(content.size));
    return reply.send(fs.createReadStream(content.path));
  }
  reply.header("Content-Range", `bytes ${range.start}-${range.end}/${content.size}`);
  reply.header("Content-Length", String(range.end - range.start + 1));
  return reply.code(206).send(fs.createReadStream(content.path, { start: range.start, end: range.end }));
};
