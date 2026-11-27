import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { SenderType } from "autobyteus-ts/agent/sender-type.js";
import { createGeneralProcessRunSupervisor } from "../../../../src/agent-execution/runtime/general-process-run-supervisor.js";
import { AgentRunPlatformNotices } from "../../../../src/agent-execution/domain/agent-run-platform-notices.js";
import { readPendingRuntimeHandover } from "../../../../src/agent-memory/services/runtime-handover-reader.js";
import { RuntimeSwitchRecorder } from "../../../../src/agent-memory/services/runtime-switch-recorder.js";
import { getWorkJournalService } from "../../../../src/agent-work-journal/services/work-journal-service.js";
import { TeamChangeNoticeSource } from "../../../../src/agent-team-execution/membership/team-change-notice-source.js";
import { RuntimeHandoverNoticeService } from "../../../../src/runtime-handover-notices/services/runtime-handover-notice-service.js";
import { AgentRunMetadataService } from "../../../../src/run-history/services/agent-run-metadata-service.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";
import { ActiveCollaborationRootDirectory } from "../../../../src/agent-collaboration/execution/services/active-collaboration-root-directory.js";
import { LiveAgentOrgContainer } from "../../../../src/agent-org-execution/container/live-agent-org-container.js";
import { ReceivedFiles } from "../../../../src/remote-collaboration/inbound/received-files.js";
import { AgentDefinition } from "../../../../src/agent-definition/domain/models.js";
import { StandaloneAgentRunRootManager } from "../../../../src/standalone-agent-run-root/services/standalone-agent-run-root-manager.js";
import { TokenUsageCapability } from "../../../../src/token-usage/providers/token-usage-capability.js";
import type { AgentRunMetadata } from "../../../../src/run-history/store/agent-run-metadata-types.js";
import { testViewStreams } from "../../../helpers/view-streams.js";
import { noDelegations, openTaskRecords } from "../../../helpers/no-delegations.js";
import { EXISTING_AGENT_DEFINITIONS, NO_FILES_RECEIVED, OFFERED_STORED_MODEL_OFFER, OFF_DISCOVERY } from "../../../helpers/explicit-host-collaborators.js";
import { configuredRootFixture } from "../../../fixtures/configured-root-first-work-fixture.js";
import {
  FRESH_SESSION, HANDOVER_NOTICE_START, LOST_SESSION, lostSessionClaudeFactory, providerFactoriesWith, seedEarlierWork,
} from "../../../helpers/session-renewal-wiring.js";
import { UNUSED_AUTOMATIC_SWITCH } from "../../../helpers/runtime-switch-fakes.js";

vi.mock("../../../../src/run-history/services/root-run-package-readiness-index.js", () => ({
  RootRunPackageReadinessIndex: class { assertAdmitted = async () => undefined; },
}));

/**
 * org-teams-follow-definition SR-016: an Org unit is an ordinary Team run or agent run, so the base's cross-node files
 * (autobyteus-587) and lost-session renewal (autobyteus-599) reach it through its own root; the container hosts no agent
 * and links no run on a peer (`remoteNodeOf` null). Hand-built runs; only the provider is a test double.
 */
const IN_ORG = { orgRunId: "org_1", address: "/Team" } as const;

describe("SR-016: the container is an active root that links no run on a peer", () => {
  it("registered in the active root directory, it answers remoteNodeOf null and hosts no agent; a unit's agent is placed in its own run", () => {
    const container = new LiveAgentOrgContainer({ container: { orgRunId: "org_1", isLive: () => true } as never, composition: {} as never,
      stream: {} as never, directory: {} as never, roots: {} as never });
    const directory = new ActiveCollaborationRootDirectory();
    directory.reserve(container.rootIdentity, container).commit();
    const registered = directory.resolve({ rootSubjectKind: "agent_org", rootRunId: "org_1" })!;
    expect(registered).toBe(container);
    expect(registered.remoteNodeOf("concierge_1")).toBeNull();
    expect(registered.hasAgentExecution("concierge_1")).toBe(false);
    expect(directory.placeOf("concierge_1")).toBeNull();
  });
});

describe("SR-016 (587): a file from another node to an Org unit lands in the receiving agent's own folder", () => {
  const dirs: string[] = [];
  afterEach(() => { vi.restoreAllMocks(); dirs.splice(0).forEach((dir) => fs.rmSync(dir, { recursive: true, force: true })); });

  it("by run ID: the Team unit's root places it under the member's folder, received_files/<sender>/<name>; the log line names it", async () => {
    const data = fs.mkdtempSync(path.join(os.tmpdir(), "org-unit-received-"));
    dirs.push(data);
    // The node's memory folder holds every agent folder it places into (the fixture's run folder is a sibling under the temp folder).
    // One form of the root on both sides, as the product configures one memory folder (autobyteus-619 REQ-004): a TMPDIR reached
    // through a link (macOS /var/folders → /private/var/folders) must not put the agent folders "outside" the memory folder.
    const received = new ReceivedFiles({ storeDir: path.join(data, "received_files"), memoryDir: os.tmpdir(), maxFileBytes: () => 1024 * 1024 });
    const f = await configuredRootFixture("standalone_team", { activity: "present", containedIn: IN_ORG, receivedFiles: received });
    try {
      expect(f.root.getExecutionTreeSnapshot().containedIn).toEqual(IN_ORG);
      expect(await f.send()).toMatchObject({ accepted: true }); // the member runs
      const bytes = Buffer.from("# Spec from the other node");
      const sha256 = createHash("sha256").update(bytes).digest("hex");
      await expect(received.appendPiece({ sha256, offset: 0, size: bytes.length, bytes })).resolves.toMatchObject({ complete: true });
      const result = await f.root.acceptPeerRunMessage({ fromNodeId: "srv_peer", fromNodeName: "laptop", senderAddress: "/lead",
        files: [{ sha256, size: bytes.length, name: "spec.md" }],
        message: { messageId: "m-peer-1", senderAgentRunId: "peer_lead_1", receiverAgentRunId: f.ids[1], content: "The spec is attached.",
          messageType: "agent_message", referenceFiles: ["/elsewhere/spec.md"], createdAt: "2026-11-22T10:00:00.000Z" } });
      expect(result).toMatchObject({ accepted: true });
      // The member's own folder in its Team unit's run folder (agent_teams/<teamRunId>/<agentRunId>/).
      const placed = path.join(f.memoryDir, "agent_teams", "test-root", f.ids[1], "received_files", "peer_lead_1", "spec.md");
      expect(fs.readFileSync(placed, "utf8")).toBe("# Spec from the other node");
      const line = f.root.getCommunicationSnapshot().messages.find((message) => message.messageId === "m-peer-1")!;
      expect(line.referenceFiles).toEqual([placed]);
    } finally { f.dispose(); }
  });

  it("an agent unit (CRR-009 CR-009): its own standalone root places it in agents/<runId>/received_files/<sender>/<name>; the log line names it", async () => {
    vi.spyOn(TokenUsageCapability.prototype, "assertCurrentSchemaReady").mockImplementation(() => undefined);
    const memoryDir = fs.mkdtempSync(path.join(os.tmpdir(), "org-agent-unit-received-"));
    dirs.push(memoryDir);
    const received = new ReceivedFiles({ storeDir: path.join(memoryDir, "received_files"), memoryDir, maxFileBytes: () => 1024 * 1024 });
    const runId = "concierge_1";
    const metadata = { runId, agentDefinitionId: "concierge", workspaceRootPath: "/w", memoryDir: path.join(memoryDir, "agents", runId), llmModelIdentifier: "m",
      llmConfig: null, autoExecuteTools: false, runtimeKind: RuntimeKind.CODEX_APP_SERVER, platformAgentRunId: null, startedAt: "2026-11-22T09:00:00.000Z",
      containedIn: { orgRunId: "org_1", address: "/concierge" }, address: "/concierge" } as AgentRunMetadata;
    const inputs: string[] = [];
    // The unit's agent runs (a provider stand-in): a reserved input is admitted by its commit.
    const run = { runId, isActive: () => true, config: { memoryDir: metadata.memoryDir }, getStatusSnapshot: () => ({ status: "idle", background_tasks_running: 0 }),
      reserveUserMessage: vi.fn(async (message: { content: string }) => ({ reserved: true as const, reservation: { agentRunId: runId, cancel: vi.fn(),
        commit: vi.fn(() => { inputs.push(message.content); return { release: vi.fn() }; }) } })),
      postUserMessage: vi.fn(async () => ({ accepted: true as const })), publishEvent: vi.fn(async () => undefined) };
    const manager = new StandaloneAgentRunRootManager({
      memoryDir, activeRootDirectory: new ActiveCollaborationRootDirectory(),
      definitions: { getAgentDefinitionById: async () => new AgentDefinition({ id: "concierge", name: "Concierge", description: "d", instructions: "x", ownershipScope: "shared" }) },
      orgInstruction: async () => null,
      agentServices: { getActiveRun: () => run as never, activateRunAgent: vi.fn(async () => ({ run: run as never, metadata })),
        terminateRunAgent: vi.fn(async () => ({ outcome: "terminated" as const, runtimeKind: null })), readMetadata: async () => metadata, ...UNUSED_AUTOMATIC_SWITCH },
      rootDependencies: { taskRecords: openTaskRecords(), delegationIndex: noDelegations(), viewStreams: testViewStreams(), remoteChannel: () => null, receivedFiles: received },
    });
    const root = (await manager.resolveRoot(runId))!;
    const bytes = Buffer.from("# Brief from the other node");
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    await expect(received.appendPiece({ sha256, offset: 0, size: bytes.length, bytes })).resolves.toMatchObject({ complete: true });
    const result = await root.acceptPeerRunMessage({ fromNodeId: "srv_peer", fromNodeName: "laptop", senderAddress: "/lead",
      files: [{ sha256, size: bytes.length, name: "brief.md" }],
      message: { messageId: "m-peer-2", senderAgentRunId: "peer_lead_2", receiverAgentRunId: runId, content: "The brief is attached.",
        messageType: "agent_message", referenceFiles: ["/elsewhere/brief.md"], createdAt: "2026-11-22T10:00:00.000Z" } });
    expect(result).toMatchObject({ accepted: true });
    const placed = path.join(memoryDir, "agents", runId, "received_files", "peer_lead_2", "brief.md");
    expect(fs.readFileSync(placed, "utf8")).toBe("# Brief from the other node");
    expect(root.getCommunicationSnapshot().messages.find((message) => message.messageId === "m-peer-2")!.referenceFiles).toEqual([placed]);
    expect(inputs.join("\n")).toContain(placed);
  });
});

describe("SR-016 (599): an Org unit whose saved runtime session is gone is renewed; its first input begins with the hand-over notice", () => {
  let root: string;
  beforeEach(() => { root = fs.mkdtempSync(path.join(os.tmpdir(), "org-unit-renewal-")); vi.spyOn(console, "warn").mockImplementation(() => undefined); });
  afterEach(() => { vi.restoreAllMocks(); fs.rmSync(root, { recursive: true, force: true }); });

  /** The general process supervisor as the server composes it (the hand-over notice first in the platform input notices). */
  const supervisor = (claude: unknown) => {
    const runSessions = { activateForRun: vi.fn(), deactivateForRun: vi.fn(() => 0) };
    const teamChangeNotices = new TeamChangeNoticeSource();
    return createGeneralProcessRunSupervisor({
      memoryDir: path.join(root, "memory"),
      contextFilePathEnvironment: { appDataDir: root, baseUrl: "http://localhost:8000" },
      agentDefinitionService: { getAgentDefinitionById: EXISTING_AGENT_DEFINITIONS.getAgentDefinitionById, getDefinitionById: vi.fn(async () => null) } as never,
      agentTeamDefinitionService: { getDefinitionById: vi.fn(async () => null) } as never,
      agentOrgDefinitionService: { getDefinitionById: vi.fn(async () => null) } as never,
      definitionAdmissionService: { scan: vi.fn(async () => []) } as never,
      workspaceManager: { ensureWorkspaceByRootPath: vi.fn(async () => ({ workspaceId: "workspace-1" })), getWorkspaceById: vi.fn(() => null) } as never,
      agentProviderFactoryBuilder: { createForExecution: vi.fn(() => providerFactoriesWith(claude)) },
      agentToolMcpSessionAuthority: { scopeIdentity: "general-process", runSessions, assertReady: vi.fn(), blockNewSessions: vi.fn(), close: vi.fn() } as never,
      integrationRunAccess: null, providerRelayAccess: null, runPasses: null,
      remoteChannel: () => null, receivedFiles: NO_FILES_RECEIVED as never, peerDiscovery: OFF_DISCOVERY,
      modelSelectionValidator: { validate: vi.fn(), validateMany: vi.fn(), listOptions: vi.fn(), listOptionsMany: vi.fn(), storedModelOffer: OFFERED_STORED_MODEL_OFFER } as never,
      taskRecords: openTaskRecords(), delegationIndex: noDelegations(), viewStreams: testViewStreams(),
      episodicCatalog: { runDeleted: vi.fn() }, definitionChanges: { subscribe: vi.fn(() => () => undefined) },
      teamChangeNotices,
      platformInputNotices: new AgentRunPlatformNotices([
        new RuntimeHandoverNoticeService({ journals: getWorkJournalService(), readPending: readPendingRuntimeHandover }), teamChangeNotices,
      ]),
      runtimeSwitching: { memory: new RuntimeSwitchRecorder() },
    });
  };

  it("an agent unit (its own run file names its container) and a Team unit's member each renew from their journals", async () => {
    const claude = lostSessionClaudeFactory();
    const host = supervisor(claude.factory);

    // The agent unit: a run of its own in agents/, contained in the Org at /concierge.
    const runId = "concierge_1";
    const memoryDir = path.join(root, "memory");
    const runDir = path.join(memoryDir, "agents", runId);
    seedEarlierWork(runDir);
    await new AgentRunMetadataService(memoryDir).writeMetadata(runId, {
      runId, agentDefinitionId: "agent-1", workspaceRootPath: root, memoryDir: runDir, llmModelIdentifier: "opus", llmConfig: null,
      autoExecuteTools: false, runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, platformAgentRunId: LOST_SESSION, startedAt: "2026-10-14T09:00:00.000Z",
      containedIn: { orgRunId: "org_1", address: "/concierge" }, address: "/concierge",
    } as never);
    const lifecycle = (host.agentRunService as unknown as { lifecycleService: { activateRunAgent(runId: string, input: unknown): Promise<any> } }).lifecycleService;
    const { run, metadata } = await lifecycle.activateRunAgent(runId, { memberExecutionContext: { identity: { agentRunId: runId }, teamScoped: false } });
    await run.postUserMessage(new AgentInputUserMessage("Carry on with the brief.", SenderType.USER, null, {}));
    await vi.waitFor(() => expect(claude.inputs).toHaveLength(1));
    expect(claude.restores).toEqual([LOST_SESSION]);
    expect(metadata.platformAgentRunId).toBe(FRESH_SESSION);
    expect(metadata.containedIn).toEqual({ orgRunId: "org_1", address: "/concierge" });
    expect(claude.inputs[0]!.startsWith(HANDOVER_NOTICE_START)).toBe(true);
    expect(claude.inputs[0]!.endsWith("Carry on with the brief.")).toBe(true);

    // The Team unit's member: a real Team root (contained in the Org) on the supervisor's run manager.
    const f = await configuredRootFixture("standalone_team", { runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, activity: "present", binding: LOST_SESSION,
      containedIn: IN_ORG, agentRunManager: (host as unknown as { agentRunManager: unknown }).agentRunManager });
    try {
      seedEarlierWork(f.memberDir(1));
      expect(await f.send()).toMatchObject({ accepted: true });
      await vi.waitFor(() => expect(claude.inputs).toHaveLength(2));
      expect(claude.restores).toEqual([LOST_SESSION, LOST_SESSION]);
      expect(f.members()[1]!.platformAgentRunId).toBe(FRESH_SESSION);
      expect(f.root.getExecutionTreeSnapshot().containedIn).toEqual(IN_ORG);
      expect(claude.inputs[1]!.startsWith(HANDOVER_NOTICE_START)).toBe(true);
      expect(claude.inputs[1]!.endsWith("Continue this conversation")).toBe(true);
    } finally { f.dispose(); }
  }, 30_000);
});
