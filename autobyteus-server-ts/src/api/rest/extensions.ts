import fs from "node:fs/promises";
import type { FastifyError, FastifyInstance, FastifyReply } from "fastify";
import { contentType, lookup } from "mime-types";
import { ExtensionError, errorMessage, type ExtensionErrorCode } from "../../extensions/domain/extension-error.js";
import type { ExtensionManager } from "../../extensions/services/extension-manager.js";

/** About 17 minutes of 48 kHz mono 16-bit audio; today's dictation has no length limit, so the limit is generous. */
export const EXTENSION_ACTION_BODY_LIMIT_BYTES = 100 * 1024 * 1024;

const STATUS_OF: Record<ExtensionErrorCode, number> = {
  EXTENSION_NOT_INSTALLED: 404,
  EXTENSION_OFF: 409,
  EXTENSION_BUSY: 409,
  UNKNOWN_ACTION: 404,
  RECORDING_TOO_LONG: 413,
  ACTION_FAILED: 500,
  EXTENSION_NOT_OFFERED: 404,
  EXTENSION_NOT_AVAILABLE: 409,
  EXTENSION_CATALOG_NOT_VERIFIED: 409,
  EXTENSION_ALREADY_INSTALLED: 409,
  EXTENSION_NO_UPDATE: 409,
};

/**
 * The extension page's CSP (design-spec.md, Off-Spine Concerns; contract §2, §5): a sandboxed, opaque-origin page that
 * may run inline code and load classic scripts, stylesheets and images from its own `ui/` path, fonts only as `data:`,
 * and reach nothing else: the desktop attaches the owner credential to every request to a node.
 */
const pageSecurityPolicy = (uiUrl: string): string => [
  "sandbox allow-scripts",
  "default-src 'none'",
  `script-src 'unsafe-inline' ${uiUrl}`,
  `style-src 'unsafe-inline' ${uiUrl}`,
  `img-src ${uiUrl} data:`,
  "font-src data:",
  "connect-src 'none'",
  "form-action 'none'",
].join("; ");

const sendError = (reply: FastifyReply, code: ExtensionErrorCode, message: string) =>
  reply.code(STATUS_OF[code]).send({ code, message });

/**
 * The extensions' REST routes (contract §6), owner only (route table): an action call of one extension, with a JSON
 * body or a WAV recording, and the files of an installed extension's page. Thin transport: the Extension Manager
 * decides everything.
 */
export async function registerExtensionRoutes(
  app: FastifyInstance,
  dependencies: Readonly<{ extensions: ExtensionManager }>,
): Promise<void> {
  const { extensions } = dependencies;

  await app.register(async (actions) => {
    // Fastify refuses `audio/wav` without a parser (SP-2): this one, with its own limit, serves only these routes.
    actions.addContentTypeParser("audio/wav", { parseAs: "buffer", bodyLimit: EXTENSION_ACTION_BODY_LIMIT_BYTES },
      (_request, body, done) => done(null, body));
    actions.setErrorHandler((error: FastifyError, _request, reply) => {
      if (error.statusCode === 413) {
        return sendError(reply, "RECORDING_TOO_LONG", "The recording is too long to transcribe (more than about 17 minutes).");
      }
      return reply.send(error);
    });
    actions.post<{ Params: { id: string; action: string } }>(
      "/extensions/:id/actions/:action",
      { bodyLimit: EXTENSION_ACTION_BODY_LIMIT_BYTES },
      async (request, reply) => {
        const isAudio = request.headers["content-type"]?.startsWith("audio/wav") === true;
        const body = request.body;
        try {
          const output = await extensions.callAction(request.params.id, request.params.action, {
            json: isAudio ? null : (body ?? null),
            bytes: isAudio && Buffer.isBuffer(body) ? new Uint8Array(body) : null,
          });
          return { output: output ?? null };
        } catch (error) {
          if (error instanceof ExtensionError) return sendError(reply, error.code, error.message);
          return sendError(reply, "ACTION_FAILED", errorMessage(error));
        }
      },
    );
  });

  app.get<{ Params: { id: string; "*": string } }>("/extensions/:id/ui/*", async (request, reply) => {
    const { id } = request.params;
    const file = await extensions.pageFile(id, request.params["*"]);
    if (!file) return reply.code(404).send({ code: "NOT_FOUND", message: "No such file in this extension's page." });
    const uiUrl = `${request.protocol}://${request.host}/rest/extensions/${id}/ui/`;
    return reply
      .header("content-type", contentType(lookup(file) || "application/octet-stream") || "application/octet-stream")
      .header("content-security-policy", pageSecurityPolicy(uiUrl))
      .header("x-content-type-options", "nosniff")
      .header("cache-control", "no-store")
      .send(await fs.readFile(file));
  });
}
