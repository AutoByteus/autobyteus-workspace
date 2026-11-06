/** A run's state in the phone's words (the run screen's second line, the rows' accessible names). */
const LABELS: Readonly<Record<string, string>> = Object.freeze({
  running: 'Running', idle: 'Idle', initializing: 'Starting', error: 'Error', offline: 'Stopped',
});

export const mobileRunStatusLabel = (status: string | null | undefined): string =>
  LABELS[String(status ?? '').trim().toLowerCase()] ?? 'Stopped';
