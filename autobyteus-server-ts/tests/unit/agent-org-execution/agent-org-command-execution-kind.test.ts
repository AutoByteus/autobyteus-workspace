import { NO_MESSAGE_FEED } from "../../helpers/view-streams.js";
import { noDelegations, openTaskRecords } from "../../helpers/no-delegations.js";
import { describe, expect, it, vi } from "vitest";
import { createAgentOrgRootExecutionIdentity } from "../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import { RunViewStream } from "../../../src/agent-collaboration/delegation/run-view-stream.js";
import { AgentOrgRun } from "../../../src/agent-org-execution/domain/agent-org-run.js";
import type { AgentOrgRunEvent } from "../../../src/agent-org-execution/domain/agent-org-run-event.js";
import { testAgentOrgExecutionTree, testOrgAgentNode, testOrgTeamNode } from "../../fixtures/current-agent-org-run-fixtures.js";
import { isAgentOrgMessageEvent } from "../../../src/agent-org-execution/domain/agent-org-run-event.js";
import { NO_FILES_RECEIVED, NO_PEER_CHANNEL } from "../../helpers/explicit-host-collaborators.js";

describe("AgentOrgRun command execution kind", () => {
  it("returns the configured kind for the Org's own agents while preserving the generic result-only command surface", async () => {
    const orgRunId = "org-command-kind";
    const direct = testOrgAgentNode("/director", "direct-run");
    const lead = testOrgAgentNode("/team/lead", "lead-run");
    const team = testOrgTeamNode({ address: "/team", teamRunId: "team-run", coordinatorAddress: lead.address, members: [lead] });
    const base = testAgentOrgExecutionTree({ orgRunId, members: [direct, team] });
    const tree = base;
    const rootCommand = vi.fn(async () => ({ accepted: true as const }));
    const live = new Set([direct.agentRunId]);
    const teamCommand = vi.fn(async () => ({ accepted: true as const }));
    const run = new AgentOrgRun({ remoteChannel: NO_PEER_CHANNEL, receivedFiles: NO_FILES_RECEIVED, delegationIndex: noDelegations(), taskRecords: openTaskRecords(),
      root: createAgentOrgRootExecutionIdentity(orgRunId),
      tree,
      messages: { schemaVersion: 1, subjectKind: "agent_org", orgRunId, messages: [] },
      rootAgents: { executeCommand: rootCommand, listHandles: () => [], get: (id: string) => live.has(id) ? {} : null } as never,
      teams: {
        require: () => ({ executeDirectAgentCommand: teamCommand, isActive: () => true }),
        get: () => ({ executeDirectAgentCommand: teamCommand, isActive: () => true }),
        list: () => [],
      } as never,
      callbacks: {} as never,
      persistence: {} as never,
      publisher: new RunViewStream<AgentOrgRunEvent>({ isMessageEvent: isAgentOrgMessageEvent }), messageFeed: NO_MESSAGE_FEED,
    });
    run.activate();
    const command = { kind: "interrupt" as const };
    await expect(run.executeAgentCommandWithExecutionKind(direct.agentRunId, command))
      .resolves.toMatchObject({ result: { accepted: true }, executionKind: "configured" });
    await expect(run.executeAgentCommandWithExecutionKind(lead.agentRunId, command))
      .resolves.toMatchObject({ result: { accepted: true }, executionKind: "configured" });
    await expect(run.executeAgentCommand(direct.agentRunId, command)).resolves.toEqual({ accepted: true });
    expect(rootCommand).toHaveBeenCalledTimes(2);
    // A run one of its agents delegated to is its own run: not an agent of this Org.
    await expect(run.executeAgentCommandWithExecutionKind("delegated-run", command))
      .resolves.toMatchObject({ result: { accepted: false } });
    expect(teamCommand).toHaveBeenCalledTimes(1);
  });
});
