# Implementation Revision Record

The current code and `implementation-handoff.md` remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Solution Designer, `solution-designer-handoff.md`, initial | N/A | `Initial Baseline` | SR-001 | Implemented; checks pass except a pre-existing base guard failure (FU-001); ready for direct API/E2E |

## Revision Entries

### IR-001: catalog transition prepares runtime folders before readiness

- Triggering role, report path, and round: Solution Designer, `solution-designer-handoff.md`, initial
- Triggering finding IDs: N/A
- Classification: `Initial Baseline`
- Prior authoritative result: `N/A`
- Current authoritative result: implementation at `1d49973440`; IMP-01…IMP-04 pass; IMP-05 1 pre-existing failure (cause recorded)
- Related solution revision IDs: `SR-001`
- Related architecture-review revision IDs: `N/A`
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Why this baseline is recorded: initial implementation handoff
- Approved behavior or requirement IDs affected: BEH-001, BEH-003 (changed); BEH-002 (preserved); REQ-001…003; AC-001…004
- Implementation delta: new `storageLifecycleService` dependency on `ApplicationCatalogTransitionService`; `commitAndRecover` awaits `ensureRuntimeDirectoryPrepared` for each current application after the commits and before readiness; wiring; transition order unit tests; new import-then-launch E2E (IC-01, IC-02)
- Changed files or areas: `application-catalog-transition-service.ts`, `build-application-platform-runtime.ts`, `application-catalog-transition-service.test.ts`, `application-execution-event-journal-recovery.test.ts`, `tests/e2e/runtime/application-import-codex-launch.e2e.test.ts` (new)
- Local validation and result: see the handoff's Checks Run
- Next recipient or routing: per `get_handoff_rules` (direct API/E2E for Small + Low)
- Remaining limitations or risks: AC-002 is proven on the imported ACTIVE application after sign-out, because a sign-out at import quarantines it with a generic detail (FU-002); the architecture guard is red on base (FU-001)
