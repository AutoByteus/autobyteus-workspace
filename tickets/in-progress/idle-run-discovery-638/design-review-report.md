# Design Review Report — autobyteus-638 A restart keeps a person's runs running

## Review Round Meta

- Upstream Requirements Doc: `tickets/in-progress/idle-run-discovery-638/requirements-doc.md` (Approved, SR-002)
- Upstream Investigation Notes: `tickets/in-progress/idle-run-discovery-638/investigation-notes.md`
- Upstream Solution Revision Record: `tickets/in-progress/idle-run-discovery-638/solution-revision-record.md` (SR-001, SR-002)
- Reviewed Design Spec: `tickets/in-progress/idle-run-discovery-638/design-spec.md` (Ready, SR-002)
- Supplemental Task Artifacts Reviewed: None (no supplements); `handoff-architecture-review.md`
- Relevant Solution Revision IDs: SR-001, SR-002
- Architecture Review Revision Record: `tickets/in-progress/idle-run-discovery-638/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-001`
- Current Review Round: 1
- Trigger: Solution Designer handoff "Architecture Design Complete", `Medium`/`High`, 2026-11-24. Design approval by the founder: `Not required`.
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
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
| BEH-001 | Operational | Pass | Pass | Fail | Needs Correction | AR-001 (a stop during the restore window loses the runs not yet brought back) |
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
| C-1 `running-runs.json` | Pass | Fail | Pass (walks 1–9) | Pass (`terminatedAt: null` after a restart; production restore path) | Pass | Fail: AR-001. The lifecycle says "taken (read, then removed) once at startup, before this session's recorder starts". Between that removal and each run's restore, a recorded run is in neither the file nor the live set, so a stop or crash there loses it. The busy record's own `take` avoids this by persisting first |
| C-2 `RootTeamRun.ensureAgentReady(agentRunId)` | Pass | Pass | Pass (walk 3) | Pass | Pass | Pass |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | One Owner Per Node, In Call Order? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 record | 2 s check / graceful stop | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-002 restore | Start, after the update wake | Pass | Pass | N/A | Pass | Fail | Pass | Fail (AR-001: the restore window is owned by nobody: the restorer has removed the record and the recorder does not know the pending runs) |

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

## Review Decision

`Fail`.

## Findings

### AR-001 — A stop or crash during the restore window loses the runs not yet brought back

- Type: `Design Impact`; severity: Medium.
- Protects: REQ-001, REQ-002, SCN-002, DEC-003.
- Scope status: `Within Approved Scope`. Changes approved behavior: No.
- Problem: MP-001. The record is removed at `take()`, before the runs it lists are running again. For the length of the restore, nothing owns them: they are not in the file, and the recorder does not know them.
- Evidence: design C-1 lifecycle, DS-001 and DS-002; `server-runtime.ts:212-216, 241`; `busy-run-recorder.ts:82-94` (the pattern records only live state); `restart-resumer.ts:71-104` (the busy path persists before it removes).
- Required update: one owner keeps the file covering the pending runs until each is handled, and the design says who drives the order. Possible shapes:
  - (a) The recorder's set is `live ∪ pending`, where `pending` is the taken entries the restorer has not finished yet. The restorer drops an entry when it is restored, skipped (archived, stopped, gone, not started by a person) or failed. The recorder stays the one writer of the file, and its final write at a graceful stop includes the still-pending entries.
  - (b) `take()` only reads, and the restorer removes the file when it finishes. The recorder must then not write before the restorer is done, which reopens the crash gap for new runs, so (a) is the cleaner shape.
  - Add a test: a stop during the restore keeps the unrestored entries.
- Why proportionate: a set union in the existing recorder and three "handled" calls in the restorer; no new file or state.
- Recipient: Solution Designer.

## Classification

`Design Impact` (AR-001). Route: Solution Designer.

## Recommended Recipient

Solution Designer.

## Residual Risks

These are for implementation; none blocks:
- **The final write and a pending `startedByPerson` read.** At a graceful stop, `record()` should await the person-started reads still in flight (bounded, as the busy recorder bounds its background-task inspection), or a root that became live in the last moment is missed. Losing up to 2 s is accepted for a crash, not for a graceful stop.
- **`error` entry agents.** `statusesOf` keeps `error` (only `offline` is left out), so a run whose entry agent was in error is recorded and brought back. This matches "earlier X, after restart X" and the listing's `error` state; state it in the docs.
- **Org roots.** `liveRoots()` returns Org roots too. The recorder must skip `agent_org` explicitly (C-1: never `agent_org`), not only by `startedByPerson`.
- **Startup load.** The runs that were running come back within seconds of listening, 3 at a time. It is the same memory as before the stop (QR-001), but loading peaks during the window MP-001 describes.
- Messages from peers during the restore window are refused "not running" until each run is back (CM-13). This is transient and accepted.

## Latest Authoritative Result

- Review Decision: `Fail`
- Material-Premise Gate: `Pass`. MP-001 is reachable with a forward witness.
- Notes: The rest of the design is sound:
  - a separate record keeps "busy" with one meaning;
  - the recorder copies the busy recorder, whose `record()` stops its own timer before the final write;
  - the restorer runs after the never-throwing resumer, with explicit skips and isolated failures;
  - the Team readiness chain follows the existing Team layering;
  - only what was running comes back (DEC-003).

  Only the restore window needs an owner.
