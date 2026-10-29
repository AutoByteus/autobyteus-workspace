# Implementation Revision Record

The current code and `implementation-handoff.md` remain authoritative. This record locates the implementation baseline and its rationale.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Solution Designer, design-spec.md at SR-002 (initial implementation; SR-001 implementation held mid-round for the user's requirement change) | N/A | `Initial Baseline` | SR-001, SR-002; ARCH-REV N/A; CRR N/A; API-REV N/A; DR N/A | Implementation complete; direct API/E2E route |
| IR-002 | Architecture Reviewer pass ARCH-REV-002 on design SR-005 (after CR-FO-001 from CRR-001 / API-REV-001, and implementation Design Impact DI-1/DI-2 on SR-003) | CR-FO-001; DI-1, DI-2; AR-001, AR-002; IG-1, IG-2 | `Design Impact` (rework on revised design) | SR-003, SR-004, SR-005; ARCH-REV-001, ARCH-REV-002; CRR-001; API-REV-001; DR N/A | Implementation complete; code review route (Medium / High) |

## Revision Entries

### IR-001 — Claude effort control: one thinking list, no display, owned config keys; gen-4 Claude rows removed

- Triggering role, report path, and round: Solution Designer, `design-spec.md` (SR-002, ticket docs commit `4db2efa01`), initial implementation round.
- Triggering finding IDs: N/A.
- Classification: `Initial Baseline`.
- Prior authoritative result: N/A. (Within this round the SR-001 design was implemented first and committed as WIP `781823e77`; the user changed the thinking UX on seeing the rendered menu, it was returned as a Requirement Gap and the Solution Designer issued SR-002. The SR-001 WIP is history only, not a delivered result.)
- Current authoritative result: implementation commit `574aa0bd7`; tests and evidence committed with this record.
- Related solution revision IDs: SR-001 (superseded), SR-002.
- Related architecture-review revision IDs: N/A (direct route).
- Related code-review revision IDs: N/A (direct route).
- Related API/E2E revision IDs: N/A.
- Related delivery revision IDs: N/A.
- Why this baseline is recorded: first implementation handoff for the package.
- Approved behavior or requirement IDs affected: REQ-001..REQ-011; AC-001..AC-011; BEH-001..BEH-007.
- Implementation delta (against base `9ad7540c2`):
  - Catalog: `reasoning_effort` on all 7 Claude rows (levels low..max; default medium for Opus 5.5 and Haiku 5.5, high otherwise); no `thinking_display` anywhere; switch rows = `thinking_enabled` + `reasoning_effort`; Opus 5.5 and Fable 5.1 = effort only; gen-4 rows and the budget schema removed.
  - Policy: `ANTHROPIC_EFFORT_LEVELS`; `legacy_budget`, its entries and the unknown-model fallback removed (unknown value throws).
  - `AnthropicLLM`: reads only `thinking_enabled` and `reasoning_effort` from the run config (no other config key is sent); `output_config.effort` merged in, not sent while thinking is off; never sends `display`; unknown effort fails locally; budget/temperature-0 branches removed.
  - Web: Claude keys `thinking_enabled` + dependent `reasoning_effort` (existing merged one-list menu); budget and display handling removed, including the now-unused numeric menu parameter.
  - Docs and tests updated; new server-level AC-011 resume test (synthetic by default, live with the test vault).
- Changed files or areas: see `implementation-handoff.md` Key Files.
- Local validation and result: Checks Run IMP-01..IMP-14 in `implementation-handoff.md`; all pass except 3 pre-existing environmental terminal-tool failures (IMP-02) and 1 intermittent unrelated web teardown error (IMP-03).
- Next recipient or routing: `/software_engineering_team/api_e2e_engineer` (task_size Medium, architectural_risk Low).
- Remaining limitations or risks: RISK-1..RISK-4 in `implementation-handoff.md`.

### IR-002 — Server model-settings check leaves undeclared keys out; every caller saves or launches only the canonical selection

- Triggering role, report path, and round: Architecture Reviewer, `design-review-report.md` round 2 (ARCH-REV-002, pass) on `design-spec.md` SR-005; originating findings: CR-FO-001 in `code-review-report.md` (CRR-001) from API/E2E round 1 (`api-e2e-execution-coverage-report.md`, API-REV-001, cases API-04/API-06); IR-002 round.
- Triggering finding IDs: CR-FO-001; DI-1, DI-2 (implementation Design Impact on SR-003, 2026-10-29: the SR-003 client fix was placed on a component the stopped-run edit does not use, and an Org workspace-only edit revalidates untouched stored configs); AR-001, AR-002 (ARCH-REV-001); IG-1, IG-2 (ARCH-REV-002 guidance).
- Classification: `Design Impact` (rework on the revised design; SR-003 was never implemented).
- Prior authoritative result: IR-001, implementation `574aa0bd7` (handoff `a2a5d0e47`); API/E2E round 1 Fail on the stopped-run edit leg of REQ-011 (API-04, API-06).
- Current authoritative result: implementation `47f44c3df`; evidence and documents in the handoff commit.
- Related solution revision IDs: SR-003 (superseded), SR-004, SR-005.
- Related architecture-review revision IDs: ARCH-REV-001, ARCH-REV-002.
- Related code-review revision IDs: CRR-001.
- Related API/E2E revision IDs: API-REV-001.
- Related delivery revision IDs: N/A.
- Why this implementation revision is recorded: stopped-run settings saves of real saved runs holding `thinking_display` were refused (agent, team; Org by code), and the user chose no data migration (DEC-011 B).
- Approved behavior or requirement IDs affected: REQ-011 (edit leg); AC-012, AC-013; DEC-011.
- Implementation delta:
  - `validateModelConfigSchema`: top-level keys the schema does not declare are left out of the canonical config (no error); a null schema canonicalizes any config to `null`; a config emptied by the omission becomes `null` (a submitted `{}` stays `{}`); declared-key checks unchanged. `Object.hasOwn` replaces a truthy lookup.
  - Caller #6, Org launch (IG-1 applied): `AgentOrgRunPlanner.build` takes the resolved plan (`ResolvedAgentOrgLaunchPlan`) instead of re-resolving raw inputs; `AgentOrgRunService.validateCompleteConfiguration` returns the same plan with each placement's validated selection, and the tree is built from it.
  - Caller #7, launch usability (IG-2 applied): `LaunchUsabilityCheck` returns canonical launches for usable candidates and an `InheritedLaunchVerdict` (`{ usable: true, launch }` canonical, or `{ usable: false, detail }`) instead of `inheritedFailure`; `CollaboratorLaunchResolver` launches the canonical inherited copy when valid and keeps the raw copy only when its check failed (never launched; same refusal as before).
  - Docs: `run_history.md`, `llm_management.md` (validation rule + caller rule), `autobyteus-web/docs/settings.md`.
- Changed files or areas: 5 server src files; server tests (validator unit, Org launch unit, new usability unit, new e2e AC-012/AC-013, 4 updated e2e suites, 8 test fakes made faithful); web probe `delegated-launch-defaults-probe.mjs`; 3 docs.
- Local validation and result: IMP-15..IMP-21 in `implementation-handoff.md` (all pass; full server unit suite failures are pre-existing/environmental, each shown to fail without the change).
- Next recipient or routing: `/software_engineering_team/code_reviewer` (task_size Medium, architectural_risk High).
- Remaining limitations or risks: RISK-5..RISK-7 in `implementation-handoff.md` (silent omission of typo keys; behavior change for configs on models without a schema; undeclared nested keys still refused).

