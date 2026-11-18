import type { SupportedLocale } from '~/localization/runtime/types';

/** The restart reminder: its sender, or its header (replayed history, Team streams). */
export const RESTART_REMINDER_NOTICE_SENDER_ID = 'system.restart_resume';
export const RESTART_REMINDER_NOTICE_HEADER = '[Platform notice — application restarted]';

/** The reminder's restart time as the server writes it for the agent: `2026-11-18 05:41 UTC`. */
const RESTART_TIME = /(The application restarted at )(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}) UTC/;

/**
 * The Intl locale for a date in the app's language: English reads `18 Nov 2026, 06:41 CET` (day first, 24-hour, the
 * zone's abbreviation, as the reminder's own UTC time reads); Chinese uses its own format.
 */
const intlLocaleOf = (locale: SupportedLocale): string => (locale === 'en' ? 'en-GB' : locale);

/**
 * The restart reminder as the viewer reads it (autobyteus-526 REQ-003, DEC-002): its restart time in the viewer's own
 * time zone, with the date and the zone's short name. Only the shown text changes: the agent got, and memory keeps, the
 * UTC time. Text without the reminder's time line is returned unchanged. `timeZone` is for tests; the viewer's zone
 * otherwise.
 */
export const restartReminderInLocalTime = (
  content: string,
  locale: SupportedLocale,
  timeZone?: string,
): string => content.replace(RESTART_TIME, (whole, lead: string, year: string, month: string, day: string, hour: string, minute: string) => {
  const instant = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute)));
  if (Number.isNaN(instant.getTime())) return whole;
  const local = new Intl.DateTimeFormat(intlLocaleOf(locale), {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    timeZoneName: 'short', ...(timeZone ? { timeZone } : {}),
  }).format(instant);
  return `${lead}${local}`;
});
