import fs from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { lookup as lookupMime } from "mime-types";
import type { StandaloneApplicationSelection } from "../domain/standalone-application-selection.js";

const PLATFORM_PREFIX = "_autobyteus";

const isSameOrInside = (root: string, target: string): boolean =>
  target === root || target.startsWith(`${root}${path.sep}`);

const resolveRequestPath = (rawPath: string): string => {
  let decoded: string;
  try {
    decoded = decodeURIComponent(rawPath);
  } catch {
    throw new Error("INVALID_PATH_ENCODING");
  }
  if (decoded.includes("\0") || decoded.includes("\\") || decoded.startsWith("/")) {
    throw new Error("INVALID_PATH");
  }
  const segments = decoded.split("/").filter(Boolean);
  if (segments.some((segment) => segment === "." || segment === "..")) {
    throw new Error("INVALID_PATH");
  }
  return segments.join("/");
};

const sendFile = (
  reply: FastifyReply,
  absolutePath: string,
): FastifyReply => {
  const mimeType = lookupMime(absolutePath) || "application/octet-stream";
  reply.type(String(mimeType));
  return reply.send(fs.createReadStream(absolutePath));
};

const acceptsHtmlNavigation = (request: FastifyRequest, relativePath: string): boolean => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return false;
  }
  const accept = request.headers.accept ?? "";
  return (
    accept.includes("text/html")
    && !path.posix.basename(relativePath).includes(".")
  );
};

export const registerStandaloneApplicationStaticRoutes = async (
  app: FastifyInstance,
  selection: StandaloneApplicationSelection,
): Promise<void> => {
  const canonicalUiRoot = await fsPromises.realpath(selection.uiRoot);
  const canonicalEntryPath = await fsPromises.realpath(selection.entryHtmlPath);
  if (!isSameOrInside(canonicalUiRoot, canonicalEntryPath)) {
    throw new Error("Standalone application entry HTML escapes the selected UI root.");
  }

  const handle = async (
    request: FastifyRequest,
    reply: FastifyReply,
    rawPath: string,
  ) => {
    let relativePath: string;
    try {
      relativePath = resolveRequestPath(rawPath);
    } catch {
      return reply.code(400).send({ detail: "Invalid standalone application path." });
    }
    if (relativePath === PLATFORM_PREFIX || relativePath.startsWith(`${PLATFORM_PREFIX}/`)) {
      return reply.code(404).send({ detail: "Platform route not found." });
    }

    const requestedPath = relativePath
      ? path.resolve(canonicalUiRoot, relativePath)
      : canonicalEntryPath;
    if (!isSameOrInside(canonicalUiRoot, requestedPath)) {
      return reply.code(400).send({ detail: "Invalid standalone application path." });
    }
    const stat = await fsPromises.stat(requestedPath).catch(() => null);
    if (stat?.isFile()) {
      const realRequestedPath = await fsPromises.realpath(requestedPath).catch(() => null);
      if (!realRequestedPath || !isSameOrInside(canonicalUiRoot, realRequestedPath)) {
        return reply.code(400).send({ detail: "Application asset escapes the UI root." });
      }
      return sendFile(reply, realRequestedPath);
    }
    if (acceptsHtmlNavigation(request, relativePath)) {
      return sendFile(reply, canonicalEntryPath);
    }
    return reply.code(404).send({ detail: "Application asset not found." });
  };

  app.get("/", async (request, reply) =>
    handle(request, reply, ""));
  app.get<{ Params: { "*": string } }>(
    "/*",
    async (request, reply) => handle(request, reply, request.params["*"] ?? ""),
  );
};
