# Workflow State

Use this file as the mandatory stage-control artifact for the ticket.
Update this file before every stage transition and before any source-code edit.
Stage movement is controlled by this file's Stage Transition Contract + Transition Matrix.

## Current Snapshot

- Ticket: `preview-session-multi-runtime-design`
- Current Stage: `7`
- Next Stage: `7`
- Code Edit Permission: `Unlocked`
- Active Re-Entry: `No`
- Re-Entry Classification (`Local Fix`/`Validation Gap`/`Design Impact`/`Requirement Gap`/`Unclear`): `N/A`
- Last Transition ID: `T-032`
- Last Updated: `2026-04-01`

## Stage 0 Bootstrap Record

- Bootstrap Mode (`Git`/`Non-Git`): `Git`
- User-Specified Base Branch: `N/A`
- Resolved Base Remote: `origin`
- Resolved Base Branch: `personal`
- Default Finalization Target Remote: `origin`
- Default Finalization Target Branch: `personal`
- Remote Refresh Performed (`Yes`/`No`/`N/A`): `Yes`
- Remote Refresh Result: `git fetch --prune origin` completed successfully on `2026-03-31`.
- Ticket Worktree Path: `/Users/normy/autobyteus_org/autobyteus-worktrees/preview-session-multi-runtime-design`
- Ticket Branch: `codex/preview-session-multi-runtime-design`

Note:
- Fill this record during Stage 0 and keep it current if Stage 0 is reopened.
- Unless the user explicitly overrides Stage 10 later, the default finalization target should match the resolved base remote/branch recorded here.
- For non-git projects, mark git-only fields as `N/A`.

## Stage Gates

| Stage | Gate Status (`Not Started`/`In Progress`/`Pass`/`Fail`/`Blocked`) | Gate Rule Summary | Evidence |
| --- | --- | --- | --- |
| 0 Bootstrap + Draft Requirement | Pass | Ticket bootstrap complete + if git repo: base branch resolved, remote freshness handled, dedicated ticket worktree/branch created + `requirements.md` Draft captured | `git fetch --prune origin`; `git remote show origin`; `git worktree add -b codex/preview-session-multi-runtime-design /Users/normy/autobyteus_org/autobyteus-worktrees/preview-session-multi-runtime-design origin/personal`; `tickets/in-progress/preview-session-multi-runtime-design/workflow-state.md`; `tickets/in-progress/preview-session-multi-runtime-design/requirements.md` |
| 1 Investigation + Triage | Pass | `investigation-notes.md` current + scope triage recorded | `tickets/in-progress/preview-session-multi-runtime-design/investigation-notes.md`; `tickets/in-progress/preview-session-multi-runtime-design/workflow-state.md` |
| 2 Requirements | Pass | `requirements.md` is `Design-ready`/`Refined` | `tickets/in-progress/preview-session-multi-runtime-design/requirements.md`; `tickets/in-progress/preview-session-multi-runtime-design/workflow-state.md` |
| 3 Design Basis | Pass | Design basis updated for scope (`implementation.md` solution sketch or `proposed-design.md`) | `tickets/in-progress/preview-session-multi-runtime-design/proposed-design.md`; `tickets/in-progress/preview-session-multi-runtime-design/workflow-state.md` |
| 4 Future-State Runtime Call Stack | Pass | `future-state-runtime-call-stack.md` current | `tickets/in-progress/preview-session-multi-runtime-design/future-state-runtime-call-stack.md`; `tickets/in-progress/preview-session-multi-runtime-design/workflow-state.md` |
| 5 Future-State Runtime Call Stack Review | Pass | Future-state runtime call stack review `Go Confirmed` restored on the v8 shell-tab design. The shell controller is now the sole authority for preview-shell projection state, shell identity is main-process-owned, and shell bootstrap/reconnect recovery is modeled explicitly. | `tickets/in-progress/preview-session-multi-runtime-design/proposed-design.md`; `tickets/in-progress/preview-session-multi-runtime-design/future-state-runtime-call-stack.md`; `tickets/in-progress/preview-session-multi-runtime-design/future-state-runtime-call-stack-review.md`; `tickets/in-progress/preview-session-multi-runtime-design/workflow-state.md` |
| 6 Implementation | Pass | Local-fix re-entry completed. Targeted Electron renderer/main tests, server preview/runtime unit tests, Electron transpile, and server build typecheck all passed after the shell-tab preview rewrite and runtime-event normalization fix. | `tickets/in-progress/preview-session-multi-runtime-design/implementation.md`; `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/preview-session-multi-runtime-design/autobyteus-web exec vitest run components/layout/__tests__/RightSideTabs.spec.ts stores/__tests__/previewShellStore.spec.ts services/agentStreaming/handlers/__tests__/toolLifecycleHandler.spec.ts`; `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/preview-session-multi-runtime-design/autobyteus-web exec vitest run --config electron/vitest.config.ts electron/preview/__tests__/preview-session-manager.spec.ts electron/preview/__tests__/preview-shell-controller.spec.ts`; `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/preview-session-multi-runtime-design/autobyteus-web transpile-electron`; `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/preview-session-multi-runtime-design/autobyteus-server-ts exec vitest run tests/unit/agent-execution/backends/codex/events/codex-thread-event-converter.test.ts tests/unit/agent-execution/backends/claude/events/claude-session-event-converter.test.ts tests/unit/agent-execution/backends/codex/preview/build-preview-dynamic-tool-registrations.test.ts tests/unit/agent-execution/backends/claude/preview/build-claude-preview-mcp-servers.test.ts tests/unit/agent-tools/preview/register-preview-tools.test.ts`; `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/preview-session-multi-runtime-design/autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit`; `tickets/in-progress/preview-session-multi-runtime-design/workflow-state.md` |
| 7 API/E2E + Executable Validation | Blocked | Round 2 cleared the runtime-path failures and produced a current mac Electron artifact, but live shell-visible validation of the lazy right-side Preview tab is still pending user-assisted testing in the packaged app. | `tickets/in-progress/preview-session-multi-runtime-design/api-e2e-testing.md`; `RUN_CODEX_E2E=1 pnpm exec vitest run tests/integration/agent-execution/codex-agent-run-backend-factory.integration.test.ts -t 'executes open_preview through the live Codex preview dynamic tool path'`; `RUN_CLAUDE_E2E=1 pnpm exec vitest run tests/integration/agent-execution/claude-agent-run-backend-factory.integration.test.ts -t 'executes open_preview through the live Claude preview MCP path'`; `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/preview-session-multi-runtime-design/autobyteus-web build:electron:mac`; `tickets/in-progress/preview-session-multi-runtime-design/workflow-state.md` |
| 8 Code Review | Not Started | Code review gate `Pass`/`Fail` recorded + all changed source files `<=500` effective non-empty lines + `>220` delta-gate assessments recorded + data-flow spine inventory/ownership/off-spine concern checks + existing-capability reuse + reusable-owned-structure extraction + shared-structure/data-model tightness + shared-base coherence + repeated-coordination ownership + empty-indirection + scope-appropriate separation of concerns + file placement within the correct subsystem and folder, with any optional module grouping justified + flat-vs-over-split layout judgment + interface/API/query/command/service-method boundary clarity + naming quality across files/folders/APIs/types/functions/parameters/variables + naming-to-responsibility alignment + no unjustified duplication of code/repeated structures in changed scope + patch-on-patch complexity control + dead/obsolete code cleanup completeness in changed scope + test quality + test maintainability + validation-evidence sufficiency + no-backward-compat/no-legacy checks satisfied for `Pass` |  |
| 9 Docs Sync | Not Started | `docs-sync.md` current + docs updated or no-impact rationale recorded |  |
| 10 Handoff / Ticket State | Not Started | `handoff-summary.md` current + explicit user verification received + ticket moved to `done` + repository finalization into resolved target branch complete when git repo + any applicable release/publication/deployment step completed or explicitly recorded as not required + required post-finalization worktree/branch cleanup complete when applicable + ticket state decision recorded |  |

## Stage Transition Contract (Quick Reference)

| Stage | Exit Condition | On Fail/Blocked |
| --- | --- | --- |
| 0 | Bootstrap complete, base-branch/worktree decision recorded, and `requirements.md` is `Draft` | stay in `0` |
| 1 | `investigation-notes.md` current + scope triage recorded | stay in `1` |
| 2 | `requirements.md` is `Design-ready`/`Refined` | stay in `2` |
| 3 | Design basis current for scope | stay in `3` |
| 4 | Future-state runtime call stack current | stay in `4` |
| 5 | Future-state runtime call stack review `Go Confirmed` (two clean rounds with no blockers/no required persisted artifact updates/no newly discovered use cases) | classified re-entry then rerun (`Design Impact`: `3 -> 4 -> 5`, `Requirement Gap`: `2 -> 3 -> 4 -> 5`, `Unclear`: `1 -> 2 -> 3 -> 4 -> 5`) |
| 6 | Source + required unit/integration verification complete, shared design/common-practice rules are reapplied during implementation, no backward-compatibility/legacy-retention paths remain in scope, dead/obsolete code cleanup in scope is complete, ownership-driven dependencies remain valid (no new unjustified cycles/tight coupling), touched files sit in the correct folder under the correct owning subsystem, and changed source implementation files have proactive Stage 8 size/delta-pressure handling recorded (`>500` avoided, `>220` assessed/acted on) | local issues: stay in `6`; otherwise classified re-entry (`Design Impact`: `1 -> 3 -> 4 -> 5 -> 6`, `Requirement Gap`: `2 -> 3 -> 4 -> 5 -> 6`, `Unclear`: `0 -> 1 -> 2 -> 3 -> 4 -> 5 -> 6`) |
| 7 | executable-validation gate closes all executable mapped acceptance criteria (`Passed` or explicit user `Waived`) and all relevant executable spines have passing scenario evidence (or explicit `N/A` rationale) | `Blocked` on infeasible/no waiver; otherwise classified re-entry |
| 8 | Code review gate decision is `Pass` with all changed source files `<=500` effective non-empty lines, required `>220` delta-gate assessments recorded, and data-flow spine inventory/ownership/off-spine concern checks + existing-capability reuse + reusable-owned-structure extraction + shared-structure/data-model tightness + shared-base coherence + repeated-coordination ownership + empty-indirection + scope-appropriate separation of concerns + file placement within the correct subsystem and folder, with any optional module grouping justified + flat-vs-over-split layout judgment + interface/API/query/command/service-method boundary clarity + naming quality across files/folders/APIs/types/functions/parameters/variables + naming-to-responsibility alignment + no unjustified duplication of code/repeated structures in changed scope + patch-on-patch complexity control + dead/obsolete code cleanup completeness in changed scope + test quality + test maintainability + validation-evidence sufficiency + no-backward-compat/no-legacy checks satisfied | classified re-entry then rerun |
| 9 | `docs-sync.md` is current and docs are updated or no-impact rationale is recorded | classify and re-enter when docs cannot yet be made truthful (`Local Fix`: `6 -> 7 -> 8 -> 9`, `Requirement Gap`: `2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8 -> 9`, `Unclear`: `0 -> 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8 -> 9`); otherwise stay in `9` only for external docs blockers |
| 10 | `handoff-summary.md` is current, explicit user completion/verification is received, the ticket is moved to `tickets/done/<ticket-name>/`, and, when git repo, repository finalization is complete, any applicable release/publication/deployment step is complete or explicitly recorded as not required, and required post-finalization worktree/branch cleanup is complete when applicable | stay in `10` |

## Transition Matrix (Reference)

| Trigger | Required Transition Path | Gate Result |
| --- | --- | --- |
| Normal forward progression | `0 -> 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8 -> 9 -> 10` | Pass |
| Stage 5 blocker (`Design Impact`) | `3 -> 4 -> 5` | Fail |
| Stage 5 blocker (`Requirement Gap`) | `2 -> 3 -> 4 -> 5` | Fail |
| Stage 5 blocker (`Unclear`) | `1 -> 2 -> 3 -> 4 -> 5` | Fail |
| Stage 6 failure (`Local Fix`) | stay in `6` | Fail |
| Stage 6 failure (`Design Impact`) | `1 -> 3 -> 4 -> 5 -> 6` | Fail |
| Stage 6 failure (`Requirement Gap`) | `2 -> 3 -> 4 -> 5 -> 6` | Fail |
| Stage 6 failure (`Unclear`/cross-cutting root cause) | `0 -> 1 -> 2 -> 3 -> 4 -> 5 -> 6` | Fail |
| Stage 7 failure (`Local Fix`) | `6 -> 7` | Fail |
| Stage 7 failure (`Design Impact`) | `1 -> 3 -> 4 -> 5 -> 6 -> 7` | Fail |
| Stage 7 failure (`Requirement Gap`) | `2 -> 3 -> 4 -> 5 -> 6 -> 7` | Fail |
| Stage 7 failure (`Unclear`/cross-cutting root cause) | `0 -> 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7` | Fail |
| Stage 7 infeasible criteria without explicit user waiver | stay in `7` | Blocked |
| Stage 8 failure (`Local Fix`) | `6 -> 7 -> 8` | Fail |
| Stage 8 failure (`Validation Gap`) | `7 -> 8` | Fail |
| Stage 8 failure (`Design Impact`) | `1 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8` | Fail |
| Stage 8 failure (`Requirement Gap`) | `2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8` | Fail |
| Stage 8 failure (`Unclear`/cross-cutting root cause) | `0 -> 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8` | Fail |
| Stage 9 blocked docs-sync result (`Local Fix`) | `6 -> 7 -> 8 -> 9` | Fail |
| Stage 9 blocked docs-sync result (`Requirement Gap`) | `2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8 -> 9` | Fail |
| Stage 9 blocked docs-sync result (`Unclear`) | `0 -> 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8 -> 9` | Fail |
| Stage 9 blocked by external docs/access issue only | stay in `9` | Blocked |
| Stage 10 awaiting explicit user verification | stay in `10` | In Progress |
| Stage 10 archival/repository finalization/release-publication-deployment/cleanup blocked | stay in `10` | Blocked |

## Pre-Edit Checklist (Stage 6 Source-Code Edits)

- Current Stage is `6`: `Yes`
- Current Stage is `6`: `Yes`
- Code Edit Permission is `Unlocked`: `Yes`
- Stage 5 gate is `Go Confirmed`: `Yes`
- Required upstream artifacts are current: `Yes`
- Pre-Edit Checklist Result: `Pass`
- If `Fail`, source code edits are prohibited.

## Re-Entry Declaration

- Trigger Stage (`5`/`6`/`7`/`8`): `N/A`
- Classification (`Local Fix`/`Validation Gap`/`Design Impact`/`Requirement Gap`/`Unclear`): `N/A`
- Required Return Path: `N/A`
- Required Upstream Artifacts To Update Before Code Edits: `N/A`
- Resume Condition: `N/A`

## Transition Log (Append-Only)

| Transition ID | Date | From Stage | To Stage | Reason | Classification | Code Edit Permission After Transition | Evidence Updated |
| --- | --- | --- | --- | --- | --- | --- | --- |
| T-001 | 2026-03-31 | 0 | 1 | Bootstrap complete, moving to investigation | N/A | Locked | `tickets/in-progress/preview-session-multi-runtime-design/requirements.md`, `tickets/in-progress/preview-session-multi-runtime-design/workflow-state.md` |
| T-002 | 2026-03-31 | 1 | 2 | Investigation complete, moving to requirements refinement | N/A | Locked | `tickets/in-progress/preview-session-multi-runtime-design/investigation-notes.md`, `tickets/in-progress/preview-session-multi-runtime-design/workflow-state.md` |
| T-003 | 2026-03-31 | 2 | 3 | Requirements refined, moving to design basis | N/A | Locked | `tickets/in-progress/preview-session-multi-runtime-design/requirements.md`, `tickets/in-progress/preview-session-multi-runtime-design/workflow-state.md` |
| T-004 | 2026-03-31 | 3 | 4 | Proposed design complete, moving to future-state runtime call stack | N/A | Locked | `tickets/in-progress/preview-session-multi-runtime-design/proposed-design.md`, `tickets/in-progress/preview-session-multi-runtime-design/workflow-state.md` |
| T-005 | 2026-03-31 | 4 | 5 | Future-state runtime call stack complete, moving to review gate | N/A | Locked | `tickets/in-progress/preview-session-multi-runtime-design/future-state-runtime-call-stack.md`, `tickets/in-progress/preview-session-multi-runtime-design/workflow-state.md` |
| T-006 | 2026-03-31 | 5 | 3 | Stage 5 design-impact re-entry: prior design artifacts did not explicitly include required data-flow spine inventory and spine-first structure | Design Impact | Locked | `tickets/in-progress/preview-session-multi-runtime-design/workflow-state.md`, `tickets/in-progress/preview-session-multi-runtime-design/future-state-runtime-call-stack-review.md` |
| T-007 | 2026-03-31 | 3 | 4 | Stage 3 redesign complete after re-entry; regenerated spine-first proposed design and future-state call stack | Design Impact | Locked | `tickets/in-progress/preview-session-multi-runtime-design/proposed-design.md`, `tickets/in-progress/preview-session-multi-runtime-design/future-state-runtime-call-stack.md`, `tickets/in-progress/preview-session-multi-runtime-design/workflow-state.md` |
| T-008 | 2026-03-31 | 4 | 5 | Regenerated future-state runtime call stack complete; review rerun to Go Confirmed after Stage 5 design-impact re-entry | Design Impact | Locked | `tickets/in-progress/preview-session-multi-runtime-design/future-state-runtime-call-stack.md`, `tickets/in-progress/preview-session-multi-runtime-design/future-state-runtime-call-stack-review.md`, `tickets/in-progress/preview-session-multi-runtime-design/workflow-state.md` |
| T-009 | 2026-03-31 | 5 | 3 | Stage 5 design-impact re-entry: self-review found unnecessary v1 renderer projection scope and missing shared backend ownership for repeated preview coordination across runtime adapters | Design Impact | Locked | `tickets/in-progress/preview-session-multi-runtime-design/workflow-state.md`, `tickets/in-progress/preview-session-multi-runtime-design/future-state-runtime-call-stack-review.md` |
| T-010 | 2026-03-31 | 3 | 4 | Stage 3 redesign complete after re-entry; regenerated v3 design basis and future-state call stack around `PreviewToolService` and the narrowed v1 renderer strategy | Design Impact | Locked | `tickets/in-progress/preview-session-multi-runtime-design/proposed-design.md`, `tickets/in-progress/preview-session-multi-runtime-design/future-state-runtime-call-stack.md`, `tickets/in-progress/preview-session-multi-runtime-design/workflow-state.md` |
| T-011 | 2026-03-31 | 4 | 5 | Regenerated future-state runtime call stack complete; review rerun returned to Go Confirmed after the v3 design refinement | Design Impact | Locked | `tickets/in-progress/preview-session-multi-runtime-design/future-state-runtime-call-stack.md`, `tickets/in-progress/preview-session-multi-runtime-design/future-state-runtime-call-stack-review.md`, `tickets/in-progress/preview-session-multi-runtime-design/workflow-state.md` |
| T-012 | 2026-03-31 | 5 | 3 | Stage 5 design-impact re-entry: another deep review found missing concrete shared contract examples and adapter/service boundary drift in the v3 design basis | Design Impact | Locked | `tickets/in-progress/preview-session-multi-runtime-design/workflow-state.md`, `tickets/in-progress/preview-session-multi-runtime-design/future-state-runtime-call-stack-review.md` |
| T-013 | 2026-03-31 | 3 | 4 | Stage 3 redesign complete after re-entry; regenerated v4 design basis and future-state call stack around explicit canonical contract shapes and corrected adapter-to-service ownership | Design Impact | Locked | `tickets/in-progress/preview-session-multi-runtime-design/proposed-design.md`, `tickets/in-progress/preview-session-multi-runtime-design/future-state-runtime-call-stack.md`, `tickets/in-progress/preview-session-multi-runtime-design/workflow-state.md` |
| T-014 | 2026-03-31 | 4 | 5 | Regenerated future-state runtime call stack complete; review rerun returned to Go Confirmed after the v4 design refinement | Design Impact | Locked | `tickets/in-progress/preview-session-multi-runtime-design/future-state-runtime-call-stack.md`, `tickets/in-progress/preview-session-multi-runtime-design/future-state-runtime-call-stack-review.md`, `tickets/in-progress/preview-session-multi-runtime-design/workflow-state.md` |
| T-015 | 2026-03-31 | 5 | 3 | Stage 5 design-impact re-entry: another deep review found unsupported `wait_until=networkidle` contract semantics for Electron preview loading and ambiguous `preview_session_closed` vs `preview_session_not_found` semantics | Design Impact | Locked | `tickets/in-progress/preview-session-multi-runtime-design/workflow-state.md`, `tickets/in-progress/preview-session-multi-runtime-design/future-state-runtime-call-stack-review.md` |
| T-016 | 2026-03-31 | 3 | 4 | Stage 3 redesign complete after re-entry; regenerated v5 design basis and future-state call stack around Electron-grounded wait semantics and deterministic closed-vs-not-found contract rules | Design Impact | Locked | `tickets/in-progress/preview-session-multi-runtime-design/proposed-design.md`, `tickets/in-progress/preview-session-multi-runtime-design/future-state-runtime-call-stack.md`, `tickets/in-progress/preview-session-multi-runtime-design/workflow-state.md` |
| T-017 | 2026-03-31 | 4 | 5 | Regenerated future-state runtime call stack complete; review rerun returned to Go Confirmed after the v5 design refinement | Design Impact | Locked | `tickets/in-progress/preview-session-multi-runtime-design/future-state-runtime-call-stack.md`, `tickets/in-progress/preview-session-multi-runtime-design/future-state-runtime-call-stack-review.md`, `tickets/in-progress/preview-session-multi-runtime-design/workflow-state.md` |
| T-018 | 2026-03-31 | 5 | 3 | Stage 5 design-impact re-entry: file-placement review concluded that preview-specific contract and shared server-side coordination should live under `agent-tools/preview`, not `autobyteus-ts` or a new backend `desktop-shell` boundary | Design Impact | Locked | `tickets/in-progress/preview-session-multi-runtime-design/workflow-state.md`, `tickets/in-progress/preview-session-multi-runtime-design/future-state-runtime-call-stack-review.md` |
| T-019 | 2026-03-31 | 3 | 4 | Stage 3 redesign complete after re-entry; regenerated v6 design basis and future-state call stack around server-side `agent-tools/preview` ownership for preview-specific contract and coordination | Design Impact | Locked | `tickets/in-progress/preview-session-multi-runtime-design/proposed-design.md`, `tickets/in-progress/preview-session-multi-runtime-design/future-state-runtime-call-stack.md`, `tickets/in-progress/preview-session-multi-runtime-design/workflow-state.md` |
| T-020 | 2026-03-31 | 4 | 5 | Regenerated future-state runtime call stack complete; review rerun returned to Go Confirmed after the v6 file-placement refinement | Design Impact | Locked | `tickets/in-progress/preview-session-multi-runtime-design/future-state-runtime-call-stack.md`, `tickets/in-progress/preview-session-multi-runtime-design/future-state-runtime-call-stack-review.md`, `tickets/in-progress/preview-session-multi-runtime-design/workflow-state.md` |
| T-021 | 2026-03-31 | 5 | 6 | Stage 5 review Go Confirmed accepted for execution; Stage 6 implementation baseline created and source-code edit permission unlocked | N/A | Unlocked | `tickets/in-progress/preview-session-multi-runtime-design/implementation.md`, `tickets/in-progress/preview-session-multi-runtime-design/workflow-state.md` |
| T-022 | 2026-04-01 | 6 | 2 | Stage 6 requirement-gap re-entry: user changed the preview surface from dedicated preview windows to right-side tab-backed `WebContentsView` preview sessions, invalidating the existing implementation/design basis | Requirement Gap | Locked | `tickets/in-progress/preview-session-multi-runtime-design/workflow-state.md` |
| T-023 | 2026-04-01 | 2 | 3 | Requirements refined for a lazy right-side `Preview` shell tab with internal `WebContentsView`-backed preview session tabs; moving to design basis regeneration | Requirement Gap | Locked | `tickets/in-progress/preview-session-multi-runtime-design/requirements.md`, `tickets/in-progress/preview-session-multi-runtime-design/workflow-state.md` |
| T-024 | 2026-04-01 | 3 | 4 | Design basis regenerated for shell-embedded preview tabs backed by per-session `WebContentsView` instances; moving to future-state runtime call stack regeneration | Requirement Gap | Locked | `tickets/in-progress/preview-session-multi-runtime-design/proposed-design.md`, `tickets/in-progress/preview-session-multi-runtime-design/workflow-state.md` |
| T-025 | 2026-04-01 | 4 | 5 | Future-state runtime call stack regenerated for backend session creation plus renderer-driven shell projection into the right-side Preview host; moving to deep review | Requirement Gap | Locked | `tickets/in-progress/preview-session-multi-runtime-design/future-state-runtime-call-stack.md`, `tickets/in-progress/preview-session-multi-runtime-design/workflow-state.md` |
| T-026 | 2026-04-01 | 5 | 3 | Stage 5 design-impact re-entry: the v7 shell projection model left the renderer with a second source of preview-shell truth and used renderer identity instead of a main-process-owned shell host identity, so the design basis must be tightened before implementation can resume | Design Impact | Locked | `tickets/in-progress/preview-session-multi-runtime-design/future-state-runtime-call-stack-review.md`, `tickets/in-progress/preview-session-multi-runtime-design/workflow-state.md` |
| T-027 | 2026-04-01 | 3 | 4 | Stage 3 redesign complete after re-entry; regenerated the v8 design basis around controller-authoritative shell projection state and main-process-owned shell host identity | Design Impact | Locked | `tickets/in-progress/preview-session-multi-runtime-design/proposed-design.md`, `tickets/in-progress/preview-session-multi-runtime-design/workflow-state.md` |
| T-028 | 2026-04-01 | 4 | 5 | Regenerated the v8 future-state runtime call stack for snapshot-driven preview-shell projection and shell bootstrap/reconnect recovery; returning to deep review | Design Impact | Locked | `tickets/in-progress/preview-session-multi-runtime-design/future-state-runtime-call-stack.md`, `tickets/in-progress/preview-session-multi-runtime-design/workflow-state.md` |
| T-029 | 2026-04-01 | 5 | 6 | Stage 5 review Go Confirmed accepted for execution; Stage 6 restarts to rewrite the implementation baseline around the v8 shell-tab preview design before source-code edits resume | N/A | Locked | `tickets/in-progress/preview-session-multi-runtime-design/implementation.md`, `tickets/in-progress/preview-session-multi-runtime-design/workflow-state.md` |
| T-030 | 2026-04-01 | 6 | 7 | Stage 6 implementation completed for the shell-tab preview architecture. Targeted compile, Electron, renderer, server, and boundary validation passed, so the ticket advances to Stage 7 executable validation. | N/A | Unlocked | `tickets/in-progress/preview-session-multi-runtime-design/implementation.md`, `tickets/in-progress/preview-session-multi-runtime-design/api-e2e-testing.md`, `tickets/in-progress/preview-session-multi-runtime-design/workflow-state.md` |
| T-031 | 2026-04-01 | 7 | 6 | Stage 7 live runtime validation failed with two bounded runtime-event normalization issues in the preview path. Re-entering Stage 6 for a local fix before executable validation resumes. | Local Fix | Locked | `tickets/in-progress/preview-session-multi-runtime-design/api-e2e-testing.md`, `tickets/in-progress/preview-session-multi-runtime-design/workflow-state.md` |
| T-032 | 2026-04-01 | 6 | 7 | Local-fix re-entry is complete. Targeted validation and live Codex/Claude `open_preview` reruns passed, and Stage 7 resumes with a user-assisted desktop-shell validation blocker on the packaged app. | N/A | Unlocked | `tickets/in-progress/preview-session-multi-runtime-design/implementation.md`, `tickets/in-progress/preview-session-multi-runtime-design/api-e2e-testing.md`, `tickets/in-progress/preview-session-multi-runtime-design/workflow-state.md` |

## Audible Notification Log (Optional Tracking)

| Date | Trigger Type (`Transition`/`Gate`/`Re-entry`/`LockChange`) | Summary Spoken | Speak Tool Result (`Success`/`Failed`) | Fallback Text Logged |
| --- | --- | --- | --- | --- |
| 2026-03-31 | Transition | Workflow kickoff. Stage zero bootstrap started for the preview session multi runtime design ticket. | Success | N/A |
| 2026-03-31 | Transition | Stage zero bootstrap complete. Moving to stage one investigation for the preview session multi runtime design ticket. | Success | N/A |
| 2026-03-31 | Transition | Stage one investigation complete. Moving to stage two requirements refinement for the preview session multi runtime design ticket. | Success | N/A |
| 2026-03-31 | Transition | Stage two requirements refinement complete. Moving to stage three design basis for the preview session multi runtime design ticket. | Success | N/A |
| 2026-03-31 | Transition | Stage three design basis complete. Moving to stage four future state runtime call stack for the preview session multi runtime design ticket. | Success | N/A |
| 2026-03-31 | Transition | Stage four future state runtime call stack complete. Moving to stage five review for the preview session multi runtime design ticket. | Success | N/A |
| 2026-03-31 | Gate | Stage five review complete. Go confirmed for the preview session multi runtime design ticket. Design work is complete and implementation remains locked pending user review. | Success | N/A |
| 2026-03-31 | Re-entry | Stage five design impact detected. Returning to stage three design basis to add the required explicit data flow spine inventory and spine first structure. | Success | N/A |
| 2026-03-31 | Transition | Stage three redesign complete after re-entry. Moving to stage four future state runtime call stack for the preview session multi runtime design ticket. | Success | N/A |
| 2026-03-31 | Transition | Regenerated stage four future state runtime call stack complete. Moving to stage five review for the preview session multi runtime design ticket. | Success | N/A |
| 2026-03-31 | Gate | Stage five review rerun complete. Go confirmed restored for the preview session multi runtime design ticket after the spine first redesign. | Success | N/A |
| 2026-03-31 | Re-entry | Stage five design impact detected during principles based self review. Returning to stage three design basis to narrow v1 scope and introduce one shared backend preview coordination owner. | Success | N/A |
| 2026-03-31 | Transition | Stage three redesign complete after re-entry. Moving to stage four future state runtime call stack for the preview session multi runtime design ticket after the version three design refinement. | Success | N/A |
| 2026-03-31 | Transition | Regenerated stage four future state runtime call stack complete. Moving to stage five review for the preview session multi runtime design ticket after the version three design refinement. | Success | N/A |
| 2026-03-31 | Gate | Stage five review rerun complete. Go confirmed restored for the preview session multi runtime design ticket after the version three design refinement. | Success | N/A |
| 2026-03-31 | Re-entry | Stage five design impact detected during another deep review. Returning to stage three design basis to add explicit canonical contract shapes and tighten the adapter to service boundary. | Success | N/A |
| 2026-03-31 | Transition | Stage three redesign complete after re-entry. Moving to stage four future state runtime call stack for the preview session multi runtime design ticket after the version four design refinement. | Success | N/A |
| 2026-03-31 | Transition | Regenerated stage four future state runtime call stack complete. Moving to stage five review for the preview session multi runtime design ticket after the version four design refinement. | Success | N/A |
| 2026-03-31 | Gate | Stage five review rerun complete. Go confirmed restored for the preview session multi runtime design ticket after the version four design refinement. | Success | N/A |
| 2026-03-31 | Re-entry | Stage five design impact detected during another deep review. Returning to stage three design basis to narrow unsupported wait semantics and define closed versus not found session errors explicitly. | Success | N/A |
| 2026-03-31 | Transition | Stage three redesign complete after re-entry. Moving to stage four future state runtime call stack for the preview session multi runtime design ticket after the version five design refinement. | Success | N/A |
| 2026-03-31 | Transition | Regenerated stage four future state runtime call stack complete. Moving to stage five review for the preview session multi runtime design ticket after the version five design refinement. | Success | N/A |
| 2026-03-31 | Gate | Stage five review rerun complete. Go confirmed restored for the preview session multi runtime design ticket after the version five design refinement. | Success | N/A |
| 2026-03-31 | Re-entry | Stage five design impact detected during file placement review. Returning to stage three design basis to move preview specific contract and shared server side coordination into agent tools preview ownership. | Success | N/A |
| 2026-03-31 | Transition | Stage three redesign complete after re-entry. Moving to stage four future state runtime call stack for the preview session multi runtime design ticket after the version six file placement refinement. | Success | N/A |
| 2026-03-31 | Transition | Regenerated stage four future state runtime call stack complete. Moving to stage five review for the preview session multi runtime design ticket after the version six file placement refinement. | Success | N/A |
| 2026-03-31 | Gate | Stage five review rerun complete. Go confirmed restored for the preview session multi runtime design ticket after the version six file placement refinement. | Success | N/A |
| 2026-03-31 | LockChange | Stage six implementation started for the preview session multi runtime design ticket. The implementation baseline is created, code edit permission is now unlocked, and source implementation can begin against the version six design. | Success | N/A |
| 2026-04-01 | Re-entry | Stage six requirement gap detected. Returning to stage two requirements refinement because the preview surface changed from dedicated windows to right-side tab-backed `WebContentsView` sessions. Code edit permission is now locked again. | Success | N/A |
| 2026-04-01 | Transition | Stage two requirements refinement complete. Moving to stage three design basis to replace dedicated preview windows with a lazy right-side `Preview` shell tab backed by internal `WebContentsView` preview sessions. | Success | N/A |
| 2026-04-01 | Transition | Stage three design basis complete. Moving to stage four future state runtime call stack for the shell-embedded preview-tab architecture. | Success | N/A |
| 2026-04-01 | Transition | Stage four future state runtime call stack complete. Moving to stage five deep review for the shell-embedded preview-tab architecture. | Success | N/A |
| 2026-04-01 | Re-entry | Stage five design impact detected. Returning to stage three design basis because the shell projection model still let the renderer act as a second source of preview-shell truth and used renderer identity instead of a main-process-owned shell host identity. | Success | N/A |
| 2026-04-01 | Transition | Stage three redesign complete after re-entry. Moving to stage four future state runtime call stack for the v8 shell-tab preview architecture. | Success | N/A |
| 2026-04-01 | Transition | Stage four future state runtime call stack complete. Moving to stage five deep review for the v8 shell-tab preview architecture. | Success | N/A |
| 2026-04-01 | Gate | Stage five review rerun complete. Go confirmed restored for the preview session multi runtime design ticket after the v8 shell-authority refinement. | Success | N/A |
| 2026-04-01 | Transition | Stage five review go confirmed accepted. Moving to stage six to rewrite the implementation baseline around the v8 shell-tab preview design. Code edits remain locked until the new baseline is saved. | Success | N/A |
| 2026-04-01 | LockChange | Stage six implementation baseline rewritten for the v8 shell-tab preview design. Code edit permission is now unlocked and source implementation can begin. | Success | N/A |
| 2026-04-01 | Transition | Stage six implementation is complete for the preview session multi runtime design ticket. Moving to stage seven executable validation for the shell tab preview behavior. | Success | N/A |
| 2026-04-01 | Re-entry | Stage seven executable validation found a local fix in the preview runtime path. Returning to stage six with source edits locked while the re-entry artifacts are updated. | Success | N/A |
| 2026-04-01 | LockChange | Stage six local fix re-entry is prepared and source edits are unlocked again. Fixing the preview runtime event normalization now. | Success | N/A |
| 2026-04-01 | Transition | Stage seven is resumed for the preview session multi runtime design ticket. The local fix passed targeted validation and live Codex and Claude open preview reruns, and the current blocker is user assisted testing of the right side Preview tab in the packaged mac app. | Success | N/A |

## Process Violation Log

| Date | Violation ID | Violation | Detected At Stage | Action Taken | Cleared |
| --- | --- | --- | --- | --- | --- |
