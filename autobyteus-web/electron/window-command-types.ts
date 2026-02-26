export type NodeWindowCommandType = 'START_AGENT_RUN' | 'START_TEAM_RUN';

export interface StartAgentRunPayload {
  agentDefinitionId: string;
  agentName: string;
  sourceNodeId: string;
  homeNodeId: string;
}

export interface StartAgentRunCommand {
  commandId: string;
  commandType: 'START_AGENT_RUN';
  issuedAtIso: string;
  payload: StartAgentRunPayload;
}

export interface StartTeamRunPayload {
  teamDefinitionId: string;
  teamName: string;
  sourceNodeId: string;
  homeNodeId: string;
}

export interface StartTeamRunCommand {
  commandId: string;
  commandType: 'START_TEAM_RUN';
  issuedAtIso: string;
  payload: StartTeamRunPayload;
}

export type NodeWindowCommand = StartAgentRunCommand | StartTeamRunCommand;

export interface DispatchNodeWindowCommandResult {
  accepted: boolean;
  delivered: boolean;
  queued: boolean;
  windowId?: number;
  reason?: string;
}
