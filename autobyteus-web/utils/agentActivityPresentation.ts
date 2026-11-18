import { AgentStatus } from '~/types/agent/AgentStatus';

/** What an agent is doing: its status word and how many background tasks it has running (autobyteus-448). */
export type AgentActivity = Readonly<{
  status: AgentStatus | string | null | undefined;
  backgroundTasksRunning?: number | null;
}>;

/** The activity shown: a status word, or `background` for an idle agent with background tasks running (DEC-004). */
export type AgentActivityKind = 'initializing' | 'running' | 'background' | 'idle' | 'error' | 'offline';

export type AgentActivityPresentation = Readonly<{
  kind: AgentActivityKind;
  /** The localized label: `t(labelKey, labelParams)`. */
  labelKey: string;
  labelParams: Readonly<{ count: number }>;
  /** The solid dot's color class. */
  dotClass: string;
  /** The transient (ring) dot's color class. */
  transientDotClass: string;
  iconName: string;
}>;

const KINDS: readonly AgentActivityKind[] = ['initializing', 'running', 'idle', 'error', 'offline'];

const PRESENTATION: Readonly<Record<AgentActivityKind, Omit<AgentActivityPresentation, 'kind' | 'labelKey' | 'labelParams'>>> = {
  initializing: { dotClass: 'bg-amber-500 animate-pulse', transientDotClass: 'text-amber-700', iconName: 'heroicons:clock-solid' },
  running: { dotClass: 'bg-blue-500 animate-pulse', transientDotClass: 'text-blue-700', iconName: 'heroicons:arrow-path-solid' },
  // Active (blue) like a running agent, but not pulsing, so a turn still reads differently.
  background: { dotClass: 'bg-blue-500', transientDotClass: 'text-blue-700', iconName: 'heroicons:arrow-path' },
  idle: { dotClass: 'bg-green-500', transientDotClass: 'text-green-700', iconName: 'heroicons:check-circle-solid' },
  error: { dotClass: 'bg-red-500', transientDotClass: 'text-red-700', iconName: 'heroicons:exclamation-triangle-solid' },
  offline: { dotClass: 'bg-gray-400', transientDotClass: 'text-gray-600', iconName: 'heroicons:no-symbol-solid' },
};

const countOf = (value: number | null | undefined): number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : 0;

/**
 * The one mapping from an agent's activity to its text, dot and icon (autobyteus-448 DEC-004). A running or starting
 * agent shows as today; an idle agent with background tasks running shows "Background task running" /
 * "{count} background tasks running" with the active dot; offline and error show as today. It never decides what an
 * agent can do (the Stop button and the input read the status word only).
 */
export const agentActivityPresentation = (activity: AgentActivity): AgentActivityPresentation => {
  const status = typeof activity.status === 'string' ? activity.status.trim().toLowerCase() : '';
  const count = countOf(activity.backgroundTasksRunning);
  const word = (KINDS as readonly string[]).includes(status) ? status as AgentActivityKind : 'offline';
  const kind: AgentActivityKind = word === AgentStatus.Idle && count > 0 ? 'background' : word;
  const labelKey = kind === 'background'
    ? (count === 1 ? 'workspace.agentActivity.backgroundOne' : 'workspace.agentActivity.backgroundOther')
    : `workspace.agentActivity.${kind}`;
  return Object.freeze({ kind, labelKey, labelParams: Object.freeze({ count }), ...PRESENTATION[kind] });
};

/**
 * A surface's label for an agent's activity: the background text when it shows background tasks (DEC-004), otherwise
 * the surface's own status wording (`statusLabel`), unchanged.
 */
export const agentActivityLabel = (
  activity: AgentActivity,
  t: (key: string, params?: Readonly<Record<string, string | number>>) => string,
  statusLabel: () => string,
): string => {
  const presentation = agentActivityPresentation(activity);
  return presentation.kind === 'background' ? t(presentation.labelKey, presentation.labelParams) : statusLabel();
};
