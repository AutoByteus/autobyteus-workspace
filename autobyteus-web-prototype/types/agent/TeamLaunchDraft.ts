import type { MemberConfigOverride, TeamRunConfig } from './TeamRunConfig';
import type { AgentTeamAddress } from './AgentTeamAddress';
import type { ContextAttachment } from '~/types/conversation';
import type { WorkspaceMetadata } from '~/types/workspace/WorkspaceMetadata';

export type TeamLaunchDraftId = string & { readonly __teamLaunchDraftId: unique symbol };

export interface TeamLaunchPendingInput {
  readonly text: string;
  readonly attachments: readonly ContextAttachment[];
}

export type TeamLaunchConfigEdit =
  | Readonly<{
      kind: 'set_workspace';
      workspaceId: string | null;
      workspaceMetadata: WorkspaceMetadata | null;
    }>
  | Readonly<{ kind: 'set_runtime'; runtimeKind: string }>
  | Readonly<{ kind: 'set_model'; llmModelIdentifier: string }>
  | Readonly<{ kind: 'set_llm_config'; llmConfig: Record<string, unknown> | null }>
  | Readonly<{ kind: 'set_auto_execute_tools'; autoExecuteTools: boolean }>
  | Readonly<{
      kind: 'set_member_override';
      memberAddress: AgentTeamAddress;
      override: MemberConfigOverride | null;
    }>;

export interface TeamLaunchDraft {
  readonly draftId: TeamLaunchDraftId;
  readonly config: Readonly<TeamRunConfig>;
  readonly focusedMemberAddress: AgentTeamAddress;
  readonly pendingInputsByMemberAddress: Readonly<Record<AgentTeamAddress, TeamLaunchPendingInput>>;
}

export const createTeamLaunchDraftId = (): TeamLaunchDraftId =>
  `team-draft-${crypto.randomUUID()}` as TeamLaunchDraftId;
