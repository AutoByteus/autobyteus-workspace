# Design Review Report — autobyteus-638 A restart keeps a person's runs running

## Review Round Meta

- Upstream Requirements Doc: `tickets/in-progress/idle-run-discovery-638/requirements-doc.md` (Approved, SR-002; status SR-003)
- Upstream Investigation Notes: `tickets/in-progress/idle-run-discovery-638/investigation-notes.md`
- Upstream Solution Revision Record: `tickets/in-progress/idle-run-discovery-638/solution-revision-record.md` (SR-001 … SR-003)
- Reviewed Design Spec: `tickets/in-progress/idle-run-discovery-638/design-spec.md` (Ready, SR-003)
- Supplemental Task Artifacts Reviewed: None (no supplements); `handoff-architecture-review.md`
- Relevant Solution Revision IDs: SR-001 … SR-003
- Architecture Review Revision Record: `tickets/in-progress/idle-run-discovery-638/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-002`
- Current Review Round: 2
- Trigger: Solution Designer handoff "Architecture Design Complete", `Medium`/`High`, 2026-11-24. Design approval by the founder: `Not required`.
- Prior Review Round Reviewed: 1 (ARCH-REV-001, `Fail`)
- Latest Authoritative Round: 2
- Current-State Evidence Basis: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/idle-run-discovery-638`, branch `codex/idle-run-discovery-638` at `2dce370752` (design `abd6ab8ffa`). Code read at the base `c1147c8917` with `git show`:
  - `server-runtime.ts:200-250`;
  - `restart-resume/busy-run-recorder.ts` (all);
  - `restart-resume/restart-resumer.ts:32-125, 178-182`;
  - `agent-collaboration/running/running-agents.ts:1-60`;
  - `standalone-agent-run-root.ts:182` (`ensureAgentReady`);
  - `run-history/store/run-own-agents-reader.ts:25-26, 166` (`startedByPerson`).

## Routing Classification Review

- Task size: `Medium`. Architectural risk: `High` (startup lifecycle on every node; a new persisted transient record; resource use; concurrency with the update wake and first input).
- Independent Architecture Review required by the classification: `Yes`.
- Classification evidence or correction required: None.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`.
- Approved requirements / intended behavior understood:
  - Every Agent or Team run a person started that was running at a stop, graceful or a crash, is running again after the start, idle, with no input posted (REQ-001, REQ-002; DEC-003 (1)).
  - Archived, stopped, gone, delegated and Org runs stay unloaded (REQ-003).
  - Failures are isolated and logged (REQ-004, DESIGN rule 7).
  - Restart reminders and the update wake are unchanged (REQ-005).
- Relevant existing behavior and evidence confirmed:
  - `BusyRunRecorder` checks every 2 s and writes only on change. `record()` stops its own timer before the final write (`busy-run-recorder.ts:46-61`), so the copied pattern cannot overwrite the final record during the close.
  - The cleanup runs `recorder.record()` before `app.close()` (`server-runtime.ts:216`).
  - `takePreviousSession()` persists the reminders before it removes `busy-runs.json`, and keeps the record if saving fails (`restart-resumer.ts:71-104`, R-6).
  - `resumeAfterRestart` never throws (`:107-124`), so the design's `.then(restorer.restore)` always runs.
  - `RunningAgents` has `rootOf`, `statusesOf`, `liveRoots` and `teamCoordinatorOf` (`running-agents.ts:27-55`); `statusesOf` leaves out `offline`.
  - `StandaloneAgentRunRoot.ensureAgentReady()` exists and is used by the resumer without posting (`standalone-agent-run-root.ts:182`; `restart-resumer.ts:182`).
  - `listingFactsOf().startedByPerson` = no `delegatedFrom`, no `containedIn` (`run-own-agents-reader.ts:166`).
- Scope guardrail confirmed: UC-001/002 are in scope. Out of scope: runs unloaded before the stop, the 492 rules, delegated idle shutdown, Org runs, application-owned runs, the UI.
- Every prospective blocking `Design Impact` finding is traceable: `Yes` (AR-001 → REQ-001, REQ-002, SCN-002, DEC-003).
- Remaining material ambiguity: None.
- Statements about existing code: the cited lines match.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Operational | Pass | Pass | Pass | Confirmed | AR-001 resolved in round 2 (`running ∪ pending`) |
| BEH-002 | Contract | Pass | Pass | Pass | Confirmed | — |
| BEH-003 | Operational | Pass | Pass | Pass | Confirmed | — |

## Supplemental Artifact Coherence Verdict

None.

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment present; root cause; refactor decision | Pass | Feature on an existing owner area (`restart-resume`); no refactor; the cause is restated with evidence (notes §1) | — |

## Data Contract Verdict

| Record / Message | Each Field Has A Meaning, A Writer And A Reader? | Identities, Relationships And Lifecycle Are Explicit? | Each In-Scope Flow Walked Through It, With An Example Per Case? | Checked Against Existing Data And Real Dependencies? | The Layers Above Follow It Without Mappings, Recomputed Facts Or Second Copies? | Verdict |
| --- | --- | --- | --- | --- | --- | --- |
| C-1 `running-runs.json` | Pass | Pass (round 2) | Pass (walks 1–9, 4b) | Pass (`terminatedAt: null` after a restart; production restore path) | Pass (round 2: AR-001 resolved; AR-002 non-blocking) | Round 1: Fail. The lifecycle said "taken (read, then removed) once at startup, before this session's recorder starts". Between that removal and each run's restore, a recorded run is in neither the file nor the live set, so a stop or crash there loses it. The busy record's own `take` avoids this by persisting first |
| C-2 `RootTeamRun.ensureAgentReady(agentRunId)` | Pass | Pass | Pass (walk 3) | Pass | Pass | Pass |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | One Owner Per Node, In Call Order? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 record | 2 s check / graceful stop | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-002 restore | Start, after the update wake | Pass | Pass | N/A | Pass | Pass | Pass | Pass (round 2; round 1 failed with AR-001: the restore window is owned by nobody: the restorer has removed the record and the recorder does not know the pending runs) |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `running-run-record.ts` (one shape owner) | Pass | Pass | Pass | Pass | — |
| Team root readiness (`RootTeamRun` → `TeamRun` → backend → manager → handle) | Pass | Pass | Pass | Pass | Follows the existing `executeAgentCommand` layering; the restorer calls only the root |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `restart-resume` → `RunningAgents`, `RunOwnAgentsReader`, `CollaborationRootResolver` | Pass | Pass | Pass | Pass | As the resumer; the Team root does not depend on `restart-resume` |

Composition root / Principle 16: `Pass` (both owners are composed in `restart-resume-composition.ts` with their collaborators; `rootHistory` is passed in).

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `RunningRunRecorder.startSession/record` | Pass | Pass | Pass | Low | Pass |
| `RunningRunRestorer.take/restore` | Pass | Pass | Pass | Low | Pass (AR-001 changes what `take` does) |
| `RootTeamRun.ensureAgentReady(agentRunId)` | Pass | Pass | Pass | Low | Pass |

Empty indirection check: `Pass` (`TeamRunBackend.ensureDirectAgentReady` is the existing backend layer, which has one implementation today but is the established Team seam).

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Live record pattern | Pass | Pass | Pass | Pass | A separate record keeps "busy" with one meaning (P15) and the resumer untouched |
| Restore without posting | Pass | Pass | N/A | Pass | `resolveOrRestore` + `ensureAgentReady` |
| Person-started, history states, live state | Pass | Pass | N/A | Pass | `listingFactsOf`, `rootHistory`, `RunningAgents` |
| 3-slot limiter | Pass | Pass | N/A | Pass | Extract `createPostLimiter` verbatim, or duplicate it, recorded in the handoff |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `restart-resume/` | Pass | Pass | Pass | Pass | — |
| `agent-team-execution/` (C-2) | Pass | Pass | Pass | Pass | — |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Recorder loop (busy / running) | Pass | N/A | Pass | Pass | Two records with different meanings; not shared |

## Shared Structure Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `RunningRunRecord` | Pass | Pass (no time, status or version: no reader) | Pass | N/A | Pass | — |

Derived consumers: `Pass` (only the restorer reads the file). Vocabulary: `Pass` ("running run" is distinct from "busy run"; the CM § 1 note is updated).

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Re-Tightened After Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| The three new `restart-resume/` files, composition, runtime, the five Team files, docs | Pass | Pass | N/A | Pass | — |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `restart-resume/running-run-*.ts` | Pass | Pass | Low | Pass | — |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| None (a feature; no dead code found in the touched files) | Pass | N/A | Pass | Pass | — |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| New record | No | Pass | Pass | No old file, no version branch |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Evidence Is Sufficient? | Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `running-runs.json` (new); run files unchanged | `Not Affected` (a node upgrading has no file) | Pass | Pass | N/A | Pass | — |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Seven steps | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Record JSON; restorer per-run code | Yes | Pass | Pass (posting an input to wake) | Pass | — |

## Material Premise Validation (Only When Needed)

### `MP-001` — The node stops or crashes while the restorer is still bringing runs back

- Related approved requirement: REQ-001 ("gracefully or by a crash"), REQ-002, SCN-002, DEC-003 ("restores exactly what was there"); the founder's "they will never be released again".
- Initiating basis kind: `Operational`. A person restarts the node (Restart server, `docker stop`/start) shortly after a start, or the process crashes. A crash is in scope by REQ-001, and loading several runtimes of 270–330 MB each at once raises memory exactly in this window (notes §3a).
- Forward path (design):
  1. `take()` reads `running-runs.json` and removes it before this session's recorder starts (C-1 lifecycle).
  2. After listen and the update wake, `restore(taken)` brings runs back 3 at a time; each runtime start takes seconds.
  3. The recorder records only live roots (DS-001). A run not yet brought back is in neither the file nor the live set.
  4. A graceful stop now writes the final record without it (`record()`); a crash leaves the last 2 s record without it.
  5. At the next start, it is not brought back.
- Consequence: every recorded run not yet restored stays unloaded for good, which is the incident this ticket fixes (other agents start duplicates). The busy record does not lose its entries in the same window: its `take` persists them as reminders before it removes the file (`restart-resumer.ts:71-104`).
- Reachability: `Reachable` (a supported operator action, or a crash, which REQ-001 names).
- Review consequence: AR-001.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Round 2 Delta Review (SR-003, commit `affa990598`)

| Item | Change | Verdict |
| --- | --- | --- |
| AR-001 | `take()` reads without removing; the taken runs are `pending` in the restorer until each is restored, skipped or failed; the recorder (the only writer) records `running ∪ pending` on every change and in its final write; walk 4b and a test cover a stop or crash mid-restore | Resolved. A run leaves `pending` only once it is running (still recorded), retired (rightly dropped) or failed (logged). The recorder asks the restorer `pending()`, a question with no callback; the composition builds the restorer first (Principle 16) |
| R-1 | The final write awaits in-flight `startedByPerson` reads, at most 1 s, and logs a root left out | Taken in |
| R-2 | `error` entry agents are recorded and come back; documented | Taken in |
| R-3 | `agent_org` roots are skipped explicitly | Taken in |
| C-1 Data Contract | Lifecycle and invariants rewritten | Pass (the Data Contract Verdict's C-1 row now passes) |
| DS-002 | The restore window is owned | Pass |

## Review Decision

`Pass` (round 2). The upstream behavior basis is confirmed, the design is ready for implementation, and no in-scope machinery depends on an unsupported material premise. MP-001 is handled by `running ∪ pending`.

## Findings

No blocking finding. AR-001 is resolved.

### AR-002 — The recorder's first write may not happen, so a stale or invalid file can stay (non-blocking)

- Type: `Design Impact`; severity: Low; blocking: No.
- Problem:
  - C-1 says an invalid file is "replaced or removed by the recorder's first write", and that the file is removed when the set is empty.
  - The copied pattern starts with `written = "[]"` (`busy-run-recorder.ts:25`) and writes only on change.
  - So when nothing runs and nothing is pending at the first 2 s check (for example, every taken run was skipped or failed quickly, or the file was invalid), no write happens and the old file stays.
- Consequence: harmless. Retired runs are skipped again and failed runs retried at the next start, and an invalid file is logged at each start. But it contradicts the stated lifecycle.
- Required update (implementation): start the recorder's `written` key as "unknown" (or as the taken set), so its first check always writes or removes the file. Add a test.
- Recipient: implementation engineer; Solution Designer informed.

## Classification

N/A (Pass). AR-002 is non-blocking.

## Recommended Recipient

Implementation engineer (primary). Solution Designer (informational).

## Residual Risks

- A run whose restore failed leaves `pending` and is not recorded again. With AR-002 fixed, it is not retried at the next start either. This is logged (REQ-004), and its person brings it back by opening or messaging it.
- Startup load: the runs that were running come back 3 at a time within seconds of listening (QR-001, QR-002).
- Peers' messages during the restore window are refused "not running" until each run is back (CM-13); this is transient.

## Latest Authoritative Result

- Review Decision: `Pass` (ARCH-REV-002)
- Material-Premise Gate: `Pass`. MP-001 is handled.
- Notes: `task_size=Medium`, `architectural_risk=High`. The design is ready at SR-003 (`affa990598`). AR-002 is a non-blocking implementation note.
