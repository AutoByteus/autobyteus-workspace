import type { DelegationIndex } from "../../src/agent-collaboration/delegation/delegation-index.js";
import { RunViewStreams, type RunViewStream } from "../../src/agent-collaboration/delegation/run-view-stream.js";
import { MessageViewScope } from "../../src/agent-collaboration/delegation/message-view-scope.js";
import type { MessageParties, MessagePublication } from "../../src/agent-collaboration/execution/communication/message-publication.js";
import type { RootExecutionIdentity } from "../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import type { CollaborationCommunicationMessage } from "../../src/agent-collaboration/execution/communication/collaboration-communication-message.js";
import { agentOrgMessageEvent, isAgentOrgMessageEvent } from "../../src/agent-org-execution/domain/agent-org-run-event.js";
import { isTeamRunMessageEvent, teamRunMessageEvent } from "../../src/agent-team-execution/domain/team-run-event.js";
import { isStandaloneRootMessageEvent, standaloneRootMessageEvent } from "../../src/standalone-agent-run-root/domain/standalone-root-event.js";

/** A tree with no delegations: each run is its own chain (its messages reach only its own view). */
const NO_DELEGATIONS: Pick<DelegationIndex, "chainOf" | "collaborationTreeOf"> = { chainOf: (run) => [run], collaborationTreeOf: () => ({ rows: () => [] }) as never };

/**
 * Each run's view stream, with each root kind's message rule and message event, as the composition root creates them
 * (SR-062), and the node's message feed over them (SR-072), over `tree` (none by default).
 */
export const testViewStreams = (tree: Pick<DelegationIndex, "chainOf" | "collaborationTreeOf"> = NO_DELEGATIONS): RunViewStreams =>
  new RunViewStreams({ agent: isStandaloneRootMessageEvent, agent_team: isTeamRunMessageEvent, agent_org: isAgentOrgMessageEvent },
    { tree, scope: new MessageViewScope({ tree }), events: { agent: standaloneRootMessageEvent, agent_team: teamRunMessageEvent, agent_org: agentOrgMessageEvent } });

/** A message feed for a port or root built alone in a test, publishing into `streams` (its own view, none by default). */
export const testMessageFeed = (streams: RunViewStreams = testViewStreams()) => streams.messages;

/**
 * The node's message feed into one stream alone: the view of `view`, a root built alone in a test, with no delegations
 * (SR-072). It applies the views' one rule (`MessageViewScope`, autobyteus-565) for that view.
 */
export const messageFeedInto = <TEvent>(stream: Pick<RunViewStream<TEvent>, "publish">,
  event: (input: Readonly<{ message: CollaborationCommunicationMessage; parties: MessageParties }>) => TEvent, view: RootExecutionIdentity) => {
  const scope = new MessageViewScope({ tree: NO_DELEGATIONS });
  return { publish: (publication: MessagePublication) => { if (scope.inView(view, publication)) stream.publish(event(publication)); } };
};

/** A message feed for a test whose messages reach no view. */
export const NO_MESSAGE_FEED = Object.freeze({ publish: () => undefined });
