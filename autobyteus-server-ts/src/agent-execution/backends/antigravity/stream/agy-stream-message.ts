export type AgyStreamMessage =
  | { event: "init"; conversation_id: string; init: Record<string, unknown> }
  | { event: "step_update"; step_update: Record<string, unknown> }
  | { event: "result"; result: Record<string, unknown> };

const record = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
export const agyString = (value: unknown): string | null => typeof value === "string" && value.trim() ? value : null;
export const agyRecord = record;

export const parseAgyStreamMessage = (line: string): AgyStreamMessage | null => {
  const root = record(JSON.parse(line));
  if (!root) throw new Error("AGY_STREAM_INVALID: expected an object.");
  if (root.event === "init") {
    const init = record(root.init);
    const conversationId = agyString(root.conversation_id);
    if (!init || !conversationId) throw new Error("AGY_STREAM_INVALID: init lacks conversation identity.");
    return { event: "init", conversation_id: conversationId, init };
  }
  if (root.event === "step_update") {
    const update = record(root.step_update);
    if (!update) throw new Error("AGY_STREAM_INVALID: invalid step update.");
    return { event: "step_update", step_update: update };
  }
  if (root.event === "result") {
    const result = record(root.result);
    if (!result) throw new Error("AGY_STREAM_INVALID: invalid result.");
    return { event: "result", result };
  }
  return null;
};
