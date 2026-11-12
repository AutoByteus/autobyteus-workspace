import { RunViewStreams } from "../../src/agent-collaboration/delegation/run-view-stream.js";
import { isAgentOrgMessageEvent } from "../../src/agent-org-execution/domain/agent-org-run-event.js";
import { isTeamRunMessageEvent } from "../../src/agent-team-execution/domain/team-run-event.js";
import { isStandaloneRootMessageEvent } from "../../src/standalone-agent-run-root/domain/standalone-root-event.js";

/** Each run's view stream, with each root kind's message rule, as the composition root creates them (SR-062). */
export const testViewStreams = (): RunViewStreams =>
  new RunViewStreams({ agent: isStandaloneRootMessageEvent, agent_team: isTeamRunMessageEvent, agent_org: isAgentOrgMessageEvent });
