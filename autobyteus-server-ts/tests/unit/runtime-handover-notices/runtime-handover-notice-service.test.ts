import { describe, expect, it, vi } from "vitest";
import { RuntimeHandoverNoticeService } from "../../../src/runtime-handover-notices/services/runtime-handover-notice-service.js";
import { AgentRunPlatformNotices } from "../../../src/agent-execution/domain/agent-run-platform-notices.js";
import type { PendingRuntimeHandover } from "../../../src/agent-memory/services/runtime-handover-reader.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import type { AgentRun } from "../../../src/agent-execution/domain/agent-run.js";

const MARKER: PendingRuntimeHandover = {
  markerTraceId: "rt_runtime_switch_0123456789abcdef01234567",
  markerText: "Agent runtime changed from Claude Agent SDK (sonnet) to Codex App Server (gpt-5).",
};
const run = (runId = "run-1") => ({ runId, runtimeKind: RuntimeKind.CODEX_APP_SERVER, config: { memoryDir: "/mem/agents/run-1" } }) as unknown as AgentRun;
const FILES = [{ journalFile: "work_journal_active.md", state: "open" as const, sizeBytes: 100, lineCount: 3, days: [{ day: "2026-10-30", line: 4 }] }];

const service = (overrides: {
  ensureCurrent?: ReturnType<typeof vi.fn>;
  listJournalFiles?: ReturnType<typeof vi.fn>;
  readPending?: ReturnType<typeof vi.fn>;
} = {}) => {
  const journals = {
    ensureCurrent: overrides.ensureCurrent ?? vi.fn(async () => ({})),
    listJournalFiles: overrides.listJournalFiles ?? vi.fn(async () => FILES),
  };
  const readPending = overrides.readPending ?? vi.fn(() => MARKER);
  return { notices: new RuntimeHandoverNoticeService({ journals: journals as never, readPending }), journals, readPending };
};
const ctx = { dispatchKind: "start_turn" as const };

describe("RuntimeHandoverNoticeService (REQ-002, REQ-003)", () => {
  it("has nothing for a run whose raw traces hold no pending hand-over, and asks only once per publication", async () => {
    const { notices, readPending } = service({ readPending: vi.fn(() => null) });
    expect(await notices.takePreface(run(), ctx)).toBeNull();
    expect(await notices.takePreface(run(), ctx)).toBeNull();
    expect(readPending).toHaveBeenCalledOnce();
    expect(readPending).toHaveBeenCalledWith("/mem/agents/run-1");
  });

  it("makes the journal current from the raw traces before it builds the text, and shows the user the marker sentence", async () => {
    const { notices, journals } = service();
    const preface = await notices.takePreface(run(), ctx);
    expect(journals.ensureCurrent).toHaveBeenCalledWith({ runId: "run-1", memoryDir: "/mem/agents/run-1", runtimeKind: RuntimeKind.CODEX_APP_SERVER });
    expect(journals.ensureCurrent.mock.invocationCallOrder[0]).toBeLessThan(journals.listJournalFiles.mock.invocationCallOrder[0]!);
    expect(preface?.text).toContain("[System: runtime hand-over]");
    expect(preface?.text).toContain("/mem/agents/run-1/work_journal/");
    expect(preface?.presentation).toEqual({ senderId: "system.runtime_handover", content: MARKER.markerText });
  });

  it("is sent once per switch: while it is in flight there is no second one, and delivery settles it for good", async () => {
    const { notices, readPending } = service();
    const preface = (await notices.takePreface(run(), ctx))!;
    expect(await notices.takePreface(run(), ctx)).toBeNull();
    notices.prefaceDelivered(run(), preface, "turn-1");
    expect(await notices.takePreface(run(), ctx)).toBeNull();
    expect(readPending).toHaveBeenCalledOnce();
  });

  it("a delivery of another notice does not settle it", async () => {
    const { notices } = service();
    const preface = (await notices.takePreface(run(), ctx))!;
    notices.prefaceDelivered(run(), { ...preface, id: "other" }, "turn-1");
    notices.prefaceReturned(run(), preface);
    expect(await notices.takePreface(run(), ctx)).not.toBeNull();
  });

  it("a notice that was not forwarded is pending again for the next input", async () => {
    const { notices } = service();
    const first = (await notices.takePreface(run(), ctx))!;
    notices.prefaceReturned(run(), first);
    const again = await notices.takePreface(run(), ctx);
    expect(again).not.toBeNull();
    expect(again?.id).not.toBe(first.id);
  });

  it("a publication or a release forgets what was derived, so a restored run is asked again (a restart delivers it once more)", async () => {
    const readPending = vi.fn(() => MARKER);
    const { notices } = service({ readPending });
    const first = (await notices.takePreface(run(), ctx))!;
    notices.prefaceDelivered(run(), first, "turn-1");
    notices.runReleased(run());
    expect(await notices.takePreface(run(), ctx)).not.toBeNull();
    expect(readPending).toHaveBeenCalledTimes(2);
    notices.runPublished(run(), "platform_restore");
    expect(await notices.takePreface(run(), ctx)).not.toBeNull();
    expect(readPending).toHaveBeenCalledTimes(3);
  });

  it("a journal that cannot be made current leaves the input without the notice and the notice pending", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const ensureCurrent = vi.fn().mockRejectedValueOnce(new Error("disk")).mockResolvedValue({});
    const { notices } = service({ ensureCurrent });
    expect(await notices.takePreface(run(), ctx)).toBeNull();
    expect(await notices.takePreface(run(), ctx)).not.toBeNull();
    warn.mockRestore();
  });

  it("a raw-trace read that fails leaves this input without the notice and is read again for the next one", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const readPending = vi.fn().mockImplementationOnce(() => { throw new Error("unreadable"); }).mockReturnValue(MARKER);
    const { notices } = service({ readPending });
    expect(await notices.takePreface(run(), ctx)).toBeNull();
    expect(await notices.takePreface(run(), ctx)).not.toBeNull();
    warn.mockRestore();
  });

  it("a run without a memory folder has no notice", async () => {
    const { notices, readPending } = service();
    const bare = { runId: "run-9", runtimeKind: RuntimeKind.CODEX_APP_SERVER, config: { memoryDir: null } } as unknown as AgentRun;
    expect(await notices.takePreface(bare, ctx)).toBeNull();
    expect(readPending).not.toHaveBeenCalled();
  });
});

describe("the notice slot order (a pending tool list notice must not delay the hand-over)", () => {
  it("hands over the hand-over first and the tool list notice with the next input", async () => {
    const { notices } = service();
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
