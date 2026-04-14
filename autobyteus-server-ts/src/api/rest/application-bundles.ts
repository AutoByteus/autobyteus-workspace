import fs from "node:fs";
import type { FastifyInstance } from "fastify";
import { lookup as lookupMime } from "mime-types";
import { ApplicationBundleService } from "../../application-bundles/services/application-bundle-service.js";

const service = () => ApplicationBundleService.getInstance();

export async function registerApplicationBundleRoutes(app: FastifyInstance): Promise<void> {
  app.get<{
    Params: { applicationId: string } & Record<string, string>;
  }>("/application-bundles/:applicationId/assets/*", async (request, reply) => {
    const { applicationId } = request.params;
    const relativeAssetPath = request.params["*"];

    if (!relativeAssetPath) {
      return reply.code(400).send({ detail: "Missing application asset path." });
    }

    try {
      const asset = await service().resolveUiAsset(applicationId, relativeAssetPath);
      const mimeType = lookupMime(asset.absolutePath) || "application/octet-stream";
      reply.type(mimeType.toString());
      return reply.send(fs.createReadStream(asset.absolutePath));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("not found")) {
        return reply.code(404).send({ detail: message });
      }
      if (message.includes("must stay")) {
        return reply.code(400).send({ detail: message });
      }
      return reply.code(500).send({ detail: "An internal server error occurred." });
    }
  });
}
