import {
  asAsyncIterable,
  CLAUDE_AGENT_SDK_MODULE_NAME,
  type ClaudeInterAgentRelayHandler,
  type ClaudeRunSessionState,
  type ClaudeRuntimeEvent,
  type ClaudeSdkModuleLike,
  resolveClaudeCodeExecutablePath,
} from "./claude-runtime-shared.js";
import { renderTeamManifestSystemPromptAppend } from "./claude-runtime-team-metadata.js";
import { resolveSdkFunction, tryCallWithVariants } from "./claude-runtime-sdk-interop.js";
import { buildClaudeTeamMcpServers } from "./claude-send-message-tooling.js";

const createStreamingPrompt = (content: string): AsyncIterable<Record<string, unknown>> =>
  (async function* () {
    yield {
      type: "user",
      message: {
        role: "user",
        content,
      },
    };
  })();

export const invokeClaudeQueryStream = async (options: {
  state: ClaudeRunSessionState;
  prompt: string;
  signal: AbortSignal;
  sdk: ClaudeSdkModuleLike | null;
  interAgentRelayHandler: ClaudeInterAgentRelayHandler | null;
  emitEvent: (state: ClaudeRunSessionState, event: ClaudeRuntimeEvent) => void;
}): Promise<AsyncIterable<unknown>> => {
  const queryFn = resolveSdkFunction(options.sdk, "query");
  if (!queryFn) {
    throw new Error(`${CLAUDE_AGENT_SDK_MODULE_NAME} does not export query().`);
  }

  const pathToClaudeCodeExecutable = resolveClaudeCodeExecutablePath({
    runtimeMetadata: options.state.runtimeMetadata,
  });

  const queryOptions: Record<string, unknown> = {
    model: options.state.model,
    cwd: options.state.workingDirectory,
    pathToClaudeCodeExecutable,
    maxTurns: 1,
    permissionMode: "default",
    signal: options.signal,
    ...(options.state.hasCompletedTurn ? { resume: options.state.sessionId } : {}),
  };

  const teamPromptAppend = renderTeamManifestSystemPromptAppend({
    currentMemberName: options.state.memberName,
    members: options.state.teamManifestMembers,
    sendMessageToEnabled:
      options.state.sendMessageToEnabled &&
      Boolean(options.interAgentRelayHandler) &&
      Boolean(options.state.teamRunId) &&
      options.state.allowedRecipientNames.length > 0,
  });
  if (teamPromptAppend) {
    queryOptions.systemPrompt = {
      type: "preset",
      preset: "claude_code",
      append: teamPromptAppend,
    };
  }

  const teamMcpServers = await buildClaudeTeamMcpServers({
    state: options.state,
    sdk: options.sdk,
    interAgentRelayHandler: options.interAgentRelayHandler,
    emitEvent: options.emitEvent,
  });
  if (teamMcpServers) {
    queryOptions.mcpServers = teamMcpServers;
    queryOptions.allowedTools = ["send_message_to", "mcp__autobyteus_team__send_message_to"];
  }

  const result = await tryCallWithVariants(queryFn, [
    [{ prompt: createStreamingPrompt(options.prompt), options: queryOptions }],
    [
      {
        prompt: createStreamingPrompt(options.prompt),
        options: { ...queryOptions, workingDirectory: options.state.workingDirectory },
      },
    ],
    [{ prompt: options.prompt, options: queryOptions }],
    [options.prompt, queryOptions],
  ]);

  const stream = asAsyncIterable(result);
  if (!stream) {
    throw new Error("Claude SDK query() did not return an async iterable stream.");
  }
  return stream;
};
