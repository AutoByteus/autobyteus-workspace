import { describe, expect, it } from "vitest";
import { ClaudeProcessDiagnostics } from "../../../../../../src/agent-execution/backends/claude/session/claude-process-diagnostics.js";

describe("ClaudeProcessDiagnostics", () => {
  it("redacts Bearer tokens split across stderr chunks", () => {
    const diagnostics = new ClaudeProcessDiagnostics();

    diagnostics.append("Claude stderr: Authorization: Bearer ");
    diagnostics.append("abc.def_SECRET-token\nstartup failed");

    const summary = diagnostics.summarize() ?? "";
    expect(summary).toContain("Bearer [redacted]");
    expect(summary).not.toContain("abc.def_SECRET-token");
  });

  it("redacts Anthropic env tokens split across stderr chunks", () => {
    const diagnostics = new ClaudeProcessDiagnostics();

    diagnostics.append("ANTHROPIC_API");
    diagnostics.append("_KEY=sk-ant-super");
    diagnostics.append("-secret-value\nClaude Code process exited with code 1");

    const summary = diagnostics.summarize() ?? "";
    expect(summary).toContain("ANTHROPIC_API_KEY=[redacted]");
    expect(summary).not.toContain("sk-ant-super-secret-value");
  });
});
