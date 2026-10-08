# Investigation Notes

## Investigation Meta

- Package identifier: `interrupt-resend-retired-cleanup-stuck`
- Request / ticket: Project Task `project_task_9167f6b9-9b93-42ca-b20d-333d9619fbe6` — "Run permanently stuck after interrupt + immediate resend (Antigravity runtime)", delegated by `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`).
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/interrupt-resend-retired-cleanup-stuck`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/interrupt-resend-retired-cleanup-stuck` / `codex/interrupt-resend-retired-cleanup-stuck`
- Resolved base remote / branch / revision: `origin` / `personal` / `ace86bf1f` (fetched 2026-10-08; `origin/HEAD` -> `origin/personal`)
- Finalization target remote / branch: `origin` / `personal`
- Bootstrap result: Worktree created from freshly fetched `origin/personal`; `pnpm install --frozen-lockfile` succeeded in the worktree.
- Bootstrap blocker: None
- Current solution revision ID: `SR-001`
- Authorities read (requirements reading gate; file and date): `.claude/skills/solution-designer/references/requirements-engineering.md` (2026-10-08); repository `AGENTS.md` (2026-10-08). Architecture gate (design-principles, architecture-design, `DESIGN.md`, `TESTING.md`) deferred until after requirements approval.
- Investigation status: Requirements-phase investigation complete; root cause confirmed by code trace, unit-level reproduction and production log.

## Initial Request And Clarifications

- Original request: A standalone Daily Assistant run on the Antigravity runtime became permanently unusable after the user pressed Interrupt and immediately sent another message. Every later send fails with "Agent run '…' still owns retired cleanup." Reproduce, find the root cause, fix so a send right after interrupt is accepted or temporarily rejected (never permanently blocked), let already-stuck runs recover without losing history, make any remaining error understandable, cover by tests including the race, verify in desktop app.
- Clarifications received: None yet.
- User-supplied facts and constraints: run id `daily_assistant_feb311e786054ec1acd79eae16d785f9`, Antigravity runtime, latest desktop build, screenshot attached.
- Initial ambiguity: Whether the cause is the interrupt/resend race, an Antigravity stop/cleanup failure, or both — resolved below.

## Product And Domain Understanding

- Product area: Agent run lifecycle in `autobyteus-server-ts` (activation registry, standalone run lifecycle/root, runtime backends) and its error surfacing in `autobyteus-web` chat.
- Affected actors or systems: Desktop user chatting with a standalone agent run; any server path that re-activates a standalone run after its runtime went offline.
- Existing user or operational purpose: Interrupt stops the current turn; the run stays in the conversation and the next message continues it.
- Relevant terminology:
  - *Published run*: the live `AgentRun` registered in `AgentRunActivationRegistry.activeRuns`.
  - *Inactive discovery*: `registry.getActiveRun()` finds a published run whose backend reports `isActive() === false` and calls `removeIfCurrent({reason: "inactive_discovery"})`.
  - *Retired*: `registry.retired` map — a run removed from `activeRuns` that still "owns" cleanup; a new activation claim for that run id is refused while it is there.
  - *Exact release*: `AgentRunManager.releaseExactRun(run)` — force-releases runtime + attachments, then `removeIfCurrent({reason: "explicit_termination"})`, which is the only path that clears `retired`.

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-10-08 | User | Task attachment `ctx_f86c4f970f3a__8.png` (copied to `evidence/user-screenshot-stuck-run.png`) | Symptom | Three sends ("…", "hello", "continue") each answered by "An Error Occurred: Agent run '…' still owns retired cleanup."; header status red **Error** | — |
| 2026-10-08 | Code | `autobyteus-server-ts/src/agent-execution/runtime/agent-run-activation-registry.ts` L84–119, L201–236 | Error origin | `claim()` throws `AGENT_RUN_ACTIVATION_CLEANUP_FAILED` "still owns retired cleanup" when `retired.has(runId)`. `removeIfCurrent()` always moves the run to `retired`, but only deletes it from `retired` when `reason === "explicit_termination"` and resource release had no errors. For `inactive_discovery` the run stays in `retired` forever. | Design must define who completes retired cleanup |
| 2026-10-08 | Code | `git log -S"retired.has(runId)"` -> `028cca231` (2026-10-05, linked-delegation candidate) | When introduced | `retired`, `released`, `ownsPublishedOrRetired`, `releaseRuntimeAttachments`, `releaseExactRun` and the claim refusal were all added together. Before it, inactive discovery removed the run fully. | Regression window: builds containing `028cca231` |
| 2026-10-08 | Code | `src/agent-execution/services/agent-run-manager.ts` L293–334 | Who clears retired | Only `finishPublishedAgentRunTermination` and `releaseExactRun` use `explicit_termination`. | — |
| 2026-10-08 | Code | `src/agent-collaboration/execution/backends/configured-agent-execution-handle.ts` L260–284 | Team members / delegated copies | `initializeReady()` calls `manager.releaseExactRun(this.agentRun)` before re-activating a dead run, so team-member/delegated-copy re-activation clears `retired`. | Team path not affected by this specific cause |
| 2026-10-08 | Code | `src/standalone-agent-run-root/domain/standalone-host-agent-handle.ts` L42–61; `src/agent-execution/services/standalone-agent-run-lifecycle-service.ts` L85–141, L193–229 | Standalone host path | `ensureReady()` -> `getActiveRun()` (inactive discovery -> `retired`) -> `activateHost()` -> `resolveInsideTransition()` -> `restoreStarted()` -> `beginActivation()` -> `registry.claim()` -> throws. No step performs exact release of the prior run. Same for `resolveCommandReadyAgentRun` (helpers/application-owned runs). | Root cause |
| 2026-10-08 | Code | `standalone-agent-run-lifecycle-service.ts` L131–139; `src/agent-execution/errors.ts` L48–51 | Why every later send fails | `isAgentRunActivationQuarantineError()` treats `AGENT_RUN_ACTIVATION_CLEANUP_FAILED` as quarantine; `resolveInsideTransition` stores it in `this.quarantines` and re-throws it on every later activation until server restart, even if the registry were later cleaned. | Second sticky layer |
| 2026-10-08 | Code | `src/agent-execution/backends/antigravity/backend/agy-agent-run-backend.ts` L95–118 | Why Antigravity | AGY `interrupt()` sets `active=false; processAlive=false` synchronously and stops the AGY process: interrupting an AGY turn takes the run offline by design, so the next message must re-activate (restore) it. | — |
| 2026-10-08 | Code | Codex `codex-agent-run-backend.ts` L161–179; ACP `acp-agent-run-backend.ts` L111–121; Claude `claude-session.ts` L172 | Other runtimes on interrupt | Codex, Claude and ACP (Grok) interrupt only cancel the turn; the run stays active, so interrupt alone does not trigger the bug there. | — |
| 2026-10-08 | Code | ACP `handleSessionFailure()`/`shutdown()` L80–83, L129–134; AGY `handleClose()` L168–188; Codex `isActive()` thread-manager identity; native `lifecycleState` | Other self-inactive paths | Any runtime whose process/session ends on its own (crash, unexpected exit, session failure) leaves the published run inactive; the next standalone send hits the same retired-claim refusal. | Runtime-neutral fix needed |
| 2026-10-08 | Code | `src/agent-execution/services/agent-run-command-coordinator.ts` L100–125, L175–200 | Error surfacing | Activation errors become ack `code: ACTIVATION_FAILED` with the raw internal message, plus an error status overlay (red **Error** in header). | Error wording requirement |
| 2026-10-08 | Runtime | `~/.autobyteus/server-data/logs/server.log` (excerpt: `evidence/server-log-excerpt.txt`) | Production confirmation | Four consecutive `SEND_MESSAGE command not accepted … [ACTIVATION_FAILED] … still owns retired cleanup.` lines for the user's run, each after a fresh websocket attach. | — |
| 2026-10-08 | Data | `~/.autobyteus/server-data/memory/agents/daily_assistant_feb311e786054ec1acd79eae16d785f9/run_metadata.json` (read-only) | History intact? | `runtimeKind: antigravity_cli`, `platformAgentRunId: 98cb9c64-…`, `startedAt` set; `agy-project/`, `raw_traces_active.jsonl` present. Durable history is intact; stuck state is in-memory only. | Recovery need not touch persisted data |
| 2026-10-08 | Command | `npx vitest run` of disposable probe (`evidence/registry-repro-probe.test.ts.txt`) in worktree | Reproduce | Publish run -> mark inactive -> `getActiveRun()` -> `claim()` twice: both throw "still owns retired cleanup". Passed (reproduced). Probe removed from source tree. | Becomes basis for regression tests |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger Or Governing Contract | Current Supported Product Behavior Path / Lifecycle | Current Outcome / Invariants | Evidence | Confidence / Unknown |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Interrupt button in chat input on a standalone run | AGY: interrupt stops the AGY process; run becomes offline. Codex/Claude/Grok/native: turn cancelled, run stays live. | Interrupt itself succeeds on all runtimes. | agy backend L95–107 | High |
| BEH-002 | User | Send a message to a standalone run whose runtime is offline (after AGY interrupt, or after a runtime crash/exit) | Host `ensureReady` -> inactive discovery parks the run in `retired` -> restore claim refused -> ack `ACTIVATION_FAILED` "still owns retired cleanup" -> error stored as quarantine. | Run permanently unusable until server/app restart. Independent of timing: a slow resend after an AGY interrupt follows the same path. | registry, lifecycle service, host handle, probe, server log | High (code + probe + log). Desktop-app reproduction pending in validation. |
| BEH-003 | User | Send to a standalone run while a prior activation/termination is still in progress | Transition lane serializes activations per run; host handle joins an in-flight activation. | Concurrent callers join one attempt. | lifecycle service `withTransition`, host handle `ensureReady` | High |
| BEH-004 | System | Team member / delegated copy whose runtime went offline receives new work | `ConfiguredAgentExecutionHandle.initializeReady` exact-releases the dead run, then re-activates. | Recovers; not affected by the retired cause. | handle L277–284 | Medium (latent risk: if `releaseExactRun` throws there, `readinessAttempt` is never marked retry-safe, so that member would also stick — not observed, to be covered by tests) |
| BEH-005 | Operational | App/server restart | In-memory registry and quarantine maps are rebuilt empty; the run restores from `run_metadata.json` + provider conversation id. | Restart is today's only workaround; history preserved. | lifecycle service in-memory maps; metadata file | Medium (not yet exercised in desktop app) |

## Relevant Codebase And Technical Facts

| Path / Component / Contract | Current Responsibility Or Behavior | Requirement Implication | Architecture Question / Design Implication |
| --- | --- | --- | --- |
| `agent-execution/runtime/agent-run-activation-registry.ts` | Owns publish/claim/retired/released state | Must never leave a run id permanently unclaimable | Who owns completing retired cleanup for a self-inactive run; should inactive discovery release fully, or should re-activation perform exact release first? |
| `agent-execution/services/agent-run-manager.ts` `releaseExactRun` | Exact release + `explicit_termination` | Existing mechanism to reuse | Expose a "release retired run by id" for owners that do not hold the run object (standalone lifecycle)? |
| `agent-execution/services/standalone-agent-run-lifecycle-service.ts` | Activation/restore in per-run transition lane; sticky quarantine map | Re-activation after offline must succeed; cleanup failures must be retryable | Perform retired cleanup inside the transition lane before claim; narrow what is treated as sticky quarantine |
| `standalone-agent-run-root/domain/standalone-host-agent-handle.ts` | Joins in-flight activation | Interrupt-then-send must wait for cleanup rather than fail | — |
| `agent-execution/backends/antigravity/backend/agy-agent-run-backend.ts` | Interrupt = process stop; `isActive()` false immediately, process stop completes asynchronously | Re-activation must not start a new AGY process on the same conversation before the old stop finishes | Wait for prior runtime stop completion (exact release awaits `terminate()`/`process.stop()`) |
| `agent-execution/services/agent-run-command-coordinator.ts` | Maps activation failures to ack + error overlay | Remaining errors must be understandable and temporary | User-facing message mapping for cleanup-in-progress / cleanup-failed codes |
| `configured-agent-execution-handle.ts` `initializeReady` | Exact release before re-activation (outside try) | Team members must also never stick | Cover with tests; correct retry-safety if `releaseExactRun` throws |

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces

- Files: `run_metadata.json`, provider conversation state (`agy-project/`), raw traces — read on restore; not changed by this bug.
- Existing readers/writers: `StandaloneAgentRunLifecycleService` (only writer of `run_metadata.json`).
- Evidence paths: see Source Log.

### Structural Surfaces

- Runtime modules: activation registry, run manager, standalone lifecycle service, standalone host handle, configured execution handle, command coordinator, AGY backend.
- Concurrency/lifecycle controls: per-run transition lane, host activation join, registry claim state, termination preparation.
- Existing structural surfaces that can support the approved behavior: `releaseExactRun`, transition lane, host `ensureReady` join.

### Potential Structural Impacts To Investigate

- API or external-contract change: Possibly a new/adjusted ack error code/message for "cleanup in progress/failed — retry"; web display.
- Persistence schema or invariant change: None expected.
- Security or privacy boundary change: None.
- Concurrency or lifecycle change: Yes — re-activation ordering after self-inactive runs.
- Deployment/migration/ownership/structural refactor: Possible small ownership clarification of "retired cleanup" between registry and lifecycle owners.
- Confirmed absent, present, or unknown: Persistence change absent; lifecycle change present.

## Runtime, Probe, Or Reproduction Findings

| Method / Command | Scenario | Observation | Requirement Implication | Artifact / Evidence Path |
| --- | --- | --- | --- | --- |
| Unit probe on real `AgentRunActivationRegistry` | Published run becomes inactive, discovered, re-claimed | Every claim refused with "still owns retired cleanup" | Root cause confirmed independent of timing | `evidence/registry-repro-probe.test.ts.txt` |
| Production server log | User's stuck run | 4 consecutive `ACTIVATION_FAILED … still owns retired cleanup` | Matches code path | `evidence/server-log-excerpt.txt` |
| Desktop-app reproduction (AGY interrupt + immediate send; slow send; crash) | — | Not yet executed (requires live AGY credentials/app); planned for validation | Validation obligation | — |

## Stakeholder And User Evidence

| Source / Actor | Need, Problem, Or Constraint | Evidence Strength | Requirement Implication | Open Question |
| --- | --- | --- | --- | --- |
| User (task) | Run must never be permanently blocked; stuck runs must recover without history loss; errors understandable | Strong (screenshot, log) | REQ-001..REQ-006 | Preferred behavior for send during cleanup: wait vs temporary rejection (DEC-001) |
| User (2026-10-08 follow-up) | Offline runs on all runtimes (for example after a computer restart) always resume on the next message; only Antigravity after an interrupt does not | Strong (repeated user experience) | Consistent with root cause: after a restart the server holds no live run object, so there is no inactive discovery and nothing is parked in `retired`; the claim succeeds. The bug needs a run that goes offline while the server still holds it. AGY interrupt does that every time; other runtimes only on an unexpected crash or exit mid-session (rare). It also supports BEH-005: a restart should recover the stuck run (U-001 likely resolved; still to confirm in validation). | None |

## External Contracts, Standards, And Dependencies

| Contract / Dependency | Version / Authority | Relevant Behavior Or Constraint | Evidence | Unknown / Risk |
| --- | --- | --- | --- | --- |
| Antigravity CLI (`agy`) headless process | Current bundled | Interrupt is process stop; restore resumes by conversation id | agy backend | Whether starting a new process while the old is still exiting on the same conversation is safe — design should avoid it by waiting |

## Persisted Data And State Facts

- Affected stored or external subject: None changed; stuck state is in-memory (`registry.retired`, lifecycle `quarantines`).
- Location and representative shape: `run_metadata.json` shown above.
- Approximate volume: per run.
- Current readers and writers: lifecycle service.
- Required semantics or data that must be preserved: Full conversation history and provider conversation binding (`platformAgentRunId`).
- Acceptable loss, reset, rebuild, or regeneration: The interrupted turn's partial output may remain as already recorded; no other loss.
- Remaining evidence gap: None for requirements.

## Product Design Request Context

- Product Design request in the current input: `Not stated`. Error wording is a small copy change within the existing error card; no Product Design handoff.

## Product Design Findings

- N/A — not applicable.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- | --- | --- |
| `evidence/user-screenshot-stuck-run.png` | User | Symptom | BEH-002 | AC-001, AC-004 | Final | Evidence only |
| `evidence/server-log-excerpt.txt` | Solution Designer | Production confirmation | BEH-002 | AC-001 | Final | Evidence only |
| `evidence/registry-repro-probe.test.ts.txt` | Solution Designer | Reproduction | BEH-002 | AC-001, AC-002 | Final (disposable probe, retained as text) | Evidence only |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| U-001 | Unknown | Whether today a server/app restart fully recovers the user's stuck run (shutdown `stopAll` iterates retired runs) | Recovery path for already-stuck runs before the fix ships | AF-011 + user observation; AC-007 user verification | Resolved for design; confirm in AC-007 |
| R-001 | Risk | Team member path: `releaseExactRun` throwing inside `initializeReady` leaves a non-retry-safe rejected `readinessAttempt` (sticky) | Same "never permanently blocked" outcome for team members | AF-008; design-spec change C-5 | Confirmed by code; addressed in design |
| R-002 | Risk | AGY new process started while old one still exiting on the same conversation | Corrupt/duplicate provider session | AF-002/AF-003; design orders release before claim | Addressed in design |

## Architecture Investigation Findings

Recorded 2026-10-08 after SR-001 approval. Authorities read for this phase: `references/architecture-design.md`, `design-principles.md`, repository `DESIGN.md`, `TESTING.md`, `autobyteus-server-ts/AGENTS.md` (no package-level `DESIGN.md` in `autobyteus-server-ts` or `autobyteus-web`).

| ID | Source | Observation | Design implication |
| --- | --- | --- | --- |
| AF-001 | `agent-run-manager.ts` `releaseExactRun` L319–334 | Exact release = `run.forceReleaseRuntime()` (closes the run's admission fence, then `AgentRunTermination.forceTerminate()` -> `backend.terminate()`), then `registry.releaseRuntimeAttachments`, then `removeIfCurrent(explicit_termination)`, which clears `retired`. It accepts a retired run (`ownsPublishedOrRetired`). | The standalone path can reuse it unchanged; nothing new is needed to prove the stop. |
| AF-002 | `agent-run-termination.ts` L119–121, L162–176, L193–222 | `forceTerminate()` reuses the current `prepared` termination; `finishCommittedTermination()` memoizes `finishing`, clears it on rejection or a non-accepted result, and finally calls `getDefaultAgentRunEventPipeline().releaseRun(runId)` (keyed by **run id**). | A repeated exact release joins an in-flight one and can be retried after a failure. Because the pipeline release is keyed by run id, the old run's release must finish **before** the replacement for the same id is claimed. This confirms the ordering in REQ-003. |
| AF-003 | `agy-stream-process.ts` `stop()` L75–119 | `stop()` is joined while in flight and resolves only after the AGY child and its captured process groups are gone. It escalates to SIGKILL and throws `AGY_EXACT_STOP_UNCONFIRMED` after 5 s. | Awaiting exact release proves the old AGY process has exited (REQ-003). A stop failure surfaces as a release error, which can be retried. |
| AF-004 | `agy-agent-run-backend.ts` `terminate()` L109–118; converter `interrupt()` L90–98 | While an interrupt is in flight, `terminate()` calls `interrupt(turnId)` again: it joins `process.stop()`, and `converter.interrupt()` returns no events once the turn is already closed. | Terminating during the interrupt race is safe: no duplicate TURN_INTERRUPTED, no second process stop. No AGY backend change is needed. |
| AF-005 | `agent-run-interrupt-state.ts` L34–109 | The interrupt reserves inside the dispatch queue, then awaits `backend.interrupt()` outside it. | Termination's dispatch-queue step cannot deadlock behind the in-flight interrupt. |
| AF-006 | `agent-run-resource-manager.ts` `release()` L79–121 | Release is idempotent per exact run (`already_released`). | Discovery has already released the attachments, so the second release inside exact release is harmless. |
| AF-007 | `standalone-agent-run-lifecycle-service.ts` L121–156 | All activation for one run happens in a per-run transition lane. The host handle (`standalone-host-agent-handle.ts` L42–50) joins an in-flight activation. | The place to finish the previous runtime's release is inside the lane, before `activateOnce`. Concurrent sends join one attempt (AC-005). |
| AF-008 | `configured-agent-execution-handle.ts` L260–275, L277–284 | `initializeReady()` calls `releaseExactRun` **before** its `try`. If it throws or returns not-accepted, `markRetrySafe` is never called, so the rejected `readinessAttempt` is kept and returned for every later `ensureReady()`. | R-001 confirmed by code: one failed release would make the member unusable for good. Fix: a failed release of the previous run is retry-safe, because the handle still holds the exact run. |
| AF-009 | `errors.ts` L48–51; `configured-agent-activation-planner.ts` L60–63 | `AGENT_RUN_ACTIVATION_CLEANUP_FAILED` is a quarantine code: the standalone lifecycle caches it, and the planner treats it as not retry-safe. | Retired cleanup can always be retried. It needs its own non-quarantine code; the code for quarantined private candidates stays as it is. |
| AF-010 | `agent-run-command-coordinator.ts` L100–108; web `agentRunStore.ts` L70, `AgentStreamingService.ts` L180 | The ack carries `ACTIVATION_FAILED` plus `error.message`, and the web shows `ack.message` verbatim. | A plain-language server message meets REQ-005; no web change is needed. |
| AF-011 | `agent-run-manager.ts` `stopAllAgentRuns` L266–291; user observation | On app shutdown, retired runs are included in the stop snapshot; after a restart the registry is empty and restore succeeds. | U-001 resolved for design purposes: restarting with the fixed build recovers. AC-007 still needs confirmation by the user. |
| AF-012 | `tests/e2e/runtime/agy-background-task-transport.e2e.test.ts` L155–161; `tests/fixtures/agy-failure-cli.mjs` `BACKGROUND_STEP` route | A deterministic fake-AGY E2E already interrupts a long AGY turn over the real WebSocket. Live test `LIVE-ORG-R7` covers an Org root and member, but not a standalone run's interrupt followed by a send. | AC-001 and AC-002 can be covered at the real server boundary with the fake CLI, with no model calls. |

Root-cause classification: `Missing Invariant` together with a narrow `Boundary Or Ownership Issue`. The registry enforces "no reclaim while the previous runtime's release is owed", but on the standalone path nothing owns completing that release. In addition, the release error is classified as a permanent quarantine.

## Requirement Implications

- Root cause is runtime-neutral (a self-inactive standalone run can never be re-activated in-process) and is triggered by every Antigravity interrupt because AGY interrupt takes the run offline. Timing is not the cause; immediate resend only adds a second concern (the old AGY process may still be stopping).
- A second sticky layer (lifecycle quarantine map) turns any cleanup refusal into a permanent block; requirements must forbid permanent blocking for cleanup that can be retried.
- History is intact on disk; recovery must be in-process (retry) and also via restart.

## Notes For Architecture Design

- Map SCN-001..SCN-004 to: host `ensureReady` -> lifecycle transition lane -> (new) completion of prior run's retired cleanup -> claim -> restore.
- Verify `stopAllAgentRuns` handling of retired AGY runs whose process is already dead (U-001).
- Decide whether inactive discovery should itself complete release when the runtime proves stopped, or whether the re-activating owner performs exact release; avoid two owners.
- Keep team/delegated path behavior; add regression coverage for R-001.
