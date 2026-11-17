import { agentActivityLabel, type AgentActivity } from '~/utils/agentActivityPresentation';

/** A run's state in the phone's words (the run screen's second line, the rows' accessible names). */
const LABELS: Readonly<Record<string, string>> = Object.freeze({
  running: 'Running', idle: 'Idle', initializing: 'Starting', error: 'Error', offline: 'Stopped',
});

export const mobileRunStatusLabel = (status: string | null | undefined): string =>
  LABELS[String(status ?? '').trim().toLowerCase()] ?? 'Stopped';

/** A run's activity in the phone's words: the background text (DEC-004, localized), else its state as above. */
export const mobileRunActivityLabel = (
  activity: AgentActivity,
  t: (key: string, params?: Readonly<Record<string, string | number>>) => string,
): string => agentActivityLabel(activity, t, () => mobileRunStatusLabel(activity.status));
