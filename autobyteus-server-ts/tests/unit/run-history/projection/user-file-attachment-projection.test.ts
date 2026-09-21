import { describe, expect, it } from "vitest";
import { ContextFileType } from "autobyteus-ts/agent/message/context-file-type.js";
import { toMemoryTraceEvent } from "../../../../src/agent-memory/services/raw-trace-record-normalizer.js";
import { buildHistoricalReplayEvents } from "../../../../src/run-history/projection/transformers/raw-trace-to-historical-replay-events.js";
import { buildRunProjectionConversation } from "../../../../src/run-history/projection/transformers/historical-replay-events-to-conversation.js";
import { buildEventMonitorActiveTracePageEvents } from "../../../../src/run-history/projection/event-monitor-active-trace-page-projection.js";
import { buildLegacyTraceFingerprint, resolveTraceReplayIdentity } from "../../../../src/run-history/projection/historical-replay-event-identity.js";
import { dedupeRunProjectionConversationEntries } from "../../../../src/run-history/projection/run-projection-dedupe.js";

const uri = "/rest/agent-org-runs/org/agent-runs/repeat/context-files/ctx_file__notes.txt";
const row = { id: "same-row", trace_type: "user", turn_id: "turn", seq: 1, ts: 20, content: "",
  source_event: "input", file_attachments: [{ uri, file_type: "text", file_name: "accepted.txt" }] };
const project = (raw: Record<string, unknown>) => {
  const events = buildHistoricalReplayEvents([toMemoryTraceEvent(raw)]);
  return { conversation: buildRunProjectionConversation(events as any), page: buildEventMonitorActiveTracePageEvents(events as any) };
};

describe("user file attachment raw/replay/read equivalence", () => {
  it("projects file-only empty-text rows to initial and paged surfaces without media or filename inference", () => {
    const { conversation, page } = project(row);
    expect(conversation).toEqual([{ kind: "message", role: "user", content: "", media: null, ts: 20,
      fileAttachments: [{ uri, fileType: ContextFileType.TEXT, fileName: "accepted.txt" }] }]);
    expect(page[0].visuals[0]).toMatchObject({ kind: "user", text: "", attachments: [{
      locator: uri, fileType: "text", fileName: "accepted.txt", attachmentId: expect.stringMatching(/:attachment:file:0$/),
    }] });
  });

  it.each([undefined, null, []])("preserves media-only/empty rows %j without invented file associations or changed legacy fingerprints", value => {
    const old = toMemoryTraceEvent({ ...row, file_attachments: undefined, id: null, media: { images: [uri] } });
    const optional = toMemoryTraceEvent({ ...row, file_attachments: value, id: null, media: { images: [uri] } });
    expect(buildLegacyTraceFingerprint(optional)).toBe(buildLegacyTraceFingerprint(old));
    expect(optional).not.toHaveProperty("fileAttachments");
    const { conversation, page } = project({ ...row, file_attachments: value, media: { images: [uri] } });
    expect(conversation[0]).not.toHaveProperty("fileAttachments");
    expect(page[0].visuals[0]).toMatchObject({ attachments: [{
      locator: uri, fileType: "image", fileName: null, attachmentId: expect.stringMatching(/:attachment:image:0$/),
    }] });
  });

  it("includes exact file URI/type/name in conditional no-ID identity and equality while retaining raw IDs", () => {
    const base = toMemoryTraceEvent(row);
    for (const change of [{ uri: uri.replace("repeat", "configured") }, { file_type: "pdf" }, { file_name: "different" }]) {
      const raw = { ...row, file_attachments: [{ ...row.file_attachments[0], ...change }] };
      const other = toMemoryTraceEvent(raw);
      expect(buildLegacyTraceFingerprint(other)).not.toBe(buildLegacyTraceFingerprint(base));
      expect(resolveTraceReplayIdentity(other, () => 0)).toEqual(resolveTraceReplayIdentity(base, () => 0));
      const entries = [...project(row).conversation, ...project(raw).conversation];
      expect(dedupeRunProjectionConversationEntries(entries)).toHaveLength(2);
    }
    expect(dedupeRunProjectionConversationEntries([...project(row).conversation, ...project(row).conversation])).toHaveLength(1);
    const optional = project({ ...row, file_attachments: undefined }).conversation[0];
    const withIdentity = { ...project(row).conversation[0], messageId: "explicit" };
    expect(dedupeRunProjectionConversationEntries([withIdentity, { ...optional, messageId: "explicit" }])[0].fileAttachments).toEqual(base.fileAttachments);
  });

  it.each(["assistant", "reasoning", "tool_result", "system_instruction"])("diagnoses invalid %s raw facts through the normal reader", traceType => {
    expect(() => toMemoryTraceEvent({ ...row, trace_type: traceType })).toThrow("Only user");
  });

  it.each([{}, [{ uri, file_type: "image", file_name: null }], [{ uri, file_type: "text", file_name: 1 }]])(
    "diagnoses malformed present facts %j", file_attachments => {
      expect(() => toMemoryTraceEvent({ ...row, file_attachments })).toThrow();
    });
});
