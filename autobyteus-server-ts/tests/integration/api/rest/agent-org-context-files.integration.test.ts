import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import fastify, { type FastifyInstance } from 'fastify';
import multipart from '@fastify/multipart';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const config = vi.hoisted(() => ({ root: '' }));
vi.mock('../../../../src/config/app-config-provider.js', () => ({ appConfigProvider: { config: {
  getAppDataDir: () => config.root, getMemoryDir: () => path.join(config.root, 'memory'),
} } }));
import { registerContextFileRoutes } from '../../../../src/api/rest/context-files.js';
import { AgentOrgRunExecutionTreeStore } from '../../../../src/run-history/store/agent-org-run-execution-tree-store.js';
import { AgentOrgExecutionTreeLocationService } from '../../../../src/agent-org-execution/services/agent-org-execution-tree-location-service.js';
import { ContextFileOwnerResolver } from '../../../../src/context-files/services/context-file-owner-resolver.js';
import { ContextFileLayout } from '../../../../src/context-files/store/context-file-layout.js';
import { ContextFileLocalPathResolver } from '../../../../src/context-files/services/context-file-local-path-resolver.js';
import { AgentMemoryLayout } from '../../../../src/agent-memory/store/agent-memory-layout.js';
import { validateAgentOrgRunExecutionTreePayload } from '../../../../src/run-history/store/agent-org-run-execution-tree-schema.js';
import { testAgentOrgExecutionTree, testOrgAgentNode, testOrgTeamNode } from '../../../fixtures/current-agent-org-run-fixtures.js';
import { AgentRunProviderInputNormalizer } from '../../../../src/agent-execution/input/agent-run-provider-input-normalizer.js';
import { AgentInputUserMessage } from 'autobyteus-ts/agent/message/agent-input-user-message.js';
import { ContextFile } from 'autobyteus-ts/agent/message/context-file.js';

const draft = (agentRunId: string, orgRunId = 'org') => ({ kind: 'org_member_draft', orgRunId, agentRunId });
const final = (agentRunId: string, orgRunId = 'org') => ({ kind: 'org_member_final', orgRunId, agentRunId });
let app: FastifyInstance, memoryDir: string, layout: ContextFileLayout, local: ContextFileLocalPathResolver;
let treeFile: string, treeBytes: Buffer;
const upload = async (owner: unknown, content: string) => {
  const boundary = 'org-context-file';
  return app.inject({ method: 'POST', url: '/rest/context-files/upload',
    headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
    payload: `--${boundary}\r\nContent-Disposition: form-data; name="owner"\r\n\r\n${JSON.stringify(owner)}\r\n--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="notes.txt"\r\nContent-Type: text/plain\r\n\r\n${content}\r\n--${boundary}--\r\n`,
  });
};
const finalize = (agentRunId: string, attachments: unknown[], finalOwner = final(agentRunId)) =>
  app.inject({ method: 'POST', url: '/rest/context-files/finalize', payload: {
    draftOwner: draft(agentRunId), finalOwner, attachments,
  } });

beforeEach(async () => {
  config.root = await fs.mkdtemp(path.join(os.tmpdir(), 'org-file-rest-'));
  memoryDir = path.join(config.root, 'memory');
  const direct = testOrgAgentNode('/shared', 'configured-direct');
  const lead = testOrgAgentNode('/delivery/lead', 'configured-lead');
  const team = testOrgTeamNode({ address: '/delivery', teamRunId: 'configured-team', coordinatorAddress: lead.address, members: [lead] });
  const raw = structuredClone(testAgentOrgExecutionTree({ orgRunId: 'org', members: [direct, team] })) as any;
  raw.rootOrg.taskExecutions = [
    { address: direct.address, agentRunId: 'retained-direct', platformAgentRunId: null, startedAt: '2026-09-01T00:00:01.000Z', settledAt: '2026-09-01T00:00:02.000Z' },
    { address: team.address, teamRunId: 'retained-team', members: [{ address: lead.address, agentRunId: 'retained-lead', platformAgentRunId: null }], taskExecutions: [], startedAt: '2026-09-01T00:00:01.000Z', settledAt: '2026-09-01T00:00:02.000Z' },
  ];
  const dir = new AgentMemoryLayout(memoryDir).getOrgDirPath('org');
  await new AgentOrgRunExecutionTreeStore().write(dir, validateAgentOrgRunExecutionTreePayload(raw, 'org'));
  treeFile = path.join(dir, 'agent_org_run_execution_tree.json'); treeBytes = await fs.readFile(treeFile);
  layout = new ContextFileLayout({ appDataDir: config.root, memoryDir });
  local = new ContextFileLocalPathResolver({ layout, baseUrl: 'http://app.test', ownerResolver: new ContextFileOwnerResolver({
    locations: new AgentOrgExecutionTreeLocationService({ memoryDir }), // no runtime manager
  }) });
  app = fastify(); await app.register(multipart); await app.register(registerContextFileRoutes, { prefix: '/rest' });
});
afterEach(async () => {
  vi.restoreAllMocks(); await app.close(); await fs.rm(config.root, { recursive: true, force: true });
});

describe('exact Org attachment REST with actual stored-only identity and filesystem', () => {
  it('returns request-scoped errors for missing, unsafe and cross-owner final files', async () => {
    const missing = await app.inject({
      method: 'GET',
      url: '/rest/agent-org-runs/org/agent-runs/configured-direct/context-files/ctx_missing__notes.txt',
    });
    expect(missing.statusCode).toBe(404);
    expect((await app.inject({
      method: 'GET',
      url: '/rest/agent-org-runs/wrong-org/agent-runs/configured-direct/context-files/ctx_missing__notes.txt',
    })).statusCode).toBe(404);
    expect((await app.inject({
      method: 'GET',
      url: `/rest/agent-org-runs/org/agent-runs/configured-direct/context-files/${encodeURIComponent('../secret.txt')}`,
    })).statusCode).toBe(400);
    expect((await app.inject({
      method: 'GET',
      url: '/rest/agent-org-runs/org/agent-runs/configured-lead/context-files/ctx_missing__notes.txt',
    })).statusCode).toBe(404);
  });

  it('uploads/opens/removes/finalizes distinct bytes for repeated configured/task addresses; retains saved owner across views/reopen', async () => {
    const retained: { locator: string; text: string; file: string }[] = [];
    for (const id of ['configured-direct', 'retained-direct', 'configured-lead', 'retained-lead']) {
      const response = await upload(draft(id), id + ' unique content'); expect(response.statusCode).toBe(200);
      const attachment = response.json();
      expect(attachment.locator).toContain(`/agent-org-runs/org/agent-runs/${id}/context-files/`);
      const preview = await app.inject({ method: 'GET', url: attachment.locator });
      expect(preview.statusCode).toBe(200); expect(preview.body).toBe(id + ' unique content');
      expect(local.resolve(attachment.locator)).toBe(layout.getDraftFilePath(draft(id) as any, attachment.storedFilename));
      const result = await finalize(id, [attachment]); expect(result.statusCode).toBe(200);
      const file = result.json().attachments[0];
      expect((await app.inject({ method: 'GET', url: attachment.locator })).statusCode).toBe(404);
      expect((await app.inject({ method: 'GET', url: file.locator })).body).toBe(id + ' unique content');
      const physical = local.resolve(file.locator)!; expect(physical).toBeTruthy();
      expect(await fs.readFile(physical, 'utf8')).toBe(id + ' unique content');
      // Provider receives the exact physical path, while accepted URI remains unchanged.
      const message = new AgentInputUserMessage('read', undefined, [new ContextFile(file.locator)]);
      const normalized = new AgentRunProviderInputNormalizer(local).normalizeForProvider({ kind: 'start_turn', message });
      expect(normalized.message.contextFiles![0]!.uri).toBe(physical);
      expect(message.contextFiles![0]!.uri).toBe(file.locator);
      retained.push({ locator: file.locator, text: id + ' unique content', file: physical });
      // Remove/clear only draft bytes; removing the former draft is idempotent and keeps final bytes.
      expect((await app.inject({ method: 'DELETE', url: attachment.locator })).statusCode).toBe(204);
      expect(await fs.readFile(physical, 'utf8')).toBe(id + ' unique content');
      const removable = (await upload(draft(id), 'remove me')).json();
      expect((await app.inject({ method: 'DELETE', url: removable.locator })).statusCode).toBe(204);
      expect((await app.inject({ method: 'GET', url: removable.locator })).statusCode).toBe(404);
    }
    expect(new Set(retained.map(a => a.file)).size).toBe(4);
    await app.close(); app = fastify(); await app.register(multipart); await app.register(registerContextFileRoutes, { prefix: '/rest' });
    for (const a of retained.reverse()) expect((await app.inject({ method: 'GET', url: a.locator })).body).toBe(a.text);
    expect(await fs.readFile(treeFile)).toEqual(treeBytes);
  });

  it('rejects retired/extra/missing/unsafe identities and mismatched owner pairs before movement', async () => {
    for (const owner of [{kind:'org_member_draft',orgDraftId:'org',memberAddress:'/shared'},
      {...draft('configured-direct'), memberAddress:'/shared'}, {kind:'org_member_draft',orgRunId:'org'},
      draft('../configured-direct'), draft('configured-direct','..'), draft('unknown'), draft('configured-direct','wrong-root')]) {
      expect((await upload(owner, 'no write')).statusCode).toBe(400);
    }
    const attachment = (await upload(draft('configured-direct'), 'untouched')).json();
    for (const owner of [final('retained-direct'), final('configured-direct','wrong-root'), {kind:'agent_final',runId:'configured-direct'} as any]) {
      expect((await finalize('configured-direct',[attachment],owner)).statusCode).toBe(400);
      expect((await app.inject({method:'GET',url:attachment.locator})).body).toBe('untouched');
    }
    expect((await app.inject({method:'GET',url:'/rest/agent-org-runs/org/agent-runs/unknown/context-files/a.txt'})).statusCode).toBe(404);
    expect((await app.inject({method:'GET',url:'/rest/agent-org-runs/org/agent-runs/%2Fbad/context-files/a.txt'})).statusCode).toBe(400);
    expect((await app.inject({method:'GET',url:'/rest/agent-org-runs/org/members/%2Fshared/context-files/a.txt'})).statusCode).toBe(404);
    expect(local.resolve('/rest/agent-org-runs/org/members/%2Fshared/context-files/a.txt')).toBeNull();
    expect(local.resolve('https://foreign.test'+attachment.locator)).toBeNull();
    expect(await fs.readFile(treeFile)).toEqual(treeBytes);
  });

  it('preserves existing per-file partial-batch continuation without a new retry or journal', async () => {
    const first = (await upload(draft('configured-lead'), 'first')).json();
    const second = (await upload(draft('configured-lead'), 'second')).json();
    const rename = fs.rename.bind(fs); let fail = true;
    vi.spyOn(fs,'rename').mockImplementation(async (a,b) => {
      if (String(a).endsWith(second.storedFilename) && fail) { fail=false; throw Object.assign(new Error('controlled move failure'),{code:'EIO'}); }
      return rename(a,b);
    });
    expect((await finalize('configured-lead',[first,second])).statusCode).toBe(400);
    expect((await app.inject({method:'GET',url:first.locator})).statusCode).toBe(404);
    expect((await app.inject({method:'GET',url:second.locator})).body).toBe('second');
    const resumed = await finalize('configured-lead',[first,second]); expect(resumed.statusCode).toBe(200);
    for (const [i,a] of resumed.json().attachments.entries()) expect((await app.inject({method:'GET',url:a.locator})).body).toBe(i ? 'second' : 'first');
  });
});
