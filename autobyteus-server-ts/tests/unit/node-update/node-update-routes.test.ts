import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import Fastify, { type FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import { registerNodeUpdateRoutes } from "../../../src/node-update/node-update-routes.js";
import { StarterClient, starterClientFromEnvironment } from "../../../src/node-update/starter-client.js";

type FakeAnswer = { statusCode: number; body: unknown };

const cleanups: Array<() => Promise<void>> = [];
afterEach(async () => { while (cleanups.length > 0) await cleanups.pop()!(); });

/** A fake starter socket that records the request paths and answers with `answer(path)`. */
async function fakeStarter(answer: (requestPath: string) => FakeAnswer): Promise<{ socketPath: string; paths: string[] }> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "node-update-"));
  const socketPath = path.join(dir, "starter.sock");
  const paths: string[] = [];
  const server = http.createServer((request, response) => {
    paths.push(request.url ?? "");
    const { statusCode, body } = answer(request.url ?? "");
    response.writeHead(statusCode, { "content-type": "application/json" });
    response.end(JSON.stringify(body));
  });
  await new Promise<void>((resolve) => server.listen(socketPath, resolve));
  cleanups.push(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    fs.rmSync(dir, { recursive: true, force: true });
  });
  return { socketPath, paths };
}

async function appWith(starter: StarterClient | null): Promise<FastifyInstance> {
  const app = Fastify();
  await app.register(async (rest) => registerNodeUpdateRoutes(rest, starter), { prefix: "/rest" });
  cleanups.push(() => app.close());
  return app;
}

const idleUpdate = { state: "idle", targetVersion: null, step: null, code: null, message: null, startedAt: null, finishedAt: null, requestedFrom: null };

describe("GET /rest/node-update (C1)", () => {
  it("relays the starter's version, target relation and update state", async () => {
    const starter = await fakeStarter(() => ({ statusCode: 200, body: {
      version: "1.5.11-beta.4", state: "running", server: { pid: 9, packageVersion: "1.5.11-beta.4", source: "builtIn" },
      target: { version: "1.5.11-beta.5", relation: "newer" }, update: idleUpdate,
    } }));
    const app = await appWith(new StarterClient(starter.socketPath));
    const response = await app.inject({ method: "GET", url: "/rest/node-update?target=1.5.11-beta.5" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      inPlaceUpdate: "available", version: "1.5.11-beta.4",
      target: { version: "1.5.11-beta.5", relation: "newer" }, update: idleUpdate,
    });
    expect(starter.paths).toEqual(["/status?target=1.5.11-beta.5"]);
  });

  it("asks without a target when none is given", async () => {
    const starter = await fakeStarter(() => ({ statusCode: 200, body: { version: "1.5.11", state: "running", update: idleUpdate } }));
    const app = await appWith(new StarterClient(starter.socketPath));
    const response = await app.inject({ method: "GET", url: "/rest/node-update" });
    expect(response.json()).toEqual({ inPlaceUpdate: "available", version: "1.5.11", update: idleUpdate });
    expect(starter.paths).toEqual(["/status"]);
  });

  it("passes the starter's refusal of an invalid target on as 400", async () => {
    const starter = await fakeStarter(() => ({ statusCode: 400, body: { code: "INVALID_VERSION", message: "'latest' is not a release version" } }));
    const app = await appWith(new StarterClient(starter.socketPath));
    const response = await app.inject({ method: "GET", url: "/rest/node-update?target=latest" });
    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ code: "INVALID_VERSION", message: "'latest' is not a release version" });
  });

  it("is unavailable when no starter runs this server", async () => {
    const app = await appWith(null);
    const response = await app.inject({ method: "GET", url: "/rest/node-update?target=1.5.12" });
    expect(response.json()).toEqual({ inPlaceUpdate: "unavailable", version: null });
  });

  it("is an error with a message when the starter socket does not answer", async () => {
    const app = await appWith(new StarterClient(path.join(os.tmpdir(), "no-such-starter.sock")));
    const body = (await app.inject({ method: "GET", url: "/rest/node-update" })).json();
    expect(body.inPlaceUpdate).toBe("error");
    expect(body.version).toBeNull();
    expect(body.message).toMatch(/^The node's starter did not answer: /);
  });

  it("finds the starter only through AUTOBYTEUS_STARTER_SOCKET", () => {
    expect(starterClientFromEnvironment({})).toBeNull();
    expect(starterClientFromEnvironment({ AUTOBYTEUS_STARTER_SOCKET: "" })).toBeNull();
    expect(starterClientFromEnvironment({ AUTOBYTEUS_STARTER_SOCKET: "/run/autobyteus/starter.sock" })).toBeInstanceOf(StarterClient);
  });
});
