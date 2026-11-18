import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia, type Pinia } from 'pinia';

const active = vi.hoisted(() => ({ target: null as unknown }));
vi.mock('~/stores/activeContextStore', () => ({ useActiveContextStore: () => ({ get activeWorkspaceTarget() { return active.target; } }) }));
const launch = vi.hoisted(() => ({ createAgentRun: vi.fn(async () => 'temp-new-run') }));
vi.mock('~/composables/mobile/useMobileRunLaunchCoordinator', () => ({ useMobileRunLaunchCoordinator: () => launch }));

import MobileNewRun from '../MobileNewRun.vue';
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore';
import { useAgentRunConfigStore } from '~/stores/agentRunConfigStore';
import { useWorkspaceStore } from '~/stores/workspace';

const definition = (id: string, name: string, model = 'model-1') => ({ id, name, description: '', role: '', defaultLaunchConfig: { llmModelIdentifier: model, runtimeKind: 'autobyteus' } });
const workspace = (workspaceId: string, name: string) => ({ workspaceId, name, absolutePath: `/ws/${name}`, workspaceConfig: { root_path: `/ws/${name}` }, nodeIdToNode: {}, fileExplorer: null });

let pinia: Pinia;
const mountNewRun = async () => {
  const wrapper = mount(MobileNewRun, { attachTo: document.body, global: { plugins: [pinia], stubs: { MobileRuntimeModelRows: { template: '<div data-testid="runtime-model-rows" />' } } } });
  await flushPromises();
  return wrapper;
};
const agentValue = (wrapper: ReturnType<typeof mount>) => wrapper.get('[data-testid="mobile-run-target-select-value"]').text();

// autobyteus-277 REQ-006, DEC-007: New run starts an agent run; five rows, each a bottom sheet.
describe('New run', () => {
  beforeEach(() => {
    pinia = createPinia(); setActivePinia(pinia); vi.clearAllMocks(); active.target = null; document.body.innerHTML = '';
    useAgentDefinitionStore().agentDefinitions = [definition('writer', 'Writer'), definition('ptm', 'Project Task Manager'), definition('daily', 'Daily Assistant')] as never;
    const workspaces = useWorkspaceStore();
    workspaces.workspaces = { 'ws-a': workspace('ws-a', 'alpha'), 'ws-b': workspace('ws-b', 'beta') } as never;
    vi.spyOn(workspaces, 'fetchAllWorkspaces').mockResolvedValue(undefined);
  });

  it('preselects the agent of the run opened before', async () => {
    active.target = { context: { config: { agentDefinitionId: 'daily' } } };
    expect(agentValue(await mountNewRun())).toBe('Daily Assistant');
  });

  it('with no run opened before, preselects the Project Task Manager, and the first folder', async () => {
    const wrapper = await mountNewRun();
    expect(agentValue(wrapper)).toBe('Project Task Manager');
    expect(wrapper.get('[data-testid="mobile-run-workspace-select-value"]').text()).toBe('alpha');
  });

  it('without a Project Task Manager, the first agent', async () => {
    useAgentDefinitionStore().agentDefinitions = [definition('writer', 'Writer'), definition('daily', 'Daily Assistant')] as never;
    expect(agentValue(await mountNewRun())).toBe('Writer');
  });

  it('starts agent runs only: no Agent | Team switch, no team rows', async () => {
    const wrapper = await mountNewRun();
    expect(wrapper.text()).not.toMatch(/\bTeam\b/);
    expect(wrapper.findAll('[data-testid$="-mode"]')).toHaveLength(0);
    expect(wrapper.get('[data-testid="mobile-launch-run-options-card"]').text()).toBe('Auto approve tools');
  });

  it('a row opens its bottom sheet; one tap picks and closes', async () => {
    const wrapper = await mountNewRun();
    await wrapper.get('[data-testid="mobile-run-target-select-toggle"]').trigger('click');
    await flushPromises();
    const options = [...document.body.querySelectorAll('[data-testid="mobile-run-target-select-option"]')];
    expect(options.map((option) => option.textContent?.trim())).toEqual(['Writer', 'Project Task Manager', 'Daily Assistant']);
    expect(document.body.querySelector('[data-testid="mobile-run-target-select-sheet"] [role="dialog"]')).not.toBeNull();
    (options[0] as HTMLButtonElement).click();
    await flushPromises();
    expect(document.body.querySelector('[data-testid="mobile-run-target-select-sheet"]')).toBeNull();
    expect(agentValue(wrapper)).toBe('Writer');
  });

  it('Create run is disabled with the reason while a model is missing', async () => {
    useAgentDefinitionStore().agentDefinitions = [definition('ptm', 'Project Task Manager', '')] as never;
    const wrapper = await mountNewRun();
    expect(wrapper.get('[data-testid="mobile-run-setup-readiness"]').text()).toBe('Choose a model before creating the run.');
    expect(wrapper.get('[data-testid="mobile-run-launch"]').attributes('disabled')).toBeDefined();
  });

  it('Create run creates the agent run with the chosen agent and folder and reports it', async () => {
    const wrapper = await mountNewRun();
    expect(useAgentRunConfigStore().config).toMatchObject({ agentDefinitionId: 'ptm', workspaceId: 'ws-a' });
    await wrapper.get('[data-testid="mobile-run-setup"]').trigger('submit');
    await flushPromises();
    expect(launch.createAgentRun).toHaveBeenCalledWith({ agentDefinitionId: 'ptm', workspaceId: 'ws-a' });
    expect(wrapper.emitted('launched')).toEqual([['temp-new-run']]);
  });
});
