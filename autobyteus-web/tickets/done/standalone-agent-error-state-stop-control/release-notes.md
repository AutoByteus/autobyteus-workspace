## What's New
- Standalone agent runs that are visibly in Error now keep the existing Stop action in Workspaces history when the run is still active and eligible for termination.

## Improvements
- Error presentation now remains distinct from lifecycle activity, so inactive historical Error rows stay non-stoppable while current errored runs remain manageable.
- The Error-state Stop action keeps the existing localized accessible label, native keyboard operation, exact-run targeting, and per-run pending protection.

## Fixes
- Successful termination retains the history row and moves it to the existing inactive presentation.
- Failed or rejected termination no longer creates a false stopped state; the row stays visibly errored, shows failure feedback, and can be retried.
