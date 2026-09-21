import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, expect, it } from 'vitest';
import type { AppConfig } from '../../../src/config/app-config.js';
import { FileAgentOrgDefinitionProvider } from '../../../src/agent-org-definition/providers/file-agent-org-definition-provider.js';
import { AgentOrgDefinition, AgentOrgDefinitionUpdate } from '../../../src/agent-org-definition/domain/agent-org-definition.js';
import { AgentOrgDefinitionService } from '../../../src/agent-org-definition/services/agent-org-definition-service.js';
const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map(root => fs.rm(root, { recursive: true, force: true }))); });
const setup = async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'org-avatar-delete-')); roots.push(root);
  const config = (base: string, extra: string[] = []) => ({ getAgentOrgsDir: () => path.join(base, 'agent-orgs'), getAdditionalAgentPackageRoots: () => extra }) as AppConfig;
  const provider = new FileAgentOrgDefinitionProvider(config(root));
  const service = new AgentOrgDefinitionService(provider, { getFreshAgentDefinitionById: async () => null }, { getFreshDefinitionById: async () => null });
  const created = await service.createDefinition(new AgentOrgDefinition({ name: 'Disposable Org', description: 'Preserved description', instructions: 'Preserved instructions', category: 'Keep', avatarUrl: '/asset.png', members: [], handoffs: [] }));
  return { root, config, provider, service, created };
};
it('persists replacement, omission and explicit empty-string clear through service/domain/transaction and preserves revision guards', async () => {
  const { service, created, provider } = await setup();
  const kept = await service.updateDefinition(created.id!, new AgentOrgDefinitionUpdate({ expectedRevision: created.revision!, description: 'Edited' }));
  expect(kept.avatarUrl).toBe('/asset.png');
  const replaced = await service.updateDefinition(created.id!, new AgentOrgDefinitionUpdate({ expectedRevision: kept.revision!, avatarUrl: '/new.png' }));
  const cleared = await service.updateDefinition(created.id!, new AgentOrgDefinitionUpdate({ expectedRevision: replaced.revision!, avatarUrl: '' }));
  expect(await provider.getById(created.id!)).toMatchObject({ avatarUrl: null, description: 'Edited', instructions: 'Preserved instructions', category: 'Keep', members: [], handoffs: [] });
  await expect(service.updateDefinition(created.id!, new AgentOrgDefinitionUpdate({ expectedRevision: created.revision!, avatarUrl: '/stale.png' }))).rejects.toMatchObject({ code: 'DEFINITION_REVISION_CONFLICT' });
  expect((await provider.getById(created.id!))?.revision).toBe(cleared.revision);
});
it('deletes only the exact package including owned descendants, preserving shared packages/history/assets and duplicate false', async () => {
  const { root, created, service } = await setup();
  const orgPath = path.join(root, 'agent-orgs', created.id!);
  const localPaths = ['agents/owned/agent.md', 'agent-teams/owned/team.md', 'agent-teams/owned/agents/lead/agent.md'];
  for (const file of localPaths) { await fs.mkdir(path.dirname(path.join(orgPath, file)), { recursive: true }); await fs.writeFile(path.join(orgPath, file), 'Owned package descendant'); }
  const protectedPaths = ['agents/shared/agent.md', 'agent-teams/shared/team.md', 'agent-orgs/other/org.md', 'memory/agent-org-runs/run/history.json', 'uploads/asset.png'];
  for (const file of protectedPaths) { await fs.mkdir(path.dirname(path.join(root, file)), { recursive: true }); await fs.writeFile(path.join(root, file), `Exact preserved ${file}`); }
  expect(await service.deleteDefinition(created.id!)).toBe(true); await expect(fs.stat(orgPath)).rejects.toMatchObject({ code: 'ENOENT' });
  for (const file of protectedPaths) expect(await fs.readFile(path.join(root, file), 'utf8')).toBe(`Exact preserved ${file}`);
  expect(await service.deleteDefinition(created.id!)).toBe(false);
});
it('keeps external packages read-only for avatar edit and deletion', async () => {
  const { root, config, provider, created } = await setup();
  const external = path.join(root, 'external'); await fs.mkdir(path.join(external, 'agent-orgs'), { recursive: true });
  await fs.rename(path.join(root, 'agent-orgs', created.id!), path.join(external, 'agent-orgs', created.id!));
  const reader = new FileAgentOrgDefinitionProvider(config(root, [external])); const loaded = await reader.getById(created.id!);
  const sourceFile = path.join(external, 'agent-orgs', created.id!, 'org-config.json'); const before = await fs.readFile(sourceFile);
  loaded!.avatarUrl = '/forbidden.png'; await expect(reader.update(loaded!)).rejects.toThrow(); await expect(reader.delete(created.id!)).rejects.toThrow();
  expect(await fs.readFile(sourceFile)).toEqual(before); expect(await provider.getById(created.id!)).toBeNull();
});
