# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-001`
- Approved requirements baseline: `requirements-doc.md` @ SR-001, approved by Solution Designer within the Task's direction (user informed). Reference: `solution-revision-record.md` SR-001.
- Behavior-defining supplements: `probe-evidence/sdk-0.3.280-not-logged-in.frames.jsonl`, `probe-evidence/sdk-0.3.280-normal-reply-mentioning-login.frames.jsonl` (approved with SR-001)
- Design status: `Ready`
- Canonical investigation-notes path: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-normal-reply-auth-error-misclassification/tickets/in-progress/claude-normal-reply-auth-error-misclassification/investigation-notes.md`
- Authorities read (2026-10-12): `references/architecture-design.md`, `references/design-principles.md`, repo-root `DESIGN.md`, `TESTING.md` (validation planning). `design-examples.md` not needed.
- Project design-principle conflicts or discrepancies: None.

## Current-State Read

Claude result frames take one path: `ClaudeSession` → `ClaudeTurnTracker.observe` → `observeResult` → `resolveResultFailure` → `resolveClaudeTurnTerminalError` (in `claude-session-output-events.ts`). A non-null failure makes the tracker settle the canonical turn as `error`. `ClaudeSession.handleTurnSettled` then sets status `ERROR` and emits the terminal ERROR event, and it skips the message-cache append, `hasCompletedTurn` and `TURN_COMPLETED`. `turnResult(..., isErrorResult=true)` also skips projecting the result frame. The owner and boundary are correct. The defect is one condition in the classifier: `isErrorResult` includes `isAuthenticationFailure`, which comes from a text search over `payload.result`. On a success frame, that field is the agent's own reply (investigation S-01..S-07, R-01..R-04).

## Task Size And Architectural Risk (Mandatory)

- Task size: `Small`
- Size rationale: one condition in one production function (`resolveClaudeTurnTerminalError`), plus focused unit tests in two existing test files. No new files in `src`.
- Architectural risk: `Low`
- Risk rationale: no contract, persistence, security, concurrency, deployment or ownership change. The classifier's output shape and codes stay the same. Only a false-positive input class stops returning an error. Real failures are still detected via `is_error` (verified on the real SDK frame, R-02).
- Escalation trigger: if any existing Claude test relies on a marker-only, non-`is_error` result being an error (other than as a case this fix intentionally changes), or a real SDK auth failure is observed without `is_error:true`, return a Design Impact.

## Architecture Investigation Evidence

| Source / Probe | Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Classifier code | investigation S-01 | Markers make an error by themselves | Remove marker from the error predicate | None |
| Sole caller | S-02, S-03 | All downstream effects come from the classifier | No change in tracker/session | None |
| Real auth failure | R-02 | `is_error:true` + marker text | Auth code still assigned via `is_error` | Future SDK drift (RK-01) |
| Real normal reply | R-03 | `is_error:false`, markers in `result` | Must return null | None |
| SDK types | S-07 | `is_error` required on result variants | Structural signal is reliable | None |

## Intended Change

In `resolveClaudeTurnTerminalError`, decide whether a result is an error **only** from SDK fields: `is_error === true`, or an explicit `error`/`code` field. Apply the auth-marker search only after that, to choose `CLAUDE_RUNTIME_AUTHENTICATION_FAILED` over `CLAUDE_RUNTIME_RESULT_ERROR`.

```ts
const isErrorResult = payload.is_error === true || Boolean(errorCode);
if (!isErrorResult) return null;
const isAuthenticationFailure = AUTHENTICATION_FAILURE_MARKERS.some((m) => searchable.includes(m));
```

Bad shape avoided: `isErrorResult = is_error || errorCode || markerFoundInReplyText`.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Requirement / AC | Trigger / Contract | Existing Behavior | Change / Preserved | Target Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | REQ-001, AC-001, AC-004 | Success result with marker text | Error settlement (S-03) | Normal completion | DS-001: classifier returns null → tracker settles `completed` → session IDLE + cache + TURN_COMPLETED |
| BEH-002 | Contract | REQ-002, AC-002 | Real not-logged-in result | `CLAUDE_RUNTIME_AUTHENTICATION_FAILED` | Preserved | DS-001: classifier returns auth failure → error settlement |
| BEH-003 | Contract | REQ-003, AC-003 | Other error results | `CLAUDE_RUNTIME_RESULT_ERROR` | Preserved | DS-001, unchanged |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related IDs | Relationship To This Design | Status |
| --- | --- | --- | --- | --- |
| `probe-evidence/sdk-0.3.280-not-logged-in.frames.jsonl` | Real failure frames | AC-002 | Fixture shape for the session-level failure test | Approved SR-001 |
| `probe-evidence/sdk-0.3.280-normal-reply-mentioning-login.frames.jsonl` | Real success frames | AC-001 | Fixture shape for the session-level success test | Approved SR-001 |

## Task Design Health Assessment (Mandatory)

- Change posture: `Bug Fix`
- Current design issue found: `No` (no structural issue; local defect)
- Structural triggers considered: *Duplicated policy*. Ruled out, because only one classifier exists (grep: markers appear only in this file, not in the web or `autobyteus-ts`). *Boundary bypass*. Ruled out, because there's a single caller in the tracker. *Legacy/compatibility*. Ruled out, because no dual path is introduced.
- Root cause classification: `Local Implementation Defect`
- Refactor needed now: `No`
- Evidence: S-01, S-02, R-02, R-03
- Design response: change the error predicate in the existing owner.
- Refactor rationale: the owner, boundary and API shape are healthy.
- Intentional deferrals and residual risk: RK-01 (future SDK drift), accepted.

## Terminology

- *Marker*: one of `authentication_failed`, `not logged in`, `please run /login` (case-insensitive substring).

## Legacy Removal Policy (Mandatory)

- Obsolete legacy paths and files in this scope: None
- Compatibility wrappers, dual paths, or legacy fallbacks kept: `None`

## Persisted Data / State Transition Decision

- Decision: `Not Affected`. No stored shape changes. Past misclassified runs stay as stored. Their replies are already in memory traces (R-01).

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001..003 | SDK result frame from the Claude CLI | Run status + UI message/error card | `ClaudeTurnTracker` (turn settlement) | The classification decides turn outcome, status and what the user sees |

## Primary Execution Spine(s)

`Claude CLI result frame -> ClaudeSession.observe -> ClaudeTurnTracker.observeResult -> resolveClaudeTurnTerminalError (classifier) -> ClaudeSession.handleTurnSettled -> ERROR / TURN_COMPLETED event -> frontend status + segments`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The tracker asks the classifier whether a result frame is a failure. A failure settles the turn as error, and the session publishes ERROR and sets status ERROR. Otherwise the turn completes normally. | result frame, canonical turn, settlement | `ClaudeTurnTracker` | message redaction (`redactProviderSecrets`) |

## Spine Actors / Main-Line Nodes

`ClaudeSession`, `ClaudeTurnTracker`, `resolveClaudeTurnTerminalError`.

## Ownership Map

- `resolveClaudeTurnTerminalError` owns the result-frame failure classification (is-error decision, code, message). It is the only node that changes.
- `ClaudeTurnTracker` owns turn settlement. Unchanged.
- `ClaudeSession` owns status/event publication and the message cache. Unchanged.

## Thin Entry Facades / Public Wrappers

N/A — none involved.

## Removal / Decommission Plan (Mandatory)

| Item | Why Unnecessary | Replaced By | Scope | Notes |
| --- | --- | --- | --- | --- |
| `isAuthenticationFailure` as a term of `isErrorResult` | Text in a success reply is not an SDK error signal | `is_error`/error-code predicate | In This Change | No dead code found in the touched file |

## Return Or Event Spine(s)

Same as DS-001's tail: `handleTurnSettled -> ERROR (CLAUDE_RUNTIME_TURN_FAILED, error_effect terminal) | TURN_COMPLETED -> streaming -> frontend`. Unchanged.

## Bounded Local / Internal Spines

N/A. The tracker's settlement state machine is unchanged.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Spine | Serves | Responsibility | Why It Exists | Risk If Misplaced |
| --- | --- | --- | --- | --- | --- |
| `redactProviderSecrets` | DS-001 | classifier | Redact the terminal message | 29c1fa66b security | N/A, unchanged |

## Ownership Boundaries

The classifier remains the single authority for "is this result a failure". Callers must not re-derive it.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Mechanism | Callers | Forbidden Bypass | Fix If Thin |
| --- | --- | --- | --- | --- |
| `resolveClaudeTurnTerminalError` | marker list, text selection | `claude-turn-tracker.ts` | Adding a second text check elsewhere (e.g. frontend) | Extend the classifier |

## Dependency Rules

Unchanged: tracker → output-events classifier. No new dependencies.

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity Shape | Notes |
| --- | --- | --- | --- | --- |
| `resolveClaudeTurnTerminalError(chunk): {code,message} \| null` | Claude result frame | Failure classification | raw frame | Signature unchanged |

## Interface Boundary Check

| Interface | Singular? | Identity Explicit? | Ambiguous Selector Risk | Action |
| --- | --- | --- | --- | --- |
| `resolveClaudeTurnTerminalError` | Yes | Yes | Low | None |

## Main Domain Subject Naming Check

| Node | Name | Natural? | Drift Risk | Action |
| --- | --- | --- | --- | --- |
| classifier | `resolveClaudeTurnTerminalError` | Yes | Low | None |

## Existing Capability / Subsystem Reuse Check

| Need | Existing Area | Decision | Why |
| --- | --- | --- | --- |
| Failure classification | `claude-session-output-events.ts` | Reuse | Existing owner |

## Subsystem / Capability-Area Allocation

| Subsystem | Concerns | Spine | Owner Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-execution/backends/claude/session` | result classification | DS-001 | tracker | Reuse | — |

## Draft File Responsibility Mapping / Final File Responsibility Mapping

| File | Subsystem | Owner | Concern | Change |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-output-events.ts` | Claude session | classifier | error predicate | Modify |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/session/claude-session-output-events.test.ts` | tests | — | classifier cases: real success frame with markers → `null`; real failure frame → auth failure | Modify |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/session/claude-session.test.ts` | tests | — | session-level: real success frame with markers → TURN_COMPLETED, IDLE, cached reply, no ERROR; real failure frames (assistant `error:"authentication_failed"` + result) → ERROR auth, status ERROR | Modify |

## Reusable Owned Structures Check / Shared Structure Tightness Check

N/A — no shared structures change. Test fixtures may be inline objects copied from the probe frames (keep the material fields: `type`, `subtype`, `is_error`, `terminal_reason`, `result`, `stop_reason`, `session_id`, `user_message_uuids`. On the failure assistant frame also keep `error`, `is_api_error_message`, `message.model:"<synthetic>"`).

## Applied Patterns

None.

## Target Subsystem / Folder / File Mapping

See the file table above. No folders added.

## Folder Boundary Check

N/A — no placement change.

## Concrete Examples / Shape Guidance

| Topic | Good | Bad / Avoided | Why |
| --- | --- | --- | --- |
| Error predicate | `is_error === true \|\| errorCode` decides; markers only refine the code | markers alone decide | User text must never decide a failure |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why Considered | Decision | Replacement |
| --- | --- | --- | --- |
| Keep the marker-only path for results without `is_error` | "Safety" for older SDKs | Rejected | SDK 0.3.280 pinned; `is_error` required; subtype fallback in tracker covers error subtypes |

## Change / Refactor Sequence

1. Add the failing regression tests (classifier + session level) using the real frame shapes.
2. Change the predicate.
3. Run `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution/backends/claude --no-watch` and `pnpm -C autobyteus-server-ts typecheck`.

## Key Tradeoffs

Keeping the marker search (only on real errors) keeps the more specific auth code for genuine failures. It's preferred over switching to the assistant frame's `error` field, which would need cross-frame state.

## Risks

RK-01 (future SDK reports auth failure without `is_error`). Mitigation: the tracker's non-success-subtype fallback still reports a generic error, and the escalation trigger above applies.

## Guidance For Implementation

- Keep message precedence, `errors[]` fallback and redaction exactly as in 29c1fa66b.
- Do not touch the tracker, session or frontend.
- The release must include this server change. The user verifies AC-004 in the released app by asking a Claude agent to reply with a sentence containing "not logged in · please run /login" and confirming there's no red card and no red run dot.
