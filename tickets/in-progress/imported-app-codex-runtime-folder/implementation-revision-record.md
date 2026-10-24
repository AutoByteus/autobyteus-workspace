# Implementation Revision Record

The current code and `implementation-handoff.md` remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Solution Designer, `solution-designer-handoff.md`, initial | N/A | `Initial Baseline` | SR-001 | Implemented; checks pass except a pre-existing base guard failure (FU-001); ready for direct API/E2E |
| IR-002 | Solution Designer, `solution-designer-handoff.md` SR-002 (after CRR-001 / API-REV-001) | C-01, API-06 | `Requirement Gap` resolved upstream (DEC-004); no implementation delta | SR-002, CRR-001, API-REV-001 | No code change; implementation `1d49973440` stands; forwarded to API/E2E |

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

### IR-002: SR-002 re-route, no code change

- Triggering role, report path, and round: Solution Designer, `solution-designer-handoff.md` (SR-002 section), after code review `code-review-report.md` (CRR-001) and API/E2E `api-e2e-execution-coverage-report.md` (API-REV-001)
- Triggering finding IDs: C-01 (CRR-001), API-06 (API-REV-001)
- Classification: `Requirement Gap`, resolved by the Solution Designer (DEC-004); no implementation-owned fix
- Prior authoritative result: IR-001, implementation at `1d49973440`
- Current authoritative result: unchanged, `1d49973440` (no source or test change since: `git diff --stat 1d49973440 2794a5ddca -- autobyteus-server-ts` is empty)
- Related solution revision IDs: `SR-002`
- Related architecture-review revision IDs: `N/A`
- Related code-review revision IDs: `CRR-001`
- Related API/E2E revision IDs: `API-REV-001`
- Related delivery revision IDs: `N/A`
- Why this implementation revision is recorded: the package was re-routed through implementation with a narrowed AC-003 and clarified AC-005; the classification was rechecked
- Approved behavior or requirement IDs affected: AC-003 (narrowed: folders prepared after the commit and before readiness on a reload; proven by API-02 and the IMP-02 unit test); AC-005 (import then launch with the real `codex`, no reload); C-01 → FU-003
- Implementation delta: none
- Changed files or areas: `implementation-handoff.md` (upstream, revision IDs, BEH-003 row) and this record only
- Local validation and result: none rerun; IMP-01…IMP-05 remain valid for `1d49973440` (code unchanged)
- Classification recheck: `Small` / `Low`, unchanged
- Next recipient or routing: direct API/E2E (`get_handoff_rules`: Small/Medium + Low)
- Remaining limitations or risks: FU-001 (architecture guard red on base), FU-002, FU-003
