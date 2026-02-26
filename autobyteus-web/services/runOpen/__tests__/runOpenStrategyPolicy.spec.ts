import { describe, expect, it } from 'vitest';
import { decideRunOpenStrategy } from '~/services/runOpen/runOpenStrategyPolicy';

describe('runOpenStrategyPolicy', () => {
  it('hydrates inactive runs', () => {
    const strategy = decideRunOpenStrategy({
      isRunActive: false,
      hasExistingContext: true,
      isExistingContextSubscribed: true,
    });

    expect(strategy).toBe('HYDRATE_FROM_PROJECTION');
  });

  it('keeps live context for active subscribed run', () => {
    const strategy = decideRunOpenStrategy({
      isRunActive: true,
      hasExistingContext: true,
      isExistingContextSubscribed: true,
    });

    expect(strategy).toBe('KEEP_LIVE_CONTEXT');
  });

  it('hydrates active run when context is missing or unsubscribed', () => {
    const missingContextStrategy = decideRunOpenStrategy({
      isRunActive: true,
      hasExistingContext: false,
      isExistingContextSubscribed: false,
    });
    const unsubscribedContextStrategy = decideRunOpenStrategy({
      isRunActive: true,
      hasExistingContext: true,
      isExistingContextSubscribed: false,
    });

    expect(missingContextStrategy).toBe('HYDRATE_FROM_PROJECTION');
    expect(unsubscribedContextStrategy).toBe('HYDRATE_FROM_PROJECTION');
  });
});
