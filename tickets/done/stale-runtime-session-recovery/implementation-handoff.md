# Implementation Handoff

Ticket: autobyteus-599 (stale-runtime-session-recovery). Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/stale-runtime-session-recovery-599`, branch `codex/stale-runtime-session-recovery-599`, from `origin/personal` at `0da6bfbfc1`.

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: architecture review selected (Large/High) and passed (ARCH-REV-002); handed to implementation by the architecture reviewer.
- Requirements doc: `tickets/in-progress/stale-runtime-session-recovery/requirements-doc.md` (SR-002, with DEC-006)
- Investigation notes: `tickets/in-progress/stale-runtime-session-recovery/investigation-notes.md` (PRB-009 added by implementation)
- Solution revision record: `tickets/in-progress/stale-runtime-session-recovery/solution-revision-record.md`
- Design spec (required on every route): `tickets/in-progress/stale-runtime-session-recovery/design-spec.md` (SR-002)
- Supplemental task artifacts: `probes/README.md` and `probes/*.mjs` (PRB-001…009), `follow-ups.md`
- Design review report: `tickets/in-progress/stale-runtime-session-recovery/design-review-report.md` (ARCH-REV-002, Pass; N-1…N-4)
- Architecture review revision record: `tickets/in-progress/stale-runtime-session-recovery/architecture-review-revision-record.md`
- Triggering rework report, revision record, or evidence, when applicable: `code-review-report.md` / `code-review-revision-record.md` (CRR-001, Fail, `Design Impact`: CR-001, CR-002), answered by SR-003 (DEC-007, AC-008) and ARCH-REV-003 (Pass, note N-5)

## Current Implementation Summary

A run whose saved external runtime session the runtime itself reports as missing now continues at activation in a fresh session of the same runtime and model, through the runtime-switch steps: the earlier records become one closed `runtime_switch` segment, the lost-session marker starts the new file, the hand-over notice goes with the input, and the commit replaces the lost session ID. Any other restore failure fails as before.

- Recognition, one typed error (`SavedRuntimeSessionMissingError`), in the backend that knows the answer: Codex (`no rollout found for thread id <id>` on the restore's `thread/resume`), Antigravity (`conversation "<id>" not found` on stderr when another conversation opens), Grok (`RequestError` with `data.code === "FS_NOT_FOUND"`, kept after the N-1 probe), DeepSeek Harness (`-32602` with `Invalid params: session is not resumable: <id>`), Claude (`verifyResumable`: a restore opens its process at activation and awaits the SDK initialization, matching `Claude Code returned an error result: No conversation found with session ID: <id>`).
- `buildSessionRenewal` beside `buildRuntimeSwitchBetween`; key `session_renewal:<runId>:<lost ID>` and the lost-session marker text keep it apart from a runtime change (no `cause` field since CR-001).
- Standalone (DS-001): `restoreStarted` catches the typed error, confirms the failed restore's release, logs `RUNTIME_SESSION_LOST`, and runs the extracted `activateInFreshSession` with the renewal. Delegated copies take this path (N-2). Application-scope lifecycles now get the switch port (N-4; see Deviations).
- Members (DS-002): the dead staged activation is removed (AR-002); `ConfiguredAgentActivationPlanner.beginSessionRenewal` shares `beginSwitch`'s steps; the handle's branch is in `configured-agent-session-renewal.ts`; the commit is `replace_lost_session` with the shared `CollaborationAgentBindingReplacement` (renamed from `…NoConversation…`), handled by all five consumers.
- Glossary and module docs.
- Round 2 (IR-002, SR-003): every composition that runs external-runtime agents gives a renewal both parts, the switch memory and the hand-over notice first in its run manager's input preface (DEC-007). The application execution scope gets the notice (its only platform notice) with the input preface and lifecycle observers; the standalone application host gets `runtimeSwitching` and the notice first in its notices; the supervisor input comment says why the host offers no switch (N-5). CR-001 removed `RuntimeSwitch.cause` and `CodexAppServerRpcError.rpcCode`. AC-008 is tested per composition.

- Implementation cycle: `Rework`
- Implementation revision record: `tickets/in-progress/stale-runtime-session-recovery/implementation-revision-record.md`
- Current implementation revision ID: `IR-002`
- Related solution revision IDs: `SR-002`, `SR-003`
- Related architecture-review revision IDs: `ARCH-REV-002`, `ARCH-REV-003`
- Related code-review revision IDs: `CRR-001`, `CRR-002` (Pass, round 2, `code-review-report.md`; next: API/E2E)
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: CR-001, CR-002

## Routing Classification (Mandatory)

- Task size (`Small`/`Medium`/`Large`): `Large`
- Architecture risk (`Low`/`High`): `High`
- Design classification section / evidence reference: design-spec.md "Task Size And Architectural Risk (Mandatory)"
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale for confirmation or change: the implementation touches the five backends, both activation owners, the member binding-change union and its five consumers, Claude's restore timing and persisted run data on a new trigger, as the design stated.
- Selected route (`Direct API/E2E`/`Code Review`/`Solution Designer`): `Code Review`
- Lightweight implementation self-review completed for the direct route: `Not Applicable`
- New design impact or escalation trigger: `None` (round 2 follows SR-003's Compositions table)

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | Claude: a lost session is recognized at activation, then renewed | `claude-agent-run-backend-factory.ts` (`await opened.verifyResumable()` on restore) → `claude-session.ts` `verifyResumable` → `claude-session-resume-check.ts` (`ensureInitialized` on `claude-session-process.ts`, SDK `initialized` promise from `claude-sdk-session-opening.ts` / `claude-sdk-streaming-session.ts`) → typed error → DS-001/DS-002 renewal | Implemented. Real CLI 2.1.330 / SDK 0.3.280 shape pinned (IMP-06). New sessions still open lazily |
| BEH-002 | Codex: recognized, then renewal | `codex-app-server-client.ts` (`CodexAppServerRpcError` keeps `rpcCode`/`rpcMessage`) → `codex-missing-thread.ts` → `codex-thread-manager.ts` restore branch of `startThread` only | Implemented; reconfiguration resume unchanged |
| BEH-003 | Antigravity: recognized when stderr names the expected ID | `agy-stream-process.ts` `stderrShows` → `agy-agent-run-backend-factory.ts` (1 s wait; otherwise `AGY_CONVERSATION_ID_CONFLICT`) | Implemented; built-server E2E LS-01/02/03 (IMP-04) |
| BEH-004 | Grok / DeepSeek: recognized per profile | `acp-agent-session-profile.ts` `isMissingSession` → `grok-build-session-profile.ts`, `deepseek-harness-session-profile.ts` → `acp-session-launcher.ts` restore branch | Implemented; N-1 probe (PRB-009) kept the Grok matcher |
| BEH-005 | Any other failure fails as today | Only `SavedRuntimeSessionMissingError` for exactly the restored session starts a renewal; an `AggregateError` (quarantined cleanup), an unconfirmed release or a lifecycle without the port rethrows | Preserved; AC-003 negatives in unit, member and E2E tests |
| BEH-006 | Switch archive, marker and notice reused with `from = to` and the lost-session text | `runtime-switch.ts` `buildSessionRenewal`; `standalone-agent-run-lifecycle-service.ts` `activateInFreshSession`; planner `beginFreshSession` + `ConfiguredAgentSwitchAttempt` | Implemented; one marker / one segment on retry (AC-004) at unit, root and E2E level |
| BEH-006 / BEH-007 (AC-008, SR-003) | Every composition renews with the notice | Studio `build-studio-server.ts` (unchanged); application scope `application-execution-scope-kernel-builder.ts` (`AgentRunPlatformNotices([RuntimeHandoverNoticeService])` as `inputPreface` and as both managers' `lifecycleObserver`; lifecycle `switching`); host `start-standalone-application-host.ts` (`runtimeSwitching: { memory: new RuntimeSwitchRecorder() }`, notice first) through `general-process-run-supervisor.ts` | Implemented; one test per composition (IMP-12, IMP-13) |
| BEH-007 | Same renewal for members and delegated copies | `configured-agent-execution-handle.ts` `prepareActivation` → `configured-agent-session-renewal.ts` → `configured-agent-activation-planner.ts` `beginSessionRenewal` → `replace_lost_session` → `flat-team-agent-execution-handle.ts` guard/cache/config → `team-agent-platform-binding-committer.ts` / `agent-org-run.ts` compare-and-set; delegated copy via standalone lifecycle | Implemented; real Team/Org roots (3 placements) and built-server Team member |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes` (application-scope runs are named in DS-001 / N-4; see Deviations)

## Key Files Or Areas

Production (`autobyteus-server-ts/src/`):
- `agent-execution/errors.ts`, `agent-execution/domain/runtime-switch.ts`
- Codex: `runtime-management/codex/client/codex-app-server-client.ts`, `agent-execution/backends/codex/thread/codex-missing-thread.ts` (new), `codex-thread-manager.ts`
- Antigravity: `agent-execution/backends/antigravity/stream/agy-stream-process.ts`, `backend/agy-agent-run-backend-factory.ts`
- ACP: `agent-execution/backends/acp/acp-agent-session-profile.ts`, `acp/session/acp-session-launcher.ts`, `grok/grok-build-session-profile.ts`, `deepseek-harness/deepseek-harness-session-profile.ts`
- Claude: `runtime-management/claude/client/claude-sdk-session-opening.ts`, `claude-sdk-streaming-session.ts`, `agent-execution/backends/claude/session/claude-session-process.ts`, `claude-session-resume-check.ts` (new), `claude-session.ts`, `backend/claude-agent-run-backend-factory.ts`
- Standalone: `agent-execution/services/standalone-agent-run-lifecycle-service.ts`
- Compositions (round 2): `application-platform/execution/application-execution-scope-kernel-builder.ts`, `standalone-application-host/start-standalone-application-host.ts`, `agent-execution/runtime/general-process-run-supervisor-input.ts` (comment)
- Members: `agent-collaboration/execution/backends/configured-agent-activation-planner.ts`, `configured-agent-session-renewal.ts` (new), `configured-agent-execution-handle.ts`, `agent-collaboration/execution/domain/collaboration-agent-platform-binding.ts`, `agent-team-execution/local/flat-team-agent-execution-handle.ts`, `agent-team-execution/services/team-agent-platform-binding-committer.ts`, `team-run-execution-tree-mutator.ts`, `agent-org-execution/domain/agent-org-run.ts`, `agent-org-execution/services/agent-org-run-execution-tree-mutator.ts`

Tests: `tests/unit/agent-execution/domain/runtime-switch-session-renewal.test.ts`, `tests/unit/agent-execution/backends/acp/acp-missing-session.test.ts`, `tests/unit/agent-execution/standalone-session-renewal.test.ts`, `tests/unit/agent-collaboration/member-session-renewal.test.ts`, `tests/unit/agent-execution/backends/claude/backend/claude-agent-run-backend-factory-restore-check.test.ts`, cases added to the Codex, AGY, ACP-factory, Claude-session, activation-operation and kernel-builder tests; `tests/e2e/runtime/lost-session-renewal-built-server.e2e.test.ts`; `tests/integration/agent-execution/claude-session-resume-check.integration.test.ts`; fixture `tests/fixtures/agy-failure-cli.mjs` (`AGY_FAKE_LOST_CONVERSATIONS_FILE`).

Round-2 tests: `tests/unit/application-platform/application-scope-session-renewal.test.ts` (real kernel builder), `tests/unit/standalone-application-host/host-session-renewal-wiring.test.ts` (real general supervisor with the host's wiring), the host lifecycle test (the real host start passes the switch memory and the notice first), the studio E2E's notice checks; helper `tests/helpers/session-renewal-wiring.ts`; fixture option `agentRunManager` in `configured-root-first-work-fixture.ts`.

Docs: `GLOSSARY.md`, `autobyteus-server-ts/docs/modules/run_history.md`, `agent_execution.md`.

Commits (on `0da6bfbfc1`): `67eb9a07fd` steps 1–3, `781d605f83` + `c3221b3190` step 4, `325faaeaa2` AR-002 removal, `077c2e4fb0` step 5, `c1d316f60b` step 6, `e06715d0a5` step 7, `0681fcd3af` tests found missing by negative controls, `2acd842c95` application scope (N-4), `c419bb4b36` IR-001 records; round 2: `a2db91def8` CR-001, `f79773703d` compositions and AC-008 tests, `132471ccd9` + `1df7771aac` observer test; IR-002 records commit follows.

## Important Assumptions

- The recognized texts and codes are the probed shapes of the installed versions (Claude Code 2.1.330 / SDK 0.3.280, Codex app-server 0.171.0, Antigravity 1.5.14, Grok CLI 1.0.92, DeepSeek Harness 0.2.2-rc.5). A changed text means no renewal, never a wrong one (RSK-001).
- The member typed error must name exactly the session the operation restored (`restoring`); the standalone path relies on the backend raising it only from the restore of the stored ID.
- A renewal is safe to retry by key (`session_renewal:<runId>:<lost ID>`): the recorder finds an existing marker/segment, as for a switch.

## Known Risks

- Claude restores now open the CLI process at activation (RSK-003): about 0.26 s per restore (PRB-007); a restore that fails initialization for another reason now fails at activation instead of in the first turn, with the same error.
- Antigravity waits up to 1 s for the warning only on an ID mismatch (the conflict path); a normal restore is unaffected.
- No built-server E2E for Claude: a scripted Claude CLI would need the model catalog, auth and the stream-json turn protocol faked (a new harness). Claude is covered by unit tests, the factory test and the real-CLI check (IMP-06); the live AC-007 check is API/E2E's.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: `Bug Fix` with a `Behavior Change`
- Reviewed root-cause classification: `Missing Invariant`
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): `Refactor Needed Now` (small)
- Implementation matched the reviewed assessment (`Yes`/`No`): `Yes`
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): `N/A`
- Evidence / notes: `activateSwitched` → `activateInFreshSession`; `beginSwitch` → `beginFreshSession` shared with `beginSessionRenewal`; the compare-and-set renamed (`CollaborationAgentBindingReplacement`, `createCollaborationAgentBindingReplacement`, `replaceAgentPlatformBindingInTree`, `replaceAgentOrgPlatformBinding`) and its error texts made neutral; `PreparedConfiguredAgentActivation`, `prepareConfiguredActivation` and the Flat Team wrapper removed.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed (Core Principle 7): `Yes` (the staged member activation, AR-002)
- Dead code found elsewhere, added to `follow-ups.md`: None
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes` (`replace_lost_session` is its own kind sharing the replacement payload)
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`
- Deviations from a design principle decided during implementation, each with the principle and why the reason holds for this case: see "Deviations from the design" below; no principle deviation beyond the design's D-1.
- Changed source implementation files stayed within proactive size-pressure guardrails: `Yes` (IMP-08: largest `claude-session.ts` 497 (was 494), `standalone-agent-run-lifecycle-service.ts` 487, `configured-agent-execution-handle.ts` 461 (was 500); largest delta 67 lines)
- Notes — deviations from the design:
  1. **Application scope (N-4).** Resolved by SR-003 (DEC-007): the switch port (`2acd842c95`) stays, and the notice is now wired too.
  2. **Codex error field.** `CodexAppServerRpcError` keeps `rpcMessage` so the matcher compares the JSON-RPC message exactly (`rpcCode` removed, CR-001).
  3. **Antigravity release.** The not-found branch throws inside preparation; the process that opened the other conversation is stopped by the preparation's existing release, not by new code.
  4. **Claude check in its own file.** `claude-session-resume-check.ts` holds the matcher and the check because `claude-session.ts` sits at 497 effective lines.
  5. **Member operation field.** `ConfiguredAgentActivationOperation` gains `restoring` (the session a `restore_external` plan restores), so the handle renews only for that exact session.
  6. **Round 2, host AC-008 test form.** The host test builds the REAL general supervisor with the host's wiring rather than starting the whole host (the host start needs its process services); the host lifecycle test pins that the real host start passes exactly that wiring. The supervisor is not closed in that test: the test provider's turns would have to be ended for its close, and the worker ends instead.
  7. **Round 2, fixture option.** `configuredRootFixture` accepts a real `agentRunManager`, so a member renews through a real Team root on the supervisor's run manager.

## Persisted Data Transition Check (When Applicable)

- Approved decision (`Not Affected`/`Directly Usable — No Migration`/`Discard or Rebuild`/`Migration Required`): `Not Affected`
- Design-spec decision reference: design-spec.md "Decision: Not Affected" (and D-1)
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: `Yes`
- Direct-use evidence or discard/rebuild result, when applicable: the renewal writes existing shapes (`boundary_type: "runtime_switch"`, sender `system.runtime_handover`, session ID in metadata or tree); the chat reads it unchanged (E2E LS-01/02 segment and marker checks).
- Migration implementation and focused checks, only when `Migration Required`: N/A
- Deviation from the reviewed transition decision: `None`

## Environment Or Dependency Notes

- New worktree setup: `pnpm install`, `pnpm -C autobyteus-server-ts prebuild` (Prisma client). Built-server E2E needs `pnpm -C autobyteus-server-ts build` first.
- The SDK `dist/` folders under `autobyteus-application-backend-sdk/` and `autobyteus-application-sdk-contracts/` are build output, left untracked.
- Real CLIs were used only on isolated homes: Claude (IMP-06, isolated `HOME` and `CLAUDE_CONFIG_DIR`, no key) and Grok (IMP-07, isolated `HOME`/XDG, vault key to the child only, DEC-006). Nothing was written to the founder's `~/.claude`, `~/.codex` or `~/.grok`, or to his AutoByteus data.

## Checks Run

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result (`Pass`/`Fail`) | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `pnpm -C autobyteus-server-ts typecheck` | `e06715d0a5` (also run before `0681fcd3af` and `2acd842c95`, PASS each time) | macOS, Node 22.23.1 | all server src and tests | — | Pass | `evidence/IMP-01-typecheck.log` | `production errors: 0; test-file errors: 1000 in 313 files (baseline 1000 in 313 files)` |
| IMP-02 | `pnpm exec vitest run tests/unit/agent-collaboration tests/unit/agent-team-execution tests/unit/agent-org-execution tests/unit/agent-execution tests/unit/standalone-agent-run-root tests/unit/agent-memory tests/unit/run-history tests/unit/runtime-management` | `e06715d0a5` | same | every touched area | AC-001…AC-006 (unit level), regression | Pass | `evidence/IMP-02-unit-suites.log` | `Tests  3646 passed \| 6 skipped (3652)` |
| IMP-03 | focused renewal tests, then 16 negative controls (`controls.sh` inside the file) | `0681fcd3af` | same | recognition per backend, Claude factory, standalone lifecycle, member planner/handle/Flat Team | AC-001…AC-005, BEH-001…007 | Pass | `evidence/IMP-03-focused-tests-and-negative-controls.log` | Baseline `Tests  185 passed (185)`; each NC-01…NC-16 shows `failed`; "After the controls" lists no file |
| IMP-04 | built-server E2E `lost-session-renewal-built-server.e2e.test.ts` (scripted Antigravity), plus a negative control with the server built without the AGY recognition | `c1d316f60b` | same, private HOME, test-owned data root | AGY recognition, standalone lifecycle, Team root, restart, chat segment/marker | AC-001 (mechanism), AC-002 (AGY), AC-003, AC-005 (Team), AC-006 | Pass | `evidence/IMP-04-e2e-lost-session-built-server.log`, `evidence/IMP-04-e2e-lost-session-negative-control.log` | `Tests  3 passed (3)`; control: LS-01/LS-02 fail with `AGY_CONVERSATION_ID_CONFLICT`, LS-03 passes |
| IMP-05 | existing AGY E2Es with the changed fixture (switch-back built server, failure transport, linked skills) | `c1d316f60b` | same | fixture change | regression | Pass | `evidence/IMP-05-e2e-agy-regression-excerpt.log` | `Test Files  3 passed (3)` |
| IMP-06 | `RUN_CLAUDE_CLI_INTEGRATION=1 … claude-session-resume-check.integration.test.ts`, plus a negative control with the matcher text changed | `c1d316f60b` | real Claude Code 2.1.330, SDK 0.3.280, isolated HOME and CLAUDE_CONFIG_DIR, no key | `claude-session-resume-check.ts` on real SDK output | AC-001 (Claude shape), PRB-007 | Pass | `evidence/IMP-06-claude-real-cli-integration.log`, `evidence/IMP-06-claude-real-cli-integration-negative-control.log` | `Tests  2 passed (2)`; control: `1 failed \| 1 passed` |
| IMP-07 | N-1 probe `probes/grok-resume-removed-cwd.mjs` (DEC-006) | `67eb9a07fd` | Grok CLI, isolated HOME/XDG, vault key to the child only | Grok matcher decision | AC-002/AC-003 (Grok), N-1 | Pass (matcher kept) | `evidence/IMP-07-grok-n1-probe.log` | `session/resume (present session, removed cwd): {"models":…` succeeds; only the missing session gives `"code":"FS_NOT_FOUND"` |
| IMP-08 | effective-line counts of changed source files | `0681fcd3af` | — | size guardrail | — | Pass | `evidence/IMP-08-source-file-sizes.txt` | no file above 500; largest change 67 lines |
| IMP-10 | `pnpm -C autobyteus-server-ts typecheck` | `1df7771aac` | macOS, Node 22.23.1 | all server src and tests | — | Pass | `evidence/IMP-10-typecheck-round2.log` | `production errors: 0; test-file errors: 1000 in 313 files (baseline 1000 in 313 files)` |
| IMP-11 | `pnpm exec vitest run tests/unit tests/architecture` | `1df7771aac` | same | whole server unit and architecture suites | regression, AC-008 | Pass | `evidence/IMP-11-unit-and-architecture-round2.log` | `Tests  8043 passed \| 7 skipped (8050)` |
| IMP-12 | round-2 focused tests, then negative controls on each wiring piece (`controls-r2.sh` inside the file) | `132471ccd9` | same | kernel builder, host start, general supervisor wiring, CR-001 | AC-008, REQ-006, CR-001 | Pass | `evidence/IMP-12-round2-focused-tests-and-negative-controls.log` | each NC fails a test; NC-R2-02a/02b pass alone, NC-R2-02c (both observers removed) `1 failed \| 1 passed (2)` |
| IMP-13 | studio built-server E2E with the notice checks, plus a negative control with the studio built without the notice | `f79773703d` | same, private HOME | studio standalone and member renewal with notice | AC-008 (studio), AC-006 | Pass | `evidence/IMP-13-e2e-studio-notice-built-server.log`, `evidence/IMP-13-e2e-studio-notice-negative-control.log` | `Tests  3 passed (3)`; control: `the first input begins with the hand-over notice (AC-008): expected false to be true` |
| IMP-14 | effective-line counts of round-2 source files | `1df7771aac` | — | size guardrail | — | Pass | `evidence/IMP-14-source-file-sizes-round2.txt` | largest 428 (host start) |
| IMP-09 | `pnpm exec vitest run tests/unit/application-platform tests/architecture tests/unit/agent-execution/standalone-session-renewal.test.ts`, plus a negative control | `2acd842c95` | same | application-scope lifecycle port | DS-001 / N-4 | Pass | `evidence/IMP-09-application-scope-switch-port.log` | `Tests  181 passed (181)`; control: `1 failed \| 11 passed (12)` |

- IMP-01…IMP-09 are IR-001 checks; IMP-10…IMP-14 rerun or extend them for IR-002. IMP-03's controls on CR-001-touched files were superseded by IMP-12's codex and runtime-switch rows.
- Not run, and why: a full built host E2E (the host serves no run API; covered by the real supervisor with the host's wiring plus the real host start's wiring check); the live AC-007 Claude check (API/E2E's, gated); a Claude built-server E2E (needs a new scripted Claude harness; see Known Risks); built-server E2E for the Org member (design asks real-root tests there, done in `member-session-renewal.test.ts`); live Codex/Grok/DeepSeek renewals (shapes pinned from probes; API/E2E may run them live).

## Frontend Rendered-Result Check (When Applicable)

Not Applicable: server-only change. The marker appears in the chat through the existing `runtime_switch` segment projection, unchanged.

## Downstream Coverage Hints / Suggested Scenarios

- AC-007 live: a synthetic Claude run on an isolated data root whose saved session ID was never created; send a message; expect the marker line, the notice in the first input, a new session ID, and an answer.
- A real Team member on Claude with a lost session through the built server (the observed case), checking the tree's new `platformAgentRunId` and a later restore of it.
- An application-scope run (an application's agent) on Claude with a lost session, checking the notice on its first input (AC-008 live).
- Codex live: delete a test-owned rollout under an isolated `CODEX_HOME`, then send.
- Negative live checks: a Claude restore with an invalid key must fail as today with no marker.
- Reopening the chat after a renewal shows the earlier conversation, then the line (AC-006).

## API / E2E / Executable Coverage Investigation And Execution Still Required

- AC-007 (live Claude, gated) and the user-path checks above.
- Decide whether a scripted Claude built-server harness is wanted for future tickets (not added here).
