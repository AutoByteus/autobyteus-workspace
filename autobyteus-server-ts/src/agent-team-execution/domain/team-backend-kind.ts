import { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";

export enum TeamBackendKind {
  AUTOBYTEUS = RuntimeKind.AUTOBYTEUS,
  CODEX_APP_SERVER = RuntimeKind.CODEX_APP_SERVER,
  CLAUDE_AGENT_SDK = RuntimeKind.CLAUDE_AGENT_SDK,
  MIXED = "mixed",
}

export const resolveSingleRuntimeTeamBackendKind = (
  runtimeKind: RuntimeKind,
): TeamBackendKind => {
  if (runtimeKind === RuntimeKind.CODEX_APP_SERVER) {
    return TeamBackendKind.CODEX_APP_SERVER;
  }
  if (runtimeKind === RuntimeKind.CLAUDE_AGENT_SDK) {
    return TeamBackendKind.CLAUDE_AGENT_SDK;
  }
  return TeamBackendKind.AUTOBYTEUS;
};
