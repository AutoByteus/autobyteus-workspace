# API/E2E Execution Coverage Report

## Execution Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-shell-cwd-conversion-investigation/tickets/done/codex-shell-cwd-conversion-investigation/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-shell-cwd-conversion-investigation/tickets/done/codex-shell-cwd-conversion-investigation/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-shell-cwd-conversion-investigation/tickets/done/codex-shell-cwd-conversion-investigation/design-spec.md`
- Supplemental Task Artifacts: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-shell-cwd-conversion-investigation/tickets/done/codex-shell-cwd-conversion-investigation/codex-cwd-probe-evidence.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-shell-cwd-conversion-investigation/tickets/done/codex-shell-cwd-conversion-investigation/solution-revision-record.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-shell-cwd-conversion-investigation/tickets/done/codex-shell-cwd-conversion-investigation/design-review-report.md`
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-shell-cwd-conversion-investigation/tickets/done/codex-shell-cwd-conversion-investigation/architecture-review-revision-record.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-shell-cwd-conversion-investigation/tickets/done/codex-shell-cwd-conversion-investigation/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-shell-cwd-conversion-investigation/tickets/done/codex-shell-cwd-conversion-investigation/implementation-revision-record.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-shell-cwd-conversion-investigation/tickets/done/codex-shell-cwd-conversion-investigation/code-review-report.md`
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-shell-cwd-conversion-investigation/tickets/done/codex-shell-cwd-conversion-investigation/code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): `N/A`
- Relevant Delivery Revision IDs: `N/A`
- Coverage Investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-shell-cwd-conversion-investigation/tickets/done/codex-shell-cwd-conversion-investigation/api-e2e-coverage-investigation.md`
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-shell-cwd-conversion-investigation/tickets/done/codex-shell-cwd-conversion-investigation/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Execution Round: `1`
- Trigger: `CRR-001` Pass for implementation commit `bf8b71e285ca1bbca0d27a891ebef5f1316788d5`.
- Prior Round Reviewed: `N/A`
- Latest Authoritative Round: Round 1 / `API-REV-001`

## Investigation And Execution Basis

- Coverage investigation artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-shell-cwd-conversion-investigation/tickets/done/codex-shell-cwd-conversion-investigation/api-e2e-coverage-investigation.md`
- Investigation completed before durable coverage changes or final execution: `Yes`
- Investigation plan followed: `Yes`, with one material evidence-source deviation: installed `codex-cli 0.149.0` returned no `commandExecution` items in its readable legacy `thread/read` view, so the production native-history normalizer was executed against the exact real stable `item/completed.commandExecution` object instead. Deterministic `thread/read`-shape normalizer coverage also passed.
- Existing coverage decisions revised during execution, with evidence: No durable-test validity decision changed. `LIVE-CWD-003` was updated from a live returned-history-item assertion to real stable-item normalization because the provider did not return such items from `thread/read`.
- Reroute required before or during execution: `No`
- Notes: API/E2E added no repository-resident durable coverage. A temporary env-gated Vitest probe used project production classes and was removed after its final passing run.

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Approved persisted-data transition followed without unnecessary migration or version-specific runtime fallback: `Yes`
- Durable coverage added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: `N/A`
- Upstream recipient notified: `N/A`

## Changed Boundary And Evidence Matrix

| Scenario ID | Behavior / Requirement / Acceptance-Criteria IDs | Changed Boundary | Execution Surface / Mode | Evidence Type | Result | Evidence / Artifact |
| --- | --- | --- | --- | --- | --- | --- |
| `REPO-CWD-001` | `BEH-002`, `REQ-001`, `AC-001` | Stable item to canonical start/completion args | Parser/converter Vitest | Durable | Pass | `api-e2e-evidence/focused-codex-projection-tests.log` — 70 focused tests total |
| `REPO-CWD-002` | `BEH-003`, `REQ-002`, `AC-002` | Top-level approval context and forwarding | Converter/thread Vitest | Durable | Pass | Focused log plus `api-e2e-evidence/approval-forwarding-test.log` — exact selected case passed |
| `REPO-CWD-003` | `BEH-004`, `REQ-003`, `AC-003` | Native-history command normalization | Normalizer Vitest | Durable | Pass | `api-e2e-evidence/focused-codex-projection-tests.log` |
| `REPO-CWD-004` | `REQ-004`, `AC-004` | Missing/raw-only CWD and precedence | Parser/history Vitest | Durable | Pass | `api-e2e-evidence/focused-codex-projection-tests.log` |
| `REPO-TRACE-001` | `REQ-005`, `AC-006` | Open trace args and old command-only reader | Sequencer/local reader Vitest | Durable | Pass | `api-e2e-evidence/trace-persistence-reader-tests.log` — 18 tests |
| `LIVE-CWD-001` | `BEH-001`, `BEH-002`, `AC-001`, `AC-005` | Real app-server item -> backend event; Codex-owned execution | CLI / live lifecycle | Temporary + Live | Pass | `api-e2e-evidence/live-codex-cwd-evidence.json`; final live log |
| `LIVE-CWD-002` | `BEH-003`, `AC-002`, `AC-005` | Real approval request -> canonical approval -> accepted response | CLI / live lifecycle | Temporary + Live | Pass | Exact native and canonical approval command/CWD in evidence JSON |
| `LIVE-CWD-003` | `BEH-004`, `AC-003` | Real stable command item -> production native-history normalizer | CLI / live provider shape | Temporary + Live | Pass | Exact normalized `{command,cwd}` in evidence JSON; `thread/read` command count `0` recorded |
| `LIVE-CWD-004` | `BEH-004`, `REQ-005`, `AC-006` | Canonical live event -> memory recorder -> JSONL | CLI / live lifecycle | Temporary + Live | Pass | `persistedToolArgs` exactly matches stable item in evidence JSON |
| `TRACE-OLD-001` | `REQ-005`, `AC-006` | Old application trace -> production local projection | Isolated persisted-data fixture | Temporary | Pass | Command-only activity loaded; original bytes unchanged in evidence JSON/final log |

## Additional Repository Coverage Execution

No repository command was added after the investigation's post-repository confidence decision. The broader live command below is recorded in its owning section rather than duplicated here.

## Validation Confidence Scorecard

| Confidence Category | Post-Repository Score | Final Score | Change | New / Final Supporting Evidence | Residual Uncertainty |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 93% | 99% | +6 | Every `AC-001`–`AC-006` behavior is directly covered by the combined deterministic and live evidence. | Native `thread/read` did not return a command item in this environment, but the conditional normalizer contract was proven with the exact real stable item. |
| Changed-boundary execution directness | 90% | 99% | +9 | Real app-server request/start/completion objects flowed through the production backend parser/converter and recorder. | None material. |
| Cross-boundary integration realism and mock gap | 85% | 97% | +12 | One live run crossed model, app-server process, approval, event pipeline, command execution, trace writer, history reader, normalizer, and local old-trace reader. | The provider's legacy `thread/read` view omitted command items. |
| Environment, configuration, identity, and fixture fidelity | 88% | 97% | +9 | Installed authenticated `codex-cli 0.149.0`, real model catalog, `gpt-5.4-mini`, on-request approval, real filesystem CWD, project Prisma/Vitest setup, and unique temp state were used. | An unrelated Ollama discovery warning occurred while Codex remained available and selected; it did not affect the scenario. |
| Failure, edge-case, lifecycle, and recovery evidence | 92% | 97% | +5 | Missing/raw-only inputs, precedence, approval acceptance, start/completion/idle, actual exit `0`, exact proof file, old trace direct use, and owned cleanup all passed. | Approval denial was not rerun because the approval decision path was unchanged and existing live/durable coverage already owns it. |
| User-surface, browser, and desktop-shell confidence | 90% | 96% | +6 | A real canonical approval payload and lifecycle events exposed exact CWD; no browser/Electron source changed. | Pixel-level tool-card display was not retested. |
| Durable regression coverage quality and relevance | 98% | 98% | 0 | Existing focused durable tests are exact, boundary-appropriate, and reject raw `workdir`/fabricated defaults. | The real-provider probe is intentionally temporary/model-gated. |

- Overall post-repository confidence: `91%`
- Overall final confidence: `98%` (683 / 7 = 97.57%, rounded to nearest whole percent)
- Calculation method: Simple average of the seven applicable category scores.
- Confidence change produced by broader validation: `+7` percentage points after rounding.
- Every critical acceptance criterion directly proven: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: Installed legacy `thread/read` returned zero command items, so actual live read-time normalization could not be observed from that method; pixel-level frontend display was not rerun because no frontend boundary changed. Neither leaves a critical acceptance criterion unproven.

## Broader Validation Decision And Execution

- Decision and selected execution mode from the coverage investigation: `Required`; `CLI` plus `Lifecycle`, real Codex app-server through the production backend/event/memory stack.
- Material deviation from the planned mode or rationale: The actual `thread/read` response was readable but its legacy history mode omitted all command items. The exact real completed stable item was therefore passed through the same production native-history normalizer, and the omission was retained as evidence rather than hidden.
- Confidence gap or residual risk actually addressed: Exact live `cwd` preservation across approval, start, completion, execution, future trace persistence, and real provider shape.
- If `Not Required`: `N/A`
- If `Blocked`: `N/A`
- Startup order, commands, and readiness results:
  1. `codex --version` -> `codex-cli 0.149.0`.
  2. Temporary probe created unique workspace, nested target, memory root, legacy root, client manager, thread manager, backend, and recorder.
  3. Model catalog selected `gpt-5.4-mini`; thread startup resolved.
  4. Final command: `RUN_CODEX_E2E=1 CODEX_CWD_PROBE_VERSION='codex-cli 0.149.0' CODEX_CWD_EVIDENCE_PATH='../tickets/done/codex-shell-cwd-conversion-investigation/api-e2e-evidence/live-codex-cwd-evidence.json' pnpm exec vitest run tests/.tmp/codex-cwd-api-e2e.probe.test.ts --no-watch` -> `1 passed` in 10.70s.
- Environment choices that materially affected the run: `autoExecuteTools=false`, on-request approval, `workspace-write`, low reasoning, isolated temporary paths. macOS `/var` to `/private/var` canonicalization was compared through `realpath` rather than treated as a mismatch.
- Seed data, fixtures, identities, authentication, permissions, or session state: Existing local Codex authentication only; one unique run/thread; one nested target; one proof file; one old-shape JSONL fixture.

| Scenario / Journey Step | Expected Observable Result | Actual Observable Result | Evidence | Result |
| --- | --- | --- | --- | --- |
| Request exact command with exact model-facing `workdir` | Stable approval request exposes exact `command` and `cwd` | Approval request command was `/bin/bash -lc 'pwd > cwd-proof.txt'`; CWD was the unique nested target | Evidence JSON `approval` | Pass |
| Canonical approval presentation | `run_bash.arguments` exactly equals stable request values | Exact command/CWD equality; invocation accepted | Evidence JSON `approval.canonicalArguments` | Pass |
| Start/completion projection | Both canonical events preserve exact stable values | Start and completion arguments exactly matched native objects | Evidence JSON `start` / `completion` | Pass |
| Codex-owned execution | Command exits 0 and executes in nested target | Proof file existed inside target and contained its realpath; exit code `0` | Evidence JSON `completion` | Pass |
| Native-history normalization | Real stable command item yields `{command,cwd}` | Exact live completed item normalized to both values | Evidence JSON `nativeHistoryToolArgs` | Pass |
| Future trace persistence | Existing JSONL schema gains exact `cwd` inside `tool_args` | Persisted tool call contained exact command/CWD | Evidence JSON `persistedToolArgs` | Pass |
| Old trace direct use | Command-only trace loads and remains byte-identical | Production projection returned successful `run_bash` activity with `{command}`; bytes unchanged | Evidence JSON plus final log | Pass |

## Desktop Application Validation

- Validation approach executed and any deviation from the investigation: Backend live lifecycle only, as planned.
- Browser-tested web-equivalent behavior and evidence: `N/A`; no web-equivalent code changed.
- Shell-specific or lifecycle behavior and evidence: No Electron-shell behavior. Real Codex external-process lifecycle was directly exercised.
- Effect on any already-running desktop application: `None`
- Behavior not directly proven and confidence consequence: Pixel rendering not retested; user-surface category remains 96%, above the clean threshold.

## Platform / Runtime Targets

- Operating system / platform: macOS 26.5.2 (Build 25F84), arm64
- Runtime and relevant framework versions: Node `v22.23.1`; pnpm `10.28.2`; Vitest `4.0.18`; `codex-cli 0.149.0`; TypeScript `5.9.3` package dependency
- Browser / engine and version: `N/A`
- Device, viewport, locale, timezone, or accessibility settings: `N/A`; timezone Europe/Berlin for the agent session

## Lifecycle / Upgrade / Restart / Persisted-Data Checks

- Approved persisted-data decision: `Directly Usable — No Migration`
- Representative existing data exercised: Old application raw trace with `run_bash.tool_args = {command: "pwd"}` and no `cwd`.
- Direct-use result and evidence: Production local projection loaded it as a successful terminal command and the source file remained byte-identical. The new live trace used the same JSONL structure with one additional optional `cwd` key.
- Migration completion/recovery evidence: `N/A`
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`
- Residual untested persisted-data risk: None material; old traces remain intentionally unenriched.

## Tests Implemented Or Updated

None by API/E2E in this round. Implementation-authored deterministic tests were executed unchanged.

## Tests Removed As Stale Or Obsolete

None.

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `No`
- Paths added or updated: `None`
- Paths removed: `None`
- Added or updated paths attached for proportional test-code review: `Not Applicable`
- Diff or repository evidence supplied for removed paths: `Not Applicable`

## Other Execution Artifacts

| Artifact Path | Type / Purpose | Retained Or Temporary | Notes |
| --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-shell-cwd-conversion-investigation/tickets/done/codex-shell-cwd-conversion-investigation/api-e2e-evidence/live-codex-cwd-evidence.json` | Sanitized structured live evidence | Retained | Authoritative scenario values from final passing run. |
| `.../api-e2e-evidence/live-codex-cwd-probe.log` | Final live command log | Retained | `1 passed`; includes evidence summary. |
| `.../api-e2e-evidence/live-codex-cwd-probe-attempt-1.log` through `attempt-5.log` | Temporary-probe correction history | Retained evidence logs | Transparently records transform, provider-history assumption, and assertion-shape corrections before final pass. |
| `.../api-e2e-evidence/focused-codex-projection-tests.log` | Repository test log | Retained | 70 passes. |
| `.../api-e2e-evidence/approval-forwarding-test.log` | Repository test log | Retained | 1 selected pass. |
| `.../api-e2e-evidence/trace-persistence-reader-tests.log` | Repository test log | Retained | 18 passes. |
| `.../api-e2e-evidence/production-typescript.log` | Production TypeScript log | Retained | Empty because no diagnostics; exit 0 recorded by execution. |
| `.../api-e2e-evidence/cleanup-diff-check.log` | Cleanup/diff evidence | Retained | Probe removed; diff check clean. |
| `.../api-e2e-evidence/codex-version.log`, `platform-runtime.log` | Environment evidence | Retained | Version/platform only; no secrets. |

## Temporary Execution Methods / Scaffolding

| Path / Method | Why Needed | Result / Evidence | Cleanup Result |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/.tmp/codex-cwd-api-e2e.probe.test.ts` | Cross the real app-server, backend, approval, normalizer, recorder, filesystem, and old-trace reader in one isolated run | Final run Pass; structured evidence retained | File deleted; all `mkdtemp` workspace/memory/legacy directories removed; no matching owned temp directories remain. |
| Probe attempts 1–5 | Correct temporary harness syntax/assumptions without altering production or durable tests | Attempt 1 had an accidental heredoc footer; attempts 2–4 exposed that legacy `thread/read` returns zero command items; attempt 5 used `toolArgs` instead of the projection's public `arguments` key. Final corrected scaffold passed. | Failed-run temp resources were removed by `afterEach`; logs retained. |

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Non-Codex backend factories and unrelated sidecars | Fail-fast/no-op test collaborators | Not part of the changed Codex projection path | None for the changed boundary. |
| Browser/frontend | Not executed | No frontend code changed and backend events are more direct | Pixel display not re-observed. |

The Codex CLI, app-server, model catalog, approval response, command execution, filesystem, trace writer, history reader, and production normalizers/readers were real.

## Result Summary

| Result | Scenario IDs | Summary / Reason |
| --- | --- | --- |
| Pass | `REPO-CWD-001`–`REPO-CWD-004`, `REPO-TRACE-001`, `LIVE-CWD-001`–`LIVE-CWD-004`, `TRACE-OLD-001` | Exact CWD promotion, preserved execution/approval flow, native-shape normalization, future trace persistence, non-fabrication, and old-trace direct use all passed. |

## Cleanup Performed

| Resource / Process / Data | Ownership | Cleanup Action | Result |
| --- | --- | --- | --- |
| Created Codex run/thread/client manager | Probe-owned | `terminateThread` in teardown; client manager closed | Pass |
| Workspace, nested target, proof file, new memory root, old-trace root | Probe-owned unique `mkdtemp` paths | Recursive teardown removal | Pass; prefix scan found none |
| Temporary probe file | API/E2E-owned | Deleted after final evidence capture | Pass |
| Prisma test database | Repository test harness-owned | Left to the normal Vitest setup/global teardown lifecycle | Pass; no user/development database used |
| Native Codex session history metadata | Codex CLI-owned | No undocumented direct deletion of provider-owned history | Run terminated; harmless session history may remain under the user's normal Codex history, matching existing live-test behavior. |

## Preliminary Classification

`N/A` — Pass. No implementation, design, requirement, fixture, environment, or durable-test failure remains.

The live `thread/read` omission is a bounded provider-history availability observation, not a failure of the conditional native-history normalization requirement: the installed app-server supplied the real stable command item on lifecycle, that exact item normalized correctly, and deterministic current-contract history items also passed.

## Recommended Recipient

`/code_reviewer` for the required post-API/E2E review entry. Repository-resident durable coverage changed by API/E2E: `No`; proportional test-code review should therefore be recorded as `Not Applicable` without reopening the implementation scorecard.

## Evidence / Notes

- The exact live target string remained `/var/.../nested-target`; `pwd` produced the equivalent macOS realpath `/private/var/.../nested-target`. The probe verified equivalence with `realpath` and did not normalize the canonical argument itself.
- Unrelated Ollama discovery emitted a connection warning during global model discovery. The selected Codex model/catalog and live run were available and passed; no Ollama capability was used.
- No raw model-facing `workdir` mapping, default directory, execution reroute, trace backfill, migration, policy change, or command rewrite was observed in AutoByteus.

## Latest Authoritative Result

- Result: `Pass`
- Final validation confidence: `98%`
- Default `95%` confidence target met: `Yes`
- Any final applicable confidence category below `90%`: `No`
- Broader validation decision: `Required` and completed via real CLI/lifecycle execution
- Critical acceptance criteria lacking direct proof: `None`
- Required next recipient: `/code_reviewer` for proportional test-code review (`Not Applicable`, no API/E2E durable test changes)
- Notes: All critical scenarios passed; the installed legacy `thread/read` command-item omission remains explicitly recorded as low residual provider-history availability uncertainty.
