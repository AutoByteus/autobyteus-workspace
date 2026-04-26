import { describe, expect, it, vi } from "vitest";
import { ExternalChannelProvider } from "autobyteus-ts/external-channel/provider.js";
import { ExternalChannelTransport } from "autobyteus-ts/external-channel/channel-transport.js";
import { ChannelBindingService } from "../../../../src/external-channel/services/channel-binding-service.js";
import type { ChannelBinding } from "../../../../src/external-channel/domain/models.js";
import type { ChannelBindingProvider } from "../../../../src/external-channel/providers/channel-binding-provider.js";

const createBinding = (transport: ExternalChannelTransport): ChannelBinding => ({
  id: `binding-${transport}`,
  provider: ExternalChannelProvider.WHATSAPP,
  transport,
  accountId: "acct-1",
  peerId: "peer-1",
  threadId: null,
  targetType: "AGENT",
  agentRunId: "agent-1",
  teamRunId: null,
  targetNodeName: null,
  allowTransportFallback: false,
  createdAt: new Date("2026-02-08T00:00:00.000Z"),
  updatedAt: new Date("2026-02-08T00:00:00.000Z"),
});

const createTeamBinding = (targetNodeName: string | null): ChannelBinding => ({
  ...createBinding(ExternalChannelTransport.PERSONAL_SESSION),
  id: `binding-team-${targetNodeName ?? "default"}`,
  targetType: "TEAM",
  agentRunId: null,
  teamRunId: "team-1",
  targetNodeName,
});

const createTeamRun = () => {
  const runtimeContext = {
    memberContexts: [
      { memberName: "coordinator", memberRunId: "run-coordinator" },
      { memberName: "worker", memberRunId: "run-worker" },
    ],
  };
  return {
    runId: "team-1",
    context: { coordinatorMemberName: "coordinator", runtimeContext },
    config: {
      coordinatorMemberName: "coordinator",
      memberConfigs: [{ memberName: "coordinator" }, { memberName: "worker" }],
    },
    getRuntimeContext: () => runtimeContext,
  };
};

describe("ChannelBindingService", () => {
  it("resolves exact transport binding", async () => {
    const provider: ChannelBindingProvider = {
      findBinding: vi.fn().mockResolvedValue(createBinding(ExternalChannelTransport.BUSINESS_API)),
      findProviderDefaultBinding: vi.fn(),
      findBindingByDispatchTarget: vi.fn(),
      isRouteBoundToTarget: vi.fn(),
      listBindings: vi.fn(),
      upsertBinding: vi.fn(),
      upsertBindingAgentRunId: vi.fn(),
      upsertBindingTeamRunId: vi.fn(),
      deleteBinding: vi.fn(),
    };
    const service = new ChannelBindingService(provider);

    const result = await service.resolveBinding({
      provider: ExternalChannelProvider.WHATSAPP,
      transport: ExternalChannelTransport.BUSINESS_API,
      accountId: "acct-1",
      peerId: "peer-1",
      threadId: null,
    });

    expect(result).not.toBeNull();
    expect(result?.usedTransportFallback).toBe(false);
    expect(provider.findProviderDefaultBinding).not.toHaveBeenCalled();
  });

  it("returns null when exact binding missing and fallback disabled", async () => {
    const provider: ChannelBindingProvider = {
      findBinding: vi.fn().mockResolvedValue(null),
      findProviderDefaultBinding: vi.fn().mockResolvedValue(createBinding(ExternalChannelTransport.BUSINESS_API)),
      findBindingByDispatchTarget: vi.fn(),
      isRouteBoundToTarget: vi.fn(),
      listBindings: vi.fn(),
      upsertBinding: vi.fn(),
      upsertBindingAgentRunId: vi.fn(),
      upsertBindingTeamRunId: vi.fn(),
      deleteBinding: vi.fn(),
    };
    const service = new ChannelBindingService(provider, { allowTransportFallback: false });

    const result = await service.resolveBinding({
      provider: ExternalChannelProvider.WHATSAPP,
      transport: ExternalChannelTransport.PERSONAL_SESSION,
      accountId: "acct-1",
      peerId: "peer-1",
      threadId: null,
    });

    expect(result).toBeNull();
    expect(provider.findProviderDefaultBinding).not.toHaveBeenCalled();
  });

  it("resolves provider default when fallback enabled", async () => {
    const fallbackBinding = createBinding(ExternalChannelTransport.BUSINESS_API);
    const provider: ChannelBindingProvider = {
      findBinding: vi.fn().mockResolvedValue(null),
      findProviderDefaultBinding: vi.fn().mockResolvedValue(fallbackBinding),
      findBindingByDispatchTarget: vi.fn(),
      isRouteBoundToTarget: vi.fn(),
      listBindings: vi.fn(),
      upsertBinding: vi.fn(),
      upsertBindingAgentRunId: vi.fn(),
      upsertBindingTeamRunId: vi.fn(),
      deleteBinding: vi.fn(),
    };
    const service = new ChannelBindingService(provider, { allowTransportFallback: true });

    const result = await service.resolveBinding({
      provider: ExternalChannelProvider.WHATSAPP,
      transport: ExternalChannelTransport.PERSONAL_SESSION,
      accountId: "acct-1",
      peerId: "peer-1",
      threadId: null,
    });

    expect(result).not.toBeNull();
    expect(result?.binding.id).toBe(fallbackBinding.id);
    expect(result?.usedTransportFallback).toBe(true);
  });

  it("delegates upsert methods to provider", async () => {
    const binding = createBinding(ExternalChannelTransport.BUSINESS_API);
    const provider: ChannelBindingProvider = {
      findBinding: vi.fn(),
      findProviderDefaultBinding: vi.fn(),
      findBindingByDispatchTarget: vi.fn().mockResolvedValue(binding),
      isRouteBoundToTarget: vi.fn(),
      listBindings: vi.fn().mockResolvedValue([binding]),
      upsertBinding: vi.fn().mockResolvedValue(binding),
      upsertBindingAgentRunId: vi.fn().mockResolvedValue(binding),
      deleteBinding: vi.fn().mockResolvedValue(true),
    };
    const service = new ChannelBindingService(provider);

    const upserted = await service.upsertBinding({
      provider: ExternalChannelProvider.WHATSAPP,
      transport: ExternalChannelTransport.BUSINESS_API,
      accountId: "acct-1",
      peerId: "peer-1",
      threadId: null,
      targetType: "AGENT",
      agentRunId: "agent-1",
      allowTransportFallback: false,
    });
    const relinked = await service.upsertBindingAgentRunId(binding.id, "agent-2");
    const listed = await service.listBindings();
    const deleted = await service.deleteBinding(binding.id);

    expect(upserted.id).toBe(binding.id);
    expect(relinked.id).toBe(binding.id);
    expect(listed).toEqual([binding]);
    expect(deleted).toBe(true);
    expect(provider.upsertBinding).toHaveBeenCalledTimes(1);
    expect(provider.upsertBindingAgentRunId).toHaveBeenCalledWith(binding.id, "agent-2");
    expect(provider.listBindings).toHaveBeenCalledTimes(1);
    expect(provider.deleteBinding).toHaveBeenCalledWith(binding.id);
  });

  it("delegates dispatch-target lookup after normalization", async () => {
    const binding = createBinding(ExternalChannelTransport.BUSINESS_API);
    const provider: ChannelBindingProvider = {
      findBinding: vi.fn(),
      findProviderDefaultBinding: vi.fn(),
      findBindingByDispatchTarget: vi.fn().mockResolvedValue(binding),
      isRouteBoundToTarget: vi.fn().mockResolvedValue(true),
      listBindings: vi.fn(),
      upsertBinding: vi.fn(),
      upsertBindingAgentRunId: vi.fn(),
      upsertBindingTeamRunId: vi.fn(),
      deleteBinding: vi.fn(),
    };
    const service = new ChannelBindingService(provider);

    const result = await service.findBindingByDispatchTarget({
      agentRunId: " agent-1 ",
      teamRunId: "   ",
    });

    expect(result?.id).toBe(binding.id);
    expect(provider.findBindingByDispatchTarget).toHaveBeenCalledWith({
      agentRunId: "agent-1",
      teamRunId: null,
    });
  });

  it("rejects lookup when neither agentRunId nor teamRunId is provided", async () => {
    const provider: ChannelBindingProvider = {
      findBinding: vi.fn(),
      findProviderDefaultBinding: vi.fn(),
      findBindingByDispatchTarget: vi.fn(),
      isRouteBoundToTarget: vi.fn(),
      listBindings: vi.fn(),
      upsertBinding: vi.fn(),
      upsertBindingAgentRunId: vi.fn(),
      upsertBindingTeamRunId: vi.fn(),
      deleteBinding: vi.fn(),
    };
    const service = new ChannelBindingService(provider);

    await expect(
      service.findBindingByDispatchTarget({
        agentRunId: " ",
        teamRunId: null,
      }),
    ).rejects.toThrow(
      "Dispatch target lookup requires at least one of agentRunId or teamRunId.",
    );
    expect(provider.findBindingByDispatchTarget).not.toHaveBeenCalled();
  });

  it("checks active route bindings with output target identity", async () => {
    const provider: ChannelBindingProvider = {
      findBinding: vi.fn().mockResolvedValue(createBinding(ExternalChannelTransport.PERSONAL_SESSION)),
      findProviderDefaultBinding: vi.fn(),
      findBindingByDispatchTarget: vi.fn(),
      isRouteBoundToTarget: vi.fn(),
      listBindings: vi.fn(),
      upsertBinding: vi.fn(),
      upsertBindingAgentRunId: vi.fn(),
      upsertBindingTeamRunId: vi.fn(),
      deleteBinding: vi.fn(),
    };
    const service = new ChannelBindingService(provider);

    const result = await service.isRouteBoundToTarget(
      {
        provider: ExternalChannelProvider.WHATSAPP,
        transport: ExternalChannelTransport.PERSONAL_SESSION,
        accountId: " acct-1 ",
        peerId: " peer-1 ",
        threadId: " ",
      },
      {
        targetType: "AGENT",
        agentRunId: " agent-1 ",
      },
    );

    expect(result).toBe(true);
    expect(provider.findBinding).toHaveBeenCalledWith(
      {
        provider: ExternalChannelProvider.WHATSAPP,
        transport: ExternalChannelTransport.PERSONAL_SESSION,
        accountId: "acct-1",
        peerId: "peer-1",
        threadId: null,
      },
    );
    expect(provider.isRouteBoundToTarget).not.toHaveBeenCalled();
  });

  it("checks explicit and default team route bindings against member identity", async () => {
    const provider: ChannelBindingProvider = {
      findBinding: vi.fn(),
      findProviderDefaultBinding: vi.fn(),
      findBindingByDispatchTarget: vi.fn(),
      isRouteBoundToTarget: vi.fn(),
      listBindings: vi.fn(),
      upsertBinding: vi.fn(),
      upsertBindingAgentRunId: vi.fn(),
      upsertBindingTeamRunId: vi.fn(),
      deleteBinding: vi.fn(),
    };
    const service = new ChannelBindingService(provider, {}, {
      teamRunService: { resolveTeamRun: vi.fn().mockResolvedValue(createTeamRun()) } as any,
    });
    const route = {
      provider: ExternalChannelProvider.WHATSAPP,
      transport: ExternalChannelTransport.PERSONAL_SESSION,
      accountId: "acct-1",
      peerId: "peer-1",
      threadId: null,
    };
    const coordinatorTarget = {
      targetType: "TEAM" as const,
      teamRunId: "team-1",
      entryMemberRunId: "run-coordinator",
      entryMemberName: "coordinator",
    };
    const workerTarget = {
      targetType: "TEAM" as const,
      teamRunId: "team-1",
      entryMemberRunId: "run-worker",
      entryMemberName: "worker",
    };
    const workerRunIdOnlyTarget = {
      targetType: "TEAM" as const,
      teamRunId: "team-1",
      entryMemberRunId: "run-worker",
      entryMemberName: null,
    };

    vi.mocked(provider.findBinding).mockResolvedValue(createTeamBinding("worker"));
    await expect(service.isRouteBoundToTarget(route, workerTarget)).resolves.toBe(true);
    await expect(service.isRouteBoundToTarget(route, workerRunIdOnlyTarget)).resolves.toBe(true);
    await expect(service.isRouteBoundToTarget(route, coordinatorTarget)).resolves.toBe(false);

    vi.mocked(provider.findBinding).mockResolvedValue(createTeamBinding(null));
    await expect(service.isRouteBoundToTarget(route, coordinatorTarget)).resolves.toBe(true);
    await expect(service.isRouteBoundToTarget(route, workerTarget)).resolves.toBe(false);
  });
});
