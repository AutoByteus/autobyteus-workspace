import type { SetupStepKey, SetupStepState } from '~/types/messaging';

export interface ResolveActiveStepInput {
  stepOrder: SetupStepKey[];
  stepStates: SetupStepState[];
  manualStep: SetupStepKey | null;
}

export function isStepAllowedForOrder(
  step: SetupStepKey,
  stepOrder: SetupStepKey[],
): boolean {
  return stepOrder.includes(step);
}

export function resolveGuidedStep(
  stepOrder: SetupStepKey[],
  stepStates: SetupStepState[],
): SetupStepKey {
  const statusByStep = new Map(
    stepStates.map((stepState) => [stepState.key, stepState.status] as const),
  );

  for (const stepKey of stepOrder) {
    const status = statusByStep.get(stepKey);
    if (status !== 'READY' && status !== 'DONE') {
      return stepKey;
    }
  }

  const lastStep = stepOrder[stepOrder.length - 1];
  return lastStep || 'verification';
}

export function resolveActiveStep({
  stepOrder,
  stepStates,
  manualStep,
}: ResolveActiveStepInput): SetupStepKey {
  if (manualStep && isStepAllowedForOrder(manualStep, stepOrder)) {
    return manualStep;
  }
  return resolveGuidedStep(stepOrder, stepStates);
}
