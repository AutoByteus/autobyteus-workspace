import { Message, MessageRole } from '../llm/utils/messages.js';
import {
  getWorkingContextMessageProvenance,
  type MediaRange,
} from './working-context-provenance.js';

const assertRange = (range: MediaRange, bound: number, label: string): void => {
  if (range.start < 0 || range.end < range.start || range.end > bound) {
    throw new Error(`${label} is outside its finalized message bounds.`);
  }
};

const countCompactedMemoryRegions = (message: Message): number => {
  const provenance = getWorkingContextMessageProvenance(message);
  if (!provenance || provenance.kind !== 'composed_user' || !provenance.constituents.length) {
    throw new Error('Finalized user messages require composed-user provenance.');
  }
  const priorEnds = { text: 0, image: 0, audio: 0, video: 0 };
  let compactedMemoryCount = 0;
  provenance.constituents.forEach((constituent, index) => {
    if (constituent.textRange) {
      assertRange(
        constituent.textRange,
        message.content?.length ?? 0,
        `constituent ${index} text range`,
      );
      if (constituent.textRange.start < priorEnds.text) {
        throw new Error('User text constituent ranges overlap.');
      }
      priorEnds.text = constituent.textRange.end;
    }
    if (constituent.kind === 'compacted_memory') {
      compactedMemoryCount += 1;
      return;
    }
    for (const [key, range, bound] of [
      ['image', constituent.imageRange, message.image_urls.length],
      ['audio', constituent.audioRange, message.audio_urls.length],
      ['video', constituent.videoRange, message.video_urls.length],
    ] as const) {
      assertRange(range, bound, `constituent ${index} ${key} range`);
      if (range.start < priorEnds[key]) {
        throw new Error(`User ${key} constituent ranges overlap.`);
      }
      priorEnds[key] = range.end;
    }
  });
  return compactedMemoryCount;
};

export const assertFinalizedWorkingContextMessages = (
  messages: readonly Message[],
): void => {
  const memoryCount = messages.reduce(
    (count, message) => count + (
      message.role === MessageRole.USER ? countCompactedMemoryRegions(message) : 0
    ),
    0,
  );
  if (memoryCount > 1) {
    throw new Error('Finalized WorkingContext contains more than one compacted-memory region.');
  }
};
