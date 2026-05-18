import { projectAutoByteusAgentStatus } from "../../../agent-execution/backends/autobyteus/events/autobyteus-status-projector.js";
import {
  buildAgentStatusPayload,
  type AgentStatusPayload,
} from "../../../agent-execution/domain/agent-status-payload.js";
import { AgentRunEventType } from "../../../agent-execution/domain/agent-run-event.js";
import {
  TeamRunEventSourceType,
  type TeamRunAgentEventPayload,
  type TeamRunEvent,
} from "../../domain/team-run-event.js";
import type { AutoByteusTeamLike } from "./autobyteus-team-run-backend-contracts.js";
import type { AutoByteusTeamMemberContext, AutoByteusTeamRunContext } from "./autobyteus-team-run-context.js";
import { extractMemberRunId, normalizeOptionalString } from "./autobyteus-team-run-backend-utils.js";

export type AutoByteusMemberStatusIdentity = {
  memberName: string | null;
  memberRunId: string;
  memberRouteKey: string | null;
  memberPath: string[] | null;
  nativeAgentId: string | null;
  runtimeMemberContext: AutoByteusTeamMemberContext | null;
};

type AutoByteusNativeAgentLike = NonNullable<NonNullable<AutoByteusTeamLike["context"]>["agents"]>[number];

export class AutoByteusTeamMemberStatusProjector {
  private readonly observedStatusByMemberRunId = new Map<string, AgentStatusPayload>();

  constructor(
    private readonly team: AutoByteusTeamLike,
    private readonly options: {
      memberRunIdsByName?: ReadonlyMap<string, string>;
      runtimeContext?: AutoByteusTeamRunContext | null;
      isActive: () => boolean;
    },
  ) {}

  normalizeMemberName(value: unknown): string | null {
    return normalizeOptionalString(value);
  }

  extractMemberRunId(
    agentEvent: { agent_id?: unknown; data?: unknown } | null,
    memberName: string | null,
  ): string | null {
    return extractMemberRunId(agentEvent, memberName, this.options.memberRunIdsByName);
  }

  resolveAgentEventMember(input: {
    agentEvent: { agent_id?: unknown; data?: unknown } | null;
    memberName: unknown;
    fallbackMemberRunId: string;
  }): AutoByteusMemberStatusIdentity {
    const memberName = this.normalizeMemberName(input.memberName);
    const extractedMemberRunId = this.extractMemberRunId(input.agentEvent, memberName);
    const nativeAgentId = this.extractNativeAgentId(input.agentEvent);
    const fallbackMemberRunId = extractedMemberRunId ?? memberName ?? input.fallbackMemberRunId;
    const runtimeMemberContext = this.resolveMemberContext({
      memberRunId: fallbackMemberRunId,
      memberName,
      nativeAgentId,
    });
    this.backfillNativeAgentId(runtimeMemberContext, nativeAgentId);

    return this.buildIdentity({
      memberRunId: runtimeMemberContext?.memberRunId ?? fallbackMemberRunId,
      memberName: runtimeMemberContext?.memberName ?? memberName,
      runtimeMemberContext,
      nativeAgentId: runtimeMemberContext?.nativeAgentId ?? nativeAgentId,
    });
  }

  resolveMemberContextByRunIdOrName(
    memberRunId: string,
    memberName: string | null,
  ): AutoByteusTeamMemberContext | null {
    return this.resolveMemberContext({ memberRunId, memberName, nativeAgentId: memberRunId });
  }

  resolveMemberContextByIdentity(identity: string | null): AutoByteusTeamMemberContext | null {
    if (!identity) {
      return null;
    }
    return this.options.runtimeContext?.memberContexts.find(
      (memberContext) =>
        memberContext.memberRunId === identity ||
        memberContext.nativeAgentId === identity ||
        memberContext.memberName === identity ||
        memberContext.memberRouteKey === identity,
    ) ?? null;
  }

  projectMemberStatusSnapshot(input: {
    memberRunId: string;
    memberName: string | null;
    knownRuntimeMemberContext?: AutoByteusTeamMemberContext | null;
  }): AgentStatusPayload {
    const identity = this.resolveSnapshotIdentity(input);
    const nativeMember = this.findNativeMember(identity);
    const snapshot = nativeMember
      ? projectAutoByteusAgentStatus({
        currentStatus: nativeMember.currentStatus,
        context: nativeMember.context ?? null,
        isActive: this.options.isActive(),
        agentId: identity.memberRunId,
        agentName: identity.memberName ?? nativeMember.context?.config?.name ?? null,
      })
      : buildAgentStatusPayload({
        status: "offline",
        canInterrupt: false,
        agentId: identity.memberRunId,
        agentName: identity.memberName,
      });

    const observed = this.options.isActive()
      ? this.observedStatusByMemberRunId.get(identity.memberRunId)
      : undefined;
    const resolved = observed
      ? buildAgentStatusPayload({
        status: observed.status,
        canInterrupt: observed.can_interrupt === true || snapshot.can_interrupt === true,
        agentId: identity.memberRunId,
        agentName: identity.memberName,
        memberRouteKey: identity.memberRouteKey,
        memberPath: identity.memberPath,
        sourceRouteKey: identity.memberRouteKey,
        sourcePath: identity.memberPath,
      })
      : snapshot;

    return this.applyRuntimeIdentity(resolved, identity);
  }

  projectMemberStatusSnapshots(): AgentStatusPayload[] {
    const runtimeMemberContexts = this.options.runtimeContext?.memberContexts ?? [];
    const snapshots = runtimeMemberContexts.length > 0
      ? runtimeMemberContexts.map((memberContext) => this.projectMemberStatusSnapshot({
        memberRunId: memberContext.memberRunId,
        memberName: memberContext.memberName,
        knownRuntimeMemberContext: memberContext,
      }))
      : this.projectNativeMembersWithoutRuntimeContext();
    if (!this.options.isActive()) {
      return snapshots;
    }
    return this.applyObservedStatusOverlays(snapshots);
  }

  recordStatusEvents(events: readonly TeamRunEvent[]): void {
    for (const event of events) {
      if (event.eventSourceType !== TeamRunEventSourceType.AGENT) {
        continue;
      }
      const payload = event.data as TeamRunAgentEventPayload;
      if (payload.agentEvent.eventType !== AgentRunEventType.AGENT_STATUS) {
        continue;
      }
      this.observedStatusByMemberRunId.set(payload.memberRunId, buildAgentStatusPayload({
        status: payload.agentEvent.payload.status,
        canInterrupt: payload.agentEvent.payload.can_interrupt === true,
        agentId: payload.memberRunId,
        agentName: payload.memberName,
        memberRouteKey: payload.memberRouteKey,
        memberPath: payload.memberPath,
        sourceRouteKey: payload.memberRouteKey,
        sourcePath: payload.memberPath,
      }));
    }
  }

  clearObservedStatuses(): void {
    this.observedStatusByMemberRunId.clear();
  }

  private resolveSnapshotIdentity(input: {
    memberRunId: string;
    memberName: string | null;
    knownRuntimeMemberContext?: AutoByteusTeamMemberContext | null;
  }): AutoByteusMemberStatusIdentity {
    const memberName = this.normalizeMemberName(input.memberName);
    const runtimeMemberContext = input.knownRuntimeMemberContext ?? this.resolveMemberContext({
      memberRunId: input.memberRunId,
      memberName,
      nativeAgentId: input.memberRunId,
    });
    const canonicalMemberRunId = runtimeMemberContext?.memberRunId
      ?? (memberName ? this.options.memberRunIdsByName?.get(memberName)?.trim() : undefined)
      ?? input.memberRunId;
    return this.buildIdentity({
      memberRunId: canonicalMemberRunId,
      memberName: runtimeMemberContext?.memberName ?? memberName,
      runtimeMemberContext,
      nativeAgentId: runtimeMemberContext?.nativeAgentId ?? null,
    });
  }

  private projectNativeMembersWithoutRuntimeContext(): AgentStatusPayload[] {
    return (this.team.context?.agents ?? []).flatMap((member) => {
      const memberName = this.normalizeMemberName(member.context?.config?.name);
      if (!memberName) {
        return [];
      }
      const configuredMemberRunId = this.options.memberRunIdsByName?.get(memberName)?.trim();
      const memberRunId = configuredMemberRunId || member.agentId || memberName;
      return [projectAutoByteusAgentStatus({
        currentStatus: member.currentStatus,
        context: member.context ?? null,
        isActive: this.options.isActive(),
        agentId: memberRunId,
        agentName: memberName,
      })];
    });
  }

  private resolveMemberContext(input: {
    memberRunId: string | null;
    memberName: string | null;
    nativeAgentId: string | null;
  }): AutoByteusTeamMemberContext | null {
    return this.options.runtimeContext?.memberContexts.find(
      (memberContext) =>
        memberContext.memberRunId === input.memberRunId ||
        memberContext.memberName === input.memberName ||
        (input.nativeAgentId !== null && memberContext.nativeAgentId === input.nativeAgentId),
    ) ?? null;
  }

  private findNativeMember(identity: AutoByteusMemberStatusIdentity): AutoByteusNativeAgentLike | null {
    const nativeMember = (this.team.context?.agents ?? []).find((member) => {
      const nativeMemberName = this.normalizeMemberName(member.context?.config?.name);
      return (
        member.agentId === identity.memberRunId ||
        (identity.nativeAgentId !== null && member.agentId === identity.nativeAgentId) ||
        (identity.memberName !== null && nativeMemberName === identity.memberName)
      );
    }) ?? null;
    if (nativeMember?.agentId) {
      this.backfillNativeAgentId(identity.runtimeMemberContext, nativeMember.agentId);
    }
    return nativeMember;
  }

  private buildIdentity(input: {
    memberRunId: string;
    memberName: string | null;
    runtimeMemberContext: AutoByteusTeamMemberContext | null;
    nativeAgentId: string | null;
  }): AutoByteusMemberStatusIdentity {
    return {
      memberName: input.memberName,
      memberRunId: input.memberRunId,
      memberRouteKey: input.runtimeMemberContext?.memberRouteKey ?? null,
      memberPath: input.runtimeMemberContext?.memberPath ? [...input.runtimeMemberContext.memberPath] : null,
      nativeAgentId: input.nativeAgentId,
      runtimeMemberContext: input.runtimeMemberContext,
    };
  }

  private applyRuntimeIdentity(
    snapshot: AgentStatusPayload,
    identity: AutoByteusMemberStatusIdentity,
  ): AgentStatusPayload {
    return {
      ...snapshot,
      agent_id: identity.memberRunId,
      ...(identity.memberName ? { agent_name: identity.memberName } : {}),
      ...(identity.memberRouteKey && identity.memberPath ? {
        member_route_key: identity.memberRouteKey,
        member_path: [...identity.memberPath],
        source_route_key: identity.memberRouteKey,
        source_path: [...identity.memberPath],
      } : {}),
    };
  }

  private applyObservedStatusOverlays(snapshots: AgentStatusPayload[]): AgentStatusPayload[] {
    if (this.observedStatusByMemberRunId.size === 0) {
      return snapshots;
    }
    const appliedRunIds = new Set<string>();
    const resolved = snapshots.map((snapshot) => {
      const memberRunId = snapshot.agent_id ?? null;
      const observed = memberRunId ? this.observedStatusByMemberRunId.get(memberRunId) : undefined;
      if (!observed) {
        return snapshot;
      }
      appliedRunIds.add(memberRunId!);
      return { ...snapshot, status: observed.status, can_interrupt: observed.can_interrupt };
    });
    for (const [memberRunId, observed] of this.observedStatusByMemberRunId.entries()) {
      if (!appliedRunIds.has(memberRunId)) {
        resolved.push(observed);
      }
    }
    return resolved;
  }

  private extractNativeAgentId(agentEvent: { agent_id?: unknown } | null): string | null {
    return typeof agentEvent?.agent_id === "string" && agentEvent.agent_id.trim().length > 0
      ? agentEvent.agent_id.trim()
      : null;
  }

  private backfillNativeAgentId(
    runtimeMemberContext: AutoByteusTeamMemberContext | null,
    nativeAgentId: string | null,
  ): void {
    if (runtimeMemberContext && nativeAgentId) {
      runtimeMemberContext.nativeAgentId = nativeAgentId;
    }
  }
}
