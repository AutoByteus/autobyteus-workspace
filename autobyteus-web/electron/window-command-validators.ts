import type {
  NodeWindowCommand,
  StartAgentRunPayload,
  StartTeamRunPayload,
} from './window-command-types';

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function isStartAgentRunPayload(value: unknown): value is StartAgentRunPayload {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const payload = value as Record<string, unknown>;
  return (
    isNonEmptyString(payload.agentDefinitionId)
    && isNonEmptyString(payload.agentName)
    && isNonEmptyString(payload.sourceNodeId)
    && isNonEmptyString(payload.homeNodeId)
  );
}

export function isStartTeamRunPayload(value: unknown): value is StartTeamRunPayload {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const payload = value as Record<string, unknown>;
  return (
    isNonEmptyString(payload.teamDefinitionId)
    && isNonEmptyString(payload.teamName)
    && isNonEmptyString(payload.sourceNodeId)
    && isNonEmptyString(payload.homeNodeId)
  );
}

export function isNodeWindowCommand(value: unknown): value is NodeWindowCommand {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const command = value as Record<string, unknown>;
  if (
    !isNonEmptyString(command.commandId)
    || !isNonEmptyString(command.commandType)
    || !isNonEmptyString(command.issuedAtIso)
  ) {
    return false;
  }

  if (command.commandType === 'START_AGENT_RUN') {
    return isStartAgentRunPayload(command.payload);
  }
  if (command.commandType === 'START_TEAM_RUN') {
    return isStartTeamRunPayload(command.payload);
  }
  return false;
}
