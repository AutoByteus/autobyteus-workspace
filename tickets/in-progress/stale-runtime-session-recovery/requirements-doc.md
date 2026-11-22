# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-002` (AC-005's verification paths clarified; intended behavior unchanged)
- Package identifier: `stale-runtime-session-recovery` (autobyteus-599)
- Request / ticket: Project Task `autobyteus-599` in Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`: "Resuming an older run fails with `CLAUDE_PROCESS_EXITED: No conversation found with session ID` — investigate and recover cleanly via fresh session + work journal"
- Requested by: `/project_task_manager` (`project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), from the founder's live observation (2026-11-21)
- Requirements owner: Solution Designer (`solution_designer_703182187282472484b90793eac8be40`)
- Date: 2026-11-22
- Approved by and reference: `Solution Designer within the direction (user informed)`. Reference: my message to the founder in this conversation, 2026-11-22, "599: requirements approved within the direction".
- Exact approved requirements baseline / solution revision: this document at SR-001
- Behavior-defining supplements: none (`probes/README.md` is evidence)

## Problem And Desired Outcome

- **Problem:**
  - A run on an external agent runtime keeps the runtime's own session ID (`platformAgentRunId`) and resumes that session on its next message.
  - When the runtime no longer has that session, the run cannot continue. Every message fails, although AutoByteus still has the run's raw traces and work journal.
  - Root cause of the observed case, measured:
    - The run was the founder's `architecture_reviewer` of autobyteus-53's Software Engineering Team (Claude Agent SDK).
    - Its last answered turn was on 2026-10-14; the next message came on 2026-11-19, 36 days later.
    - Claude Code deletes saved sessions after 30 days by default (`cleanupPeriodDays`, unset in the founder's settings). Of the 1,819 Claude session files on this Mac, none is more than about 30 days old.
    - Its saved session is gone, so `--resume` fails before any input with `No conversation found with session ID` (PRB-002).
  - The same dead end exists on every external runtime, each with its own signal (PRB-001…005):

    | Runtime | Signal when the saved session is missing |
    | --- | --- |
    | Claude | an error result and exit at first open |
    | Codex | `no rollout found for thread id` |
    | Antigravity | silently starts a new conversation, which AutoByteus refuses (`AGY_CONVERSATION_ID_CONFLICT`) |
    | Grok and DeepSeek (ACP) | `session/resume` or `session/load` errors |

- **Affected actors:**
  - the founder, continuing an older run from the desktop or phone;
  - every external-runtime run: standalone, Team member, Org member and delegated copy.
- **Desired outcome:** when the runtime reports that the run's saved session no longer exists, the run continues with that message:
  - AutoByteus starts a fresh session of the same runtime and model;
  - it shows the user one plain line saying what happened;
  - it hands the new session the work journal hand-over notice (the same one as after a runtime switch, autobyteus-316 and 583);
  - the agent answers the message.
- **Observable definition of success:** sending a message to such a run produces the notice line and an answer, not an error. Later messages continue in the new session. Nothing of the run's history is lost.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | SCN-001 | Claude: the restore succeeds, then the first input opens `claude --resume=<id>`. Claude emits an error result and exits, and the turn fails with `CLAUDE_PROCESS_EXITED: … No conversation found with session ID`, on every message. The run shows `Error`. | The missing session is recognized at activation. A fresh session continues the run with the hand-over notice, and the message is answered. | A Claude session that exists is resumed as today. | Screenshot; PRB-001, PRB-002; `claude-session.ts:221-238`, `:416-423` |
| BEH-002 | User | SCN-002 | Codex: `thread/resume` fails at activation with `no rollout found for thread id`, and the message fails | As BEH-001 | An existing thread resumes | PRB-003; `codex-thread-manager.ts:176-182` |
| BEH-003 | User | SCN-003 | Antigravity: `agy --conversation <id>` warns `not found` and opens a new conversation, then the restore throws `AGY_CONVERSATION_ID_CONFLICT` | As BEH-001 | Exact restore of an existing conversation; any other conversation mismatch still fails | PRB-004; `agy-agent-run-backend-factory.ts:115` |
| BEH-004 | User | SCN-004 | Grok / DeepSeek (ACP): `session/resume` fails (`FS_NOT_FOUND`) and the restore fails | As BEH-001 | An existing session resumes | PRB-005; `acp-agent-session.ts:134-144` |
| BEH-005 | System | SCN-001…004 | Any other restore or turn failure (auth, network, a broken CLI, rate limits) fails as today | Unchanged. Only the runtime's own "this session does not exist" signal starts a fresh session. | Every other error path | — |
| BEH-006 | Contract | SCN-001…004 | After a runtime switch, the new session gets the hand-over notice with the first input. The previous records become a closed segment, and the chat shows the marker line (contract §3.3–§3.7). | The fresh session after a lost session gets the same notice from the same journals. The marker line says the saved session was no longer available, not that the runtime changed. | Contract §3.3–§3.7 delivery, archive and chat rules (I-1…I-11) | `tickets/done/cross-runtime-resume/run-runtime-switch-contract.md`; autobyteus-583 |
| BEH-007 | User | SCN-005 | A Team or Org member, or a delegated copy, is activated by its root (autobyteus-348) | The same recovery for members and delegated copies | Other members never move | `runtime-switch-members` E2E |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| Founder | Continue an older run | It just continues, with a clear one-line explanation | No release without his word |
| Incoming (fresh) agent session | Continue the work | Gets the hand-over notice and the full journal | — |
| Agent runtimes | Report whether a saved session exists | Each signal is recognized exactly | Unknown errors never cause a fresh session |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | A message to a run whose saved external session no longer exists continues the run in a fresh session of the same runtime and model, with the hand-over notice and a chat line | SCN-001…SCN-005 |

### Out Of Scope

- Preventing Claude Code's cleanup, for example by raising `cleanupPeriodDays`. Its setting is global to the founder's `~/.claude`, and his own interactive Claude also deletes by it. That is a separate decision (FU-001).
- Restoring a deleted session's native context, such as its tool state or prompt cache.
- The AutoByteus native runtime: it has no external session.
- Runs whose own AutoByteus memory is unreadable: that is handled elsewhere (`run-conversation-availability.ts`).
- The hand-over notice wording, which stays as autobyteus-583 delivered it.

### Non-Goals

- No user action, button or dialog for the recovery: it is automatic (DEC-001).
- No periodic or startup scan of saved sessions: the check runs only when a run is activated.

### Preserved Behavior Boundary

- BEH-005;
- the preserved column of BEH-001…004 and BEH-006;
- contract §3.3–§3.7 and its invariants;
- existing runtime switches;
- runs that never lost a session.

### Prerequisites

None.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up. It is not a required design correction, unless it is a prerequisite.
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority / Criticality | Rationale | Feasibility Evidence | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-001 | When the activation of an external-runtime run finds that the runtime no longer has the run's saved session, the run continues in a fresh session of the same runtime and model, and the message that triggered the activation is answered | BEH-001…004 | Must | The founder's dead end | PRB-001…005: each runtime gives a distinct, reproducible signal | Task direction 2; DEC-001 |
| REQ-002 | A fresh session is started only on the runtime's own "this session does not exist" signal, recognized exactly per runtime. Any other failure keeps today's behavior. | BEH-005 | Must | Starting a fresh session without need would throw away a working native session | PRB-001…005 | DEC-002 |
| REQ-003 | The fresh session receives the hand-over notice with its first input, from the run's journals, as after a runtime switch. The previous records are kept as a closed segment and stay in the chat. | BEH-006 | Must | The journal is the context | autobyteus-316/583 contract | Task direction 2 |
| REQ-004 | The chat and the journal show one line instead of "Agent runtime changed": `The saved <runtime name> session of this run was no longer available, so a new session continues from the work journal.` | BEH-006 | Must | The user must see why the agent restarted | N/A | DEC-003 |
| REQ-005 | The recovery is safe to repeat. A failure part-way leaves the run so that the next message completes it, with one marker and one segment for that lost session, and never loses or duplicates records. | BEH-006 | Must | Same guarantees as a switch (I-3, I-5, I-7) | contract | DEC-004 |
| REQ-006 | The recovery applies to standalone runs, Team and Org members, and delegated copies, on Claude Agent SDK, Codex App Server, Antigravity CLI, Grok Build and DeepSeek Harness | BEH-007 | Must | Every activation path and runtime has the dead end | PRB-001…005 | Task direction 1 |
| REQ-007 | The server log records each recovery with the run, the runtime and the lost session ID (one warning) | BEH-001…004 | Should | Operability | N/A | — |

## Acceptance Criteria

| Acceptance-Criteria ID | Related Requirement IDs | Related Behavior / Scenario IDs | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-003, REQ-004 | BEH-001, SCN-001 | A stopped Claude run whose saved session ID does not exist in Claude's store; a message is sent | The run becomes active with a new session ID. The chat shows the REQ-004 line, the agent answers, and its first input begins with the hand-over notice naming the previous segment's journal. | — | Built-server E2E with a scripted Claude CLI that answers `--resume` of an unknown ID as PRB-002 does; unit tests of the recognition |
| AC-002 | REQ-001, REQ-006 | BEH-002…004, SCN-002…004 | The same for Codex, Antigravity, Grok and DeepSeek | Same outcome per runtime | — | Unit tests of each recognition on the real error shapes (PRB-003…005); E2E where a scripted runtime exists (Antigravity: `agy-failure-cli.mjs`) |
| AC-003 | REQ-002 | BEH-005 | A restore or open that fails for another reason (auth error, network, a conversation mismatch without the `not found` warning, an ACP error other than not-found) | Fails as today; no fresh session, no marker, the metadata unchanged | — | Unit tests (negative cases) |
| AC-004 | REQ-005 | BEH-006 | The recovery fails after the marker is written, or before the commit; the next message is sent | Completes with one marker and one segment for that lost session; raw traces before it are byte-unchanged | Failure before the marker: nothing changed, the next message tries again | Unit and journal-backed tests, as for the switch |
| AC-005 | REQ-006 | BEH-007, SCN-005 | A Team member, an Org member and a delegated copy, each with a lost session, receive a message, each through the path it really takes: the Team root, the Org root, and for a delegated copy the standalone lifecycle with a member context | Recovers as AC-001; other members unchanged; the Team or Org tree holds the new session ID; a later re-activation restores the new session | — | Built-server E2E (Team member); real-root tests (Org member, delegated copy) |
| AC-006 | REQ-003 | BEH-006 | After recovery, the next messages | Go to the new session with no second notice; reopening the chat shows the earlier conversation, the line, and the new conversation | — | E2E |
| AC-007 | REQ-001 | SCN-001 | A real Claude session made unavailable on an isolated test data root (a synthetic run whose session ID was never created, or whose test-owned session file is removed) | Live: the run recovers and answers | — | Live check by API/E2E, gated, isolated HOME/`CLAUDE_CONFIG_DIR`; never the founder's sessions |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Initiator / Governing Contract | Coherent Goal Or Governing Event | Supported Trigger / Entry Surface | Starting Condition | Product-Level Steps Or Event Sequence | Expected Outcome | Supported Alternate / Error Behavior | Scenario Validity | Independent Evidence / Decision Reference | Related Requirement / AC IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | Founder | Continue an older Claude run | Send a message (desktop, phone) | The session was removed by Claude Code's 30-day cleanup | Message, then activation finds the session missing, then a fresh session with the notice, then an answer | Continues | Any other failure as today | Supported Normal Scenario: the founder hit it; Claude deletes by default after 30 days | Screenshot; PRB-002; data counts | REQ-001…005; AC-001, AC-003, AC-004, AC-006, AC-007 |
| SCN-002 | User | Founder | Continue a Codex run whose rollout is gone | Same | The rollout was removed: moved Codex home, a rebuilt Docker node's data, or a manual clean-up. Codex itself kept rollouts back to 2026-02-23 here. | Same | Same | — | Supported Explicit Edge Scenario: the Task asks for parity on every runtime; the runtime reports it distinctly | PRB-003 | REQ-001, REQ-006; AC-002 |
| SCN-003 | User | Founder | Same, Antigravity | Same | The conversation is gone (retention unknown) | Same | Same | — | Supported Explicit Edge Scenario | PRB-004 | AC-002 |
| SCN-004 | User | Founder | Same, Grok / DeepSeek | Same | The session file is gone | Same | Same | — | Supported Explicit Edge Scenario | PRB-005 | AC-002 |
| SCN-005 | User | Founder | Continue a Team member, an Org member or a delegated copy | Message to the member, or a task message | As SCN-001…004 | The root activates the member, and the same recovery runs | Same | — | Supported Normal Scenario (the observed run is a Team member) | screenshot | REQ-006; AC-005 |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes`, minimally. No new screen or control. One chat notice line uses the existing system-notice row that the runtime-switch marker already uses. Its wording is in REQ-004 (DEC-003).
- Product design fields: N/A. There is no new surface, and the existing marker presentation is reused.

## Quality And Non-Functional Requirements

| Quality ID | Related Requirement / AC IDs | Area | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-002 | Reliability | Zero fresh sessions for errors other than the runtime's not-found signal | All runtimes | Negative unit tests |
| QR-002 | REQ-001 | Performance | The check adds no model call and at most one runtime process start per activation (the one the run needs anyway) | Activation | Review |
| QR-003 | REQ-005 | Privacy | Tests use synthetic runs and test-owned runtime homes; the founder's sessions and runs are never touched | All tests | Review |

## Data Continuity And Acceptable Loss

- **Persisted data affected:** `Yes`, as for a switch, and only when a recovery happens.
  - The run's raw traces get one archived segment and a marker.
  - Its metadata, or its tree entry for a member, gets the new session ID.
- **Must be preserved:** every raw trace and journal of the run; the earlier segments, byte-unchanged; the run's identity and folder.
- **Acceptable loss:** the runtime's own native session context, which is already gone.
- **Constraints:** no migration. A recovery runs only when a message is sent to that run.
- **Unknowns:** none.

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| Claude Code 2.1.330 / Agent SDK 0.3.280 | `--resume` of a missing session gives an error result `No conversation found with session ID: <id>` before any input | PRB-001, PRB-002 | Wording may change between versions (RSK-001) |
| Codex app-server 0.171.0 | `thread/resume` error `no rollout found for thread id <id>` | PRB-003 | Same |
| Antigravity CLI 1.5.14 | stderr `conversation "<id>" not found` and a new `conversation_id` | PRB-004 | Same |
| Grok CLI 1.0.92 (ACP) | `session/resume` error `FS_NOT_FOUND` | PRB-005 | DeepSeek's ACP agent not probed (RSK-002) |
| Run runtime switch contract (autobyteus-316) | Archive, marker, notice and chat rules reused | contract | — |

## Supplemental Artifacts

| Artifact Path | Purpose | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- |
| `probes/README.md` and the probe scripts | Runtime signals reproduced | REQ-001, REQ-002 | Evidence | Not behavior-defining |

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | The not-found signal of each runtime is stable for the pinned versions | Exact recognition | Unit tests on the probed shapes; a future change shows as today's error, never as a wrong recovery | Holds |

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | Automatic recovery, or an explicit user action? | Visible behavior | (a) automatic, with a chat line; (b) an error with a "start a fresh session" action | The session is already gone, so nothing is decided by waiting. The journal holds the context, and the runtime switch already does exactly this for the same run. The Task names (a) first. An action button would be new UI for a choice with one sensible answer. Recommend (a). | Solution Designer | Decided: (a) |
| DEC-002 | Which signal starts a fresh session? | A wrong recovery drops a working session | Each runtime's own not-found signal (PRB-001…005) versus "any restore failure" | Only the exact signal. Everything else keeps failing visibly as today, because a transient error must not cost the native session. | Solution Designer | Decided |
| DEC-003 | Chat line wording | Product text | "Agent runtime changed …" is wrong here | `The saved <runtime name> session of this run was no longer available, so a new session continues from the work journal.` It is plain, says what happened and what comes next, and uses the glossary's runtime names. | Solution Designer | Decided |
| DEC-004 | Safe to repeat? | A crash mid-recovery | The switch's idempotency by key | Key the recovery by the lost session ID, so a retry finds its own marker and segment | Solution Designer | Decided |
| DEC-005 | Prevent the Claude cleanup too? | Fewer recoveries | Setting `cleanupPeriodDays` affects the founder's whole `~/.claude` and his own Claude | Out of scope; recorded as FU-001 for his decision. Recovery is needed anyway: his own Claude also cleans up. | Solution Designer | Decided (follow-up) |
| DEC-006 | N-1 evidence: how to probe Grok's `FS_NOT_FOUND` for a present session whose cwd was removed? The implementation engineer asked 2026-11-22. | Grok cannot create a session in an isolated home without credentials (`Authentication required`), and the founder's `~/.grok` must not be written | (A) isolated home plus the test vault's `provider.grok.api-key` as `XAI_API_KEY`; `session/new` and `session/resume` make no model call. (B) no probe, and rely on the safety argument (no marker before a valid fresh session). | (A): it gives real evidence at nil cost and touches nothing of the founder's. The test vault is the repository's sanctioned source of provider keys for tests and investigation (AGENTS.md, TESTING.md#test-vault). The key is read through the vault, never from `.env` or the environment, and is passed only to the probe's child process. It is not a new credential, and no host or security setting changes. Criterion: REQ-002 / AC-003 (Grok exactness). If a removed cwd also gives `FS_NOT_FOUND` while `session/new` would succeed, narrow the matcher; pin the result either way. | Solution Designer | Decided: (A) |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | Acceptance-Criteria IDs | Scenario IDs | Supplemental / Product Design Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001…004 | AC-001, AC-002, AC-007 | SCN-001…004 | PRB-001…005 |
| REQ-002 | UC-001 | BEH-005 | AC-003 | SCN-001…004 | PRB-001…005 |
| REQ-003 | UC-001 | BEH-006 | AC-001, AC-006 | SCN-001 | contract |
| REQ-004 | UC-001 | BEH-006 | AC-001 | SCN-001 | — |
| REQ-005 | UC-001 | BEH-006 | AC-004 | SCN-001 | contract |
| REQ-006 | UC-001 | BEH-007 | AC-002, AC-005 | SCN-002…005 | — |
| REQ-007 | UC-001 | BEH-001…004 | AC-001 | SCN-001 | — |

## Architecture Phase Input

- Approved scenario IDs: SCN-001…SCN-005.
- Constraints to preserve: contract §3.3–§3.7 (I-1…I-11); exact restore everywhere else; members' other members unchanged.
- Decisions deferred to design:
  - where each runtime's signal is recognized;
  - how Claude, which today opens its process lazily on first input, learns of the missing session at activation;
  - the key and marker shape;
  - how the member and delegated-copy activation paths share the standalone path.
- Facts to verify: whether the switch's activation steps can serve a same-runtime "fresh session" without a pending field; the members' activation path.
- Feasibility of the proof: AC-001/AC-005 use scripted CLIs (the existing Antigravity fixture pattern). AC-007 runs live on an isolated `CLAUDE_CONFIG_DIR`, which is safe and gated.

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Product design and supplemental evidence is integrated consistently: `N/A`
- Applicable UI/UX approval and final visual-reference basis are recorded: `N/A` (existing notice row reused)
- Material assumptions and decisions are visible, each decision with reasoning and recommendation: `Yes`
- Content ready for approval: `Yes`
- Remaining content blocker: none

### Approved Basis Ready For Design

- Approval recorded: `Yes` (within the direction; founder informed 2026-11-22)
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: none
