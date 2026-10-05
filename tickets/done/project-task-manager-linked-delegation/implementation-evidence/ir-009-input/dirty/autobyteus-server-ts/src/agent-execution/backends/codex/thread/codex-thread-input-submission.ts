import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { CodexThread, CodexInputSubmissionResult } from "./codex-thread.js";
import { resolveStartedTurnId, resolveSteeredTurnId } from "./codex-thread-id-resolver.js";
import { toCodexUserInput } from "./codex-user-input-mapper.js";
import { CodexInputSubmissionError } from "./codex-input-submission-error.js";
import { CodexAppServerRpcError } from "../../../../runtime-management/codex/client/codex-app-server-client.js";
const isRuntimeRawEventDebugEnabled = process.env.RUNTIME_RAW_EVENT_DEBUG === "1";

export async function submitCodexStartInput(thread: CodexThread, message: AgentInputUserMessage): Promise<CodexInputSubmissionResult> {
    if (isRuntimeRawEventDebugEnabled) {
      console.log("[CodexSendTurnStart]", {
        runId: thread.runId,
        threadId: thread.threadId,
        activeTurnId: thread.activeTurnId,
        startupStatus: thread.startup.status,
        contentPreview: message.content.slice(0, 160),
      });
    }

    await thread.awaitStartupReady();
    thread.assertProviderInputAllowed();
    if (thread.activeTurnId) {
      throw new CodexInputSubmissionError(
        "CODEX_TURN_START_IDENTITY_CONFLICT",
        `Codex turn/start cannot run while exact turn '${thread.activeTurnId}' is active.`,
      );
    }
    let payload: unknown;
    try { payload = await thread.client.request<unknown>("turn/start", {
      threadId: thread.threadId,
      input: toCodexUserInput(message),
      cwd: thread.workingDirectory,
      model: thread.model,
      effort: thread.reasoningEffort,
      serviceTier: thread.serviceTier,
      summary: "auto",
      personality: null,
      outputSchema: null,
      collaborationMode: null,
    });

    } catch (error) {
      if (!(error instanceof CodexAppServerRpcError)) thread.noteUnknownInputOutcome();
      throw error;
    }
    const turnId = resolveStartedTurnId(payload);
    if (thread.activeTurnId === null && thread.lastTerminalTurnId !== turnId) {
      thread.markTurnStarted(turnId);
    } else if (thread.activeTurnId !== null && thread.activeTurnId !== turnId) {
      throw new CodexInputSubmissionError(
        "CODEX_TURN_START_IDENTITY_CONFLICT",
        `Codex turn/start returned '${turnId}' while newer active turn '${thread.activeTurnId}' is current.`,
      );
    }
    if (isRuntimeRawEventDebugEnabled) {
      console.log("[CodexSendTurnResponse]", {
        runId: thread.runId,
        threadId: thread.threadId,
        turnId,
        payloadType: typeof payload,
        payloadKeys:
          payload && typeof payload === "object" && !Array.isArray(payload)
            ? Object.keys(payload)
            : [],
      });
    }
    return { kind: "started", turnId };
  }

export async function submitCodexAppendInput(thread: CodexThread, message: AgentInputUserMessage, expectedTurnId: string): Promise<CodexInputSubmissionResult> {
    await thread.awaitStartupReady();
    thread.assertProviderInputAllowed();
    if (thread.activeTurnId !== expectedTurnId) {
      throw new CodexInputSubmissionError(
        "CODEX_TURN_STEER_TURN_NOT_ACTIVE",
        `Codex turn/steer expected active turn '${expectedTurnId}' but '${thread.activeTurnId ?? "none"}' is current.`,
      );
    }
    let payload: unknown;
    try {
      payload = await thread.client.request<unknown>("turn/steer", {
        threadId: thread.threadId,
        expectedTurnId,
        input: toCodexUserInput(message),
      });
    } catch (error) {
      if (!(error instanceof CodexAppServerRpcError)) thread.noteUnknownInputOutcome();
      const detail = error instanceof Error ? error.message : String(error);
      throw new CodexInputSubmissionError(
        "CODEX_TURN_STEER_REJECTED",
        `Codex turn/steer rejected input for turn '${expectedTurnId}': ${detail}`,
        { cause: error },
      );
    }

    const turnId = resolveSteeredTurnId(payload);
    if (turnId !== expectedTurnId) {
      throw new CodexInputSubmissionError(
        "CODEX_TURN_STEER_ID_MISMATCH",
        `Codex turn/steer returned '${turnId}' for expected turn '${expectedTurnId}'.`,
      );
    }
    return { kind: "steered", turnId: expectedTurnId };
  }

