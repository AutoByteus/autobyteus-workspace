import type { ClaudeRunSessionState } from "./claude-runtime-shared.js";
import { renderTeamManifestSystemPromptAppend } from "./claude-runtime-team-metadata.js";

export const buildClaudeTurnInput = (options: {
  state: ClaudeRunSessionState;
  content: string;
  sendMessageToToolingEnabled: boolean;
}): string => {
  const promptAppend = renderTeamManifestSystemPromptAppend({
    currentMemberName: options.state.memberName,
    members: options.state.teamManifestMembers,
    sendMessageToEnabled: options.sendMessageToToolingEnabled,
  });
  if (!promptAppend) {
    return options.content;
  }

  return [
    "<autobyteus_team_context>",
    promptAppend,
    "</autobyteus_team_context>",
    "",
    "<user_message>",
    options.content,
    "</user_message>",
  ].join("\n");
};

