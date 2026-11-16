import type { SelectedAgentOrg } from '~/composables/useRunListDisclosure';
import { useRunTreeStore } from '~/stores/runTreeStore';
import { rowsToUnfoldFor } from '~/utils/runTree/runTreeAgents';

/**
 * What an Org's tree shows selected (CR-461-108), on the desktop's trees and in "Your runs" alike. The Org's own row only
 * while nothing in it is selected; an agent row while its agent is open: the Org's own agent selected in the Org, or the
 * agent of the run it delegated that is open in it (a Team opened at its coordinator selects the coordinator's row).
 */
export const isOrgRunSelected = (selected: SelectedAgentOrg | null, rootRunId: string): boolean =>
  selected?.rootRunId === rootRunId && !selected.selection && !selected.delegated;

export const isOrgMemberSelected = (selected: SelectedAgentOrg | null, rootRunId: string, address: string, agentRunId?: string): boolean => {
  if (selected?.rootRunId !== rootRunId) return false;
  if (agentRunId) {
    return selected.selection
      ? selected.selection.kind === 'agent_execution' && selected.selection.agentRunId === agentRunId
      : selected.delegated?.agentRunId === agentRunId;
  }
  return selected.selection?.kind === 'configured_team' && selected.focusAddress === address;
};

/** Unfolds the Org rows above a delegated row open in it, and the row itself when it is a team row: a mounted team by its address, any other row by its key. */
export const unfoldOrgRows = (orgRunId: string, rowKey: string, unfoldTeam: (address: string) => void, unfoldRow: (key: string) => void): void => {
  for (const row of rowsToUnfoldFor(useRunTreeStore().rowsOf({ kind: 'agent_org', runId: orgRunId }), rowKey)) {
    if (row.kind === 'org_team') unfoldTeam(row.address ?? '');
    else unfoldRow(row.key);
  }
};
