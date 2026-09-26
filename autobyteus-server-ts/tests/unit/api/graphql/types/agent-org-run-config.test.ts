import 'reflect-metadata';
import { buildSchema, registerEnumType } from 'type-graphql';
import { createRequire } from 'node:module';
const { graphql } = createRequire(import.meta.url)('graphql') as typeof import('graphql');
import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
const io = vi.hoisted(() => ({ getRunConfig: vi.fn(), runModelOptions: vi.fn(), updateStoppedRunConfig: vi.fn(),
  archiveStoredRun: vi.fn(), deleteStoredRun: vi.fn() }));
const memberViews = vi.hoisted(() => ({ getProjection: vi.fn(), getActiveTracePage: vi.fn() }));
vi.mock('../../../../../src/api/graphql/studio-application-api-services.js', () => ({ getStudioAgentOrgRunService: () => io }));
vi.mock('../../../../../src/run-history/services/agent-org-member-run-view-projection-service.js', () => ({ getAgentOrgMemberRunViewProjectionService: () => memberViews }));
import { SkillAccessMode } from 'autobyteus-ts/agent/context/skill-access-mode.js';
registerEnumType(SkillAccessMode, { name: 'SkillAccessModeEnum' });
import { AgentOrgRunResolver } from '../../../../../src/api/graphql/types/agent-org-run.js';
import { buildGraphqlSchema } from '../../../../../src/api/graphql/schema.js';
const tree = { schemaVersion: 1, subjectKind: 'agent_org', createdAt: '2026-09-17T00:00:00Z', archivedAt: null,
  applicationBinding: null, handoffs: [], rootOrg: { address: '/', orgDefinitionId: 'definition', orgDefinitionName: 'Org',
    orgRunId: 'org', defaultLaunchConfiguration: { runtimeKind: 'autobyteus', llmModelIdentifier: 'model', llmConfig: null,
      autoExecuteTools: false, skillAccessMode: 'PRELOADED_ONLY', workspaceRootPath: '/workspace' }, members: [], taskExecutions: [] } };

describe('whole AgentOrg model configuration GraphQL transport', () => {
  it('binds distinct Org member projection and trace-page public arguments exactly', async () => {
    const schema = await buildGraphqlSchema();
    const variables = { orgRunId: 'org-123', memberAddress: '/director', agentRunId: 'agent-456', beforeCursor: 'cursor-789' };
    memberViews.getProjection.mockResolvedValue({ agentRunId: variables.agentRunId, memberAddress: variables.memberAddress,
      conversation: [], activities: [], summary: null, lastActivityAt: null, hasEarlierActiveTraceEvents: false });
    memberViews.getActiveTracePage.mockResolvedValue({ events: [], beforeCursor: null, hasEarlier: false,
      loadedEarlierCount: 0, activeGeneration: 'generation', cursorStatus: 'valid' });
    const projection = await graphql({ schema, source: `query($orgRunId: String!, $memberAddress: String!, $agentRunId: String!) {
      getAgentOrgMemberRunProjection(orgRunId: $orgRunId, memberAddress: $memberAddress, agentRunId: $agentRunId) {
        agentRunId memberAddress conversation activities hasEarlierActiveTraceEvents
      }
    }`, variableValues: variables });
    expect(projection.errors).toBeUndefined();
    expect(memberViews.getProjection).toHaveBeenCalledExactlyOnceWith('org-123', '/director', 'agent-456');
    const trace = await graphql({ schema, source: `query($orgRunId: String!, $memberAddress: String!, $agentRunId: String!, $beforeCursor: String) {
      getAgentOrgMemberEventMonitorActiveTracePage(orgRunId: $orgRunId, memberAddress: $memberAddress,
        agentRunId: $agentRunId, beforeCursor: $beforeCursor) { events { eventId } beforeCursor hasEarlier loadedEarlierCount activeGeneration cursorStatus }
    }`, variableValues: variables });
    expect(trace.errors).toBeUndefined();
    expect(memberViews.getActiveTracePage).toHaveBeenCalledExactlyOnceWith('org-123', '/director', 'agent-456', 'cursor-789');
  });

  it('executes the production web read/options/mutation documents and keeps nullable llmConfig explicit', async () => {
    const schema = await buildSchema({ resolvers: [AgentOrgRunResolver], validate: false });
    const web = new URL('../../../../../../autobyteus-web/', import.meta.url);
    const queryText = readFileSync(new URL('graphql/queries/runModelOptionsQueries.ts', web), 'utf8');
    const read = queryText.match(/export const AgentOrgRunConfig = gql`([\s\S]*?)`/)![1]!;
    const options = queryText.match(/export const AgentOrgRunModelOptions = gql`([\s\S]*?)`/)![1]!;
    const mutation = readFileSync(new URL('graphql/mutations/agentOrgRunMutations.ts', web), 'utf8')
      .match(/export const UpdateStoppedAgentOrgRunConfig = gql`([\s\S]*?)`/)![1]!;
    io.getRunConfig.mockResolvedValue({ orgRunId: 'org', executionTree: tree, isActive: false, editability: { editable: true, reason: null } });
    io.runModelOptions.mockResolvedValue([{ scopeKind: 'CONFIGURED_ORG', scopeAddress: '/', currentModelIdentifier: 'model', replacements: [], unavailableReason: null }]);
    io.updateStoppedRunConfig.mockResolvedValue({ success: true, outcome: 'UPDATED', message: 'Saved', canonical: tree,
      isActive: false, editability: { editable: true, reason: null }, fieldErrors: [] });
    expect((await graphql({ schema, source: read, variableValues: { orgRunId: 'org' } })).errors).toBeUndefined();
    expect((await graphql({ schema, source: options, variableValues: { orgRunId: 'org', teamWorkspacePatches: [] } })).errors).toBeUndefined();
    const input = { orgRunId: 'org', teamWorkspacePatches: [], modelPatches: [{ scopeKind: 'CONFIGURED_ORG', scopeAddress: '/', llmModelIdentifier: 'model', llmConfig: null }] };
    const saved = await graphql({ schema, source: mutation, variableValues: { input } });
    expect(saved.errors).toBeUndefined(); expect(io.updateStoppedRunConfig).toHaveBeenCalledWith(input);
    expect(saved.data?.updateStoppedAgentOrgRunConfig).toMatchObject({ success: true, canonical: tree });
  });

  it("exposes subject-explicit stored AgentOrg archive/delete mutations with exact result identity", async () => {
    const schema = await buildSchema({ resolvers: [AgentOrgRunResolver], validate: false });
    io.archiveStoredRun.mockResolvedValue({ success: true, message: "archived" });
    io.deleteStoredRun.mockResolvedValue({ success: false, message: "active" });
    const archived = await graphql({ schema, source: `mutation($orgRunId: String!) {
      archiveStoredAgentOrgRun(orgRunId: $orgRunId) { success message orgRunId }
    }`, variableValues: { orgRunId: "org-run" } });
    const deleted = await graphql({ schema, source: `mutation($orgRunId: String!) {
      deleteStoredAgentOrgRun(orgRunId: $orgRunId) { success message orgRunId }
    }`, variableValues: { orgRunId: "org-run" } });

    expect(archived.errors).toBeUndefined();
    expect(archived.data?.archiveStoredAgentOrgRun).toEqual({ success: true, message: "archived", orgRunId: "org-run" });
    expect(deleted.errors).toBeUndefined();
    expect(deleted.data?.deleteStoredAgentOrgRun).toEqual({ success: false, message: "active", orgRunId: null });
    expect(io.archiveStoredRun).toHaveBeenCalledExactlyOnceWith("org-run");
    expect(io.deleteStoredRun).toHaveBeenCalledExactlyOnceWith("org-run");
  });

});
