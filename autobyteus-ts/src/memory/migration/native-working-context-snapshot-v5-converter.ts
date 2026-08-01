import { isDeepStrictEqual } from 'node:util';
import {
  Message,
  MessageRole,
  ToolCallPayload,
  ToolResultPayload,
  type ToolCallSpec,
} from '../../llm/utils/messages.js';
import { WorkingContext } from '../working-context.js';
import {
  createNaturalUserMessageProvenance,
  WorkingContextFinalizer,
} from '../working-context-finalizer.js';
import { WorkingContextSnapshotSerializer } from '../working-context-snapshot-serializer.js';
import type {
  NativeSnapshotConversionInput,
  NativeSnapshotConversionResult,
  NativeSnapshotReferenceFact,
} from './native-working-context-snapshot-v5-conversion.js';
import { NativeSnapshotOmissionTracker } from './native-working-context-snapshot-v5-omissions.js';
export type {
  NativeSnapshotConversionInput,
  NativeSnapshotConversionOmissions,
  NativeSnapshotConversionResult,
  NativeSnapshotReferenceFact,
} from './native-working-context-snapshot-v5-conversion.js';

type JsonRecord = Record<string, unknown>;
type SourceReference = { rawTraceIds: string[]; turnId: string | null };

const SUPPORTED_SCHEMAS = new Set([1, 3, 4, 5]);
const ROOT_FIELDS = new Set(['schema_version', 'agent_id', 'messages', 'epoch_id', 'last_compaction_ts']);
const MESSAGE_FIELDS = new Set([
  'role', 'content', 'reasoning_content', 'image_urls', 'audio_urls', 'video_urls',
  'tool_payload', 'metadata',
]);
const PROVENANCE_KEY = 'autobyteus_memory_provenance';

const isRecord = (value: unknown): value is JsonRecord =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const normalizeOptionalString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value.trim() : null;

const stringArray = (value: unknown): string[] | null => {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) return null;
  return [...value] as string[];
};

const exactMedia = (message: Message, fact: NativeSnapshotReferenceFact): boolean => {
  const media = fact.media ?? {};
  return isDeepStrictEqual(message.image_urls, media.images ?? []) && isDeepStrictEqual(message.audio_urls, media.audio ?? [])
    && isDeepStrictEqual(message.video_urls, media.video ?? []);
};

export class NativeWorkingContextSnapshotV5Converter {
  private readonly finalizer = new WorkingContextFinalizer();

  convert(input: NativeSnapshotConversionInput): NativeSnapshotConversionResult {
    const expectedAgentId = input.expectedSnapshotAgentId.trim();
    if (!expectedAgentId) {
      throw new Error('Native snapshot conversion requires a non-empty expectedSnapshotAgentId.');
    }

    const omissions = new NativeSnapshotOmissionTracker();
    const source = this.decodeRoot(input.sourceBytes, omissions);
    if (!source) return this.emptyCandidate(expectedAgentId, omissions);

    const sourceAgentId = normalizeOptionalString(source.agent_id);
    if (!sourceAgentId) return { kind: 'identity_rejected', reasonCode: 'missing_source_agent_id' };
    if (sourceAgentId !== expectedAgentId) {
      return { kind: 'identity_rejected', reasonCode: 'source_agent_id_mismatch' };
    }

    Object.keys(source).filter((field) => !ROOT_FIELDS.has(field))
      .forEach(() => omissions.field());
    if (Object.prototype.hasOwnProperty.call(source, 'epoch_id')) omissions.field();
    if (Object.prototype.hasOwnProperty.call(source, 'last_compaction_ts')) omissions.field();

    const schemaVersion = source.schema_version;
    if (!SUPPORTED_SCHEMAS.has(schemaVersion as number)) {
      omissions.add('unsupported_source_schema');
      if (Array.isArray(source.messages)) {
        source.messages.forEach(() => omissions.message('unsupported_source_schema'));
      }
      return this.emptyCandidate(expectedAgentId, omissions);
    }
    if (!Array.isArray(source.messages)) {
      omissions.add('invalid_message_collection');
      return this.emptyCandidate(expectedAgentId, omissions);
    }

    const factsById = this.indexFacts(input.eligibleActiveReferenceFacts);
    const retained: Message[] = [];
    for (let index = 0; index < source.messages.length;) {
      const candidate = source.messages[index];
      if (!isRecord(candidate)) {
        omissions.message('invalid_message');
        index += 1;
        continue;
      }
      const role = candidate.role;
      if (role === MessageRole.ASSISTANT && this.hasToolCalls(candidate)) {
        index = this.projectToolGroup(source.messages, index, factsById, omissions, retained);
        continue;
      }
      if (role === MessageRole.TOOL) {
        omissions.toolGroup('orphan_tool_group');
        index += 1;
        continue;
      }
      retained.push(...this.projectOrdinaryMessage(candidate, factsById, omissions));
      index += 1;
    }

    if (!retained.length && source.messages.length) omissions.add('empty_candidate');
    return this.buildCandidate(expectedAgentId, retained, omissions);
  }

  private decodeRoot(bytes: Uint8Array, omissions: NativeSnapshotOmissionTracker): JsonRecord | null {
    try {
      const parsed = JSON.parse(new TextDecoder().decode(bytes));
      if (!isRecord(parsed)) throw new Error('root is not an object');
      return parsed;
    } catch {
      omissions.add('invalid_source_json');
      return null;
    }
  }

  private indexFacts(
    facts: readonly NativeSnapshotReferenceFact[],
  ): Map<string, readonly NativeSnapshotReferenceFact[]> {
    const mutable = new Map<string, NativeSnapshotReferenceFact[]>();
    for (const fact of facts) {
      const entries = mutable.get(fact.id) ?? [];
      entries.push(fact);
      mutable.set(fact.id, entries);
    }
    return mutable;
  }

  private projectOrdinaryMessage(
    source: JsonRecord,
    factsById: Map<string, readonly NativeSnapshotReferenceFact[]>,
    omissions: NativeSnapshotOmissionTracker,
  ): Message[] {
    this.countIgnoredMetadataFields(source, omissions);
    const message = this.decodeMessage(source, omissions, null);
    if (!message) {
      omissions.message('invalid_message');
      return [];
    }
    if (message.role === MessageRole.SYSTEM) return [message];
    if (message.role === MessageRole.USER) {
      const currentUnits = this.projectCurrentUserConstituents(source, message, factsById, omissions);
      if (currentUnits !== null) return currentUnits;
    }
    const provenance = this.readSingleReference(source, omissions);
    if (provenance === 'compacted_memory') {
      omissions.message('old_compacted_memory');
      return [];
    }
    if (!provenance) {
      omissions.message('unsourced_message');
      return [];
    }
    const facts = this.resolveFacts(provenance, factsById);
    if (!facts || !this.matchesOrdinary(message, provenance, facts)) {
      omissions.message('source_reference_mismatch');
      return [];
    }
    if (message.reasoning_content !== null) {
      message.reasoning_content = null;
      omissions.field('unbacked_optional_field');
      if (message.role === MessageRole.ASSISTANT && !message.content
        && !message.image_urls.length && !message.audio_urls.length && !message.video_urls.length) {
        omissions.message('unsupported_message');
        return [];
      }
    }
    return message.role === MessageRole.USER
      ? [createNaturalUserMessageProvenance(message, {
          kind: 'retained_user',
          rawTraceIds: provenance.rawTraceIds,
          turnId: provenance.turnId,
        })]
      : [this.withSingleProvenance(message, provenance)];
  }

  private projectCurrentUserConstituents(
    source: JsonRecord,
    message: Message,
    factsById: Map<string, readonly NativeSnapshotReferenceFact[]>,
    omissions: NativeSnapshotOmissionTracker,
  ): Message[] | null {
    const provenance = this.provenanceRecord(source);
    if (provenance?.kind !== 'composed_user') return null;
    Object.keys(provenance).filter((key) => !['kind', 'constituents'].includes(key))
      .forEach(() => omissions.field());
    if (!Array.isArray(provenance.constituents)) {
      omissions.message('invalid_message');
      return [];
    }
    const units: Message[] = [];
    for (const item of provenance.constituents) {
      if (!isRecord(item)) {
        omissions.message('invalid_message');
        continue;
      }
      Object.keys(item).filter((key) => ![
        'kind', 'textRange', 'rawTraceIds', 'turnId', 'imageRange', 'audioRange', 'videoRange',
      ].includes(key)).forEach(() => omissions.field());
      if (item.kind === 'compacted_memory') {
        omissions.message('old_compacted_memory');
        continue;
      }
      if (item.kind !== 'retained_user' && item.kind !== 'current_user') {
        omissions.message('invalid_message');
        continue;
      }
      const projected = this.sliceUserConstituent(message, item);
      const reference = this.referenceFromRecord(item);
      const facts = reference && this.resolveFacts(reference, factsById);
      if (!projected || !reference || !facts || !this.matchesOrdinary(projected, reference, facts)) {
        omissions.message('source_reference_mismatch');
        continue;
      }
      units.push(createNaturalUserMessageProvenance(projected, {
        kind: 'retained_user',
        rawTraceIds: reference.rawTraceIds,
        turnId: reference.turnId,
      }));
    }
    return units;
  }

  private sliceUserConstituent(message: Message, item: JsonRecord): Message | null {
    const textRange = this.range(item.textRange, message.content?.length ?? 0, true);
    const imageRange = this.range(item.imageRange, message.image_urls.length);
    const audioRange = this.range(item.audioRange, message.audio_urls.length);
    const videoRange = this.range(item.videoRange, message.video_urls.length);
    if (textRange === undefined || !imageRange || !audioRange || !videoRange) return null;
    return new Message(MessageRole.USER, {
      content: textRange === null ? null : (message.content ?? '').slice(textRange.start, textRange.end),
      image_urls: message.image_urls.slice(imageRange.start, imageRange.end),
      audio_urls: message.audio_urls.slice(audioRange.start, audioRange.end),
      video_urls: message.video_urls.slice(videoRange.start, videoRange.end),
    });
  }

  private projectToolGroup(
    sourceMessages: unknown[],
    start: number,
    factsById: Map<string, readonly NativeSnapshotReferenceFact[]>,
    omissions: NativeSnapshotOmissionTracker,
    retained: Message[],
  ): number {
    const sourceAssistant = sourceMessages[start] as JsonRecord;
    const calls = this.decodeToolCalls(sourceAssistant, omissions);
    const resultRecords: JsonRecord[] = [];
    let cursor = start + 1;
    while (cursor < sourceMessages.length && isRecord(sourceMessages[cursor])
      && (sourceMessages[cursor] as JsonRecord).role === MessageRole.TOOL) {
      resultRecords.push(sourceMessages[cursor] as JsonRecord);
      cursor += 1;
    }
    this.countIgnoredMetadataFields(sourceAssistant, omissions);
    resultRecords.forEach((record) => this.countIgnoredMetadataFields(record, omissions));
    const assistant = calls && this.decodeMessage(sourceAssistant, omissions, new ToolCallPayload(calls));
    const results = resultRecords.map((record) => this.decodeToolResultMessage(record, omissions));
    const assistantRef = this.readSingleReference(sourceAssistant, omissions);
    const resultRefs = resultRecords.map((record) => this.readSingleReference(record, omissions));
    if (
      !calls || !assistant || results.some((result) => !result)
      || !assistantRef || assistantRef === 'compacted_memory'
      || resultRefs.some((reference) => !reference || reference === 'compacted_memory')
      || !this.matchesToolGroup(
        assistant,
        calls,
        results as Message[],
        assistantRef,
        resultRefs as SourceReference[],
        factsById,
      )
    ) {
      omissions.toolGroup('incomplete_or_ambiguous_tool_group');
      return cursor;
    }
    if (assistant.reasoning_content !== null) {
      assistant.reasoning_content = null;
      omissions.field('unbacked_optional_field');
    }
    retained.push(this.withSingleProvenance(assistant, assistantRef));
    results.forEach((result, index) => retained.push(
      this.withSingleProvenance(result!, resultRefs[index] as SourceReference),
    ));
    return cursor;
  }

  private decodeMessage(
    source: JsonRecord,
    omissions: NativeSnapshotOmissionTracker,
    toolPayload: ToolCallPayload | ToolResultPayload | null,
  ): Message | null {
    Object.keys(source).filter((field) => !MESSAGE_FIELDS.has(field))
      .forEach(() => omissions.field());
    if (!Object.values(MessageRole).includes(source.role as MessageRole)) return null;
    if (source.content !== null && source.content !== undefined && typeof source.content !== 'string') return null;
    if (
      source.reasoning_content !== null
      && source.reasoning_content !== undefined
      && typeof source.reasoning_content !== 'string'
    ) return null;
    const images = stringArray(source.image_urls ?? []);
    const audio = stringArray(source.audio_urls ?? []);
    const video = stringArray(source.video_urls ?? []);
    if (!images || !audio || !video) return null;
    if ((source.role === MessageRole.SYSTEM || source.role === MessageRole.USER) && source.tool_payload) return null;
    if (source.role === MessageRole.ASSISTANT && source.tool_payload && !toolPayload) return null;
    if (source.role === MessageRole.TOOL && !(toolPayload instanceof ToolResultPayload)) return null;
    return new Message(source.role as MessageRole, {
      content: source.content as string | null | undefined,
      reasoning_content: source.reasoning_content as string | null | undefined,
      image_urls: images,
      audio_urls: audio,
      video_urls: video,
      tool_payload: toolPayload,
    });
  }

  private decodeToolCalls(source: JsonRecord, omissions: NativeSnapshotOmissionTracker): ToolCallSpec[] | null {
    const payload = source.tool_payload;
    if (!isRecord(payload) || !Array.isArray(payload.tool_calls) || !payload.tool_calls.length) return null;
    Object.keys(payload).filter((key) => key !== 'tool_calls').forEach(() => omissions.field());
    const calls: ToolCallSpec[] = [];
    for (const candidate of payload.tool_calls) {
      if (!isRecord(candidate)) return null;
      const id = normalizeOptionalString(candidate.id);
      const name = normalizeOptionalString(candidate.name);
      if (!id || !name || !isRecord(candidate.arguments)) return null;
      Object.keys(candidate)
        .filter((key) => !['id', 'name', 'arguments', 'nativeToolCallContext'].includes(key))
        .forEach(() => omissions.field());
      if (candidate.nativeToolCallContext !== undefined) omissions.field('unbacked_optional_field');
      calls.push({ id, name, arguments: candidate.arguments });
    }
    return new Set(calls.map(({ id }) => id)).size === calls.length ? calls : null;
  }

  private decodeToolResultMessage(source: JsonRecord, omissions: NativeSnapshotOmissionTracker): Message | null {
    const payload = source.tool_payload;
    if (!isRecord(payload)) return null;
    const id = normalizeOptionalString(payload.tool_call_id);
    const name = normalizeOptionalString(payload.tool_name);
    const error = payload.tool_error;
    if (!id || !name || (error !== undefined && error !== null && typeof error !== 'string')) return null;
    const message = this.decodeMessage(
      source,
      omissions,
      new ToolResultPayload(id, name, payload.tool_result, (error as string | null | undefined) ?? null),
    );
    if (!message || message.content !== null || message.reasoning_content !== null
      || message.image_urls.length || message.audio_urls.length || message.video_urls.length) return null;
    return message;
  }

  private matchesOrdinary(
    message: Message,
    reference: SourceReference,
    facts: readonly NativeSnapshotReferenceFact[],
  ): boolean {
    if (facts.length !== 1) return false;
    const fact = facts[0]!;
    const expectedTraceType = message.role === MessageRole.USER ? 'user' : 'assistant';
    return fact.traceType === expectedTraceType
      && (!reference.turnId || fact.turnId === reference.turnId)
      && fact.content === (message.content ?? '')
      && exactMedia(message, fact);
  }

  private matchesToolGroup(
    assistant: Message,
    calls: readonly ToolCallSpec[],
    results: readonly Message[],
    assistantRef: SourceReference,
    resultRefs: readonly SourceReference[],
    factsById: Map<string, readonly NativeSnapshotReferenceFact[]>,
  ): boolean {
    const assistantFacts = this.resolveFacts(assistantRef, factsById);
    if (!assistantFacts) return false;
    const assistantTraces = assistantFacts.filter(({ traceType }) => traceType === 'assistant');
    const callTraces = assistantFacts.filter(({ traceType }) => traceType === 'tool_call');
    if (assistantFacts.length !== assistantTraces.length + callTraces.length) return false;
    if (assistantTraces.length > 1 || callTraces.length !== calls.length) return false;
    if (assistantTraces.length === 1) {
      const fact = assistantTraces[0]!;
      if (fact.content !== (assistant.content ?? '') || !exactMedia(assistant, fact)) return false;
    } else if (assistant.content || assistant.reasoning_content || assistant.image_urls.length
      || assistant.audio_urls.length || assistant.video_urls.length) return false;
    if (!calls.every((call) => callTraces.filter((fact) => fact.toolCallId === call.id
      && fact.toolName === call.name && isDeepStrictEqual(fact.toolArgs, call.arguments)).length === 1)) return false;
    if (assistantRef.turnId && assistantFacts.some((fact) => fact.turnId !== assistantRef.turnId)) return false;

    if (results.length !== calls.length || resultRefs.length !== calls.length) return false;
    const seen = new Set<string>();
    for (let index = 0; index < results.length; index += 1) {
      const result = results[index]!;
      const payload = result.tool_payload as ToolResultPayload;
      const call = calls.find(({ id }) => id === payload.toolCallId);
      if (seen.has(payload.toolCallId) || !call || payload.toolName !== call.name) return false;
      seen.add(payload.toolCallId);
      const reference = resultRefs[index]!;
      const facts = this.resolveFacts(reference, factsById);
      if (!facts || facts.length !== 1) return false;
      const fact = facts[0]!;
      if (fact.traceType !== 'tool_result' || fact.toolCallId !== payload.toolCallId
        || fact.toolName !== payload.toolName || !isDeepStrictEqual(fact.toolResult, payload.toolResult)
        || (fact.toolError ?? null) !== payload.toolError
        || (reference.turnId && fact.turnId !== reference.turnId)) return false;
    }
    return true;
  }

  private resolveFacts(
    reference: SourceReference,
    factsById: Map<string, readonly NativeSnapshotReferenceFact[]>,
  ): NativeSnapshotReferenceFact[] | null {
    if (!reference.rawTraceIds.length || new Set(reference.rawTraceIds).size !== reference.rawTraceIds.length) return null;
    const facts = reference.rawTraceIds.map((id) => factsById.get(id));
    return facts.every((entries) => entries?.length === 1)
      ? facts.map((entries) => entries![0]!)
      : null;
  }

  private readSingleReference(
    source: JsonRecord,
    omissions: NativeSnapshotOmissionTracker,
  ): SourceReference | 'compacted_memory' | null {
    const provenance = this.provenanceRecord(source);
    if (!provenance) return null;
    if (provenance.sourceKind === 'compacted_memory') return 'compacted_memory';
    if (provenance.kind === 'composed_user') return null;
    Object.keys(provenance)
      .filter((key) => !['kind', 'rawTraceIds', 'turnId', 'sourceKind', 'toolCallIds'].includes(key))
      .forEach(() => omissions.field());
    return this.referenceFromRecord(provenance);
  }

  private referenceFromRecord(value: JsonRecord): SourceReference | null {
    const ids = stringArray(value.rawTraceIds);
    if (!ids?.length || ids.some((id) => !id.trim())) return null;
    const turnId = value.turnId === null || value.turnId === undefined
      ? null
      : normalizeOptionalString(value.turnId);
    if (value.turnId !== null && value.turnId !== undefined && !turnId) return null;
    return { rawTraceIds: ids, turnId };
  }

  private provenanceRecord(source: JsonRecord): JsonRecord | null {
    const metadata = source.metadata;
    return isRecord(metadata) && isRecord(metadata[PROVENANCE_KEY])
      ? metadata[PROVENANCE_KEY]
      : null;
  }

  private countIgnoredMetadataFields(
    source: JsonRecord,
    omissions: NativeSnapshotOmissionTracker,
  ): void {
    const metadata = source.metadata;
    if (!isRecord(metadata)) return;
    Object.keys(metadata).filter((key) => key !== PROVENANCE_KEY)
      .forEach(() => omissions.field());
  }

  private range(
    value: unknown,
    bound: number,
    nullable = false,
  ): { start: number; end: number } | null | undefined {
    if (nullable && value === null) return null;
    if (!isRecord(value) || !Number.isInteger(value.start) || !Number.isInteger(value.end)) return undefined;
    const start = value.start as number;
    const end = value.end as number;
    return start >= 0 && end >= start && end <= bound ? { start, end } : undefined;
  }

  private hasToolCalls(source: JsonRecord): boolean {
    return isRecord(source.tool_payload) && Array.isArray(source.tool_payload.tool_calls);
  }

  private withSingleProvenance(message: Message, reference: SourceReference): Message {
    message.metadata = {
      [PROVENANCE_KEY]: {
        kind: 'single',
        rawTraceIds: [...reference.rawTraceIds],
        turnId: reference.turnId,
      },
    };
    return message;
  }

  private emptyCandidate(
    expectedAgentId: string,
    omissions: NativeSnapshotOmissionTracker,
  ): Extract<NativeSnapshotConversionResult, { kind: 'candidate' }> {
    if (!omissions.hasOmissions) omissions.add('empty_candidate');
    return this.buildCandidate(expectedAgentId, [], omissions);
  }

  private buildCandidate(
    expectedAgentId: string,
    messages: Message[],
    omissions: NativeSnapshotOmissionTracker,
  ): Extract<NativeSnapshotConversionResult, { kind: 'candidate' }> {
    let workingContext: WorkingContext;
    try {
      workingContext = this.finalizer.finalize({ messages });
    } catch {
      messages.forEach(() => omissions.message('invalid_candidate_structure'));
      workingContext = new WorkingContext();
    }
    const payload = WorkingContextSnapshotSerializer.serialize(workingContext, { agent_id: expectedAgentId });
    if (!WorkingContextSnapshotSerializer.validate(payload)) {
      throw new Error('Native snapshot converter produced an invalid strict-v5 candidate.');
    }
    return {
      kind: 'candidate',
      mode: omissions.hasOmissions ? 'converted_with_omissions' : 'converted',
      workingContext,
      omissions: omissions.snapshot(),
    };
  }
}
