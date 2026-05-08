## Improvements

- Renamed application “runtime resources” to “execution resources” across manifests, SDK contracts, backend runtime control, REST/GraphQL/web setup, and first-party application packages so app-selectable agents and teams are described clearly.

## Breaking Change / Reconfiguration Notes

- External application manifests and SDK consumers must use the new execution-resource names: `executionResourceSlots`, `allowedExecutionResourceKinds`, `allowedExecutionResourceSources`, `defaultExecutionResourceRef`, `executionResourceRef`, `source`, `listAvailableExecutionResources(...)`, and `getConfiguredExecutionResource(...)`. The old public runtime-resource/owner names are intentionally removed rather than aliased.
- There is no platform migration for old execution-resource persisted shapes. Stale saved setup rows using old `resourceRef` / `owner` shapes reset to not-configured and must be reconfigured; stale old run-binding summaries are dropped instead of converted or exposed.

## Finalization Note

- Archived for future release-note use only. The verified change was finalized without a new release version, tag, or publication by user request.
