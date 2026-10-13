# Design — Settings saved model refresh

## Solution And Approval Basis
- Package `settings-saved-model-refresh`; current solution revision **SR-002**; design **Ready**.
- Approved intent: requirements-doc.md **SR-001**, Solution Designer within Task direction; user informed 2026-10-13 in message beginning “The code points to a missing refresh …”. No changed intended behavior in SR-002. Behavior supplements N/A.
- Canonical evidence: `/Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/investigation-notes.md`.
- Authorities read in full 2026-10-13: supplied solution-designer references/architecture-design.md, references/design-principles.md, design template; task-worktree DESIGN.md, TESTING.md, root/web/server AGENTS.md. RELEASE.md also read for finalization context. No closer web DESIGN found. Conflicts: none; generic web architecture prose still mentions Python whereas source is TS, so source governs factual runtime map.

## Current-State Read / Intended Change
E-02..10 establish the bug path: successful delegated Save clears draft overlays; stopped Agent-root rows fall back to old collaboration-view records. Reload only refreshes host metadata. Active parent has a stream checkpoint path, Team/Org canonical reads include their delegated trees. No backend persistence change is justified.

**Complete the stopped Agent Settings canonical read model with the authoritative collaboration tree and closed-task list.** Render its stopped rows from that Settings snapshot (as Team/Org do), rather than from a runtime view which no stopped Save refreshes. Keep active Agent rendering on its live collaboration view. Settle successful Save only after canonical readback; reuse refresh/error UI when readback fails. This is a settings data refresh fix, not a second runtime context or cache.

## Change Scope
- UC-001..003: stopped canonical Settings loading/Save/readback/retry, delegated editor rows and feedback; focused regression/probe coverage.
- Deliberately unchanged: server persistence/services, mutation API, stream messages/checkpoint implementation, Team inheritance/selection resolution, defaults, runtime starts/stops, sidebar/chat hydration, provider calls, closed-task policy. Team/Org save paths get only shared settlement handling and regression checks, not a new snapshot mechanism.
- Follow-ups: none newly confirmed. Prior feature observations are not reopened. Out-of-date unrelated general architecture prose is not part of this fix.

## Task Size And Architectural Risk
- **task_size: Medium** — bounded renderer/store/type change across about 5 production files plus colocated tests and existing browser/desktop proof. No new subsystem.
- **architectural_risk: Low** — current Settings owner absorbs one missing read-model portion; existing read-only GraphQL contract returns it already; no persistence, security, public API, runtime concurrency, lifecycle or deployment contract changes. Existing target/request/node guards are reused for local async result ownership. Internal snapshot and save settlement shape changes stay in the existing editor boundary.
- Payload evidence: existing DTOs, small ticket/test fixtures. Structural delta: canonical Settings load/row source and Save settlement; no shared contracts/dist or backend writers.
- Escalate to Solution Designer and reclassify if reproduction shows authoritative API/persistence stale, if fix needs mutation protocol/stream sequencing or runtime lifecycle changes, data transformation, new cross-file transaction semantics, or broad hydration refactor. Do not quietly broaden direct route.

## Architecture Evidence
E-02/E-04: row-source vs loader mismatch → add stopped Agent snapshot.
E-06/E-07: scoped read-only network client validates root and never resumes → reuse it.
E-05/E-10: full collaboration inspect hydrates every child's history and live service has checkpoint authority → do not force full context inspection/stream attach to update Settings.
E-03/E-13: success announced before canonical publication, void loaders catch errors → explicitly check settled read outcome and use existing refresh-needed surface.
E-09: effective launch calculation already correct → no duplicate Team/member model merge logic.
E-11/E-12: assertion gap → fail-before/pass-after rendered row coverage and stopped-parent desktop journey.
Runtime reproduction remains to be executed by Implementation; source reasoning is not labelled a runtime pass.

## Relevant Behavior / Production-Path Map
| Behavior | Approved intent / AC | Supported trigger | Target path / lifecycle |
|---|---|---|---|
| BEH-001 | REQ-001/002, AC-001/002/004 | Stopped parent Settings → edit Agent/Team/member → Save | DS-001 mutation then DS-002 canonical read, rows from snapshot, same-view settled success. Repeated edits start from new canonical. |
| BEH-002 | REQ-003, AC-003 | Cancel, rejected Save, or failed post-commit readback | DS-003: no write on Cancel; retain draft for rejected write; committed write + read failure is refresh-required, read-only retry. |
| BEH-003 | REQ-004/005, AC-005/006 | Existing stop/edit/message lifecycle | DS-001 preserves existing backend guards; DS-002 never connects/resumes; existing active stream path remains authority for live Agent rows. |

## Supplemental Context
Screenshots at absolute paths in investigation inventory are observational evidence. Prior completed package `tickets/done/delegated-copy-model-change/` supplies scope/background and reusable tests, not validation of this patch. Product Design/independent review artifacts **N/A — not applicable** until routing establishes otherwise.

## Task Design Health Assessment
- Posture: Bug Fix. Root cause: **Local Implementation Defect** (incomplete post-save Settings read model), not a storage defect demonstrated by runtime evidence.
- Structural issue: no subsystem redesign needed. ExistingRunConfigStore already owns canonical stopped-run editing; Agent implementation omits collaborators which are present in Team/Org snapshots. Extend that existing responsibility.
- Triggers considered: capability reuse applies (readAgentRunCollaboration); boundary bypass avoided (no mutation of collaboration contexts or backend stores); duplicate policy avoided (existing row builders); legacy pressure absent (one stopped source, no stale fallback); no shared DTO looseness or new generic coordinator needed.
- Refactor needed now: **No broad refactor**. Bounded canonical-load/readback reuse across load/retry is required so no metadata-only retry path survives for stopped Agent Settings. File placement remains existing settings/store/type ownership.
- No deferred refactor required to make this ticket coherent. Local snapshot adds no persistence and dies with current draft. Full history hydration was considered and rejected as unrelated work on the Save critical path.

## Terminology
Canonical snapshot = backend-confirmed Settings data for the currently selected exact root, not an optimistic draft and not an attached live runtime. Mutation accepted = backend reports success; displayed saved = required canonical readback has also been applied.

## Legacy Removal / Persisted Data Decision
Replace stopped Agent row dependency on cached runtime collaboration view with the canonical Settings snapshot; **no fallback to old view if its read fails**. Retain active stream reading because it is a supported different lifecycle, not a legacy compatibility path.
Persisted data **Not Affected** by this delta: existing save service already writes and verifies optional user selections in current per-run trees; read-only projection is added to renderer memory only. Formats, semantics, version handling, writers/readers and stored conversations unchanged. No migration, reset, backup scheme or startup gate. If that assumption changes, return for migration-convention investigation/design instead of altering storage.

## Spine Inventory, Execution And Narratives
| ID / kind | Start → end | Governing owner / why |
|---|---|---|
| DS-001 Primary | Settings row change → editor / delegated draft → existing GraphQL mutation → DelegatedLaunchSelectionService → stopped root manager write/readback → success outcome | Server owns validation/persistence, editor coordinates one Save; preserves original product path. |
| DS-002 Return/read | Successful outcome → editor canonical reconciliation → ExistingRunConfigStore → parent resume read + stopped Agent collaboration query (Team/Org existing tree read) → sync snapshot → delegated row builders → same open Settings saved state | Settings owns the display baseline. Accepted values, including following-member effective choices, replace overlays only after authoritative publication. |
| DS-003 Primary/error | Cancel or Save failure → delegated draft/error state → existing Settings error/refresh action → canonical load → refreshed rows | Editing owner distinguishes no-write/rejected-write from committed-but-unrefreshed. Retry performs reads only. |
| DS-004 Existing return/event | Active-root save → delegated_launch_selections_changed → live collaboration checkpoint → live context → active Settings rows | Unchanged live owner; do not attach/restore to make stopped Save work. |

Narrative: user changes one exact instance; current server validates all submitted choices and records them. Because the stopped parent has no live publication, Settings explicitly rereads its canonical data. That snapshot flows through the existing launch-rule functions to editor and summary. A failed mutation retains the user's draft; a readback failure after an accepted write does not pretend the write failed or was rolled back. The view is locked/marked refresh-needed, and retry completes the same read path without another mutation. Cancel before Save still just drops drafts.
Bounded local state sequence: **editing → mutation pending → canonical read pending → clean/saved**; alternatives **editing+save error** or **committed+refresh needed → read retry → clean**. Existing store request IDs and node binding gate late completion; no new queue/event-loop subsystem.

## Owners, Boundaries And Dependencies
- ExistingRunConfigEditor owns presentation composition and combined configured/delegated Save; use its existing Save/Refresh entrypoints for orchestration.
- ExistingRunConfigStore owns the canonical Settings draft/read state and refresh result, including new stopped Agent snapshot; do not write runtime collaboration contexts from this store.
- delegatedLaunchDraftStore owns per-root unsaved choices and mutation pending/result; its success must be conditional on completed required reconciliation, not just transport return.
- `readAgentRunCollaboration` is the existing public read-only query-client function; it owns transport/schema/root correlation. Reuse it without calling `stageAgentRunCollaborationContext`. If isolated from the hydration module to keep imports narrow, move the existing function without duplicate readers and update its current imports; no new endpoint.
- Existing row builders/contracts own Team/member effective configuration policy; no new inheritance arithmetic in stores/components.
- agentRunCollaborationStore/streaming service owns live context/history. Unchanged; stopped Settings does not need to refresh conversations to display model choices.

Allowed: editor → stores; canonical store → read-only clients; row builder → existing contract launch helpers. Forbidden: optimistic draft written into canonical backend DTO, options catalog treated as saved config, settings calling attach/send/restore, editing store internals to fake a runtime view, full run-history reload to refresh one root.

## Interface And State Design
1. Extend `ExistingAgentModelConfigDraft` with a required nullable `delegatedSnapshot` (name may follow local convention), containing only `execution_tree` and `closed_task_executions` from the existing AgentRunCollaborationViewDto. Null means the canonical query reported no collaboration package, not “query failed”. Do not retain communication messages/history for Settings.
2. Agent canonical load reads parent resume metadata and, for a stopped parent, the collaboration view via the existing network-only no-dedup client. Stage results then publish a single internally consistent draft. Capture target/load request and window binding; stale responses cannot replace another run/node's draft. Copy the snapshot safely (existing clone helpers), never mutate Apollo or runtime context objects.
3. Canonical reload and retry must use the same complete Agent read path. Existing `syncAgentCanonical` calls for root-only saves must preserve the same-root snapshot or explicitly obtain a fresh one; they must never silently erase it or carry it into another run. Active parent remains live-view-backed; when lifecycle transitions to stopped, canonical loading establishes its stopped snapshot rather than falling back to stale live data. Preserve established lifecycle locks.
4. In delegatedRows: Agent + stopped uses draft snapshot; Agent + active uses existing collaboration context; Team/Org unchanged. Keep snapshot closure filtering, exact IDs, Team follower calculation and model schema formatting through existing builders. No snapshot means no delegated rows only when the query successfully returned null.
5. Keep mutation and readback phases distinct in combined Save. The editor supplies required canonical reconciliation to the delegated save operation (a typed async callback/result is sufficient; no service framework). `saving`/edit lock covers both phases. On successful readback, clear originals/edits and publish success; the next edit's original is the refreshed canonical value. Do not treat fulfillment of today's void/catching reload as success: return a truthful internal status or explicitly check same-target loaded/error state.
6. If write fails/refuses, retain edits and error, no canonical success. If write succeeded but readback fails, clear the *committed* edits as unsaved work, suppress success, preserve/mark last view as unverified or show loading-error, and expose the existing Refresh action with wording distinguishing saved-but-not-refreshed. Root configured drafts included in that successful mutation likewise must not be offered as uncommitted work. Refresh retries reads only. Use the existing reconciliation-required state; avoid two competing retry state machines. Ensure retry is also reachable if draft is null (current fallback has no button).
7. Respect current root/request ownership at all awaited boundaries, including unmount/navigation; an old completion cannot clear/set success on another root. Reuse local request tokens/node binding conventions, not a new global concurrency mechanism.

All identities remain explicit: `{rootKind, rootRunId}` and `agent:<id>`/`team:<id>`; network APIs unchanged. Internal snapshot fields have one meaning; no shared DTO changes. Full active-save event behavior remains unchanged; regression tests must catch any accidental effect of shared settlement changes.

## Off-Spine Concerns / Capability Reuse
| Concern | Owner served | Decision and purpose |
|---|---|---|
| Model options/schema/formatting | Settings row builder/store | Reuse existing options/schema/labels; fresh choices do not replace authoritative config. |
| Snapshot parser/network query | Canonical store | Reuse existing Agent collaboration query client, exact-root validation. |
| Localization | Existing UI | Reuse existing refresh text/action or add minimal translated save-readback error through existing localization conventions. |
| Regression fixtures | Implementation/API-E2E | Reuse existing fake CLI and delegated probe; never use user's runtime data. |

## File Responsibility And Target Mapping
Existing layout stays clearer than a new subsystem; draft/final responsibility mapping is identical for this small extension. No new shared structure extraction is needed beyond a tightly typed Settings snapshot.

| Change | Path under workspace | Concrete responsibility / exclusions |
|---|---|---|
| Modify | `autobyteus-web/types/agent/ExistingRunModelConfigDraft.ts` | Agent stopped Settings snapshot shape. No wire/schema change. |
| Modify | `autobyteus-web/stores/existingRunConfigStore.ts` | Complete Agent canonical load/sync, request/binding ownership. |
| Modify as required for common path | `autobyteus-web/stores/existingRunConfigResultActions.ts`, `existingRunConfigEditActions.ts` | Canonical retry/reload uses complete read and truthful outcome. No unrelated error policy redesign. |
| Modify | `autobyteus-web/components/workspace/config/ExistingRunConfigEditor.vue` | Correct stopped row source; Save/reconciliation and retry wiring/error fallback. |
| Modify | `autobyteus-web/stores/delegatedLaunchDraftStore.ts` | Defer settled success until reconciliation, protect committed-vs-unsaved state and same-root pending lifecycle. |
| Modify only if needed | `autobyteus-web/components/run-settings/ExistingRunSettings.vue`, applicable localization resources | Existing error/refresh affordance sufficient for post-commit failure; no normal-path redesign. |
| Optional move of existing read function, not duplicate | `autobyteus-web/services/agentCollaboration/agentRunCollaborationHydration.ts` → narrow query-client file in same folder | Only if import responsibility needs separation. Keep hydration behavior unchanged. |
| Modify/Add focused tests | matching `__tests__` for editor/config/delegated stores; existing run-settings tests | Assert actual canonical rows/state, errors, retry, repeated edits, target identity, stopped/active/root-kind differences. |
| Extend test only | `autobyteus-web/tests/e2e/delegated-launch-defaults-probe.mjs` or focused sibling using its setup | Durable stopped-parent Save without navigation regression; source-current isolated-app proof additionally required. |
| Documentation/evidence | ticket folder; focused feature docs only if behavior description changes | No ticket-specific additions to global TESTING.md. |

Folder boundaries: store domain/control, component presentation orchestration, service read transport, type read-model. Low mixing risk; no new persistence-provider files. Applied pattern: existing canonical draft/snapshot, not new cache.

## Removal / Decommission Plan
- In this change remove stopped Agent rows' old runtime-view source and replace it with one canonical snapshot path. Active lifecycle path remains intentional.
- Replace metadata-only Agent retry for this editor with complete canonical read; no parallel “fallback works after reopen” route.
- Update misleading save/discard comments and mocked tests which assert only reload invocation; replace with visible-state assertions.
- No confirmed dead exported code found in inspected in-scope files. Implementation must remove newly unused imports and any demonstrated dead code in touched modules, with reachability evidence; unrelated cleanup becomes follow-up.
- Compatibility wrappers/fallbacks: **None**. Optimistic permanent local override or stale runtime-view fallback rejected: hides readback errors and can be wrong for following members/accepted normalization.

## Concrete Example / Tradeoffs
Stored A → draft B → server accepts B → canonical snapshot contains B → draft removed → rows still B. For Team B, follower rows derive B from stored Team selection; an own-choice member C stays C.
Avoid: remove draft → cached runtime tree A → show Saved. Also avoid: copy submitted B into every member or attach a stopped runtime solely to get a stream event.
One extra scoped Agent collaboration read is required for stopped canonical Settings loading; existing query returns the tree/messages, but only the tree/closure part is retained. This bounded work avoids N child history/artifact hydration calls and all unrelated roots. No measured performance promise or API redesign warranted.

## Change Sequence / Verification Guidance
1. Before production edits, reproduce with a stopped Agent parent and durable failing rendered-state assertion. Establish mutation/readback has B while mounted row remains A; record exact source and evidence. If false, return Design Impact.
2. Implement complete canonical read/snapshot + row source, then Save settlement/retry with no optimistic persistent overlay.
3. Test current and second edits; settings-only thinking/fast; Agent/Team/member cases including followers/own overrides/unrelated copies; Cancel/refused/write failure/readback failure+retry; root/node navigation while pending; no attach/resume. Exercise existing live-parent and Team/Org tests unchanged in intent. Assert rendered values, not only store method calls.
4. API/E2E executes browser + **actual source-current isolated desktop** stop parent → gear → edit → Save → inspect **before leaving Settings**, with real backend mutation/readback on owned data. No provider inference/quota; scripted runtime/control setup allowed and must be documented. Never substitute a browser-only or installed old-app screenshot for desktop proof. Record source/build identity, commands, responses, DOM/assertions, supporting screenshots, no unrelated-target changes and owned cleanup.
5. Delivery reads RELEASE.md; finalizes on origin/personal using isolated worktree and refreshed base. **No release** unless the user separately requests it. Return tested limitations and finalization/cleanup receipt to Solution Designer for terminal verification and exact Task Manager return.

## Risks / Gates
Reproduction still needs runtime confirmation; static evidence is not product test proof. New snapshot must survive root-only sync without leaking across root/node; retry must not skip collaboration read; error view must not hide the only retry action. Shared active Save behavior must stay correct; do not replace stream authority or force stopped reads into live contexts. Backend partial mixed-host update semantics remain existing truthful errors, not a new transaction project. No blocking product decisions remain.
