# Investigation Notes

## Investigation Meta

- Package identifier: `agent-run-input-state-cleanup` (Project Task autobyteus-140)
- Request: AgentRun input-state cleanup (CC-001..CC-003, no behaviour change) plus the stale `ScriptedAgentRunBackend` test double and doubles with the same drift
- Workspace root / worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-run-input-state-cleanup`, branch `codex/agent-run-input-state-cleanup`
- Repository mode: `Git`
- Base: `origin/personal` @ `2763e7c6787b3c091e8f8e4288bb6672a61a1739` (fetched 2026-10-18; includes PB-001 and autobyteus-139)
- Finalization target: `origin/personal`; no release needed
- Bootstrap result: install and prebuild exit 0
- Current solution revision ID: `SR-001`
- Authorities read (2026-10-18, this conversation): `references/requirements-engineering.md`, `references/architecture-design.md`, `references/design-principles.md`, `references/handoff-references.md` (updated), `DESIGN.md`, `TESTING.md`
- Investigation status: Complete

## Initial Request And Clarifications

- Task autobyteus-140 from `/project_task_manager`: follow-up of PB-001 (DEC-005). Constraints: no behaviour change; keep PB-001's publish-once rule and tests green. The type-checking of tests is a separate Task (autobyteus-65).

## Source Log

| Date | Source Type | Exact Source / Command | Why | Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-10-18 | Code | `src/agent-execution/domain/agent-run.ts` L69-72, L160-170, L194-207, L291, L304, L360, L383, L414-445 | Current state | See facts below | — |
| 2026-10-18 | Code | `src/agent-execution/domain/agent-run-termination.ts` L32-33, L93-96, L143-148 | Termination use | Receives `reconcileRecovery` and `publishInputState` as separate callbacks; L145-148 is reconcile → state change → publish (not consecutive); L96 publishes without reconciling | Leave termination as is |
| 2026-10-18 | Code | `src/agent-execution/input/agent-run-compaction-recovery.ts` L22-31 | Side effects | `reconcile()` mutates (`observed`, `admissionCut`, `claim`) when the block changed | `inputStateEvent()` calls it, so it is a second hidden side effect; call order must be kept |
| 2026-10-18 | Code | `src/agent-execution/input/agent-run-input-contract.ts` L3-5; `backends/agent-run-backend.ts` | Contract | `AgentRunBackendInputCapabilities = { activeTurnAppend: "supported" \| "unsupported" }`; `AgentRunBackend` also requires `compactionRecovery`, `hasRunningBackgroundTasks`, `dispatchUserInput` | — |
| 2026-10-18 | Command | `grep -rn inputCapabilities tests` and a per-file audit of files with `getLifecycleSnapshot` | Drift inventory | `{ kind: "start_only" }` in 4 files; 2 doubles feeding a real `AgentRun` have no `inputCapabilities` | In scope |
| 2026-10-18 | Command | Temporary scratch `tsc` over the 30 test files that contain backend doubles (config removed afterwards) | Wider drift | 49 backend-contract errors in 14 files: missing `hasRunningBackgroundTasks`/`dispatchUserInput`, factory doubles missing `beginPreparation`, an LM Studio test using removed APIs (`postUserMessage`, `llmFactory`) | Outside this Task → autobyteus-65 (evidence file) |

## Relevant Codebase And Technical Facts

- CC-001: `inputStateEvent()` builds the DTO and, as side effects, calls `compactionRecovery.reconcile()` and advances `inputRevision`/`lastInputSignature` when the signature changed. Callers:
  - `publishInputState()` (L432);
  - `subscribeToEvents` (L166);
  - `getInputStateSnapshot()` (L421, the pull read used by root/Team/Org views).
  The revision must advance on observation (a pull read returning new content with an old revision would be inconsistent; PB-001 AC-004b relies on this), so the fix is to make the mutation explicit, not to remove it.
- CC-002: consecutive `this.reconcileRecovery(); this.publishInputState();` appears at L94 (`compactionRecovery.changed`), L291 (`onCanonicalEventsDispatched`) and L383 (dispatch result). Publish-only sites L207 (admission; reconciled earlier in the same task), L360 (uncertain dispatch) and termination L96 must **not** gain a reconcile: that would change behaviour, because `reconcileRecovery` reconciles lifecycle and recovery state.
- CC-003: the `captureMessages` comment in `tests/integration/agent/agent-status-websocket.integration.test.ts` L148-151 says `AGENT_INPUT_STATE` is "not part of this status/content contract". Production treats a changed input state as a cadence boundary (protocol doc; PB-001 cases "sends no repeated input state…").

## Test-Double Drift Inventory (same drift: `inputCapabilities`)

| File | Double | Drift | Effect today |
| --- | --- | --- | --- |
| `tests/integration/agent/agent-status-websocket.integration.test.ts` L53 | `ScriptedAgentRunBackend` (declares `implements AgentRunBackend`) | `{ kind: "start_only" }`; also lacks `hasRunningBackgroundTasks`, `dispatchUserInput` | `AgentRun` reads `activeTurnAppend` as undefined, which behaves as `unsupported` |
| `tests/unit/agent-execution/agent-run-manager.test.ts` L46 | backend factory double | `{ kind: "start_only" }` | same |
| `tests/unit/agent-execution/standalone-agent-run-lifecycle-service.test.ts` L745 | backend double | `{ kind: "start_only" }` | same |
| `tests/integration/agent-execution/agent-run-manager.integration.test.ts` L48 | backend double | `{ kind: "start_only" }` | same |
| `tests/unit/services/agent-streaming/agent-stream-handler.test.ts` L364 | object passed to `new AgentRun` | no `inputCapabilities` | `capabilities` undefined, behaves as unsupported |
| `tests/integration/agent-team-execution/team-agent-tools-mcp-lifecycle.integration.test.ts` L60-80 | `: AgentRunBackend` factory output | no `inputCapabilities` | same |

Replacing each with `{ activeTurnAppend: "unsupported" }` keeps every test's behaviour.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related IDs | Status | Approval |
| --- | --- | --- | --- | --- | --- | --- |
| `evidence/test-double-drift-typecheck-probe.txt` | Solution Designer | Wider drift list for autobyteus-65 | 49 errors, 14 files | FU-001 | Final | Evidence only |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Resolution | Status |
| --- | --- | --- | --- | --- |
| RSK-001 | Risk | A refactor that reorders `compactionRecovery.reconcile()` relative to the signature check | Keep the order: read content (reconcile) → advance revision → build | Design |
| RSK-002 | Risk | Adding a reconcile to publish-only sites | Forbidden by design | Design |

## Requirement Implications

Pure refactor plus test hygiene; no behaviour change. Wider test-double drift goes to autobyteus-65.
