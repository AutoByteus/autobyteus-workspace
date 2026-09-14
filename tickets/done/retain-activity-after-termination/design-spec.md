# Design — Retain Activity after termination

## Solution And Approval Basis
ACTIVITY-RETAIN-20260914-001, DS-001 / SR-004. **Ready / Architecture Design Complete.** SR-001 requirements approved explicitly in SR-003: user “now it's clear you can just work on the design ... Make sure that we have a clean design”. REQ/AC-001–004, BEH/SCN-001–004 unchanged. SR-002 personal comparison is evidence, not additional behavior authority. Product N/A.
Workspace `/Users/normy/autobyteus_org/autobyteus-worktrees/retain-activity-after-termination`; branch `codex/retain-activity-after-termination`; fresh bootstrap base `origin/requirements/flat-agent-organization-model` at c208f33dcc3a8a56563a2f132f3de65862e68cab. Eventual same unreleased feature-base target, never personal; no current push/merge/release authorization.

## Current-State Read
Team success-stop marks scope/members inactive then deletes every retained member's Activity. Conversation stays intact. ActivityFeed reads the now-empty per-Agent map; later Send explicitly rehydrates it. Standalone Agent stop already retains Activity. Org stops and then inspects a staged historical view through its own owner. Different addressing/queries are legitimate; deleting history on Team stop is not.

## Task Size And Architectural Risk (Mandatory)
**task_size Small; architectural_risk Low.** One production file, remove one destructive cleanup call and its sole unused dependency. Durable test additions/adjustments and documentation are supporting surfaces. No API, persistence, command eligibility, concurrency, transport, state-model, lifecycle-order or owner relocation. Existing architecture absorbs correction; per-run recent-window limits remain. Container-wide loop already exists; this change simply avoids deletion for all existing entries. Actual parity verification remains required, not a new structural uncertainty or waiver. Escalate Design Impact if parity exposes another source mechanism requiring changes, command safety needs new policy, or stop/restore integration cannot preserve approved outcomes within current owners. Do not silently broaden the direct route.

## Architecture Investigation Evidence
investigation-notes.md INV-001–005 / AINV-001; source pins and screenshot evidence. Team manager/API chain, UI action/store/getter, disconnect and approval ownership checked after approval. No new execution tests claimed. Personal source and historical Org61f633abe/IR-046 explain different evolution; not user historical runtime proof.

## Intended Change
Remove `useAgentActivityStore().clearActivities(agentContext.state.runId)` from successful `terminateTeamRun`. Keep `applyOfflineOrTerminalCleanup(agentContext)` and all surrounding ordering/guards. Remove now-unused useAgentActivityStore import. No replacement fetch, copied map, Activity status rewrite, event-handler replay, remount, fallback cache, or shared stop coordinator.

## Relevant Behavior And Production-Path Map (Mandatory)
| Behavior / REQ / AC | Production path | Design spine / delta |
|---|---|---|
| 001 / 001 | Workspace Stop→Team run store→GraphQL→Team manager→success→retained inactive context→ActivityFeed | DS-001; stop deletion removed |
| 002 / 002 | Agent terminate; Org context stopAndInspect→command→historical inspection publication→same panel | DS-002; unchanged owners, parity coverage |
| 003 / 003 | Composer→Team restore/hydrate→existing Activity commit→exact member send→stream lifecycle | DS-003; unchanged continuation/no duplication |
| 004 / 004 | Stop rejection/error→existing feedback; selected run ID→Activity getter→genuine empty/member content | DS-001/004; unchanged failure and identity routing |

## Relevant Supplemental Task Artifacts
personal-stop-comparison.md (read-only factual supplement), evidence/team-live.png and team-terminated.png (user evidence, no pixel redesign), bootstrap-handoff.md, solution-revision-record.md. Previous ticket done/flat-agent-organization-model-follow-up is preserved context, not this ticket's approval. Independent review artifacts **N/A — not applicable to Small/Low**, subject to current handoff rules. Implementation/API/Delivery artifacts N/A — not yet produced.

## Task Design Health Assessment (Mandatory)
Bug Fix; design issue Yes; root cause **Local Implementation Defect / missing history-preservation invariant**. Runtime teardown in existing correct owner overreaches into retained presentation deletion. **No structural refactor needed**: remove this inappropriate dependency, retain clearActivities API for legitimate discard/test uses. File responsibilities, root identities, existing Activity owner and command boundary remain sound for this delta. No broader architecture debt needs resolution to repair this path. Unexecuted actual parity and incomplete historical runtime knowledge remain explicit validation limits, not reasons to replace container abstractions.

## Terminology / Design Reading Order
Stop = terminate runtime ownership while retaining inspectable workspace. Discard/remove = separate disposal intent; not changed. Activity = per-Agent presentation, not a provider or container lifecycle registry. Read evidence/requirements, then spines/owners, then concrete removal and tests.

## Legacy Removal Policy (Mandatory)
Clean-cut removal of destructive stop-only Activity cleanup and unused store import. No feature flag/compatibility mode for old clearing; no duplicate implementation. Keep shared clearActivities method because actual presentation disposal/testing is a different responsibility. No other file removal justified.

## Persisted Data / State Transition Decision (Mandatory)
**Not Affected.** Only a frontend in-memory deletion is removed. No serialization/raw-trace/schema/physical store change; existing historical projections remain readable. Preserve existing conversation, Activity identity, attachments and drafts; no accepted data loss, reset or migration. Memory remains current recent-window policy per run, not unlimited history. Migration plan N/A. Existing raw-trace source-limited reconstruction on later reload is unchanged, not expanded into a complete event journal.

## Data-Flow Spine Inventory / Primary Execution Spines
- **DS-001 primary termination:** Workspaces/Running Agents Stop → agentTeamRunStore.terminateTeamRun → TerminateAgentTeamRun resolver → TeamRunService/manager termination → success → disconnectTeamStream + inactive root/member cleanup → same selected ActivityFeed reads unchanged Activity. Lifecycle command owner is store/server manager; display owner is Activity store. Failed command takes existing error return, no new cleanup.
- **DS-002 primary parity:** Agent/Org Stop → existing subject command owner → backend termination → retained inactive context (Org then strict inspection/staging/publish) → selected Agent Activity. Do not route Org through standalone Team mutation or vice versa.
- **DS-003 primary continuation:** existing composer → stopped root restore → hydrateRun/current projection builders → commitTeamRunHydrationActivities/context adoption → prepared exact Send → live events → existing Activity update. No special repair required because Stop no longer deletes content.
- **DS-004 return/display:** selected identity → activeContext → ActivityStore.getActivities → ActivityFeed/RunActivityItem. No liveness filter or substitute display list. Current runtime/control status is separate from historical card contents.

## Spine Narratives / Actors / Ownership Map
User action asks lifecycle owner to stop; backend decides success. On success transport owner retires listeners/approval tracking/pending commands. Scope view updates root state; shared per-Agent cleanup updates Offline/submission state, not history. Activity stays in its existing per-run map. Sidebar refresh is not a history-content reload and must not be repurposed as one. Later authoritative projections can still replace content under their existing safeguards.
Main nodes: subject run store = lifecycle orchestration; server manager = actual termination; streaming service = transport/command tracking; context/view = selection and runtime presentation; Activity store = Activity entries/revision/recent window; renderer = read-only display. Off-spine: Apollo transport, existing history sidebar sync, localization and retained hydration builders. No new owner/registry introduced.

## Thin Entry Facades / Public Wrappers
Existing UI action wrappers retained; no new facade needed. They call subject owner, not Activity internals. Actual backend traversal differs by Team/Org membership but no changes to it.

## Removal / Decommission Plan (Mandatory)
One call and import removed in agentTeamRunStore.ts. Tests must stop masking Activity destruction with only a mocked store. Do not remove genuine clearActivities capability or weaken termination duplicate/error tests. No schema/file migration/removal.

## Return Or Event Spines / Bounded Local Spines
Existing disconnect drains commands, unbinds listeners and clears approvalTracker; unchanged. Existing member loop remains under Team store and only applies Offline cleanup. No new loop/retry/poll. Existing Org staged inspection and transport-generation retirement remain intact.

## Ownership Boundaries / Boundary Encapsulation Map / Dependency Rules
UI→subject run/context owner→existing command/transport boundary. Team stop no longer depends on Activity store. Presentation consumers→Activity store; projection writers keep existing guarded replacement API. Forbid stop code directly reading backend trace files, invoking lower-level providers, triggering Send/Restore for display, or importing Org store to imitate its lifecycle. Agent runtime remains execution authority; historical Activity cannot authorize tool execution.

## Interface Boundary Mapping / Check
No interface changes: terminateTeamRun(rootTeamRunId:string):Promise<boolean>; clearActivities(runId) remains a presentation-owner API but no longer stop-owned; getActivities(runId) unchanged. Exact Team root and exact Agent run IDs never substituted for each other. Existing wrappers/manager encapsulation kept.

## Main Domain Subject Naming / Capability Reuse / Subsystem Allocation
Team and Org remain distinct scope subjects. Reuse run-status cleanup, stream retirement, Activity store and renderer, hydration on legitimate continuation. No new shared subsystem, helper/class/DTO/cache or optional-mode type. “Same pattern” means same preservation/control invariants, not a universal container API.

## Draft / Reusable / Shared Structure / Final File Responsibility Mapping
| File | Final responsibility / change |
|---|---|
| autobyteus-web/stores/agentTeamRunStore.ts | Existing lifecycle/commands; remove Activity deletion/import only |
| autobyteus-web/stores/__tests__/agentTeamRunStore.spec.ts | Keep current stop/duplicate/failure checks; eliminate obsolete Activity-clear-only mock if no longer needed |
| autobyteus-web/stores/__tests__/retainedActivityTermination.spec.ts (new or equivalently colocated suite) | Real Activity/context/run owner plus renderer and mocked external boundary; lifecycle preservation and parity regressions |
| autobyteus-web/docs/agent_teams.md | Concise stop-retains-Activity semantics, implementation/delivery-owned documentation sync |
Reusable structures unchanged; no field/schema tightening needed. Test helper reuse permitted for existing contexts, not a new production abstraction. Agent/Org production files explicitly no-change unless separately investigated/revised design.

## Applied Patterns / Target Folder Mapping / Folder Check
Existing Pinia owner and view composition; one-line cleanup correction, no new pattern. Existing stores, colocated tests and docs locations sufficient; no shared folder or package added. Architecture examples/layer diagram N/A beyond explicit spines, as no structural transformation.

## Concrete Example / Shape Guidance
Before stop: retained lead Activity has System instructions + successful send_message_to, conversation includes matching result. After successful stop: same selected run, two existing entries still available and expandable; root stopped/member Offline; no new network history query added by this fix. After genuine new work, normal history hydration and events add/update entries once. If a final runtime event arrives before stream disposal, keep its existing legitimate update rather than demand byte-identical frozen Activity. A historical nonterminal status is not proof a runtime remains live; do not synthesize success/error to resolve it.

## Backward-Compatibility Rejection Log (Mandatory)
Reject flag to preserve old clearing, hidden restore-to-show-history, copy/reload-on-stop workaround, global container-stop abstraction and new durable approval journal. They don't solve an additional approved obligation. Existing Org inspection protections aren't obsolete compatibility code; preserve them.

## Change / Refactor Sequence
1. Add durable regression with real retained Activity and actual termination owner; show existing bug before patch where practical.
2. Remove only destructive call/import.
3. Verify stopped Activity and controls, multi-member identity, failure/duplicate-stop, existing continuation hydration and no duplicate entries.
4. Execute Agent/Org parity checks with their actual owners; if equivalent loss exists beyond this delta, report evidence/Design Impact before expanding source changes.
5. Run focused→relevant broader frontend tests, document actual build/typecheck limits. API owner performs supported frontend journeys with owned isolated services; do not restart user's server. Delivery owns eventual docs/finalization/user verification.

## Validation / Guidance For Implementation
Durable suite must not mock away ActivityStore, termination run owner, retained context or rendered ActivityFeed. Mock Apollo/backend and transport as external boundary; use actual stores and real display where test environment supports. Existing tests are controls, not sole acceptance. Required cases:
- completed tool + System instructions survive successful stop at same focus, including arguments/results/highlight identity and another retained member; true empty third member remains empty, no cross-run bleed;
- rejected/failed stop preserves entries and last-known lifecycle; duplicate stop remains single command;
- no Restore/Send/provider-start command for viewing; stream retired/approval tracker cleared; retained Activity has no command surface and cannot execute an old decision;
- later genuine Send uses existing hydration/commit and does not duplicate old entries; live manual approval regression from previous ticket preserved;
- standalone Agent plus Org direct/mounted equivalent retained content controls, including Org inspection failure retaining last known content under current policy.
Actual API acceptance: capture before/after successful UI Terminate with same selected member and expandable completed/system Activity, no refocus/reload/Send; verify offline/no active provider as applicable; later UI Send and correct new work. Repeat parity placements, record exact build and scope. No arbitrary API-only action as frontend pass, no claim tests/providers already run.

## Key Tradeoffs / Risks
Retaining existing client content avoids unnecessary reads and preserves source-limited live detail while stopped. It is not a final persisted snapshot guarantee. Existing per-run window bounds remain; disposal policy not expanded. Existing configured Team capability labels may keep old inline conversation buttons visually enabled after stop, but command store has no service and cannot activate/send; this change adds no approval surface. Validate no stale execution; broader button UX is not silently redesigned. If actual approved safety or Org/Agent parity cannot be met, return Design Impact with evidence. Unknown historical personal installation remains a factual limit, not a blocker to correcting current source.
