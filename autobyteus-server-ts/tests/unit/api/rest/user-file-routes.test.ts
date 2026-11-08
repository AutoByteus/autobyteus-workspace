import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import fastify, { type FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// autobyteus-416 AC-007: the user-file routes F3 and F9–F15 answer HTML, SVG and XML files with
// `Content-Security-Policy: sandbox allow-scripts` and `nosniff` (F1/F2: workspaces.test.ts;
// F4–F8: tests/integration/api/rest/context-files.integration.test.ts).

let mediaRoot = "";
vi.mock("../../../../src/services/media-storage-service.js", () => ({
  getMediaStorageService: () => ({ getMediaRoot: () => mediaRoot }),
}));
vi.mock("../../../../src/run-history/services/run-file-change-projection-service.js", () => ({
  RunFileChangeProjectionService: class {},
  getRunFileChangeProjectionService: vi.fn(),
}));

const { registerFileRoutes } = await import("../../../../src/api/rest/files.js");
const { registerRunFileChangeRoutes } = await import("../../../../src/api/rest/run-file-changes.js");
const { registerTeamCommunicationRoutes } = await import("../../../../src/api/rest/team-communication.js");
const { registerAgentOrgReferenceRoutes } = await import("../../../../src/api/rest/agent-org-references.js");
const { registerAgentCollaborationReferenceRoutes } = await import("../../../../src/api/rest/agent-collaboration-references.js");

const FILES = [
  { name: "x.html", mime: "text/html", body: "<!doctype html><script>fetch('/graphql',{method:'POST'})</script>" },
  { name: "x.svg", mime: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg"><script>1</script></svg>' },
  { name: "x.xml", mime: "application/xml", body: '<?xml version="1.0"?><a/>' },
] as const;

describe("user-file routes F3, F9–F15", () => {
  let app: FastifyInstance;
  let root: string;
  const fileOf = (url: string) => FILES.find((file) => url.includes(file.name))!;
  const pathOf = (url: string) => path.join(root, "docs", fileOf(url).name);
  const resolvedEntry = (url: string) => ({
    entry: { path: fileOf(url).name, type: "file", status: "available" },
    absolutePath: pathOf(url),
    isActiveRun: false,
  });
  const referenceContent = (url: string) => ({ mimeType: fileOf(url).mime, stream: fs.createReadStream(pathOf(url)) });

  beforeAll(async () => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "user-file-routes-"));
    mediaRoot = root;
    fs.mkdirSync(path.join(root, "docs"));
    for (const file of FILES) fs.writeFileSync(path.join(root, "docs", file.name), file.body);

    let currentUrl = "";
    app = fastify();
    app.addHook("onRequest", async (request) => {
      currentUrl = request.url;
    });
    await registerFileRoutes(app);
    await registerRunFileChangeRoutes(app, {
      projectionService: { resolveStandaloneRunEntry: async () => resolvedEntry(currentUrl) } as never,
      teamMemberViews: { resolveFileChangeEntry: async () => resolvedEntry(currentUrl) } as never,
      agentOrgMemberViews: { resolveFileChangeEntry: async () => resolvedEntry(currentUrl) } as never,
      standaloneRootMemberViews: { resolveFileChangeEntry: async () => resolvedEntry(currentUrl) } as never,
    });
    await registerTeamCommunicationRoutes(app, {
      contentService: { resolveContent: async () => referenceContent(currentUrl) } as never,
    });
    await registerAgentOrgReferenceRoutes(app, {
      contentService: { resolveCommunication: async () => referenceContent(currentUrl) } as never,
    });
    await registerAgentCollaborationReferenceRoutes(app, {
      contentService: { resolveCommunication: async () => referenceContent(currentUrl) } as never,
    });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    fs.rmSync(root, { recursive: true, force: true });
  });

  const routes: Array<[string, (name: string) => string]> = [
    ["F3 uploaded media", (name) => `/files/docs/${name}`],
    ["F9 run file change", (name) => `/runs/r1/file-change-content?path=${name}`],
    ["F10 team member file change", (name) => `/team-runs/t1/agent-runs/a1/file-change-content?path=${name}`],
    ["F11 org member file change", (name) => `/agent-org-runs/o1/agent-runs/a1/file-change-content?path=${name}&memberAddress=m`],
    ["F12 collaboration member file change", (name) => `/agent-collaborations/h1/agent-runs/a1/file-change-content?path=${name}&memberAddress=m`],
    ["F13 team message reference", (name) => `/team-runs/t1/team-communication/messages/m1/references/${name}/content`],
    ["F14 org message reference", (name) => `/agent-org-runs/o1/communication/messages/m1/references/${name}/content`],
    ["F15 collaboration message reference", (name) => `/agent-collaborations/h1/communication/messages/m1/references/${name}/content`],
  ];

  it.each(routes)("%s: HTML, SVG and XML are sandboxed and not sniffed, body and type unchanged", async (_label, urlFor) => {
    for (const file of FILES) {
      const response = await app.inject({ method: "GET", url: urlFor(file.name) });
      expect(response.statusCode, file.name).toBe(200);
      expect(response.body, file.name).toBe(file.body);
      expect(String(response.headers["content-type"]), file.name).toContain(file.mime);
      expect(response.headers["content-security-policy"], file.name).toBe("sandbox allow-scripts");
      expect(response.headers["x-content-type-options"], file.name).toBe("nosniff");
    }
  });
});
