import fastify, { type FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { registerCollaborationMessageReferenceRoutes } from "../../../../src/api/rest/collaboration-message-references.js";
import {
  MessageReferenceContentError,
  setProcessMessageReferenceContentReader,
  type MessageReferenceContentErrorCode,
} from "../../../../src/run-history/services/message-reference-content-reader.js";

/**
 * The one message reference route (autobyteus-615): the identity the message list was read with, `(rootKind, rootRunId)`,
 * reaches the process reader as is; a refusal answers its status with `{ detail, code }`; an unknown root kind is refused
 * before any read.
 */
describe("GET /collaboration-messages/:rootKind/:rootRunId/messages/:messageId/references/:referenceId/content", () => {
  let app: FastifyInstance;
  let release: () => void;
  const resolve = vi.fn();
  beforeAll(async () => {
    release = setProcessMessageReferenceContentReader({ resolve } as never);
    app = fastify();
    await registerCollaborationMessageReferenceRoutes(app);
    await app.ready();
  });
  afterAll(async () => { release(); await app.close(); });

  it("passes the list's identity to the reader for each root kind", async () => {
    for (const rootKind of ["agent", "agent_team", "agent_org"]) {
      resolve.mockRejectedValueOnce(new MessageReferenceContentError("REFERENCE_NOT_FOUND", "not here"));
      await app.inject({ method: "GET", url: `/collaboration-messages/${rootKind}/run%201/messages/m%2F1/references/r1/content` });
      expect(resolve).toHaveBeenLastCalledWith({ rootKind, rootRunId: "run 1", messageId: "m/1", referenceId: "r1" });
    }
  });

  it.each([
    ["REFERENCE_NOT_FOUND", 404],
    ["REFERENCE_CONTENT_UNAVAILABLE", 404],
    ["INVALID_REFERENCE_PATH", 400],
    ["REFERENCE_CONTENT_FORBIDDEN", 403],
  ] as Array<[MessageReferenceContentErrorCode, number]>)("answers %s with %i and its code", async (code, status) => {
    resolve.mockRejectedValueOnce(new MessageReferenceContentError(code, `detail of ${code}`));
    const response = await app.inject({ method: "GET", url: "/collaboration-messages/agent_team/t1/messages/m1/references/r1/content" });
    expect({ status: response.statusCode, body: response.json() }).toEqual({ status, body: { detail: `detail of ${code}`, code } });
  });

  it("refuses an unknown root kind without reading", async () => {
    resolve.mockClear();
    const response = await app.inject({ method: "GET", url: "/collaboration-messages/team_run/t1/messages/m1/references/r1/content" });
    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ code: "INVALID_ROOT_KIND" });
    expect(resolve).not.toHaveBeenCalled();
  });
});
