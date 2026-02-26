import { describe, expect, it } from 'vitest';
import type { SetupStepState } from '~/types/messaging';
import {
  isStepAllowedForOrder,
  resolveActiveStep,
  resolveGuidedStep,
} from '~/utils/messagingStepSelectionPolicy';

describe('messagingStepSelectionPolicy', () => {
  const stepOrder = ['gateway', 'personal_session', 'binding', 'verification'] as const;

  function buildSteps(
    statuses: SetupStepState['status'][],
  ): SetupStepState[] {
    return stepOrder.map((key, index) => ({
      key,
      status: statuses[index],
    }));
  }

  it('returns first non-ready step for guided flow', () => {
    const guided = resolveGuidedStep(
      [...stepOrder],
      buildSteps(['READY', 'PENDING', 'PENDING', 'PENDING']),
    );

    expect(guided).toBe('personal_session');
  });

  it('falls back to last step when all steps are done', () => {
    const guided = resolveGuidedStep(
      [...stepOrder],
      buildSteps(['DONE', 'READY', 'DONE', 'READY']),
    );

    expect(guided).toBe('verification');
  });

  it('prioritizes manual selection when it is valid for provider order', () => {
    const active = resolveActiveStep({
      stepOrder: [...stepOrder],
      stepStates: buildSteps(['READY', 'PENDING', 'PENDING', 'PENDING']),
      manualStep: 'binding',
    });

    expect(active).toBe('binding');
  });

  it('falls back to guided selection when manual step is invalid', () => {
    const active = resolveActiveStep({
      stepOrder: ['gateway', 'binding', 'verification'],
      stepStates: [
        { key: 'gateway', status: 'PENDING' },
        { key: 'binding', status: 'PENDING' },
        { key: 'verification', status: 'PENDING' },
      ],
      manualStep: 'personal_session',
    });

    expect(active).toBe('gateway');
  });

  it('validates step keys against provider step order', () => {
    expect(isStepAllowedForOrder('binding', ['gateway', 'binding', 'verification'])).toBe(true);
    expect(
      isStepAllowedForOrder('personal_session', ['gateway', 'binding', 'verification']),
    ).toBe(false);
  });
});
