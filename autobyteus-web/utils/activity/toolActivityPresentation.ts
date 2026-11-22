import type { ToolActivity } from '~/types/activity/RunActivity';
import type { ToolInvocationStatus } from '~/types/segments';

/**
 * How a tool activity is presented, one owner for the desktop Activity panel and the phone's Activity (autobyteus-590 D-3):
 * its status's label, tone and icon, and the sections of its details. Each surface maps the tone to its own classes.
 */
/** `gray` is a denied call; `neutral` a call the run's stop interrupted ("Stopped"). */
export type ToolActivityTone = 'green' | 'red' | 'cyan' | 'slate' | 'blue' | 'amber' | 'gray' | 'neutral';

export interface ToolActivityStatusPresentation {
  /** The status word ("Success", "Failed", …): the desktop's words, the same on the phone. */
  label: string;
  tone: ToolActivityTone;
  icon: string;
  isRunning: boolean;
}

export const toolActivityStatusPresentation = (status: ToolInvocationStatus): ToolActivityStatusPresentation => {
  switch (status) {
    case 'success': return { label: 'Success', tone: 'green', icon: 'heroicons:check-circle-solid', isRunning: false };
    case 'error': return { label: 'Failed', tone: 'red', icon: 'heroicons:x-circle-solid', isRunning: false };
    case 'approved': return { label: 'Approved', tone: 'cyan', icon: 'heroicons:check-badge-solid', isRunning: false };
    case 'parsed': return { label: 'Parsed', tone: 'slate', icon: 'heroicons:document-check-solid', isRunning: false };
    case 'executing':
    case 'parsing': return { label: 'Running', tone: 'blue', icon: 'heroicons:clock-solid', isRunning: true };
    case 'awaiting-approval': return { label: 'Review', tone: 'amber', icon: 'heroicons:hand-raised-solid', isRunning: false };
    case 'denied': return { label: 'Denied', tone: 'gray', icon: 'heroicons:no-symbol-solid', isRunning: false };
    // The product's word for a stop the run caused (autobyteus-609 D-D; DEC-005); the conversation's cards show its icon.
    case 'interrupted': return { label: 'Stopped', tone: 'neutral', icon: 'heroicons:stop-circle-solid', isRunning: false };
  }
};

export type ToolActivityDetailSectionKey = 'arguments' | 'logs' | 'result' | 'error';

export interface ToolActivityDetailSection {
  key: ToolActivityDetailSectionKey;
  /** The section's text: arguments and result as indented JSON (a string as it is), the logs one per line. */
  text: string;
  /** The log lines, for the logs section. */
  lines?: string[];
}

/** A value as the details show it: a string as it is, anything else as indented JSON. */
export const formatToolActivityValue = (value: unknown): string => {
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

/** The sections of a tool activity's details, in order, each only when present. */
export const toolActivityDetailSections = (activity: ToolActivity): ToolActivityDetailSection[] => {
  const sections: ToolActivityDetailSection[] = [];
  if (activity.arguments && Object.keys(activity.arguments).length > 0) {
    sections.push({ key: 'arguments', text: formatToolActivityValue(activity.arguments) });
  }
  if (activity.logs.length > 0) sections.push({ key: 'logs', text: activity.logs.join('\n'), lines: [...activity.logs] });
  if (activity.result) sections.push({ key: 'result', text: formatToolActivityValue(activity.result) });
  if (activity.error) sections.push({ key: 'error', text: activity.error });
  return sections;
};
