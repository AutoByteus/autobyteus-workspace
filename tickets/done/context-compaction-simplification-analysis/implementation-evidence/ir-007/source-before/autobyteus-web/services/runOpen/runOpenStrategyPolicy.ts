export type RunOpenStrategy = 'KEEP_LIVE_CONTEXT' | 'HYDRATE_FROM_PROJECTION';

export interface RunOpenStrategyInput {
  isRunActive: boolean;
  hasExistingContext: boolean;
  isExistingContextSubscribed: boolean;
}

export const decideRunOpenStrategy = (
  input: RunOpenStrategyInput,
): RunOpenStrategy => {
  if (!input.isRunActive) {
    return 'HYDRATE_FROM_PROJECTION';
  }

  if (input.hasExistingContext && input.isExistingContextSubscribed) {
    return 'KEEP_LIVE_CONTEXT';
  }

  return 'HYDRATE_FROM_PROJECTION';
};
