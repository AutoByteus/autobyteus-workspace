import { describe, expect, it, vi } from "vitest";
import { RuntimeHandoverNoticeService } from "../../../src/runtime-handover-notices/services/runtime-handover-notice-service.js";
import { AgentRunPlatformNotices } from "../../../src/agent-execution/domain/agent-run-platform-notices.js";
import type { RuntimeSwitch } from "../../../src/agent-execution/domain/runtime-switch.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import type { AgentRun } from "../../../src/agent-execution/domain/agent-run.js";

const theSwitch: RuntimeSwitch = {
  key: "runtime_switch:run-1:2026-10-30T10:00:00.000Z", runId: "run-1",
  from: { runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, llmModelIdentifier: "sonnet" },
  to: { runtimeKind: RuntimeKind.CODEX_APP_SERVER, llmModelIdentifier: "gpt-5" },
  markerText: "Agent runtime changed from Claude Agent SDK (sonnet) to Codex App Server (gpt-5).",
};
const run = (runId = "run-1") => ({ runId, runtimeKind: RuntimeKind.CODEX_APP_SERVER, config: { memoryDir: "/mem/agents/run-1" } }) as unknown as AgentRun;
const FILES = [{ journalFile: "work_journal_active.md", state: "open" as const, sizeBytes: 100, lineCount: 3, days: [{ day: "2026-10-30", line: 4 }] }];

const service = (overrides: { ensureCurrent?: ReturnType<typeof vi.fn>; listJournalFiles?: ReturnType<typeof vi.fn> } = {}) => {
  const journals = {
    ensureCurrent: overrides.ensureCurrent ?? vi.fn(async () => ({})),
    listJournalFiles: overrides.listJournalFiles ?? vi.fn(async () => FILES),
  };
  return { notices: new RuntimeHandoverNoticeService({ journals: journals as never }), journals };
};
const ctx = { dispatchKind: "start_turn" as const };

describe("RuntimeHandoverNoticeService (REQ-002, REQ-003)", () => {
  it("has nothing for a run no switch was registered for", async () => {
    expect(await service().notices.takePreface(run(), ctx)).toBeNull();
  });

  it("makes the journal current from the raw traces before it builds the text, and shows the user the marker sentence", async () => {
    const { notices, journals } = service();
    notices.register(theSwitch);
    const preface = await notices.takePreface(run(), ctx);
    expect(journals.ensureCurrent).toHaveBeenCalledWith({ runId: "run-1", memoryDir: "/mem/agents/run-1", runtimeKind: RuntimeKind.CODEX_APP_SERVER });
    expect(journals.ensureCurrent.mock.invocationCallOrder[0]).toBeLessThan(journals.listJournalFiles.mock.invocationCallOrder[0]!);
    expect(preface?.text).toContain("[System: runtime hand-over]");
    expect(preface?.text).toContain("/mem/agents/run-1/work_journal/");
    expect(preface?.presentation).toEqual({ senderId: "system.runtime_handover", content: theSwitch.markerText });
  });

  it("is sent once per switch: delivery settles it, a second input has none", async () => {
    const { notices } = service();
    notices.register(theSwitch);
    const preface = (await notices.takePreface(run(), ctx))!;
    expect(await notices.takePreface(run(), ctx)).toBeNull();
    notices.prefaceDelivered(run(), preface, "turn-1");
    expect(await notices.takePreface(run(), ctx)).toBeNull();
  });

  it("a notice that was not forwarded is pending again; a released run keeps its hand-over (the restored run of the same ID has not had it)", async () => {
    const { notices } = service();
    notices.register(theSwitch);
    const first = (await notices.takePreface(run(), ctx))!;
    notices.prefaceReturned(run(), first);
    notices.runReleased(run());
    const again = await notices.takePreface(run(), ctx);
    expect(again).not.toBeNull();
    expect(again?.id).not.toBe(first.id);
  });

  it("a journal that cannot be made current leaves the input without the notice and the notice pending", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const ensureCurrent = vi.fn().mockRejectedValueOnce(new Error("disk")).mockResolvedValue({});
    const { notices } = service({ ensureCurrent });
    notices.register(theSwitch);
    expect(await notices.takePreface(run(), ctx)).toBeNull();
    expect(await notices.takePreface(run(), ctx)).not.toBeNull();
    warn.mockRestore();
  });

  it("a second switch registered before the first was delivered replaces it", async () => {
    const { notices } = service();
    notices.register(theSwitch);
    notices.register({ ...theSwitch, key: "runtime_switch:run-1:later", markerText: "Agent runtime changed again." });
    expect((await notices.takePreface(run(), ctx))?.presentation.content).toBe("Agent runtime changed again.");
  });
});

describe("the notice slot order (a pending tool list notice must not delay the hand-over)", () => {
  it("hands over the hand-over first and the tool list notice with the next input", async () => {
    const { notices } = service();
    notices.register(theSwitch);
    const toolList = {
      id: "tool-1", text: "tools", presentation: { senderId: "system.tool_list_update_notifier", content: "tools" },
    };
    const toolListSource = {
      takePreface: vi.fn(async () => toolList), prefaceDelivered: vi.fn(), prefaceReturned: vi.fn(),
      runPublished: vi.fn(), runReleased: vi.fn(),
    };
    const slot = new AgentRunPlatformNotices([notices, toolListSource]);
    const first = (await slot.takePreface(run(), ctx))!;
    expect(first.presentation.senderId).toBe("system.runtime_handover");
    slot.prefaceDelivered(run(), first, "turn-1");
    expect(toolListSource.takePreface).not.toHaveBeenCalled();
    expect((await slot.takePreface(run(), ctx))?.id).toBe("tool-1");
  });
});
