import { describe, expect, it } from "vitest";
import type { TeamRoutingPort } from "autobyteus-ts";
import { PrismaAgentTeamDefinitionConverter } from "../../../src/agent-team-definition/converters/prisma-converter.js";
import { TeamRunOrchestrator } from "../../../src/distributed/team-run-orchestrator/team-run-orchestrator.js";

describe("Federated mixed-node composition integration", () => {
  it("preserves member ownership and resolves mixed-node placement without sync", () => {
    const persistedDefinition = {
      id: 1,
      name: "Federated Team",
      description: "Mixed local and remote members",
      role: "Coordinator",
      avatarUrl: null,
      coordinatorMemberName: "localCoordinator",
      syncId: null,
      syncRevision: null,
      nodes: JSON.stringify([
        {
          member_name: "localCoordinator",
          reference_id: "agent-local",
          reference_type: "AGENT",
          home_node_id: "embedded-local",
        },
        {
          member_name: "remoteSpecialist",
          reference_id: "agent-remote",
          reference_type: "AGENT",
          home_node_id: "node-remote-1",
        },
      ]),
    };

    const teamDefinition = PrismaAgentTeamDefinitionConverter.toDomain(persistedDefinition as any);

    const adapter: TeamRoutingPort = {
      dispatchUserMessage: async () => ({ accepted: true }),
      dispatchInterAgentMessageRequest: async () => ({ accepted: true }),
      dispatchToolApproval: async () => ({ accepted: true }),
      dispatchControlStop: async () => ({ accepted: true }),
    };
    const orchestrator = new TeamRunOrchestrator({
      createRoutingAdapter: () => adapter,
    });

    const run = orchestrator.startRunIfMissing({
      teamDefinition,
      hostNodeId: "embedded-local",
      nodeSnapshots: [
        { nodeId: "embedded-local", isHealthy: true },
        { nodeId: "node-remote-1", isHealthy: true },
      ],
      defaultNodeId: "embedded-local",
    });

    expect(run.placementByMember.localCoordinator).toMatchObject({
      nodeId: "embedded-local",
      source: "home",
    });
    expect(run.placementByMember.remoteSpecialist).toMatchObject({
      nodeId: "node-remote-1",
      source: "home",
    });
  });

  it("canonicalizes embedded-local home ownership to runtime host node id", () => {
    const persistedDefinition = {
      id: 2,
      name: "Federated Team Alias",
      description: "Alias handling",
      role: "Coordinator",
      avatarUrl: null,
      coordinatorMemberName: "localCoordinator",
      syncId: null,
      syncRevision: null,
      nodes: JSON.stringify([
        {
          member_name: "localCoordinator",
          reference_id: "agent-local",
          reference_type: "AGENT",
          home_node_id: "embedded-local",
        },
        {
          member_name: "remoteSpecialist",
          reference_id: "agent-remote",
          reference_type: "AGENT",
          home_node_id: "node-remote-1",
        },
      ]),
    };

    const teamDefinition = PrismaAgentTeamDefinitionConverter.toDomain(persistedDefinition as any);
    const adapter: TeamRoutingPort = {
      dispatchUserMessage: async () => ({ accepted: true }),
      dispatchInterAgentMessageRequest: async () => ({ accepted: true }),
      dispatchToolApproval: async () => ({ accepted: true }),
      dispatchControlStop: async () => ({ accepted: true }),
    };
    const orchestrator = new TeamRunOrchestrator({
      createRoutingAdapter: () => adapter,
    });

    const run = orchestrator.startRunIfMissing({
      teamDefinition,
      hostNodeId: "node-runtime",
      nodeSnapshots: [
        { nodeId: "node-runtime", isHealthy: true },
        { nodeId: "node-remote-1", isHealthy: true },
      ],
      defaultNodeId: "node-runtime",
    });

    expect(run.placementByMember.localCoordinator).toMatchObject({
      nodeId: "node-runtime",
      source: "home",
    });
    expect(run.placementByMember.remoteSpecialist).toMatchObject({
      nodeId: "node-remote-1",
      source: "home",
    });
  });
});
