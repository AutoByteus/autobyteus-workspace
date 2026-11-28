import "reflect-metadata";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import type { FastifyInstance } from "fastify";
import { create } from "tar";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { AgentPackageService } from "../../../src/agent-packages/services/agent-package-service.js";
import { SkillSourceService } from "../../../src/skills/services/skill-source-service.js";
import { SkillService } from "../../../src/skills/services/skill-service.js";
import { setGitHubRateLimitGateForTests } from "../../../src/integrations/github/github-rate-limit-gate.js";
import { startStudioE2eRuntimeServer } from "../helpers/studio-runtime-test-server.js";
import { headReadRepository, headReadResponse } from "../helpers/github-head-read-stub.js";
import { IN_PROCESS_SERVER_HOOK_TIMEOUT_MS } from "../../helpers/os-latency-under-load.js";

// autobyteus-669 (API/E2E): a package's pictures through the real GitHub import and update pipeline (a fake GitHub that
// serves each revision as a tar archive, as `package-personal-settings.e2e.test.ts` does), at the real HTTP boundary.
//   AV-01 AC-001  Imported from GitHub: an agent's `avatar.png`, a team's `avatar.webp` and an org's `avatar.jpg` give
//                 each definition the node's package-picture address (`/rest/definition-avatars/<kind>/<id>?v=<12 hex>`),
//                 `userAvatarUrl` null; the route sends the file's exact bytes with its type. An agent with no file has no
//                 picture.
//   AV-02 AC-001, AC-002, AC-003, AC-006  The user's own picture for the agent (a personal setting) wins over the
//                 package's, also across an update. The update replaces the agent's picture (a new version, the new bytes
//                 after the user's reset), removes the team's (no picture), gives the bare agent a 2 MiB `avatar.png` and
//                 the org a text file named `avatar.jpg`: each ignored, the definition loaded, one log line each however
//                 often it is read. The replacement has the same size as the old picture and, in the archive, the same
//                 modification time (whole seconds, as tar keeps them: two revisions archived within one second, or an
//                 archive tool that fixes every entry's time). The new bytes must still give a new version.

vi.mock("../../../src/api/graphql/schema.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../src/api/graphql/schema.js")>();
  let built: ReturnType<typeof actual.buildGraphqlSchema> | null = null;
  return { ...actual, buildGraphqlSchema: () => (built ??= actual.buildGraphqlSchema()) };
});

type Rec = Record<string, any>;
const REPO = "avatars-e2e/agents";
const rev = (n: number) => n.toString(16).padStart(40, "0");
const USER_PICTURE = "/rest/files/images/avatars-e2e-user.png";
const ADDRESS = (kind: string, id: string) => new RegExp(`^/rest/definition-avatars/${kind}/${id}\\?v=[0-9a-f]{12}$`);

/** A real `size`×`size` PNG of one colour (synthetic; never a person). */
const png = (rgb: [number, number, number], size = 32): Buffer => {
  const chunk = (type: string, data: Buffer) => {
    const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const length = Buffer.alloc(4); length.writeUInt32BE(data.length);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(zlib.crc32(body) >>> 0);
    return Buffer.concat([length, body, crc]);
  };
  const header = Buffer.alloc(13); header.writeUInt32BE(size, 0); header.writeUInt32BE(size, 4); header[8] = 8; header[9] = 2;
  const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(size * 3).map((_v, i) => rgb[i % 3]!)]);
  const raw = Buffer.concat(Array.from({ length: size }, () => row));
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", header), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
};
/** A minimal WebP container (`RIFF … WEBP` with a lossless chunk) and a minimal JPEG (SOI, APP0 JFIF, EOI): their signatures are real. */
const webp = (): Buffer => {
  const payload = Buffer.from([0x2f, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
  const vp8l = Buffer.concat([Buffer.from("VP8L", "ascii"), Buffer.from([payload.length, 0, 0, 0]), payload]);
  const size = Buffer.alloc(4); size.writeUInt32LE(4 + vp8l.length);
  return Buffer.concat([Buffer.from("RIFF", "ascii"), size, Buffer.from("WEBP", "ascii"), vp8l]);
};
const jpeg = (): Buffer => Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xd9]);

const loadDocuments = async (...files: string[]): Promise<Record<string, string>> => {
  const out: Record<string, string> = {};
  for (const file of files) {
    const source = await fs.readFile(new URL(`../../../../autobyteus-web/graphql/${file}`, import.meta.url), "utf8");
    const templates = Object.fromEntries([...source.matchAll(/(?:export )?const (\w+) = gql`([\s\S]*?)`/g)].map((m) => [m[1]!, m[2]!]));
    for (const [key, body] of Object.entries(templates)) out[key] = body.replace(/\$\{(\w+)\}/g, (_all, name: string) => templates[name] ?? "");
  }
  return out;
};

describe("Package pictures through the real GitHub import and update (fake GitHub) at the HTTP boundary", () => {
  let base = "", dataDir = "", upstreamDir = "", app: FastifyInstance | undefined, url!: URL;
  let docs: Record<string, string> = {};
  let current = 0;
  let writerPictureTime = new Date();
  let packageId = "";
  const warnings: string[] = [];
  const savedEnv = new Map<string, string | undefined>();
  const pictures: Record<string, Buffer> = {};
  const firstAddress: Record<string, string> = {};

  const gql = async (query: string, variables?: Rec): Promise<any> => {
    const response = await fetch(new URL("/graphql", url), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }) });
    const body = await response.json() as { data?: any; errors?: unknown[] };
    if (!body.data || body.errors?.length) throw new Error(JSON.stringify(body.errors ?? body));
    return body.data;
  };
  const agent = async (id: string) => (await gql(docs.GetAgentDefinitions!)).agentDefinitions.find((row: Rec) => row.id === id) as Rec;
  const team = async (id: string) => (await gql(docs.GetAgentTeamDefinitions!)).agentTeamDefinitions.find((row: Rec) => row.id === id) as Rec;
  const org = async (id: string) => (await gql(docs.GetAgentOrgDefinitions!)).agentOrgDefinitions.find((row: Rec) => row.id === id) as Rec;
  const route = async (address: string) => {
    const response = await fetch(new URL(address, url));
    return { status: response.status, type: response.headers.get("content-type"), bytes: Buffer.from(await response.arrayBuffer()) };
  };
  const ignoredLines = (folderPart: string) => warnings.filter((line) => line.includes("DEFINITION_AVATAR_IGNORED") && line.includes(folderPart));

  const write = async (file: string, content: string | Buffer) => { await fs.mkdir(path.dirname(file), { recursive: true }); await fs.writeFile(file, content); };
  /** The package at revision `n` (1: pictures for writer, crew and studio; 2: writer's replaced, crew's removed, two invalid). */
  const writeUpstream = async (n: number) => {
    await fs.rm(upstreamDir, { recursive: true, force: true });
    for (const id of ["writer", "reviewer"]) {
      const dir = path.join(upstreamDir, "agents", id);
      await write(path.join(dir, "agent.md"), `---\nname: ${id}\ndescription: ${id} agent\n---\n\n${id} instructions, revision ${n}.\n`);
      await write(path.join(dir, "agent-config.json"), `${JSON.stringify({ toolNames: [], skillNames: [], avatarUrl: null, defaultLaunchConfig: null }, null, 2)}\n`);
    }
    const crew = path.join(upstreamDir, "agent-teams", "crew");
    await write(path.join(crew, "team.md"), `---\nname: crew\ndescription: crew team\n---\n\nCoordinate, revision ${n}.\n`);
    await write(path.join(crew, "team-config.json"), `${JSON.stringify({ coordinatorMemberName: "writer",
      members: [{ memberName: "writer", ref: "writer", refScope: "shared" }, { memberName: "reviewer", ref: "reviewer", refScope: "shared" }], handoffs: [], avatarUrl: null, defaultLaunchConfig: null }, null, 2)}\n`);
    const studio = path.join(upstreamDir, "agent-orgs", "studio");
    await write(path.join(studio, "org.md"), `---\nname: studio\ndescription: studio org\n---\n\nFollow requests, revision ${n}.\n`);
    await write(path.join(studio, "org-config.json"), `${JSON.stringify({ members: [{ memberName: "writer", ref: "writer", refType: "agent", refScope: "shared" }],
      handoffs: [], avatarUrl: null, defaultLaunchConfig: null }, null, 2)}\n`);
    if (n === 1) {
      pictures.writer = png([200, 40, 40]);
      pictures.crew = webp();
      pictures.studio = jpeg();
      await write(path.join(upstreamDir, "agents", "writer", "avatar.png"), pictures.writer);
      writerPictureTime = (await fs.stat(path.join(upstreamDir, "agents", "writer", "avatar.png"))).mtime;
      await write(path.join(crew, "avatar.webp"), pictures.crew);
      await write(path.join(studio, "avatar.jpg"), pictures.studio);
    } else {
      pictures.writer = png([40, 40, 200]);
      await write(path.join(upstreamDir, "agents", "writer", "avatar.png"), pictures.writer);
      // The same size (99 bytes) and the same archive time as revision 1's picture: only the bytes differ.
      await fs.utimes(path.join(upstreamDir, "agents", "writer", "avatar.png"), writerPictureTime, writerPictureTime);
      await write(path.join(upstreamDir, "agents", "reviewer", "avatar.png"), Buffer.concat([png([0, 0, 0]), Buffer.alloc(2 * 1024 * 1024)]));
      await write(path.join(studio, "avatar.jpg"), "not a picture\n");
    }
    await create({ gzip: true, file: path.join(base, `agents-${rev(n)}.tar.gz`), cwd: path.dirname(upstreamDir), portable: true }, ["wrapper"]);
    current = n;
  };

  beforeAll(async () => {
    docs = await loadDocuments("queries/agentDefinitionQueries.ts", "mutations/agentDefinitionMutations.ts", "queries/agentTeamDefinitionQueries.ts",
      "queries/agentOrgDefinitionQueries.ts", "agentPackages.ts");
    base = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "definition-avatars-github-e2e-")));
    dataDir = path.join(base, "server-data");
    upstreamDir = path.join(base, "upstream", "wrapper");
    await fs.mkdir(dataDir, { recursive: true });
    await fs.writeFile(path.join(dataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n");
    for (const key of ["AUTOBYTEUS_AGENT_PACKAGE_ROOTS", "AUTOBYTEUS_SKILLS_PATHS", "AUTOBYTEUS_APPLICATION_PACKAGE_ROOTS", "AUTOBYTEUS_DESKTOP_EMBEDDED_NODE"]) {
      savedEnv.set(key, process.env[key]);
      delete process.env[key];
    }
    await writeUpstream(1);
    const realFetch = globalThis.fetch;
    vi.stubGlobal("fetch", async (input: string | URL | Request, init?: RequestInit) => {
      const target = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      const host = new URL(target).hostname;
      if (!["api.github.com", "codeload.github.com", "github.com"].includes(host)) return realFetch(input as never, init);
      if (headReadRepository(target, init) === REPO) return headReadResponse(rev(current));
      if (target === `https://api.github.com/repos/${REPO}`) {
        return Response.json({ owner: { login: "avatars-e2e" }, name: "agents", private: false, default_branch: "main", html_url: `https://github.com/${REPO}` });
      }
      if (target === `https://api.github.com/repos/${REPO}/branches/main`) return Response.json({ commit: { sha: rev(current) } });
      if (target.startsWith(`https://codeload.github.com/${REPO}/tar.gz/`)) return new Response(await fs.readFile(path.join(base, `agents-${target.slice(target.lastIndexOf("/") + 1)}.tar.gz`)));
      throw new Error(`Unexpected GitHub request: ${target}`);
    });
    const warn = console.warn;
    vi.spyOn(console, "warn").mockImplementation((...args: unknown[]) => { warnings.push(args.map(String).join(" ")); warn(...args); });
    appConfigProvider.resetForTests();
    appConfigProvider.config.setCustomAppDataDir(dataDir);
    const started = await startStudioE2eRuntimeServer();
    app = started.fastify; url = started.mainUrl;
  }, 120_000);

  afterAll(async () => {
    if (app) await app.close();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    setGitHubRateLimitGateForTests(null);
    for (const owner of [AgentPackageService, SkillSourceService, SkillService]) owner.resetInstance();
    appConfigProvider.resetForTests();
    for (const [key, value] of savedEnv) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
    if (base) await fs.rm(base, { recursive: true, force: true });
  }, IN_PROCESS_SERVER_HOOK_TIMEOUT_MS);

  it("AV-01 (AC-001): a GitHub package's pictures: each definition's address, the route's exact bytes and type; no file, no picture", async () => {
    const imported = (await gql(docs.IMPORT_AGENT_PACKAGE!, { input: { sourceKind: "GITHUB_REPOSITORY", source: `https://github.com/${REPO}` } }))
      .importAgentPackage.find((row: Rec) => row.sourceKind === "GITHUB_REPOSITORY");
    packageId = imported.packageId;

    const writer = await agent("writer");
    const reviewer = await agent("reviewer");
    const crew = await team("crew");
    const studio = await org("studio");
    expect(writer).toMatchObject({ userAvatarUrl: null });
    expect(writer.avatarUrl).toMatch(ADDRESS("agent", "writer"));
    expect(crew.avatarUrl).toMatch(ADDRESS("agent_team", "crew"));
    expect(studio.avatarUrl).toMatch(ADDRESS("agent_org", "studio"));
    expect(reviewer).toMatchObject({ avatarUrl: null, userAvatarUrl: null });
    Object.assign(firstAddress, { writer: writer.avatarUrl, crew: crew.avatarUrl, studio: studio.avatarUrl });

    for (const [key, type] of [["writer", "image/png"], ["crew", "image/webp"], ["studio", "image/jpeg"]] as const) {
      const served = await route(firstAddress[key]!);
      expect(served.status, key).toBe(200);
      expect(served.type, key).toContain(type);
      expect(served.bytes.equals(pictures[key]!), `${key}: the file's exact bytes`).toBe(true);
    }
  });

  it("AV-02 (AC-001…003, AC-006): the user's picture wins across an update; the update replaces, removes and ignores pictures; reset shows the package's", async () => {
    // The user's own picture for the package agent (a personal setting).
    const saved = (await gql(docs.UpdateAgentDefinition!, { input: { id: "writer", avatarUrl: USER_PICTURE } })).updateAgentDefinition;
    expect(saved).toMatchObject({ avatarUrl: USER_PICTURE, userAvatarUrl: USER_PICTURE });

    await writeUpstream(2);
    const updated = (await gql(docs.UPDATE_AGENT_PACKAGE!, { packageId })).updateAgentPackage.find((row: Rec) => row.packageId === packageId);
    expect(updated).toBeTruthy();

    // The user's picture still wins after the update.
    expect(await agent("writer")).toMatchObject({ avatarUrl: USER_PICTURE, userAvatarUrl: USER_PICTURE });
    // Reset: the package's (replaced) picture shows: a new version, the new bytes.
    await gql(docs.ResetAgentPersonalSetting!, { definitionId: "writer", setting: "AVATAR" });
    const writer = await agent("writer");
    expect(writer.userAvatarUrl).toBeNull();
    expect(writer.avatarUrl).toMatch(ADDRESS("agent", "writer"));
    expect(pictures.writer!.length, "the replacement has the old picture's size").toBe(png([200, 40, 40]).length);
    expect(writer.avatarUrl, "new bytes give a new version").not.toBe(firstAddress.writer);
    const served = await route(writer.avatarUrl);
    expect(served.status).toBe(200);
    expect(served.bytes.equals(pictures.writer!), "the replaced picture's bytes").toBe(true);

    // The team's picture removed upstream: no picture (the fallback); its old address answers no picture.
    expect((await team("crew")).avatarUrl).toBeNull();
    expect((await route(firstAddress.crew!)).status).toBe(404);

    // Invalid pictures: ignored, the definitions loaded; one log line each, however often they are read.
    for (let i = 0; i < 3; i += 1) {
      expect(await agent("reviewer")).toMatchObject({ avatarUrl: null, userAvatarUrl: null });
      expect(await org("studio")).toMatchObject({ avatarUrl: null });
    }
    expect(ignoredLines(path.join("agents", "reviewer")), "the 2 MiB picture: one line").toHaveLength(1);
    expect(ignoredLines(path.join("agent-orgs", "studio")), "the text named avatar.jpg: one line").toHaveLength(1);
  });
});
