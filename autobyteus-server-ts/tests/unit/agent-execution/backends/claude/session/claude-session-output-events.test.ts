import { describe, expect, it } from "vitest";
import { resolveClaudeTurnTerminalError } from "../../../../../../src/agent-execution/backends/claude/session/claude-session-output-events.js";

const resolve = (payload: Record<string, unknown>) => resolveClaudeTurnTerminalError({
  type: "result", is_error: true, ...payload,
});

describe("Claude terminal error text", () => {
  it("uses the SDK errors list in source order, ignoring unusable entries and private response fields", () => {
    expect(resolve({
      errors: [" Rate limit reached. ", null, 42, { message: "private" }, "", "  ", "Try again later."],
      response: "PRIVATE_RESPONSE_MARKER",
    })).toEqual({ code: "CLAUDE_RUNTIME_RESULT_ERROR", message: "Rate limit reached.\nTry again later." });
  });

  it.each([
    [{ result: "result", message: "message", error_message: "error_message", error: "error" }, "result"],
    [{ result: " ", message: "message", error_message: "error_message", error: "error" }, "message"],
    [{ message: 42, error_message: "error_message", error: "error" }, "error_message"],
    [{ error_message: {}, error: "error" }, "error"],
  ])("preserves scalar precedence (%j)", (payload, message) => {
    expect(resolve({ ...payload, errors: ["list cause"] })?.message).toBe(message);
  });

  it.each([undefined, null, [], [null, 42, {}, "", "  "], "not a list"].map((errors) => [errors]))(
    "falls back without stringifying unusable errors %j", (errors) => {
      expect(resolve({ errors })).toEqual({
        code: "CLAUDE_RUNTIME_RESULT_ERROR", message: "Claude runtime returned an error result.",
      });
    },
  );

  it.each([
    { errors: ["Workspace service unavailable. token=PRIVATE_TOKEN", "Authorization: Bearer PRIVATE_AUTH"] },
    { result: "Workspace service unavailable. token=PRIVATE_TOKEN\nAuthorization: Bearer PRIVATE_AUTH" },
  ])("reuses credential redaction for the selected terminal message %j", (payload) => {
    expect(resolve(payload)?.message).toBe("Workspace service unavailable. token=<redacted>\nAuthorization: Bearer <redacted>");
  });

  it("keeps authentication recognition with SDK errors[]", () => {
    expect(resolve({ errors: ["Not logged in · Please run /login"] })).toEqual({
      code: "CLAUDE_RUNTIME_AUTHENTICATION_FAILED", message: "Not logged in · Please run /login",
    });
  });

  it("does not classify unrelated events or a successful result as errors just for an errors field", () => {
    expect(resolveClaudeTurnTerminalError({ type: "assistant", is_error: true, errors: ["unavailable"] })).toBeNull();
    expect(resolveClaudeTurnTerminalError({ type: "result", is_error: false, errors: ["unavailable"] })).toBeNull();
  });

  it("does not truncate ordinary messages", () => {
    const message = `Unfamiliar cause. ${"Provider explanation. ".repeat(160)}`;
    expect(resolve({ errors: [message] })?.message).toBe(message.trim());
  });
});
