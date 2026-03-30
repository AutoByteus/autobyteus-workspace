import { asObject, asString, type JsonObject } from "../codex-app-server-json.js";

export const resolveThreadId = (payload: unknown): string | null => {
  const response = asObject(payload);
  const thread = asObject(response?.thread);
  return asString(thread?.id);
};

export const resolveTurnId = (payload: unknown): string | null => {
  const response = asObject(payload);
  const turn = asObject(response?.turn);
  return asString(turn?.id);
};

export const resolveThreadIdFromNotification = (params: JsonObject): string | null =>
  asString(params.threadId);

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
    asString(thread?.id) ??
    asString(turn?.threadId) ??
    asString(turnThread?.id) ??
    asString(item?.threadId) ??
    asString(itemThread?.id) ??
    asString(command?.threadId) ??
    asString(commandExecution?.threadId) ??
    asString(payloadCommand?.threadId) ??
    resolveThreadIdFromNotification(params)
  );
};

export const resolveTurnIdFromAppServerMessage = (params: JsonObject): string | null => {
  const turn = asObject(params.turn);
  const item = asObject(params.item);
  return asString(params.turnId) ?? asString(turn?.id) ?? asString(item?.turnId);
};
