// autobyteus-458: the phone's Settings for the open run. Production: MobileRunSettings, mobileRunSettingsScope,
// mobileRunSubjectLine and the catalogs. Doubled: the desktop's saved-run settings store (its contract: load, the draft,
// update, canSave, save, feedback, reload), the stop action, New run's rows (a stub that shows its props and emits as the
// rows do) and the remote-run view.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h, reactive, ref } from 'vue';
import { createPinia, setActivePinia } from 'pinia';

const mocks = vi.hoisted(() => ({ remoteNode: null as string | null, store: null as any, stop: { subject: null as any, onStopped: null as any, shell: null as any, stop: null as any, pending: null as any, error: null as any } }));
vi.mock('~/stores/existingRunConfigStore', () => ({ useExistingRunConfigStore: () => mocks.store }));
vi.mock('~/composables/runSettings/useRunStopAction', () => ({
  useRunStopAction: (subject: any, options: any) => {
    mocks.stop.subject = subject;
    mocks.stop.onStopped = options.onStopped;
    mocks.stop.shell = options.shell;
    return { pending: mocks.stop.pending, error: mocks.stop.error, label: { value: 'Terminate run' }, stop: mocks.stop.stop };
  },
}));
vi.mock('~/composables/remoteRuns/useRemoteRunView', async () => {
  const { computed: c } = await import('vue');
  return { useRemoteRunView: () => ({ remote: c(() => (mocks.remoteNode ? { nodeName: mocks.remoteNode, reachable: true } : null)), unreachable: c(() => false), headerActionsAllowed: c(() => true), composerPlaceholder: (l: string | null) => l, retry: vi.fn() }) };
});

import MobileRunSettings from '../MobileRunSettings.vue';

enableAutoUnmount(afterEach);

const RowsStub = defineComponent({
  name: 'MobileRuntimeModelRows',
  props: ['runtimeKind', 'llmModelIdentifier', 'seedModelIdentifier', 'llmConfig', 'disabled'],
  emits: ['update:runtimeKind', 'update:llmModelIdentifier', 'update:llmConfig'],
  setup: (props) => () => h('div', { 'data-testid': 'rows', 'data-disabled': String(Boolean(props.disabled)) },
    `${props.runtimeKind}|${props.llmModelIdentifier || 'Choose'}|seed=${props.seedModelIdentifier}`),
});

const agentSelection = { runtimeKind: 'codex_app_server', llmModelIdentifier: 'gpt-5.5', llmConfig: null };

/** A fake of the store's contract, enough for the screen: the draft follows the update actions as the store's does. */
const makeStore = (draft: any) => {
  const store: any = reactive({
    draft: null, saving: false, loadingCanonical: false, reconciling: false, reconciliationRequired: false, feedback: null,
    canSave: false,
    loadAgentCanonical: vi.fn(async () => { store.draft = draft; }),
    loadTeamCanonical: vi.fn(async () => { store.draft = draft; }),
    loadAgentOrgCanonical: vi.fn(async () => { store.draft = draft; }),
    updateAgentModelConfig: vi.fn((selection: any, runtimeKind?: string) => {
      store.draft = { ...store.draft, draftSelection: { runtimeKind: runtimeKind ?? store.draft.draftSelection.runtimeKind, ...selection } };
    }),
    updateTeamScopeModelConfig: vi.fn((address: string, selection: any) => {
      store.draft.planner.scopesByAddress[address].draftSelection = selection;
    }),
    updateAgentOrgScopeModelConfig: vi.fn((address: string, selection: any) => {
      store.draft.planner.scopesByAddress[address].draftSelection = selection;
    }),
    save: vi.fn(async () => true),
    reloadCanonical: vi.fn(async () => true),
    clear: vi.fn(),
  });
  return store;
};

const agentDraft = (isActive = false) => ({
  kind: 'agent', runId: 'run-a', isActive, editability: { editable: !isActive, reason: isActive ? 'RUN_ACTIVE' : null },
  metadata: { agentDefinitionId: 'def', ...agentSelection }, draftSelection: { ...agentSelection },
});
const contextOf = (runId: string, status: string) => reactive({
  config: { agentDefinitionId: 'def', agentDefinitionName: 'marketing_content_creator', runtimeKind: 'codex_app_server' },
  state: { runId, currentStatus: status },
});
const agentTarget = (status = 'offline') => ({ kind: 'standalone_agent', access: 'live', context: contextOf('run-a', status), browse: { kind: 'run', runId: 'run-a' }, workspaceRootPath: null });

const mountSettings = async (target: any, parentName: string | null = null) => {
  const wrapper = mount(MobileRunSettings, { props: { target, parentName }, global: { stubs: { MobileRuntimeModelRows: RowsStub } } });
  await flushPromises();
  return wrapper;
};
const rows = (wrapper: any) => wrapper.getComponent(RowsStub);

beforeEach(() => {
  setActivePinia(createPinia());
  mocks.remoteNode = null;
  mocks.stop.pending = ref(false);
  mocks.stop.error = ref<string | null>(null);
  mocks.stop.stop = vi.fn(async () => { await mocks.stop.onStopped?.(); });
});

describe('the phone Settings for the open run (autobyteus-458)', () => {
  it('REQ-005 shows the run\'s name and status line and New run\'s rows with the run\'s saved runtime and model; Save is disabled', async () => {
    mocks.store = makeStore(agentDraft());
    const wrapper = await mountSettings(agentTarget('offline'));
    expect(mocks.store.loadAgentCanonical).toHaveBeenCalledWith('run-a');
    expect(wrapper.get('[data-testid="mobile-screen-title"]').text()).toBe('Settings');
    expect(wrapper.get('[data-testid="mobile-run-settings-subject"]').text()).toContain('marketing_content_creator');
    expect(wrapper.get('[data-testid="mobile-run-settings-status"]').text()).toBe('Stopped');
    expect(rows(wrapper).text()).toBe('codex_app_server|gpt-5.5|seed=gpt-5.5');
    expect(wrapper.find('[data-testid="mobile-run-settings-stop"]').exists()).toBe(false);
    expect(wrapper.get('[data-testid="mobile-run-settings-save"]').attributes('disabled')).toBeDefined();
    expect(wrapper.text()).not.toMatch(/next message/i);
  });

  it('REQ-006 another runtime clears the model; Save is enabled only for a changed selection with a model; Save returns to the conversation', async () => {
    mocks.store = makeStore(agentDraft());
    const wrapper = await mountSettings(agentTarget());
    // The rows emit as New run's rows do when the runtime changes: runtime, then the cleared model and settings.
    rows(wrapper).vm.$emit('update:runtimeKind', 'claude_agent_sdk');
    rows(wrapper).vm.$emit('update:llmModelIdentifier', '');
    rows(wrapper).vm.$emit('update:llmConfig', null);
    await flushPromises();
    expect(mocks.store.updateAgentModelConfig).toHaveBeenLastCalledWith({ llmModelIdentifier: '', llmConfig: null }, 'claude_agent_sdk');
    expect(rows(wrapper).text()).toBe('claude_agent_sdk|Choose|seed=gpt-5.5');
    mocks.store.canSave = true; // the store's rule: a change; here the model is still missing
    await flushPromises();
    expect(wrapper.get('[data-testid="mobile-run-settings-save"]').attributes('disabled')).toBeDefined();

    rows(wrapper).vm.$emit('update:llmModelIdentifier', 'claude-opus-5');
    await flushPromises();
    expect(wrapper.get('[data-testid="mobile-run-settings-save"]').attributes('disabled')).toBeUndefined();
    await wrapper.get('[data-testid="mobile-run-settings-save"]').trigger('click');
    await flushPromises();
    expect(mocks.store.save).toHaveBeenCalledTimes(1);
    expect(wrapper.emitted('back')).toHaveLength(1);
  });

  it('REQ-006 a Save that rebuilds the open run\'s context reads the run again only for another run; Save returns to the conversation', async () => {
    mocks.store = makeStore(agentDraft());
    const target: any = agentTarget();
    // As the store does: a Save patches the run's context; a load during the Save discards the Save's result.
    mocks.store.save = vi.fn(async () => {
      const loadsBefore = mocks.store.loadAgentCanonical.mock.calls.length;
      target.context.state = { ...target.context.state };
      await flushPromises();
      return mocks.store.loadAgentCanonical.mock.calls.length === loadsBefore;
    });
    const wrapper = await mountSettings(target);
    rows(wrapper).vm.$emit('update:llmModelIdentifier', 'gpt-5.6');
    mocks.store.canSave = true;
    await flushPromises();
    await wrapper.get('[data-testid="mobile-run-settings-save"]').trigger('click');
    await flushPromises();
    expect(mocks.store.loadAgentCanonical).toHaveBeenCalledTimes(1);
    expect(wrapper.emitted('back')).toHaveLength(1);

    await wrapper.setProps({ target: { ...target, context: contextOf('run-b', 'offline'), browse: { kind: 'run', runId: 'run-b' } } });
    await flushPromises();
    expect(mocks.store.loadAgentCanonical).toHaveBeenLastCalledWith('run-b');
  });

  it('REQ-008 the stop subject stays the same while the open run\'s context changes (a failed stop keeps its message)', async () => {
    mocks.store = makeStore(agentDraft(true));
    const target: any = agentTarget('running');
    await mountSettings(target);
    const subject = mocks.stop.subject.value;
    expect(subject).toEqual({ kind: 'agent', runId: 'run-a' });
    target.context.state = { ...target.context.state, currentStatus: 'offline' };
    await flushPromises();
    expect(mocks.stop.subject.value).toBe(subject);
    expect(mocks.store.loadAgentCanonical).toHaveBeenCalledTimes(1);
  });

  it('REQ-007 a refused Save shows the node\'s message in a red card; the screen stays', async () => {
    mocks.store = makeStore(agentDraft());
    mocks.store.save = vi.fn(async () => {
      mocks.store.feedback = { kind: 'error', message: '“claude-opus-5” is not offered by Claude Agent SDK now. Refresh the model list and choose again.' };
      return false;
    });
    const wrapper = await mountSettings(agentTarget());
    rows(wrapper).vm.$emit('update:llmModelIdentifier', 'claude-opus-5');
    mocks.store.canSave = true;
    await flushPromises();
    await wrapper.get('[data-testid="mobile-run-settings-save"]').trigger('click');
    await flushPromises();
    const card = wrapper.get('[data-testid="mobile-run-settings-error"]');
    expect(card.attributes('role')).toBe('alert');
    expect(card.text()).toBe('“claude-opus-5” is not offered by Claude Agent SDK now. Refresh the model list and choose again.');
    expect(wrapper.emitted('back')).toBeUndefined();
  });

  it.each(['idle', 'running'])('REQ-008 a live %s run: the red stop icon, rows and Save disabled; one tap stops, the run is read again, the rows open', async (status) => {
    mocks.store = makeStore(agentDraft(true));
    mocks.store.reloadCanonical = vi.fn(async () => { mocks.store.draft = agentDraft(false); return true; });
    const wrapper = await mountSettings(agentTarget(status));
    const stop = wrapper.get('[data-testid="mobile-run-settings-stop"]');
    expect(stop.attributes('aria-label')).toBe('Stop run');
    expect(stop.attributes('title')).toBe('Stop run');
    expect(stop.text()).toBe('');
    expect(rows(wrapper).attributes('data-disabled')).toBe('true');
    expect(wrapper.get('[data-testid="mobile-run-settings-save"]').attributes('disabled')).toBeDefined();
    expect(mocks.stop.subject.value).toEqual({ kind: 'agent', runId: 'run-a' });

    await stop.trigger('click');
    await flushPromises();
    expect(mocks.stop.stop).toHaveBeenCalledTimes(1);
    expect(mocks.store.reloadCanonical).toHaveBeenCalledTimes(1);
    expect(wrapper.find('[data-testid="mobile-run-settings-stop"]').exists()).toBe(false);
    expect(rows(wrapper).attributes('data-disabled')).toBe('false');
  });

  it('a Team member: its own scope in its Team run; the stop stops the Team run; the line says "in <Team>"', async () => {
    const memberSelection = { runtimeKind: 'autobyteus', llmModelIdentifier: 'qwen-3', llmConfig: null };
    const draft = reactive({ kind: 'team', teamRunId: 'team-1', isActive: false, editability: { editable: true, reason: null },
      planner: { scopesByAddress: { '/': { originalSelection: memberSelection, draftSelection: { ...memberSelection } },
        '/content_creator': { originalSelection: memberSelection, draftSelection: { ...memberSelection } } } } });
    mocks.store = makeStore(draft);
    const target = { kind: 'standalone_team_member', access: 'live', context: contextOf('member-1', 'offline'),
      browse: { kind: 'teamMember', teamRunId: 'team-1', memberAddress: '/content_creator', agentRunId: 'member-1' },
      workspaceRootPath: null, team: { rootRunId: 'team-1', focusedMemberAddress: '/content_creator', teamDefinitionName: 'Marketing Team' },
      collaborationMessages: { memberIdentityByAgentRunId: () => ({}) } };
    const wrapper = await mountSettings(target, 'Marketing Team');
    expect(mocks.store.loadTeamCanonical).toHaveBeenCalledWith('team-1');
    expect(wrapper.get('[data-testid="mobile-run-settings-status"]').text()).toBe('Stopped · in Marketing Team');
    rows(wrapper).vm.$emit('update:llmModelIdentifier', 'qwen-3-max');
    await flushPromises();
    expect(mocks.store.updateTeamScopeModelConfig).toHaveBeenCalledWith('/content_creator', { ...memberSelection, llmModelIdentifier: 'qwen-3-max' });
    expect(mocks.stop.subject.value).toEqual({ kind: 'team', teamRunId: 'team-1' });
  });

  it('an Org member: its scope in its Org run', async () => {
    const memberSelection = { runtimeKind: 'autobyteus', llmModelIdentifier: 'qwen-3', llmConfig: null };
    mocks.store = makeStore(reactive({ kind: 'agent_org', orgRunId: 'org-1', isActive: false, editability: { editable: true, reason: null },
      planner: { scopesByAddress: { '/research/lead': { originalSelection: memberSelection, draftSelection: { ...memberSelection } } } } }));
    const target = { kind: 'agent_org_team_member', access: 'live', context: contextOf('member-2', 'offline'),
      browse: { kind: 'agentOrgMember', orgRunId: 'org-1', memberAddress: '/research/lead', agentRunId: 'member-2' },
      workspaceRootPath: null, root: { orgRunId: 'org-1' }, address: '/research/lead',
      team: { rootRunId: 'org-1', focusedMemberAddress: '/lead', teamDefinitionName: 'Research' }, collaborationMessages: { memberIdentityByAgentRunId: () => ({}) } };
    const wrapper = await mountSettings(target);
    expect(mocks.store.loadAgentOrgCanonical).toHaveBeenCalledWith('org-1');
    rows(wrapper).vm.$emit('update:runtimeKind', 'codex_app_server');
    await flushPromises();
    expect(mocks.store.updateAgentOrgScopeModelConfig).toHaveBeenCalledWith('/research/lead', { ...memberSelection, runtimeKind: 'codex_app_server' });
    expect(mocks.stop.subject.value).toEqual({ kind: 'agent_org', orgRunId: 'org-1' });
    // CR-001: the stop runs on the phone's shell; the phone keeps its own route (Settings stays open).
    expect(mocks.stop.shell).toBe('mobile');
  });

  // autobyteus-522: every run, decided by the run that holds the opened agent (`browse`).
  it('a task team\'s member: its address in the task team\'s own run; the stop stops that task team', async () => {
    const memberSelection = { runtimeKind: 'antigravity_cli', llmModelIdentifier: 'gemini-3.8-flash-low', llmConfig: null };
    mocks.store = makeStore(reactive({ kind: 'team', teamRunId: 'task-team-1', isActive: false, editability: { editable: true, reason: null },
      planner: { scopesByAddress: { '/reviewer': { originalSelection: memberSelection, draftSelection: { ...memberSelection } } } } }));
    const target = { kind: 'agent_run_task_team_member', access: 'live', context: contextOf('reviewer-1', 'offline'),
      browse: { kind: 'teamMember', teamRunId: 'task-team-1', memberAddress: '/reviewer', agentRunId: 'reviewer-1' }, workspaceRootPath: null };
    const wrapper = await mountSettings(target, 'docs review team');
    expect(mocks.store.loadTeamCanonical).toHaveBeenCalledWith('task-team-1');
    rows(wrapper).vm.$emit('update:runtimeKind', 'grok_build');
    await flushPromises();
    expect(mocks.store.updateTeamScopeModelConfig).toHaveBeenCalledWith('/reviewer', { ...memberSelection, runtimeKind: 'grok_build' });
    expect(mocks.stop.subject.value).toEqual({ kind: 'team', teamRunId: 'task-team-1' });
  });

  it('REQ-005 a task agent opened under a standalone Team\'s member: its own run, never the member that delegated it', async () => {
    mocks.store = makeStore({ ...agentDraft(), runId: 'helper-1' });
    const target = { kind: 'standalone_team_member', access: 'live', context: contextOf('helper-1', 'offline'), browse: { kind: 'run', runId: 'helper-1' },
      workspaceRootPath: null, team: { rootRunId: 'team-1', focusedMemberAddress: '/lead', teamDefinitionName: 'Delivery Team' },
      collaborationMessages: { memberIdentityByAgentRunId: () => ({}) } };
    const wrapper = await mountSettings(target, 'lead');
    expect(mocks.store.loadAgentCanonical).toHaveBeenCalledWith('helper-1');
    expect(mocks.store.loadTeamCanonical).not.toHaveBeenCalled();
    rows(wrapper).vm.$emit('update:runtimeKind', 'grok_build');
    await flushPromises();
    expect(mocks.store.updateAgentModelConfig).toHaveBeenCalledWith({ llmModelIdentifier: agentSelection.llmModelIdentifier, llmConfig: null }, 'grok_build');
    expect(mocks.store.updateTeamScopeModelConfig).not.toHaveBeenCalled();
    expect(mocks.stop.subject.value).toEqual({ kind: 'agent', runId: 'helper-1' });
  });

  it('REQ-004 a run on another node: its name and status line, the sentence naming the node; no rows, no Save, no stop', async () => {
    mocks.remoteNode = 'beta-node';
    mocks.store = makeStore(agentDraft(true));
    const target = { kind: 'agent_run_task_agent', access: 'live', context: contextOf('peer-1', 'idle'),
      browse: { kind: 'peerRun', nodeId: 'beta', runId: 'peer-1', agentRunId: 'peer-1' }, workspaceRootPath: null };
    const wrapper = await mountSettings(target, 'Project Task Manager');
    expect(wrapper.get('[data-testid="mobile-run-settings-status"]').text()).toBe('Idle · in Project Task Manager');
    expect(wrapper.get('[data-testid="mobile-run-settings-remote"]').text())
      .toBe('This run is on beta-node. Its runtime and model can be changed only on that node.');
    expect(wrapper.findComponent(RowsStub).exists()).toBe(false);
    expect(wrapper.find('[data-testid="mobile-run-settings-save"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="mobile-run-settings-stop"]').exists()).toBe(false);
    expect(mocks.store.loadAgentCanonical).not.toHaveBeenCalled();
    expect(mocks.store.clear).toHaveBeenCalled();
    expect(mocks.stop.subject.value).toBeNull();
  });

  it('leaving clears the store (unsaved choices are dropped)', async () => {
    mocks.store = makeStore(agentDraft());
    const wrapper = await mountSettings(agentTarget());
    wrapper.unmount();
    expect(mocks.store.clear).toHaveBeenCalled();
  });
});
