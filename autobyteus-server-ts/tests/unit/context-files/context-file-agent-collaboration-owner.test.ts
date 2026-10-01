import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createStoredCollaborationExecutionLocationService } from "../../../src/agent-collaboration/execution/services/collaboration-execution-location-service.js";
import {
  buildDraftContextFileLocator,
  buildFinalContextFileLocator,
  parseDraftContextFileOwnerDescriptor,
  parseFinalContextFileOwnerDescriptor,
} from "../../../src/context-files/domain/context-file-owner-types.js";
import { ContextFileDraftCleanupService } from "../../../src/context-files/services/context-file-draft-cleanup-service.js";
import { ContextFileFinalizationService } from "../../../src/context-files/services/context-file-finalization-service.js";
import { ContextFileLocalPathResolver } from "../../../src/context-files/services/context-file-local-path-resolver.js";
import {
  AgentCollaborationContextFileOwnerNotFoundError,
  ContextFileOwnerResolver,
} from "../../../src/context-files/services/context-file-owner-resolver.js";
import { ContextFileReadService } from "../../../src/context-files/services/context-file-read-service.js";
import { ContextFileLayout } from "../../../src/context-files/store/context-file-layout.js";
import { testOrgLaunchConfiguration } from "../../fixtures/current-agent-org-run-fixtures.js";
import { RootRunPackageReadinessIndex } from "../../../src/run-history/services/root-run-package-readiness-index.js";

const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true }))); });
const put = async (file: string, value: unknown) => {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, typeof value === "string" ? value : JSON.stringify(value));
};
const filename = "ctx_test__notes.txt";

const fixture = async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "agent-collab-context-")); roots.push(root);
  const memoryDir = path.join(root, "memory");
  const hostDir = path.join(memoryDir, "agents", "host");
  await put(path.join(hostDir, "run_metadata.json"), {
    runId: "host", agentDefinitionId: "def", workspaceRootPath: "/workspace", memoryDir: hostDir, llmModelIdentifier: "model", runtimeKind: "autobyteus",
  });
  await put(path.join(hostDir, "collaboration", "collaboration_tree.json"), {
    subjectKind: "agent", createdAt: "2026-09-30T00:00:00.000Z",
    host: { address: "/assistant", agentRunId: "host", agentDefinitionId: "def" },
    collaborators: [{
      kind: "agent", address: "/code_reviewer", agentDefinitionId: "reviewer", agentRunId: "reviewer-run", platformAgentRunId: null,
      launchConfiguration: testOrgLaunchConfiguration(),
      addedAt: "2026-09-30T00:00:00.000Z", addedViaAgentRunId: "host",
    }],
    taskExecutions: [{ address: "/code_reviewer", agentRunId: "child", platformAgentRunId: null, delegatorAgentRunId: "host", startedAt: "2026-09-30T00:00:01.000Z" }],
  });
  await put(path.join(hostDir, "collaboration", "communication_messages.json"), { schemaVersion: 1, subjectKind: "agent", hostRunId: "host", messages: [] });
  // Startup admits current packages before any context-file access.
  await new RootRunPackageReadinessIndex(memoryDir).rebuild();
  const layout = new ContextFileLayout({ appDataDir: root, memoryDir });
  const resolver = new ContextFileOwnerResolver({ memoryDir, locations: createStoredCollaborationExecutionLocationService(memoryDir) });
  const cleanup = new ContextFileDraftCleanupService(layout);
  return {
    root, memoryDir, hostDir, layout, resolver,
    read: new ContextFileReadService(layout, cleanup, resolver),
    finalize: new ContextFileFinalizationService(layout, cleanup, resolver),
    local: new ContextFileLocalPathResolver({ layout, ownerResolver: resolver, baseUrl: "http://localhost:8000" }),
  };
};

describe("context files of an Agent-root child", () => {
  it("parses exact owners and builds their own locators", () => {
    const draft = parseDraftContextFileOwnerDescriptor({ kind: "agent_collaboration_member_draft", hostRunId: "host", agentRunId: "child" });
    const final = parseFinalContextFileOwnerDescriptor({ kind: "agent_collaboration_member_final", hostRunId: "host", agentRunId: "child" });
    expect(buildDraftContextFileLocator(draft, filename)).toBe(`/rest/drafts/agent-collaborations/host/agent-runs/child/context-files/${filename}`);
    expect(buildFinalContextFileLocator(final, filename)).toBe(`/rest/agent-collaborations/host/agent-runs/child/context-files/${filename}`);
    expect(() => parseFinalContextFileOwnerDescriptor({ kind: "agent_collaboration_member_final", hostRunId: "host", agentRunId: "child", extra: 1 })).toThrow();
    expect(() => parseDraftContextFileOwnerDescriptor({ kind: "agent_collaboration_member_draft", hostRunId: "../x", agentRunId: "child" })).toThrow();
  });

  it("drafts under the Agent-root draft folder, finalizes into the child's memory and reads back", async () => {
    const f = await fixture();
    const draft = { kind: "agent_collaboration_member_draft" as const, hostRunId: "host", agentRunId: "child" };
    const final = { kind: "agent_collaboration_member_final" as const, hostRunId: "host", agentRunId: "child" };
    expect(f.layout.getDraftOwnerDirPath(draft)).toBe(path.join(f.root, "draft_context_files", "agent-collaborations", "host", "agent-runs", "child", "context_files"));
    await put(f.layout.getDraftFilePath(draft, filename), "draft bytes");
    expect(f.local.resolve(buildDraftContextFileLocator(draft, filename))).toBe(f.layout.getDraftFilePath(draft, filename));
    const finalized = await f.finalize.finalizeDraftAttachments({ draftOwner: draft, finalOwner: final, attachments: [{ storedFilename: filename, displayName: "notes.txt" }] });
    expect(finalized).toHaveLength(1);
    const expected = path.join(f.hostDir, "collaboration", "child", "context_files", filename);
    expect(await f.read.getFinalFilePath(final, filename)).toBe(expected);
    expect(await fs.readFile(expected, "utf8")).toBe("draft bytes");
    expect(f.local.resolve(buildFinalContextFileLocator(final, filename))).toBe(expected);
  });

  it("rejects a wrong host, a wrong child and mismatched draft/final owners", async () => {
    const f = await fixture();
    await expect(f.resolver.resolveFinalOwner({ kind: "agent_collaboration_member_final", hostRunId: "other", agentRunId: "child" }))
      .rejects.toBeInstanceOf(AgentCollaborationContextFileOwnerNotFoundError);
    await expect(f.resolver.resolveFinalOwner({ kind: "agent_collaboration_member_final", hostRunId: "host", agentRunId: "host" }))
      .rejects.toBeInstanceOf(AgentCollaborationContextFileOwnerNotFoundError);
    await expect(f.finalize.finalizeDraftAttachments({
      draftOwner: { kind: "agent_collaboration_member_draft", hostRunId: "host", agentRunId: "child" },
      finalOwner: { kind: "org_member_final", orgRunId: "host", agentRunId: "child" },
      attachments: [],
    })).rejects.toThrow("must identify the same execution");
  });
});
