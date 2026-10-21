import { describe, expect, it, vi } from "vitest";
import {
  createAgentOrgRootExecutionIdentity,
  createAgentRootExecutionIdentity,
  createCollaborationMemberExecutionIdentity,
  createTeamRootExecutionIdentity,
  type RootExecutionIdentity,
} from "../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import { RemoteRunLinks } from "../../../src/agent-collaboration/execution/remote/remote-run-links.js";
import type { AgentOperationResult } from "../../../src/agent-execution/domain/agent-operation-result.js";
import { AgentOrgRunMessageDelivery } from "../../../src/agent-org-execution/services/agent-org-run-message-delivery.js";
import { TeamRunMessageDelivery } from "../../../src/agent-team-execution/services/team-run-message-delivery.js";
import { StandaloneRootMessageDelivery } from "../../../src/standalone-agent-run-root/services/standalone-root-message-delivery.js";

/**
 * AR-008: each root's message delivery keeps only the routing decision. A run ID that is a remote endpoint goes
 * to the root's shared `RemoteMessageSend` (under the sender's lease); any other run ID takes today's path.
 */

const LEAD = "lead_run";
const REMOTE = "publisher_7f3";
const LOCAL = "writer_run";
const links = () => new RemoteRunLinks({
  remoteRuns: () => [{ kind: "agent" as const, address: "/publisher", agentRunId: REMOTE, nodeId: "srv_peer_b", delegatorAgentRunId: LEAD, startedAt: "2026-10-20T10:00:00.000Z" }],
});

type Harness = Readonly<{
  root: RootExecutionIdentity;
  deliverExact(target: string): Promise<AgentOperationResult>;
  remoteSend: { send: ReturnType<typeof vi.fn> };
  local: ReturnType<typeof vi.fn>;
  lease: ReturnType<typeof vi.fn>;
}>;

const input = (root: RootExecutionIdentity, targetAgentRunId: string) => ({
  sender: { identity: createCollaborationMemberExecutionIdentity({ root, memberAddress: "/lead" as never, agentRunId: LEAD }), displayName: "lead" },
  targetAgentRunId, content: "hello", messageType: "agent_message", referenceFiles: null,
});

const common = () => ({
  remoteSend: { send: vi.fn(async () => ({ accepted: true, message: "remote" })) },
  local: vi.fn(async () => ({ accepted: true, message: "local" })),
  lease: vi.fn((_agentRunId: string, operation: () => Promise<AgentOperationResult>) => operation()),
});

const standalone = (): Harness => {
  const c = common();
  const root = createAgentRootExecutionIdentity(LEAD);
  const delivery = new StandaloneRootMessageDelivery({ remoteLinks: links(), remoteSend: c.remoteSend, authorizeIdentity: vi.fn(),
    taskExecutions: { withLiveLease: c.lease, deliverToExactTarget: c.local } } as never);
  return { root, ...c, deliverExact: (target) => delivery.deliverExact(input(root, target) as never) };
};

const team = (): Harness => {
  const c = common();
  const root = createTeamRootExecutionIdentity("team_a");
  const delivery = new TeamRunMessageDelivery({ remoteLinks: links(), remoteSend: c.remoteSend, authorizeIdentity: vi.fn(), withLiveLease: c.lease } as never);
  return { root, ...c, deliverExact: (target) => delivery.deliverExact(input(root, target) as never, c.local) };
};

const org = (): Harness => {
  const c = common();
  const root = createAgentOrgRootExecutionIdentity("org_a");
  const delivery = new AgentOrgRunMessageDelivery({ remoteLinks: links(), remoteSend: c.remoteSend, authorizeIdentity: vi.fn(),
    taskExecutions: { withLiveLease: c.lease, deliverToExactTarget: c.local } } as never);
  return { root, ...c, deliverExact: (target) => delivery.deliverExact(input(root, target) as never) };
};

describe.each([
  { kind: "standalone Agent root", build: standalone },
  { kind: "Team root", build: team },
  { kind: "Org root", build: org },
])("$kind: run-ID routing (AR-008)", ({ build }) => {
  it("sends to a remote endpoint through the shared RemoteMessageSend, under the sender's lease", async () => {
    const h = build();
    await expect(h.deliverExact(REMOTE)).resolves.toEqual({ accepted: true, message: "remote" });
    expect(h.remoteSend.send).toHaveBeenCalledExactlyOnceWith({
      sender: expect.objectContaining({ agentRunId: LEAD }), endpoint: expect.objectContaining({ kind: "delegated_run", reference: { nodeId: "srv_peer_b", agentRunId: REMOTE } }),
      content: "hello", messageType: "agent_message", referenceFiles: null,
    });
    expect(h.lease).toHaveBeenCalledWith(LEAD, expect.any(Function));
    expect(h.local).not.toHaveBeenCalled();
  });

  it("takes today's path for a run ID that is not a remote endpoint", async () => {
    const h = build();
    await expect(h.deliverExact(LOCAL)).resolves.toEqual({ accepted: true, message: "local" });
    expect(h.remoteSend.send).not.toHaveBeenCalled();
    expect(h.local).toHaveBeenCalledTimes(1);
  });
});
