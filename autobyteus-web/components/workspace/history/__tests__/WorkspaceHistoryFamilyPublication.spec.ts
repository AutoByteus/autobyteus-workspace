import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { mount, flushPromises } from '@vue/test-utils';
import Panel from '../WorkspaceAgentRunsTreePanel.vue';
import { useRunHistoryStore } from '~/stores/runHistoryStore';
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore';
import { useWorkspaceStore } from '~/stores/workspace';
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore';
import { useAgentTeamDefinitionStore } from '~/stores/agentTeamDefinitionStore';
import { useAgentOrgDefinitionStore } from '~/stores/agentOrgDefinitionStore';
import { useAgentOrgContextsStore } from '~/stores/agentOrgContextsStore';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { useAgentRunStore } from '~/stores/agentRunStore';
import { buildAgentOrgHistoryRow, historyWorkspaceFixture } from '~/test-support/historyFamilyPublicationFixture';
const io = vi.hoisted(() => ({ query: vi.fn(), hydrate: vi.fn() }));
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => io }));
vi.mock('~/services/runHydration/runContextHydrationService', () => ({ hydrateLiveRunContext: io.hydrate }));
vi.mock('vue-router', () => ({ useRoute: () => ({ query: {} }), useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));
const deferred = () => { let resolve!: (x?: any) => void; let reject!: (x: any) => void; const promise = new Promise<any>((r,j) => { resolve=r; reject=j; }); return {promise,resolve,reject}; };
const orgResponse = (id = 'org-history') => ({ data: { listCollaborationRootHistory: [buildAgentOrgHistoryRow({ rootRunId:id, workspaceRootPath:'/fixture', definitionName:'History Org' })] } });
const orgInspectionResponse = (id = 'org-history') => {
  const row = buildAgentOrgHistoryRow({ rootRunId:id, workspaceRootPath:'/fixture', definitionName:'History Org' });
  return { data: { getAgentOrgRunInspection: {
    schema_version: 1, root_subject_kind: 'agent_org', root_run_id: id,
    root_org: {
      base_change_sequence: 0, is_active: false, execution_tree: row.org,
      task_records: { schemaVersion: 1, subjectKind: 'agent_org', orgRunId: id, records: [] },
      communication_messages: { schemaVersion: 1, subjectKind: 'agent_org', orgRunId: id, messages: [] },
      agent_statuses: [],
    },
  } } };
};
const workspaceResponse = (active = false) => ({ data: { listWorkspaceRunHistory: [historyWorkspaceFixture(active)] } });
let workspace: ReturnType<typeof deferred>, org: ReturnType<typeof deferred>, avatar: ReturnType<typeof deferred>, catalog: ReturnType<typeof deferred>, hydration: ReturnType<typeof deferred>;
let wrapper: ReturnType<typeof mount> | undefined;
beforeEach(() => {
  setActivePinia(createPinia()); vi.clearAllMocks();
  workspace=deferred();org=deferred();avatar=deferred();catalog=deferred();hydration=deferred();
  vi.spyOn(useWindowNodeContextStore(),'waitForBoundBackendReady').mockResolvedValue(true);
  vi.spyOn(useWorkspaceStore(),'fetchAllWorkspaces').mockImplementation(() => catalog.promise);
  vi.spyOn(useAgentDefinitionStore(),'fetchAllAgentDefinitions').mockImplementation(() => avatar.promise);
  vi.spyOn(useAgentTeamDefinitionStore(),'fetchAllAgentTeamDefinitions').mockImplementation(() => catalog.promise);
  vi.spyOn(useAgentOrgDefinitionStore(),'fetchAll').mockImplementation(() => catalog.promise);
  vi.spyOn(useAgentRunStore(),'connectToAgentStream').mockImplementation(() => undefined);
  io.hydrate.mockImplementation(() => hydration.promise);
  io.query.mockImplementation(({ query, variables }) => {
    const name=query.definitions.find((d:any)=>d.name)?.name.value;
    if(name==='ListWorkspaceRunHistory') return workspace.promise;
    if(name==='ListCollaborationRootHistory') return org.promise;
    if(name==='GetWorkspaceRunHistory') return catalog.promise.then(()=>({data:{workspaceRunHistory:historyWorkspaceFixture()}}));
    if(name==='GetAgentOrgRunInspection') return orgInspectionResponse();
    if(name==='GetAgentOrgMemberRunProjection') return { data: { getAgentOrgMemberRunProjection: {
      agentRunId: variables.agentRunId, memberAddress: variables.memberAddress,
      summary: 'History member', lastActivityAt: '2026-09-03T00:00:00.000Z',
      conversation: [], activities: [], hasEarlierActiveTraceEvents: false,
    } } };
    throw Error('Unexpected query '+name);
  });
});
afterEach(async () => {
  workspace.resolve({data:{listWorkspaceRunHistory:[]}});org.resolve({data:{listCollaborationRootHistory:[]}});
  avatar.resolve();catalog.resolve();hydration.resolve();await flushPromises();
  wrapper?.unmount();wrapper=undefined;vi.restoreAllMocks();
});
const start = async (render = true, knownWorkspace = false) => {
  if (knownWorkspace) useWorkspaceStore().workspaces.ws = {
    workspaceId:'ws', name:'Fixture Workspace', absolutePath:'/fixture', workspaceConfig:{root_path:'/fixture'},
  };
  const store=useRunHistoryStore();
  store.refreshRunNavigationTopology('initialized-before-response');
  expect(store.getTreeNodes().flatMap(w=>w.agents)).toEqual([]);
  const action=vi.spyOn(store,'fetchTree');
  if(render) wrapper=mount(Panel);
  else void store.fetchTree();
  await flushPromises();
  return {store,completion:action.mock.results[0]!.value as Promise<void>};
};
const orgIds = () => useRunHistoryStore().getTreeNodes().flatMap(w=>w.agentOrgDefinitions.flatMap(d=>d.runs.map(r=>r.rootRunId)));
async function expandWorkspace() {
  const row=wrapper!.get('[data-test="workspace-row"]');
  if(row.attributes('aria-expanded')!=='true') await row.get('button').trigger('click');
}
describe('independent family publication through real initialized Pinia projection and sidebar', () => {
  it.each(['org','workspace'])('renders ready %s while other query and catalogs remain pending', async first => {
    const {store,completion}=await start(true, first==='workspace');let complete=false;void completion.then(()=>complete=true);
    if(first==='org') org.resolve(orgResponse());else workspace.resolve(workspaceResponse());
    await flushPromises();
    // Check the cached read model BEFORE expansion can request a scoped refresh.
    if(first==='workspace') expect(store.getTreeNodes()[0]?.agents[0]?.runs[0]?.runId).toBe('agent-history');
    else expect(orgIds()).toEqual(['org-history']);
    await expandWorkspace();
    expect(wrapper!.text()).toContain(first==='org'?'History Org':'History Agent');
    expect(store.getTreeNodes()).toHaveLength(1);expect(store.loading).toBe(true);expect(complete).toBe(false);
    if(first==='org') {
      expect(orgIds()).toEqual(['org-history']);
      await wrapper!.get('[data-test="agent-org-definition-org-definition"]').trigger('click');
      expect(wrapper!.find('[data-test="agent-org-run-open-org-history"]').exists()).toBe(true);
      await wrapper!.get('[data-test="agent-org-run-open-org-history"]').trigger('click');
      await flushPromises();
      expect(wrapper!.find('[data-test="agent-org-agent-row-writer-org-history"]').exists()).toBe(true);
    } else expect(store.workspaceGroups[0]?.agentDefinitions[0]?.runs[0]?.runId).toBe('agent-history');
    expect(io.hydrate).not.toHaveBeenCalled();expect(useAgentRunStore().connectToAgentStream).not.toHaveBeenCalled();
  });
  it('publishes both families before avatar enrichment and awaits later active hydration/connection', async () => {
    const selection=useAgentSelectionStore();selection.selectRun('retained-selection','agent');const selected=selection.subject;
    const {store,completion}=await start(true,true);let complete=false;void completion.then(()=>complete=true);
    const recovery=vi.spyOn(useAgentOrgContextsStore(),'reconcileRetainedHistory').mockImplementation(ids=>{expect(orgIds()).toEqual(ids);});
    workspace.resolve(workspaceResponse(true));org.resolve(orgResponse());await flushPromises();await expandWorkspace();
    expect(wrapper!.text()).toContain('History Org');expect(wrapper!.text()).toContain('History Agent');
    expect(io.hydrate).not.toHaveBeenCalled();expect(recovery).toHaveBeenCalledTimes(1);
    useAgentDefinitionStore().agentDefinitions=[{id:'agent-definition',name:'History Agent',avatarUrl:'https://fixture.invalid/avatar.png'}] as any;
    avatar.resolve();await flushPromises();expect(io.hydrate).toHaveBeenCalledTimes(1);expect(complete).toBe(false);expect(store.loading).toBe(true);
    expect(wrapper!.text()).toContain('History Org');expect(selection.subject).toBe(selected);
    hydration.resolve();await completion;await flushPromises();
    expect(useAgentRunStore().connectToAgentStream).toHaveBeenCalledWith('agent-history');expect(store.loading).toBe(false);
    expect(store.agentAvatarByDefinitionId['agent-definition']).toContain('avatar.png');expect(orgIds()).toEqual(['org-history']);
    expect(selection.subject).toBe(selected);expect(wrapper!.get('[data-test="workspace-row"]').attributes('aria-expanded')).toBe('true');
  });
  it('publishes a later Org response while existing active hydration is already blocked', async () => {
    const {store,completion}=await start(true,true);let complete=false;void completion.then(()=>complete=true);
    workspace.resolve(workspaceResponse(true));avatar.resolve();await flushPromises();
    expect(io.hydrate).toHaveBeenCalledTimes(1);expect(orgIds()).toEqual([]);
    org.resolve(orgResponse());await flushPromises();await expandWorkspace();
    expect(wrapper!.text()).toContain('History Org');expect(orgIds()).toEqual(['org-history']);
    expect(complete).toBe(false);expect(store.loading).toBe(true);
    hydration.resolve();await completion;expect(useAgentRunStore().connectToAgentStream).toHaveBeenCalledTimes(1);
  });
  it.each(['workspace','org'])('preserves accepted %s rows on failure while publishing successful empty other family', async failure => {
    const {store,completion}=await start(false);workspace.resolve(workspaceResponse());org.resolve(orgResponse());avatar.resolve();await completion;
    expect(orgIds()).toEqual(['org-history']);const oldWorkspace=store.workspaceGroups,oldOrg=store.agentOrgHistory;
    workspace=deferred();org=deferred();const second=store.fetchTree();
    if(failure==='workspace'){workspace.reject(Error('workspace failed'));org.resolve({data:{listCollaborationRootHistory:[]}});}
    else {org.resolve({data:{listCollaborationRootHistory:[{root_subject_kind:'agent_org',root_run_id:'malformed'}]}});workspace.resolve({data:{listWorkspaceRunHistory:[]}});}
    await second;
    if(failure==='workspace'){expect(store.workspaceGroups).toBe(oldWorkspace);expect(store.historyFamilyErrors.workspace).toBe('workspace failed');expect(orgIds()).toEqual([]);}
    else {expect(store.agentOrgHistory).toBe(oldOrg);expect(store.historyFamilyErrors.agentOrg).toBeTruthy();expect(store.workspaceGroups).toEqual([]);expect(orgIds()).toEqual(['org-history']);}
  });
  it.each([false,true])('older full Org cannot publish or reconcile after newer focused request (failure=%s)', async fail => {
    const {store,completion}=await start(false);const oldOrg=org;const focused=deferred();
    io.query.mockImplementation(()=>focused.promise);
    const recovery=vi.spyOn(useAgentOrgContextsStore(),'reconcileRetainedHistory');
    const next=store.refreshAgentOrgHistory();await flushPromises();
    if(fail) focused.reject(Error('focused failure'));else focused.resolve(orgResponse('winner'));
    await next;const revision=store.navigationTopologyRevision;const calls=recovery.mock.calls.length;
    oldOrg.resolve(orgResponse('stale'));await flushPromises();
    expect(store.navigationTopologyRevision).toBe(revision);expect(recovery).toHaveBeenCalledTimes(calls);
    expect(orgIds()).toEqual(fail?[]:['winner']);expect(store.historyFamilyErrors.agentOrg).toBe(fail?'focused failure':null);
    workspace.resolve(workspaceResponse());avatar.resolve();await completion;expect(orgIds()).toEqual(fail?[]:['winner']);
  });
  it('quiet partial failure retains legacy global error while other accepted family publishes', async () => {
    const store=useRunHistoryStore();store.error='prior';store.refreshRunNavigationTopology('initial');
    const completion=store.fetchTree(6,{quiet:true});workspace.reject(Error('workspace quiet failure'));org.resolve(orgResponse());await completion;
    expect(store.loading).toBe(false);expect(store.error).toBe('prior');expect(store.historyFamilyErrors.workspace).toBe('workspace quiet failure');expect(orgIds()).toEqual(['org-history']);
  });
});
