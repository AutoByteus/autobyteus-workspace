# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete; isolated ticket worktree created before authoritative artifacts/design work.
- Current Status: Root cause and branch attribution confirmed; requirements approved; architecture review Round 1 Design Impact findings `DI-001`–`DI-003` incorporated into SR-002 for re-review.
- Investigation Goal: Determine why Daily Assistant fails to activate with Codex + `gpt-5.6-luna`, prove whether the cause is AutoByteus or upstream Codex, determine branch ownership, and establish a safe repair policy.
- Scope Classification (`Medium`): narrow activation bug with shared materialization and diagnostic implications across Codex/Claude.
- Scope Classification Rationale: no frontend, provider, database, or public API change is needed, but resolution outcomes, workspace-link state handling, two runtime profiles, cleanup, and run-preparation diagnostics are relevant.
- Scope Summary: repair verified broken workspace skill links on demand; preserve warning-only missing-skill behavior and non-destructive live-collision handling; expose internal preparation causes server-side.
- Primary Questions To Resolve:
  1. What exact internal error caused the screenshot?
  2. Is the error caused by Codex/Luna or AutoByteus preparation?
  3. Is it introduced by the completed shell-CWD ticket or already present on `personal`?
  4. Which link states can be repaired without deleting or trusting live content?
  5. Is the policy duplicated across runtimes and therefore vulnerable to drift?

## Request Context

The user first suspected a Codex shell-command CWD conversion defect, then supplied an Electron screenshot showing Daily Assistant in `Error` after selecting Codex and GPT-5.6 Luna. After log/root-cause investigation showed an unrelated workspace-skill issue, the user explicitly required a new ticket and prohibited any change to the finished shell-CWD ticket. The user then approved this policy:

- if the expected workspace path is a symlink and its target no longer exists, unlink only the broken symlink;
- if the skill resolves at a valid current location, create a replacement symlink to that source;
- otherwise warn, omit the optional skill, and continue startup;
- do not delete/follow target content or overwrite live/unowned collisions.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`): multi-package super-repository worktree.
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-luna-agent-run-prepare-failure`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-luna-agent-run-prepare-failure/tickets/done/codex-luna-agent-run-prepare-failure`
- Current Branch: `codex/codex-luna-agent-run-prepare-failure`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-luna-agent-run-prepare-failure`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `origin/personal` was fetched before worktree creation; the ticket was created from refreshed commit `a098b205ca990bf86b5e452950a49fc5dc39c8d1`. The tracked remote may advance during the ticket; delivery must perform its normal final refresh/integration check.
- Task Branch: `codex/codex-luna-agent-run-prepare-failure`
- Expected Base Branch: `origin/personal`
- Expected Finalization Target: `personal`
- Bootstrap Blockers: None.
- Notes For Downstream Agents: do not edit or reuse the finished worktree at `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`; all changes and task artifacts belong in this dedicated worktree. At solution-handoff time only ticket artifacts are untracked; production source has not been modified.

## Supplemental Task Artifact Inventory

| Artifact Path | Purpose And Scope | Evidence, Context, Or Decision Captured | Core Artifact(s) Supported | Related Requirement / Acceptance-Criteria IDs (When Applicable) | Status | Approval Applicability / State | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-luna-agent-run-prepare-failure/tickets/done/codex-luna-agent-run-prepare-failure/evidence/full-stack-reproduction/experiment-report.md` | Durable summary of the isolated delivered-build reproduction and A/B controls | Same package/agent/runtime/model failure, exact materializer exception, broken-link-only control, missing-skill control, cleanup | Requirements, investigation, design, downstream coverage | FR-001, FR-002, FR-004, FR-005, FR-007; AC-001, AC-004, AC-005, AC-010 | Complete | N/A — evidence only | Retain and include in every downstream handoff. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-luna-agent-run-prepare-failure/tickets/done/codex-luna-agent-run-prepare-failure/evidence/full-stack-reproduction/` | Raw evidence package | GraphQL responses, WebSocket event/ACK streams, run metadata, exact exception, log excerpts, termination results, cleanup record | Investigation, design, downstream coverage | AC-001, AC-004, AC-005, AC-010, AC-011 | Complete | N/A — evidence only | Retain; downstream may select the durable scenarios rather than treating raw probes as repository tests. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-luna-agent-run-prepare-failure/tickets/done/codex-luna-agent-run-prepare-failure/evidence/reported-ui-error.png` | Durable copy of the user's Electron screenshot | Daily Assistant UI displays only generic `Failed to prepare agent run ...` and no activity | Requirements, investigation, design | FR-004; AC-004 | Complete | N/A — user-supplied evidence | Retain; no UI redesign is authorized. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-luna-agent-run-prepare-failure/tickets/done/codex-luna-agent-run-prepare-failure/design-review-report.md` | Architecture review Round 1 | `ARCH-REV-001`, `DI-001`–`DI-003`, and reachable premises `PREM-001`–`PREM-003` | Investigation, design, revision record | FR-002, FR-007; AC-001, AC-006–AC-009 | Authoritative Round 1 | N/A — review artifact | Include in re-review/downstream handoffs. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-luna-agent-run-prepare-failure/tickets/done/codex-luna-agent-run-prepare-failure/architecture-review-revision-record.md` | Architecture review round index | Round 1 Fail baseline and affected findings | Investigation, solution revision record | Same as review report | Current through `ARCH-REV-001` | N/A — review artifact | Include in re-review/downstream handoffs. |

## Source Log

| Date | Source Type | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-08-21 | Data / Command | `lstat`, `readlink`, `realpath`, and existence checks against `/Users/normy/.autobyteus/server-data/temp_workspace/.codex/skills/shell-first-operating-practice` and both old/new source paths | Inspect the actual persisted state without mutating it | Workspace entry is a symlink to the deleted agent-local source; shared skill source and `SKILL.md` exist | No |
| 2026-08-21 | Repo / Command | `git log --follow -- .../shell-first-operating-practice`, source-tree inspection in `/Users/normy/autobyteus_org/autobyteus-agents` and `/Users/normy/autobyteus_org/autobyteus-skills` | Determine whether the skill was removed or moved | Agent package commit `ae74cf40742e4713abfe30065f060b5792c50487` moved the capability on 2026-08-05; Daily Assistant still configures the same skill name | No |
| 2026-08-21 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts` | Trace activation from resolved configured skill to materialization | Resolves working directory/agent/skills, preflights Codex `skills/list`, then calls the materializer before returning runtime context | No |
| 2026-08-21 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/codex-workspace-skill-materializer.ts` | Locate the exact collision | Existing states are only `missing`, `same-source-symlink`, and `collision`; a different broken target falls into fatal collision | No |
| 2026-08-21 | Code | `autobyteus-server-ts/src/agent-execution/backends/claude/claude-workspace-skill-materializer.ts`; `diff -u` against Codex materializer | Assess cross-runtime impact/ownership | Claude duplicates the same state inspection, validation, registry, cleanup, and collision policy with only label/root differences | Design must centralize shared policy |
| 2026-08-21 | Code | `autobyteus-server-ts/src/skills/services/configured-agent-skill-resolver.ts`; `skill-service.ts` | Verify missing-skill behavior and safe-name ownership | A safe configured name that cannot resolve logs `could not be resolved. Skipping.` and returns no `Skill`; invalid names are rejected before path use | Preserve and expose a safe resolution outcome for materialization |
| 2026-08-21 | Code | `autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts:172-209` | Trace error wrapping | Unexpected backend preparation errors are wrapped in `AgentCreationError`; original error is assigned to `.cause`, but no log records it | Add server-side error-object logging |
| 2026-08-21 | Code | `autobyteus-server-ts/src/agent-execution/services/agent-run-command-coordinator.ts:90-94` | Explain the screenshot message | Command failure and error overlay use only the outer error message and `ACTIVATION_FAILED` | Preserve as user-safe boundary |
| 2026-08-21 | Test | Codex and Claude materializer unit suites; Codex bootstrapper unit/integration suite; `agent-run-manager.test.ts`; private-skills E2E suite | Inventory existing coverage and seams | Same-source, holder cleanup, live symlink collision, cleanup guard, and access `NONE` exist; broken-link repair, unresolved binding cleanup, shared parity, and underlying-cause logging do not | Expand after downstream coverage investigation |
| 2026-08-21 | Command / Repo | `git diff` between completed CWD branch HEAD `322c3db2b68d977d42934b27fa0ff9ea81291db3` and its `origin/personal` base for activation/materialization/manager/coordinator files | Attribute the regression | No affected-path differences; CWD ticket changes only Codex tool-command CWD projection/parser coverage | No |
| 2026-08-21 | Setup / Trace | Delivered `/Applications/AutoByteus.app` 1.4.53 backend on `127.0.0.1:39721`, isolated `/tmp/autobyteus-skill-bootstrap-repro.*` data/db/memory/workspace, production GraphQL import/prepare and `/ws/agent/:runId` SEND_MESSAGE | Reproduce without touching user state | Synthetic observed stale link yields offline → initializing → error and `ACTIVATION_FAILED` | No |
| 2026-08-21 | Probe | Direct call to delivered `CodexWorkspaceSkillMaterializer` against the isolated stale state | Recover the internal exception hidden by run wrapping | Exact collision names old missing target and current shared source | No |
| 2026-08-21 | Probe | Remove only isolated broken link, repeat same GraphQL/WebSocket activation | Single-variable causal control | Activation accepted and correct shared-source link created | No |
| 2026-08-21 | Probe | Restart isolated backend without the shared skills source and repeat activation | Test the user's missing-skill expectation | Resolver warns/skips; activation accepted | No |
| 2026-08-21 | Probe | Installed `codex-cli 0.149.0` `model/list` and direct `thread/start` with `gpt-5.6-luna` in same workspace | Exclude model/provider cause | Model is advertised and direct thread creation succeeds | No |
| 2026-08-21 | Setup | `git fetch origin personal`; dedicated `git worktree add ... -b codex/codex-luna-agent-run-prepare-failure origin/personal` | Isolate the new ticket from the finished CWD ticket | Worktree created at `a098b205...`; no source change made during solution investigation | Delivery will refresh latest remote |
| 2026-08-21 | Review / Code | `design-review-report.md` `ARCH-REV-001`; current Codex preflight tests/materializer acquire/release loop | Validate SR-001 target lifecycle against supported production concurrency and multi-skill paths | `PREM-001`: discovery filtering can bypass a broken path; `PREM-002`: delete-before-awaited-cleanup can race a new holder; `PREM-003`: later batch failure strands earlier holders | Resolved in SR-002 design; architecture re-review required |

## Relevant Existing Behavior And Production Paths

| Behavior ID | Kind | Current Supported Trigger Or Governing Contract | Current Production Path And Lifecycle | Meaningful Current Outcome / Invariants | Evidence |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | User | User sends the first message to a prepared Daily Assistant run using Codex + Luna in a workspace retaining the prior materialized link | Electron send → agent WebSocket `SEND_MESSAGE` → `AgentRunCommandCoordinator.postUserMessage` → `AgentRunService.resolveCommandReadyAgentRun` → `AgentRunManager.prepareNewAgentRun` → Codex backend/bootstrapper → configured skill resolution → Codex `skills/list` preflight → Codex materializer → collision throw → manager wrapper → error status/ACK | Run never starts; UI shows generic preparation failure; old broken link remains | Screenshot; raw events `04-stale-link-websocket.jsonl`; `05-exact-materializer-error.json`; code trace |
| BEH-002 | System | A configured skill reaches the Codex or Claude workspace materializer during create/restore bootstrap | Materializer derives runtime root/name → validates source manifest → `lstat`/`readlink` expected path → compare target/source → create/reuse/collision → registry descriptor → guarded final cleanup | Missing path is linked; same source is reused; every different target is fatal even when missing; live/non-link content is not overwritten | Both materializer source files and unit tests |
| BEH-003 | Operational | Backend creation throws an unexpected error during private candidate preparation | `AgentRunManager.prepareCandidate` cleans failed resources → wraps into `AgentCreationError` with `.cause` → command coordinator converts only wrapper message → ACK/status/log | Stable safe error reaches UI, but actionable cause is absent from normal logs | `agent-run-manager.ts:202-208`; coordinator `:90-94`; server log excerpt |
| BEH-004 | User / System | User starts an agent whose definition contains a safe configured skill name absent from private/team/global sources | Bootstrapper → `SkillService.resolveConfiguredSkillsForAgent` → `ConfiguredAgentSkillResolver` → warning/skip → empty resolved list → backend activation | Optional skill is omitted and activation proceeds; resolver retains no materialization input for its safe unresolved name | Missing-skill experiment `09`-`12`; resolver source |
| BEH-005 | Contract | Selected `codex_app_server`/`gpt-5.6-luna` reaches Codex after successful AutoByteus preparation | Run config → `CodexThreadBootstrapper.buildThreadConfig` → Codex client `thread/start` | Luna works when preparation reaches Codex; no translation/fallback required | Direct `model/list`/`thread/start`; successful control run metadata |

## Design Health Assessment Evidence

- Change posture (`Bug Fix`): reconcile a disposable persisted projection and improve diagnostics.
- Candidate root cause classification (`Missing Invariant`, `Duplicated Policy Or Coordination`): no broken-target state exists; parallel runtime implementations encode the same incomplete policy.
- Refactor posture evidence summary: refactor is needed now because implementing the new state independently would preserve the exact policy drift already exposed. Runtime-specific placement and naming remain thin configuration, not separate policy owners.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| Production A/B experiment | Only removing the broken link changes failure to success | Repair belongs at workspace-link reconciliation, not provider/model or UI | Implement/test exact state transition |
| Codex/Claude materializer diff | Approximately the full algorithm is duplicated | One shared owner should define states, mutation safety, registry, and cleanup | Remove duplicated algorithms |
| Configured skill resolver | Unsafe names are filtered; unresolved safe names are lost after warning | Materialization needs a tight safe resolution/binding representation rather than raw agent config | Design explicit binding outcome |
| Manager/coordinator trace | Manager owns preparation and wraps causes; coordinator owns safe transport projection | Log at manager boundary; do not leak internal path details through UI contract | Unit-test both sides |
| `ARCH-REV-001` / `PREM-001` | Codex preflight's name-only filter removes a resolved binding before expected-path inspection | Discovery must annotate exposure intent, never erase reconciliation identity | SR-002 maps every binding to one request |
| `ARCH-REV-001` / `PREM-002` | Final release currently removes the registry entry before awaited guarded unlink; a new acquire can reuse/return the soon-to-be-removed link | One mapped per-key phase lifecycle must cover acquire through final cleanup | SR-002 specifies wait-then-retry on `releasing` |
| `ARCH-REV-001` / `PREM-003` | Sequential multi-skill acquisition returns no partial descriptors to the caller when a later binding throws | Shared public call must roll back its own acquired occurrences before rethrow | SR-002 specifies reverse call-scoped rollback |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `src/skills/services/configured-agent-skill-resolver.ts` | Validates configured names and resolves contextual/global skills | Returns only resolved `Skill[]`; safe unresolved identities disappear | Resolution owner should expose resolved/unresolved bindings while retaining warnings |
| `src/skills/services/skill-service.ts` | Public skill catalog/resolution service | Projects resolver output to callers | Provide the binding API at this authoritative boundary; ordinary callers may still request resolved skills |
| `src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts` | Creates Codex run context and preflights already discoverable skills | Current name-only filter can delete a resolved binding before expected-path reconciliation (`DI-001`) | Pass run identity plus one request per safe binding; preflight selects request intent but never removes the binding |
| `src/agent-execution/backends/claude/backend/claude-session-bootstrapper.ts` | Creates Claude run context | Directly calls duplicate materializer | Use same binding/policy owner through Claude profile |
| `src/agent-execution/backends/codex/codex-workspace-skill-materializer.ts` | Codex path state, holder registry, creation/cleanup | Missing broken-link state; algorithm duplicates Claude; final release has a delete-before-awaited-cleanup seam; batch loop has no rollback | Reduce to Codex profile/singleton composition; shared owner gets phased registry and call rollback |
| `src/agent-execution/backends/claude/claude-workspace-skill-materializer.ts` | Claude equivalent | Same state/duplication and lifecycle gaps | Reduce to Claude profile/singleton composition; remove duplicate policy |
| `src/agent-execution/backends/*/*-agent-run-context.ts` and cleanup files | Retain materialized descriptors and release holders | Depend on runtime-specific duplicate descriptor types/method names | Consume one shared descriptor/materializer contract |
| `src/agent-execution/services/agent-run-manager.ts` | Authoritative private candidate preparation/cleanup/publication | Wraps without logging original unexpected cause | Record error object after cleanup and before wrapper throw |
| `src/agent-execution/services/agent-run-command-coordinator.ts` | Command ACK/status projection | Correctly presents outer safe message | No production change; preserve with tests |

## Runtime / Probe Findings

| Date | Method | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-08-21 | Repro | Import `/Users/normy/autobyteus_org/autobyteus-agents`, prepare Daily Assistant with `codex_app_server`/`gpt-5.6-luna`/`PRELOADED_ONLY`, send first message over production WebSocket with synthetic old-source broken link | ACK `failed`, `ACTIVATION_FAILED`; status error; `startedAt: null` | Failure is pre-thread AutoByteus activation |
| 2026-08-21 | Probe | Invoke delivered materializer with the same resolved `Skill` and workspace | Exact live-source-versus-old-target collision exception | State classification is the immediate throwing line |
| 2026-08-21 | A/B control | `unlink` only the isolated workspace symlink; repeat otherwise identical run | ACK accepted; correct shared-source link; runtime obtains platform thread ID | Link is the causal variable and link-only repair is sufficient |
| 2026-08-21 | Control | Omit shared skill source from isolated server environment | Resolver warning; ACK accepted; platform thread created | Missing skill is already an optional degradation path |
| 2026-08-21 | Probe | Codex `model/list` and direct `thread/start` | Luna present and starts | Exclude provider/model fix |

## External / Public Source Findings

- Public API / spec / issue / upstream source: N/A. No external contract is needed to explain or design the AutoByteus filesystem-state defect.
- Version / tag / commit / freshness: installed Codex CLI `0.149.0` was tested directly on 2026-08-21.
- Relevant contract, behavior, or constraint learned: workspace skill discovery is verified through the installed runtime; the project-trust warning explicitly appeared in both failing and successful controls and says skills still load.
- Why it matters: upstream behavior was tested rather than assumed, and the warning is excluded as a cause.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: delivered AutoByteus backend only; no mock provider. Production GraphQL and WebSocket transports were used.
- Required config, feature flags, env vars, or accounts: isolated server data/database/memory/temp-workspace paths; current local Codex authentication; `AUTOBYTEUS_SKILLS_PATHS` included the shared repository for Experiments A/B and omitted it for Experiment C.
- External repos, samples, or artifacts cloned/downloaded for investigation: none. Existing `/Users/normy/autobyteus_org/autobyteus-agents` was imported through the product API.
- Setup commands that materially affected the investigation: launched `/Applications/AutoByteus.app/Contents/Resources/server/dist/app.js` on `127.0.0.1:39721`; created an isolated symlink matching the observed target; imported the same agent package via `importAgentPackage`; drove `prepareAgentRun` and WebSocket `SEND_MESSAGE`.
- Cleanup notes for temporary investigation-only setup: control and missing-skill runs were terminated, isolated server processes stopped, and `/tmp/autobyteus-skill-bootstrap-repro.KknVzE` removed. The live user symlink and finished ticket were never changed.

## Findings From Code / Docs / Data / Logs

### Confirmed root cause

The skill was relocated, not removed. AutoByteus retained a workspace symlink to the deleted former source. The current resolver correctly found the new shared source, but the materializer had no `broken-symlink` state and therefore called the different target a collision. It threw before Codex `thread/start`. This is AutoByteus lifecycle reconciliation, not an upstream runtime/model failure.

Exact internal cause:

```text
Workspace skill path collision for Codex skill 'shell-first-operating-practice': workspace skill path '/Users/normy/.autobyteus/server-data/temp_workspace/.codex/skills/shell-first-operating-practice' already points to '/Users/normy/autobyteus_org/autobyteus-agents/agents/daily-assistant/skills/shell-first-operating-practice' instead of '/Users/normy/autobyteus_org/autobyteus-skills/shell-first-operating-practice'.
```

Outer visible cause:

```text
Failed to prepare agent run 'daily_assistant_ea129dcc38924da3b640f0fb41284d02'.
```

### Branch attribution

The delivered shell-CWD branch changes Codex tool-command projection/parser behavior only. There is no diff in the bootstrapper, materializers, manager, or coordinator. The persisted broken link is outside git. The defect therefore belongs to the original personal-line activation/materialization behavior and this dedicated ticket, not the completed shell-CWD ticket.

### State/safety findings

- `lstat` distinguishes a link path from its target; `unlink(linkPath)` removes the directory entry and never traverses the target.
- A symlink with a missing resolved target is safely disposable at the workspace projection path.
- A different symlink with a live target and a file/directory collision are not safely disposable or trustworthy. Because runtimes auto-discover these locations, continuing could load unexpected instructions; fail-closed is the only in-scope non-destructive outcome.
- Current cleanup already unlinks only when the path remains the expected same-source symlink. That guard must be retained.

## Persisted Data Transition Evidence (When Applicable)

- Current stored subject, location, representative shape, and approximate volume: one observed symlink under the persistent temp workspace `.codex/skills`; in general one small link entry per configured skill/runtime workspace.
- Relevant code-model, serialization, semantic, or physical-store change: add a missing path-state classification and on-demand reconciliation; no database/schema change.
- Normal readers and writers, including unknown/extra-field behavior: runtime bootstrap materializes before thread/session start; run cleanup conditionally removes the expected symlink after the final holder. Crashes or source moves can leave the projection beyond its valid source lifecycle.
- Representative direct-read or compatibility evidence: actual link target and timestamps; isolated synthetic copy; successful unlink/rebuild control.
- Required semantics and invariants preserved by direct use: No — a broken old-source link cannot be used directly. The authoritative current source can rebuild the link; live/unowned content must remain unchanged.
- Physical storage, privacy/security, disposal, rebuild, or operational constraints: only the symlink directory entry may be removed; targets and collisions are protected; no maintenance window or bulk scan is justified.
- Concrete benefit, cost, and risk of migration if it remains a candidate: a startup migration would scan unrelated workspaces, introduce broad I/O/ownership risk, and provide no benefit over local on-demand repair. `Discard or Rebuild` is appropriate.
- Existing migration framework or lifecycle constraints: no migration needed; the materializer is already the authoritative create/cleanup lifecycle boundary.

## Constraints / Dependencies / Compatibility Facts

- Preserve `.codex/skills` and `.claude/skills` conventions.
- Preserve Codex `skills/list` preflight; it selects `expose-resolved` versus `reconcile-discoverable` for each resolved binding but never removes a configured path from reconciliation.
- Preserve `SkillAccessMode.NONE` behavior; materialization must not expose configured skills when access is disabled.
- Only names validated by `ConfiguredAgentSkillResolver` may drive filesystem paths.
- Preserve same-source reuse, holder-count cleanup, relative-link resolution, and cleanup's ownership re-check.
- Preserve generic `ACTIVATION_FAILED`/outer error exposure through command/UI boundaries.
- No backward compatibility layer, old-source fallback, dual lookup, or historic-path map is permitted.

## Open Unknowns / Risks

- There is no blocking unknown for the approved SR-002 design.
- `PREM-001`–`PREM-003` are reachable within the approved IDs, not speculative residual risks. SR-002 therefore requires discovery annotation, a mapped `acquiring`/`ready`/`releasing` per-key lifecycle, and call-scoped rollback with deterministic coverage.
- A safe configured name with an unresolved source must remain available to reconciliation without exposing raw invalid names. The design must use a tight resolver-owned binding/result shape.
- Filesystem errors other than `ENOENT` (for example permission/I/O failure) are genuine preparation failures, not evidence of a broken target, and must not be swallowed as optional-skill omission.

## Notes For Architecture Reviewer

- Requirements are approved and `Design-ready`.
- `ARCH-REV-001` returned SR-001 with `DI-001`–`DI-003`; SR-002 resolves them without changing approved behavior.
- The production experiment proves causality and already excludes model/provider and completed-branch regressions.
- Review the shared-policy extraction as an in-scope drift prevention, not as a compatibility wrapper: runtime-specific files should retain only profile/singleton composition.
- Confirm Codex emits one request per active binding: discovery changes `expose-resolved` to `reconcile-discoverable` but cannot remove it; a discoverable broken expected path is still repaired.
- Confirm the registry entry remains mapped from acquisition through final cleanup, an acquire waits/retries on `releasing`, and failed multi-request calls release exactly their own descriptor occurrences before rethrowing the original error.
- Confirm that the target state machine recognizes `missing`, `same-source`, `broken-symlink`, `live-different-symlink`, and `non-symlink`, rechecks before unlink, and treats non-`ENOENT` filesystem failures as real failures.
- Confirm that safe unresolved configured identities reach reconciliation without duplicating or weakening configured-name validation.
- Confirm that the manager logs the original error object while the coordinator/UI contract remains unchanged.
