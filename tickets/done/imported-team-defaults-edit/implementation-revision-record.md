# Implementation Revision Record — imported-team-defaults-edit

The current code and `implementation-handoff.md` are authoritative. This record indexes each completed
implementation handoff.

| IR | Date | Basis | Classification | Summary | Route |
| --- | --- | --- | --- | --- | --- |
| IR-001 | 2026-10-14 | Design and requirements `SR-003` (user decision: registered-package Teams/Orgs editable like Agents) | `Small` / `Low` (unchanged) | Initial baseline. Source class `external_read_only` → `registered_package` (owner `package_author`); the runtime rule writes `server_data` and `registered_package`, refuses `implementation_repository`; existing atomic save, revision check, filesystem check and Org-owned Team refusal unchanged. New provider and GraphQL tests; two old read-only tests updated; server and web docs. | `get_handoff_rules` → API/E2E |
| IR-002 | 2026-10-14 | Failure-origin review CRR-001 of API-F-001 (`Local Fix` IMPL-F-001) | `Small` / `Low` (unchanged) | The package writer stages saves with `verbatimSymlinks: true`, so relative links in a registered package (Team and Org saves) stay relative. +2 tests (writer-level file/dir links; registered Team save). tsc clean; affected suites pass; RPE e2e 8/8 incl. RPE-008. | `get_handoff_rules` → API/E2E |
