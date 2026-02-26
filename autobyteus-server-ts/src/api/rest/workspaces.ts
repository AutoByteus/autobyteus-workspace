import fs from "node:fs";
import path from "node:path";
import type { FastifyInstance } from "fastify";
import { lookup as lookupMime } from "mime-types";
import { getWorkspaceManager } from "../../workspaces/workspace-manager.js";

const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
};

export async function registerWorkspaceRoutes(app: FastifyInstance): Promise<void> {
  app.get<{
    Params: { workspaceId: string };
    Querystring: { path?: string };
  }>("/workspaces/:workspaceId/content", async (request, reply) => {
    const { workspaceId } = request.params;
    const filePath = request.query?.path;

    if (!filePath) {
      return reply.code(400).send({ detail: "Missing required query parameter: path" });
    }

    const workspace = getWorkspaceManager().getWorkspaceById(workspaceId);
    if (!workspace) {
      logger.warn(`Attempted to access non-existent workspace: ${workspaceId}`);
      return reply.code(404).send({ detail: "Workspace not found" });
    }

    try {
      const absolutePath = workspace.getAbsolutePath(filePath);

      if (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isFile()) {
        throw new Error(`File does not exist at path: ${filePath}`);
      }

      const mimeType = lookupMime(absolutePath) || "application/octet-stream";
      reply.type(mimeType.toString());
      return reply.send(fs.createReadStream(absolutePath));
    } catch (error) {
      if (error instanceof Error && error.message.includes("Access denied")) {
        logger.error(
          `Security error accessing path ${filePath} in workspace ${workspaceId}: ${error.message}`,
        );
        return reply.code(400).send({ detail: error.message });
      }

      if (error instanceof Error && error.message.includes("does not exist")) {
        logger.warn(`File not found in workspace ${workspaceId}: ${filePath}`);
        return reply.code(404).send({ detail: "File not found in workspace" });
      }

      logger.error(
        `Error serving file ${filePath} from workspace ${workspaceId}: ${String(error)}`,
      );
      return reply.code(500).send({ detail: "An internal server error occurred" });
    }
  });

  app.get<{
    Params: { workspaceId: string } & Record<string, string>;
  }>("/workspaces/:workspaceId/static/*", async (request, reply) => {
    const { workspaceId } = request.params;
    const filePath = request.params["*"];

    if (!filePath) {
      return reply.code(400).send({ detail: "Missing file path." });
    }

    const workspace = getWorkspaceManager().getWorkspaceById(workspaceId);
    if (!workspace) {
      logger.warn(`Attempted to access non-existent workspace: ${workspaceId}`);
      return reply.code(404).send({ detail: "Workspace not found" });
    }

    try {
      const absolutePath = workspace.getAbsolutePath(filePath);

      if (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isFile()) {
        throw new Error(`File does not exist at path: ${filePath}`);
      }

      const mimeType = lookupMime(absolutePath) || "application/octet-stream";
      reply.type(mimeType.toString());
      return reply.send(fs.createReadStream(absolutePath));
    } catch (error) {
      if (error instanceof Error && error.message.includes("Access denied")) {
        logger.error(
          `Security error accessing path ${filePath} in workspace ${workspaceId}: ${error.message}`,
        );
        return reply.code(400).send({ detail: error.message });
      }

      if (error instanceof Error && error.message.includes("does not exist")) {
        logger.warn(`File not found in workspace ${workspaceId}: ${filePath}`);
        return reply.code(404).send({ detail: "File not found in workspace" });
      }

      logger.error(
        `Error serving file ${filePath} from workspace ${workspaceId}: ${String(error)}`,
      );
      return reply.code(500).send({ detail: "An internal server error occurred" });
    }
  });
}
