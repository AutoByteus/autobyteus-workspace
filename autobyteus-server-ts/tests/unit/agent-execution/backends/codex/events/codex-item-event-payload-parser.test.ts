import { describe, expect, it } from "vitest";
import { CodexItemEventPayloadParser } from "../../../../../../src/agent-execution/backends/codex/events/codex-item-event-payload-parser.js";

describe("CodexItemEventPayloadParser invocation identity", () => {
  it("does not append approval metadata to public invocation ids", () => {
    const parser = new CodexItemEventPayloadParser();

    expect(parser.resolveInvocationId({ itemId: "item_1", approvalId: "approval-1" })).toBe("item_1");
    expect(parser.resolveInvocationId({ invocation_id: "call_1", approval_id: "approval-1" })).toBe("call_1");
    expect(parser.resolveInvocationId({ item: { id: "nested_item" }, approvalId: "approval-2" })).toBe("nested_item");
  });
});

describe("CodexItemEventPayloadParser command arguments", () => {
  it("projects cwd from a command execution item", () => {
    const parser = new CodexItemEventPayloadParser();

    expect(parser.resolveToolArguments({
      item: {
        type: "commandExecution",
        command: "/bin/bash -lc pwd",
        cwd: "/workspace/nested",
      },
    }, "run_bash")).toEqual({
      command: "/bin/bash -lc pwd",
      cwd: "/workspace/nested",
    });
  });

  it("projects top-level cwd from a command approval request", () => {
    const parser = new CodexItemEventPayloadParser();

    expect(parser.resolveToolArguments({
      command: "pnpm test",
      cwd: "/repo/package",
    }, "run_bash")).toEqual({
      command: "pnpm test",
      cwd: "/repo/package",
    });
  });

  it("keeps explicit canonical cwd authoritative", () => {
    const parser = new CodexItemEventPayloadParser();

    expect(parser.resolveToolArguments({
      arguments: {
        command: "pwd",
        cwd: "/canonical",
      },
      cwd: "/top-level",
      item: {
        command: "ignored command",
        cwd: "/nested",
      },
    }, "run_bash")).toEqual({
      command: "pwd",
      cwd: "/canonical",
    });
  });

  it("does not invent cwd when no supported source supplies it", () => {
    const parser = new CodexItemEventPayloadParser();

    expect(parser.resolveToolArguments({
      workdir: "/raw-top-level",
      item: {
        type: "commandExecution",
        command: "pwd",
        workdir: "/raw-nested",
      },
    }, "run_bash")).toEqual({ command: "pwd" });
  });
});
