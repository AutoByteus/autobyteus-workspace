import fs from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import fastify, { type FastifyInstance } from "fastify";
import multipart from "@fastify/multipart";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const config = vi.hoisted(() => ({ root: "" }));
vi.mock("../../../../src/config/app-config-provider.js", () => ({ appConfigProvider: { config: {
  getBaseUrl: () => "http://app.test",
  getAppDataDir: () => config.root,
  getMemoryDir: () => path.join(config.root, "memory"),
} } }));

import { registerContextFileRoutes } from "../../../../src/api/rest/context-files.js";
import { AgentMemoryLayout } from "../../../../src/agent-memory/store/agent-memory-layout.js";
import { AgentOrgRunExecutionTreeStore } from "../../../../src/run-history/store/agent-org-run-execution-tree-store.js";
import { validateAgentOrgRunExecutionTreePayload } from "../../../../src/run-history/store/agent-org-run-execution-tree-schema.js";
import { ContextFileLayout } from "../../../../src/context-files/store/context-file-layout.js";
import { ContextFileLocalPathResolver } from "../../../../src/context-files/services/context-file-local-path-resolver.js";
import { ContextFileOwnerResolver } from "../../../../src/context-files/services/context-file-owner-resolver.js";
import { createStoredCollaborationExecutionLocationService } from "../../../../src/agent-collaboration/execution/services/collaboration-execution-location-service.js";
import type { ContextFileDraftOwnerDescriptor } from "../../../../src/context-files/domain/context-file-owner-types.js";
import { writeAttachmentAgentMetadata, writeAttachmentSidecars } from "../../../fixtures/current-attachment-package-fixtures.js";
import {
  testAgentOrgExecutionTree,
  testOrgAgentNode,
  testOrgLaunchConfiguration,
} from "../../../fixtures/current-agent-org-run-fixtures.js";

type DraftOwnerKind = ContextFileDraftOwnerDescriptor["kind"];

/** One live owner per draft owner kind; a new kind must be added here (and to the codec) to be covered. */
const DRAFT_OWNERS: { [K in DraftOwnerKind]: Extract<ContextFileDraftOwnerDescriptor, { kind: K }> } = {
  agent_draft: { kind: "agent_draft", draftRunId: "draft-agent" },
  team_member_draft: { kind: "team_member_draft", teamDraftId: "draft-team", memberAddress: "/C/D" as never },
  org_member_draft: { kind: "org_member_draft", orgRunId: "org", agentRunId: "configured-direct" },
  agent_collaboration_member_draft: { kind: "agent_collaboration_member_draft", hostRunId: "host", agentRunId: "child" },
};

/** A well-formed locator whose owner does not exist (only kinds with a validated owner). */
const ABSENT_OWNER_LOCATORS = [
  "/rest/drafts/agent-org-runs/org/agent-runs/unknown/context-files/ctx_a__b.txt",
  "/rest/drafts/agent-org-runs/missing-org/agent-runs/configured-direct/context-files/ctx_a__b.txt",
  "/rest/drafts/agent-collaborations/host/agent-runs/unknown/context-files/ctx_a__b.txt",
  "/rest/drafts/agent-collaborations/missing-host/agent-runs/child/context-files/ctx_a__b.txt",
];

const INVALID_LOCATORS = [
  "/rest/drafts/agent-runs/x/context-files/%2E%2E%2Fsecret.txt",
  "/rest/drafts/team-runs/draft-team/members/no-root/context-files/ctx_a__b.txt",
  "/rest/drafts/agent-org-runs/org/agent-runs/%20padded/context-files/ctx_a__b.txt",
  "/rest/drafts/agent-collaborations/host/agent-runs/a%2Fb/context-files/ctx_a__b.txt",
  "/rest/drafts/agent-runs/..%2Fagent-runs%2Fvictim/context-files/ctx_a__b.txt",
  "/rest/drafts/agent-runs/%2E%2E/context-files/ctx_a__b.txt",
  "/rest/drafts/agent-runs/..%2F..%2Fx/context-files/ctx_a__b.txt",
  "/rest/drafts/agent-runs/%20draft-agent/context-files/ctx_a__b.txt",
  "/rest/drafts/team-runs/..%2Fagent-runs%2Fvictim/members/%2FA/context-files/ctx_a__b.txt",
  "/rest/drafts/team-runs/%2E%2E/members/%2FA/context-files/ctx_a__b.txt",
  "/rest/drafts/agent-runs/draft-agent/context-files/ctx_a__b%00.txt",
  "/rest/drafts/agent-runs/draft-agent/context-files/ctx_a__b%20c.txt",
  "/rest/drafts/agent-runs/draft-agent/context-files/ctx_a__b%3Ac.txt",
  "/rest/drafts/agent-runs/draft-agent/context-files/%2E",
  "/rest/drafts/agent-runs/draft-agent/context-files/.",
];

let app: FastifyInstance;
let layout: ContextFileLayout;

const put = async (file: string, value: unknown) => {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, typeof value === "string" ? value : JSON.stringify(value));
};

const writeOrgFixture = async (memoryDir: string) => {
  const direct = testOrgAgentNode("/shared", "configured-direct");
  const raw = structuredClone(testAgentOrgExecutionTree({ orgRunId: "org", members: [direct] }));
  const dir = new AgentMemoryLayout(memoryDir).getOrgDirPath("org");
  await new AgentOrgRunExecutionTreeStore().write(dir, validateAgentOrgRunExecutionTreePayload(raw, "org"));
  writeAttachmentSidecars(dir, "org", "org");
};

/** A standalone host run with one delegated Agent copy (the 19.png owner kind). */
const writeAgentCollaborationFixture = async (memoryDir: string) => {
  const hostDir = path.join(memoryDir, "agents", "host");
  await put(path.join(hostDir, "run_metadata.json"), {
    runId: "host", agentDefinitionId: "def", workspaceRootPath: "/workspace", memoryDir: hostDir,
    llmModelIdentifier: "model", runtimeKind: "autobyteus",
  });
  await put(path.join(hostDir, "collaboration", "collaboration_tree.json"), {
    subjectKind: "agent", createdAt: "2026-09-30T00:00:00.000Z",
    host: { address: "/assistant", agentRunId: "host", agentDefinitionId: "def" },
    collaborators: [{
      kind: "agent", address: "/code_reviewer", agentDefinitionId: "reviewer", agentRunId: "reviewer-run", platformAgentRunId: null,
      launchConfiguration: testOrgLaunchConfiguration(),
      addedAt: "2026-09-30T00:00:00.000Z", addedViaAgentRunId: "host",
    }],
    taskExecutions: [{ address: "/code_reviewer", agentRunId: "child", platformAgentRunId: null,
      delegatorAgentRunId: "host", startedAt: "2026-09-30T00:00:01.000Z" }],
  });
  await put(path.join(hostDir, "collaboration", "communication_messages.json"),
    { schemaVersion: 1, subjectKind: "agent", hostRunId: "host", messages: [] });
};

const postUpload = (owner: unknown, content: string) => {
  const boundary = "universal-draft-context-file";
  return app.inject({ method: "POST", url: "/rest/context-files/upload",
    headers: { "content-type": `multipart/form-data; boundary=${boundary}` },
    payload: `--${boundary}\r\nContent-Disposition: form-data; name="owner"\r\n\r\n${JSON.stringify(owner)}\r\n`
      + `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="notes.txt"\r\nContent-Type: text/plain\r\n\r\n`
      + `${content}\r\n--${boundary}--\r\n`,
  });
};
const upload = async (owner: unknown, content: string) => {
  const response = await postUpload(owner, content);
  expect(response.statusCode).toBe(200);
  return response.json() as { storedFilename: string; locator: string };
};

/**
 * Sends the path byte-for-byte over a real socket. `app.inject` and WHATWG URL clients collapse `%2E`/`%2E%2E`
 * segments before routing, which would hide exactly the cases these tests guard.
 */
const rawRequest = async (method: "GET" | "DELETE", rawPath: string): Promise<{ statusCode: number; body: string }> => {
  if (!app.server.listening) await app.listen({ port: 0, host: "127.0.0.1" });
  const { port } = app.server.address() as { port: number };
  return new Promise((resolve, reject) => {
    const request = http.request({ host: "127.0.0.1", port, method, path: rawPath }, (response) => {
      let body = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => { body += chunk; });
      response.on("end", () => resolve({ statusCode: response.statusCode ?? 0, body }));
    });
    request.on("error", reject);
    request.end();
  });
};
const detailOf = (body: string): unknown => {
  try { return (JSON.parse(body) as { detail?: unknown }).detail; } catch { return undefined; }
};

/** Every file under the app data root with its bytes, to prove a rejected request touched nothing. */
const snapshotFiles = async (): Promise<Record<string, string>> => {
  const files: Record<string, string> = {};
  const walk = async (dir: string): Promise<void> => {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else files[path.relative(config.root, full)] = await fs.readFile(full, "utf8");
    }
  };
  await walk(config.root);
  return files;
};

beforeEach(async () => {
  config.root = await fs.mkdtemp(path.join(os.tmpdir(), "draft-context-files-universal-"));
  const memoryDir = path.join(config.root, "memory");
  await writeOrgFixture(memoryDir);
  await writeAgentCollaborationFixture(memoryDir);
  layout = new ContextFileLayout({ appDataDir: config.root, memoryDir });
  app = fastify();
  await app.register(multipart);
  await app.register(registerContextFileRoutes, { prefix: "/rest" });
});

afterEach(async () => {
  await app.close();
  await fs.rm(config.root, { recursive: true, force: true });
});

describe("universal draft context-file read and delete", () => {
  it.each(Object.values(DRAFT_OWNERS))("reads and deletes a $kind draft at its own locator", async (owner) => {
    const attachment = await upload(owner, `${owner.kind} bytes`);
    const filePath = layout.getDraftFilePath(owner, attachment.storedFilename);
    expect(await fs.readFile(filePath, "utf8")).toBe(`${owner.kind} bytes`);

    const read = await app.inject({ method: "GET", url: attachment.locator });
    expect(read.statusCode).toBe(200);
    expect(read.body).toBe(`${owner.kind} bytes`);

    expect((await app.inject({ method: "DELETE", url: attachment.locator })).statusCode).toBe(204);
    await expect(fs.access(filePath)).rejects.toMatchObject({ code: "ENOENT" });
    expect((await app.inject({ method: "GET", url: attachment.locator })).statusCode).toBe(404);
    // Deleting an already-missing file still succeeds.
    expect((await app.inject({ method: "DELETE", url: attachment.locator })).statusCode).toBe(204);
  });

  it("deletes only the addressed draft and ignores a query string", async () => {
    const owner = DRAFT_OWNERS.agent_collaboration_member_draft;
    const removed = await upload(owner, "remove");
    const kept = await upload(owner, "keep");
    const otherOwner = await upload(DRAFT_OWNERS.agent_draft, "other owner");

    expect((await app.inject({ method: "DELETE", url: `${removed.locator}?v=1` })).statusCode).toBe(204);
    expect((await app.inject({ method: "GET", url: removed.locator })).statusCode).toBe(404);
    expect((await app.inject({ method: "GET", url: kept.locator })).body).toBe("keep");
    expect((await app.inject({ method: "GET", url: otherOwner.locator })).body).toBe("other owner");
  });

  it.each(["GET", "DELETE"] as const)("maps %s errors through one rule set", async (method) => {
    for (const url of ABSENT_OWNER_LOCATORS) {
      const response = await app.inject({ method, url });
      expect({ url, status: response.statusCode }).toEqual({ url, status: 404 });
    }
    for (const url of INVALID_LOCATORS) {
      const response = await rawRequest(method, url);
      expect({ url, status: response.statusCode, detail: typeof detailOf(response.body) })
        .toEqual({ url, status: 400, detail: "string" });
    }
    for (const url of [
      "/rest/drafts/unknown-runs/x/context-files/ctx_a__b.txt",
      "/rest/drafts/team-runs/draft-team/members/C/D/context-files/ctx_a__b.txt",
    ]) {
      expect((await app.inject({ method, url })).statusCode).toBe(404);
    }
  });
});

describe("malformed and traversal owner IDs and stored filenames", () => {
  /** Files a traversal ID would reach: another owner's draft, the draft root, and app data outside it. */
  const writeSentinels = async () => {
    const draftRoot = path.join(config.root, "draft_context_files");
    await put(path.join(draftRoot, "agent-runs", "victim", "context_files", "ctx_a__b.txt"), "victim draft");
    await put(path.join(draftRoot, "context_files", "ctx_a__b.txt"), "draft-root level");
    await put(path.join(config.root, "x", "context_files", "ctx_a__b.txt"), "app data");
    await put(path.join(draftRoot, "agent-runs", "victim", "members", "%2FA", "context_files", "ctx_a__b.txt"), "team victim");
  };

  it.each(["GET", "DELETE"] as const)("%s answers 400 with detail and touches no file", async (method) => {
    await writeSentinels();
    // The owner folder exists, so a dot-only filename would otherwise address the folder itself.
    const existing = await upload(DRAFT_OWNERS.agent_draft, "existing draft");
    const before = await snapshotFiles();

    for (const url of INVALID_LOCATORS) {
      const response = await rawRequest(method, url);
      expect({ url, status: response.statusCode, detail: typeof detailOf(response.body) })
        .toEqual({ url, status: 400, detail: "string" });
    }

    expect(await snapshotFiles()).toEqual(before);
    expect((await app.inject({ method: "GET", url: existing.locator })).body).toBe("existing draft");
  });

  it("rejects upload with a traversal or extra-field owner and writes nothing", async () => {
    await writeSentinels();
    const before = await snapshotFiles();
    for (const owner of [
      { kind: "agent_draft", draftRunId: "../agent-runs/victim" },
      { kind: "agent_draft", draftRunId: ".." },
      { kind: "agent_draft", draftRunId: " draft-agent" },
      { kind: "agent_draft", draftRunId: "draft-agent", extra: 1 },
      { kind: "team_member_draft", teamDraftId: "../agent-runs/victim", memberAddress: "/A" },
      { kind: "team_member_draft", teamDraftId: "draft-team", memberAddress: "/A", extra: 1 },
    ]) {
      const response = await postUpload(owner, "should not be written");
      expect({ owner, status: response.statusCode, detail: typeof response.json().detail })
        .toEqual({ owner, status: 400, detail: "string" });
    }
    expect(await snapshotFiles()).toEqual(before);
  });

  it("rejects finalize with a traversal draft owner and moves nothing", async () => {
    await writeSentinels();
    writeAttachmentAgentMetadata(path.join(config.root, "memory"), "run-final");
    const before = await snapshotFiles();
    for (const draftOwner of [
      { kind: "agent_draft", draftRunId: "../agent-runs/victim" },
      { kind: "agent_draft", draftRunId: "victim", extra: 1 },
      { kind: "team_member_draft", teamDraftId: "../agent-runs/victim", memberAddress: "/A" },
    ]) {
      const response = await app.inject({ method: "POST", url: "/rest/context-files/finalize", payload: {
        draftOwner,
        finalOwner: { kind: "agent_final", runId: "run-final" },
        attachments: [{ storedFilename: "ctx_a__b.txt", displayName: "b.txt" }],
      } });
      expect({ draftOwner, status: response.statusCode, detail: typeof response.json().detail })
        .toEqual({ draftOwner, status: 400, detail: "string" });
    }
    expect(await snapshotFiles()).toEqual(before);
  });

  it.each([
    "solution_designer_0123456789abcdef0123456789abcdef",
    "temp-1728555555555-3",
    "temp-chat-1728555555555-12",
    "team-draft-3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b",
  ])("keeps legitimate draft ID %s working for upload, read and delete", async (id) => {
    for (const owner of [
      { kind: "agent_draft", draftRunId: id },
      { kind: "team_member_draft", teamDraftId: id, memberAddress: "/delivery/lead" },
    ]) {
      const attachment = await upload(owner, `bytes for ${id}`);
      expect((await app.inject({ method: "GET", url: attachment.locator })).body).toBe(`bytes for ${id}`);
      expect((await app.inject({ method: "DELETE", url: attachment.locator })).statusCode).toBe(204);
      expect((await app.inject({ method: "GET", url: attachment.locator })).statusCode).toBe(404);
    }
  });

  it("leaves malformed locators unresolved for the runtime with the real layout", async () => {
    const memoryDir = path.join(config.root, "memory");
    const local = new ContextFileLocalPathResolver({ layout, baseUrl: "http://app.test", ownerResolver: new ContextFileOwnerResolver({
      memoryDir, locations: createStoredCollaborationExecutionLocationService(memoryDir),
    }) });
    await writeSentinels();
    const existing = await upload(DRAFT_OWNERS.agent_draft, "existing draft");
    expect(local.resolve(existing.locator)).toBe(layout.getDraftFilePath(DRAFT_OWNERS.agent_draft, existing.storedFilename));
    for (const locator of [...INVALID_LOCATORS, "/rest/runs/%2E%2E/context-files/ctx_a__b.txt",
      "/rest/runs/host/context-files/ctx_a__b%00.txt", "/rest/runs/host/context-files/%2E"]) {
      expect(local.resolve(locator), locator).toBeNull();
    }
  });
});

