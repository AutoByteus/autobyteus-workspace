import { RequestError } from "@agentclientprotocol/sdk";
import { describe, expect, it } from "vitest";
import { grokBuildSessionProfile } from "../../../../../src/agent-execution/backends/grok/grok-build-session-profile.js";
import { deepSeekHarnessSessionProfile } from "../../../../../src/agent-execution/backends/deepseek-harness/deepseek-harness-session-profile.js";

/**
 * Each ACP agent's own answer that a restored session does not exist (autobyteus-599, REQ-002, AC-002, AC-003), on the probed
 * JSON-RPC shapes (`probes/README.md`): Grok CLI 1.0.92 (PRB-005) and DeepSeek Harness 0.2.2-rc.5 (PRB-008). Anything else is
 * not a lost session.
 */
const SESSION = "3f2c9e7a-1111-4222-8333-444455556666";

describe("Grok Build: a lost session", () => {
  // N-1 (PRB-009): a present session whose workspace folder was removed resumes normally, so Grok gives FS_NOT_FOUND only for
  // a session it does not have; the code alone is the exact signal.
  it("is the FS_NOT_FOUND answer (PRB-005), whatever the session ID", () => {
    expect(grokBuildSessionProfile.isMissingSession(new RequestError(-32603, "Path not found.",
      { detail: "No such file or directory (os error 2)", code: "FS_NOT_FOUND" }), SESSION)).toBe(true);
  });

  it.each([
    ["the same message without the code", new RequestError(-32603, "Path not found.")],
    ["another data code", new RequestError(-32603, "Permission denied.", { code: "FS_PERMISSION_DENIED" })],
    ["an auth error", new RequestError(-32000, "Authentication required")],
    ["a network error", new Error("connect ECONNREFUSED")],
    ["a plain object with the code", { data: { code: "FS_NOT_FOUND" } }],
  ])("is not %s", (_label, error) => {
    expect(grokBuildSessionProfile.isMissingSession(error, SESSION)).toBe(false);
  });
});

describe("DeepSeek Harness: a lost session", () => {
  it("is the -32602 not-resumable answer for exactly this session (PRB-008)", () => {
    expect(deepSeekHarnessSessionProfile.isMissingSession(
      new RequestError(-32602, `Invalid params: session is not resumable: ${SESSION}`), SESSION)).toBe(true);
  });

  it.each([
    ["the answer for another session", new RequestError(-32602, "Invalid params: session is not resumable: other-session")],
    ["another invalid-params message", new RequestError(-32602, "Invalid params: cwd must be absolute")],
    ["the same message with another code", new RequestError(-32603, `Invalid params: session is not resumable: ${SESSION}`)],
    ["an auth error", new RequestError(-32000, "Authentication required")],
    ["a network error", new Error("connect ECONNREFUSED")],
  ])("is not %s", (_label, error) => {
    expect(deepSeekHarnessSessionProfile.isMissingSession(error, SESSION)).toBe(false);
  });
});
