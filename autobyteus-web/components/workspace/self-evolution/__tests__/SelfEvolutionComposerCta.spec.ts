import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import SelfEvolutionComposerCta from '../SelfEvolutionComposerCta.vue';
import type { SelfEvolutionComposerCtaTarget } from '../selfEvolutionComposerCtaTarget';

const flushPromises = async () => {
  await Promise.resolve();
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
};

const {
  capabilityState,
  capabilityStoreMock,
  selfEvolutionState,
  selfEvolutionStoreMock,
  addToastMock,
} = vi.hoisted(() => {
  const capabilityState = {
    isEnabled: false,
  };
  const selfEvolutionState = {
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
    selfEvolutionState,
    selfEvolutionStoreMock: {
      get eligibilityByKey() {
        return selfEvolutionState.eligibilityByKey;
      },
      get loadingKeys() {
        return selfEvolutionState.loadingKeys;
      },
      agentKey: (runId: string) => `agent:${runId}`,
      teamMemberKey: (teamRunId: string, memberRunId: string) => `team-member:${teamRunId}:${memberRunId}`,
      fetchAgentRunEligibility: vi.fn(async (runId: string) => {
        const key = `agent:${runId}`;
        return selfEvolutionState.eligibilityByKey[key] ?? {
          eligible: false,
          reasons: ['No eligibility was cached.'],
          warnings: [],
          skillTargets: [],
          effectiveConfig: null,
        };
      }),
      fetchTeamMemberEligibility: vi.fn(async (teamRunId: string, memberRunId: string) => {
        const key = `team-member:${teamRunId}:${memberRunId}`;
        return selfEvolutionState.eligibilityByKey[key] ?? {
          eligible: false,
          reasons: ['No eligibility was cached.'],
          warnings: [],
          skillTargets: [],
          effectiveConfig: null,
        };
      }),
      startAgentRunSelfEvolution: vi.fn().mockResolvedValue({
        evolutionRunId: 'evolution-1',
        evolverRunId: 'evolver-run-1',
        record: { evolutionRunId: 'evolution-1', status: 'requested', errors: [] },
      }),
      startTeamMemberSelfEvolution: vi.fn().mockResolvedValue({
        evolutionRunId: 'evolution-team-1',
        evolverRunId: 'evolver-team-run-1',
        record: { evolutionRunId: 'evolution-team-1', status: 'requested', errors: [] },
      }),
    },
    addToastMock: vi.fn(),
  };
});

vi.mock('~/stores/selfEvolutionCapabilityStore', () => ({
  useSelfEvolutionCapabilityStore: () => capabilityStoreMock,
}));

vi.mock('~/stores/selfEvolutionStore', () => ({
  useSelfEvolutionStore: () => selfEvolutionStoreMock,
}));

vi.mock('~/composables/useToasts', () => ({
  useToasts: () => ({
    addToast: addToastMock,
  }),
}));

describe('SelfEvolutionComposerCta', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capabilityState.isEnabled = false;
    selfEvolutionState.eligibilityByKey = {};
    selfEvolutionState.loadingKeys = {};
  });

  const mountComponent = (target: SelfEvolutionComposerCtaTarget | null) => mount(SelfEvolutionComposerCta, {
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

    expect(wrapper.find('[data-test="self-evolution-composer-cta"]').exists()).toBe(false);
    expect(capabilityStoreMock.ensureResolved).toHaveBeenCalledTimes(1);
    expect(selfEvolutionStoreMock.fetchAgentRunEligibility).not.toHaveBeenCalled();
  });

  it('starts standalone self-evolution from an eligible composer CTA', async () => {
    capabilityState.isEnabled = true;
    selfEvolutionState.eligibilityByKey = {
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

    const button = wrapper.get('[data-test="self-evolution-composer-cta"]');
    expect(button.text()).toContain('self improve');
    expect(button.attributes('aria-label')).toBe('self improve this run');
    expect(button.attributes('title')).toContain('this run');
    expect(button.attributes('disabled')).toBeUndefined();

    await button.trigger('click');
    await flushPromises();

    expect(selfEvolutionStoreMock.fetchAgentRunEligibility).toHaveBeenCalledWith('run-1');
    expect(selfEvolutionStoreMock.startAgentRunSelfEvolution).toHaveBeenCalledWith('run-1');
    expect(addToastMock).toHaveBeenCalledWith(
      'self improve started. Skills may be updated or no changes may be made.',
      'success',
    );
    expect(wrapper.find('[data-test="self-evolution-composer-cta-started"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="self-evolution-composer-cta-open-evolver-run"]').exists()).toBe(false);
  });

  it('hides an ineligible composer CTA without showing technical reasons', async () => {
    capabilityState.isEnabled = true;
    selfEvolutionState.eligibilityByKey = {
      'agent:run-old': {
        eligible: false,
        reasons: ['Run was launched without a self-evolution snapshot.'],
        warnings: [],
        skillTargets: [],
        effectiveConfig: null,
      },
    };

    const wrapper = mountComponent({ kind: 'agent', runId: 'run-old' });
    await flushPromises();

    expect(wrapper.find('[data-test="self-evolution-composer-cta"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="self-evolution-composer-cta-message"]').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('Run was launched without a self-evolution snapshot.');
    expect(selfEvolutionStoreMock.startAgentRunSelfEvolution).not.toHaveBeenCalled();
  });

  it('uses generic copy if an eligible run becomes ineligible at start time', async () => {
    capabilityState.isEnabled = true;
    selfEvolutionState.eligibilityByKey = {
      'agent:run-race': {
        eligible: true,
        reasons: [],
        warnings: [],
        skillTargets: [],
        effectiveConfig: { enabled: true },
      },
    };
    selfEvolutionStoreMock.fetchAgentRunEligibility.mockResolvedValueOnce({
      eligible: false,
      reasons: ['Run was created before self-evolution effective-config snapshots were recorded.'],
      warnings: [],
      skillTargets: [],
      effectiveConfig: null,
    });

    const wrapper = mountComponent({ kind: 'agent', runId: 'run-race' });
    await flushPromises();

    await wrapper.get('[data-test="self-evolution-composer-cta"]').trigger('click');
    await flushPromises();

    expect(addToastMock).toHaveBeenCalledWith('This run is not eligible for self-improvement.', 'error');
    expect(addToastMock).not.toHaveBeenCalledWith(
      'Run was created before self-evolution effective-config snapshots were recorded.',
      'error',
    );
    expect(selfEvolutionStoreMock.startAgentRunSelfEvolution).not.toHaveBeenCalled();
  });

  it('hides for the Skill Self-Evolver helper run', async () => {
    capabilityState.isEnabled = true;
    const wrapper = mountComponent({ kind: 'agent', runId: 'helper-run-1', isHelperRun: true });
    await flushPromises();

    expect(wrapper.find('[data-test="self-evolution-composer-cta"]').exists()).toBe(false);
    expect(selfEvolutionStoreMock.fetchAgentRunEligibility).not.toHaveBeenCalled();
  });

  it('starts team-member self-evolution with member-scoped copy', async () => {
    capabilityState.isEnabled = true;
    selfEvolutionState.eligibilityByKey = {
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

    const button = wrapper.get('[data-test="self-evolution-composer-cta"]');
    expect(button.text()).toContain('self improve');
    expect(button.attributes('aria-label')).toBe("self improve this member's run");
    expect(button.attributes('title')).toContain("this member's run");

    await button.trigger('click');
    await flushPromises();

    expect(selfEvolutionStoreMock.fetchTeamMemberEligibility).toHaveBeenCalledWith('team-1', 'member-run-1');
    expect(selfEvolutionStoreMock.startTeamMemberSelfEvolution).toHaveBeenCalledWith('team-1', 'member-run-1');
  });
});
