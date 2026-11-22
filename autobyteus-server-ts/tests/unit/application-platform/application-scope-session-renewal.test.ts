import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { SenderType } from "autobyteus-ts/agent/sender-type.js";
import { buildApplicationExecutionScopeKernel } from "../../../src/application-platform/execution/application-execution-scope-kernel-builder.js";
import { AgentRunMetadataService } from "../../../src/run-history/services/agent-run-metadata-service.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { testViewStreams } from "../../helpers/view-streams.js";
import { noDelegations, openTaskRecords } from "../../helpers/no-delegations.js";
import { EXISTING_AGENT_DEFINITIONS, NO_FILES_RECEIVED, NO_PEER_CHANNEL, OFFERED_STORED_MODEL_OFFER, OFF_DISCOVERY } from "../../helpers/explicit-host-collaborators.js";
import {
  FRESH_SESSION, HANDOVER_NOTICE_START, LOST_SESSION, lostSessionClaudeFactory, providerFactoriesWith, seedEarlierWork,
} from "../../helpers/session-renewal-wiring.js";

vi.mock("../../../src/run-history/services/root-run-package-readiness-index.js", () => ({
  RootRunPackageReadinessIndex: class { assertAdmitted = async () => undefined; },
}));

/**
 * AC-008, the application execution scope (autobyteus-599, DEC-007): a renewal through the scope's REAL kernel (its run
 * manager with the input preface, its lifecycle with the switch memory, its run service); only the Claude provider is a test
 * double behind the factory contract. The fresh session's first input begins with the hand-over notice.
 */
const RUN_ID = "app-run-1";

describe("an application-scope run whose saved Claude session is lost", () => {
  let memoryDir: string;
  let runDir: string;
  beforeEach(() => {
    memoryDir = fs.mkdtempSync(path.join(os.tmpdir(), "application-scope-renewal-"));
    runDir = path.join(memoryDir, "agents", RUN_ID);
  });
  afterEach(() => { vi.restoreAllMocks(); fs.rmSync(memoryDir, { recursive: true, force: true }); });

  const buildKernel = (claude: unknown) => {
    const runSessions = Object.freeze({ activateForRun: vi.fn(), deactivateForRun: vi.fn(() => 0) });
    const authority = { scopeIdentity: "application:test", runSessions, assertReady: vi.fn(), blockNewSessions: vi.fn(), close: vi.fn() };
    return buildApplicationExecutionScopeKernel({
      scopeIdentity: "application:test" as const,
      memoryDir,
      contextFilePathEnvironment: { appDataDir: path.join(memoryDir, "app-data"), baseUrl: "http://localhost:8000" },
      agentDefinitionService: { getDefinitionById: vi.fn(async () => null), getAgentDefinitionById: EXISTING_AGENT_DEFINITIONS.getAgentDefinitionById } as never,
      agentTeamDefinitionService: {} as never,
      agentToolMcpSessionAuthorities: { begin: vi.fn(() => ({ scopeIdentity: "application:test", runSessions, complete: vi.fn(() => authority), abort: vi.fn() })) } as never,
      agentProviderFactoryBuilder: { createForExecution: vi.fn(() => providerFactoriesWith(claude)) },
      workspaceManager: { ensureWorkspaceByRootPath: vi.fn(async () => ({ workspaceId: "workspace-1" })), getWorkspaceById: vi.fn(() => null) } as never,
      bindingReader: { getBinding: vi.fn(async () => null) },
      artifactDeliverySink: { accept: vi.fn(async () => undefined) },
      modelSelectionValidator: { validate: vi.fn(), validateMany: vi.fn(), storedModelOffer: OFFERED_STORED_MODEL_OFFER },
      applicationAgentTools: { resolveSelectedRoutes: vi.fn(() => new Map()), invoke: vi.fn(), close: vi.fn() },
      providerRelayAccess: null,
      remoteChannel: NO_PEER_CHANNEL, receivedFiles: NO_FILES_RECEIVED,
      peerDiscovery: OFF_DISCOVERY,
      runPasses: null,
      delegationIndex: noDelegations(), viewStreams: testViewStreams(),
      taskRecords: openTaskRecords(),
    } as never);
  };

  it("continues in a fresh session whose first input begins with the hand-over notice (AC-008)", async () => {
    seedEarlierWork(runDir);
    await new AgentRunMetadataService(memoryDir).writeMetadata(RUN_ID, {
      runId: RUN_ID, agentDefinitionId: "agent-1", workspaceRootPath: memoryDir, memoryDir: runDir, llmModelIdentifier: "opus", llmConfig: null,
      autoExecuteTools: false, runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, platformAgentRunId: LOST_SESSION, startedAt: "2026-10-14T09:00:00.000Z",
      applicationExecutionContext: { applicationId: "app-1", bindingId: "binding-1", producer: { agentRunId: RUN_ID, displayName: "Agent" } },
    });
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const claude = lostSessionClaudeFactory();
    const kernel = buildKernel(claude.factory);
    const lifecycle = (kernel.agentRunService as unknown as { lifecycleService: { activateRunAgent(runId: string, input: unknown): Promise<any> } }).lifecycleService;

    const { run, metadata } = await lifecycle.activateRunAgent(RUN_ID, { memberExecutionContext: null });
    await run.postUserMessage(new AgentInputUserMessage("Continue the report.", SenderType.USER, null, {}));
    await vi.waitFor(() => expect(claude.inputs).toHaveLength(1));

    expect(claude.restores).toEqual([LOST_SESSION]);
    expect(metadata.platformAgentRunId).toBe(FRESH_SESSION);
    expect(claude.inputs[0]!.startsWith(HANDOVER_NOTICE_START)).toBe(true);
    expect(claude.inputs[0]!.endsWith("Continue the report.")).toBe(true);
    kernel.abortConstruction();
  });
});
