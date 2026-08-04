import type { TeamExecutionAddress } from '~/types/agent/TeamExecutionAddress';

export interface TeamStreamIdentityPayload {
  execution_address?: TeamExecutionAddress;
}
export type TaskAgentIdentityPayload = TeamStreamIdentityPayload;
export type TaskTeamIdentityPayload = TeamStreamIdentityPayload;
