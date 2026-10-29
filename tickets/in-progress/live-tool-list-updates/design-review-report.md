# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/live-tool-list-updates/tickets/in-progress/live-tool-list-updates/requirements-doc.md` (approved by the user at SR-001; SR-002 adds DEC-006, DEC-007, the AC-007 detail and application packages in UC-003, within the direction, user informed)
- Upstream Investigation Notes: `…/investigation-notes.md` (E-13…E-18 added)
- Upstream Solution Revision Record: `…/solution-revision-record.md` (SR-001, SR-002)
- Reviewed Design Spec: `…/design-spec.md` (SR-004, Ready)
- Supplemental Task Artifacts Reviewed:
  - `evidence/probe/*`, including the new `drive-codex-reopen.mjs`, `drive-grok-reopen.mjs`, `codex-reopen-*`, `grok-reopen-*` and `*-empty-*`;
  - `follow-ups.md` (FU-001, FU-002).
- Relevant Solution Revision IDs: `SR-001`…`SR-004`
- Architecture Review Revision Record: `…/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-004`
- Current Review Round: `4`
- Trigger: Solution Designer re-review request (SR-004: one owner of the Grok process), 2026-10-29
- Prior Review Round Reviewed: `3` (ARCH-REV-003, Fail: AR-008)
- Latest Authoritative Round: `4`
- Current-State Evidence Basis: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/live-tool-list-updates` @ `9f7c9c10a6` (no source changes; ticket docs uncommitted). Round-1 code citations are still valid. New probe drivers were read. Round 3 also read `acp-agent-run-backend.ts:29-150` and `acp-agent-run-backend-factory.ts:75-200` (preparation owner, `release`, `cleanup`).

## Routing Classification Review

- Task size: `Large` (about 35–45 files); architectural risk: `High`. Confirmed.
- Independent Architecture Review required by the classification: `Yes`

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- SR-002 requirement additions reviewed:
  - DEC-006: one notice per message, tools first.
  - DEC-007: a failed reopen does not send the message.
  - AC-007 detail.
  - UC-003 names application packages.
  - Persisted data `Yes`.

  These are within the approved direction (REQ-006, REQ-010, UC-003). None widens product policy beyond the Task, so a technical review accepts them as the requirements owner recorded them.
- Every prospective blocking `Design Impact` finding is traceable: `Yes`
- Statements about existing code and evidence the design relies on:
  - The SR-002 code rows (E-16, E-17, E-18) match round-1 reads.
  - The probe evidence E-13 matches the Codex sequence: unsubscribe, then resume on the same client.
  - SR-003: the Grok sequence now follows E-14's measured order (end, then spawn and load), so AR-001 is resolved. The cited backend lines match: `handleSessionFailure` (`acp-agent-run-backend.ts:81-85`), the `start_turn`/append refusals (`:87-93`), `terminate` → `shutdown` → `input.cleanup()` (`:124-135`).
  - **Round 3, AR-008 (resolved in round 4):** the backend's `cleanup` is the factory's `release`. Its `releaseResources` closes `owner.session`, `owner.connection` or `owner.process` of the factory's `AcpPreparationOwner` (`acp-agent-run-backend-factory.ts:80-99,196`). The SR-003 sequence installs the new connection and session in the backend only (step 5) and says terminate calls "`cleanup()` as today" (step 7). After a reopen, release would close the already-ended original handles, and the reopened Grok process would never be ended. SR-004 makes the run's `AcpPreparationOwner` (`acp-agent-run-backend-factory.ts:79`; type at `:239-244`) the single holder across creation, restore and reopen. `AcpSessionLauncher` opens into it; the backend reads its handles from it; the reopen clears it, fills it, or empties it on failure. The existing `releaseResources` (`:84-94`) is null-safe (`owner.session?.close()`; connection, else process), so it ends whatever is current.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-002 | Contract | Pass | Pass | Pass: the session is never deactivated during a reopen; empty lists are valid | Confirmed | — |
| BEH-003 | User (preserved) | Pass | Pass | Pass: the skill notice sits behind the composite; DEC-006 defers it at most one message | Confirmed | — |
| BEH-004 | User (preserved) | Pass | Pass | Pass (stop after a reopen ends the current process: SR-004) | Confirmed | — |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `evidence/probe/*` (incl. reopen and empty drivers) | Pass | Pass | Pass | Pass (SR-003 follows E-14) | Pass | — |
| `follow-ups.md` FU-001, FU-002 | Pass | Pass | Pass | Pass | Pass | — |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present | Pass | Feature; four triggers named | — |
| Root cause explicit and evidence-backed | Pass | E-02, E-04, E-05, E-08, E-16 | — |
| Refactor decision explicit | Pass | One run operation, an always-present replaceable session, a composite port | — |
| Supported by concrete sections | Pass | Codex and Grok reopen sequences, composite, signal, store | — |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | One Owner Per Node, In Call Order? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-006 | Change signal, three sources | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-001 | Signal → runs | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Session replace + streams | Pass | Pass | Pass (authority → service) | Pass | Pass (service calls registry, then streams) | Pass | Pass |
| DS-003 | Immediate runtimes | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 | Reopen runtimes | Pass | Pass | Pass | Pass | Pass (Codex: the same preparation and thread object; Grok: the preparation owner holds the process across reopen) | Pass | Pass |
| DS-005 | Notices | Pass | Pass | Pass (composite → sources) | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `AgentRun.applyDefinitionTools` / `getToolNames` | Pass | Pass | Pass | Pass | — |
| `AgentToolMcpRunSessionAuthority` (+ scoped) | Pass | Pass | Pass | Pass | — |
| `AgentRunPlatformNotices` | Pass | Pass | Pass | Pass | `AgentRun` knows only the composite |
| `CodexThreadManager.reopenThread`; `AcpSessionLauncher` | Pass | Pass | Pass | Pass | — |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `tool-list-updates` → agent-execution, agent-definition | Pass | Pass (never backends or `agent-tools`) | Pass | Pass | — |
| backends → run-session authority | Pass | Pass | Pass | Pass | — |
| composite in `agent-execution/domain`, ports only | Pass | Pass | Pass | Pass | — |

## Interface Boundary Verdict

| Interface | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `applyDefinitionTools(definition) → { kind, toolNames }` | Pass | Pass | Pass | Low | Pass |
| `replaceForRun` / `describeForRun` | Pass | Pass (no absence case) | Pass | Low | Pass |
| `takePreface(run, { dispatchKind })` | Pass | Pass | Pass | Low | Pass |
| `AgentDefinitionChangeSignal.notifyChanged/subscribe` | Pass | Pass | N/A (no IDs, by design) | Low | Pass |
| `reopenThread`, `AcpSessionLauncher.open` | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Notice ports | Pass | Pass (extend with the kind) | Pass (composite) | Pass | — |
| Seen record | Pass | Pass (copy of the store rules) | Pass | Pass | — |
| Reopen | Pass | Pass (Codex resume; ACP launch extracted) | Pass | Pass | — |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| all rows of the design's allocation table, including compositions | Pass | Pass | Pass | Pass | — |

Kinds and forms now traced:
- runs with and without tools (the always-present session);
- `start_turn` vs `append_to_active_turn`;
- two notice sources;
- shared, team-local, org-owned and application-owned definitions, plus application packages;
- Codex threads with and without history.

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Composite notice port | Pass | Pass | Pass | Pass | — |
| Seen-record store (copied rules) | Pass | Pass | Pass | Pass | — |
| External backends' `resolve exposure → replaceForRun → kind` | Pass | N/A | Pass | Pass | Recommendation: four external backends share this short sequence. Keep it in one helper if it grows beyond a few lines |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Session record | Pass | Pass | Pass | N/A | Pass | — |
| `seen_tool_names.json` `{ version, toolNames }` | Pass | Pass | Pass | N/A | Pass | — |

Derived consumers of a changed structure listed with a decision for each: `Pass`. Each start-time copy has a decision: Claude exposure and descriptor, Codex `appServerConfig`, the ACP descriptor, the AGY capsule, native `toolInstances`.

Domain vocabulary keeps one meaning per word: `Pass` ("reopen", "turn-start dispatch", "tool exposure").

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Matches Owner? | Re-Tightened? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| every row of the design's Final File Responsibility Mapping | Pass | Pass | Pass | Pass | The scoped authority, host, compositions and feed composition are now included |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `src/tool-list-updates/`, `agent-run-platform-notices.ts`, `acp-session-launcher.ts`, `agent-tools-mcp-session-streams.ts` | Pass | Pass | Low | Pass | — |

## Removal / Decommission Completeness Verdict

| Item / Area | Named? | Replacement Clear? | Scope Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| AGY header + 405; one-shot SSE; `listChanged: false` | Pass | Pass | Pass | Pass | — |
| `not_exposed` + null-descriptor branches (four backends) | Pass | Pass | Pass | Pass | — |
| Claude's cached activation; Agent Tools names in `allowedTools` | Pass | Pass | Pass | Pass | — |
| Dead Codex dynamic-tool path | Pass (FU-002, with evidence E-18) | N/A | Pass | Pass | Accepted as a follow-up: the path spans untouched approval code, and the change adds no use of it |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| All rows of the rejection log | No | Pass | Pass | — |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? | Direct Use, Rebuild, Or Migration Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `<memoryDir>/seen_tool_names.json` (new) | `Directly Usable — No Migration` | Pass: tolerant reads; atomic writes; never creates the folder; "no record = has seen the current list" | Pass | N/A | Pass | — |

## Change / Refactor Sequence Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Steps 1–7 | Pass. The Codex `enabled_tools: []` check comes early, under the escalation trigger | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Present And Clear? | Bad Shape Explained? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Reopen sequences, append vs start, zero tools, two notices | Yes | Pass | Pass | Pass | — |

## Material Premise Validation (Only When Needed)

- MP-001…MP-003 (round 1) are resolved by SR-002, and MP-004 (round 2) by SR-003. All are kept in the revision record. MP-004 is shown below as resolved for reference.

### `MP-004` — The Grok reopen opens a second process on the same session while the first is still alive

- Related requirement: REQ-003 (the conversation kept), REQ-010 / AC-007 (the failure path), BEH-004
- Relevant behavior ID(s): BEH-001 (SCN-002, SCN-004)
- Initiating basis kind: `User`
- Trigger: the user changes a Grok run's tools and sends the next message.
- Forward path: the design's Grok reopen, steps 3–4. `AcpSessionLauncher.open({ mode: "load" })` spawns a new process and calls `session/load` before the old process is ended. On failure, the old process is kept (step 6).
- Lifecycle state at the claimed point: two Grok processes hold the same session. The measured evidence covers only end-then-load (`drive-grok-reopen.mjs:37`). The product's restore path also starts from no live process.
- Material consequence: unknown and not measured. Grok may refuse to load a session that another live process holds, or two processes may write the same session history. The keep-the-old-one-on-failure rule depends on this overlap being safe.
- Reachability: `Reachable`. Every Grok reopen exercises this path; it is the design's own path, not a hypothetical one.
- Review consequence (round 2): AR-001 stays open, narrowed to Grok. **Round 3: resolved.** SR-003 ends the old process before the load (Grok steps 2–4).

### `MP-005` — A Grok run is stopped after a reopen

- Related requirement: BEH-004 (stop and resume), REQ-010 / AC-007 (the restart button is stop + restore)
- Relevant behavior ID(s): BEH-001, BEH-004 (SCN-002, SCN-004)
- Initiating basis kind: `User`
- Trigger: after a Grok run reopened (SCN-002), the user stops it, or clicks "Restart this run with the new tools" (SCN-004).
- Forward path:
  1. `AgentRun` terminate → `AcpAgentRunBackend.terminate` → `shutdown` → `this.input.session.close()` → `this.input.cleanup()` (`acp-agent-run-backend.ts:124-135`).
  2. `cleanup` is the factory's `release` → `releaseResources`, which closes `owner.session` and `owner.connection` (or stops `owner.process`) of the preparation owner captured at creation or restore (`acp-agent-run-backend-factory.ts:80-99,196`).
  3. SR-003 ended those original handles in step 2 and installed new ones in the backend only (step 5).
- Material consequence: the reopened Grok process is left running after stop. With the restart button, a second process is then started by restore. Each reopen followed by a stop leaks one process.
- Reachability: `Reachable` (normal stop after a normal reopen)
- Review consequence: AR-008. **Round 4: resolved by SR-004.**

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

- `Pass`

## Findings

None open. AR-001…AR-008 are resolved (see ARCH-REV-002…ARCH-REV-004 in the revision record).

## Classification

N/A (Pass)

## Recommended Recipient

Implementation Engineer (`/software_engineering_team/implementation_engineer`)

## Residual Risks

- The reopen with a concurrent save is now handled: `reopenPending` is recomputed on success (SR-003, Codex and Grok step 5).
- A Grok reopen failure leaves the run with no runtime session until the next `start_turn` or the restart button. This is specified (step 7) and accepted (DEC-007).
- **Codex `enabled_tools: []`** is checked in step 1 under the escalation trigger.
- **AGY without the header against the product endpoint** has been measured only against the probe; the build confirms it.
- **U-01 / ASM-001 (narrowed by E-13).** Whether the model uses the new tool after a reopen awaits a model turn (DEC-004, accepted).
- **R-01:** runtime version drift.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass` (MP-001…MP-005 are Reachable and resolved by SR-002…SR-004)
- Notes: task_size=Large, architectural_risk=High. Implementation must honor the escalation triggers in the design: Codex `enabled_tools: []`, AGY against the product endpoint, Codex resume config, and Grok load in a new process. It must also honor the Change / Refactor Sequence tests, including the named Grok ownership tests and the skill notice behind the composite.
