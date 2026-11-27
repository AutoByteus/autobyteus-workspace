# Delivery / Release / Deployment Report — usage-limit-fallback-646 (autobyteus-646)

## Release / Publication / Deployment Scope

- Ticket `usage-limit-fallback-646` (Project Task `autobyteus-646`), `task_size: Large`, `architectural_risk: High`, reviewed route (source review CRR-002 Pass 9.4/10 and CRR-004 Pass for the base refresh, API/E2E API-REV-001 Pass 94%, test-code review CRR-003 Pass).
- Scope: the base refresh, docs sync, verification from evidence, finalization onto `personal`, the archive and cleanup. **No release**: not asked for, RELEASE.md's default is none, and the Solution Designer holds it until the founder approves R-6 (the Model Router's switch-request template, not in the code) and decides DEC-008 (how long switch records are kept; 90 days applies meanwhile).
- Delivery rounds: round 1 was blocked on one import conflict in `build-studio-server.ts` against autobyteus-516 (`Local Fix`, resolved as IR-003 and reviewed as CRR-004); round 2 (this one) completed.

## Project Release Guide

- Release guide path and revision: `RELEASE.md` at `origin/personal` @ `85174411168c`.
- Deviations from the guide and why: `None`. The guide's "audit, do not redo" rule held: delivery opened the execution report and the evidence it names and did not rerun the whole unit, integration or E2E suites (IMP-11, IMP-12, API-03) or the browser probe.
- Proposed guide fixes: `None`.

## Handoff Summary

- Handoff summary artifact: `tickets/done/usage-limit-fallback-646/handoff-summary.md`
- Handoff summary status: `Updated`
- Delivery revision record: `tickets/done/usage-limit-fallback-646/delivery-revision-record.md`
- Current delivery revision ID: `DR-001`
- Notes: the ticket documents are archived under `tickets/done/usage-limit-fallback-646/`; paths in earlier documents that say `tickets/in-progress/usage-limit-fallback-646/` mean this folder.

## Initial Delivery Integration Refresh

- Bootstrap base reference: `origin/personal` @ `bc4351cad7`
- Latest tracked remote base reference checked: `85174411168c` (125 commits ahead at the start of round 1; unchanged when the package returned and before the push).
- Base advanced since bootstrap: `Yes`
- New base commits integrated into the ticket branch: `Yes`, 125 commits (autobyteus-516 and 657 extensions, autobyteus-581 sandbox provider relay and others). Eight files were changed by both sides: `build-studio-server.ts` (the one conflict, in the imports: this ticket's `composeRunEvents` against autobyteus-516's five extension imports), `server-settings-service.ts`, `generated/graphql.ts`, web `settings.md`, `modules/README.md`, and three remote-collaboration unit tests; the other seven merged automatically.
- Local checkpoint commit result: `Not needed` (the tree was clean)
- Integration method: `Merge`. Delivery attempted it, aborted on the conflict and routed it (`Local Fix`, the skill's rule for a conflict in production code); the implementation engineer merged as `3a541e3d45` (IR-003, keeping both import blocks) and the code reviewer verified it as an exact union of both sides (CRR-004).
- Integration result: `Completed`
- Post-integration executable checks rerun: `Yes` (`evidence/DEL-post-integration/`, merged state `3a541e3d45` at HEAD `78df7abb81`):

| Check | Result |
| --- | --- |
| `pnpm install --frozen-lockfile` | exit 0 (`DEL-01`) |
| `pnpm -C autobyteus-web codegen:check` (both sides changed `generated/graphql.ts`) | `autobyteus-web/generated/graphql.ts is current.` (`DEL-01`) |
| `pnpm -C autobyteus-server-ts typecheck` | `production errors: 0; test-file errors: 972 in 299 files (baseline 972 in 299 files)`, PASS (`DEL-01`) |
| `pnpm -C autobyteus-web typecheck` | `... 85 in 35 files (baseline 85 in 35 files)`, PASS (`DEL-01`) |
| Server rebuild, then the built-server usage-limit suite UL-01 … UL-12 (`RUN_USAGE_LIMIT_SWITCH_E2E=1`, `env -i`) | build exit 0; `Tests 12 passed (12)`, 31 s (`DEL-02`) |
| The two-server peer suite ULP-01, ULP-02 (`RUN_USAGE_LIMIT_PEER_E2E=1`) | `Tests 2 passed (2)` (`DEL-02`) |
| Targeted server units where the ticket and the base meet: `agent-execution`, `remote-collaboration`, `run-events`, `model-routing`, `agent-team-execution`, `standalone-agent-run-root`, `services`, `api`, `compositions`, `extensions`, `agent-collaboration`, and `tests/architecture` | `Test Files 446 passed \| 4 skipped`, `Tests 3828 passed \| 6 skipped` (`DEL-03`) |
| `python3 scripts/check_repository_artifact_hygiene.py`, `python3 scripts/check_licensing.py` | PASS (106579 tracked files); consistent |

- Post-integration verification result: `Passed`. The whole unit, integration and E2E suites were not rerun by delivery: the code reviewer and the implementation ran the whole unit suite and the ticket's E2E suites on the merged code (CRR-004), and API/E2E ran the whole E2E suite on the reviewed code (API-03).
- Delivery edits started only after the integrated state was current: `Yes`.
- Handoff state current with latest tracked remote base: `Yes` (`85174411168c` at the fetch before the push).

## Verification

- Evidence judged: `Sufficient`
- Evidence relied on: `api-e2e-execution-coverage-report.md` (API-REV-001), its Acceptance-Criteria Proof and Cases, and the files they name (`evidence/API/`); final confidence 94%, no category below 92%; every acceptance criterion proven by its stated method; source reviews CRR-002 (9.4/10) and CRR-004, test-code review CRR-003; the integrated-state reruns above. Mocked or emulated: the runtimes are scripted (Codex's app-server with its documented error payloads, the scripted Antigravity CLI, a scripted LM Studio model); no real provider. Not tested: a real runtime at a real usage limit (no account is exhausted, and exhausting one spends credits), Claude's own usage-limit signal (unrecorded).
- Judgement on the confidence: the team's 95% default is missed by one point (94%), only for the reason above. I accept it: AC-001's stated verification is "unit with recorded payloads; gated live case when an account is exhausted", and the first is met; the live case is conditional on an exhausted account, which cannot be arranged without spending the user's credits.
- Accepted unverified risks (a `DEC-*` evidence decision): `None`. No decision in the requirements accepts the live case as unverified; API/E2E requested none and I judged none needed. It is reported so the Solution Designer can decide otherwise.

| Acceptance-Criteria ID | Cases And Files Checked | What You Saw | Judgement |
| --- | --- | --- | --- |
| AC-001 (critical) | Reused unit with recorded payloads (IMP-11); `API-01-built-server.log` UL-01, UL-08; `DEL-02` rerun | `✓ UL-01 first-turn switch with Model Routing off: one event for three errors`; `✓ UL-08 Antigravity (no usage-limit signal): the ERROR at once, ERROR_CLASSIFIED after its limits read`; `DEL-02`: 12/12 | Proven by its stated method; the gated live case Not Tested (no exhausted account) |
| AC-002 (critical) | `API-01` UL-06, UL-11; `API-02-peer.log`, `ULP-01.json`, `ULP-02.json`; `DEL-02` rerun | UL-11 copy launch `{"origin":"node_fallback","fallbacks":[{"layer":"agent_default", … "detail":"gpt-e2e is exhausted until …"}]}` with the result "it runs on AutoByteus / … (chosen by the node)"; ULP-02 on beta `launchSource.origin: node_fallback`, no Codex turn; ULP-01/02 `Tests 2 passed (2)` again in `DEL-02` | Proven |
| AC-003 (critical) | `API-01` UL-01, UL-02, UL-04, UL-08, UL-09, UL-10, UL-12; `API-01-ul-receipt.json`; `DEL-02` rerun | UL-10 `{"heldTurnEndedAt":"…:15.717Z","switchedAt":"…:16.133Z"}`, one switch, both messages handed over; UL-12 `chosenBy: node_fallback` and the tree's new launch; UL-04 a Team member answers on AutoByteus after a graceful restart; the notice row and the continue notice are asserted in UL-01 | Proven |
| AC-004 (critical) | reused server test; `API-01` UL-05 | `✓ UL-05 nothing usable: the run stays on Codex with one Error notice that points to Settings; C-2 no_fallback` | Proven |

- More evidence requested: `None`.
- User check needed: `No`. Nothing in the criteria is unreachable without the user except the live case, which is conditional on an exhausted account.
- Re-verification after later re-integration: `Not needed` (the target did not advance after `3a541e3d45`).

## Release Decision

- Decision: `No release`
- Decided by: no release was asked for in the request or after, RELEASE.md's default is no release, and the Solution Designer holds the release until the founder approves R-6 and decides DEC-008. **Finalizing puts the change on `personal`**: any release cut from `personal` before R-6 lands ships the router without its switch-request section (UL-03: the router's turn ends without a decision, so history decides after up to 40 s). `release-notes.md` is written for the current behavior and says so; it must be revisited when R-6 lands.

## Docs Sync Result

- Docs sync artifact: `tickets/done/usage-limit-fallback-646/docs-sync-report.md`
- Docs sync result: `Updated`
- Docs updated: from the code commits `run_events.md` (new), `model_routing.md`, `agent_runtimes.md`, `agent_tools.md`, `agent_tools_mcp_server.md`, `collaboration_model.md` CM-12, `modules/README.md`, web `settings.md` (verified against the code: retention 31 and 90 days, the 40 s budget, the symbols); at delivery `GLOSSARY.md` (the automatic runtime switch). `DESIGN.md`, `TESTING.md`, `RELEASE.md`: no change.

## Ticket State Transition

- Ticket moved to `tickets/done/usage-limit-fallback-646`: `Yes`
- Archived ticket path: `tickets/done/usage-limit-fallback-646/`

## Version / Tag / Release Commit

- None (no release).

## Repository Finalization

- Bootstrap context source: `RELEASE.md` Finalization Target (`origin/personal`) and the ticket's recorded bootstrap
- Ticket branch: `codex/usage-limit-fallback-646`
- Finalization is recorded below after the merge.

## Release / Publication / Deployment

- Applicable: `No`
- Release/publication/deployment result: `Not required`
- Release notes handoff result: `Not required` (notes ready for the next release: `release-notes.md`)

## Post-Finalization Cleanup

- Dedicated ticket worktree path: `/Users/normy/autobyteus_org/autobyteus-worktrees/usage-limit-fallback-646`
- Plan, run after the record commit's push: `git worktree remove --force` (only untracked build output `*/dist/` remains), `git worktree prune`, delete the local branches `codex/usage-limit-fallback-646` and `finalize/usage-limit-fallback-646`.
- Remote branch: `Not required` (the repository keeps pushed `codex/*` branches).

## Environment Or Persisted-Data Transition Notes

- Approved persisted-data decision: new data only: run events (`<appData>`, kept 31 days) and switch records (`<appData>/model-routing/switches_*.jsonl`, kept 90 days); no migration. The setting `AUTOBYTEUS_USAGE_LIMIT_SWITCH_ENABLED` is an ordinary server setting.
- Delivery action required: `None`.

## Verification Checks

- Secret Gate, hygiene, licensing: see the Finalization Record.

## Rollback Criteria

- Revert the merge on `personal`. Run events and switch records already written stay on disk and are ignored by the older code. A run already switched stays on its new runtime (it is an ordinary run with a new launch). After the revert a usage limit again ends the turn with an error. Nothing needs converting.

## Final Status

- Verification complete (from the evidence): `Yes`
- Repository finalization complete: see the Finalization Record
- Applicable release/deployment/rollout complete or not required: `Yes` (not required; held)
- Applicable safe cleanup complete or not required: see the Finalization Record
- Unresolved blocker: `None` for delivery; the release hold (R-6, DEC-008) is the Solution Designer's and the founder's
- Successful terminal package eligible for return: after the record commit's push and cleanup
- Terminal package sent to the Solution Designer: by `send_message_to` after the record commit's push
