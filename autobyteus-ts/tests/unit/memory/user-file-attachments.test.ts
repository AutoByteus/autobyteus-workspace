import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { ContextFile } from '../../../src/agent/message/context-file.js';
import { ContextFileType } from '../../../src/agent/message/context-file-type.js';
import { captureContextFileReference, contextFileReferenceFromDict } from '../../../src/agent/message/context-file-reference.js';
import { AgentInputUserMessage } from '../../../src/agent/message/agent-input-user-message.js';
import { UserMessageReceivedEvent } from '../../../src/agent/events/agent-events.js';
import { SenderType } from '../../../src/agent/sender-type.js';
import { MemoryIngestInputProcessor } from '../../../src/agent/input-processor/memory-ingest-input-processor.js';
import { RawTraceItem } from '../../../src/memory/models/raw-trace-item.js';
import { partitionRawTraceAttachments } from '../../../src/memory/models/raw-trace-attachments.js';
import { MemoryManager } from '../../../src/memory/memory-manager.js';
import { RunMemoryFileStore } from '../../../src/memory/store/run-memory-file-store.js';
import { buildLLMUserMessage } from '../../../src/agent/message/multimodal-message-builder.js';

const base = { id: 'user-1', turnId: 't1', seq: 1, ts: 10, traceType: 'user', content: 'ask', sourceEvent: 'test' };
const uri = '/rest/agent-org-runs/org/agent-runs/task-2/context-files/ctx_1__report.txt';
const file = () => new ContextFile(uri, ContextFileType.TEXT, 'Accepted label.txt');
const dirs: string[] = [];
const makeStore = () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'raw-file-facts-')); dirs.push(dir);
  return new RunMemoryFileStore(dir);
};
afterEach(() => { dirs.splice(0).forEach(dir => fs.rmSync(dir, { recursive: true, force: true })); });

describe('user raw file attachment facts', () => {
  it('captures immutable exact references without inference, partitions all types once and roundtrips one row', () => {
    const accepted = file();
    const ref = captureContextFileReference(accepted);
    accepted.uri = '/provider/path'; accepted.fileName = 'mutated'; accepted.fileType = ContextFileType.PDF;
    expect(ref).toEqual({ uri, fileType: ContextFileType.TEXT, fileName: 'Accepted label.txt' });
    expect(Object.isFrozen(ref)).toBe(true);
    const types = Object.values(ContextFileType).filter((t): t is ContextFileType => typeof t === 'string');
    const refs = types.map(fileType => ({ uri, fileType, fileName: null }));
    const split = partitionRawTraceAttachments(refs);
    expect(split.media).toEqual({ images: [uri], audio: [uri], video: [uri] });
    expect(split.fileAttachments.map(f => f.fileType)).toEqual(types.filter(t => !['image','audio','video'].includes(t)));
    expect(split.fileAttachments.find(f => f.fileType === 'unknown')).toEqual({ uri, fileType: 'unknown', fileName: null });
    const row = new RawTraceItem({ ...base, ...split }).toDict();
    expect(row.file_attachments).toEqual(split.fileAttachments.map(f => ({ uri, file_type: f.fileType, file_name: null })));
    expect(RawTraceItem.fromDict(row).toDict()).toEqual(row);
  });

  it.each([undefined, null, []])('reads optional absence %j without adding attachment facts', value => {
    const row = { ...new RawTraceItem(base).toDict(), file_attachments: value };
    expect(RawTraceItem.fromDict(row).fileAttachments).toEqual([]);
    expect(RawTraceItem.fromDict(row).toDict()).not.toHaveProperty('file_attachments');
  });

  it.each([
    {}, 'bad', [{ uri: '', file_type: 'text', file_name: null }],
    [{ uri, file_type: 'retired', file_name: null }],
    [{ uri, file_type: 'text', file_name: 12 }],
    [{ uri, file_type: 'text' }],
    [{ uri, file_type: 'image', file_name: null }],
  ])('rejects malformed present facts %j rather than silently hiding them', value => {
    expect(() => RawTraceItem.fromDict({ ...new RawTraceItem(base).toDict(), file_attachments: value })).toThrow();
  });

  it('rejects non-user facts and preserves whitespace/nullable name/unknown type byte-for-byte', () => {
    const ref = contextFileReferenceFromDict({ uri: '  opaque.txt  ', file_type: 'unknown', file_name: null });
    expect(ref).toEqual({ uri: '  opaque.txt  ', fileType: 'unknown', fileName: null });
    expect(() => new RawTraceItem({ ...base, traceType: 'assistant', fileAttachments: [ref] })).toThrow('Only user');
    expect(() => RawTraceItem.fromDict({ ...new RawTraceItem(base).toDict(), trace_type: 'tool_result',
      file_attachments: [{ uri, file_type: 'text', file_name: null }] })).toThrow('Only user');
  });

  it('clones the internal snapshot without provider-payload leakage', () => {
    const ref = captureContextFileReference(file());
    const message = new AgentInputUserMessage('ask', undefined, [new ContextFile('/provider/path', ContextFileType.TEXT)], {}, [ref]);
    const clone = AgentInputUserMessage.fromDict(message.toDict());
    expect(clone.recordingFileAttachments).toEqual([ref]);
    expect(clone.recordingFileAttachments).not.toBe(message.recordingFileAttachments);
    expect(Object.isFrozen(clone.recordingFileAttachments)).toBe(true);
    expect(Object.isFrozen(clone.recordingFileAttachments![0])).toBe(true);
    expect(JSON.stringify(buildLLMUserMessage(clone))).not.toContain(uri);
    expect(JSON.stringify(buildLLMUserMessage(clone))).not.toContain('recording');
    expect(AgentInputUserMessage.fromDict({ content: 'none' }).recordingFileAttachments).toBeNull();
  });

  it.each([false, true])('native ingestion uses original event refs (adapted=%s), preserving processed text/media and TOOL exclusion', async adapted => {
    const store = makeStore();
    const manager = new MemoryManager({ store }); const turnId = manager.startTurn();
    const original = new AgentInputUserMessage('original', undefined, [file()], {},
      adapted ? [captureContextFileReference(file())] : null);
    if (adapted) original.contextFiles![0].uri = '/provider/path';
    const processed = AgentInputUserMessage.fromDict(original.toDict());
    processed.content = 'processed';
    processed.contextFiles = [new ContextFile('/provider/image.png', ContextFileType.IMAGE)];
    const context = { state: { memoryManager: manager, activeTurn: { turnId } }, agentId: 'agent' } as any;
    await new MemoryIngestInputProcessor().process(processed, context, new UserMessageReceivedEvent(original));
    let rows = store.listTurnRawTracesOrdered();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ traceType: 'user', content: buildLLMUserMessage(processed).content, turnId,
      fileAttachments: [{ uri, fileType: 'text', fileName: 'Accepted label.txt' }],
      media: { images: ['/provider/image.png'], audio: [], video: [] },
    });
    const tool = new AgentInputUserMessage('tool continuation', SenderType.TOOL, [file()]);
    await new MemoryIngestInputProcessor().process(tool, context, new UserMessageReceivedEvent(tool));
    expect(store.listTurnRawTracesOrdered()).toHaveLength(1);
    expect(manager.getWorkingContextMessages()).toEqual([]);
  });

  it('retains exact facts through actual raw-store rotation, cold archive read and retry', () => {
    const store = makeStore();
    store.appendRawTrace(new RawTraceItem({ ...base, fileAttachments: [captureContextFileReference(file())] }));
    store.appendRawTrace(new RawTraceItem({ ...base, id: 'boundary', seq: 2, traceType: 'provider_compaction_boundary' }));
    const before = store.listTurnRawTracesOrdered()[0].toDict();
    store.rotateActiveRawTracesBeforeBoundary({ boundaryTraceId: 'boundary', boundaryKey: 'b', boundaryType: 'provider_compaction_boundary' });
    const segment = store.listCompleteRawTraceArchiveSegments()[0];
    const cold = new RunMemoryFileStore(path.dirname(store.getRawTracesPath()));
    expect(cold.listArchiveTurnRawTracesOrdered().map(r => r.toDict())).toEqual([before]);
    expect(cold.listTurnRawTracesOrdered().map(r => r.id)).toEqual(['boundary']);
    const archiveFile = cold.getCompleteRawTraceArchiveSegmentPathByFileName(segment.file_name)!;
    const bytes = fs.readFileSync(archiveFile);
    cold.rotateActiveRawTracesBeforeBoundary({ boundaryTraceId: 'boundary', boundaryKey: 'b', boundaryType: 'provider_compaction_boundary' });
    expect(fs.readFileSync(archiveFile)).toEqual(bytes);
    expect(cold.listCompleteRawTraceArchiveSegments()).toEqual([segment]);
  });
});
