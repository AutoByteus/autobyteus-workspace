# Code Review Report — restart-resume (autobyteus-285)

All ticket paths are under `/Users/normy/autobyteus_org/autobyteus-worktrees/restart-resume/tickets/in-progress/restart-resume/`.

> **Latest round: 2, API/E2E Failure-Origin Review (CRR-002), `Fail` → `Design Impact` for the Solution Designer.** Round 1 (CRR-001, `Pass`) is kept below; § Round 2 and the Latest Authoritative Result supersede it.

## Round 2 — Failure-Origin Review of F-API-001 (CRR-002)

### Meta

- Trigger: API/E2E engineer, API-REV-001 `Fail` (89.9%).
  - Code `b50e2354ab`, from a clean checkout of `400e4d5b9c`.
  - Docs and evidence `7d6bc4dc54`.
- Coverage investigation / execution report / API/E2E revision record: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-revision-record.md` (API-REV-001).
- Project testing guideline: `TESTING.md`. Temporary data roots only; the user's app and data were untouched.
- Failing scenarios: AC-003 / AR-002 / BEH-003. A run archived, or messaged by the user, while the resumer is handling it.
- Command: `evidence/API-285-server-probe.mjs … queue-race …`. The cases are API-04, API-04B and API-04C.
- Evidence (`evidence/`): `API-04-result.json` (`acted`, `after`), `API-04-server-X1.log:284-286`, `API-04B-result.json` (`conversationTail`), `API-04C-*`. O-1: `API-05T-result.json`, `API-05T-X1-team-live.png`.

### What the evidence shows

- **(a) An archived run is resumed (API-04).**
  - t-archive was archived with `success: true` at about 24.41 s, after its eligibility check had passed.
  - "Restart resume resumed host run '…067447d2…'" was logged at 24.69 s, and the run has 1 notice.
  - So an archived run took a paid turn, against BEH-003 ("Never resumed").
- **(b) A messaged run gets the notice turn first** (API-04, API-04B, API-04C).
  - The user's message was sent 0.02–0.3 s before the target's post.
  - The run's conversation is: notice → assistant → user → assistant. That is two turns where REQ-003 says skip ("already received new input").
- **Correct outside the race:** an archive that finishes before the check is skipped ("its root is archived", API-04B and API-04C). Live runs are skipped (unit tests).

### Origin (Read: `restart-resumer.ts:107-164`, `standalone-agent-run-root-manager.ts:146-197`)

The guard and the post are not one step. `resumeOne` runs `ineligibility(entry)` first. Only after it passes does it call `postToHost`, which goes through `standaloneRootManager.postUserMessage`: that resolves or restores the root, readies the host and posts. Or it calls `postToMember`: `resolveOrRestore`, then `executeAgentCommand`. Restore and activation take about 0.3–0.5 s, and two premises the guard relies on fail inside that window:

1. **"Live means received new input" (design D3.5) is false during an activation.** A user's message starts its own restore and activation, and `AgentRunManager.getActiveRun` reports nothing until that activation completes. So a run whose user input is already admitted reads as "not live". A user Stop of an offline run is not a product action: Stop is not offered for an offline run, and `terminateAgentRun` returns "Agent run not found" (API-04). The Stop part of AR-002 is not reachable, and it is not a finding.
2. **"Immediately before posting" (AR-002) is not where the check sits.** The design places the check in step 5 and the restore in step 6, so the implementation follows the design's order. Then nothing at the owner refuses the post:
   - the root does not refuse a post to an archived run;
   - the run's input admission does not know that the notice is conditional.

   A check made outside the owner, before a slow restore, can't guard the post.

- **Not an implementation defect:** the code follows SR-004's order exactly (check, then dispatch). The host path has no hook between restore and post where a re-check could go; `postUserMessage` does both.
- **Not a test problem:** both triggers are real user actions through the product's surfaces (GraphQL archive, a user message), timed around a real resume.
- **Scenario validity:** `Supported Explicit Edge Scenario`.
  - The design itself contracts this concurrency: AR-002 says a run "the user messages … or archives while it waits in the queue" is not resumed.
  - It is most likely when a user is present at relaunch: a desktop "Install update and restart", after which the user types to an agent right away.
  - In the unattended midnight update, the user's stated purpose, nobody is present, so it is rare.
- **Consequences:**
  - (a) a paid turn on an archived run, against BEH-003;
  - (b) an extra paid turn before the user's message, possibly duplicating the work the user asked for.
- **Review gap (mine):** CR-C6 in round 1 rejected exactly this race as "a window of milliseconds; not a second concurrent turn". That was wrong. The window is the restore plus the user's own activation, and the result is a second turn ahead of the user's input. I did not consider the archive race at all.

### A second point from the evidence: O-1 changes CR-C2 (member notice)

- In round 1 I accepted the member-memory gap (CR-C2, FU-004) as a residual because the notice is "met live". API-05T shows that in the realistic flow, a member's notice is posted about 1 s after the start. No window is viewing the member at that moment, and member history doesn't keep it. **So the user never sees a resumed member's notice.**
- That contradicts BEH-004 ("The user sees in each resumed run a notice") for Team and Org members and delegated runs. I am reclassifying CR-C2: it is not a cosmetic residual but this ticket's behavior. FU-004 should be absorbed into this ticket's design revision.
- The host path is fine: rendered live and after a reload (API-05H).

### Classification and directions (the Solution Designer decides)

- **`Design Impact`**, owned by the Solution Designer, for both:
  - **F-API-001:** the eligibility guard must be atomic with the post, at the owner;
  - **CR-C2 / O-1:** a member's notice must be persisted, so the user can see it after the fact.
- **Directions observed for F-API-001** (not prescribed):
  - **i.** Make the post itself conditional at the owner. For example, the root or run admits the notice only if, at admission time, the run has no other input admitted since the restart and its root is neither archived nor terminated. That needs a small boundary addition (a conditional post, or an "only if idle and eligible" option), used by both the host and the member paths.
  - **ii.** Narrow the window without owner support:
    - count an in-progress activation as live (`AgentRunManager` knows its pending activations);
    - re-check the root's history row after the restore, immediately before the post.

    This shrinks the race to milliseconds but doesn't close it, and the host path needs an API hook between restore and post.
  - **iii.** Accept the residual: (b) an extra notice turn, (a) an archived run resumed within its restore window. This is a requirements decision under BEH-003 and REQ-003, so the user's call.
  - **Related, possibly pre-existing (Read only, not traced further):** whether a post to an archived run's root is refused anywhere, for example a peer's remote message to an archived run. If not, (i) covers it as well.
- **Directions for O-1** (from FU-004): persist the member notice, either as the member run's `SYSTEM_TASK_NOTIFICATION` with the duplicate `member_input` presentation filtered, or as a history-projected system entry. Then the member's history shows it after a reload, as a host's does.

### Follow-ups

- FU-004 should move into this ticket (reclassified above). The Solution Designer updates `follow-ups.md` when revising.

## Review Round Meta

- Review Entry Point (round 1): `Implementation Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (Approved by the user, SR-002: REQ-001 to REQ-006; DEC-001 = A, DEC-002 to DEC-005)
- Investigation Notes Reviewed As Context: `investigation-notes.md`
- Solution Revision Record Reviewed As Context: SR-001 to SR-004
- Design Spec Reviewed As Context: `design-spec.md` (SR-004)
- Supplemental Task Artifacts Reviewed As Context: `follow-ups.md` (FU-001 to FU-003)
- Relevant Solution Revision IDs: SR-002, SR-004
- Design Review Report Reviewed As Context: `design-review-report.md` (ARCH-REV-002 `Pass`; N-7 to N-10). It is untracked in the worktree and owned by the architecture reviewer.
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md` (untracked, same owner)
- Relevant Architecture Review Revision IDs: ARCH-REV-001, ARCH-REV-002
- Implementation Handoff / Revision Record: `implementation-handoff.md`, `implementation-revision-record.md` (IR-001)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: `1`
- Review Scope: `Full Review`
- Trigger: implementation engineer, IR-001 (code `ab4ba6e7dc`, tests and docs `b4d770d364`, size fix `b50e2354ab`; handoff `15a978e22f`)
- Failure-origin fields: N/A

## Routing Classification Review

- Task size: `Large`. Architectural risk: `High`. Selected route: `Implementation Review`. Independent source review required: `Yes`.
- Confirmed. The change adds a new capability area (`src/restart-resume/`), shutdown and startup sequencing, cross-root delivery for every root kind, new persisted data, and unattended agent turns that cost money.

## Review Scope

- Reviewed: `git diff origin/personal...b50e2354ab`, covering every source, test and doc change listed in the handoff's Key Files.
- Context read, unchanged:
  - `ServerProcessShutdown` (284) and the `server-runtime.ts` startup order;
  - `RemoteMessageReceiver.accept` / `resolve` (`remote-message-receiver.ts:68-126`): a throw and `null` both answer "not found";
  - `TeamRunService.resolveManagedTeamRun` (`:219-222`: it catches every error to `null`, which is why N-8 avoids it);
  - `StandaloneAgentRunRootManager.resolveRoot` / `load` / `resolveRootAndEnsureHost` (`:146-197, 379-404`): resolving a root does not activate its host;
  - `AgentTeamRunManager` registration: the `RootTeamRun` itself is the directory boundary (`:428`), so its `isDelegatedRun` is seen;
  - `runtime-memory-event-accumulator.ts` (recorded senders, `:26-31, 260`).
- Exclusions:
  - design step 7, owned by validation: AC-002 on the real app across builds stamped X and X+1, the Docker in-place update, N-2 (the stamp in the desktop bundle and the `pnpm deploy` package), and AC-003 to AC-005 live;
  - I reran no checks: IMP-01 to IMP-06 ran on `b50e2354ab`.

## Upstream Behavior And Production-Path Basis Confirmation

- Behavior-basis status: `Confirmed`. No new behavior.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence |
| --- | --- | --- |
| BEH-001 | Confirmed | The cleanup is `async () => { await recorder.record(); await app.close(); }` (`server-runtime.ts`), so it runs inside 284's bound after the startup barrier and before any `preClose` hook or fence. `BusyRunRecorder.record`: process `AgentRunManager.listActiveRuns()` → status `initializing \| running` → `placeOf` (no root, so not recorded: DEC-005) → **only with entries:** read and merge (an invalid record is replaced and logged; not-yet-resumed entries keep their own `version`) → `atomicWriteJsonFile`. It never deletes and never throws. |
| BEH-002 | Confirmed | After `recoverAfterListen`: `shutdown.checkpoint()`, then `void restartResumer.resumeAfterUpdate()` in the background; the top-level try/catch means it never rejects. The sequence is: read → **delete before anything else** (if the delete fails, it resumes nothing) → an invalid record is logged and dropped → per-entry update test `entry.version !== null && current !== null && entry.version !== current` → group by root → wave 1 (delegated) and wave 2 (host and members), through a post limiter of 3 → the eligibility check right before each post → dispatch by place. Failures are logged and leave the run stopped. |
| BEH-003 | Confirmed | Skipped: a live run (`getActiveRun`), and a root whose history row is missing, has `terminatedAt`, or is archived (the host row, Team row or Org row). A Task-closed copy is refused by its root's fence (`executeAgentCommand`) and logged. Stop, archive and delete act on roots, so reading the root's row is the right subject (handoff § Assumptions). |
| BEH-004 | Confirmed (see CR-C2) | `buildRestartNotice` is a SYSTEM input from `system.restart_resume` with the suppression key, a notice-only preface and the named `message_id` and `dedupe_key`. The **host**'s `lifecycleObserver` publishes `SYSTEM_TASK_NOTIFICATION` on `forwarded`, and memory records it (the sender is in the recorded set). A **member or delegated run** shows its `member_input` as `SYSTEM_TASK_NOTIFICATION` through the new presentation mapping. |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related IDs | Kind | Actor / Initiator | Goal / Event | Entry Surface | Shape | Forward Path / Lifecycle | Expected Outcome | Independent Evidence | Validity | Review Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-A | BEH-001, AC-001 | Operational | Quit, update install, SIGTERM, Docker stop | Record mid-turn runs | `ServerProcessShutdown` cleanup | Normal | DS-001 | A record of busy rooted runs, written before any interrupt | 284 order; REQ-001 | Supported Normal Scenario | Use |
| SCN-B | BEH-002 to BEH-004, AC-002 to AC-005 | System | Start of a new release on the same data | Busy runs continue, each told once | Startup after listen | Normal | DS-002 | Eligible entries resumed; others skipped or dropped | The user's 2026-10-30 and 2026-11-01 decisions | Supported Normal Scenario | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation | Disposition | Reason |
| --- | --- | --- | --- |
| CR-C1 | Implementer point 1: wave 1 holds only delegated runs; wave 2 holds the host **and members** (D3.4's text says "delegated and member entries first") | Accept | D3.4's text contradicts D4 ("delegated entries accepted in wave 1" are listed for a `host` **or `member`**) and AR-003 (every resumed member is told). Only the implemented order satisfies both, and it keeps the purpose of AR-003: no coordinator, host or member resumes before its copies are back. The cost is only a delay for members. The design's D3.4 wording should be aligned by its owner (note for the Solution Designer; it does not block). |
| CR-C2 | Implementer point 2: a resumed member's or delegated run's notice is shown live but not recorded in its own memory, so after a reload the member's history does not show it. Only the host's memory records it | Accept as a residual; follow-up FU-004 | REQ-004 ("receives exactly one notice") is met: the runtime receives the input. BEH-004 and AC-002 ("sees … a notice"; "each received exactly one notice") are met live. It is never shown in the user's name, because a notice-only input is not recorded as a user message (test). Persistence after a reload is not an AC. The design's line that the notice is "kept in the run's memory and history" holds for hosts only. Fixing it for members needs a design choice, for example a member run event plus a filtered `member_input`, because publishing both would show it twice. The ticket works without it, so it is a follow-up (ticket-scope). It is documented in `restart_resume.md:87-88`. Validation should observe the reload case, as the handoff already says. |
| CR-C3 | The shared resolver now maps not-found errors to `null` for remote messages, where they used to throw | Reject (verified unchanged) | `RemoteMessageReceiver.resolve` turns both a throw and `null` into `notFound()`, and the remote suites are green. |
| CR-C4 | Restoring a standalone root for wave 1 could make its host live, so the host is skipped in wave 2 | Reject (verified) | `resolveRoot` → `load` builds the root with a lazy `StandaloneHostAgentHandle`; only `resolveRootAndEnsureHost` calls `ensureHostReady`. An Org restore activates no member (N-10, Read), and a Team restore activates no member (design). The remaining case, where a delegated run's turn messages its host first, is N-9 (accepted: the host continues with that input). |
| CR-C5 | Post-limiter handover: `finally { running -= 1; waiting.shift()?.() }` leaves a moment where a new `limit()` call could enter before the woken waiter re-increments | Reject (not reachable) | New calls come only from the initial synchronous fan-out, or from a root's wave 2 after its wave-1 `Promise.all` settles. That always runs after the woken waiter's continuation, which is queued first in the same finally, so the count holds. The cap is a burst smoother for the startup (DEC-002), not a hard safety bound. N-7's deadlock mutation is tested. |
| CR-C6 | A user message that arrives between the live check and the post: the run gets the notice and the user input, queued | Reject (not material) | The window is milliseconds and both are inputs to the same run in order; it is not a second concurrent turn. AR-002 asks for the check to sit immediately before the post, which it does. |
| CR-C7 | `root-team-run.ts` is at exactly 500 effective lines. The size fix moved a doc comment to a trailing comment | Reject (Pass; note) | `>500` fails, and 500 passes. The change adds one line to a file that was at 499. The next change to this file will need a split. |
| CR-C8 | The stamp lives only in `dist/`, and a server run from `src` has no stamp | Reject | By design (D1): such a server never counts a restart as an update. N-2 (the stamp in packaged builds) is a validation step. |

## Structural / Design Checks

| Check | Result | Evidence |
| --- | --- | --- |
| Task design health assessment preserved | Pass | The new capability area composes the existing owners. The one small refactor, the shared resolver (D5), is done, and the three inline resolvers are removed. |
| Matches behavior-defining supplements | Pass | None. |
| Data-flow spines | Pass | DS-001 and DS-002 match the code, with the CR-C1 wave reading. |
| Ownership boundaries | Pass | `src/restart-resume/` owns the record (one writer, one reader and deleter), the update test and the notice. The roots own restore, delivery and fences; the directory owns `placeOf`; `server-runtime.ts` owns the order. |
| Off-spine concerns | Pass | — |
| Existing capability reuse | Pass | `atomicWriteJsonFile`, the root managers, `executeAgentCommand(post_message)`, `postUserMessage`, the Model Router notice shape, the memory recorded set. |
| Reusable owned structures | Pass | `BusyRunEntry` and `ResolvedRoot` (a tagged union). |
| Data-model tightness | Pass | The record entry has exactly the fields restore and the update test need; `version` is per entry (AR-005). |
| Repeated coordination | Pass | One root resolver for remote and resume (D5). |
| Empty indirection | Pass | `RemoteRootDirectory` narrows by kind, so it is not a pass-through. |
| Separation of concerns / file responsibility | Pass | Record I/O, recorder, resumer, notice and identity are each in their own file. |
| Dependency direction | Pass | `restart-resume/` depends on agent-execution and collaboration types. The composition files bind the singletons, and nothing in `src/restart-resume/` calls a singleton. |
| Authoritative Boundary Rule | Pass | Runs are woken only through their root (host: the root manager; others: `root.executeAgentCommand`), never by posting to an `AgentRun` directly. |
| File placement | Pass | — |
| Layout | Pass | — |
| Interface clarity | Pass | `resolveOrRestore` has one failure contract (`null` = not here; a throw = a restore failure; N-8). `placeOf` returns an explicit place. |
| Naming / one vocabulary | Pass | "Busy run", "update restart", "place" (`host`, `member`, `delegated`) are used consistently in code, logs and docs. |
| No unjustified duplication | Pass | — |
| Patch-on-patch control | Pass | — |
| Dead code removed | Pass | The three inline resolvers are replaced. `resolveManagedTeamRun` is still used by its other callers (the remote composition no longer needs it in its `Pick`). |
| Tests requirement-aligned | Pass | 34 restart-resume cases cover AC-001 and AC-003 to AC-005 in units, plus AR-002, AR-003, AR-005, N-7 and N-8. There are six rule mutations, each failing its test. `isDelegatedRun` is tested on real Team and standalone roots, and the startup gate test covers the order. |
| Fixtures coherent | Pass | — |
| No stale tests | Pass | — |
| API/E2E readiness | Pass | The handoff lists step 7 with the log markers ("Recorded <n> busy run(s) for restart resume", "Restart resume after the update to <X+1>: …"). |

## Source File Size And Structure Audit

| Source File | Before | After | `>500` | `>220` Delta | Classification |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/restart-resume/restart-resumer.ts` | new | 153 | Pass | Pass | Pass |
| `autobyteus-server-ts/src/restart-resume/busy-run-record.ts` | new | 73 | Pass | Pass | Pass |
| `autobyteus-server-ts/src/restart-resume/busy-run-recorder.ts` | new | 44 | Pass | Pass | Pass |
| `autobyteus-server-ts/src/restart-resume/restart-notice.ts` | new | 41 | Pass | Pass | Pass |
| `autobyteus-server-ts/src/restart-resume/release-identity.ts` | new | 27 | Pass | Pass | Pass |
| `autobyteus-server-ts/src/compositions/collaboration-root-resolver.ts` | new | 55 | Pass | Pass | Pass |
| `autobyteus-server-ts/src/compositions/restart-resume-composition.ts` | new | 42 | Pass | Pass | Pass |
| `autobyteus-server-ts/src/agent-team-execution/domain/root-team-run.ts` | 499 | 500 | Pass (at the limit, CR-C7) | Pass | Pass |
| `autobyteus-server-ts/src/standalone-agent-run-root/domain/standalone-agent-run-root.ts` | 490 | 492 | Pass | Pass | Pass |
| `autobyteus-server-ts/src/compositions/build-studio-server.ts` | 466 | 478 | Pass | Pass | Pass |
| `autobyteus-server-ts/src/agent-collaboration/execution/task/root-task-execution-lifecycle.ts` | 464 | 466 | Pass | Pass | Pass |
| `autobyteus-server-ts/src/agent-org-execution/domain/agent-org-run.ts` | 430 | 432 | Pass | Pass | Pass |
| `autobyteus-server-ts/src/agent-collaboration/execution/services/active-collaboration-root-directory.ts` | 112 | 137 | Pass | Pass | Pass |
| `autobyteus-server-ts/src/server-runtime.ts` | 222 | 229 | Pass | Pass | Pass |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms | Pass | The launcher env-variable alternative was rejected in the design. |
| No legacy retention | Pass | — |
| Dead code removed | Pass | — |
| Persisted-data decision followed | Pass | A new transient file only; no existing data changes; the reader tolerates a bad file (log, remove, continue). |
| No version-specific reads | Pass | `version` is an identity compared for inequality, not a schema branch. |
| Transition mechanics match | Pass | N/A (no migration). |

## Dead / Obsolete / Legacy Items Requiring Removal

None.

## Docs-Impact Verdict

- Docs impact: `Yes`, done:
  - the new `restart_resume.md` covers the record, the update test, the waves, eligibility, the notice and the member-memory residual;
  - `agent_execution.md`, `remote_collaboration.md` and the module index are updated.
- A docs-sync suggestion, not required: add N-9 (a host that a delegated run messages first is skipped as live) to `restart_resume.md` explicitly.

## Additional Material Premise Validation

- Upstream premises (ARCH-REV-002, N-7 to N-10): Confirmed in the code (CR-C1, CR-C4, CR-C5). No new premises.

## Review Scorecard (Mandatory)

- Overall score: 9.4 / 10 (simple average; for trend only)

| Priority | Category | Score | Why | Weak | Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | `Data-Flow Spine Inventory and Clarity` | 9.4 | Both spines as designed; the order is explicit at the two wiring points | The D3.4 wave text has to be read through D4 and AR-003 | The design text is aligned by its owner |
| 2 | `Ownership Clarity and Boundary Encapsulation` | 9.5 | One writer and one deleter; delivery only through roots | — | — |
| 3 | `API / Interface / Query / Command Clarity` | 9.4 | A tagged `ResolvedRoot`; an explicit `place`; the resolver's failure contract | `isDelegatedRun?` is optional on the boundary, so a root without it reports `member` (tested) | — |
| 4 | `Separation of Concerns and File Placement` | 9.5 | — | — | — |
| 5 | `Shared-Structure / Data-Model Tightness and Reusable Owned Structures` | 9.4 | The per-entry `version`; a minimal record | — | — |
| 6 | `Naming Quality and Local Readability` | 9.3 | Clear comments that tie each rule to REQ and AR IDs | The squeezed trailing comment in `root-team-run.ts` | Split that file at its next change |
| 7 | `API/E2E Readiness` | 9.3 | Strong unit coverage with mutations; log markers | The two-build real-app proof and N-2 are pending | Validation, step 7 |
| 8 | `Runtime Correctness And Behavioral Fidelity` | 9.3 | Delete-first, the per-entry update test, the check right before each post, slot-free waiting and root fences, all verified | Member notice persistence after reload (CR-C2, a residual) | FU-004 |
| 9 | `No Backward-Compatibility / No Legacy Retention` | 9.5 | — | — | — |
| 10 | `Cleanup Completeness` | 9.4 | — | — | — |

## Findings

None.

## Follow-ups

- Follow-ups this review added: **FU-004**, the restart notice is not recorded in a resumed member's or delegated run's own memory, so it is missing from that run's history after a reload (CR-C2).

## Classification

N/A: the review passes.

## Recommended Recipient

- API/E2E engineer (primary pass rule); then an informational notice to the implementation engineer.

## Residual Risks

- Owned by validation: AC-002 across two stamped builds, on the real app and on Docker; N-2; AC-003 to AC-005 live; the member reload view (CR-C2).
- N-9: a host that one of its delegated runs messages first is skipped as live, so it gets no notice or list. That is accepted.
- The cost of unattended resumed turns, accepted by the user (DEC-001).
- FU-001 to FU-004.

## Latest Authoritative Result

**Round 2 (CRR-002), authoritative:**

- Review Decision: `Fail` (failure-origin)
- Review Entry Point: `API/E2E Failure-Origin Review`
- Supported Product Scenario Gate: `Pass`. The archive and message races are `Supported Explicit Edge Scenario`s that the design contracts (AR-002).
- Material-Premise Gate: `Fail`. Two premises are contradicted:
  - "a live run means it received new input" (false during an activation);
  - "the check sits immediately before the post" (a slow restore comes between them).
- Score note: category 8, Runtime Correctness, goes from 9.3 to 8.6 (BEH-003 and REQ-003 are violated in a race; BEH-004 is unmet for members in the realistic flow). The other categories stand.
- Failure Origin: `Design Impact`, for F-API-001 and the reclassified CR-C2 (O-1). The code follows the design. Round 1 gaps: CR-C6, and CR-C2's live-display premise.
- Recommended Recipient: Solution Designer.
- Notes: everything else in API-REV-001 holds: AC-002 on server and desktop, N-2, AC-004, AR-001, AR-005, AC-005 and AC-006.

**Round 1 (CRR-001), superseded:**

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: 9.4 / 10; every category ≥ 9.2
- Recommended Recipient: API/E2E engineer
- Notes:
  - Reviewed code `ab4ba6e7dc`, `b4d770d364` and `b50e2354ab`.
  - Both implementer points were accepted: the wave order (CR-C1; the Solution Designer should align D3.4's text) and member memory as a residual (CR-C2, FU-004).
