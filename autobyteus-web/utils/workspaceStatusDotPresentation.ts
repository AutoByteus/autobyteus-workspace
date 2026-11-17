import type { AgentStatus } from '~/types/agent/AgentStatus';
import { agentActivityPresentation } from '~/utils/agentActivityPresentation';

export const workspaceStatusDotBaseClass = 'inline-block h-2 w-2 flex-shrink-0 rounded-full';
export const workspaceTransientStatusDotBaseClass = 'inline-block h-2.5 w-2.5 flex-shrink-0';
export type WorkspaceStatusDotVariant = 'solid' | 'transient';

/** A status dot's color: the agent's activity (autobyteus-448: an idle agent with background tasks running is active). */
export const agentStatusDotClass = (
  status: AgentStatus | string | null | undefined,
  backgroundTasksRunning = 0,
): string => agentActivityPresentation({ status, backgroundTasksRunning }).dotClass;

export const agentTransientStatusDotClass = (
  status: AgentStatus | string | null | undefined,
  backgroundTasksRunning = 0,
): string => agentActivityPresentation({ status, backgroundTasksRunning }).transientDotClass;
