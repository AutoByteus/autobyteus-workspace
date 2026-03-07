import {
  resolveAllowedRecipientNamesFromManifest,
  resolveMemberNameFromMetadata,
  resolveSendMessageToEnabledFromMetadata,
  resolveTeamManifestMembersFromMetadata,
  resolveTeamRunIdFromMetadata,
} from "./claude-runtime-team-metadata.js";
import {
  type ClaudeRunSessionState,
  type ClaudeSdkPermissionMode,
} from "./claude-runtime-shared.js";

export const createClaudeRunSessionState = (options: {
  runId: string;
  sessionId: string;
  modelIdentifier: string;
  workingDirectory: string;
  autoExecuteTools: boolean;
  permissionMode: ClaudeSdkPermissionMode;
  runtimeMetadata: Record<string, unknown>;
  hasCompletedTurn: boolean;
}): ClaudeRunSessionState => {
  const teamManifestMembers = resolveTeamManifestMembersFromMetadata(options.runtimeMetadata);
  const memberName = resolveMemberNameFromMetadata(options.runtimeMetadata);

  return {
    runId: options.runId,
    sessionId: options.sessionId,
    model: options.modelIdentifier,
    workingDirectory: options.workingDirectory,
    autoExecuteTools: options.autoExecuteTools,
    permissionMode: options.permissionMode,
    hasCompletedTurn: options.hasCompletedTurn,
    runtimeMetadata: {
      ...options.runtimeMetadata,
      model: options.modelIdentifier,
      cwd: options.workingDirectory,
      autoExecuteTools: options.autoExecuteTools,
      permissionMode: options.permissionMode,
    },
    teamRunId: resolveTeamRunIdFromMetadata(options.runtimeMetadata),
    memberName,
    sendMessageToEnabled: resolveSendMessageToEnabledFromMetadata(options.runtimeMetadata),
    teamManifestMembers,
    allowedRecipientNames: resolveAllowedRecipientNamesFromManifest({
      currentMemberName: memberName,
      members: teamManifestMembers,
    }),
    listeners: new Set(),
    activeAbortController: null,
    activeTurnId: null,
  };
};
