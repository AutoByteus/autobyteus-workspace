## What's New

## Improvements

- Simplified provider-native tool continuation so tool-equipped and no-tool
  turns share one streaming and request-assembly path while preserving
  context/media continuation, custom processors, approval, interruption, and
  provider-native history.
- Increased the built-in compactor agent's ordinary final-output wait from two
  minutes to five minutes, allowing slower local models and very large contexts
  more time to complete.
- Kept explicit compactor timeout overrides authoritative and preserved typed
  timeout errors, event unsubscription, and child-run cleanup.

## Fixes

- Removed duplicate tool-result memory coordination while preserving native
  result order and one final memory commit per completed tool batch.
- New runs no longer write coordination-only `tool_continuation` history cards;
  meaningful tool calls and results remain available in memory and run history.
- Prevented supported compaction workloads from failing at the previous
  two-minute server completion boundary.

## Compatibility And Migration

- Removed obsolete handler, factory, continuation-mode, and built-in memory
  processor exports without compatibility aliases. External package consumers
  must update imports to the retained canonical streaming handler, schema,
  segment, and custom processor contracts.
- Existing memory files, run history, raw traces, and historical continuation
  cards remain directly usable. No migration or stored-data rewrite is required.
