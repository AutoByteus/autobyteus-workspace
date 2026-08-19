import type { TeamExecutionViewState } from '~/services/teamExecution/teamExecutionViewState';

/** The browser owns one exact concrete Team execution aggregate. */
export interface AgentTeamContext {
  readonly view: TeamExecutionViewState;
}
