import type { CollaboratorRootPort } from "../../../agent-collaboration/collaborators/collaborator-root-port.js";
import type { RootSubjectKind } from "../../../agent-collaboration/execution/domain/root-execution-identity.js";
import { AgentOrgRunManager } from "../../../agent-org-execution/services/agent-org-run-manager.js";
import { AgentTeamRunManager } from "../../../agent-team-execution/services/agent-team-run-manager.js";
import { appConfigProvider } from "../../../config/app-config-provider.js";
import { collaboratorPortOf } from "../../../run-history/services/run-collaborator-port.js";
import { getStandaloneAgentRunRootManager } from "../../../standalone-agent-run-root/services/standalone-agent-run-root-manager.js";

/** The candidates query's collaborator port of a run (`collaboratorPortOf`), over the process roots. */
export const resolveCollaboratorRootPort = (
  rootSubjectKind: RootSubjectKind,
  rootRunId: string,
  focusedAgentRunId?: string | null,
): Promise<CollaboratorRootPort | null> => collaboratorPortOf({
  memoryDir: appConfigProvider.config.getMemoryDir(),
  activeAgentRoot: (runId) => getStandaloneAgentRunRootManager().getActive(runId),
  activeTeamRun: (teamRunId) => AgentTeamRunManager.getInstance().getActiveTeamRun(teamRunId),
  activeOrgRun: (orgRunId) => AgentOrgRunManager.getInstance().getActive(orgRunId),
}, rootSubjectKind, rootRunId, focusedAgentRunId);
