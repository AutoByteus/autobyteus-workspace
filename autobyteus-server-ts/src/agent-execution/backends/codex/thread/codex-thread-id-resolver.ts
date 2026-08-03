import { asObject, asString, type JsonObject } from "../codex-app-server-json.js";
import { CodexInputSubmissionError } from "./codex-input-submission-error.js";

export const resolveThreadId = (payload: unknown): string | null => {
  const response = asObject(payload);
  const thread = asObject(response?.thread);
  return asString(thread?.id);
};

export const resolveStartedTurnId = (payload: unknown): string => {
  const response = asObject(payload);
  const turn = asObject(response?.turn);
  const turnId = asString(turn?.id);
  if (!turnId) {
    throw new CodexInputSubmissionError(
      "CODEX_TURN_START_RESPONSE_INVALID",
      "Codex turn/start response did not include a nonempty turn.id.",
    );
  }
  return turnId;
};

export const resolveSteeredTurnId = (payload: unknown): string => {
  const response = asObject(payload);
  const turnId = asString(response?.turnId);
  if (!turnId) {
    throw new CodexInputSubmissionError(
      "CODEX_TURN_STEER_RESPONSE_INVALID",
      "Codex turn/steer response did not include a nonempty turnId.",
    );
  }
  return turnId;
};

export const resolveThreadIdFromNotification = (params: JsonObject): string | null =>
  asString(params.threadId) ?? asString(params.thread_id);

export const resolveThreadIdFromAppServerMessage = (params: JsonObject): string | null => {
  const thread = asObject(params.thread);
  const turn = asObject(params.turn);
  const turnThread = asObject(turn?.thread);
  const item = asObject(params.item);
  const itemThread = asObject(item?.thread);
  const command = asObject(params.command);
  const commandExecution = asObject(params.commandExecution);
  const payloadCommand = asObject(item?.command);

  return (
    asString(params.threadId) ??
    asString(params.thread_id) ??
    asString(thread?.id) ??
    asString(thread?.threadId) ??
    asString(thread?.thread_id) ??
    asString(turn?.threadId) ??
    asString(turn?.thread_id) ??
    asString(turnThread?.id) ??
    asString(item?.threadId) ??
    asString(item?.thread_id) ??
    asString(itemThread?.id) ??
    asString(command?.threadId) ??
    asString(command?.thread_id) ??
    asString(commandExecution?.threadId) ??
    asString(commandExecution?.thread_id) ??
    asString(payloadCommand?.threadId) ??
    asString(payloadCommand?.thread_id) ??
    resolveThreadIdFromNotification(params)
  );
};

export const resolveTurnIdFromAppServerMessage = (params: JsonObject): string | null => {
  const turn = asObject(params.turn);
  const item = asObject(params.item);
  return (
    asString(params.turnId) ??
    asString(params.turn_id) ??
    asString(turn?.id) ??
    asString(turn?.turnId) ??
    asString(turn?.turn_id) ??
    asString(item?.turnId) ??
    asString(item?.turn_id)
  );
};
