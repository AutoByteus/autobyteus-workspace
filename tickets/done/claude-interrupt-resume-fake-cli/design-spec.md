# Design Spec

## Solution And Approval Basis
- Package: `claude-interrupt-resume-fake-cli`; current solution revision SR-002.
- Design status: Ready — Architecture Design Complete.
- Approved requirements: requirements-doc.md SR-001, Solution Designer within Task direction; approval reference is conversation “The separate lifecycle check passed all 12 tests…” (2026-10-13). Intent unchanged in SR-002.
- Behavior-defining supplements: N/A — none; Product/independent review artifacts: N/A — not applicable to this initial package.
- Canonical investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-interrupt-resume-fake-cli/tickets/in-progress/claude-interrupt-resume-fake-cli/investigation-notes.md`.
- Authorities read (2026-10-13): bundled solution-designer SKILL.md, references/architecture-design.md, references/design-principles.md, design-spec-template.md; task-worktree DESIGN.md, AGENTS.md, server AGENTS.md, TESTING.md; `autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md`. No closer DESIGN.md. No conflict/discrepancy; design-examples N/A — no additional guidance needed.

## Current-State Read
The suite uses real HTTP/WebSocket admission, AgentRun and Claude production lifecycle with a cached fake SDK module. Its Query shape predates retained opening. It lacks public initializationResult, so registration marks malformedQuery and refuses cleanup settlement proof. The fake also represents “same process” only as an in-memory instance. Current-base repro is 8 fail/1 skip; actual pinned-SDK real-child opening/cleanup and owner regressions are green (12 tests). See investigation E-01..07 and A-01..07; do not mistake no-spawn receipt coverage gap for the immediate missing-method rejection.

## Intended Change
Repair **only the target E2E fake and its owned harness**. Preserve all eight original behavioral cases, frame scripts, names and live gate. Implement a contract-complete local FakeClaudeCliQuery that offers cached public initialization settlement and acquires one lightweight real test child through the callback the real ClaudeSdkClient provides. Production opening, owner and cleanup remain authoritative and unchanged. Do not invent a production test seam, replace beginStreamingSession, loosen malformed-query handling, or fake release results.

## Relevant Behavior And Production-Path Map (Mandatory)
| Behavior | Approved intent / AC | Trigger and evidence | Target path / preserved outcome |
| --- | --- | --- | --- |
| BEH-001 Operational | REQ-001,005,006 / AC-001,006 | Developer runs ungated isolated suite; E-02 | DS-001 plus DS-004; repaired fake participates in existing opening; Delivery merges after verification |
| BEH-002 User/System | REQ-002 / AC-002 | Interrupt/follow-up, busy send, supported settlement race, provider report; A-01..03 | DS-001/002/003 remain real; one query/child alive through interrupt/follow-up, one delivery for requeue, correct report/settlement |
| BEH-003 Contract | REQ-003 / AC-003 | SDK error frames then next user message; E-06/A-03 | DS-002 and DS-001 unchanged; exact original terminal/error/redaction/tool-work assertions |
| BEH-004 Contract | REQ-004,005 / AC-004,005 | Public Query initialization and exact resource release; E-03..05/A-04 | DS-003/004; valid fake initialization promise and controlled real child; production contract unchanged |
SCN-001..007 remain approved, with normal/explicit-edge validity recorded in requirements. No new product premise or scope is introduced.

## Architecture Investigation Evidence / Relevant Supplemental Task Artifacts
Investigation E-02 → preserve failing baseline; E-03/E-04 → missing-method repair; E-05 → retain production owners; A-01..04 → unchanged full path; A-05/A-06 → existing fixture/types and local placement; A-07 → downstream real-child retry regression. Canonical supplement inventory is investigation-notes.md. Evidence logs are contextual/non-normative; incoming report/historical tickets read-only. No independent review report exists yet and none is implied by investigation.

## Task Design Health Assessment (Mandatory)
- Change posture: Bug Fix (test fixture) / Cleanup (test-owned teardown).
- Current design issue: Yes, bounded fake contract drift; no production structural issue found in this path.
- Root cause: Local Implementation Defect — fake exposes obsolete Query shape; missing contract member triggers deliberate safety gate.
- Refactor needed now: No broad refactor. Existing cached SDK-module injection is the correct public seam. Keep local fake ownership coherent; strengthen its contract and harness teardown locally.
- Structural triggers: legacy compatibility pressure is rejected (no old/new fake fallback). Authoritative-boundary concern is avoided: invoke provided spawn hook rather than instantiate a separate process owner or bypass opening. Reuse trigger selects existing child fixture. No cross-file policy duplication, ambiguous ID or file-placement overload demonstrated.
- Evidence: E-03..05/A-01..06. Frame scenario scripts remain local; no generalized fake-SDK framework.
- Deferrals: global typecheck/CI and other stale suites are separate Tasks; paid inference/other OS teardown are not certified. Newly surfaced product behavior failures return to Solution Designer before fix.

## Terminology
A “child” here is an actual test-owned Node subprocess, not paid Claude inference. The fake SDK frames still originate in-process. Public initializationResult is a cached initialization observation; it must not read another frame iterator or wait for first user input.

## Legacy Removal Policy / Removal-Decommission Plan (Mandatory)
Replace the malformed fake shape in place; no compatibility fallback to missing initialization or no-spawn query. Replace sequential-only harness cleanup with all-stage cleanup that retains errors. Do not remove any of the eight cases, live case, result text checks or race stimulus. A-06 found no proven dead code in this touched surface; all fake methods/callbacks are used. No production removals, rename or move. Global dead-code cleanup: N/A — none discovered in scope.

## Persisted Data / State Transition Decision
**Not Affected** — no runtime serialization, production readers/writers, schema or state semantics change. Only disposable private test HOME/workspaces/local test DB; cleanup must never touch user data. Migration plan/convention investigation: N/A — no persisted transition is proposed.

## Data-Flow Spine Inventory / Primary Execution Spines
| Spine | Scope / owner | Start → meaningful outcome | Behaviors / why |
| --- | --- | --- | --- |
| DS-001 | Primary End-to-End; AgentRun admission + ClaudeSession | Test websocket SEND_MESSAGE → real route/AgentStreamHandler → command coordinator → AgentRun FIFO → Claude backend/session → SessionProcess → ClaudeSdkClient retained opening → fake Query/control.spawn → channel delivery | BEH-001..003; prevents helper-only “green” proof |
| DS-002 | Return-Event; ClaudeSession tracker then AgentRun canonical pipeline | SDK-shaped frame or task event → session identity/tracker/projectors → backend converter → AgentRun serialized canonical lifecycle → stream mapper/egress → WebSocket assertion | BEH-002,003; preserves actual turn/tool/error behavior |
| DS-003 | Bounded Local; AgentRun and session tracker | Input claim → append/start dispatch → current-turn match or positive undelivered rejection → same FIFO entry as new turn → one terminal accounting | BEH-002; existing AC-016 race remains executable, not rewritten |
| DS-004 | Primary resource-release; ClaudeSessionManager/cleanup | Test finally → manager closeRunSession → session exact process opening release + pump join / other component releases → concrete child EOF/exit/IO proof → exact session removed → sockets/app/workspace closed | BEH-001,004; closing fake alone cannot certify child release |

## Spine Narratives (Mandatory)
DS-001 uses real public transport and domain admission until the established external SDK module seam. Fake Query acquires a real lightweight child through the *supplied* controlled-spawn hook and scripts only provider behavior; the production input channel and process opening remain active. DS-002 runs original frames through tracker and canonical egress, so preserved assertions judge real outcomes. DS-003 retains the explicit race injection at session.submitInput to reproduce the approved late-append contract; no additional concurrency owner is introduced. DS-004 closes input/query synchronously, waits for production exact child/IO and pump proof, then releases independently owned HTTP/socket/workspace resources even if one cleanup stage fails, surfacing failures rather than suppressing them.

## Ownership Map / Thin Entry Facades / Off-Spine Concerns
- Websocket route is a thin transport boundary; AgentStreamHandler owns connection/mapping, not provider/turn lifecycle. Command coordinator owns command identity/ACK and resolves the run; AgentRun owns FIFO and canonical events.
- ClaudeSessionManager owns exact session registry and cleanup admission; ClaudeSession owns per-session turn/tool orchestration. SessionProcess owns lazy retained generations and frame pump. ClaudeSdkClient owns SDK options/module boundary; opening/process owner own acquisition fences and exact physical release.
- FakeClaudeCliQuery owns local script queue/input pump, public fake controls and its child **facade/reference observations**, not production release certification. The suite's harness owns Fastify/socket and temporary workspaces; injected materializer/MCP doubles remain unchanged.
- Off-spine: existing Node fixture serves child lifetime; SDK public types prevent untyped shape drift; wait/assert helpers serve tests. None becomes a new runtime layer.

## Ownership Boundaries / Boundary Encapsulation / Dependency Rules
Use real manager.closeRunSession for cleanup, real client.beginStreamingSession for opening and only call.options.spawnClaudeCodeProcess for child acquisition. Fake must not create another ClaudeSdkProcessOwner, replace release/ensureOpen, mock child_process.spawn globally, or reach private receipt/generation fields. Query close ends fake iterator and child stdin; production owner retains termination deadlines and proof. Public initializationResult supplies a settled cached Promise, independent from the iterator; simulated initialization is documented as such. No production dependencies on tests. Keep stable runId/provider UUID and per-input uuid roles distinct.

## Interface Boundary Mapping / Check
| Interface | Singular subject / explicit identity | Decision |
| --- | --- | --- |
| Fake Query conforms to ClaudeSdkQueryLike | One query, session UUID; original interrupt options/result | Add implements/imported public type and cached initializationResult; no loose partial casts masking missing members |
| provided spawnClaudeCodeProcess(SpawnOptions) | One owned child; real command/args/cwd/env/AbortSignal | Require function in fake query call, acquire exactly once; retain public facade and IO references for tests |
| manager.closeRunSession(runId) | One exact run session | Unchanged cleanup authority; assert hasRunSession false after success |
All responsibility/identity checks Yes; ambiguity risk Low. Existing domain names natural; FakeClaudeCliQuery comment must accurately state which behavior is scripted and which resource is real.

## Existing Capability / Subsystem Reuse / Reusable Owned Structures
Reuse runtime opening/cleanup owners unchanged and existing `tests/fixtures/claude-owned-sdk-cli.mjs` **without modifications** as test child. Extend only local fake/harness. Reuse ClaudeSdkQueryLike and SDK SpawnOptions/SpawnedProcess rather than duplicate contract. Do not add universal optional-field fake types or new shared helper subsystem. One repeated fake class within one test: extraction N/A. Frame payloads remain existing per-scenario records.

## Draft And Final File Responsibility Mapping / Target Folder Boundary
| Change | Path | Concrete responsibility / placement |
| --- | --- | --- |
| Modify | autobyteus-server-ts/tests/e2e/runtime/claude-agent-websocket-interrupt-resume.e2e.test.ts | Contract-complete fake Query, controlled child acquisition/observations, robust suite-owned teardown and existing scenarios. Local placement preserves one cohesive E2E file; no over-split new architecture. |
| Reuse unchanged | autobyteus-server-ts/tests/fixtures/claude-owned-sdk-cli.mjs | Lightweight real Node child that naturally exits after stdin EOF; shared existing fixture ownership. |
| Add/update | tickets/in-progress/claude-interrupt-resume-fake-cli/* | Owned solution, specialist handoffs/evidence; no production files. |
Production `src`, SDK types/version, protocol, schemas, gates and global TESTING.md are unchanged. Add/Rename/Move/Remove source files: None planned. Draft and final mapping agree; no reusable structure extraction changes the map. Folder boundaries Low risk, tests-only mixed harness/provider concern is justified for the existing local suite.

## Concrete Shape Guidance / Applied Patterns
Existing local external-provider test adapter, not a new production pattern:
1. Resolve owned fixture path using `new URL('../../fixtures/claude-owned-sdk-cli.mjs', import.meta.url)`/fileURLToPath **before query construction chdir can affect resolution**.
2. Require provided spawn callback. Call once with `command: process.execPath`, `args: [absoluteFixturePath]`, query cwd/env and a test-owned AbortSignal. Do not invoke installed claude CLI for fake cases.
3. Provide `initializationResult()` returning the same resolved simulated-initialization Promise; opening observes it normally. Preserve supportedModels/interrupt/iterator. No second iterator or lazy “initialize on user input”.
4. Close fake iterator idempotently, end owned stdin (no arbitrary SIGKILL/extra owner); real manager cleanup joins exact child/IO proof.
5. Retain facade and stream references before release, so tests can check physical exit/closed IO without accessing released facade stream getters. Do not confuse close.mock.calls or killed with exit proof.
A full fake CLI wire-protocol implementation would add unrelated machinery; reject it. Frames remain scripted locally, while real-child resource lifetime is actually exercised. Initialization is simulated, not claimed as a real SDK handshake; separate unchanged actual pinned-SDK opening tests close that evidence gap.

## Backward-Compatibility Rejection Log (Mandatory)
Rejected: allow missing initializationResult, skip controlled spawn, or treat Query.close as automatic physical cleanup certificate. Clean-cut replacement: one current fake contract using existing real production opening. Rejected: production fallback/seam to accommodate test. No approved compatibility wrapper retained.

## Change / Refactor Sequence
1. Confirm current package/base and read approved requirements, design authorities and bounded evidence.
2. Repair fake shape and controlled child lifetime in target file; preserve all callbacks, frames, provider UUID assertions and live gate.
3. Make closeHarness attempt session and HTTP/socket releases even if one fails; retain AggregateError or primary+cleanup evidence. Preserve test assertion failure instead of losing it to a secondary cleanup exception. Observe parallel wait promises immediately (e.g. Promise.all for background notice/report) so one failure cannot produce an unhandled later timeout. Do not blanket-catch away test failures. Use finally for test-owned workspace cleanup.
4. Strengthen existing cases/shared teardown (without adding extra it cases) to assert initialization observed, one controlled child, child remains unexited across interrupt/follow-up, and after manager close physical exit plus retained public IO refs closed / exact session removed. Keep all original behavioral assertions, do not replace them with lifecycle-only checks.
5. Run target 8+1 suite under clean environment, relevant lifecycle tests (include real-child retry), scoped Claude client/session regressions and available production typecheck as appropriate. Repeat target suite to detect timing/unhandled/leak regressions; track every execution and limit separately.
6. Implementation Engineer commits test repair as its own baseline-fix commit and creates implementation-handoff. Independent API/E2E validates; Delivery integrates/reruns and obtains explicit user verification before merge/push/cleanup. No release requested.

## Key Tradeoffs / Risks / Guidance For Implementation
Actual child adds bounded spawn/EOF work (one child per query, eight cases sequentially), not history scans/global discovery. Reused fixture is no-model and fits ownership; retaining in-process scripts avoids a broad fake protocol rewrite. Paid CLI/version/other OS behavior remains untested; don't claim otherwise. New masked failures or needed production/seam changes → return Design Impact/Requirement Gap with REQ/AC reference before broadening. No swallowed errors, artificial released receipts, timeout-only cures or gate changes. Current investigation has not implemented/validated the repair.

## Task Size And Architectural Risk (Mandatory)
- `task_size`: **Small** — bounded local test/harness changes in one E2E file, existing fixture reused unchanged; no production implementation surface. Markdown/log volume does not determine size.
- `architectural_risk`: **Low** — existing public seam and owners absorb fake alignment; production contracts, persistence, security, concurrency, deployment and ownership semantics unchanged. Concrete current-base cause and actual pinned-SDK lifecycle evidence reduce uncertainty.
- Payload vs structural delta: local fake frame payloads preserved; test interface/lifetime updated. Production structural surfaces inventoried but not modified.
- Escalation trigger: any required production code/API/SDK/seam or lifecycle-policy change, failure with conforming real SDK beyond fixture boundary, changed behavioral assertions, new unsupported scenario, or unresolved ownership/cleanup impact. Stop dependent work, report to Solution Designer and reclassify/reapprove affected basis rather than keep Small/Low silently.
