import {
  isEventMonitorReplayEvent,
  type EventMonitorReplayEvent,
  type HistoricalReplayEvent,
} from "./historical-replay-event-types.js";

export const RECENT_RUN_PROJECTION_EVENT_LIMIT = 100;

export const selectRecentReplayEvents = (
  events: readonly EventMonitorReplayEvent[],
): EventMonitorReplayEvent[] => events.slice(-RECENT_RUN_PROJECTION_EVENT_LIMIT);

export const selectRecentRunProjectionEvents = (
  events: readonly HistoricalReplayEvent[],
): {
  eventMonitorEvents: EventMonitorReplayEvent[];
  activityEvents: HistoricalReplayEvent[];
} => {
  const eventMonitorCompatibleEvents = events.filter(isEventMonitorReplayEvent);
  const eventMonitorEvents = selectRecentReplayEvents(eventMonitorCompatibleEvents);
  if (eventMonitorCompatibleEvents.length < RECENT_RUN_PROJECTION_EVENT_LIMIT) {
    return { eventMonitorEvents, activityEvents: [...events] };
  }
  const firstSelected = eventMonitorEvents[0];
  const firstSelectedIndex = firstSelected
    ? events.findIndex((event) => event === firstSelected)
    : events.length;
  return {
    eventMonitorEvents,
    activityEvents: events.slice(Math.max(0, firstSelectedIndex)),
  };
};
