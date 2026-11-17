import { mobileRunStatusLabel } from '~/utils/mobile/mobileRunStatusLabel';
import { agentStatusDotClass } from '~/utils/workspaceStatusDotPresentation';

/**
 * The open run's status dot and status line, as the run screen's bar and the Settings screen show them (one builder):
 * "Idle · in Software Engineering Team"; a top-level run has no "in"; a node that does not answer: "Not reachable".
 */
export const mobileRunSubjectLine = (input: Readonly<{
  status: string | null | undefined;
  unreachable: boolean;
  parentName: string | null;
}>): Readonly<{ dotClass: string; subtitle: string }> => {
  if (input.unreachable) return { dotClass: agentStatusDotClass('error'), subtitle: 'Not reachable' };
  const state = mobileRunStatusLabel(input.status);
  return {
    dotClass: agentStatusDotClass(input.status),
    subtitle: input.parentName ? `${state} · in ${input.parentName}` : state,
  };
};
