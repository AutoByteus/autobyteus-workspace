import { flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  GetAgentDefinitionAvatars,
  GetAgentOrgDefinitionAvatars,
  GetAgentTeamDefinitionAvatars,
} from '~/graphql/queries/definitionAvatarQueries';

const io = vi.hoisted(() => ({ query: null as unknown as ReturnType<typeof vi.fn> }));
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => ({ query: io.query }) }));
const { useDefinitionAvatarStore } = await import('../definitionAvatarStore');

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => { resolve = next; });
  return { promise, resolve };
};

beforeEach(() => {
  setActivePinia(createPinia());
  io.query = vi.fn();
});

// autobyteus-669 W-3 (REQ-004, REQ-005): each definition's picture address, read lightly once per kind.
describe('definitionAvatarStore', () => {
  it('reads a kind on its first ask, once, and answers by definition ID (none for no ID, a blank or an unknown one)', async () => {
    io.query.mockResolvedValue({ data: { agentDefinitions: [
      { id: 'writer', avatarUrl: ' /rest/definition-avatars/agent/writer?v=1 ' }, { id: 'plain', avatarUrl: null }, { id: 'blank', avatarUrl: ' ' },
    ] } });
    const store = useDefinitionAvatarStore();
    expect(store.avatarOf('agent', 'writer')).toBeNull();
    await flushPromises();
    expect(store.avatarOf('agent', 'writer')).toBe('/rest/definition-avatars/agent/writer?v=1');
    expect([store.avatarOf('agent', 'plain'), store.avatarOf('agent', 'blank'), store.avatarOf('agent', 'nobody'), store.avatarOf('agent', null)])
      .toEqual([null, null, null, null]);
    expect(io.query).toHaveBeenCalledTimes(1);
    expect(io.query).toHaveBeenCalledWith({ query: GetAgentDefinitionAvatars, fetchPolicy: 'network-only' });
  });

  it('keeps each kind apart', async () => {
    io.query.mockImplementation(async ({ query }) => query === GetAgentTeamDefinitionAvatars
      ? { data: { agentTeamDefinitions: [{ id: 'same', avatarUrl: '/team.png' }] } }
      : { data: { agentOrgDefinitions: [{ id: 'same', avatarUrl: '/org.png' }] } });
    const store = useDefinitionAvatarStore();
    store.avatarOf('team', 'same'); store.avatarOf('org', 'same');
    await flushPromises();
    expect([store.avatarOf('team', 'same'), store.avatarOf('org', 'same')]).toEqual(['/team.png', '/org.png']);
    expect(io.query.mock.calls.map(([options]) => options.query)).toEqual([GetAgentTeamDefinitionAvatars, GetAgentOrgDefinitionAvatars]);
  });

  it('reads again only the kinds this page has shown; a read asked during one follows it', async () => {
    const first = deferred<unknown>();
    io.query.mockReturnValueOnce(first.promise).mockResolvedValue({ data: { agentDefinitions: [{ id: 'writer', avatarUrl: '/second.png' }] } });
    const store = useDefinitionAvatarStore();
    store.avatarOf('agent', 'writer');
    const reload = store.reloadIfLoaded(['agent', 'org']);
    await flushPromises();
    expect(io.query).toHaveBeenCalledTimes(1);
    first.resolve({ data: { agentDefinitions: [{ id: 'writer', avatarUrl: '/first.png' }] } });
    await reload;
    expect(io.query).toHaveBeenCalledTimes(2);
    expect(store.avatarOf('agent', 'writer')).toBe('/second.png');
  });

  it('a failed read keeps the last addresses', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    io.query.mockResolvedValueOnce({ data: { agentDefinitions: [{ id: 'writer', avatarUrl: '/first.png' }] } }).mockRejectedValue(new Error('offline'));
    const store = useDefinitionAvatarStore();
    store.avatarOf('agent', 'writer');
    await flushPromises();
    await store.reloadIfLoaded(['agent']);
    expect(store.avatarOf('agent', 'writer')).toBe('/first.png');
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
