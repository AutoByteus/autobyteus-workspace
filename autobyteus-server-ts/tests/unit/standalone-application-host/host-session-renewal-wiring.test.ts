import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { SenderType } from "autobyteus-ts/agent/sender-type.js";
import { createGeneralProcessRunSupervisor } from "../../../src/agent-execution/runtime/general-process-run-supervisor.js";
import { AgentRunPlatformNotices } from "../../../src/agent-execution/domain/agent-run-platform-notices.js";
import { readPendingRuntimeHandover } from "../../../src/agent-memory/services/runtime-handover-reader.js";
import { RuntimeSwitchRecorder } from "../../../src/agent-memory/services/runtime-switch-recorder.js";
import { getWorkJournalService } from "../../../src/agent-work-journal/services/work-journal-service.js";
import { TeamChangeNoticeSource } from "../../../src/agent-team-execution/membership/team-change-notice-source.js";
import { RuntimeHandoverNoticeService } from "../../../src/runtime-handover-notices/services/runtime-handover-notice-service.js";
import { AgentRunMetadataService } from "../../../src/run-history/services/agent-run-metadata-service.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { testViewStreams } from "../../helpers/view-streams.js";
import { noDelegations, openTaskRecords } from "../../helpers/no-delegations.js";
import { EXISTING_AGENT_DEFINITIONS, NO_FILES_RECEIVED, OFFERED_STORED_MODEL_OFFER, OFF_DISCOVERY } from "../../helpers/explicit-host-collaborators.js";
import { configuredRootFixture } from "../../fixtures/configured-root-first-work-fixture.js";
import {
  FRESH_SESSION, HANDOVER_NOTICE_START, LOST_SESSION, lostSessionClaudeFactory, providerFactoriesWith, seedEarlierWork,
} from "../../helpers/session-renewal-wiring.js";

vi.mock("../../../src/run-history/services/root-run-package-readiness-index.js", () => ({
  RootRunPackageReadinessIndex: class { assertAdmitted = async () => undefined; },
}));

/**
 * AC-008, the standalone application host (autobyteus-599, DEC-007): the REAL general process run supervisor built with the
 * host's wiring (the hand-over notice first in `platformInputNotices`, `runtimeSwitching` with a switch recorder; the host's
 * own start passes exactly these, pinned in standalone-application-host-lifecycle.test.ts). Only the Claude provider is a
 * test double behind the factory contract. A delegated copy (the host's standalone lifecycle) and a member (through a real
 * Team root on the supervisor's run manager) each renew a lost session, and the fresh session's first input begins with the
 * hand-over notice.
 */
describe("the standalone application host: a lost Claude session", () => {
  let root: string;
  // One supervisor per test file: it binds process-wide services. It is not closed: the test provider's turns never end, so
  // its close would wait on them; the test worker ends instead.
  beforeEach(() => { root = fs.mkdtempSync(path.join(os.tmpdir(), "host-session-renewal-")); vi.spyOn(console, "warn").mockImplementation(() => undefined); });
  afterEach(() => { vi.restoreAllMocks(); fs.rmSync(root, { recursive: true, force: true }); });

  /** The supervisor as the host wires it (start-standalone-application-host.ts): no credential proxy, no peers. */
  const hostSupervisor = (claude: unknown) => {
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
      integrationRunAccess: null,
      providerRelayAccess: null,
      runPasses: null,
      remoteChannel: () => null,
      receivedFiles: NO_FILES_RECEIVED as never,
      peerDiscovery: OFF_DISCOVERY,
      modelSelectionValidator: { validate: vi.fn(), validateMany: vi.fn(), listOptions: vi.fn(), listOptionsMany: vi.fn(), storedModelOffer: OFFERED_STORED_MODEL_OFFER } as never,
      taskRecords: openTaskRecords(),
      delegationIndex: noDelegations(),
      viewStreams: testViewStreams(),
      episodicCatalog: { runDeleted: vi.fn() },
      definitionChanges: { subscribe: vi.fn(() => () => undefined) },
      teamChangeNotices,
      platformInputNotices: new AgentRunPlatformNotices([
        new RuntimeHandoverNoticeService({ journals: getWorkJournalService(), readPending: readPendingRuntimeHandover }),
        teamChangeNotices,
      ]),
      runtimeSwitching: { memory: new RuntimeSwitchRecorder() },
    });
  };

  it("a delegated copy (the host's standalone lifecycle) and a member (a real Team root on the host supervisor's run manager) renew; each first input begins with the hand-over notice", async () => {
    const claude = lostSessionClaudeFactory();
    const host = hostSupervisor(claude.factory);

    // The delegated copy: no longer the typed error, since the host's lifecycle has the switch memory.
    const runId = "delegated-copy-1";
    const memoryDir = path.join(root, "memory");
    const runDir = path.join(memoryDir, "agents", runId);
    seedEarlierWork(runDir);
    await new AgentRunMetadataService(memoryDir).writeMetadata(runId, {
      runId, agentDefinitionId: "agent-1", workspaceRootPath: root, memoryDir: runDir, llmModelIdentifier: "opus", llmConfig: null,
      autoExecuteTools: false, runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, platformAgentRunId: LOST_SESSION, startedAt: "2026-10-14T09:00:00.000Z",
      delegatedFrom: { delegatingRun: { kind: "agent", runId: "host-run" }, delegatorAgentRunId: "host-run" },
    });
    const lifecycle = (host.agentRunService as unknown as { lifecycleService: { activateRunAgent(runId: string, input: unknown): Promise<any> } }).lifecycleService;
    const { run, metadata } = await lifecycle.activateRunAgent(runId, { memberExecutionContext: { identity: { agentRunId: runId }, teamScoped: false } });
    await run.postUserMessage(new AgentInputUserMessage("Carry on with the notes.", SenderType.USER, null, {}));
    await vi.waitFor(() => expect(claude.inputs).toHaveLength(1));
    expect(claude.restores).toEqual([LOST_SESSION]);
    expect(metadata.platformAgentRunId).toBe(FRESH_SESSION);
    expect(claude.inputs[0]!.startsWith(HANDOVER_NOTICE_START)).toBe(true);
    expect(claude.inputs[0]!.endsWith("Carry on with the notes.")).toBe(true);

    // The member.
    const f = await configuredRootFixture("standalone_team", { runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, activity: "present", binding: LOST_SESSION,
      agentRunManager: (host as unknown as { agentRunManager: unknown }).agentRunManager });
    try {
      seedEarlierWork(f.memberDir(1));
      expect(await f.send()).toMatchObject({ accepted: true });
      await vi.waitFor(() => expect(claude.inputs).toHaveLength(2));
      expect(claude.restores).toEqual([LOST_SESSION, LOST_SESSION]);
      expect(f.members()[1]!.platformAgentRunId).toBe(FRESH_SESSION);
      expect(claude.inputs[1]!.startsWith(HANDOVER_NOTICE_START)).toBe(true);
      expect(claude.inputs[1]!.endsWith("Continue this conversation")).toBe(true);
    } finally { f.dispose(); }
  }, 30_000);
});
