import type { DelegationIndex } from "../../src/agent-collaboration/delegation/delegation-index.js";
import { RunViewStreams, type RunViewStream } from "../../src/agent-collaboration/delegation/run-view-stream.js";
import type { CollaborationCommunicationMessage } from "../../src/agent-collaboration/execution/communication/collaboration-communication-message.js";
import { agentOrgMessageEvent, isAgentOrgMessageEvent } from "../../src/agent-org-execution/domain/agent-org-run-event.js";
import { isTeamRunMessageEvent, teamRunMessageEvent } from "../../src/agent-team-execution/domain/team-run-event.js";
import { isStandaloneRootMessageEvent, standaloneRootMessageEvent } from "../../src/standalone-agent-run-root/domain/standalone-root-event.js";

/** A tree with no delegations: each run is its own chain (its messages reach only its own view). */
const NO_DELEGATIONS: Pick<DelegationIndex, "chainOf"> = { chainOf: (run) => [run] };

/**
 * Each run's view stream, with each root kind's message rule and message event, as the composition root creates them
 * (SR-062), and the node's message feed over them (SR-072), over `tree` (none by default).
 */
export const testViewStreams = (tree: Pick<DelegationIndex, "chainOf"> = NO_DELEGATIONS): RunViewStreams =>
  new RunViewStreams({ agent: isStandaloneRootMessageEvent, agent_team: isTeamRunMessageEvent, agent_org: isAgentOrgMessageEvent },
    { tree, events: { agent: standaloneRootMessageEvent, agent_team: teamRunMessageEvent, agent_org: agentOrgMessageEvent } });

/** A message feed for a port or root built alone in a test, publishing into `streams` (its own view, none by default). */
export const testMessageFeed = (streams: RunViewStreams = testViewStreams()) => streams.messages;

/** The node's message feed into one stream alone: a root built alone in a test, with no delegations (SR-072). */
export const messageFeedInto = <TEvent>(stream: Pick<RunViewStream<TEvent>, "publish">, event: (message: CollaborationCommunicationMessage) => TEvent) =>
  ({ publish: ({ message }: Readonly<{ message: CollaborationCommunicationMessage }>) => { stream.publish(event(message)); } });

/** A message feed for a test whose messages reach no view. */
export const NO_MESSAGE_FEED = Object.freeze({ publish: () => undefined });
