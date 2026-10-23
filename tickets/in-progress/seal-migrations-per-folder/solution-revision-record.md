# Solution Revision Record: seal-migrations-per-folder

| Revision | Phase | Trigger | Prior | Current | Result |
| --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements + Design | Task autobyteus-280; the user's sharing decision (2026-10-23) | N/A | Requirements Approved; design Ready | Sealed migration area (folders + one frozen layer), capability readiness, 205 repair, `autobyteus-ts` migration code moved, guideline rule |
| SR-002 | Design (review response) | ARCH-REV-001 AR-001..AR-005 | Design Ready (SR-001) | Design Ready | Split import rule and registry wiring (`SecretRemovalOwner` port; live provider names); one custom-provider gate in the store with the outcome of each entry form; token-usage error codes kept; one readiness owner including the initial pending state; 205 same-ID repair with guarded M4 and fixtures; `release-notes.md` added |

Note: ARCH-REV-002 **Pass** (2026-10-23). `/software_engineering_team/architecture_reviewer` passed SR-001 and SR-002 and delivered the implementation handoff itself. R-4 (web citation path) and R-6 (release notes mention the Settings retry) applied as wording only.
Note: at the user's request (2026-10-23: "it belongs to your responsibility … this is a kind of global behavior"), the Solution Designer wrote the guideline update (REQ-010) itself: commit `db787cb6f9`, `autobyteus-server-ts/docs/design/data_migration_guideline.md` §4 "Sealed migration area" and the §10 row. The implementation engineer was told.
