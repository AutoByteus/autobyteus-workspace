import { Message, MessageRole } from '../llm/utils/messages.js';
import { WorkingContext } from './working-context.js';
import { assertFinalizedWorkingContextMessages } from './working-context-finalization-validation.js';
import {
  buildSingleMessageProvenance,
  getWorkingContextMessageProvenance,
  setWorkingContextMessageProvenance,
  type MediaRange,
  type NaturalUserConstituent,
  type UserConstituent,
  type WorkingContextMessageProvenance,
} from './working-context-provenance.js';

export type WorkingContextFinalizationInput = {
  messages: readonly Message[];
};

const emptyRange = (): MediaRange => ({ start: 0, end: 0 });
const fullRange = (length: number): MediaRange => ({ start: 0, end: length });

const cloneConstituent = (constituent: UserConstituent): UserConstituent =>
  constituent.kind === 'compacted_memory'
    ? { ...constituent, textRange: { ...constituent.textRange } }
    : {
        ...constituent,
        rawTraceIds: [...constituent.rawTraceIds],
        textRange: constituent.textRange && { ...constituent.textRange },
        imageRange: { ...constituent.imageRange },
        audioRange: { ...constituent.audioRange },
        videoRange: { ...constituent.videoRange },
      };

const makeNaturalConstituent = (
  message: Message,
  provenance: WorkingContextMessageProvenance | null,
  kind: NaturalUserConstituent['kind'],
): NaturalUserConstituent => {
  const single = provenance?.kind === 'single'
    ? provenance
    : buildSingleMessageProvenance() as Extract<
        WorkingContextMessageProvenance,
        { kind: 'single' }
      >;
  return {
    kind,
    textRange: message.content === null ? null : fullRange(message.content.length),
    rawTraceIds: single.rawTraceIds,
    turnId: single.turnId,
    imageRange: fullRange(message.image_urls.length),
    audioRange: fullRange(message.audio_urls.length),
    videoRange: fullRange(message.video_urls.length),
  };
};

const normalizeUserConstituents = (
  message: Message,
  naturalKind: NaturalUserConstituent['kind'],
): UserConstituent[] => {
  const provenance = getWorkingContextMessageProvenance(message);
  return provenance?.kind === 'composed_user'
    ? provenance.constituents.map(cloneConstituent)
    : [makeNaturalConstituent(message, provenance, naturalKind)];
};

const connectorFor = (constituent: UserConstituent): string => {
  if (constituent.kind === 'current_user') return "\n\nThe user's current message is:\n\n";
  if (constituent.kind === 'retained_user') {
    return '\n\nThe next retained user message was:\n\n';
  }
  return '\n\n';
};

const shiftRange = (range: MediaRange, offset: number): MediaRange => ({
  start: range.start + offset,
  end: range.end + offset,
});

const shiftConstituent = (
  constituent: UserConstituent,
  offsets: { text: number; image: number; audio: number; video: number },
): UserConstituent => constituent.kind === 'compacted_memory'
  ? {
      kind: 'compacted_memory',
      textRange: shiftRange(constituent.textRange, offsets.text),
    }
  : {
      ...constituent,
      rawTraceIds: [...constituent.rawTraceIds],
      textRange: constituent.textRange ? shiftRange(constituent.textRange, offsets.text) : null,
      imageRange: shiftRange(constituent.imageRange, offsets.image),
      audioRange: shiftRange(constituent.audioRange, offsets.audio),
      videoRange: shiftRange(constituent.videoRange, offsets.video),
    };

const normalizeUserMessage = (
  message: Message,
  naturalKind: NaturalUserConstituent['kind'],
): Message => setWorkingContextMessageProvenance(message, {
  kind: 'composed_user',
  constituents: normalizeUserConstituents(message, naturalKind),
});

const mergeUserMessages = (left: Message, right: Message): Message => {
  const leftConstituents = normalizeUserConstituents(left, 'retained_user');
  const rightConstituents = normalizeUserConstituents(right, 'retained_user');
  const connector = connectorFor(rightConstituents[0]!);
  const leftText = left.content ?? '';
  const rightText = right.content ?? '';
  const merged = new Message(MessageRole.USER, {
    content: `${leftText}${connector}${rightText}`,
    image_urls: [...left.image_urls, ...right.image_urls],
    audio_urls: [...left.audio_urls, ...right.audio_urls],
    video_urls: [...left.video_urls, ...right.video_urls],
    metadata: { ...(left.metadata ?? {}), ...(right.metadata ?? {}) },
  });
  return setWorkingContextMessageProvenance(merged, {
    kind: 'composed_user',
    constituents: [
      ...leftConstituents,
      ...rightConstituents.map((constituent) => shiftConstituent(constituent, {
        text: leftText.length + connector.length,
        image: left.image_urls.length,
        audio: left.audio_urls.length,
        video: left.video_urls.length,
      })),
    ],
  });
};

export class WorkingContextFinalizer {
  finalize(input: WorkingContextFinalizationInput): WorkingContext {
    const finalized: Message[] = [];
    for (const message of new WorkingContext(input.messages).buildMessages()) {
      const normalized = message.role === MessageRole.USER
        ? normalizeUserMessage(message, 'retained_user')
        : this.ensureSingleProvenance(message);
      const previous = finalized.at(-1);
      if (
        previous?.role === MessageRole.USER
        && normalized.role === MessageRole.USER
        && previous.tool_payload === null
        && normalized.tool_payload === null
      ) {
        finalized[finalized.length - 1] = mergeUserMessages(previous, normalized);
      } else {
        finalized.push(normalized);
      }
    }
    assertFinalizedWorkingContextMessages(finalized);
    return new WorkingContext(finalized);
  }

  markNaturalUserMessagesRetained(messages: readonly Message[]): Message[] {
    return new WorkingContext(messages).buildMessages().map((message) => {
      if (message.role !== MessageRole.USER) return message;
      const provenance = getWorkingContextMessageProvenance(message);
      if (!provenance || provenance.kind !== 'composed_user') {
        return normalizeUserMessage(message, 'retained_user');
      }
      return setWorkingContextMessageProvenance(message, {
        kind: 'composed_user',
        constituents: provenance.constituents.map((constituent) =>
          constituent.kind === 'current_user'
            ? {
                ...constituent,
                kind: 'retained_user' as const,
                rawTraceIds: [...constituent.rawTraceIds],
                textRange: constituent.textRange && { ...constituent.textRange },
                imageRange: { ...constituent.imageRange },
                audioRange: { ...constituent.audioRange },
                videoRange: { ...constituent.videoRange },
              }
            : cloneConstituent(constituent)),
      });
    });
  }

  private ensureSingleProvenance(message: Message): Message {
    const provenance = getWorkingContextMessageProvenance(message);
    if (provenance?.kind === 'composed_user') {
      throw new Error('Only user messages may carry composed-user provenance.');
    }
    return setWorkingContextMessageProvenance(
      message,
      provenance ?? buildSingleMessageProvenance(),
    );
  }
}

export const createCompactedMemoryUserMessage = (content: string): Message =>
  setWorkingContextMessageProvenance(new Message(MessageRole.USER, { content }), {
    kind: 'composed_user',
    constituents: [{
      kind: 'compacted_memory',
      textRange: { start: 0, end: content.length },
    }],
  });

export const createNaturalUserMessageProvenance = (
  message: Message,
  input: {
    kind: NaturalUserConstituent['kind'];
    rawTraceIds?: readonly string[];
    turnId?: string | null;
  },
): Message => setWorkingContextMessageProvenance(message, {
  kind: 'composed_user',
  constituents: [{
    kind: input.kind,
    textRange: message.content === null ? null : fullRange(message.content.length),
    rawTraceIds: [...new Set((input.rawTraceIds ?? []).map((id) => id.trim()).filter(Boolean))],
    turnId: input.turnId?.trim() || null,
    imageRange: fullRange(message.image_urls.length),
    audioRange: fullRange(message.audio_urls.length),
    videoRange: fullRange(message.video_urls.length),
  }],
});
