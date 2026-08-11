import type { TeamRunConfig } from './TeamRunConfig';
import type { AgentTeamAddress } from './TeamExecutionAddress';
import type { ContextAttachment } from '~/types/conversation';

export type TeamLaunchDraftId = string & { readonly __teamLaunchDraftId: unique symbol };

export interface TeamLaunchPendingInput {
  readonly text: string;
  readonly attachments: readonly ContextAttachment[];
}

export interface TeamLaunchDraft {
  readonly draftId: TeamLaunchDraftId;
  readonly config: Readonly<TeamRunConfig>;
  readonly focusedMemberAddress: AgentTeamAddress;
  readonly pendingInputsByMemberAddress: Readonly<Record<AgentTeamAddress, TeamLaunchPendingInput>>;
}

export const createTeamLaunchDraftId = (): TeamLaunchDraftId =>
  `team-draft-${crypto.randomUUID()}` as TeamLaunchDraftId;
