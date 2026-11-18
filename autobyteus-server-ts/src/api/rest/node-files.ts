import type { FastifyInstance } from "fastify";
import { NodeFileReader } from "../../node-files/node-file-reader.js";
import { sendUserFile } from "./user-file-reply.js";

/**
 * `GET /rest/node-files/content?path=<absolute>` (autobyteus-436, NAS-39): one node file, read-only, answered as a
 * user file (its type, the sandbox CSP, `nosniff`). The node access gate already decided who may ask (owner and
 * phone, NAS-40); the reader decides which path is servable. Nothing here logs the path.
 */
export async function registerNodeFileRoutes(app: FastifyInstance, reader: NodeFileReader = new NodeFileReader()): Promise<void> {
  app.get<{ Querystring: { path?: string } }>("/node-files/content", async (request, reply) => {
    const opened = await reader.open(request.query?.path);
    if (!opened.ok) {
      return reply.code(opened.statusCode).send({ code: opened.code, message: opened.message });
    }
    return sendUserFile(reply, { mimeType: opened.mimeType, body: opened.stream });
  });
}
