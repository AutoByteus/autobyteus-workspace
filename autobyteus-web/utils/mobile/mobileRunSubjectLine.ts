import { mobileRunActivityLabel } from '~/utils/mobile/mobileRunStatusLabel';
import { agentStatusDotClass } from '~/utils/workspaceStatusDotPresentation';

/**
 * The open run's status dot and status line, as the run screen's bar and the Settings screen show them (one builder):
 * "Idle · in Software Engineering Team"; a top-level run has no "in"; a node that does not answer: "Not reachable".
 * An idle run with background tasks running reads "Background task running" with the active dot (autobyteus-448
 * DEC-004); an unreachable run shows its error only.
 */
export const mobileRunSubjectLine = (input: Readonly<{
  status: string | null | undefined;
  backgroundTasksRunning: number;
  unreachable: boolean;
  parentName: string | null;
  t: (key: string, params?: Readonly<Record<string, string | number>>) => string;
}>): Readonly<{ dotClass: string; subtitle: string }> => {
  if (input.unreachable) return { dotClass: agentStatusDotClass('error'), subtitle: 'Not reachable' };
  const state = mobileRunActivityLabel({ status: input.status, backgroundTasksRunning: input.backgroundTasksRunning }, input.t);
  return {
    dotClass: agentStatusDotClass(input.status, input.backgroundTasksRunning),
    subtitle: input.parentName ? `${state} · in ${input.parentName}` : state,
  };
};
