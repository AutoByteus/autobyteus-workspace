import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import fastify, { type FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { NodeAccessGate } from "../../../../src/api/security/node-access-gate.js";
import { OpenSocketRegistry } from "../../../../src/api/security/open-socket-registry.js";
import { readDefinitionAvatar, type PackageAvatar } from "../../../../src/agent-package-definitions/domain/definition-avatar-file.js";

vi.mock("../../../../src/api/graphql/studio-application-api-services.js", () => ({
  getStudioAgentDefinitionService: vi.fn(), getStudioAgentTeamDefinitionService: vi.fn(), getStudioAgentOrgDefinitionService: vi.fn(),
}));
const { registerDefinitionAvatarRoutes } = await import("../../../../src/api/rest/definition-avatars.js");

/** A synthetic 1×1 PNG. */
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg==", "base64");

// autobyteus-669 S-3 (REQ-006, AC-005): the package picture route, behind the node's real request gate.
describe("GET /rest/definition-avatars/:kind/:definitionId", () => {
  let app: FastifyInstance;
  let root: string;
  const known = new Map<string, PackageAvatar>();
  const lookups: string[] = [];

  beforeAll(async () => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "definition-avatar-route-"));
    for (const [kind, id] of [["agent", "writer"], ["agent_team", "org/crew"], ["agent_org", "studio"]] as const) {
      const folder = path.join(root, kind, id.replace("/", "-"));
      fs.mkdirSync(folder, { recursive: true });
      fs.writeFileSync(path.join(folder, "avatar.png"), PNG);
      const read = await readDefinitionAvatar(folder);
      if (read.status === "valid") known.set(`${kind}:${id}`, read.avatar);
    }
    // A definition whose picture became invalid after it was read.
    const stale = path.join(root, "agent", "stale");
    fs.mkdirSync(stale, { recursive: true });
    fs.writeFileSync(path.join(stale, "avatar.png"), PNG);
    const read = await readDefinitionAvatar(stale);
    if (read.status === "valid") known.set("agent:stale", read.avatar);
    fs.writeFileSync(path.join(stale, "avatar.png"), "no longer a picture");

    // The gate: a desktop owner, a paired phone, a peer node; the route permission decides.
    const identities: Record<string, unknown> = {
      "Bearer owner": { kind: "owner", credentialId: "owner-1" },
      "Bearer phone": { kind: "phone", deviceId: "phone-1" },
      "Bearer peer": { kind: "peer", nodeId: "node-b" },
    };
    const gate = new NodeAccessGate(
      { admits: async () => true },
      { identify: async ({ headers }: { headers: Record<string, unknown> }) => {
        const identity = identities[String(headers.authorization ?? "")];
        return identity ? { ok: true, identity } : { ok: false, refusal: { statusCode: 401, code: "NODE_CREDENTIAL_REQUIRED", message: "Sign in." } };
      } } as never,
      new OpenSocketRegistry(),
      [],
    );
    app = fastify();
    app.addHook("onRequest", async (request, reply) => {
      const decision = await gate.decide(request);
      if (!decision.ok) return reply.code(decision.refusal.statusCode).send({ code: decision.refusal.code });
    });
    await app.register(async (rest) => registerDefinitionAvatarRoutes(rest, async (kind, id) => {
      lookups.push(`${kind}:${id}`);
      return known.get(`${kind}:${id}`) ?? null;
    }), { prefix: "/rest" });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    fs.rmSync(root, { recursive: true, force: true });
  });

  const get = (url: string, authorization = "Bearer phone", headers: Record<string, string> = {}) =>
    app.inject({ method: "GET", url, headers: { authorization, ...headers } });

  it.each([
    ["/rest/definition-avatars/agent/writer?v=abc", "agent:writer"],
    ["/rest/definition-avatars/agent_team/org%2Fcrew?v=abc", "agent_team:org/crew"],
    ["/rest/definition-avatars/agent_org/studio", "agent_org:studio"],
  ])("sends %s to a phone: the picture's bytes, its type, its version, revalidated before reuse", async (url, key) => {
    const response = await get(url);
    expect(response.statusCode).toBe(200);
    expect(response.rawPayload.equals(PNG)).toBe(true);
    expect(response.headers["content-type"]).toBe("image/png");
    expect(response.headers.etag).toMatch(/^"\d+-\d+"$/);
    expect(response.headers["cache-control"]).toBe("no-cache");
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(lookups.at(-1)).toBe(key);
    // The same version again: 304.
    expect((await get(url, "Bearer phone", { "if-none-match": String(response.headers.etag) })).statusCode).toBe(304);
  });

  it("sends it to the desktop owner too", async () => {
    expect((await get("/rest/definition-avatars/agent/writer", "Bearer owner")).statusCode).toBe(200);
  });

  it("refuses a peer node's credential (403) and a request without one (401)", async () => {
    expect((await get("/rest/definition-avatars/agent/writer", "Bearer peer")).statusCode).toBe(403);
    expect((await get("/rest/definition-avatars/agent/writer", "")).statusCode).toBe(401);
  });

  it.each([
    ["an unknown kind", "/rest/definition-avatars/skill/writer"],
    ["an unknown definition", "/rest/definition-avatars/agent/nobody"],
    ["a picture no longer valid on disk", "/rest/definition-avatars/agent/stale"],
  ])("answers 404 for %s", async (_name, url) => {
    expect((await get(url)).statusCode).toBe(404);
  });

  it("never takes a path from the request: a traversal names no definition", async () => {
    const response = await get("/rest/definition-avatars/agent/..%2F..%2Fetc%2Fpasswd");
    expect(response.statusCode).toBe(404);
    expect(lookups.at(-1)).toBe("agent:../../etc/passwd");
  });
});
