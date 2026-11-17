# Handoff — autobyteus-508: Architecture Design Complete

- Package: `member-runtime-lost-508` (Task autobyteus-508, Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`), SR-001
- Status: `Architecture Design Complete`; requirements Approved by the founder (2026-11-17, Solution Designer's conversation); design Ready; the founder confirmed the design approach (same-ID correction).
- Classification: `task_size: Small`, `architectural_risk: Low`
- Worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/member-runtime-lost-508`, `codex/member-runtime-lost-508`; base `origin/personal` @ `a8ac226e65a724169aeac58fef7321f2defcd9c5`; finalization target `origin/personal`.
- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/member-runtime-lost-508/tickets/in-progress/member-runtime-lost-508/`

## Original request

The founder's report: after upgrading node 8001 to v1.5.13-beta.7 (carries autobyteus-461), the Job Application Team's Computer Use Operator, which he had switched to Codex App Server + gpt-6.1-terra, shows Claude Agent SDK + gpt-6.1-terra ("Inherited from the run") and cannot start. Find the cause and fix it. Hard rules: his data is private (read-only, counts and structure only, nothing copied off the node, no writes without his approval and a backup), release only on his word.

## Cause (Read + Reproduced + Measured)

`20261111_delegated_runs_own_runs_v1` (and the `20261114_*` follow-ups, which reuse it) turns a pre-461 Settings edit (`userLaunchSelection {runtimeKind?, llmModelIdentifier, llmConfig}`) into the run's own launch but copies only the model and settings (`run-file-conversion.ts:52-59, 64-65, 96-102`); the edit's runtime is lost and the edited record's source dropped (so it shows the team's "Inherited from the run"). The probe `probes/probe-508-runtime-selection.test.ts` fails on all 3 paths with the founder's exact pair. On node 8001 the operator's trace manifest shows it ran on `codex_app_server`; server.log has 2 × "No conversation found" (a Codex thread resumed on Claude).

## Scope (the founder's decisions, 2026-11-17)

- Fix the existing migration under the same ID (no new migration) so installations that have not upgraded convert correctly.
- He repairs his already-converted records himself in Settings. No change to his data by the team.
- Only his installations have the wrong data; 461 is not in a stable release yet. **Release gate REQ-004: the corrected conversion must ship before 461 reaches a stable release; release only on the founder's word.**
- Mismatch warning / start refusal: FU-001 (non-urgent follow-up).

## What implementation does (design-spec.md)

1. Released-shape fixtures + tests for AC-001…AC-006 in the existing 461 test files (member own edit, team-level edit to followers, delegated agent run edit, model-only edit, pending switch, one late item through a `20261114_*` follow-up). Start from the probe (red), command in design-spec "Guidance For Implementation"; do not commit the probe under `tests/`.
2. `run-file-conversion.ts`: one local `withEdit` (runtime when named, model, `llmConfig ?? null`) used by both conversions; edited records get a module-local `SETTINGS_EDIT_SOURCE = {origin: "settings", fallbacks: []}` (no application-code import: sealed migration area).
3. Update the two existing expectations for edited members' source; update the migration's doc comments.
4. Run the 461 test folder, the registry order test, the server typecheck.

## Affected data (for the record; no action by the team)

Node 8001: 16 records in 9 runs (6 team runs, 3 agent runs). Desktop's own node: 2 records in 2 runs. Node 8003: 0. Node 50433: still 1.5.12-beta.9 (not converted). Details: investigation-notes.md "Affected records".

## Open risks

- REQ-004 timing (above).
- FU-001 unsent until the ticket leaves the team.

## Expected output

Implementation per design-spec.md, then the normal route (API/E2E, delivery).

## Route

See Route line below.

- Route (get_handoff_rules, 2026-11-17): Small / Low → `/implementation_engineer` (direct implementation route; no independent architecture review).
