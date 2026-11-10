import { beforeEach, describe, expect, it } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia, type Pinia } from 'pinia';
import { useMobileNavigation } from '../useMobileNavigation';
import { useMobileRouteRunSync } from '../useMobileRouteRunSync';
import { useAgentContextsStore } from '~/stores/agentContextsStore';
import { useAgentRunConfigStore } from '~/stores/agentRunConfigStore';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { AgentContext } from '~/types/agent/AgentContext';
import { AgentRunState } from '~/types/agent/AgentRunState';
import { agentRunRowKey } from '~/utils/runListProjection';
import { createMobileTestRouter, withSetup } from './mobileTestRouter';

const launchConfig = {
  agentDefinitionId: 'def-writer', agentDefinitionName: 'Writer', agentAvatarUrl: null, llmModelIdentifier: 'model-a',
  runtimeKind: 'autobyteus', workspaceId: null, workspaceMetadata: null, autoExecuteTools: false, llmConfig: null, isLocked: false,
};
const storedRun = (runId: string) => new AgentContext({ ...launchConfig } as never,
  new AgentRunState(runId, { id: runId, messages: [], createdAt: '', updatedAt: '', agentDefinitionId: 'def-writer' }));

let pinia: Pinia;
/** The phone page: the list entry, then New run, then Create run of a real draft (`createRunFromTemplate`), as the shell does. */
const createRunOnThePhone = async () => {
  const router = await createMobileTestRouter();
  const { result: navigation } = withSetup(router, () => {
    const nav = useMobileNavigation();
    useMobileRouteRunSync(nav);
    return nav;
  }, [pinia]);
  await navigation.openNewRun();
  useAgentRunConfigStore().setAgentConfig({ ...launchConfig } as never);
  const draftRunId = useAgentContextsStore().createRunFromTemplate({ selectionMode: 'mobile' });
  await navigation.openRun({ replace: true, rowKey: agentRunRowKey(draftRunId) });
  await flushPromises();
  return { router, navigation, draftRunId, query: () => ({ ...router.currentRoute.value.query }) };
};
const goBack = async (router: Awaited<ReturnType<typeof createMobileTestRouter>>) => {
  await new Promise<void>((resolve) => { const stop = router.afterEach(() => { stop(); resolve(); }); router.back(); });
  await flushPromises();
};

// autobyteus-435 DS-006b, AC-005-6, AC-005-8, CRR-001 CR-001: a New run draft is `temp-*` until its first send.
describe('useMobileRouteRunSync', () => {
  beforeEach(() => { pinia = createPinia(); setActivePinia(pinia); });

  it('names the draft until the first send, then the node\'s run on the current entry', async () => {
    const { draftRunId, query } = await createRunOnThePhone();
    expect(draftRunId).toMatch(/^temp-/);
    expect(query()).toEqual({ row: `agent:${draftRunId}`, screen: 'run' });

    useAgentContextsStore().promoteTemporaryId(draftRunId, 'run-node-1');
    await flushPromises();

    expect(query()).toEqual({ row: 'agent:run-node-1', screen: 'run' });
  });

  it('a view pushed before the send is renamed at the send; Back to the run screen and the list entry renames each', async () => {
    const { router, navigation, draftRunId, query } = await createRunOnThePhone();
    await navigation.openView('messages');
    expect(query()).toEqual({ row: `agent:${draftRunId}`, screen: 'messages' });

    useAgentContextsStore().promoteTemporaryId(draftRunId, 'run-node-1');
    await flushPromises();
    expect(query()).toEqual({ row: 'agent:run-node-1', screen: 'messages' });

    await goBack(router);
    expect(query()).toEqual({ row: 'agent:run-node-1', screen: 'run' });
    await goBack(router);
    expect(query()).toEqual({ row: 'agent:run-node-1' });
    // A later view carries the node's run.
    await navigation.openRun({ rowKey: 'agent:run-node-1' });
    await navigation.openView('activity');
    expect(query()).toEqual({ row: 'agent:run-node-1', screen: 'activity' });
  });

  it('a selection change that is not a promotion (another run opened) does not rewrite the route', async () => {
    const { draftRunId, query } = await createRunOnThePhone();
    useAgentContextsStore().runs.set('run-other', storedRun('run-other'));

    useAgentSelectionStore().selectRunWithoutShellNavigation('run-other', 'agent');
    await flushPromises();

    expect(query()).toEqual({ row: `agent:${draftRunId}`, screen: 'run' });
  });

  it('another draft\'s promotion, or a route that names no top-level agent run, is not followed', async () => {
    const { router, draftRunId, query } = await createRunOnThePhone();
    const contexts = useAgentContextsStore();
    contexts.registerDraftRun(storedRun('temp-other'));
    contexts.promoteTemporaryId('temp-other', 'run-other');
    await flushPromises();
    expect(query()).toEqual({ row: `agent:${draftRunId}`, screen: 'run' });

    await router.replace({ path: '/mobile', query: { row: `agent:host/agent:${draftRunId}`, screen: 'run' } });
    useAgentSelectionStore().selectRunWithoutShellNavigation(draftRunId, 'agent');
    contexts.promoteTemporaryId(draftRunId, 'run-node-1');
    await flushPromises();
    expect(query()).toEqual({ row: `agent:host/agent:${draftRunId}`, screen: 'run' });
  });
});
