import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import SkillImprovementComposerCta from '../SkillImprovementComposerCta.vue';
import type { SkillImprovementComposerCtaTarget } from '../skillImprovementComposerCtaTarget';

const flushPromises = async () => {
  await Promise.resolve();
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
};

const {
  capabilityState,
  capabilityStoreMock,
  skillImprovementState,
  skillImprovementStoreMock,
  addToastMock,
} = vi.hoisted(() => {
  const capabilityState = {
    isEnabled: false,
  };
  const skillImprovementState = {
    eligibilityByKey: {} as Record<string, any>,
    loadingKeys: {} as Record<string, boolean>,
  };

  return {
    capabilityState,
    capabilityStoreMock: {
      get isEnabled() {
        return capabilityState.isEnabled;
      },
      ensureResolved: vi.fn().mockResolvedValue(null),
    },
    skillImprovementState,
    skillImprovementStoreMock: {
      get eligibilityByKey() {
        return skillImprovementState.eligibilityByKey;
      },
      get loadingKeys() {
        return skillImprovementState.loadingKeys;
      },
      agentKey: (runId: string) => `agent:${runId}`,
      teamMemberKey: (teamRunId: string, memberRunId: string) => `team-member:${teamRunId}:${memberRunId}`,
      fetchAgentRunEligibility: vi.fn(async (runId: string) => {
        const key = `agent:${runId}`;
        return skillImprovementState.eligibilityByKey[key] ?? {
          eligible: false,
          reasons: ['No eligibility was cached.'],
          warnings: [],
          skillTargets: [],
          effectiveConfig: null,
        };
      }),
      fetchTeamMemberEligibility: vi.fn(async (teamRunId: string, memberRunId: string) => {
        const key = `team-member:${teamRunId}:${memberRunId}`;
        return skillImprovementState.eligibilityByKey[key] ?? {
          eligible: false,
          reasons: ['No eligibility was cached.'],
          warnings: [],
          skillTargets: [],
          effectiveConfig: null,
        };
      }),
      startAgentRunSkillImprovement: vi.fn().mockResolvedValue({
        improvementRunId: 'improvement-1',
        improverRunId: 'improver-run-1',
        record: { improvementRunId: 'improvement-1', status: 'requested', errors: [] },
      }),
      startTeamMemberSkillImprovement: vi.fn().mockResolvedValue({
        improvementRunId: 'improvement-team-1',
        improverRunId: 'improver-team-run-1',
        record: { improvementRunId: 'improvement-team-1', status: 'requested', errors: [] },
      }),
    },
    addToastMock: vi.fn(),
  };
});

vi.mock('~/stores/skillImprovementCapabilityStore', () => ({
  useSkillImprovementCapabilityStore: () => capabilityStoreMock,
}));

vi.mock('~/stores/skillImprovementStore', () => ({
  useSkillImprovementStore: () => skillImprovementStoreMock,
}));

vi.mock('~/composables/useToasts', () => ({
  useToasts: () => ({
    addToast: addToastMock,
  }),
}));

describe('SkillImprovementComposerCta', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capabilityState.isEnabled = false;
    skillImprovementState.eligibilityByKey = {};
    skillImprovementState.loadingKeys = {};
  });

  const mountComponent = (target: SkillImprovementComposerCtaTarget | null) => mount(SkillImprovementComposerCta, {
    props: { target },
    global: {
      stubs: {
        Icon: { template: '<span data-test="icon" />' },
      },
    },
  });

  it('is hidden when the global capability is disabled', async () => {
    const wrapper = mountComponent({ kind: 'agent', runId: 'run-1' });
    await flushPromises();

    expect(wrapper.find('[data-test="skill-improvement-composer-cta"]').exists()).toBe(false);
    expect(capabilityStoreMock.ensureResolved).toHaveBeenCalledTimes(1);
    expect(skillImprovementStoreMock.fetchAgentRunEligibility).not.toHaveBeenCalled();
  });

  it('starts standalone Skill Improvement from an eligible composer CTA', async () => {
    capabilityState.isEnabled = true;
    skillImprovementState.eligibilityByKey = {
      'agent:run-1': {
        eligible: true,
        reasons: [],
        warnings: [],
        skillTargets: [],
        effectiveConfig: { enabled: true },
      },
    };

    const wrapper = mountComponent({ kind: 'agent', runId: 'run-1' });
    await flushPromises();

    const button = wrapper.get('[data-test="skill-improvement-composer-cta"]');
    expect(button.text()).toContain('improve skills');
    expect(button.attributes('aria-label')).toBe('improve skills this run');
    expect(button.attributes('title')).toContain('this run');
    expect(button.attributes('disabled')).toBeUndefined();

    await button.trigger('click');
    await flushPromises();

    expect(skillImprovementStoreMock.fetchAgentRunEligibility).toHaveBeenCalledWith('run-1');
    expect(skillImprovementStoreMock.startAgentRunSkillImprovement).toHaveBeenCalledWith('run-1');
    expect(addToastMock).toHaveBeenCalledWith(
      'Improve skills started. Skills may be updated or no changes may be made.',
      'success',
    );
    expect(wrapper.find('[data-test="skill-improvement-composer-cta-started"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="skill-improvement-composer-cta-open-improver-run"]').exists()).toBe(false);
  });

  it('hides an ineligible composer CTA without showing technical reasons', async () => {
    capabilityState.isEnabled = true;
    skillImprovementState.eligibilityByKey = {
      'agent:run-old': {
        eligible: false,
        reasons: ['Run was launched without a Skill Improvement snapshot.'],
        warnings: [],
        skillTargets: [],
        effectiveConfig: null,
      },
    };

    const wrapper = mountComponent({ kind: 'agent', runId: 'run-old' });
    await flushPromises();

    expect(wrapper.find('[data-test="skill-improvement-composer-cta"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="skill-improvement-composer-cta-message"]').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('Run was launched without a Skill Improvement snapshot.');
    expect(skillImprovementStoreMock.startAgentRunSkillImprovement).not.toHaveBeenCalled();
  });

  it('uses generic copy if an eligible run becomes ineligible at start time', async () => {
    capabilityState.isEnabled = true;
    skillImprovementState.eligibilityByKey = {
      'agent:run-race': {
        eligible: true,
        reasons: [],
        warnings: [],
        skillTargets: [],
        effectiveConfig: { enabled: true },
      },
    };
    skillImprovementStoreMock.fetchAgentRunEligibility.mockResolvedValueOnce({
      eligible: false,
      reasons: ['Run was created before Skill Improvement effective-config snapshots were recorded.'],
      warnings: [],
      skillTargets: [],
      effectiveConfig: null,
    });

    const wrapper = mountComponent({ kind: 'agent', runId: 'run-race' });
    await flushPromises();

    await wrapper.get('[data-test="skill-improvement-composer-cta"]').trigger('click');
    await flushPromises();

    expect(addToastMock).toHaveBeenCalledWith('This run is not eligible for Skill Improvement.', 'error');
    expect(addToastMock).not.toHaveBeenCalledWith(
      'Run was created before Skill Improvement effective-config snapshots were recorded.',
      'error',
    );
    expect(skillImprovementStoreMock.startAgentRunSkillImprovement).not.toHaveBeenCalled();
  });

  it('hides for the Retrospective Skill Improver helper run', async () => {
    capabilityState.isEnabled = true;
    const wrapper = mountComponent({ kind: 'agent', runId: 'helper-run-1', isHelperRun: true });
    await flushPromises();

    expect(wrapper.find('[data-test="skill-improvement-composer-cta"]').exists()).toBe(false);
    expect(skillImprovementStoreMock.fetchAgentRunEligibility).not.toHaveBeenCalled();
  });

  it('starts team-member Skill Improvement with member-scoped copy', async () => {
    capabilityState.isEnabled = true;
    skillImprovementState.eligibilityByKey = {
      'team-member:team-1:member-run-1': {
        eligible: true,
        reasons: [],
        warnings: [],
        skillTargets: [],
        effectiveConfig: { enabled: true },
      },
    };

    const wrapper = mountComponent({ kind: 'team-member', teamRunId: 'team-1', memberRunId: 'member-run-1' });
    await flushPromises();

    const button = wrapper.get('[data-test="skill-improvement-composer-cta"]');
    expect(button.text()).toContain('improve skills');
    expect(button.attributes('aria-label')).toBe("improve skills this member's run");
    expect(button.attributes('title')).toContain("this member's run");

    await button.trigger('click');
    await flushPromises();

    expect(skillImprovementStoreMock.fetchTeamMemberEligibility).toHaveBeenCalledWith('team-1', 'member-run-1');
    expect(skillImprovementStoreMock.startTeamMemberSkillImprovement).toHaveBeenCalledWith('team-1', 'member-run-1');
  });
});
