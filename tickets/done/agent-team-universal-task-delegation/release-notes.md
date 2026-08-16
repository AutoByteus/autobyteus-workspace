# Universal Task Delegation

> Finalized ticket-branch notes. No product release or deployment is included.

## What's New

- Team members can delegate work to valid Agent or Team targets throughout
  nested and heterogeneous Team structures using stable logical addresses.
- Delegated tasks retain exact lifecycle, communication, reference-file,
  execution-tree, history, and persistence behavior across process reopen and
  restore.
- Startup now repairs persisted current TeamRun packages before catalog
  admission and server exposure, while isolating root-local failures.

## Improvements

- Unified server Team execution under one `MixedTeamManager` with
  runtime-specific AgentRuns for AutoByteus, Codex, and Claude members.
- Currentized application SDK contracts to V6 and removed obsolete runtime
  identity, communication-store, migration, and compatibility owners.
- Preserved v1.4.52 compaction error/interruption/timeout semantics while using
  the current AgentRun input lifecycle boundary.

## Validation

- Source review: CRR-021 Pass / 92.8%.
- API/E2E: API-REV-008 Pass / 98.3%.
- Requirements: 21/21 use cases and 56/56 acceptance criteria pass.
- Fresh real AutoByteus, Codex, and Claude evidence is included.
- No repository-resident durable tests changed after the successful API/E2E
  execution, so CRR-022 is Not Applicable.

No version, release, tag, publication, or deployment decision has been made.
