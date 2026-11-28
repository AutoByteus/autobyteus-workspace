import { describe, expect, it } from 'vitest';
import { useRunHistoryAvatarState } from '../useRunHistoryAvatarState';
import type { TeamMemberTreeRow } from '~/stores/runHistoryTypes';

// The rows' pictures, their loading and their failures are each row's DefinitionAvatar now (autobyteus-669 W-1; see
// components/common/__tests__/DefinitionAvatar.spec.ts); what is left here is the names and initials the fallbacks show.
describe('run history avatar names and initials', () => {
  const avatars = useRunHistoryAvatarState();
  const member = (displayName: string, memberAddress: string) => ({ displayName, memberAddress }) as TeamMemberTreeRow;

  it.each([
    ['Test Agent', 'TA'],
    ['writer', 'W'],
    ['  Three Word Name ', 'TW'],
    ['', 'A'],
  ])('an agent %j shows %s', (name, initials) => {
    expect(avatars.getAgentInitials(name)).toBe(initials);
  });

  it('a member shows its display name, else the last part of its address, else "Member"', () => {
    expect(avatars.getTeamMemberDisplayName(member(' Lead Writer ', '/crew/lead'))).toBe('Lead Writer');
    expect(avatars.getTeamMemberDisplayName(member(' ', '/crew/lead'))).toBe('lead');
    expect(avatars.getTeamMemberDisplayName(member('', ''))).toBe('Member');
    expect(avatars.getTeamMemberInitials(member('Lead Writer', '/crew/lead'))).toBe('LW');
  });
});
