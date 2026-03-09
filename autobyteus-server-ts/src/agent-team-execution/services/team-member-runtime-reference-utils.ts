import type { RuntimeKind } from "../../runtime-management/runtime-kind.js";
import type {
  TeamRunMemberBinding,
  TeamMemberRuntimeReference,
} from "../../run-history/domain/team-models.js";

export const toRuntimeReference = (
  runtimeKind: RuntimeKind,
  runId: string,
  reference?: TeamMemberRuntimeReference | null,
  metadata?: Record<string, unknown> | null,
): TeamMemberRuntimeReference => ({
  runtimeKind,
  sessionId: reference?.sessionId ?? runId,
  threadId: reference?.threadId ?? null,
  metadata: {
    ...(reference?.metadata ?? {}),
    ...(metadata ?? {}),
  },
});

export const mergeRuntimeReferenceMetadata = (
  current: TeamMemberRuntimeReference | null | undefined,
  incoming: TeamMemberRuntimeReference | null | undefined,
): Record<string, unknown> | null => {
  const merged = {
    ...(current?.metadata ?? {}),
    ...(incoming?.metadata ?? {}),
  };
  return Object.keys(merged).length > 0 ? merged : null;
};

export const isRuntimeReferenceChanged = (
  current: TeamMemberRuntimeReference | null | undefined,
  next: TeamMemberRuntimeReference | null | undefined,
): boolean =>
  current?.sessionId !== next?.sessionId ||
  current?.threadId !== next?.threadId ||
  JSON.stringify(current?.metadata ?? null) !== JSON.stringify(next?.metadata ?? null);

export const cloneMemberBinding = (binding: TeamRunMemberBinding): TeamRunMemberBinding => ({
  ...binding,
  runtimeReference: binding.runtimeReference
    ? {
        ...binding.runtimeReference,
        metadata: binding.runtimeReference.metadata ? { ...binding.runtimeReference.metadata } : null,
      }
    : null,
  llmConfig: binding.llmConfig ? { ...binding.llmConfig } : null,
});
