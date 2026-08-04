import { computed, ref, toValue, watch, type MaybeRefOrGetter } from 'vue';
import type {
  EventMonitorActiveTraceBrowseSubject,
  EventMonitorActiveTracePageDto,
  EventMonitorActiveTracePageEventDto,
} from './eventMonitorActiveTracePageService';
import { fetchEventMonitorActiveTracePage } from './eventMonitorActiveTracePageService';
import { buildEventMonitorActiveTraceBrowsePresentation } from './eventMonitorActiveTraceBrowsePresentation';

export type EventMonitorActiveTraceBrowseState =
  | 'latest' | 'loading' | 'browsing' | 'error' | 'expired' | 'beginning';

export class EventMonitorActiveTraceProtocolError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EventMonitorActiveTraceProtocolError';
  }
}

type PageBlock = { events: EventMonitorActiveTracePageEventDto[] };
type PageFetcher = typeof fetchEventMonitorActiveTracePage;

const subjectKey = (subject: EventMonitorActiveTraceBrowseSubject): string => subject.kind === 'run'
  ? `run:${subject.runId}`
  : `team:${subject.teamRunId}:member:${subject.memberAddress}:run:${subject.agentRunId}`;

const validateResponse = (
  response: EventMonitorActiveTracePageDto,
  retainedEvents: ReadonlyMap<string, EventMonitorActiveTracePageEventDto>,
  retainedVisualIds: ReadonlySet<string>,
): EventMonitorActiveTracePageEventDto[] => {
  const pageEvents = new Map<string, EventMonitorActiveTracePageEventDto>();
  const pageVisualIds = new Set<string>();
  const output: EventMonitorActiveTracePageEventDto[] = [];
  for (const event of response.events) {
    if (!event.eventId || !event.turnGroupId) {
      throw new EventMonitorActiveTraceProtocolError('Active-trace page event identity is missing.');
    }
    if (pageEvents.has(event.eventId) || retainedEvents.has(event.eventId)) {
      throw new EventMonitorActiveTraceProtocolError(`Duplicate active-trace event '${event.eventId}'.`);
    }
    for (const visual of event.visuals) {
      if (!visual.visualId || visual.eventId !== event.eventId
        || pageVisualIds.has(visual.visualId) || retainedVisualIds.has(visual.visualId)) {
        throw new EventMonitorActiveTraceProtocolError(`Invalid active-trace visual identity for '${event.eventId}'.`);
      }
      pageVisualIds.add(visual.visualId);
    }
    pageEvents.set(event.eventId, event);
    output.push(event);
  }
  return output;
};

const splitIntoServerOwnedBlocks = (
  events: EventMonitorActiveTracePageEventDto[],
  loadedEarlierCount: number,
): PageBlock[] => {
  const blocks: PageBlock[] = [];
  const earlierCount = Math.max(0, Math.min(loadedEarlierCount, events.length));
  if (earlierCount > 0) blocks.push({ events: events.slice(0, earlierCount) });
  for (let index = earlierCount; index < events.length; index += 50) {
    blocks.push({ events: events.slice(index, index + 50) });
  }
  return blocks;
};

const visualCount = (block: PageBlock): number =>
  block.events.reduce((count, event) => count + event.visuals.length, 0);

export const useEventMonitorActiveTraceBrowse = (input: {
  subject: MaybeRefOrGetter<EventMonitorActiveTraceBrowseSubject>;
  hasEarlierAvailable: MaybeRefOrGetter<boolean>;
  presentationRevision: MaybeRefOrGetter<number>;
  fetchPage?: PageFetcher;
}) => {
  const state = ref<EventMonitorActiveTraceBrowseState>('latest');
  const blocks = ref<PageBlock[]>([]);
  const beforeCursor = ref<string | null>(null);
  const hasEarlier = ref(false);
  const errorMessage = ref('');
  const newerBrowseContentReleased = ref(false);
  const hasNewerLiveActivity = ref(false);
  const revisionBaseline = ref(toValue(input.presentationRevision));
  const retainedEventById = new Map<string, EventMonitorActiveTracePageEventDto>();
  const retainedVisualIds = new Set<string>();
  const fetchPage = input.fetchPage ?? fetchEventMonitorActiveTracePage;
  let requestSequence = 0;

  const rebuildRetainedIndex = (): void => {
    retainedEventById.clear();
    retainedVisualIds.clear();
    for (const block of blocks.value) {
      for (const event of block.events) {
        retainedEventById.set(event.eventId, event);
        for (const visual of event.visuals) {
          if (retainedVisualIds.has(visual.visualId)) {
            throw new EventMonitorActiveTraceProtocolError(`Duplicate retained visual '${visual.visualId}'.`);
          }
          retainedVisualIds.add(visual.visualId);
        }
      }
    }
  };

  const enforceResidentVisualLimit = (): void => {
    let count = blocks.value.reduce((sum, block) => sum + visualCount(block), 0);
    while (count > 300 && blocks.value.length > 1) {
      const released = blocks.value.pop();
      count -= released ? visualCount(released) : 0;
      newerBrowseContentReleased.value = true;
    }
    if (count > 300) {
      throw new EventMonitorActiveTraceProtocolError('One active-trace page block exceeds 300 central visuals.');
    }
    rebuildRetainedIndex();
  };

  const orderedEvents = computed(() => blocks.value.flatMap(block => block.events));
  const presentation = computed(() => buildEventMonitorActiveTraceBrowsePresentation(orderedEvents.value));
  const isBrowsing = computed(() => state.value !== 'latest' && blocks.value.length > 0);
  const canLoadEarlier = computed(() => state.value === 'latest'
    ? toValue(input.hasEarlierAvailable)
    : hasEarlier.value && state.value !== 'loading' && state.value !== 'expired');

  const reset = (): void => {
    requestSequence += 1;
    state.value = 'latest';
    blocks.value = [];
    beforeCursor.value = null;
    hasEarlier.value = false;
    errorMessage.value = '';
    newerBrowseContentReleased.value = false;
    hasNewerLiveActivity.value = false;
    revisionBaseline.value = toValue(input.presentationRevision);
    retainedEventById.clear();
    retainedVisualIds.clear();
  };

  const loadEarlier = async (): Promise<void> => {
    if (state.value === 'loading' || state.value === 'expired') return;
    const firstLoad = blocks.value.length === 0;
    if (firstLoad && !toValue(input.hasEarlierAvailable)) return;
    if (!firstLoad && !hasEarlier.value && state.value !== 'error') return;
    const requestedCursor = firstLoad ? null : beforeCursor.value;
    const requestedSubject = toValue(input.subject);
    const requestedSubjectKey = subjectKey(requestedSubject);
    const activeRequest = ++requestSequence;
    if (firstLoad) revisionBaseline.value = toValue(input.presentationRevision);
    state.value = 'loading';
    errorMessage.value = '';
    try {
      const response = await fetchPage(requestedSubject, requestedCursor);
      if (activeRequest !== requestSequence
        || requestedSubjectKey !== subjectKey(toValue(input.subject))) return;
      if (response.cursorStatus === 'EXPIRED') {
        state.value = 'expired';
        return;
      }
      if (response.cursorStatus !== 'VALID') {
        throw new EventMonitorActiveTraceProtocolError(`Unknown cursor status '${response.cursorStatus}'.`);
      }
      if (!Number.isInteger(response.loadedEarlierCount) || response.loadedEarlierCount < 0
        || response.loadedEarlierCount > 50
        || (response.hasEarlier && !response.beforeCursor)
        || (firstLoad && response.events.length - response.loadedEarlierCount > 100)
        || (!firstLoad && response.events.length !== response.loadedEarlierCount)) {
        throw new EventMonitorActiveTraceProtocolError('Invalid active-trace page metadata.');
      }
      const nextEvents = validateResponse(response, retainedEventById, retainedVisualIds);
      if (firstLoad) {
        blocks.value = splitIntoServerOwnedBlocks(nextEvents, response.loadedEarlierCount);
      } else if (nextEvents.length) {
        blocks.value = [{ events: nextEvents }, ...blocks.value];
      }
      beforeCursor.value = response.beforeCursor ?? null;
      hasEarlier.value = response.hasEarlier;
      enforceResidentVisualLimit();
      if (toValue(input.presentationRevision) > revisionBaseline.value) {
        hasNewerLiveActivity.value = true;
      }
      state.value = response.hasEarlier ? 'browsing' : 'beginning';
    } catch (error) {
      if (activeRequest !== requestSequence
        || requestedSubjectKey !== subjectKey(toValue(input.subject))) return;
      errorMessage.value = error instanceof Error ? error.message : String(error);
      state.value = 'error';
    }
  };

  watch(() => subjectKey(toValue(input.subject)), reset);
  watch(() => toValue(input.presentationRevision), revision => {
    if (blocks.value.length > 0 && state.value !== 'latest' && revision > revisionBaseline.value) {
      hasNewerLiveActivity.value = true;
    }
  });

  return {
    state, presentation, orderedEvents, isBrowsing, canLoadEarlier, hasEarlier,
    errorMessage, newerBrowseContentReleased, hasNewerLiveActivity,
    loadEarlier, retry: loadEarlier, jumpToLatest: reset,
  };
};
