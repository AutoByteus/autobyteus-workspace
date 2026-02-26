import type { TeamMemberRunManifest } from "../../run-history/domain/team-models.js";
import { TeamMemberMemoryLayoutStore } from "../../run-history/store/team-member-memory-layout-store.js";
import { TeamMemberRunManifestStore } from "../../run-history/store/team-member-run-manifest-store.js";
import { normalizeMemberRouteKey } from "../../run-history/utils/team-member-agent-id.js";
import { normalizeRouteSegment } from "../event-aggregation/remote-event-projection.js";
import {
  toRunScopedMemberBinding,
  type RunScopedMemberBinding,
  type RunScopedMemberBindingInput,
} from "../runtime-binding/run-scoped-member-binding.js";

const normalizeOptionalString = (value: string | null | undefined): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const normalizeRunVersion = (value: string | number): number =>
  typeof value === "number"
    ? Math.max(1, Math.floor(value))
    : Number.isFinite(Number(value))
      ? Math.max(1, Math.floor(Number(value)))
      : 1;

const isBindingLocalToNode = (hostNodeId: string | null | undefined, localNodeId: string): boolean => {
  const normalizedHostNodeId = normalizeOptionalString(hostNodeId);
  if (!normalizedHostNodeId) {
    return false;
  }
  if (normalizedHostNodeId === "embedded-local" || normalizedHostNodeId === "local") {
    return true;
  }
  return normalizedHostNodeId === localNodeId;
};

const toLocalMemberRunManifest = (input: {
  teamRunId: string;
  runVersion: string | number;
  nowIso: string;
  memberBinding: RunScopedMemberBinding;
}): TeamMemberRunManifest | null => {
  const memberAgentId = input.memberBinding.memberAgentId?.trim();
  if (!memberAgentId) {
    return null;
  }
  return {
    version: 1,
    teamRunId: input.teamRunId,
    runVersion: normalizeRunVersion(input.runVersion),
    memberRouteKey: normalizeMemberRouteKey(
      input.memberBinding.memberRouteKey ?? input.memberBinding.memberName,
    ),
    memberName: input.memberBinding.memberName,
    memberAgentId,
    hostNodeId: normalizeOptionalString(input.memberBinding.hostNodeId ?? null),
    agentDefinitionId: input.memberBinding.agentDefinitionId,
    llmModelIdentifier: input.memberBinding.llmModelIdentifier,
    autoExecuteTools: input.memberBinding.autoExecuteTools,
    llmConfig: input.memberBinding.llmConfig ?? null,
    workspaceRootPath: normalizeOptionalString(input.memberBinding.workspaceRootPath ?? null),
    lastKnownStatus: "IDLE",
    createdAt: input.nowIso,
    updatedAt: input.nowIso,
  };
};

type MemberLayoutStoreDependencies = Pick<TeamMemberMemoryLayoutStore, "getMemberDirPath">;
type MemberRunManifestStoreDependencies = Pick<TeamMemberRunManifestStore, "writeManifest">;

export type WorkerBootstrapMemberArtifactService = {
  prepareMemberBindings: (
    teamRunId: string,
    rawMemberBindings: RunScopedMemberBindingInput[],
  ) => RunScopedMemberBinding[];
  persistLocalMemberRunManifests: (input: {
    teamRunId: string;
    runVersion: string | number;
    memberBindings: RunScopedMemberBinding[];
    nowIso?: string;
  }) => Promise<void>;
};

export const createWorkerBootstrapMemberArtifactService = (input: {
  localNodeId: string;
  memberLayoutStore: MemberLayoutStoreDependencies;
  memberRunManifestStore: MemberRunManifestStoreDependencies;
}): WorkerBootstrapMemberArtifactService => ({
  prepareMemberBindings: (teamRunId, rawMemberBindings) =>
    rawMemberBindings.map((rawBinding) => {
      const binding = toRunScopedMemberBinding(rawBinding);
      const memberAgentId = normalizeRouteSegment(binding.memberAgentId ?? "");
      if (!memberAgentId) {
        return binding;
      }
      const bindingIsLocal = isBindingLocalToNode(binding.hostNodeId ?? null, input.localNodeId);
      return {
        ...binding,
        memoryDir: bindingIsLocal
          ? input.memberLayoutStore.getMemberDirPath(teamRunId, memberAgentId)
          : null,
      };
    }),

  persistLocalMemberRunManifests: async (payload) => {
    const nowIso = payload.nowIso ?? new Date().toISOString();
    await Promise.all(
      payload.memberBindings
        .filter(
          (binding) =>
            binding.memberAgentId &&
            isBindingLocalToNode(binding.hostNodeId ?? null, input.localNodeId),
        )
        .map(async (binding) => {
          const manifest = toLocalMemberRunManifest({
            teamRunId: payload.teamRunId,
            runVersion: payload.runVersion,
            nowIso,
            memberBinding: binding,
          });
          if (!manifest) {
            return;
          }
          await input.memberRunManifestStore.writeManifest(payload.teamRunId, manifest);
        }),
    );
  },
});
