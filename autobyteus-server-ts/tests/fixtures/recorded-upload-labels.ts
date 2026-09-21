import { ContextFile } from 'autobyteus-ts/agent/message/context-file.js';
import { ContextFileType } from 'autobyteus-ts/agent/message/context-file-type.js';
import { RawTraceItem } from 'autobyteus-ts/memory/models/raw-trace-item.js';
import { partitionRawTraceAttachments } from 'autobyteus-ts/memory/models/raw-trace-attachments.js';
import { normalizeRawTraceRecords } from '../../src/agent-memory/services/raw-trace-record-normalizer.js';
import { buildHistoricalReplayEvents } from '../../src/run-history/projection/transformers/raw-trace-to-historical-replay-events.js';
import { buildRunProjectionConversation } from '../../src/run-history/projection/transformers/historical-replay-events-to-conversation.js';
import { buildEventMonitorActiveTracePageEvents } from '../../src/run-history/projection/event-monitor-active-trace-page-projection.js';

const base = '/rest/agent-org-runs/root/agent-runs/task-repeat/context-files/';
export const recordedUploadLabelCases = [
  { uri: base + 'ctx_token__notes.txt', label: 'notes.txt' },
  { uri: '/rest/runs/agent/context-files/ctx_token__notes.txt', label: 'notes.txt' },
  { uri: '/rest/team-runs/team/members/lead/context-files/ctx_token__notes.txt', label: 'notes.txt' },
  { uri: base + 'ctx_token__notes.txt', name: 'Custom report', label: 'Custom report' },
  { uri: base + 'ctx_token__notes.txt', name: 'ctx_custom__literal.txt', label: 'ctx_custom__literal.txt' },
  { uri: base + 'ctx_token__ctx_original__literal.txt', label: 'ctx_original__literal.txt' },
  { uri: 'https://example.test/ctx_token__notes.txt', label: 'ctx_token__notes.txt' },
  { uri: '/workspace/ctx_token__notes.txt', label: 'ctx_token__notes.txt' },
  { uri: base + 'ctx_token__payload.bin', type: ContextFileType.UNKNOWN, label: 'payload.bin' },
  { uri: base + 'ctx_token__image.png', type: ContextFileType.IMAGE, label: 'image.png' },
];

/** Server-owned codec/projection fixture; consumers receive ordinary read DTOs, not core objects.
 * No filesystem, provider dispatch, or accepted task lifecycle is claimed by this fixture. */
export const createRecordedUploadLabelFixture = (
  input: typeof recordedUploadLabelCases[number], cold: boolean,
) => {
  const file = new ContextFile(input.uri, input.type ?? ContextFileType.TEXT, input.name ?? null);
  const raw = new RawTraceItem({ id: 'recorded-user', ts: 10, turnId: 'turn', seq: 1,
    traceType: 'user', content: 'inspect file', sourceEvent: 'label-test-fixture',
    ...partitionRawTraceAttachments([file]),
  }).toDict();
  const bytes = JSON.stringify(raw);
  const savedRow = cold ? JSON.parse(bytes) : raw;
  const replay = buildHistoricalReplayEvents(normalizeRawTraceRecords([savedRow]));
  const page = buildEventMonitorActiveTracePageEvents(replay).map(event => ({ ...event,
    visuals: event.visuals.map(visual => ({ ...visual, __typename: 'EventMonitorUserVisual' as const })),
  }));
  return { raw, bytes, savedRow, recordedFileName: file.fileName, eventId: replay[0]!.eventId,
    conversation: buildRunProjectionConversation(replay), page };
};
