# Design Spec

## Current-State Read

The current backend/token ledger already separates the important usage subjects:

- `getAgentRunTokenUsageSummary(runId)` returns one agent run summary.
- `getTeamRunTokenUsageSummary(teamRunId)` returns team aggregate usage.
- `getTeamMemberTokenUsageSummary(teamRunId, memberAgentRunId?, memberRouteKey?)` returns a focused member usage summary.
- `tokenUsageMeterStore` stores run summaries separately from team summaries and live `TOKEN_USAGE_UPDATED` events update both the member run and the team aggregate.

The frontend presentation layer mixes those subjects in the team workspace:

- `TokenUsageMeterPanel.vue` computes `teamSummary` whenever the selected subject is a team and `focusedMemberSummary` from `activeContextStore.activeAgentContext.state.runId`.
- It then sets `primarySummary = teamSummary ?? focusedMemberSummary`, so team aggregate wins over the focused member summary for all team selections.
- It renders the focused member summary only in a lower `Focused member` card with `Member tokens` and `Member cost`, creating two simultaneous scopes in one panel.
- `TeamWorkspaceView.vue` renders `TokenUsageHeaderChip` with only `teamRunId`, so the top-header chip is also team-aggregate-biased. `AgentWorkspaceView.vue` also renders the same chip for single-agent workspaces.

This conflicts with the rest of the right-side workspace tabs (`Files`, `Activity`, `Artifacts`), which are focused-member scoped in team workspaces. It also clutters the top header with low-detail token/cost data that the user explicitly wants removed.

## Intended Change

1. Remove the compact token/cost chip from workspace top headers.
2. Make the right-side Token tab primary section resolve to exactly one focused run summary:
   - single-agent workspace -> selected agent run;
   - team workspace -> currently focused leaf member's agent run.
3. Preserve the existing detailed Token Meter hierarchy for the primary focused run: `Current prompt`, `Gross input`, `Output`, `Total estimate`, `Input breakdown`, and `Pricing details`.
4. Replace the old lower `Focused member` card with a secondary `Team` section in team workspaces:
   - compact per-member rows/cards;
   - each visible leaf member shows input tokens, output tokens, total tokens, and estimated total cost/status;
   - optional input/output cost details when available;
   - optional clearly labeled `Team total` row/card using the aggregate summary.
5. Require implementation-time running-app visual validation with realistic token data and evidence.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix / Behavior Change / UI Cleanup
- Current design issue found (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue, plus local presentation responsibility drift in `TokenUsageMeterPanel.vue`.
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes
- Evidence: Current UI chooses team aggregate as primary while focused-member summary is secondary, even though the visible workspace focus is a member. The header chip duplicates low-detail token usage and is misleading/noisy in team workspaces. Backend boundaries are already correct, so the defect is the frontend scope owner/presentation boundary.
- Design response: Add a focused token-usage scope resolver for the Token tab, split the secondary team comparison into its own presentational component, remove the header chip, and delete/decommission obsolete mixed-scope UI.
- Refactor rationale: Keeping the old `teamSummary ?? focusedMemberSummary` branch and merely relabeling it would preserve the wrong authoritative boundary. The Token tab needs one selected primary subject plus an explicitly separate team comparison section.
- Intentional deferrals and residual risk, if any: No backend batch query is required in this change. Per-member team rows can hydrate through existing run/member summary queries. If future teams become large enough for N summary queries to be expensive, add a backend batch summary query later.

## Terminology

- `Primary focused run summary`: the detailed summary shown in the main Token Meter section.
- `Team summary section`: a compact comparison section under the primary focused run for team workspaces.
- `Team total`: optional aggregate row/card inside the Team section, never the primary summary while a member is focused.

## Design Reading Order

1. selected token-usage subject spine
2. primary focused run detail
3. team per-member comparison section
4. header chip removal
5. file responsibilities and migration

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove the old `Focused member` subsection and remove/decommission `TokenUsageHeaderChip` usage from workspace headers.
- Treat removal as first-class design work: do not keep a hidden aggregate-primary path for team member focus.
- Decision rule: the design is invalid if team-member focus continues to use the parent team aggregate as primary Token Meter data.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Workspace selection/focus | Primary Token Meter detail | Token usage workspace scope resolver | Chooses the authoritative run summary for the visible Token tab. |
| DS-002 | Primary End-to-End | Active team context | Team per-member summary rows | Team token usage summary component/composable | Replaces the confusing Focused Member card with useful team comparison. |
| DS-003 | Primary End-to-End | Workspace header render | Clean header without token chip | Workspace header components | Removes noisy/misleading low-detail header usage. |
| DS-004 | Return-Event | Live token usage event / GraphQL hydration | Updated primary/team rows | `tokenUsageMeterStore` | Keeps live and persisted usage convergent without frontend recomputation. |

## Primary Execution Spine(s)

- DS-001: `Workspace selection -> TokenUsageWorkspaceScope -> tokenUsageMeterStore summary hydration -> TokenUsageMeterPanel primary detail -> User`
- DS-002: `Active team context -> Team member row resolver -> tokenUsageMeterStore per-member summary hydration -> TeamTokenUsageSummary -> User`
- DS-003: `AgentWorkspaceView / TeamWorkspaceView -> header identity/status/actions -> clean header render`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The Token tab asks the workspace scope resolver for the current primary run subject. For single-agent selection it returns the selected agent run. For team selection it returns the focused leaf member run from `AgentTeamContext.focusedMemberRouteKey`. The meter store hydrates that run summary and the panel renders the existing detailed Token Meter hierarchy from that one summary. | Workspace selection, focused member, run summary, Token Meter detail | Token usage workspace scope resolver | GraphQL fetch, live update store, formatting |
| DS-002 | In team workspaces, the team summary resolver enumerates visible leaf member contexts, maps each to a run ID/route key and focused status, hydrates member summaries, and renders a compact comparison table/list. A team total can appear as a subordinate row/card. | Team context, leaf member, member summary row, Team section | Team token summary component/composable | Member display names, loading states, cost formatting |
| DS-003 | Workspace headers stop requesting token summaries. Agent and team headers render identity, status, mode controls, settings/actions only. | Workspace header, header controls | Agent/team workspace views | Removed component and stale localization/docs |
| DS-004 | Live usage events and GraphQL summary fetches keep `tokenUsageMeterStore` updated. UI components observe store summaries only and never recalculate authoritative tokens or prices. | Token event, meter store, summary consumer | `tokenUsageMeterStore` | Event dedupe, server-owned cost fields |

## Spine Actors / Main-Line Nodes

- Workspace selection / focused member state
- Token usage workspace scope resolver
- Token usage meter store
- Token Meter primary detail
- Team token summary section
- Workspace header components

## Ownership Map

- `AgentTeamContext.focusedMemberRouteKey`: owns which team member is visually/behaviorally focused.
- Token usage workspace scope resolver: owns mapping current workspace selection to primary token usage subject.
- `tokenUsageMeterStore`: owns frontend storage/hydration of server-owned run/team summaries and live event merging.
- `TokenUsageMeterPanel.vue`: owns page-level Token tab layout only; it must not own subject-selection policy beyond consuming the resolver.
- `TeamTokenUsageSummary.vue`: owns compact team comparison presentation.
- Workspace header views: own header layout; no token usage responsibility after this change.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| GraphQL summary queries | `TokenUsageLedgerStore` | Fetch server-owned summaries. | Frontend pricing/accounting policy. |
| `TokenUsageMeterPanel.vue` | Token usage scope resolver + meter store | Render Token tab. | Team/member subject resolution policy duplication. |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| `Focused member` subsection in `TokenUsageMeterPanel.vue` | Focused member becomes the primary detail, so this card is backwards/confusing. | Primary focused run detail + `TeamTokenUsageSummary.vue` | In This Change | Remove labels `Focused member`, `Member tokens`, `Member cost` from Token tab. |
| `TokenUsageHeaderChip` usage in `AgentWorkspaceView.vue` | User wants clean top header; token detail belongs in Token tab. | Right-side Token tab | In This Change | Remove import and template usage. |
| `TokenUsageHeaderChip` usage in `TeamWorkspaceView.vue` | Misleading aggregate scope and header clutter. | Right-side Token tab | In This Change | Remove import and template usage. |
| `TokenUsageHeaderChip.vue` component | No remaining workspace use after header removal. | N/A | In This Change if no references remain | Delete if `rg TokenUsageHeaderChip` has no remaining needed usage. |
| Obsolete localization keys used only by deleted chip (`headerTokenSuffix`, `headerTitle`, `headerTitleWithTokens`) | Dead UI copy after component deletion. | N/A | In This Change if unused | Keep shared estimate suffix keys used by settings. |
| Docs claiming TokenUsageHeaderChip powers usage display | No longer true. | Delivery docs sync | Follow-up by delivery engineer | Implementation can update if nearby docs are touched; final docs sync owns durable docs. |

## Return Or Event Spine(s) (If Applicable)

- Live event return spine: `Server TOKEN_USAGE_UPDATED -> tokenUsageHandler -> tokenUsageMeterStore.applyTokenUsageUpdated -> primary detail/team rows rerender`.
- Hydration return spine: `GraphQL get*TokenUsageSummary -> tokenUsageMeterStore.fetch*Summary -> primary detail/team rows rerender`.

## Bounded Local / Internal Spines (If Applicable)

- Token tab local fetch cycle inside `useTokenUsageWorkspaceScope`:
  - `watch primary run id/member row run ids -> fetch missing/stale summaries -> update local loading/error state -> consume meter store summaries`.
- This cycle is bounded to the Token tab and must not become a generic run-history hydration owner.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Number/cost formatting | DS-001, DS-002 | Token UI components | Format tokens/cost/status consistently. | Shared by primary and Team section. | Duplicated formatting and inconsistent labels. |
| Loading/error row state | DS-002 | Team summary section | Show per-member fetch state without blocking primary detail. | Per-member hydration can happen independently. | Primary Token Meter could flicker or block on all members. |
| Member display presentation | DS-002 | Team summary section | Reuse member display names/labels from existing team presentation. | Keeps row labels consistent with workspace. | Token section could invent mismatched member labels. |
| Visual validation evidence | DS-001, DS-002, DS-003 | Implementation handoff | Prove UI looks good in running app. | UI quality is not proven by unit tests alone. | Layout regressions ship unseen. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Server token summaries | `TokenUsageLedgerStore` + GraphQL summary queries | Reuse | Already exposes run/team/member summaries. | N/A |
| Frontend summary state | `tokenUsageMeterStore` | Extend lightly | Already stores/fetches run/team/member summaries; may only need caller/composable orchestration. | N/A |
| Team focus identity | `agentTeamContextsStore` / `AgentTeamContext.focusedMemberRouteKey` | Reuse | Existing focused-member owner. | N/A |
| Team member labels | `useTeamMemberPresentation` / member nodes | Reuse | Existing UI naming/avatar logic. | N/A |
| Team comparison UI | Workspace usage components | Create New component | Current panel lacks team row comparison and would become too large if embedded. | Existing `TokenUsageMeterPanel` should stay page layout, not own row table detail. |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Web workspace usage UI | Token tab layout, primary detail, team summary section, formatting | DS-001, DS-002 | Token Meter panel | Extend | Add team summary component and formatting helper. |
| Web workspace header UI | Agent/team header layout | DS-003 | Agent/team workspace views | Modify | Remove token chip. |
| Web token usage state | Summary hydration and live updates | DS-001, DS-002, DS-004 | Token UI | Reuse/extend | Existing store likely sufficient. |
| Server token usage ledger/API | Summary source of truth | DS-004 | Frontend store | Reuse | No server change by default. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/composables/useTokenUsageWorkspaceScope.ts` | Web workspace usage UI | Token usage subject resolver | Resolve primary run, enumerate team member rows, trigger summary hydration. | Keeps selection/fetch policy out of presentation. | `TokenUsageRunSummary` |
| `autobyteus-web/components/workspace/usage/TokenUsageMeterPanel.vue` | Web workspace usage UI | Token tab page | Render primary focused detail and mount Team section. | Page-level layout only. | Composable + formatter |
| `autobyteus-web/components/workspace/usage/TeamTokenUsageSummary.vue` | Web workspace usage UI | Team comparison presentation | Compact per-member rows/cards and optional team total. | Avoids bloating main panel. | Formatter |
| `autobyteus-web/components/workspace/usage/tokenUsageFormatting.ts` | Web workspace usage UI | Usage display formatting | Shared token/cost/status formatting helpers. | Needed by primary and Team section. | N/A |
| `autobyteus-web/components/workspace/agent/AgentWorkspaceView.vue` | Web workspace header UI | Agent header | Remove chip import/render. | Header owns its own layout. | N/A |
| `autobyteus-web/components/workspace/team/TeamWorkspaceView.vue` | Web workspace header UI | Team header | Remove chip import/render. | Header owns its own layout. | N/A |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Token/cost/status display formatting | `components/workspace/usage/tokenUsageFormatting.ts` | Web workspace usage UI | Primary panel and team rows need same display rules. | Yes | Yes | A pricing calculator. |
| Team member token row shape | `useTokenUsageWorkspaceScope.ts` exported interface | Web workspace usage UI | Component needs focused flag, member identity, summary/loading/error. | Yes | Yes | A replacement for `AgentTeamContext`. |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `TokenUsageTeamMemberRow` | Yes | Yes | Low | Fields should be `memberRouteKey`, `displayName`, `runId`, `isFocused`, `summary`, `loading`, `error`; do not embed full team context. |
| Formatting helpers | Yes | Yes | Low | Helpers format server-owned values only; no cost math. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/composables/useTokenUsageWorkspaceScope.ts` | Web workspace usage UI | Token usage subject resolver | Compute primary run subject; provide `primarySummary`, `teamRows`, optional `teamTotalSummary`, loading/error state; trigger fetches. | Centralizes scope/fetch policy. | `TokenUsageRunSummary`, row type |
| `autobyteus-web/components/workspace/usage/TokenUsageMeterPanel.vue` | Web workspace usage UI | Token tab page | Render detailed focused primary Token Meter using existing hierarchy; render `TeamTokenUsageSummary` for team contexts. | Keeps page layout. | Composable + formatter |
| `autobyteus-web/components/workspace/usage/TeamTokenUsageSummary.vue` | Web workspace usage UI | Team comparison section | Render compact table/list rows with focused badge, input/output/total tokens, total cost/status, optional details and team total. | Presentation split by concern. | Row type + formatter |
| `autobyteus-web/components/workspace/usage/tokenUsageFormatting.ts` | Web workspace usage UI | Formatting helper | Format compact/exact tokens, cost, percent, status labels/classes. | Avoids duplicating display policy. | Localization function passed in or imported via composable carefully |
| `autobyteus-web/components/workspace/usage/TokenUsageHeaderChip.vue` | Web workspace usage UI | Obsolete header chip | Delete if no references remain. | Removal. | N/A |
| `autobyteus-web/components/workspace/agent/AgentWorkspaceView.vue` | Web workspace header UI | Agent header | Remove token chip. | Clean header. | N/A |
| `autobyteus-web/components/workspace/team/TeamWorkspaceView.vue` | Web workspace header UI | Team header | Remove token chip. | Clean header. | N/A |
| `autobyteus-web/components/workspace/usage/__tests__/TokenUsageMeterPanel.spec.ts` | Web test coverage | Token tab coverage | Add focused-team primary and Team section assertions. | Existing component coverage owner. | Test fixtures |
| `autobyteus-web/stores/__tests__/tokenUsageMeterStore.spec.ts` or composable test | Web test coverage | Store/composable coverage | Add row hydration/scope resolver coverage if composable logic is nontrivial. | Protects scope logic. | Test fixtures |

## Ownership Boundaries

The authoritative token data boundary remains server ledger -> GraphQL -> `tokenUsageMeterStore`. The UI may select which summary to show, but may not recalculate summaries.

The authoritative focus boundary for team UI is `AgentTeamContext.focusedMemberRouteKey`. The Token tab must use that same focus as the other member-scoped tabs and must not bypass it by using `selectedRunId` team aggregate as primary.

Workspace headers no longer own token visibility. They should not fetch token summaries or render token cost labels.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `tokenUsageMeterStore` | GraphQL summary fetches, live event merge, run/team summary maps | Token tab components/composables | Components summing token/cost fields directly. | Add store/composable helper, not local math. |
| `AgentTeamContext.focusedMemberRouteKey` | Focused member state and member context map | Token scope resolver | Token panel using team aggregate because `selectedType === team`. | Resolve focused member explicitly. |
| Workspace headers | Header identity/status/actions | Workspace shell | Header fetching/rendering token summaries. | Move token visibility to Token tab. |

## Dependency Rules

Allowed:

- `TokenUsageMeterPanel.vue` may depend on `useTokenUsageWorkspaceScope`, `TeamTokenUsageSummary.vue`, and formatting helpers.
- `useTokenUsageWorkspaceScope` may depend on selection/team/active context stores and `tokenUsageMeterStore`.
- `TeamTokenUsageSummary.vue` may depend on formatting helpers and receive row data via props.
- Workspace headers may depend on status/presentation/action components, not token usage summaries.

Forbidden:

- `TokenUsageMeterPanel.vue` must not set `primarySummary = teamSummary ?? focusedMemberSummary` or equivalent aggregate-first logic.
- Team-member focus must not use parent team aggregate as primary Token Meter data.
- Frontend must not compute authoritative token totals or prices from rows.
- Header components must not import or render `TokenUsageHeaderChip` after this change.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `useTokenUsageWorkspaceScope()` | Current token usage UI subject | Resolve primary summary and team rows. | Current stores; no external ID argument. | UI composable boundary. |
| `fetchAgentRunSummary(runId)` | Agent run summary | Hydrate one run. | `runId` | Use for primary and known member run IDs. |
| `fetchTeamMemberSummary({teamRunId, memberAgentRunId?, memberRouteKey?})` | Team member summary | Hydrate a member when route/run identity needs team context. | `teamRunId` + run ID or route key | Use for historical/route fallback if needed. |
| `fetchTeamRunSummary(teamRunId)` | Team aggregate | Optional team total row. | `teamRunId` | Never primary while member focused. |

Rule:
- Do not use one generic team-selected branch to choose between member and aggregate. The subject must be explicit.

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `useTokenUsageWorkspaceScope` | Yes | Yes | Low | Return explicit `primarySubject.kind` and `runId`; no aggregate fallback. |
| GraphQL member summary | Yes | Medium | Medium | Prefer run ID when available; route key only with teamRunId. |
| Team section rows | Yes | Yes | Low | Row identity is member route key + run ID. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Primary detail | `Primary focused run summary` | Yes | Low | Use internally; UI remains existing Token Meter labels. |
| Secondary section | `Team` | Yes | Low | UI heading should be `Team`, not `Focused member`. |
| Header chip | `TokenUsageHeaderChip` | No longer needed | Medium | Remove/decommission. |

## Applied Patterns (If Any)

- Composable pattern: `useTokenUsageWorkspaceScope` owns local UI state derivation and summary hydration orchestration for the Token tab.
- Presentational component pattern: `TeamTokenUsageSummary.vue` renders rows from props and does not fetch data or own focus policy.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/workspace/usage/` | Folder | Web workspace usage UI | Token tab components/helpers. | Existing Token Meter location. | Header layout code. |
| `autobyteus-web/components/workspace/usage/TokenUsageMeterPanel.vue` | File | Token tab page | Focused primary detail + Team section mount. | Existing panel owner. | Subject selection duplication or large team row table. |
| `autobyteus-web/components/workspace/usage/TeamTokenUsageSummary.vue` | File | Team comparison section | Compact member rows and optional total. | Same usage feature folder. | GraphQL fetching or store mutation. |
| `autobyteus-web/components/workspace/usage/tokenUsageFormatting.ts` | File | Formatting | Shared token/cost/status formatting. | Same feature folder; not global enough for shared utilities. | Pricing math. |
| `autobyteus-web/composables/useTokenUsageWorkspaceScope.ts` | File | Token tab scope resolver | Resolve primary/team row summaries and fetch state. | Composables already own reusable view logic. | Presentation markup. |
| `autobyteus-web/components/workspace/usage/TokenUsageHeaderChip.vue` | File | Obsolete | Delete/decommission. | No longer a valid UX element. | N/A |
| `autobyteus-web/components/workspace/agent/AgentWorkspaceView.vue` | File | Agent header | Remove chip. | Header layout owner. | Token summary rendering. |
| `autobyteus-web/components/workspace/team/TeamWorkspaceView.vue` | File | Team header | Remove chip. | Header layout owner. | Token summary rendering. |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `components/workspace/usage` | Mixed Justified UI feature folder | Yes | Low | Existing compact feature folder; component/helper split is enough. |
| `composables/useTokenUsageWorkspaceScope.ts` | Off-Spine Concern | Yes | Low | View-state orchestration reusable only by Token tab. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Team member primary | `focusedMemberRunId -> primarySummary -> Gross input/Output/Total cards` | `teamSummary ?? focusedMemberSummary` | Prevents aggregate from silently overriding focus. |
| Team section row | `solution_designer | Focused | In 5.3M | Out 25.4k | Total 5.33M | $5.2176 est` | `Focused member: 5.33M / $5.2176` | Team section should compare members, not repeat primary. |
| Header | `Avatar + title + status + mode controls + actions` | `Avatar + title + status + 329.3k tok / $0.2313 + controls` | Keeps header clean and avoids low-detail token noise. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep aggregate primary and relabel focused member card | Minimal code change | Rejected | Focused member becomes primary; lower card becomes Team summary. |
| Keep header chip but correct it to focused member | Would preserve click shortcut | Rejected | Remove chip entirely; Token tab owns detail. |
| Keep both `Focused member` and new Team section | Would reduce removal risk | Rejected | Old section is confusing and redundant. |
| Add frontend cost summing for team rows | Avoid backend/store work | Rejected | Use server-owned summaries only. |

## Derived Layering (If Useful)

- UI view layer: `TokenUsageMeterPanel.vue`, `TeamTokenUsageSummary.vue`, workspace headers.
- UI state/composable layer: `useTokenUsageWorkspaceScope.ts`.
- Frontend store/API layer: `tokenUsageMeterStore`, GraphQL query documents.
- Server authoritative data layer: `TokenUsageLedgerStore`.

Higher UI layers must not bypass the store/API layer to calculate usage.

## Migration / Refactor Sequence

1. Add formatting helper if needed and move reusable formatting out of `TokenUsageMeterPanel.vue` without changing behavior.
2. Add `useTokenUsageWorkspaceScope.ts` to resolve primary run summary and team member rows.
3. Change `TokenUsageMeterPanel.vue` primary summary to use the resolver's focused run summary.
4. Remove old `Focused member` subsection.
5. Add `TeamTokenUsageSummary.vue` and render it for team workspaces beneath the primary detail.
6. Hydrate per-member summaries through existing `tokenUsageMeterStore` actions; optionally fetch team aggregate for a subordinate `Team total` row.
7. Remove `TokenUsageHeaderChip` usage/imports from `AgentWorkspaceView.vue` and `TeamWorkspaceView.vue`.
8. Delete `TokenUsageHeaderChip.vue` if no references remain; remove only localization keys that become truly unused.
9. Update focused component/composable tests for single-agent non-regression, team focus primary behavior, Team section rows, no old focused-member card, and no header chip.
10. Run implementation-scoped checks.
11. Start backend/server and frontend, use existing or seeded token-emitting agent/team data, visually inspect the clean header and Token tab, iterate until the UI looks good, and record screenshot/evidence in implementation handoff.

## Key Tradeoffs

- Per-member summaries can use existing queries instead of adding a backend batch query. This is simpler and avoids unnecessary server changes for typical team sizes.
- A compact Team section gives useful comparison without duplicating the full Token Meter for every member.
- Removing the header chip removes a quick affordance to open Token tab, but the user explicitly values header cleanliness and detailed Token-tab usage over the low-detail chip.

## Risks

- `TokenUsageMeterPanel.vue` may grow too large if team rows and formatting stay inline. Mitigation: split `TeamTokenUsageSummary.vue` and formatting helper.
- Historical members may have route-key-only state if projection is not hydrated. Mitigation: use existing member projection hydration and route-key/team member summary fetch fallback.
- Team section could become visually heavy. Mitigation: compact row design, optional details, visual QA requirement.
- Local test dependencies were missing in the clean worktree during investigation. Mitigation: implementation/API-E2E agents must prepare dependencies or use established workspace setup.

## Guidance For Implementation

- Do not change server token accounting unless implementation discovers a hard data-access gap.
- Prefer focused run ID for primary summary. For team rows, prefer member context `state.runId`; use `fetchTeamMemberSummary` with `teamRunId + memberRouteKey` only as fallback.
- Keep `Current prompt`, card grid, `Input breakdown`, and `Pricing details` visually unchanged for the primary focused run except for natural spacing needed before the Team section.
- Team section should be compact and easy to scan. Use existing typography/card style from the Token Meter panel.
- Remove header chip from both agent and team headers, not only team header.
- Implementation handoff must include running-app visual evidence with realistic token data and at least one screenshot/equivalent artifact.
