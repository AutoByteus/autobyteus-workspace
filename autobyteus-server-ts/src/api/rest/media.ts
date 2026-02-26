import type { FastifyInstance } from "fastify";
import {
  InvalidMediaCategoryError,
  InvalidMediaPathError,
  MediaFileNotFoundError,
  getMediaStorageService,
} from "../../services/media-storage-service.js";

const logger = {
  error: (...args: unknown[]) => console.error(...args),
  warn: (...args: unknown[]) => console.warn(...args),
};

export async function registerMediaRoutes(app: FastifyInstance): Promise<void> {
  app.get<{
    Querystring: { category?: string; page?: string; limit?: string };
  }>("/media", async (request, reply) => {
    const { category, page, limit } = request.query;
    const pageNumber = page ? Number(page) : 1;
    const limitNumber = limit ? Number(limit) : 20;

    if (Number.isNaN(pageNumber) || pageNumber < 1) {
      return reply.code(400).send({ detail: "Invalid page value." });
    }
    if (Number.isNaN(limitNumber) || limitNumber < 1 || limitNumber > 100) {
      return reply.code(400).send({ detail: "Invalid limit value." });
    }

    try {
      const mediaStorageService = getMediaStorageService();
      const result = await mediaStorageService.listMediaFiles(category, pageNumber, limitNumber);
      return reply.send(result);
    } catch (error) {
      logger.error(`Error listing media files: ${String(error)}`);
      return reply
        .code(500)
        .send({ detail: "An internal server error occurred while listing media files." });
    }
  });

  app.delete<{
    Params: { category: string; filename: string };
  }>("/media/:category/:filename", async (request, reply) => {
    const { category, filename } = request.params;

    try {
      const mediaStorageService = getMediaStorageService();
      mediaStorageService.deleteMediaFile(category, filename);
      return reply.code(204).send();
    } catch (error) {
      if (error instanceof InvalidMediaCategoryError || error instanceof InvalidMediaPathError) {
        logger.error(`Invalid request to delete media: ${String(error)}`);
        return reply.code(400).send({ detail: error.message });
      }
      if (error instanceof MediaFileNotFoundError) {
        logger.warn(`Media file not found for deletion: ${String(error)}`);
        return reply.code(404).send({ detail: error.message });
      }
      logger.error(`Error deleting media file: ${String(error)}`);
      return reply
        .code(500)
        .send({ detail: "An internal server error occurred while deleting the file." });
    }
  });
}
