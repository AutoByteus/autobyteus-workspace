import fs from "node:fs/promises";
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
import type { ContextFileDraftOwnerDescriptor } from "../../../../src/context-files/domain/context-file-owner-types.js";
import { writeAttachmentSidecars } from "../../../fixtures/current-attachment-package-fixtures.js";
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

const upload = async (owner: unknown, content: string) => {
  const boundary = "universal-draft-context-file";
  const response = await app.inject({ method: "POST", url: "/rest/context-files/upload",
    headers: { "content-type": `multipart/form-data; boundary=${boundary}` },
    payload: `--${boundary}\r\nContent-Disposition: form-data; name="owner"\r\n\r\n${JSON.stringify(owner)}\r\n`
      + `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="notes.txt"\r\nContent-Type: text/plain\r\n\r\n`
      + `${content}\r\n--${boundary}--\r\n`,
  });
  expect(response.statusCode).toBe(200);
  return response.json() as { storedFilename: string; locator: string };
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
      const response = await app.inject({ method, url });
      expect({ url, status: response.statusCode }).toEqual({ url, status: 400 });
      expect({ url, body: response.json() }).toEqual({ url, body: { detail: expect.any(String) } });
    }
    for (const url of [
      "/rest/drafts/unknown-runs/x/context-files/ctx_a__b.txt",
      "/rest/drafts/team-runs/draft-team/members/C/D/context-files/ctx_a__b.txt",
    ]) {
      expect((await app.inject({ method, url })).statusCode).toBe(404);
    }
  });
});
