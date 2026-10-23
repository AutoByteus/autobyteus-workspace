# Solution Revision Record: seal-migrations-per-folder

| Revision | Phase | Trigger | Prior | Current | Result |
| --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements + Design | Task autobyteus-280; the user's sharing decision (2026-10-23) | N/A | Requirements Approved; design Ready | Sealed migration area (folders + one frozen layer), capability readiness, 205 repair, `autobyteus-ts` migration code moved, guideline rule |
| SR-002 | Design (review response) | ARCH-REV-001 AR-001..AR-005 | Design Ready (SR-001) | Design Ready | Split import rule and registry wiring (`SecretRemovalOwner` port; live provider names); one custom-provider gate in the store with the outcome of each entry form; token-usage error codes kept; one readiness owner including the initial pending state; 205 same-ID repair with guarded M4 and fixtures; `release-notes.md` added |

Note: ARCH-REV-002 **Pass** (2026-10-23). `/software_engineering_team/architecture_reviewer` passed SR-001 and SR-002 and delivered the implementation handoff itself. R-4 (web citation path) and R-6 (release notes mention the Settings retry) applied as wording only.
Note: at the user's request (2026-10-23: "it belongs to your responsibility … this is a kind of global behavior"), the Solution Designer wrote the guideline update (REQ-010) itself: commit `db787cb6f9`, `autobyteus-server-ts/docs/design/data_migration_guideline.md` §4 "Sealed migration area" and the §10 row. The implementation engineer was told.
| SR-003 | Design (implementation Design Impact DI-001) | The implementation engineer's two port proposals and two implementation decisions | Design Ready (SR-002, ARCH-REV-002 Pass) | Design Ready | Ports `definition-name-lookup` and `run-history-catalog-invalidation`; D-7 replaced (the module was migration-only: wrong premise); no cross-migration imports, enforced by the test; guideline updated |
Note: ARCH-REV-003 **Pass** (SR-001..SR-003; DI-001 resolved); the reviewer delivered the handoff to implementation itself. R-7 applied: retirement step 2 in the guideline now also removes the retired id from the remaining migrations' `prerequisiteMigrationIds`.
