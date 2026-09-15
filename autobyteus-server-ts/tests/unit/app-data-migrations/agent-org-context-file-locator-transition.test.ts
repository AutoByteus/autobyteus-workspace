import { AgentOrgTokenAttributionTransition } from "../../../src/app-data-migrations/migrations/agent-org-flat-team-families-v1/agent-org-token-attribution-transition.js";
const emptyTokens = (memory: string) => new AgentOrgTokenAttributionTransition(memory, {
  async *listClaimedRoots() {}, async convertRoot() { return 0; },
});
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { RunMemoryFileStore } from 'autobyteus-ts/memory/store/run-memory-file-store.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { appConfigProvider } from '../../../src/config/app-config-provider.js';
import type { AppConfig } from '../../../src/config/app-config.js';
import { AgentOrgFlatTeamFamiliesV1AppDataMigration } from '../../../src/app-data-migrations/migrations/agent-org-flat-team-families-v1/agent-org-flat-team-families-v1-app-data-migration.js';
import { AtomicRunPackageFileCommitWriter } from '../../../src/run-history/store/atomic-run-package-file-commit-writer.js';
import { RootRunPackageReadinessIndex, resetRootRunPackageReadinessIndex } from '../../../src/run-history/services/root-run-package-readiness-index.js';
import { AgentOrgExecutionTreeLocationService } from '../../../src/agent-org-execution/services/agent-org-execution-tree-location-service.js';
import { ContextFileOwnerResolver } from '../../../src/context-files/services/context-file-owner-resolver.js';
import { testAgentNode, testExecutionTree } from '../../fixtures/current-team-run-fixtures.js';
import { testOrgTeamNode, testOrgAgentNode } from '../../fixtures/current-agent-org-run-fixtures.js';

const roots: string[] = [];
afterEach(async () => { vi.restoreAllMocks(); for (const root of roots.splice(0)) { resetRootRunPackageReadinessIndex(path.join(root, 'memory')); await fs.rm(root, { recursive: true, force: true }); } });
const json = (v: unknown) => JSON.stringify(v, null, 2) + '\n';
const put = async (file: string, text: string | Buffer) => { await fs.mkdir(path.dirname(file), { recursive: true }); await fs.writeFile(file, text); };
const treeName = 'team_run_execution_tree.json';
const orgName = 'agent_org_run_execution_tree.json';
const old = (team: string, address: string, file = 'ctx_x__image.png') => `/rest/team-runs/${team}/members/${encodeURIComponent(address)}/context-files/${file}`;
const current = (agent: string, file = 'ctx_x__image.png') => `/rest/agent-org-runs/org/agent-runs/${agent}/context-files/${file}`;
const trace = (uri: string, id = 'trace-id') => JSON.stringify({ id, trace_type: 'user', turn_id: 'turn', seq: 4, ts: 123, content: uri, media: { images: [uri] }, tool_args: { text: uri } });
const env = async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'org-locator-cutover-')); roots.push(root);
  vi.spyOn(appConfigProvider.config, 'getBaseUrl').mockReturnValue('https://installation.test');
  const memory = path.join(root, 'memory'), source = path.join(memory, 'agent_teams', 'org'), target = path.join(memory, 'agent_orgs', 'org');
  const config = { getAgentTeamsDir: () => path.join(root, 'defs', 'teams'), getAgentOrgsDir: () => path.join(root, 'defs', 'orgs'), getBaseUrl: () => 'https://installation.test' } as AppConfig;
  const base = testExecutionTree({ rootTeamRunId: 'org', children: [testAgentNode('/direct', { agentRunId: 'direct' })], coordinatorAddress: '/direct' });
  const tree = { ...base, rootTeam: { ...base.rootTeam, members: [...base.rootTeam.members,
    testOrgTeamNode({ address: '/team', teamRunId: 'mounted', coordinatorAddress: '/team/lead', members: [testOrgAgentNode('/team/lead', 'lead')] })],
    taskExecutions: [{ address: '/direct', agentRunId: 'task', platformAgentRunId: null, startedAt: '2026-09-01T00:00:01.000Z', settledAt: '2026-09-01T00:00:02.000Z' }],
  } };
  await put(path.join(source, treeName), json(tree));
  await put(path.join(source, 'task_delegation_records.json'), json({ schemaVersion: 1, rootTeamRunId: 'org', records: [{
    taskId: 'task-record', delegatorAgentRunId: 'lead', recipientAddress: '/direct', taskExecution: { agentRunId: 'task' },
    description: 'Retained assignment', referenceFiles: [], status: 'accepted', createdAt: '2026-09-01T00:00:01.000Z',
    updates: [{ submissionId: 'submission', message: 'result', referenceFiles: [], createdAt: '2026-09-01T00:00:01.100Z' },
      { reviewId: 'review', reviewedSubmissionId: 'submission', decision: 'accept', comment: null, referenceFiles: [], createdAt: '2026-09-01T00:00:01.200Z' }],
  }] }));
  await put(path.join(source, 'team_communication_messages.json'), json({ schemaVersion: 1, rootTeamRunId: 'org', messages: [] }));
  await fs.mkdir(config.getAgentTeamsDir(), { recursive: true }); await fs.mkdir(config.getAgentOrgsDir(), { recursive: true });
  const migrate = (writer = new AtomicRunPackageFileCommitWriter()) => new AgentOrgFlatTeamFamiliesV1AppDataMigration(memory, config, writer, emptyTokens(memory)).execute();
  return { root, memory, source, target, tree, migrate };
};

describe('initial family locator transition: actual files, no user data', () => {
  it('preserves candidate cross-view owner and archive bytes without touching outside-cohort histories, then strictly reads final bytes after the root move', async () => {
    const e = await env();
    const uri = old('mounted', '/team/lead'), absolute = 'https://installation.test' + uri + '?download=1#ref';
    const leadFile = path.join(e.source, 'mounted', 'lead', 'context_files', 'ctx_x__image.png');
    const payload = Buffer.from([0, 17, 254, 255]); await put(leadFile, payload);
    const taskFile = path.join(e.source, 'task', 'context_files', 'ctx_task__a.txt'); await put(taskFile, 'task bytes');
    const tasksPath = path.join(e.source, 'task_delegation_records.json');
    const tasks = JSON.parse(await fs.readFile(tasksPath, 'utf8'));
    tasks.records[0].referenceFiles = [uri]; tasks.records[0].updates.forEach((u: any) => { u.referenceFiles = [uri]; });
    await put(tasksPath, json(tasks));
    const message = { messageId: 'message', senderAgentRunId: 'direct', receiverAgentRunId: 'lead', content: uri,
      messageType: 'ordinary', referenceFiles: [uri], createdAt: '2026-09-01T00:00:01.000Z' };
    await put(path.join(e.source, 'team_communication_messages.json'), json({ schemaVersion: 1, rootTeamRunId: 'org', messages: [message] }));
    const sourceTrace = '  { "id":"untouched", "content":"' + uri + '" }\r\n' + trace(absolute) + '\r\n';
    await put(path.join(e.source, 'direct', 'raw_traces_active.jsonl'), sourceTrace);
    const archived = trace(old('org', '/direct', 'ctx_task__a.txt'), 'archived');
    await put(path.join(e.source, 'direct', 'raw_traces_000001.jsonl'), archived + '\n');
    await put(path.join(e.source, 'direct', 'raw_traces_manifest.json'), json({ schema_version: 1, next_segment_index: 2, segments: [{
      index: 1, file_name: 'raw_traces_000001.jsonl', boundary_type: 'native_compaction', boundary_key: 'compaction',
      archived_at: 123, first_trace_id: 'archived', last_trace_id: 'archived', record_count: 1, status: 'complete',
    }] }));
    const standalone = path.join(e.memory, 'agents', 'viewer', 'raw_traces_active.jsonl'); await put(standalone, trace(uri));
    const flat = path.join(e.memory, 'agent_teams', 'flat');
    const flatTree = json(testExecutionTree({ rootTeamRunId: 'flat', children: [testAgentNode('/lead', { agentRunId: 'flat-agent' })], coordinatorAddress: '/lead' }));
    await put(path.join(flat, treeName), flatTree);
    await put(path.join(flat, 'task_delegation_records.json'), json({ schemaVersion: 1, rootTeamRunId: 'flat', records: [] }));
    await put(path.join(flat, 'team_communication_messages.json'), json({ schemaVersion: 1, rootTeamRunId: 'flat', messages: [] }));
    const flatTrace = path.join(flat, 'flat-agent', 'raw_traces_active.jsonl'); await put(flatTrace, trace(uri));
    const writer = new AtomicRunPackageFileCommitWriter(), write = vi.spyOn(writer, 'writeSerializedText');
    expect((await e.migrate(writer)).status).toBe('SUCCEEDED');
    expect(await fs.readFile(path.join(flat, treeName), 'utf8')).toBe(flatTree);
    const finalTasks = JSON.parse(await fs.readFile(path.join(e.target, 'agent_org_task_delegation_records.json'), 'utf8'));
    expect(finalTasks.records).toEqual(tasks.records.map((task: any) => ({ ...task, referenceFiles: [current('lead')], updates: task.updates.map((u: any) => ({ ...u, referenceFiles: [current('lead')] })) })));
    expect(JSON.parse(await fs.readFile(path.join(e.target, 'agent_org_communication_messages.json'), 'utf8')).messages).toEqual([{ ...message, referenceFiles: [current('lead')] }]);
    const output = await fs.readFile(path.join(e.target, 'direct', 'raw_traces_active.jsonl'), 'utf8');
    expect(output.split('\r\n')[0]).toBe(sourceTrace.split('\r\n')[0]);
    const changed = JSON.parse(output.split('\r\n')[1]!);
    expect(changed).toEqual({ ...JSON.parse(trace(absolute)), media: { images: ['https://installation.test' + current('lead') + '?download=1#ref'] } });
    expect(JSON.parse(await fs.readFile(standalone, 'utf8')).media.images).toEqual([uri]);
    expect(JSON.parse(await fs.readFile(flatTrace, 'utf8')).media.images).toEqual([uri]);
    expect(JSON.parse(await fs.readFile(path.join(e.target, 'direct', 'raw_traces_000001.jsonl'), 'utf8')).media.images).toEqual([current('task', 'ctx_task__a.txt')]);
    expect(await fs.readFile(path.join(e.target, 'mounted', 'lead', 'context_files', 'ctx_x__image.png'))).toEqual(payload);
    expect(new RunMemoryFileStore(path.join(e.target, 'direct')).readCompleteRawTraceArchiveSegmentDictsByFileName('raw_traces_000001.jsonl'))
      .toEqual([{ ...JSON.parse(archived), media: { images: [current('task', 'ctx_task__a.txt')] } }]);
    const resolver = new ContextFileOwnerResolver({ locations: new AgentOrgExecutionTreeLocationService({ memoryDir: e.memory }) });
    const owner = await resolver.resolveFinalOwner({ kind: 'org_member_final', orgRunId: 'org', agentRunId: 'lead' });
    expect('memoryDir' in owner && owner.memoryDir).toBe(path.join(e.target, 'mounted', 'lead'));
    write.mockClear(); expect((await e.migrate(writer)).status).toBe('SUCCEEDED');
    expect(write.mock.calls.filter(([input]) => input.file === 'context_file_locators')).toHaveLength(0);
    await put(standalone, trace('/not-an-attachment')); await put(flatTrace, trace('/not-an-attachment'));
    const readiness = new RootRunPackageReadinessIndex(e.memory); await readiness.rebuild();
    expect(readiness.listDiagnostics()).toEqual([]); expect(readiness.listAdmitted('agent_org')).toEqual(['org']); expect(readiness.listAdmitted('agent_team')).toEqual(['flat']);
  });


  it('transforms file-only user facts in actual complete nested archive paths and preserves current no-op/archive metadata', async () => {
    const e = await env();
    const filename = 'ctx_task__notes.txt', uri = old('org', '/direct', filename);
    await put(path.join(e.source, 'task', 'context_files', filename), 'exact task text');
    const row = { id: 'file-only', trace_type: 'user', source_event: 'native', turn_id: 't',
      seq: 2, ts: 123, content: '', file_attachments: [{ uri, file_type: 'text', file_name: 'accepted label.txt' }] };
    const unchanged = JSON.stringify({ id: 'old-media-only', trace_type: 'user', content: 'no association facts' });
    const fileName = 'raw_traces_archive/segment-retained.jsonl';
    const manifest = { schema_version: 1, next_segment_index: 2, segments: [{
      index: 1, file_name: fileName, boundary_type: 'native_compaction', boundary_key: 'complete-archive',
      archived_at: 321, first_trace_id: row.id, last_trace_id: row.id, record_count: 2, status: 'complete',
    }] };
    await put(path.join(e.source, 'direct', fileName), unchanged + '\r\n' + JSON.stringify(row) + '\r\n');
    await put(path.join(e.source, 'direct', 'raw_traces_manifest.json'), json(manifest));
    const writer = new AtomicRunPackageFileCommitWriter(), write = vi.spyOn(writer, 'writeSerializedText');
    expect((await e.migrate(writer)).status).toBe('SUCCEEDED');
    const targetFile = path.join(e.target, 'direct', fileName);
    const expected = { ...row, file_attachments: [{ ...row.file_attachments[0], uri: current('task', filename) }] };
    const bytes = await fs.readFile(targetFile, 'utf8');
    expect(bytes).toBe(unchanged + '\r\n' + JSON.stringify(expected) + '\r\n');
    expect(JSON.parse(await fs.readFile(path.join(e.target, 'direct', 'raw_traces_manifest.json'), 'utf8'))).toEqual(manifest);
    expect(new RunMemoryFileStore(path.join(e.target, 'direct')).readCompleteRawTraceArchiveSegmentDictsByFileName(fileName))
      .toEqual([JSON.parse(unchanged), expected]);
    write.mockClear(); expect((await e.migrate(writer)).status).toBe('SUCCEEDED');
    expect(write.mock.calls.filter(([input]) => input.file === 'context_file_locators')).toEqual([]);
    expect(await fs.readFile(targetFile, 'utf8')).toBe(bytes);
    const readiness = new RootRunPackageReadinessIndex(e.memory); await readiness.rebuild();
    expect(readiness.listAdmitted('agent_org')).toEqual(['org']);
    // Required byte loss is diagnosed even when the only reference lives in a complete archive.
    await fs.unlink(path.join(e.target, 'task', 'context_files', filename));
    await readiness.rebuild(); expect(readiness.listAdmitted('agent_org')).toEqual([]);
  });

  it.each(['image', 'retired'])('rejects invalid present file-only %s facts before writing/moving the initial package', async type => {
    const e = await env();
    const source = path.join(e.source, 'direct', 'raw_traces_active.jsonl');
    const text = JSON.stringify({ trace_type: 'user', file_attachments: [{ uri: current('direct'), file_type: type, file_name: null }] });
    await put(source, text);
    const writer = new AtomicRunPackageFileCommitWriter(), write = vi.spyOn(writer, 'writeSerializedText');
    expect((await e.migrate(writer)).status).toBe('FAILED');
    expect(await fs.readFile(source, 'utf8')).toBe(text);
    expect(write.mock.calls.filter(([input]) => input.file === 'context_file_locators')).toEqual([]);
    await expect(fs.stat(e.target)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it.each(['missing', 'ambiguous'])('fails %s owner proof before any record write, preserves bytes and withholds admission', async (scenario) => {
    const e = await env(), uri = old('org', '/direct'), file = path.join(e.source, 'direct', 'raw_traces_active.jsonl');
    await put(file, trace(uri));
    if (scenario === 'ambiguous') for (const agent of ['direct', 'task']) await put(path.join(e.source, agent, 'context_files', 'ctx_x__image.png'), agent);
    const before = await fs.readFile(file), writer = new AtomicRunPackageFileCommitWriter(), write = vi.spyOn(writer, 'writeSerializedText');
    expect((await e.migrate(writer)).status).toBe('FAILED'); expect(await fs.readFile(file)).toEqual(before);
    expect(write.mock.calls.filter(([input]) => input.file === 'context_file_locators')).toHaveLength(0);
    await expect(fs.stat(e.target)).rejects.toMatchObject({ code: 'ENOENT' });
    const readiness = new RootRunPackageReadinessIndex(e.memory); await readiness.rebuild(); expect(readiness.listAdmitted('agent_org')).toEqual([]); expect(readiness.listAdmitted('agent_team')).toEqual([]);
  });

  it('retries a partially committed locator file without re-encoding or duplicating traces, then completes the original rename', async () => {
    const e = await env(); await put(path.join(e.source, 'mounted', 'lead', 'context_files', 'ctx_x__image.png'), 'lead bytes');
    for (const agent of ['direct', 'task']) await put(path.join(e.source, agent, 'raw_traces_active.jsonl'), trace(old('mounted', '/team/lead'), agent));
    const writer = new AtomicRunPackageFileCommitWriter(), actual = writer.writeSerializedText.bind(writer); let count = 0;
    vi.spyOn(writer, 'writeSerializedText').mockImplementation(async input => {
      if (input.file === 'context_file_locators' && ++count === 2) return { outcome: 'not_renamed', file: input.file, stage: 'rename', cause: new Error('injected rename failure') };
      return actual(input);
    });
    expect((await e.migrate(writer)).status).toBe('FAILED');
    expect(JSON.parse(await fs.readFile(path.join(e.source, 'direct', 'raw_traces_active.jsonl'), 'utf8')).media.images).toEqual([current('lead')]);
    expect(JSON.parse(await fs.readFile(path.join(e.source, 'task', 'raw_traces_active.jsonl'), 'utf8')).media.images).toEqual([old('mounted', '/team/lead')]);
    expect((await e.migrate()).status).toBe('SUCCEEDED');
    for (const agent of ['direct', 'task']) expect(JSON.parse(await fs.readFile(path.join(e.target, agent, 'raw_traces_active.jsonl'), 'utf8'))).toEqual({ ...JSON.parse(trace(old('mounted', '/team/lead'), agent)), media: { images: [current('lead')] } });
  });

  it.each(['indeterminate', 'after-commit', 'reread-mismatch'])('requires committed locator outcome plus strict reread: %s', async failure => {
    const e = await env(), file = path.join(e.source, 'direct', 'raw_traces_active.jsonl');
    await put(path.join(e.source, 'mounted', 'lead', 'context_files', 'ctx_x__image.png'), 'bytes');
    const original = trace(old('mounted', '/team/lead')); await put(file, original);
    const writer = new AtomicRunPackageFileCommitWriter(), physical = writer.writeSerializedText.bind(writer);
    vi.spyOn(writer, 'writeSerializedText').mockImplementation(async input => {
      const result = await physical(input);
      if (input.file !== 'context_file_locators') return result;
      if (failure === 'indeterminate') return { outcome: 'renamed_finalization_indeterminate', file: input.file, stage: 'sync_directory', cause: new Error('injected directory sync failure') };
      if (failure === 'after-commit') throw new Error('interruption after commit');
      await put(input.filePath, trace(current('missing'))); return result;
    });
    expect((await e.migrate(writer)).status).toBe('FAILED');
    await expect(fs.stat(e.target)).rejects.toMatchObject({ code: 'ENOENT' });
    if (failure === 'reread-mismatch') { expect((await e.migrate()).status).toBe('FAILED'); await put(file, original); }
    expect((await e.migrate()).status).toBe('SUCCEEDED');
    expect(JSON.parse(await fs.readFile(path.join(e.target, 'direct', 'raw_traces_active.jsonl'), 'utf8')).media.images).toEqual([current('lead')]);
  });

  it('finishes target-only interrupted cleanup with known Org locators, leaves foreign URLs/prose untouched and rejects invalid current targets', async () => {
    const e = await env(); expect((await e.migrate()).status).toBe('SUCCEEDED');
    await put(path.join(e.target, 'mounted', 'lead', 'context_files', 'ctx_x__image.png'), 'lead bytes');
    const uri = '/rest/agent-org-runs/org/members/%2Fteam%2Flead/context-files/ctx_x__image.png';
    const file = path.join(e.target, 'direct', 'raw_traces_active.jsonl');
    await put(file, trace(uri) + '\n' + trace('https://foreign.test' + uri, 'foreign') + '\n');
    await put(path.join(e.target, treeName), json(e.tree));
    expect((await e.migrate()).status).toBe('SUCCEEDED');
    const rows = (await fs.readFile(file, 'utf8')).trim().split('\n').map(line => JSON.parse(line));
    expect(rows[0].media.images).toEqual([current('lead')]); expect(rows[0].content).toBe(uri); expect(rows[1].media.images).toEqual(['https://foreign.test' + uri]);
    await expect(fs.stat(path.join(e.target, treeName))).rejects.toMatchObject({ code: 'ENOENT' });
    const readiness = new RootRunPackageReadinessIndex(e.memory);
    // Relative current reference to an unknown exact ID is never admitted, even without retired authorities.
    await put(file, trace(current('missing'))); await readiness.rebuild(); expect(readiness.listAdmitted('agent_org')).toEqual([]);
    await put(file, trace(current('lead'))); await readiness.rebuild(); expect(readiness.listDiagnostics()).toEqual([]); expect(readiness.listAdmitted('agent_org')).toEqual(['org']);
  });
});
