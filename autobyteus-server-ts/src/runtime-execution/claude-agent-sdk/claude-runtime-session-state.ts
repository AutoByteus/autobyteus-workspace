import {
  resolveAllowedRecipientNamesFromManifest,
  resolveMemberNameFromMetadata,
  resolveSendMessageToEnabledFromMetadata,
  resolveTeamManifestMembersFromMetadata,
  resolveTeamRunIdFromMetadata,
} from "./claude-runtime-team-metadata.js";
import { type ClaudeRunSessionState } from "./claude-runtime-shared.js";

export const createClaudeRunSessionState = (options: {
  runId: string;
  sessionId: string;
  modelIdentifier: string;
  workingDirectory: string;
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
    hasCompletedTurn: options.hasCompletedTurn,
    runtimeMetadata: {
      ...options.runtimeMetadata,
      model: options.modelIdentifier,
      cwd: options.workingDirectory,
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
