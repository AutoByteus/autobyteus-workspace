import { AutoByteusStreamEventConverter } from '../../../../../../autobyteus-server-ts/dist/agent-execution/backends/autobyteus/events/autobyteus-stream-event-converter.js';
import { TeamAgentEventAdapter } from '../../../../../../autobyteus-server-ts/dist/agent-team-execution/services/team-agent-event-adapter.js';
import { AgentRunEventMessageMapper } from '../../../../../../autobyteus-server-ts/dist/services/agent-streaming/agent-run-event-message-mapper.js';

const nativeSegment = {
  event_type: 'segment_event',
  data: {
    event_type: 'SEGMENT_CONTENT',
    turn_id: 'turn-real-shape',
    segment_id: 'segment-real-shape',
    segment_type: 'text',
    payload: { delta: 'visible delta' },
  },
  timestamp: new Date('2026-08-12T20:00:00.000Z'),
};

const converted = new AutoByteusStreamEventConverter('run-real-shape').convert(nativeSegment);
if (!converted) throw new Error('converter unexpectedly filtered the segment');

const standaloneWire = JSON.parse(new AgentRunEventMessageMapper().map(converted).toJson());
const teamAdmission = new TeamAgentEventAdapter(() => ({
  rootTeamRunId: 'root-team-run',
  taskTeamRunIds: [],
  memberAddress: '/Teacher',
  taskAgentRunId: null,
})).adapt(converted);

const evidence = { nativeSegment, converted, standaloneWire, teamAdmission };
console.log(JSON.stringify(evidence, null, 2));

if (converted.payload.id !== 'segment-real-shape') throw new Error('expected current converter id');
if (Object.hasOwn(converted.payload, 'segment_id')) throw new Error('converter unexpectedly emitted segment_id');
if (standaloneWire.payload.id !== 'segment-real-shape') throw new Error('standalone projection lost current id');
if (teamAdmission.kind !== 'rejected' || !teamAdmission.message.includes('segment_id is required')) {
  throw new Error(`expected exact Team rejection, got ${JSON.stringify(teamAdmission)}`);
}
