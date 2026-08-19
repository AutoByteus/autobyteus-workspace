import { AutoByteusStreamEventConverter } from '../../../../../../autobyteus-server-ts/dist/agent-execution/backends/autobyteus/events/autobyteus-stream-event-converter.js';
import { TeamAgentEventAdapter } from '../../../../../../autobyteus-server-ts/dist/agent-team-execution/services/team-agent-event-adapter.js';
import { createTeamExecutionAddress } from '../../../../../../autobyteus-server-ts/dist/agent-team-execution/domain/team-execution-address.js';

const address = createTeamExecutionAddress({
  rootTeamRunId: 'root-team-run',
  taskTeamRunIds: [],
  memberAddress: '/Teacher',
  taskAgentRunId: null,
});
const nativeContent = {
  event_type: 'segment_event',
  data: {
    event_type: 'content',
    segment_id: 'seg-live-shape',
    turn_id: 'turn-live-shape',
    payload: { delta: 'visible content' },
  },
};
const converted = new AutoByteusStreamEventConverter('teacher-agent-run').convert(nativeContent);
const admitted = new TeamAgentEventAdapter(() => address).adapt(converted);
const result = {
  nativeContent,
  converted,
  convertedHasCanonicalId: converted?.payload?.id === 'seg-live-shape',
  convertedHasSegmentType: Object.hasOwn(converted?.payload ?? {}, 'segment_type'),
  admitted,
  expectedCurrentBehavior: 'publish exact SEGMENT_CONTENT using canonical id and the segment type established by its matching SEGMENT_START',
  observedCurrentBehavior: admitted.kind,
  pass: false,
};
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (admitted.kind !== 'rejected' || admitted.message !== 'Rejected SEGMENT_CONTENT: segment_type is required') {
  process.exitCode = 2;
}
