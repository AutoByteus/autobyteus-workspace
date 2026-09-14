import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { AgentRunActivationCandidate } from "../../../src/agent-execution/services/agent-run-activation-candidate.js";
import { AgentOrgExecutionScopeBuilder } from "../../../src/agent-org-execution/services/agent-org-execution-scope-builder.js";
import { AgentOrgRunPersistenceCoordinator } from "../../../src/agent-org-execution/services/agent-org-run-persistence-coordinator.js";
import { validateAgentOrgStatePackage } from "../../../src/agent-org-execution/services/agent-org-state-package-validator.js";
import { validateAgentOrgTaskDelegationRecordsV1 } from "../../../src/agent-org-execution/persistence/agent-org-task-delegation-records-v1-schema.js";
import { validateAgentOrgCommunicationMessagesV1 } from "../../../src/agent-org-execution/persistence/agent-org-communication-messages-v1-schema.js";
import { AgentOrgRunExecutionTreeStore } from "../../../src/run-history/store/agent-org-run-execution-tree-store.js";
import { testAgentOrgExecutionTree, testOrgAgentNode } from "../../fixtures/current-agent-org-run-fixtures.js";

const roots: string[] = [];
afterEach(() => { while (roots.length) rmSync(roots.pop()!, { recursive: true, force: true }); });

describe("AgentOrgExecutionScopeBuilder restore", () => {
  it("restores scope lazily and durably replaces a no-conversation binding on first work", async () => {
    const orgRunId = "org-idle-restore";
    const agentRunId = "agent-verifier";
    const previousPlatformAgentRunId = "thread-system-instruction-only";
    const nextPlatformAgentRunId = "thread-new";
    const sourceAgent = testOrgAgentNode("/verifier", agentRunId);
    const executionTree = testAgentOrgExecutionTree({
      orgRunId,
      members: [{
        ...sourceAgent,
        platformAgentRunId: previousPlatformAgentRunId,
        launchConfiguration: {
          ...sourceAgent.launchConfiguration,
          runtimeKind: RuntimeKind.CODEX_APP_SERVER,
          workspaceRootPath: null,
        },
      }],
    });
    const state = validateAgentOrgStatePackage({
      executionTree,
      taskRecords: validateAgentOrgTaskDelegationRecordsV1({
        schemaVersion: 1,
        subjectKind: "agent_org",
        orgRunId,
        records: [],
      }, orgRunId),
      communicationMessages: validateAgentOrgCommunicationMessagesV1({
        schemaVersion: 1,
        subjectKind: "agent_org",
        orgRunId,
        messages: [],
      }, orgRunId),
    });
    const publicationOrder: string[] = [];
    const orgMemoryDir = mkdtempSync(join(tmpdir(), "agent-org-idle-restore-"));
    roots.push(orgMemoryDir);
    const executionTreeStore = new AgentOrgRunExecutionTreeStore();
    expect((await executionTreeStore.write(orgMemoryDir, executionTree)).outcome).toBe("committed");
    const agentRun = {
      runId: agentRunId,
      isActive: () => true,
      getStatusSnapshot: () => ({ status: "idle" }),
      subscribeToEvents: vi.fn(() => () => undefined),
      postUserMessage: vi.fn(async () => ({ accepted: true })),
      interrupt: vi.fn(async () => ({ accepted: true as const })),
    };
    const candidate = new AgentRunActivationCandidate({
      runId: agentRunId,
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      platformAgentRunId: nextPlatformAgentRunId,
      publish: () => {
        publicationOrder.push("published");
        return agentRun as never;
      },
      abort: async () => ({ kind: "aborted" }),
    });
    const prepareNewAgentRun = vi.fn(async () => candidate);
    let releaseDurability!: () => void;
    const durability = new Promise<void>((resolve) => { releaseDurability = resolve; });
    const write = vi.fn(async (...args: Parameters<AgentOrgRunExecutionTreeStore["write"]>) => {
      await durability;
      const result = await executionTreeStore.write(...args);
      publicationOrder.push("durable");
      return result;
    });
    const persistence = new AgentOrgRunPersistenceCoordinator({
      orgRunId,
      orgMemoryDir,
      executionTreeStore: { write } as never,
      taskRecordsStore: {} as never,
      communicationStore: {} as never,
      enterPersistenceFailStop: vi.fn(),
    });
    const builder = new AgentOrgExecutionScopeBuilder({
      flatTeamExecutionFactory: {} as never,
      taskExecutionIdentity: {
        agentRuns: { allocateForAgentDefinition: vi.fn() },
        taskTeams: { create: vi.fn() },
      } as never,
      orgDefinitions: { getDefinitionById: vi.fn() } as never,
      teamDefinitions: { getDefinitionById: vi.fn() } as never,
      agentRunManager: { prepareNewAgentRun } as never,
      memoryLocator: {
        getLocation: () => ({ memoryDir: `/memory/agent_org/${orgRunId}/${agentRunId}` }),
      } as never,
      activityInspector: { inspect: () => ({ kind: "none" as const }) } as never,
    });

    const run = await builder.build({
      state,
      persistence,
      activationMode: "restore",
      persistInitialPackage: false,
    });
    expect(prepareNewAgentRun).not.toHaveBeenCalled();
    expect(write).not.toHaveBeenCalled();
    expect(run.getAgentStatusSnapshots()[0]!.details.status).toBe("offline");
    const sending = run.executeAgentCommand(agentRunId, { kind: "post_message", message: new AgentInputUserMessage("Continue") });
    await vi.waitFor(() => expect(write).toHaveBeenCalledTimes(1));

    expect(prepareNewAgentRun).toHaveBeenCalledTimes(1);
    expect((await executionTreeStore.read(orgMemoryDir, orgRunId))!.rootOrg.members[0])
      .toMatchObject({ agentRunId, platformAgentRunId: previousPlatformAgentRunId });
    expect(publicationOrder).toEqual([]);

    releaseDurability();
    expect(await sending).toMatchObject({ accepted: true });

    expect(run.isActive()).toBe(true);
    expect(run.getExecutionTreeSnapshot().rootOrg.members[0]).toMatchObject({
      agentRunId,
      platformAgentRunId: nextPlatformAgentRunId,
    });
    expect((await executionTreeStore.read(orgMemoryDir, orgRunId))!.rootOrg.members[0])
      .toMatchObject({ agentRunId, platformAgentRunId: nextPlatformAgentRunId });
    expect(publicationOrder).toEqual(["durable", "published"]);
  });
});
