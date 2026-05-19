import fs from "node:fs";
import path from "node:path";
import type { FastifyInstance } from "fastify";
import { lookup as lookupMime } from "mime-types";
import { appConfigProvider } from "../../config/app-config-provider.js";

const candidateMobileWebRoots = (): string[] => {
  const appRoot = appConfigProvider.config.getAppRootDir();
  return [
    path.join(appRoot, "mobile-web"),
    path.join(appRoot, "public", "mobile"),
    path.resolve(appRoot, "..", "autobyteus-web", "dist", "public"),
  ];
};

const resolveMobileWebRoot = (): string | null =>
  candidateMobileWebRoots().find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) ?? null;

const safeResolve = (root: string, requestPath: string): string | null => {
  const relativePath = requestPath.replace(/^\/mobile\/?/, "");
  const requested = relativePath || "index.html";
  const resolved = path.resolve(root, requested);
  const rootResolved = path.resolve(root);
  if (resolved !== rootResolved && !resolved.startsWith(`${rootResolved}${path.sep}`)) {
    return null;
  }
  if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) {
    return resolved;
  }
  const fallback = path.join(root, "index.html");
  return fs.existsSync(fallback) ? fallback : null;
};

export async function registerMobileWebStaticRoutes(app: FastifyInstance): Promise<void> {
  app.get("/mobile", async (request, reply) => serveMobileAsset(request.url, reply));
  app.get("/mobile/*", async (request, reply) => serveMobileAsset(request.url, reply));
}

const serveMobileAsset = async (
  requestUrl: string,
  reply: { code: (statusCode: number) => { send: (payload: unknown) => unknown }; type: (mimeType: string) => void; send: (payload: unknown) => unknown },
): Promise<unknown> => {
  const root = resolveMobileWebRoot();
  if (!root) {
    return reply.code(404).send({ detail: "Mobile web assets are not installed." });
  }
  const requestPath = new URL(requestUrl, "http://autobyteus.local").pathname;
  const assetPath = safeResolve(root, requestPath);
  if (!assetPath) {
    return reply.code(404).send({ detail: "Mobile web asset not found." });
  }
  const mimeType = lookupMime(assetPath) || "text/html";
  reply.type(String(mimeType));
  return reply.send(fs.createReadStream(assetPath));
};
