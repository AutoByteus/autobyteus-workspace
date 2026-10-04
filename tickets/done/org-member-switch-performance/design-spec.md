# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-003`
- Approved requirements baseline / revision and user-approval reference: `requirements-doc.md` as of SR-003, approved by the user on 2026-10-04 (quote in requirements Document Status). Option A (DEC-001) approved; producer side excluded (DEC-002); mobile excluded (DEC-003); targets accepted (DEC-004).
- Behavior-defining supplements and their approval references: None. The approved message-list mockup from the conversation is reproduced in *Concrete Examples* below.
- Design status: `Ready`
- Canonical investigation-notes path: `/Users/normy/autobyteus_org/autobyteus-worktrees/org-member-switch-performance/tickets/in-progress/org-member-switch-performance/investigation-notes.md`

## Current-State Read

On every member switch (and every new live message), the right-side Messages surface does work proportional to the **total number of reference files** of the focused member (BEH-001, BEH-005):

1. `CollaborationMessagesSection` (count header) and `CollaborationMessagesPanel` (list) each call `messages.listMessages()`, so the perspective is projected twice.
2. For Org and standalone-agent roots, every reference is projected through `projectAgentOrgReference`, which eagerly computes a crypto-js SHA-256 `referenceId`. That was about 750 ms per projection for 41,965 references.
3. The Panel renders a button and an `Icon` for every reference of every message (188,589 DOM nodes).

Ownership is otherwise healthy. The context views own the perspective, the Section owns the header and composition, the Panel owns list and detail interaction, and `projectAgentOrgReference` owns the Org reference-identity contract shared with the server (`sha256hex(messageId + "\0" + path)`). No boundary is bypassed. The problem is eager work, plus a layout that assumed few files per message.

A throwaway spike of the core mechanics (`probes/minimal-spike.patch`) measured 26–82 ms per switch and 254 ms for "Show all 3,136" on the user's data.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Small`
- Size rationale and supporting evidence: Four production files in one existing capability area: `agentOrgReferenceProjection.ts`, `CollaborationMessagesSection.vue`, `CollaborationMessagesPanel.vue`, and the en/zh-CN `workspace.ts` locale entries (two new keys each). Plus updates to three existing spec files. No new modules, stores, services or abstractions. The spike diff was about 20 lines.
- Architectural risk: `Low`
- Risk rationale and supporting evidence: No API, GraphQL, REST, persistence, security, concurrency, deployment or ownership-boundary change. The server reference-ID contract is preserved byte-for-byte; only *when* the client computes the ID changes. The Panel gains one prop from its only parent (verified sole caller). The visible change is the approved Option A.
- Escalation trigger if implementation or validation discovers new impact: If any production code needs a reference ID for undisplayed references, or QR-001/QR-003 cannot be met without virtualization, caching or reactivity changes (`markRaw`/`shallowRef`), stop and return a Design Impact. Do not add that machinery under this classification.

## Architecture Investigation Evidence

| Source / Command / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Reproduction harness | `probes/measure.mjs`, `evidence/switch-Org-results.json`, `evidence/switch-Files-results.json` | Org tab 3.2–4.2 s vs Files tab 5–51 ms | Fix is confined to the Messages surface | Electron vs headless ratio (UNK-002) |
| CPU profile | `evidence/switch-Org-profile-summary.txt` | 2 × ~750 ms `listMessages` (crypto-js) + ~1.3–1.8 s render | Both on-demand IDs and bounded rendering are required | — |
| Spike 2 | `probes/minimal-spike.patch`, `evidence/spike2-*` | 26–82 ms switches; Show all 254 ms | Simple mechanics suffice; no virtualization or caching | — |
| Consumer inventory | investigation notes, Architecture Investigation Findings | Panel has one caller. Hashing has two call sites through one owner | Single-owner changes cover Org, Team and standalone roots | — |
| Server contract | `autobyteus-server-ts/src/agent-org-execution/services/agent-org-reference-content-service.ts:32-33,72-73` | Server recomputes the same hash to resolve | Keep the hash input and format exactly | — |

## Intended Change

1. **On-demand reference identity.** `projectAgentOrgReference` returns the same frozen `TeamReferenceFile` shape, but `referenceId` is a memoized getter. The hash is computed the first time the ID is read and never for references nobody displays or opens.
2. **One list computation per view.** `CollaborationMessagesSection` computes the rows once and passes them to the Panel. The Panel no longer calls `listMessages()`.
3. **Bounded reference rendering (approved Option A).** Every message row shows a paperclip file count when it has references. Only the selected message lists its references under it: the first 20, then a "Show all N files" button that renders the rest. Unselected messages render no reference rows.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / Intent And AC IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | REQ-001, REQ-002, REQ-005 / AC-001, AC-002, AC-003 | Click a member row with the Org tab open | 3.2–4.2 s (investigation BEH-001) | ≤ 200 ms; ≤ 50 reference rows; one projection; no IDs for undisplayed refs | DS-001 |
| BEH-002 | User | REQ-008 / AC-006 | Click a member row with another tab open | 5–51 ms | Preserved | Unchanged path (Panel not mounted) |
| BEH-003 | User | REQ-002, REQ-003, REQ-008 / AC-002, AC-004, AC-005, AC-006 | View messages | All refs inline under all messages | Count on every row; refs only under the selected message, 20 + Show all; order, count header, auto-selection and detail preserved | DS-001 (render step) |
| BEH-004 | User | REQ-004 / AC-004 | Click a reference row | Viewer opens via sha256 ID | Same content; ID computed on demand | DS-002 |
| BEH-005 | System | REQ-006 / AC-007 | New collaboration message on a live run | Full re-hash + re-render | One cheap re-projection; no IDs for history; keyed patch renders ≤ the visible reference rows | DS-003 |
| BEH-006 | User | REQ-007 / AC-008 | Team / standalone Messages | Same unbounded panel | Same bounded rendering (shared Section/Panel); standalone root also gains on-demand IDs | DS-001 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related Requirement / AC IDs | Relationship To This Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| `probes/measure.mjs` | End-to-end switch timing harness | AC-001, AC-002, AC-006 | Regression and acceptance harness | Evidence only |
| `probes/measure-spike.mjs` | Harness + "Show all" timing | AC-005 | Acceptance harness for QR-003 (expects `data-test="team-communication-show-all-references"`) | Evidence only |
| `probes/minimal-spike.patch` | Throwaway feasibility diff | — | Reference for mechanics only. Implementation follows this design (count on every row, Section single computation, localization), not the patch verbatim | Evidence only |

## Task Design Health Assessment (Mandatory)

- Change posture: `Performance` (with an approved visible `Behavior Change`)
- Current design issue found: `Yes`
- Root cause classification: `Local Implementation Defect`. The owners and boundaries are correct. The defects are eager identity derivation inside the correct owner, a duplicated consumer-side call, and an unbounded render loop.
- Refactor needed now: `No`
- Evidence: Investigation notes (profile, consumer inventory) and the spike.
- Design response: Remove eager work at the existing owners. The Section becomes the single consumer of `listMessages()`, which removes a duplicate call rather than adding a cache.
- Refactor rationale: Memoization, `markRaw`/`shallowRef` on the org view, incremental live updates and list virtualization were considered and **rejected as unnecessary**. The spike meets all targets without them, and they would add machinery that future readers must maintain (user guidance against over-engineering, SR-002).
- Intentional deferrals and residual risk: (1) The producer side keeps generating large reference lists. It is out of scope (DEC-002) and owned by the agent package project. (2) The 10 MB org view payload at open is unchanged. (3) Mobile `MobileTeamMessages` is unchanged (DEC-003). None of these affects the in-scope behavior.

## Terminology

- *Reference preview limit*: the number of reference rows initially shown under the selected message (20).

## Design Reading Order

Standard order; the mappings below are proportionate to a small local change.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: Remove the Panel's direct `messages.listMessages()` call and the eager hash in `projectAgentOrgReference`. Remove rendering of reference rows for unselected messages. Keep no toggle, flag or "classic inline" mode.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Decision: `Not Affected`. No stored data, schema or serialization changes. Reference IDs are derived, never stored.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001, BEH-003, BEH-006 | Sidebar member click | Bounded Messages render | `CollaborationMessagesSection` (list) / `CollaborationMessagesPanel` (render) | The reported freeze |
| DS-002 | Primary End-to-End | BEH-004 | Reference row click | File content in viewer | `projectAgentOrgReference` (ID) + server content service | Identity contract must hold with on-demand derivation |
| DS-003 | Return-Event | BEH-005 | Live communication-message event | Panel patch | `AgentOrgExecutionContext.applyEvent` → Section | Live path must stay bounded |

## Primary Execution Spine(s)

- DS-001: `Sidebar member row → agentOrgContextsStore.select → AgentOrgExecutionContext.selectedTarget/messagesView → activeContextStore.activeWorkspaceTarget → RightSideTabs → CollaborationOverviewPanel → CollaborationMessagesSection (listMessages ×1) → CollaborationMessagesPanel (count per row; selected message: ≤20 reference rows)`
- DS-002: `Reference row click → Panel.selectReference → reference.referenceId (hash on first read) → messages.referenceContentPath → CollaborationMessageReferenceViewer → REST agent-org-runs/:id/communication/messages/:mid/references/:rid/content → AgentOrgReferenceContentService (same hash) → file`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Selecting a member yields a new messages view. The Section projects the member's perspective once, and reference records carry no precomputed hash. The Panel renders all message rows with counts, and reference rows only for the selected message, capped at 20 until "Show all". | messages view, perspective rows, reference records | Section / Panel | Localization of the count label and Show-all copy |
| DS-002 | Clicking a reference reads its `referenceId` for the first time, which computes and memoizes the same server-compatible hash. The viewer requests content by that ID. | reference record | `projectAgentOrgReference`; server content service | — |
| DS-003 | A new live message replaces the org view. The target and messages view recompute, the Section re-projects once (cheap: no hashing), and Vue patches keyed rows. Reference rows stay bounded by the selected message's visible slice. | org view, perspective rows | `AgentOrgExecutionContext` → Section | Show-all state survives same-message updates |

## Spine Actors / Main-Line Nodes

Messages view (`listMessages`), `CollaborationMessagesSection`, `CollaborationMessagesPanel`, `projectAgentOrgReference`, `CollaborationMessageReferenceViewer`.

## Ownership Map

- `projectAgentOrgReference`: owns the Org/standalone reference record and the server-compatible identity rule. After the change it also owns *when* the identity is derived (first read, memoized).
- `CollaborationMessagesSection`: owns the single perspective computation for its view, the count header, and handing rows to the Panel.
- `CollaborationMessagesPanel`: owns list/detail interaction, the preview limit, Show-all state and selection.
- Context views (org/team/standalone): unchanged; they still own `listMessages()` semantics.

## Thin Entry Facades / Public Wrappers (If Applicable)

N/A — none introduced.

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope | Notes |
| --- | --- | --- | --- | --- |
| Eager `sha256(...)` in the `projectAgentOrgReference` object literal | Only displayed/opened references need IDs | Memoized `referenceId` getter in the same function | In This Change | Same output value |
| `CollaborationMessagesPanel`'s `props.messages.listMessages()` call | Duplicate projection | `rows` prop from Section | In This Change | — |
| Reference `v-for` under every message | Unbounded DOM | Selected-message-only, sliced list | In This Change | — |

## Return Or Event Spine(s) (If Applicable)

DS-003 as described above. No new event handling.

## Bounded Local / Internal Spines (If Applicable)

Panel Show-all state: `selected message changes OR focused member/root changes → showAll = false`; `Show-all click → showAll = true`; a same-message live update leaves it unchanged.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Localization keys (en, zh-CN) | DS-001 | Panel | Count accessible label; "Show all {{count}} files" | Localization literal audit; bilingual UI | Hard-coded literals fail `audit:localization-literals` |

## Ownership Boundaries

The context views remain the authoritative source of perspective rows. The Section is the only component that calls `listMessages()`. The Panel depends on the rows prop for the list and on the view only for identity data (`memberIdentityByAgentRunId`, `focusedAgentRunId`, `rootRunId`, `rootKind`) and `referenceContentPath`. That is an existing, non-overlapping use and not a bypass.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `projectAgentOrgReference` | crypto-js hash, memoization | Org perspective, standalone collaboration context | Computing the hash anywhere else in the client | Extend this function only |
| `CollaborationMessagesSection` | single `listMessages()` call | `CollaborationOverviewPanel` | Panel or other children calling `listMessages()` again | Pass more derived data from Section |

## Dependency Rules

- Only `CollaborationMessagesSection` calls `CollaborationMessagesContextView.listMessages()` within the collaboration components.
- No client code other than `projectAgentOrgReference` derives Org reference IDs.
- Do not add stores, caches, watchers on the org view, or reactivity opt-outs for this change.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `CollaborationMessagesPanel` props `{ messages: CollaborationMessagesContextView; rows: readonly CollaborationMessagePerspectiveRow[] }` | Focused member's messages | Render list/detail | rows already filtered to the focused member | `rows` is new and required |
| `projectAgentOrgReference(ownerId, filePath, timestamp): TeamReferenceFile` | One Org reference | Record + on-demand ID | messageId + absolute path | Signature and return shape unchanged |
| REST reference content route | One reference's content | Unchanged | `sha256hex(messageId\0path)` | Unchanged |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Panel props | Yes | Yes | Low | — |
| `projectAgentOrgReference` | Yes | Yes | Low | — |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Preview constant | `REFERENCE_PREVIEW_LIMIT` | Yes | Low | — |
| Show-all state | `showAllReferences` | Yes | Low | — |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Reference ID | `agentOrgReferenceProjection.ts` | Extend | Already the identity owner | — |
| Count/preview UI | `CollaborationMessagesPanel.vue` | Extend | Already owns list rendering | — |
| Single list computation | `CollaborationMessagesSection.vue` | Extend | Already owns the count header | — |
| Icon | `@iconify/vue` `Icon` (`heroicons:paper-clip`) | Reuse | Existing icon system | — |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/services/agentOrgExecution` | Reference identity | DS-002 | Org + standalone perspectives | Extend | — |
| `autobyteus-web/components/workspace/collaboration` | List computation and bounded rendering | DS-001, DS-003 | Section, Panel | Extend | — |
| `autobyteus-web/localization/messages` | Copy | DS-001 | Panel | Extend | — |

## Draft File Responsibility Mapping

Same as the final mapping. No shared structure extraction is warranted.

## Reusable Owned Structures Check

N/A. No repeated structure is introduced. `TeamReferenceFile` is reused unchanged.

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Parallel / Overlapping Representation Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `TeamReferenceFile` | Yes | Yes | Low | Unchanged. `referenceId` stays a string-valued property, now provided by a getter for Org records |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/services/agentOrgExecution/agentOrgReferenceProjection.ts` (Modify) | agentOrgExecution | Reference identity owner | Memoized on-demand `referenceId` | Existing owner | `TeamReferenceFile` |
| `autobyteus-web/components/workspace/collaboration/CollaborationMessagesSection.vue` (Modify) | collaboration | Section | `rows = computed(() => props.messages.listMessages())`; header count from `rows.length`; pass `:rows` | Existing owner | — |
| `autobyteus-web/components/workspace/collaboration/CollaborationMessagesPanel.vue` (Modify) | collaboration | Panel | `rows` prop; count indicator per row; selected-only reference list; `REFERENCE_PREVIEW_LIMIT = 20`; Show-all state and reset | Existing owner | — |
| `autobyteus-web/localization/messages/en/workspace.ts`, `.../zh-CN/workspace.ts` (Modify) | localization | — | Two new keys each | Existing catalogs | — |
| `autobyteus-web/components/workspace/collaboration/__tests__/CollaborationMessagesPanel.spec.ts` (Modify) | tests | — | New behavior and updated selection flows | — | — |
| `autobyteus-web/components/workspace/collaboration/__tests__/CollaborationOverviewPanel.spec.ts` (Modify) | tests | — | Single `listMessages()` call per view; count header | — | — |
| `autobyteus-web/services/agentOrgExecution/__tests__/agentOrgReferenceProjection.spec.ts` (Modify) | tests | — | Hash on demand, memoized, server-equal | — | — |

## Applied Patterns (If Any)

Lazy memoized property (getter) on a frozen record, local to `projectAgentOrgReference`. Vue does not proxy frozen (non-extensible) objects, so the getter has no reactivity interaction.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/services/agentOrgExecution/agentOrgReferenceProjection.ts` | File | Identity owner | Reference record + on-demand ID | Existing | Caches beyond the per-record memo |
| `autobyteus-web/components/workspace/collaboration/` | Folder | Messages surface | Section/Panel changes | Existing | Store-level caching or virtualization libraries |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? | Mixed-Layer Or Over-Split Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `components/workspace/collaboration` | Mixed Justified (UI) | Yes | Low | Existing layout |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

Approved message-list shape (DEC-001):

```
▸ Validation status            📎 3,261   ← selected
    dirty-work.tar.gz
    git-status.txt
    … (first 20 reference rows)
    [Show all 3,261 files]
▸ CRR-017 Source Review Pass   📎 2,914   ← no reference rows
▸ Implementation complete      📎 2,883
▸ Informational                (no files → no indicator)
```

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| On-demand ID | `let id: string \| null = null; return Object.freeze({ get referenceId() { return id ??= sha256(`${ownerId}\0${filePath}`).toString() }, path, type, createdAt, updatedAt })` | `referenceId: sha256(...)` in the literal (eager), or a module-level `Map` cache keyed by path | Same value and shape, no work until read, no global cache to manage |
| Single computation | Section: `const rows = computed(() => props.messages.listMessages())`, `<CollaborationMessagesPanel :messages="messages" :rows="rows" />` | Panel and Section each calling `listMessages()`, or a memoizing wrapper around the view | Removes the duplicate instead of caching it |
| Bounded render | `v-if="isMessageSelected(message)"` around the reference list; `v-for` over `showAllReferences ? refs : refs.slice(0, REFERENCE_PREVIEW_LIMIT)` | A virtual-scroll library or rendering hidden rows with CSS | Measured sufficient (254 ms for 3,136) |
| Show-all reset | `watch([selectedMessageId, () => props.messages.focusedAgentRunId, () => props.messages.rootRunId], () => { showAllReferences.value = false })` | Resetting on every `rows` change (would collapse during live updates) | Live updates must not collapse an expanded list |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Setting/flag to keep "all references inline" | Preserve the old look | Rejected | Option A replaces it |
| Panel fallback to `messages.listMessages()` when `rows` is absent | Ease test migration | Rejected | `rows` is required; tests pass it |

## Derived Layering (If Useful)

N/A.

## Change / Refactor Sequence

1. `agentOrgReferenceProjection.ts`: change to a memoized getter. Extend its spec: the ID equals the Node `createHash('sha256')` output; crypto-js `sha256` is not called before the first read and is called once across repeated reads (use `vi.mock('crypto-js/sha256', …)` with a spy wrapping the real implementation).
2. `CollaborationMessagesSection.vue`: compute `rows` once; header uses `rows.length`; pass `rows` to the Panel.
3. `CollaborationMessagesPanel.vue`: add the required `rows` prop and replace `displayMessages`' source. Add the per-row count indicator (`Icon heroicons:paper-clip` + number, localized accessible label, `data-test="team-communication-reference-count"`) on every message with ≥ 1 reference, including the selected one. Render the reference list only for the selected message with `REFERENCE_PREVIEW_LIMIT = 20`. Add the Show-all button (`data-test="team-communication-show-all-references"`, label `t('…TeamCommunicationPanel.show_all_references', { count })`) only when references exceed the limit and `showAllReferences` is false. Add the reset watch per the example. Keep existing `data-test` names for the message and reference rows.
4. Locale keys in **en** and **zh-CN** (`workspace.components.workspace.team.TeamCommunicationPanel.*`):
   - `reference_count_label`: en `"{{count}} reference files"`; zh-CN `"{{count}} 个引用文件"`
   - `show_all_references`: en `"Show all {{count}} files"`; zh-CN `"显示全部 {{count}} 个文件"`
5. Update the specs: Panel tests select the message before clicking its reference (approved behavior). Add tests for the count on every row, no reference rows for unselected messages, a 20-row preview with Show all for > 20 references, Show-all reset on message/member change, and Show-all kept across a same-message `rows` update. Overview/Section test: `listMessages` called exactly once per view.
6. Run `pnpm audit:localization-literals`, `pnpm guard:localization-boundary`, the affected vitest suites, and type-check.

## Key Tradeoffs

- **Two clicks to open a file of a non-selected message** (select, then file). Accepted as part of the approved Option A.
- **"Show all" renders every row without virtualization** (254 ms for 3,136). Within QR-003. Virtualization is deferred unless real data exceeds the target.
- **The memoized getter is slightly less obvious than a plain field.** It is contained in one function with a one-line comment, which is cheaper than an API or contract change.

## Risks

- A future consumer that iterates `referenceId` over all references (e.g. a dedupe pass) would reintroduce hashing. Mitigated by the dependency rule and the projection test asserting no hashing before read.
- Headless timing may understate Electron cost (UNK-002). Validation should spot-check in Electron.

## Guidance For Implementation

- Follow this design, not the spike patch verbatim: the spike lacks Section single computation, the count on the selected row, localization and the reset-on-root rule.
- Do not introduce caches, stores, watchers on the org view, `markRaw`/`shallowRef`, virtualization, or server/API changes. If targets are not met without them, return a Design Impact (see escalation trigger).
- Acceptance measurement: rebuild the production frontend and rerun `probes/measure.mjs` / `probes/measure-spike.mjs` against an isolated snapshot backend. Setup is described in investigation notes, Runtime findings. The snapshot is at `/tmp/org-switch-repro/data` and reproducible from the user's data via the investigation notes. Expect every switch ≤ 200 ms, ≤ 50 reference rows after a switch, and Show all ≤ 300 ms.
