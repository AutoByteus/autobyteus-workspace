import { computed, effectScope, nextTick, ref } from 'vue';
import { describe, expect, it } from 'vitest';
import { useRunHistoryAvatarState } from '../useRunHistoryAvatarState';
import type { TeamTreeNode } from '~/stores/runHistoryTypes';

const harness = () => {
  const loading = ref(false);
  const definitions = ref<{id: string; avatarUrl?: string | null}[]>([]);
  const scope = effectScope();
  const avatars = scope.run(() => useRunHistoryAvatarState({ loading,
    agentDefinitions: computed(() => []), teamDefinitions: computed(() => definitions.value), orgDefinitions: computed(() => definitions.value),
  }))!;
  return { loading, definitions, avatars, scope };
};

describe('sidebar container avatar metadata', () => {
  it.each([undefined, null, '', '  '])('falls back for absent/blank avatar %s', avatarUrl => {
    const { definitions, avatars, scope } = harness();
    definitions.value = [{id:'definition', avatarUrl}];
    expect(avatars.showOrgAvatar('definition')).toBe(false);
    expect(avatars.showTeamAvatar({teamDefinitionId:'definition', teamRunId:'run'} as TeamTreeNode)).toBe(false);
    scope.stop();
  });

  it('isolates exact Org IDs, Team/Org failure namespaces and obsolete URL errors', async () => {
    const {loading, definitions, avatars, scope} = harness();
    const team = {teamDefinitionId:'one', teamRunId:'run'} as TeamTreeNode;
    expect(avatars.showOrgAvatar('one')).toBe(false);
    definitions.value = [{id:'one', avatarUrl:' /first.png '}, {id:'two', avatarUrl:'/first.png'}];
    expect(avatars.showOrgAvatar('one')).toBe(true);
    expect(avatars.getOrgAvatarUrl('one')).toBe('/first.png');
    avatars.onOrgAvatarError('one', '/first.png');
    expect(avatars.showOrgAvatar('one')).toBe(false);
    expect(avatars.showOrgAvatar('two')).toBe(true);
    expect(avatars.showTeamAvatar(team)).toBe(true);
    avatars.onTeamAvatarError(team, '/first.png');
    expect(avatars.showTeamAvatar(team)).toBe(false);
    definitions.value = [{id:'one', avatarUrl:'/second.png'}];
    avatars.onOrgAvatarError('one', '/first.png');
    avatars.onTeamAvatarError(team, '/first.png');
    expect(avatars.showOrgAvatar('one')).toBe(true);
    expect(avatars.showTeamAvatar(team)).toBe(true);
    avatars.onOrgAvatarError('one','/second.png');
    loading.value = true; await nextTick(); loading.value = false; await nextTick();
    expect(avatars.showOrgAvatar('one')).toBe(true);
    // Agent policy remains independent and still uses initials/image failure fallback.
    expect(avatars.getAgentInitials('Test Agent')).toBe('TA');
    expect(avatars.showAgentAvatar('/ws','agent','/avatar.png')).toBe(true);
    avatars.onAgentAvatarError('/ws','agent','/avatar.png');
    expect(avatars.showAgentAvatar('/ws','agent','/avatar.png')).toBe(false);
    scope.stop();
  });
});
