import { beforeEach, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useAgentActivityStore } from '../agentActivityStore';
import type { CompactionActivity } from '~/types/activity/RunActivity';
import { projectCompactionStatusToActivity } from '~/services/agentStreaming/handlers/compactionActivityProjection';
import { buildActivitiesFromProjection } from '~/services/runHydration/runProjectionActivityHydration';
import { isRunActivityComplete } from '~/services/activity/runActivityWindowPolicy';
import { getCompactionMessage } from '~/utils/compactionActivityPresentation';

const native = (id = 'op', phase: CompactionActivity['phase'] = 'started'): CompactionActivity => ({
  kind: 'compaction', activityId: `compaction:operation:${id}`, compactionOperationId: id,
  phase, message: getCompactionMessage({ phase }), timestamp: new Date(1000), updatedAt: new Date(2000),
  centerTimelineTimestamp: new Date(2000), turnId: 'turn-7', requestedTurnId: 'turn-6', executionTurnId: 'turn-7',
  selectedBlockCount: 4, rawTraceCount: 12, summarizerProvider: 'openai', compactionModelIdentifier: 'model',
});
beforeEach(() => setActivePinia(createPinia()));
it.each(['requested', 'started'] as const)('settles exact native %s without inventing metadata, idempotently', phase => {
  const s = useAgentActivityStore(), a = native('op', phase); s.upsertCompactionActivity('run', a);
  const status = s.applyConfirmedNativeTermination('run', [a.activityId], a, new Date(3000));
  const stopped = s.getCompactionActivities('run')[0];
  expect(stopped).toEqual({ ...a, phase: 'stopped', message: 'Stopped', updatedAt: new Date(3000) });
  expect(status).toMatchObject({ phase: 'stopped', message: 'Stopped', rawTraceCount: 12 });
  expect(isRunActivityComplete(stopped)).toBe(true);
  const revision = s.getActivityContentRevision('run');
  s.applyConfirmedNativeTermination('run', [a.activityId], status, new Date(9000));
  expect(s.getActivityContentRevision('run')).toBe(revision); expect(s.getCompactionActivities('run')[0]).toEqual(stopped);
});
it.each(['completed', 'failed', 'stopped'] as const)('never overwrites known %s or creates absent cards', phase => {
  const s = useAgentActivityStore(), a = native('op', phase); s.upsertCompactionActivity('run', a);
  const revision = s.getActivityContentRevision('run');
  expect(s.applyConfirmedNativeTermination('run', [a.activityId], a)).toEqual(a);
  expect(s.getActivityContentRevision('run')).toBe(revision);
  s.applyConfirmedNativeTermination('absent', [a.activityId], a);
  expect(s.getActivities('absent')).toEqual([]);
});
it.each(['provider','sourceSurface','boundaryKey','providerEventId','providerSessionId'])('excludes external boundary metadata %s', field => {
  const s = useAgentActivityStore(), a = { ...native(), [field]: 'external' };
  s.upsertCompactionActivity('run', a); s.applyConfirmedNativeTermination('run', [a.activityId], a);
  expect(s.getNativeCompactionActivityIds('run')).toEqual([]); expect(s.getCompactionActivities('run')[0].phase).toBe('started');
  s.replaceProjectionActivitiesIfRevisions([{ runId: 'run', expectedRevision: s.getActivityContentRevision('run'), activities: [] }]);
  expect(s.getActivities('run')).toEqual([]);
});
it('requires native operation identity and exact run/id, never a latest-row or turn fallback', () => {
  const s = useAgentActivityStore(), a = { ...native(), activityId: 'compaction:turn-7', compactionOperationId: null };
  s.upsertCompactionActivity('run', a); s.upsertCompactionActivity('other', native());
  s.applyConfirmedNativeTermination('run', [a.activityId, native().activityId], a);
  expect(s.getCompactionActivities('run')[0].phase).toBe('started'); expect(s.getCompactionActivities('other')[0].phase).toBe('started');
});
it('atomically retains only uncovered terminal native facts, dedupes and never downgrades them from projection', () => {
  const s = useAgentActivityStore();
  for (const phase of ['completed','failed','stopped','started'] as const) s.upsertCompactionActivity('a', native(phase, phase));
  s.upsertSystemInstructionActivity('a', { kind: 'system_instruction', activityId: 'old-system', content: 'old', timestamp: new Date(500) });
  s.upsertCompactionActivity('b', native('b', 'stopped'));
  const replacement = { runId: 'a', expectedRevision: s.getActivityContentRevision('a'), activities: [native('completed', 'started')] };
  expect(s.replaceProjectionActivitiesIfRevisions([replacement, { runId: 'b', expectedRevision: 0, activities: [] }])).toBe('conflict');
  expect(s.getActivities('a')).toHaveLength(5);
  expect(s.replaceProjectionActivitiesIfRevisions([replacement, { runId: 'b', expectedRevision: s.getActivityContentRevision('b'), activities: [] }])).toBe('applied');
  expect(s.getCompactionActivities('a').map(a => a.phase)).toEqual(['completed','failed','stopped']);
  expect(s.getActivities('b')).toHaveLength(1);
  s.upsertCompactionActivity('a', native('failed','started')); // a genuine fresh live attempt is not a projection
  expect(s.getCompactionActivities('a').find(a => a.compactionOperationId === 'failed')?.phase).toBe('started');
});
it('rejects duplicate run replacement atomically; explicit clear and cold hydration do not reconstruct facts', () => {
  const s = useAgentActivityStore(); s.upsertCompactionActivity('run', native('op','stopped'));
  const r = { runId:'run', expectedRevision:s.getActivityContentRevision('run'), activities: [] };
  expect(s.replaceProjectionActivitiesIfRevisions([r,r])).toBe('conflict');
  s.clearActivities('run');
  s.replaceProjectionActivitiesIfRevisions([{ ...r, expectedRevision:s.getActivityContentRevision('run') }]);
  expect(s.getActivities('run')).toEqual([]);
});
it('sorts merged facts chronologically, preserves highlight/approval and applies the normal hundred-item window', () => {
  const s = useAgentActivityStore(), a = native('early','stopped'); s.upsertCompactionActivity('run', a);
  s.setHighlightedActivity('run', a.activityId);
  const projected = Array.from({ length:101 }, (_,i) => ({ kind:'system_instruction' as const, activityId:`s-${i}`, content:'saved', timestamp:new Date(4000+i) }));
  s.replaceProjectionActivitiesIfRevisions([{runId:'run', expectedRevision:s.getActivityContentRevision('run'), activities:projected}]);
  expect(s.getActivities('run')).toHaveLength(100); expect(s.getHighlightedActivityId('run')).toBeNull();
  expect(s.getActivities('run')[0].activityId).toBe('s-1'); expect(s.hasAwaitingApproval('run')).toBe(false);
});
it('maps stopped through live and saved presentation with exact copy and existing operation identity', () => {
  const live = projectCompactionStatusToActivity({ phase:'stopped', compaction_operation_id:'op', turn_id:'turn-7', raw_trace_count:12 }, {runId:'run', previousStatus:null, now:new Date(4000)});
  expect(live.activity).toMatchObject({ activityId:native().activityId, phase:'stopped', message:'Stopped', rawTraceCount:12 });
  const saved = buildActivitiesFromProjection([{kind:'compaction', activityId:native().activityId, compactionOperationId:'op', phase:'stopped', message:'obsolete error', ts:4}]);
  expect(saved[0]).toMatchObject({ phase:'stopped', message:'Stopped', centerTimelineTimestamp:new Date(4000) });
});

import { agentPresentationPayloadSchemas } from '@autobyteus/agent-presentation-contracts';
import { toAgentPresentationProjectionMessage, toAgentProjectionMessage } from '~/services/agentStreaming/teamStreamDtoAdapters';
import { parseTeamStreamServerMessage } from '@autobyteus/team-stream-contracts';
it('strict shared and Team envelopes carry stopped through both Team and Org renderer adapters', () => {
  const fields = Object.keys(agentPresentationPayloadSchemas.COMPACTION_STATUS.shape);
  const payload = agentPresentationPayloadSchemas.COMPACTION_STATUS.parse({
    ...Object.fromEntries(fields.map(field => [field, null])),
    phase:'stopped', compaction_operation_id:'op', turn_id:'turn-7', raw_trace_count:12,
  });
  const org = toAgentPresentationProjectionMessage({type:'COMPACTION_STATUS',payload},'run');
  const team = parseTeamStreamServerMessage({type:'COMPACTION_STATUS',payload:{...payload,agent_run_id:'run',change_sequence:1}});
  const projected = toAgentProjectionMessage(team as any,'run');
  expect(org.payload).toMatchObject({phase:'stopped',compaction_operation_id:'op',raw_trace_count:12});
  expect(projected.payload).toMatchObject(org.payload);
});
