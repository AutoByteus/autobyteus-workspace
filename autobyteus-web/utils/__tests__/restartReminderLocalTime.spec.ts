/**
 * autobyteus-526 REQ-003 (AC-003, DEC-002): the restart reminder card shows its restart time in the viewer's time zone;
 * the agent's text keeps UTC. Only the reminder's time line changes.
 */
import { describe, expect, it } from 'vitest';
import { restartReminderInLocalTime } from '~/utils/restartReminderLocalTime';

const REMINDER = [
  '[Platform notice — application restarted]',
  '',
  'The application restarted at 2026-11-18 05:41 UTC (reason: a restart).',
  'If you started any background tasks, the restart stopped them.',
].join('\n');

describe('restartReminderInLocalTime', () => {
  it('shows the restart time in the viewer\'s zone with the date and the zone\'s short name (English)', () => {
    expect(restartReminderInLocalTime(REMINDER, 'en', 'Europe/Berlin'))
      .toBe(REMINDER.replace('2026-11-18 05:41 UTC', '18 Nov 2026, 06:41 CET'));
    expect(restartReminderInLocalTime(REMINDER, 'en', 'Asia/Tokyo')).toContain('The application restarted at 18 Nov 2026, 14:41 GMT+9 (reason: a restart).');
    expect(restartReminderInLocalTime(REMINDER, 'en', 'UTC')).toContain('restarted at 18 Nov 2026, 05:41 UTC (reason');
  });

  it('crosses the date line by the viewer\'s zone, and reads in Chinese for the Chinese app', () => {
    const lateUtc = REMINDER.replace('2026-11-18 05:41 UTC', '2026-11-17 22:20 UTC');
    expect(restartReminderInLocalTime(lateUtc, 'en', 'Asia/Shanghai')).toContain('restarted at 18 Nov 2026, 06:20 GMT+8 (reason');
    expect(restartReminderInLocalTime(lateUtc, 'zh-CN', 'Asia/Shanghai')).toContain('2026年11月18日');
  });

  it('leaves the rest of the text, and text without the reminder\'s time, unchanged', () => {
    const shown = restartReminderInLocalTime(REMINDER, 'en', 'Europe/Berlin');
    expect(shown.split('\n').filter((line) => !line.startsWith('The application restarted at'))).toEqual(
      REMINDER.split('\n').filter((line) => !line.startsWith('The application restarted at')));
    expect(restartReminderInLocalTime('No time here.', 'en', 'Europe/Berlin')).toBe('No time here.');
  });
});
