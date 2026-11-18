# Design Spec — autobyteus-446

## Solution And Approval Basis

- Current solution revision ID: `SR-002`
- Approved requirements baseline: `requirements-doc.md` at SR-001, approved by the Solution Designer within the Task's direction, user informed (2026-11-09). The PM was told the cause (bug, not network) the same day.
- Behavior-defining supplements: None.
- User approval of the design: `Not required`
- Design status: `Ready`
- Canonical investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-run-list-follow-446/tickets/in-progress/phone-run-list-follow-446/investigation-notes.md`
- Authorities read (design reading gate, in this conversation 2026-11-08/09): `references/architecture-design.md`, `references/design-principles.md`, `DESIGN.md` (root). No persisted data is affected, so the Data Migration Guideline does not apply.
- Project design-principle conflicts or discrepancies: None.

## Current-State Read

- A standalone agent run that delegated Tasks (the "host", e.g. the Project Task Manager) lists its delegated runs ("task rows") under it in the run list: the phone's `useMobileRunTree.ts:46-48` and the desktop's `AgentRunTaskRows.vue:61-63`. Both read the host's stored collaboration view once (`agentRunCollaborationStore.ensureStoredView`, `:332-334`) and render `taskRows` from its context (`:357-358`).
- Only the window's **selected** host has a live collaboration stream (`useAgentRunCollaborationSync.ts:15-33`, used on the phone at `MobilePairedShell.vue:100` and on the desktop at `AgentWorkspaceView.vue:47`). That stream's `task_executions_closed` / `..._reopened` events update the context's `closed_task_executions` (`agentRunCollaborationContext.ts:181, 191`), and the rows follow at once.
- Every other listed host is refreshed by the history poll (`useRunHistorySectionLoad.ts:51` → `refreshListedStatuses`, `agentRunCollaborationStore.ts:196-233`, autobyteus-426 D-09). The refresh reads `agentRunCollaborationStatuses` (states only: `runId`, `isActive`, `statuses`; server `api/graphql/types/agent-run-collaboration.ts:54-80`, `standalone-agent-run-root-manager.ts:164-169`). It re-reads the view only when the host's active state or its set of children changes. A Task closing changes neither, so the rows stay until the host is opened or the page reloads. Reproduced: still listed after 120 s.
- The node already knows each active host's closed set: `StandaloneAgentRunRoot` builds its view with `closedTaskExecutions: this.taskExecutions.closedTaskExecutions()` (`standalone-agent-run-root.ts:428`). The client's view carries the same list (`closed_task_executions`, contract `agent-run-collaboration-dtos.ts:47`).
- Other host kinds:
  - Org hosts carry `closedTaskExecutions` on every history read (`runHistoryStoreSupport.ts:110-126`): not affected.
  - A Team host lists delegated rows only from a mounted Team context, which its Team stream keeps current (`runHistoryTeamExecutionRows.ts:36-44`). Without a context, the history tree lists members only. Not affected; validation confirms it (Risks).

## Task Size And Architectural Risk (Mandatory)

- Task size: `Medium`
- Size rationale: about 7 production files in three packages:
  - the contracts package: one new function;
  - the server: statuses answer, manager, root accessor;
  - the web client: query, hydration type, store decision;
  
  plus tests. Everything is inside existing owners.
- Architectural risk: `Low`
- Risk rationale: one additive field on an internal GraphQL query between components of the same release (DESIGN.md rule 9: no cross-version compatibility). No persistence, no security, no new concurrency: the existing poll and the existing view re-read are reused. It is a contracts-package change, so the release build check applies (TESTING.md § Fresh-start build).
- Escalation trigger: the digest cannot be computed identically on both sides; the root's closed set differs from the view's; a Team host shows the same gap in validation.

## Architecture Investigation Evidence

| Source | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Reproduction | `evidence/repro-run-1/repro-summary.json` | Open host: 2 ms; listed host: 120 s+; reload: gone | Fix the poll's decision | — |
| Code | `agentRunCollaborationStore.ts:196-233` | Poll re-reads only on active or children change | Add "closed set changed" | — |
| Code | `standalone-agent-run-root.ts:428`, `standalone-agent-run-root-manager.ts:164-169, 429-433` | The root holds the closed set; statuses come from active roots only | Answer a digest for active roots | Inactive hosts: FU-001 |
| Code | `agentRunCollaborationContext.ts:181, 191` | The client's closed set follows live events | Compare digests | — |
| Code | `root-execution-view-dtos.ts:22-26` (contracts, private `referenceKey`), server `task-execution-reference.ts:7` (15 importers), web `taskExecutionClosure.ts:15` (2 importers) | Three copies of the same key function | Digest in the contracts package with the contracts' key | Consolidating the copies is FU-002 |

## Intended Change

The history poll's statuses answer also carries, for each active host, a digest of its closed task executions. The client re-reads a host's view when that digest differs from the digest of its own context's `closed_task_executions`. One function in the contracts package computes the digest on both sides.

## Change Scope (Mandatory)

- In scope: UC-001, UC-002 for standalone agent hosts. Areas:
  - `autobyteus-collaboration-stream-contracts`: the digest function, exported;
  - server: the statuses answer;
  - web: the statuses read and the poll's re-read decision;
  - a probe case for the phone bundle.
- Derived consumers (`agentRunCollaborationStatuses` gains a field): its only client is `readAgentRunCollaborationStatuses` (`agentRunCollaborationHydration.ts:23`), used only by `refreshListedStatuses`; both are updated. Generated GraphQL types (`autobyteus-web/generated/graphql.ts`) are regenerated.
- Deliberately left alone:
  - live streams and the selected-host sync (they work);
  - Org hosts and Team hosts (not affected);
  - the history poll's timing and its phone visibility rule (E-25);
  - the three existing key functions (FU-002);
  - inactive hosts (FU-001).
- Follow-ups: FU-001, FU-002.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Requirement / AC | Trigger | Existing Behavior | Change Or Preserved | Target Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | REQ-003 / AC-004 | Task closed, host open | Live: 2 ms | Preserved | Live stream (unchanged) |
| BEH-002/004 | User | REQ-001 / AC-001, AC-002, AC-006 | Task closed, host listed only | Stale | Rows leave on the next poll | DS-001 |
| BEH-005 | User | REQ-002 / AC-003 | Task reopened, host listed only | Stale | Rows return on the next poll | DS-001 |
| BEH-003, 006 | User | REQ-003 | Reload; Org host | Correct | Preserved | — |
| — | System | REQ-003 / AC-005 | Poll with no change | One batched states read | Preserved: the digests match, no view read | DS-001 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related AC IDs | Relationship | Status |
| --- | --- | --- | --- | --- |
| `evidence/repro/closed-task-rows-repro.mjs` | Reproduction | AC-001, AC-004 | Implementation starts from it failing (`goneAfterMs.other: null`) | Evidence |

## Task Design Health Assessment (Mandatory)

- Change posture: `Bug Fix`
- Current design issue found: `Yes` (small)
- Structural triggers:
  - *Behavior by absence* (Principle 13): today a listed host's closure is noticed only if something else happens (open, reload). It becomes an explicit check of the node's own fact.
  - *Derived data* (Principle 11): "closed" stays the node's fact; the client compares a digest of the node's list with the node's list it already holds (verify, not recompute).
  - *Repeated structure* (Principle 11): the task-execution key exists three times. The digest uses one owner (contracts); consolidating the other copies is FU-002 (untouched files, 17 importers).
  - Ruled out: *Authoritative boundary* (the store keeps calling its hydration service); *Vocabulary drift* (no new domain word; "closed task executions" as in the collaboration model).
- Root cause classification: `Missing Invariant`. The poll's refresh owns keeping listed hosts current but does not cover closures.
- Refactor needed now: `No`. The existing owner absorbs the rule.
- Evidence: the triggers above.
- Design response: extend the existing statuses answer and the existing re-read decision.
- Intentional deferrals: FU-001 (inactive hosts), FU-002 (key copies).

## Terminology

- *Host*: a run that delegated Tasks; *task rows*: its delegated runs in the run list; *closed task executions*: the node's list of a host's delegated runs whose Task is DONE or CANCELLED (collaboration model, autobyteus-380).
- *Closed-set digest*: a short, order-independent fingerprint of a closed list. No project glossary entry needed: it is a code-level detail.

## Legacy Removal Policy (Mandatory)

- Obsolete paths: none. Compatibility wrappers or fallbacks kept: `None`.

## Persisted Data / State Transition Decision

`Not Affected`: nothing stored changes. The digest is computed on demand.

## Data-Flow Spine Inventory

| Spine ID | Scope | Behavior | Start | End | Governing Owner | Why |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-002, 004, 005 | History poll tick (desktop every 5 s; phone list screen every 5 s while shown, at once when shown again) | Task rows updated | `agentRunCollaborationStore.refreshListedStatuses` | The fix |

## Primary Execution Spine(s)

`useRunHistorySectionLoad poll -> agentRunCollaborationStore.refreshListedStatuses(listed active hosts) -> readAgentRunCollaborationStatuses -> GraphQL agentRunCollaborationStatuses -> StandaloneAgentRunRootManager.getAgentStatuses (root states + closedTaskExecutionsDigest(root closed set)) -> answer -> store: digest differs from closedTaskExecutionsDigest(context.view.closed_task_executions)? inspect(host) : applyStatuses -> fresh view -> taskRows -> run list (phone tree / desktop AgentRunTaskRows)`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Nodes | Owner | Off-Spine |
| --- | --- | --- | --- | --- |
| DS-001 | On each poll the store asks the node for the listed active hosts' child states. The node now also returns each active host's closed-set digest. For each answer the store applies the existing checks in order: a hub that changed is skipped; both inactive → nothing; active state or children changed → re-read. It adds one check: the answer's digest differs from the digest of the context's `closed_task_executions` → re-read the view (`inspect`). Otherwise it applies the states, as today. The re-read view lists the closed rows as closed, so they leave the list; a reopened Task's rows return. | poll, statuses answer, store decision, view | `refreshListedStatuses` | `closedTaskExecutionsDigest` (contracts) |

## Spine Actors / Main-Line Nodes

`useRunHistorySectionLoad`, `agentRunCollaborationStore.refreshListedStatuses`, `readAgentRunCollaborationStatuses`, the `agentRunCollaborationStatuses` resolver, `StandaloneAgentRunRootManager.getAgentStatuses`.

## Ownership Map

- **`closedTaskExecutionsDigest`** (contracts) owns the digest: order-independent, deterministic, synchronous. Built from the keys `agent:<agentRunId>` / `team:<teamRunId>` (the contracts' existing `referenceKey`), sorted, then hashed with a small non-cryptographic hash (for example FNV-1a 32-bit), formatted as `<count>:<hex>`. Same input, same string, on node and browser.
- **`StandaloneAgentRunRootManager.getAgentStatuses`** owns the answer per host and adds `closedTaskExecutionsDigest` for active roots. It reads the root's closed set through a public root accessor (the same `this.taskExecutions.closedTaskExecutions()` the view uses at `:428`). Inactive hosts answer `null`.
- **The resolver** maps the field (`closedTaskExecutionsDigest: String`, nullable).
- **`refreshListedStatuses`** owns the re-read decision (one added condition).
- **`readAgentRunCollaborationStatuses`** maps the field into `AgentRunCollaborationStatusesAnswer`.

## Thin Entry Facades / Public Wrappers (If Applicable)

N/A.

## Removal / Decommission Plan (Mandatory)

| Item | Why | Replaced By | Notes |
| --- | --- | --- | --- |
| None | — | — | Dead code in touched files: none found in `agentRunCollaborationStore.ts`, `agentRunCollaborationHydration.ts`, the resolver or the manager's `getAgentStatuses` (reviewed 2026-11-09); implementation re-checks |

## Return Or Event Spine(s)

N/A (the live path is unchanged).

## Bounded Local / Internal Spines

N/A.

## Off-Spine Concerns Around The Spine

| Concern | Spine | Serves | Responsibility | Why | Risk If Misplaced |
| --- | --- | --- | --- | --- | --- |
| `closedTaskExecutionsDigest` | DS-001 | Server answer, client store | One digest function | Identical on both sides | Two copies drifting → endless re-reads or none |

## Ownership Boundaries

The store stays the only caller of the hydration read. The client never decides "closed" itself; it only compares the node's digest with the digest of the node's list it holds.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal | Callers | Forbidden Bypass | Fix |
| --- | --- | --- | --- | --- |
| `agentRunCollaborationStore` | `readAgentRunCollaborationStatuses`, `inspect` | `useRunHistorySectionLoad` | Components re-reading views on their own | — |
| `StandaloneAgentRunRootManager` | the root's task-execution lifecycle | resolver | Resolver reaching into a root's internals | Add a root accessor |

## Dependency Rules

- Server and web both import the digest from `@autobyteus/collaboration-stream-contracts`; neither implements it again.
- The contracts package stays dependency-free apart from `zod`.

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity Shape | Notes |
| --- | --- | --- | --- | --- |
| `closedTaskExecutionsDigest(references: readonly TaskExecutionReferenceDto[]): string` | a closed list | digest | references | Exported from the contracts index |
| GraphQL `AgentRunCollaborationStatusesObject.closedTaskExecutionsDigest: String` (nullable) | one host | the host's closed-set digest | `runId` (existing) | `null` when inactive |
| `StandaloneAgentRunRoot` accessor for its closed task executions | one root | read | — | Same source as `:428` |

## Interface Boundary Check

| Interface | Singular? | Identity Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Digest function | Yes | N/A | Low | — |
| Statuses field | Yes | Yes | Low | — |

## Main Domain Subject Naming Check

| Subject | Name | Natural? | Same Meaning Everywhere? | Drift Risk | Action |
| --- | --- | --- | --- | --- | --- |
| Digest | `closedTaskExecutionsDigest` | Yes | Yes ("closed task executions" as in the contract's `closed_task_executions`) | Low | — |

## Existing Capability / Subsystem Reuse Check

| Need | Existing Capability | Decision | Why |
| --- | --- | --- | --- |
| Noticing a listed host's change | 426 D-09 poll | Extend | Already per-poll, batched |
| Refreshing a host's rows | `inspect` (view re-read) | Reuse | Already used when children change |
| Closed set | Root's `closedTaskExecutions()` | Reuse | Same source as the view |

## Subsystem / Capability-Area Allocation

| Subsystem | Owns | Decision |
| --- | --- | --- |
| `autobyteus-collaboration-stream-contracts` | Digest | Extend |
| `autobyteus-server-ts` standalone root + GraphQL | Answer field | Extend |
| `autobyteus-web` agent collaboration | Read + decision | Extend |

## Draft File Responsibility Mapping

See the final mapping.

## Reusable Owned Structures Check

| Repeated Structure | Shared File | Subsystem | Why Shared | Redundant Removed? | Overlap Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Closed-set digest (needed on node and client) | contracts `root-execution-view-dtos.ts` (beside `referenceKey`) or a new `closed-task-executions-digest.ts` in the contracts package | contracts | Must be identical on both sides | Yes | Yes | A general hashing utility |

## Shared Structure / Data Model Tightness Check

| Structure | One Meaning Per Field? | Redundant Removed? | Overlap Risk | Action |
| --- | --- | --- | --- | --- |
| Statuses answer + digest | Yes | Yes | Low | — |

## Final File Responsibility Mapping

| File | Owner | Concrete Concern |
| --- | --- | --- |
| `autobyteus-collaboration-stream-contracts/src/root-execution-view-dtos.ts` (or new `closed-task-executions-digest.ts`) + `src/index.ts` (Modify/Add) | contracts | `closedTaskExecutionsDigest`; rebuild and commit `dist/` (TESTING.md: the contract packages track `dist/`) |
| `autobyteus-server-ts/src/standalone-agent-run-root/domain/standalone-agent-run-root.ts` (Modify) | root | Public accessor for its closed task executions |
| `autobyteus-server-ts/src/standalone-agent-run-root/services/standalone-agent-run-root-manager.ts` (Modify) | manager | `StandaloneRootAgentStatuses.closedTaskExecutionsDigest: string \| null`; computed for active roots |
| `autobyteus-server-ts/src/api/graphql/types/agent-run-collaboration.ts` (Modify) | resolver | Field and mapping; doc comment updated ("states and the closed-set digest") |
| `autobyteus-web/graphql/queries/collaboratorQueries.ts` + `generated/graphql.ts` (Modify) | query | Ask for the field |
| `autobyteus-web/services/agentCollaboration/agentRunCollaborationHydration.ts` (Modify) | read | Map the field into the answer |
| `autobyteus-web/stores/agentRunCollaborationStore.ts` (Modify, 455 lines; stays < 500) | store | One added re-read condition in `refreshListedStatuses`; doc comment updated |

## Applied Patterns (If Any)

None.

## Target Subsystem / Folder / File Mapping

As above; no new folders.

## Folder Boundary Check

N/A (no new folders).

## Concrete Examples / Shape Guidance

| Topic | Good Example | Bad / Avoided Shape | Why |
| --- | --- | --- | --- |
| Store decision | `if (answer.isActive !== context.isActive \|\| !sameLocalChildren(context, answer) \|\| answer.closedTaskExecutionsDigest !== closedTaskExecutionsDigest(context.view.closed_task_executions)) { void inspect(hostRunId); continue }` | The client decides closure from Task statuses it reads elsewhere | The node owns "closed" (Principle 11) |
| Payload | `"closedTaskExecutionsDigest": "12:9f3a01c2"` | The full closed list on every 5 s poll (it grows with every Task a long-lived PM ever closed) | Small, constant-size answer |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why Considered | Decision | Replacement |
| --- | --- | --- | --- |
| Treat a missing digest as "unchanged" for older nodes | Mixed versions | Rejected (DESIGN.md rule 9) | Clean-cut field |

## Derived Layering

N/A.

## Change / Refactor Sequence

1. Contracts: the digest function with unit tests: order independence; agent vs team keys; empty list; same result as a server/web call on the same input. Rebuild `dist/`.
2. Server: root accessor, manager field, resolver field. Unit test: an active host answers the digest of its closed set; it changes after a Task closes and back after a reopen; an inactive host answers `null`.
3. Web: query and generated types, hydration mapping, store condition. Store unit tests:
   - a differing digest re-reads once;
   - an equal digest applies the states with no re-read (AC-005);
   - an inactive answer re-reads nothing;
   - the live-updated closed set (selected host) yields the same digest as the node's, so no extra re-read.
4. A phone-bundle probe case (new `MSP-*` in `mobile-shell-probe.mjs`, in the shape of `evidence/repro/closed-task-rows-repro.mjs`): AC-001 (≤ 10 s, another run open), AC-003 (reopen), AC-004 (open host ≤ 1 s), AC-006 (hidden, then shown). AC-002 for a desktop window, by the shared-store unit test plus a desktop-window check if the probe's desktop context allows it.
5. Fresh-start build check (contracts package changed): TESTING.md § Fresh-start build.

## Key Tradeoffs

- The poll's pace (≤ 5 s plus one read) instead of instant: no new streams or protocol (DEC-003).
- A digest instead of the list: constant payload; a 32-bit hash collision would delay one refresh until the next change or reload, which is acceptable for display.

## Risks

- Team hosts are classified "not affected" by reading the code. Validation adds one check: a Team member delegates a Task, the Task closes while another run is open, and the rows leave.
- Inactive hosts keep stale rows until reload (FU-001); rare (a Task closed while its PM run is stopped).

## Guidance For Implementation

- Reproduction to start from: `node /Users/normy/autobyteus_org/autobyteus-worktrees/phone-run-list-follow-446/tickets/in-progress/phone-run-list-follow-446/evidence/repro/closed-task-rows-repro.mjs --output-dir=<fresh> --wait-s=120`, after `pnpm -C autobyteus-server-ts build` and `pnpm -C autobyteus-web build:mobile-web`. Today: `goneAfterMs.other: null`. After the fix: ≤ 10 000.
- Use the contracts' existing `referenceKey` inside the digest (`root-execution-view-dtos.ts:25`), so the server's and web's local key copies (FU-002) do not matter for equality.
