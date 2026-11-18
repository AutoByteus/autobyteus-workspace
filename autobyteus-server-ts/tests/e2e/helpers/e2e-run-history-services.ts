import type { DelegationIndex } from "../../../src/agent-collaboration/delegation/delegation-index.js";
import { createPeerRunOf } from "../../../src/agent-collaboration/execution/remote/peer-runs.js";
import { AgentRunHistoryService, setProcessAgentRunHistoryService } from "../../../src/run-history/services/agent-run-history-service.js";
import { TeamRunHistoryService, setProcessTeamRunHistoryService } from "../../../src/run-history/services/team-run-history-service.js";
import { WorkspaceRunHistoryService, setProcessWorkspaceRunHistoryService } from "../../../src/run-history/services/workspace-run-history-service.js";
import {
  TeamMemberRunViewProjectionService, setProcessTeamMemberRunViewProjectionService,
} from "../../../src/run-history/services/team-member-run-view-projection-service.js";
import {
  AgentOrgMemberRunViewProjectionService, setProcessAgentOrgMemberRunViewProjectionService,
} from "../../../src/run-history/services/agent-org-member-run-view-projection-service.js";
import {
  StandaloneRootMemberViewProjectionService, setProcessStandaloneRootMemberViewProjectionService,
} from "../../../src/standalone-agent-run-root/services/standalone-root-member-view-projection-service.js";
import { noDelegations, noWorkGuard, noEpisodicCatalog } from "../../helpers/no-delegations.js";
import { NO_PEER_CHANNEL } from "../../helpers/explicit-host-collaborators.js";

/**
 * The run-history readers an in-process GraphQL suite needs, created the way the composition root creates them
 * (autobyteus-461 SR-047 step 8: `composeCollaboration` sets each process service it created; there is no lazy default).
 * A suite that starts no delegated run passes no tree (`noDelegations()`); one about delegation passes a real tree.
 * Returns the release of everything it set, in reverse order.
 */
export const setE2eRunHistoryServices = (input: Readonly<{
  memoryDir: string;
  tree?: DelegationIndex;
  /** The Org member reader needs the process AgentOrgRunManager; a suite without one reads no Org member. */
  orgMembers?: boolean;
}>): (() => void) => {
  const tree = input.tree ?? noDelegations();
  const workGuard = noWorkGuard();
  const episodicCatalog = noEpisodicCatalog();
  const agentRunHistoryService = new AgentRunHistoryService(input.memoryDir, { tree, workGuard, episodicCatalog });
  const teamRunHistoryService = new TeamRunHistoryService(input.memoryDir, { tree, workGuard, episodicCatalog });
  const releases = [
    setProcessAgentRunHistoryService(agentRunHistoryService),
    setProcessTeamRunHistoryService(teamRunHistoryService),
    setProcessWorkspaceRunHistoryService(new WorkspaceRunHistoryService({ tree, agentRunHistoryService, teamRunHistoryService })),
    setProcessTeamMemberRunViewProjectionService(new TeamMemberRunViewProjectionService({ memoryDir: input.memoryDir, tree, peerRunOf: createPeerRunOf(tree, NO_PEER_CHANNEL) })),
    ...(input.orgMembers ? [setProcessAgentOrgMemberRunViewProjectionService(new AgentOrgMemberRunViewProjectionService({ memoryDir: input.memoryDir, tree, peerRunOf: createPeerRunOf(tree, NO_PEER_CHANNEL) }))] : []),
    setProcessStandaloneRootMemberViewProjectionService(new StandaloneRootMemberViewProjectionService({ peerRunOf: createPeerRunOf(tree, NO_PEER_CHANNEL) })),
  ];
  return () => { for (const release of releases.splice(0).reverse()) release(); };
};
