# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-002` (revised for ARCH-REV-001: AR-001, AR-002, N-1, N-2)
- Approved requirements baseline: `requirements-doc.md` at SR-001 (SR-002 clarified AC-005's verification paths only), approved by the Solution Designer within the direction; the founder was informed in this conversation on 2026-11-22.
- Behavior-defining supplements: none.
- User approval of the design: `Not required` (the Task does not ask for it).
- Design status: `Ready`
- Canonical investigation-notes path: `/Users/normy/autobyteus_org/autobyteus-worktrees/stale-runtime-session-recovery-599/tickets/in-progress/stale-runtime-session-recovery/investigation-notes.md`
- Authorities read (read in this conversation): `references/architecture-design.md`, `references/design-principles.md`, `DESIGN.md` (repository root), `GLOSSARY.md` (runtime switch terms), the archived contract `tickets/done/cross-runtime-resume/run-runtime-switch-contract.md`.
- Project design-principle conflicts: none.
- Discrepancy recorded: Deliberate Deviations, D-1 (reusing the stored `runtime_switch` boundary type).

## Current-State Read

An external-runtime run keeps its runtime's session ID: `platformAgentRunId` in the standalone metadata, or in the member's node of the execution tree. A later activation resumes it:

- **Standalone:** `StandaloneAgentRunLifecycleService.restoreStarted` asks for a `platform_restore` (`standalone-agent-run-lifecycle-service.ts:321-358`).
- **Members and delegated copies:** `ConfiguredAgentActivationPlanner.resolvePlan` returns `restore_external`, and the handle prepares it (`configured-agent-activation-planner.ts:131-165`, `configured-agent-execution-handle.ts:431-445`).

Each backend then resumes:

| Backend | How it resumes | When the session is missing |
| --- | --- | --- |
| Codex | `thread/resume` in `CodexThreadManager.startThread` | The preparation fails (PRB-003) |
| Antigravity | `agy --conversation <id>` | A new conversation, then `AGY_CONVERSATION_ID_CONFLICT` (PRB-004) |
| ACP (Grok, DeepSeek) | `session/resume` or `session/load` | The preparation fails (PRB-005, PRB-008) |
| Claude | Builds a `resume` binding and opens the process only at the first input (`claude-session.ts:221-238`) | The failure lands inside the first turn as `CLAUDE_PROCESS_EXITED` (PRB-002) |

So every runtime reaches a dead end, and nothing recognizes "the session is gone".

The same two activation owners already know how to continue a run in a fresh session. For a pending runtime switch (`activateSwitched`, `beginSwitch` + `ConfiguredAgentSwitchAttempt`) they:

1. take a ticket (the watermark);
2. prepare a `new` candidate;
3. archive the previous records behind a marker (`RuntimeSwitchRecorder.record`);
4. commit the new session ID.

The hand-over notice is then derived from the marker (autobyteus-316/583). The design reuses this path: it adds recognition and a second trigger, not a second recovery mechanism.

## Task Size And Architectural Risk (Mandatory)

- **Task size:** `Large`.
- **Size rationale:**
  - five runtime backends get a recognition each: Claude, Codex, Antigravity, and ACP with two profiles;
  - one typed error;
  - one domain builder;
  - two activation owners: the standalone lifecycle, and the member handle and planner;
  - one member binding-change kind;
  - Claude's restore gains an activation-time open;
  - glossary and docs;
  - unit, journal-backed and built-server E2E tests, and a live check.
- **Architectural risk:** `High`.
- **Risk rationale:**
  - it changes activation lifecycle sequencing in two owners;
  - it changes Claude's process-open timing on restore;
  - it writes persisted run data (a segment, a marker, the session ID) on a new trigger;
  - it reuses a stored boundary type with a widened meaning (D-1).
- **Escalation trigger:** none; this already goes to architecture review.

## Architecture Investigation Evidence

| Source / Command / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| PRB-002, PRB-007 | `probes/README.md` | Claude: initialization rejects with an exact text for a missing session, resolves for a present one, with no input | Claude checks at activation by awaiting initialization (DS-003) | — |
| PRB-006 | same | `getSessionInfo` is inexact (no summary also gives `undefined`) | Rejected as the check | — |
| PRB-003 | same | Codex `no rollout found for thread id <id>` | Codex recognition | RSK-001 |
| PRB-004 | same | AGY stderr `conversation "<id>" not found` plus a new ID | AGY recognition (both conditions) | RSK-001 |
| PRB-005, PRB-008 | same | Grok `data.code FS_NOT_FOUND`; DeepSeek `-32602 … not resumable: <id>` | Per-profile ACP recognition | RSK-002 |
| Code | `standalone-agent-run-lifecycle-service.ts:262-304` | Switch steps: begin, prepare new, identity check, record, commit; discard on failure before record | Reused by the renewal | — |
| Code | `configured-agent-activation-planner.ts:84-112`, `configured-agent-switch-attempt.ts` | Member switch steps | Reused by the renewal | — |
| Code | `collaboration-agent-platform-binding.ts:31,74-90` | Compare-and-set replacement of the stored ID | The renewal commit | — |
| Code | `agent-run-manager.ts:140-170` | `platform_restore` wraps the factory's preparation; `validateRun` checks the ID | The typed error must pass through unwrapped | Implementation checks |
| Code | `runtime-switch.ts` | One builder for key, marker ID and marker text | Add `buildSessionRenewal` beside it | — |

## Intended Change

When a runtime reports, by its own exact signal, that the run's saved session no longer exists, the activation continues the run in a fresh session of the same runtime and model, through the existing runtime-switch steps:
- the previous records are archived behind a marker with the lost-session line;
- the new session ID is committed;
- the hand-over notice goes to the new session with the triggering input.

## Change Scope (Mandatory)

- **In scope:**
  - UC-001;
  - recognition in the Claude, Codex, Antigravity and ACP backends;
  - the typed error;
  - the renewal builder;
  - the standalone lifecycle's restore path;
  - the member handle and planner;
  - the member binding change;
  - glossary and docs;
  - tests.
- **Derived consumers of the changed data:** the renewal writes exactly what a switch writes, so each consumer keeps its rule:

  | Consumer | Decision |
  | --- | --- |
  | Chat projection | Reads `runtime_switch` segments (§3.7); unchanged, so the previous conversation stays visible (AC-006) |
  | Journal | One file per segment; unchanged |
  | Hand-over notice | Derived from the marker; unchanged |
  | Memory search and episodic catalog | Follow journals; unchanged |
  | Run history row | The session ID changes, as after a switch; unchanged |
  | GraphQL | No change |

- **Derived consumers of the member binding change** (`CollaborationAgentPlatformBindingChange` gains `replace_lost_session`; AR-001). Each consumer switches on the kind; the decision for each:

  | # | Consumer | Decision for `replace_lost_session` |
  | --- | --- | --- |
  | 1 | `platformBindingChangeExecution` / `platformBindingChangeSessionId` (`collaboration-agent-platform-binding.ts:35-44`) | Return `change.replacement.binding.execution` / `.platformAgentRunId`, as for `replace_without_conversation` |
  | 2 | `ConfiguredAgentExecutionHandle` after the commit (`configured-agent-execution-handle.ts:386-392`) | As for `runtime_switch`: `this.execution` takes the new `platformAgentRunId` and `this.switchAttempt = null` |
  | 3 | `FlatTeamAgentExecutionHandle` guard and cache (`flat-team-agent-execution-handle.ts:182-205`) | Guard: conflict unless `previous === change.replacement.expectedPreviousPlatformAgentRunId` (the lost ID). Cache: `context.replaceCommittedPlatformAgentRunId(lost, new)`, and `this.config` takes the new `platformAgentRunId`, as the switch branch does, so a later re-created configured handle restores the new session. A test re-activates after a renewal and asserts that the new session is restored. |
  | 4 | `TeamAgentPlatformBindingCommitter.commit` (`team-agent-platform-binding-committer.ts:34-40`) | The same compare-and-set tree mutation as `replace_without_conversation` (renamed `replaceAgentPlatformBindingInTree`; see below) |
  | 5 | `AgentOrgRun.commitAgentPlatformBindingChange` (`agent-org-run.ts:249-254`) | The same compare-and-set (renamed `replaceAgentOrgPlatformBinding`) |

  The compare-and-set the two kinds share is named for what it does:
  - `CollaborationAgentNoConversationBindingReplacement` becomes `CollaborationAgentBindingReplacement` (`{ binding, expectedPreviousPlatformAgentRunId }`; its factory becomes `createCollaborationAgentBindingReplacement`);
  - the tree mutations become `replaceAgentPlatformBindingInTree` (`team-run-execution-tree-mutator.ts`) and `replaceAgentOrgPlatformBinding` (`agent-org-run-execution-tree-mutator.ts`).

  These are code names, not stored names. The two kinds remain distinct and keep their own meaning (Principle 15).
- **Deliberately left alone:**
  - Claude Code's `cleanupPeriodDays` (FU-001);
  - `run-conversation-availability.ts` and `AgentConversationActivityInspector`, which judge AutoByteus's own traces;
  - the hand-over notice wording;
  - runtime switches themselves;
  - the native runtime;
  - Claude's lazy open for new (not restored) sessions.
- **Follow-ups:** FU-001.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | REQ-001–005, REQ-007; AC-001, AC-003, AC-004, AC-006, AC-007 | A message to a stopped Claude run | Fails inside the turn | The missing session is recognized at activation, then renewal | DS-001 (standalone), DS-002 (member), DS-003 (Claude check) |
| BEH-002 | User | REQ-001, REQ-002, REQ-006; AC-002 | Codex | Activation fails | Recognized, then renewal | DS-001/002, DS-004 |
| BEH-003 | User | same | Antigravity | Conflict | Recognized when the stderr line names the expected ID; renewal | DS-001/002, DS-004 |
| BEH-004 | User | same | Grok / DeepSeek | Activation fails | Recognized per profile; renewal | DS-001/002, DS-004 |
| BEH-005 | System | REQ-002; AC-003 | Any other failure | As today | Preserved: only the typed error starts a renewal | — |
| BEH-006 | Contract | REQ-003–005; AC-001, AC-004, AC-006 | §3.3–§3.7 | Switch archive, marker and notice | Reused with `from = to` and the lost-session marker text | DS-001/002 |
| BEH-007 | User | REQ-006; AC-005 | Member / delegated activation | Member switch path | Same renewal | DS-002 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related Requirement / AC IDs | Relationship To This Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| `probes/README.md`, `probes/*.mjs` | Exact runtime signals | REQ-001, REQ-002 | The recognition rules and their unit fixtures come from these shapes | Evidence |

## Task Design Health Assessment (Mandatory)

- **Change posture:** `Bug Fix` (dead end) with a `Behavior Change` (automatic renewal).
- **Current design issue found:** `Yes`. The activation treats a saved session ID as always resumable. No owner turns "the runtime has no such session" into a decision, so a recoverable state ends as a generic failure.
- **Structural triggers:**
  - **Repeated coordination** fires: the renewal is needed in both activation owners. Response: both reuse their existing switch steps with a renewal-built `RuntimeSwitch`, and the only per-owner code is the catch-and-continue branch. The per-owner commit differs (metadata versus the tree), as it already does for switches.
  - **Several kinds or forms** fires:
    - five runtimes recognize, each in its own backend;
    - two activation owners are each traced (DS-001, DS-002);
    - the Claude process open has two forms: a new session (unchanged, lazy) and a restore (eager, checked).
  - **Behavior by absence** checked: the renewal is triggered by an explicit typed error from the runtime's positive "not found" signal, never by a failed lookup in general, and never by "any restore error". A session file that is absent from a scan does not start a renewal.
  - **Vocabulary drift** fires: a renewal is carried by the switch mechanism. Response:
    - `RuntimeSwitch` gains a `cause` field: `"runtime_change"` or `"lost_session"`;
    - the glossary adds "Lost runtime session" and widens "Switch marker" to name both lines;
    - the stored boundary type stays `runtime_switch` (D-1).
  - **Persisted-data transition** fires: no schema change. Existing shapes are written on a new trigger. Decision below.
  - **Empty indirection** checked: no port or wrapper is added. The typed error is a value, and the renewal builder is a function beside the switch builder.
  - **Split sequence** checked: each activation owner calls begin, prepare, record and commit itself; no function is passed to a backend to do part of it.
- **Deliberate deviations:**
  - **D-1, Principle 15 (stored names):** the renewal's archived segment keeps `boundary_type: "runtime_switch"`, and its marker keeps sender `system.runtime_handover`.
    - Why: both mean "the run continues in a new runtime session here; the earlier records are handed over". Every reader (§3.7 chat, §3.6 notice, the journal) must treat a renewal exactly as a switch.
    - The alternative cost: renaming the stored type to a neutral name would need a sealed migration of every switched run's raw-trace manifest (DESIGN.md rule 10), and reader changes, for no behavioral difference.
    - The meaning is defined once in the glossary. The `cause` field in code keeps the two triggers distinct where they differ: the marker text and the key.
- **Root cause classification:** `Missing Invariant`. The activation owners must enforce "a lost runtime session is continued from the journal, never a dead end", and today nothing does.
- **Refactor needed now:** `Yes`, small:
  - `activateSwitched` is split so its fresh-session steps take a `RuntimeSwitch` from either trigger, and `beginSwitch` is split the same way;
  - the member compare-and-set replacement gets a neutral name, shared by two kinds (AR-001);
  - the dead staged member activation is removed (AR-002).
- **Evidence:** Current-State Read; investigation notes.
- **Design response:** below.
- **Intentional deferrals and residual risk:** RSK-001/002 (runtime text changes); FU-001 (prevention).

## Terminology

- **Lost runtime session:** a run's saved external runtime session that its runtime reports as not existing (PRB-001…008). Added to `GLOSSARY.md`.
- **Session renewal:** continuing a run whose runtime session was lost, in a fresh session of the same runtime and model, through the runtime-switch steps (`RuntimeSwitch.cause = "lost_session"`). Added to `GLOSSARY.md` under "Agent runtime switch".
- **Switch marker:** widened. It reads "Agent runtime changed from … to …" for a runtime change, or the REQ-004 line for a lost session.

## Legacy Removal Policy (Mandatory)

- **Obsolete paths in this scope:**
  - the dead staged member activation (Removal plan, AR-002);
  - `AGY_CONVERSATION_ID_CONFLICT` stays for a mismatch without the not-found line (AC-003).
- **Compatibility wrappers, dual paths or fallbacks kept:** `None`.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- **Stored subject:** per run, `raw_traces_manifest.json` (one more segment entry), a new `raw_traces_NNNNNN.jsonl`, the marker as the active file's first record, and `platformAgentRunId` in `run_metadata.json` or in the member's tree node.
- **Change:** none to any schema. The same records a switch writes, on a new trigger, with `runtime_kind` equal on both sides.
- **Readers:** unchanged (Change Scope).
- **Required semantics:** I-1…I-11 with `from = to`; I-5 holds per key.
- **Decision:** `Not Affected` (no transition). Existing data is read as today; new data has existing shapes.
- **Rationale:** no reader needs to tell a renewal from a switch.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001…007 | Message to a stopped standalone run, or a delegated copy (activated through the standalone lifecycle with a member context, `general-process-run-supervisor.ts:292`; N-2), or an application-scope run (N-4) | Answered in a fresh session with the notice | `StandaloneAgentRunLifecycleService` | The founder's standalone runs and delegated copies |
| DS-002 | Primary End-to-End | BEH-001…007 | Message to a Team member (through `FlatTeamAgentExecutionHandle`, which wraps the handle) or an Org member | Same | `ConfiguredAgentExecutionHandle` (with its planner); commits through the Team or Org root (Change Scope table) | The observed case |
| DS-003 | Bounded Local | BEH-001 | Claude platform-restore preparation | The process is open and initialized, or the typed error | Claude backend factory / `ClaudeSession` | The Claude check |
| DS-004 | Bounded Local | BEH-002…004 | Codex / AGY / ACP platform-restore preparation | The resumed session, or the typed error | Each backend | Recognition |

## Primary Execution Spine(s)

**DS-001:**

`User message → AgentRunService (activation on input) → StandaloneAgentRunLifecycleService.restoreStarted → AgentRunManager.beginActivation(platform_restore).prepare() → backend factory restore → ✗ SavedRuntimeSessionMissingError → (failed operation released) → lifecycle builds the renewal → activateInFreshSession: switch memory begin → AgentRunManager.beginActivation(new).prepare() → identity check → switch memory record (segment + lost-session marker) → persistAndPublish (metadata: new platformAgentRunId) → input dispatch → RuntimeHandoverNoticeService preface (marker pending) → agent answers`

**DS-002:**

`Message to the member → FlatTeamAgentExecutionHandle / Org scope → ConfiguredAgentExecutionHandle.prepareActivation → planner.begin(restore_external).prepare() → ✗ SavedRuntimeSessionMissingError → (operation released) → planner.beginSessionRenewal(config, lostId) → switchAttempt = ConfiguredAgentSwitchAttempt(renewal ticket) → prepare(new) → handle records → callbacks.commitPlatformBindingChange(replace_lost_session) → FlatTeam guard (previous === lostId) → TeamAgentPlatformBindingCommitter or AgentOrgRun tree compare-and-set → caches take the new ID; switchAttempt cleared → input dispatch → notice → answer`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The restore tries the saved session. On the runtime's exact "not found", the lifecycle continues the same activation as a switch, with `from = to` and the lost-session marker. A failure part-way leaves what a switch failure leaves, and the next message completes it: the key comes from the lost ID, so the retry finds its segment and marker. | lifecycle, run manager, backend, switch memory, metadata | `StandaloneAgentRunLifecycleService` | Warning log `RUNTIME_SESSION_LOST` |
| DS-002 | As DS-001 inside the member handle, for Team and Org members. The commit is `replace_lost_session`, a compare-and-set in the Team or Org tree, and every consumer of the binding change takes it (Change Scope table). Delegated copies take DS-001 (N-2). | handle, planner, switch attempt, tree | `ConfiguredAgentExecutionHandle` | same |
| DS-003 | Claude restore: the session is created with the restored lifecycle, then `verifyResumable()` opens the process and awaits the SDK's `initializationResult()`. The exact missing-session text (the same ID) becomes the typed error, and the process generation is released. Any other failure is thrown as today. | Claude factory, session, process, SDK | Claude backend | — |
| DS-004 | Each backend catches its own exact signal (table below) and throws the typed error, after releasing what it started (AGY's new conversation process). | backends | each backend | — |

## Spine Actors / Main-Line Nodes

`StandaloneAgentRunLifecycleService`, `ConfiguredAgentExecutionHandle` + `ConfiguredAgentActivationPlanner`, `AgentRunManager`, the backend factories, `RuntimeSwitchRecorder` (switch memory), and `RuntimeHandoverNoticeService` (unchanged).

## Ownership Map

- **Backends:** own the recognition of their runtime's not-found signal and the release of anything they started. They never decide to renew.
- **Activation owners:** own the decision and sequence (renew on the typed error, once per activation) and the commit.
- **`runtime-switch.ts`:** owns the key, marker ID and marker text for both causes.
- **`RuntimeSwitchRecorder`:** owns archive and marker. Unchanged; it takes any `RuntimeSwitch`.

## Thin Entry Facades / Public Wrappers (If Applicable)

N/A.

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Notes |
| --- | --- | --- | --- |
| `ConfiguredAgentExecutionHandle.prepareConfiguredActivation` (`configured-agent-execution-handle.ts:247-275`) and its result type `PreparedConfiguredAgentActivation` with `stagedPlatformBindings` / `stagedNoConversationBindingReplacements` / `commitAfterDurability` (`:53-57`) | Dead. `grep` over `src`: no caller besides its own definition and the wrapper below. The `commitAfterDurability` in `root-team-execution-directory.ts` and `root-agent-execution-registry.ts` belong to other objects (checked). Only tests call it. | The production activation (`getOrCreateAgentRun`, `prepareActivation`) | AR-002 (Principle 7: code that only its own tests call). It also removes a second member activation form the renewal would otherwise have to define, and shrinks the 529-line handle. |
| `FlatTeamAgentExecutionHandle.prepareConfiguredActivation` (`flat-team-agent-execution-handle.ts:88-89`) | Dead (only forwards to the above) | — | AR-002 |
| Tests and test doubles of the staged activation: `configured-agent-execution-handle.test.ts` (cases at :143, :159, :184, :494), `configured-agent-switch-activation.test.ts:180`, `root-recovery-command.test.ts:32`, and the `prepareConfiguredActivation` members of the doubles in `agent-org-execution/helpers/task-publication-handles.ts`, `org-task-root-harness.ts`, `org-collaborator-harness.ts`, `agent-collaboration/helpers/communication-port-double.ts`, and their uses in `root-message-append.test.ts`, `agent-org-member-scope.test.ts`, `team-run-persistence-coordinator.test.ts`, `flat-team-execution-factory.test.ts` | Tests of removed code. A case that asserts a behavior the product still has is rewritten against the production activation; a case that only exercises the staged form is deleted, with the reason in the implementation handoff. | — | ticket-scope: stale tests are rewritten or removed |
| — | — | — | The switch steps are generalized, not duplicated: `activateSwitched` becomes `activateInFreshSession(metadata, input, runtimeSwitch)` used by both triggers |

## Return Or Event Spine(s) (If Applicable)

Unchanged. The notice settles as in §3.6, and the run's status events are published as for any activation.

## Bounded Local / Internal Spines (If Applicable)

**DS-003, inside the Claude backend:**

`factory restore → sessionManager.restoreRunSession (resume binding) → session.verifyResumable(): process.ensureOpen() → streaming session initialization awaited → ok | exact "No conversation found with session ID: <same id>" → release generation → throw SavedRuntimeSessionMissingError`

The frames the CLI emits before it exits (one error `result`, then the exit) must not reach the turn tracker as a turn failure, because no turn exists yet. The implementation proves this with a unit test.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Warning log `RUNTIME_SESSION_LOST {runId, runtimeKind, lostPlatformAgentRunId}` | DS-001/002 | activation owners | REQ-007 | Operability | — |

## Ownership Boundaries

- A backend throws `SavedRuntimeSessionMissingError` only from its platform-restore preparation.
- `AgentRunManager` passes it through unwrapped, as it does other preparation errors (`agent-run-activation-operation.ts:75-79`, checked):
  - A failed preparation first runs its cleanup, then rethrows the original error. So a plain `SavedRuntimeSessionMissingError` from `prepare()` means the failed attempt is already released, and the renewal may start.
  - When the cleanup is quarantined, the error is an `AggregateError`, which is never renewed. The run stays quarantined as today.
- Only the two activation owners catch it.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `AgentRunManager.beginActivation` | backend factories | lifecycle, handle | Lifecycle calling a backend's resume or recognition directly | The typed error |
| Switch memory port (`begin`/`record`/`discard`) | `RuntimeSwitchRecorder`, `RunMemoryFileStore` | lifecycle, switch attempt | Writing the marker or segment directly | — |

## Dependency Rules

- Backends depend on the typed error (in `agent-execution/errors.ts`) only.
- Activation owners depend on the error, the renewal builder and the existing switch memory.
- Nothing new is looked up process-wide. The member path keeps its existing `getDefaultRuntimeSwitchMemory()` fallback as today (unchanged use).

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `class SavedRuntimeSessionMissingError extends AgentRunActivationError` (code `SAVED_RUNTIME_SESSION_MISSING`; fields `runtimeKind`, `platformAgentRunId`) | one restore attempt | "this runtime reports this session does not exist" | the lost ID | A value; added to the activation error codes |
| `buildSessionRenewal({ runId, side, lostPlatformAgentRunId }): RuntimeSwitch` | one renewal | key `session_renewal:<runId>:<lostId>`, `markerTraceId` from the key, `from = to = side`, `cause: "lost_session"`, marker text REQ-004 using `agentRuntimeName(side.runtimeKind)` | run ID + lost ID | Beside `buildRuntimeSwitchBetween`, which sets `cause: "runtime_change"` |
| `ClaudeSession.verifyResumable(): Promise<void>` | one restored Claude session | open and await initialization; translate the exact text | — | Called only by the Claude restore preparation |
| `AcpAgentSessionProfile.isMissingSession(error, sessionId): boolean` | one ACP agent | its exact not-found shape | session ID | Grok: JSON-RPC error with `data.code === "FS_NOT_FOUND"`. DeepSeek: code `-32602` and message `Invalid params: session is not resumable: <sessionId>`. The other ACP agents: `false` |
| `ConfiguredAgentActivationPlanner.beginSessionRenewal(config, lostPlatformAgentRunId)` | one member renewal | an operation with a renewal `switching` attempt and the renewal binding change | lost ID | Mirrors `beginSwitch` (shared private steps) |
| Binding change `{ kind: "replace_lost_session"; replacement: CollaborationAgentBindingReplacement }`, where `replacement = { binding (the new ID), expectedPreviousPlatformAgentRunId (the lost ID) }` | one member | compare-and-set: replace only if the stored ID equals the lost ID | lost ID | The same payload as `replace_without_conversation`, so each of the five consumers reuses its compare-and-set branch (Change Scope table) |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `SavedRuntimeSessionMissingError` | Yes | Yes | Low | — |
| `buildSessionRenewal` | Yes | Yes | Low | — |
| `isMissingSession` | Yes | Yes | Low | — |
| `replace_lost_session` | Yes | Yes | Low | — |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? | Same Meaning And Name Everywhere? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- | --- |
| Missing session | `SavedRuntimeSessionMissingError`, glossary "Lost runtime session" | Yes | Yes, with the glossary line | Low | Glossary |
| Renewal | `buildSessionRenewal`, `cause: "lost_session"` | Yes | Yes | Medium (D-1) | Glossary widens "Switch marker"; D-1 recorded |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Fresh session + archive + marker + commit | runtime switch (316/348) | Reuse | Same steps and invariants | — |
| Hand-over notice | `RuntimeHandoverNoticeService` | Reuse unchanged | Derived from the marker | — |
| Session existence check | each backend's restore | Extend | Each knows its runtime | — |
| Member CAS replacement | `replace_without_conversation` writer | Extend | Same compare-and-set | — |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-execution/backends/*` | recognition | DS-003, DS-004 | activation owners | Extend | — |
| `agent-execution/domain` | renewal builder | DS-001/002 | both | Extend | — |
| `agent-execution/services` | standalone renewal | DS-001 | — | Extend | — |
| `agent-collaboration/execution` | member renewal and commit | DS-002 | — | Extend | — |

## Draft File Responsibility Mapping

See Final File Responsibility Mapping.

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Fresh-session steps (switch, renewal) | stay in each activation owner, parameterized by `RuntimeSwitch` | each owner | Same steps, different commit | Yes | Yes | A third "fresh session" service |
| Compare-and-set session replacement | `collaboration-agent-platform-binding.ts` and its writer | agent-collaboration | Same CAS | Yes | Yes | — |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Parallel / Overlapping Representation Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `RuntimeSwitch` + `cause` | Yes | Yes | Low | `cause` is required on both builders |

## Final File Responsibility Mapping

All paths under `autobyteus-server-ts/src/` unless noted.

| File | Change | Concern |
| --- | --- | --- |
| `agent-execution/errors.ts` | Modify | `SavedRuntimeSessionMissingError`; code added to `AgentRunActivationErrorCode` |
| `agent-execution/domain/runtime-switch.ts` | Modify | `cause`; `buildSessionRenewal` |
| `agent-execution/services/standalone-agent-run-lifecycle-service.ts` | Modify | `restoreStarted` catches the typed error, waits until the failed operation is `released` (otherwise rethrows), logs, builds the renewal and calls `activateInFreshSession` (the extracted body of `activateSwitched`). If the file passes 500 lines, the fresh-session steps move to their own file in the same folder. |
| `agent-collaboration/execution/backends/configured-agent-activation-planner.ts` | Modify | `beginSessionRenewal` (shares the private steps of `beginSwitch`) |
| `agent-collaboration/execution/backends/configured-agent-execution-handle.ts` | Modify | `prepareActivation`: on the typed error from a `restore_external` prepare, confirm release, then use `planner.beginSessionRenewal` and set `switchAttempt`. Above 500 lines already (529): put the branch in a small owned function or file (`configured-agent-session-renewal.ts`) so the handle does not grow |
| `agent-collaboration/execution/domain/collaboration-agent-platform-binding.ts` | Modify | `replace_lost_session` with the shared `CollaborationAgentBindingReplacement` (renamed from `…NoConversation…`); both helpers |
| `agent-team-execution/local/flat-team-agent-execution-handle.ts` | Modify | Guard and cache for `replace_lost_session` (Change Scope #3); remove the dead `prepareConfiguredActivation` wrapper |
| `agent-team-execution/services/team-agent-platform-binding-committer.ts`, `team-run-execution-tree-mutator.ts` | Modify | `replace_lost_session` via the renamed compare-and-set `replaceAgentPlatformBindingInTree` |
| `agent-org-execution/domain/agent-org-run.ts`, `agent-org-execution/services/agent-org-run-execution-tree-mutator.ts` | Modify | The same via `replaceAgentOrgPlatformBinding` |
| `agent-collaboration/execution/backends/configured-agent-execution-handle.ts` (removal) | Modify | Remove the dead staged activation (Removal plan); post-commit handling for `replace_lost_session` (Change Scope #2) |
| `agent-execution/backends/claude/backend/claude-agent-run-backend-factory.ts`, `claude/session/claude-session.ts`, `claude-session-process.ts`, `runtime-management/claude/client/claude-sdk-streaming-session.ts` (or the opening) | Modify | `verifyResumable` (DS-003); the initialization promise exposed from the streaming session; the pre-turn error result does not fail a turn |
| `agent-execution/backends/codex/thread/codex-thread-manager.ts` | Modify | `resumeRemoteThread`: JSON-RPC error message `no rollout found for thread id <id>` with the requested ID → typed error |
| `agent-execution/backends/antigravity/backend/agy-agent-run-backend-factory.ts`, `antigravity/stream/agy-stream-process.ts` | Modify | When the ID differs and stderr holds `conversation "<expectedId>" not found`: stop the process, then throw the typed error. Otherwise conflict as today. |
| `agent-execution/backends/acp/session/*` and `runtime-management/grok/*`, `runtime-management/deepseek-harness/*` profiles | Modify | `isMissingSession` per profile; the ACP restore throws the typed error |
| `GLOSSARY.md` (root) | Modify | "Lost runtime session", "Session renewal", widened "Switch marker" |
| `autobyteus-server-ts/docs/modules/run_history.md` (and `agent_execution.md` where activation is described) | Modify | The renewal paragraph |
| Tests | Add/Modify | See Guidance |

## Applied Patterns (If Any)

None new.

## Target Subsystem / Folder / File Mapping

As above; no new folder.

## Folder Boundary Check

Existing folders; no change.

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Recognition | Codex: `error.message === \`no rollout found for thread id ${threadId}\`` → typed error | Any `thread/resume` failure → renew | REQ-002 |
| Claude check | `await session.verifyResumable()` in the restore preparation | `getSessionInfo()` (inexact); reading `~/.claude/projects` paths | PRB-006, PRB-007 |
| Renewal sequence | `restoreStarted` catches, confirms release, then `activateInFreshSession(metadata, input, buildSessionRenewal(…))` | A second copy of the switch steps | One sequence per owner |
| Marker | `The saved Claude Agent SDK session of this run was no longer available, so a new session continues from the work journal.` | "Agent runtime changed from Claude Agent SDK (opus) to Claude Agent SDK (opus)." | REQ-004 |
| Key | `session_renewal:<runId>:<lostId>` | A random ID per attempt (a retry would write a second marker) | REQ-005 |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| A new stored boundary type plus reader branches for both | Vocabulary | Rejected (D-1) | Glossary defines the shared meaning |

## Derived Layering (If Useful)

N/A.

## Change / Refactor Sequence

1. Add the typed error and `buildSessionRenewal` (`cause` on both builders), with unit tests.
2. Recognition per backend with unit tests on the probed shapes, including the negative cases (AC-003).
3. Claude `verifyResumable` (DS-003). Start from PRB-007: a unit test with a fake SDK for both outcomes, and an integration test with the real CLI on an isolated `CLAUDE_CONFIG_DIR` (no model call).
4. Standalone: extract `activateInFreshSession`, add the renewal branch, and add tests (AC-001, AC-003, AC-004 on real switch memory with synthetic folders).
5. Members:
   - first remove the dead staged activation and its tests (AR-002);
   - rename the shared compare-and-set;
   - then add `beginSessionRenewal`, the handle branch, and `replace_lost_session` in all five consumers (Change Scope table), with tests through the real Team and Org roots (AC-005).
6. Built-server E2E (MS-style), for:
   - a Claude standalone run;
   - a Team member, whose saved session ID does not exist in an isolated `CLAUDE_CONFIG_DIR`;
   - an Antigravity case through the scripted `agy-failure-cli.mjs` with a not-found case added.
   The answer needs a model for Claude: run it behind the live gate, or use the scripted path where it exists (AC-001, AC-005, AC-006).
7. Glossary and docs.

## Key Tradeoffs

- **The Claude eager open on restore** costs a process start at activation instead of at the first input. Both happen within the same user action, and the check is exact (PRB-007).
- **Reusing `runtime_switch`** (D-1) avoids a migration and reader changes, at the cost of a widened word, defined in the glossary.

## Risks

- **RSK-001:** runtime text changes. A miss shows today's error and never a wrong renewal.
- **RSK-002:** DeepSeek's "not resumable" wording.
- **RSK-003:** Claude restore timing. Restart-resume of a run that was busy now opens its process at restore. That is a supported path: verify it in the restart-resume E2E family.
- A wrong renewal would drop a working native session. Prevented by exact recognition and the AC-003 negative tests.

## Guidance For Implementation

- **Reproductions:** `probes/README.md`.
  - PRB-007 for Claude: `node probes/claude-sdk-init.mjs <sdk.mjs> <id> <cwd> $(which claude) <isolated config dir>`. A synthetic transcript makes the present case; no model call.
  - PRB-003, PRB-005 and PRB-008 give the JSON-RPC shapes for the unit fixtures.
- **Fixtures:** synthetic runs only; isolated `HOME`, `CLAUDE_CONFIG_DIR`, `CODEX_HOME` and dsh home. Never touch the founder's `~/.claude`, `~/.codex` or runs.
- **N-1, Grok exactness:** probe `session/resume` of a present Grok session whose workspace folder (cwd) was removed.
  - Use an isolated home, so the founder's `~/.grok` gets no test session. If Grok cannot authenticate in an isolated home, stop and ask the Solution Designer rather than writing to his home.
  - If it answers `FS_NOT_FOUND` too, and `session/new` in that state succeeds, narrow the matcher (for example by `data.detail` or by checking the request's cwd first) and record it.
  - If the fresh session fails as well, a wrong match changes nothing, since no marker is written before the fresh session is valid.
  - Pin the result in a unit test and the investigation notes.
- **AC-005 paths:**
  - a Team member through a real Team root (`FlatTeamAgentExecutionHandle` → `TeamAgentPlatformBindingCommitter`);
  - an Org member through a real Org root (`AgentOrgRun`);
  - a delegated copy through the path it takes (the standalone lifecycle with a member context).
  Built-server E2E for the Team member; unit or integration tests with the real roots for the Org member and the delegated copy.
- **Retry tests (AC-004):** fail after `record` (the commit throws), then a second activation. Assert one marker with the renewal key, one segment, and earlier segments byte-unchanged.
- **Negative tests (AC-003), one per runtime:**
  - an auth error;
  - a network error;
  - an AGY conflict without the not-found line;
  - an ACP error with another code;
  - a Claude initialization rejection with another text.
