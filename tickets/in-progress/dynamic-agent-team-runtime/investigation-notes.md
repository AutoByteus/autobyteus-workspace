# Dynamic AgentTeam Runtime — Investigation Notes

## Investigation Status

- Status: `In progress — current base refreshed; requirements remain Draft`
- Last updated: `2026-08-25`
- Implementation status: `Not started`
- Architecture-review status: `Not requested`
- Current gate: discuss and obtain explicit user approval for `requirements.md` and `dynamic-agent-team-use-cases.md` before completing the design.

## Request Context

The requested capability is an explicitly dynamic AgentTeam runtime: an active root TeamRun can adopt a valid current AgentTeam definition without replacing the root run. Reconciliation can add/remove Agents, add/remove nested AgentTeams, replace changed definition references, and update natural-language handoffs. This ticket is intended to precede native AgentOrg.

Confirmed constraints from the user discussion:

- no automatic filesystem watching;
- build Dynamic AgentTeam before native AgentOrg;
- new members need deterministic launch configuration;
- AgentOrg itself is out of scope for this ticket;
- the completed hierarchical TeamRun launch-configuration feature is now available on `origin/personal`.

## Environment Discovery / Bootstrap Context

- Project Type: `Git super-repository`
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/dynamic-agent-team-runtime`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/dynamic-agent-team-runtime/tickets/in-progress/dynamic-agent-team-runtime`
- Current Branch: `codex/dynamic-agent-team-runtime`
- Current Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/dynamic-agent-team-runtime`
- Resolved Base: `origin/personal`
- Expected Finalization Target: `personal`
- Remote Refresh: `origin/personal` fetched on 2026-08-25 and resolved to `fb1335867a4223b2499e4513f58c609b6ac33ab4`.
- Worktree Refresh: the ticket branch had no unique commits and was fast-forwarded/reset to that exact base while preserving the untracked Draft ticket package.
- Relevant completed dependency: merge `a43e8ceea` and released ticket `/Users/normy/autobyteus_org/autobyteus-worktrees/dynamic-agent-team-runtime/tickets/done/hierarchical-team-run-launch-config`.

## Supplemental Task Artifact Inventory

| Artifact Path | Purpose And Scope | Core Artifact(s) Supported | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/dynamic-agent-team-runtime/tickets/in-progress/dynamic-agent-team-runtime/dynamic-agent-team-use-cases.md` | Intended-behavior examples and later data-flow-spine audit | Requirements and later design | Draft | Explicit user approval required with requirements |

## Source Log

| Date | Source Type | Exact Source / Command | Relevant Finding |
| --- | --- | --- | --- |
| 2026-08-25 | Git | `git fetch origin personal`; `git reset --hard origin/personal`; `git rev-parse origin/personal` | Dedicated ticket is based on current `origin/personal` at `fb1335867...` |
| 2026-08-25 | Delivered ticket | `tickets/done/hierarchical-team-run-launch-config/*` | Dependency finalized, merged, released as v1.4.58, and rollout verified |
| 2026-08-25 | Code | `autobyteus-server-ts/src/agent-team-execution/domain/team-run-config.ts` | Runtime aggregate contains immutable compiled configured topology, Team defaults, Agent launch settings, and handoffs |
| 2026-08-25 | Code | `.../domain/team-run-execution-tree.ts`; `.../services/team-run-execution-tree-builder.ts` | V2 stores a complete default for root/every configured Team and a complete launch snapshot for every configured Agent; restore rebuilds that state |
| 2026-08-25 | Code | `.../services/team-definition-topology-planner.ts` | Initial planner validates the complete graph and allocates every configured identity; no identity-preserving reconcile path exists |
| 2026-08-25 | Code | `.../domain/root-team-run.ts`; `.../services/team-run-persistence-coordinator.ts`; `.../services/team-execution-index.ts` | Root already owns serialized durable mutation, tree/index replacement, routing, tasks, messages, events, and fail-stop |
| 2026-08-25 | Code | `.../domain/team-run-context.ts`; `.../backends/mixed/mixed-team-run-context.ts`; `.../backends/mixed/members/mixed-configured-member-registry.ts` | Contexts/registry encode launch-time topology; registry disposal is not a root transaction |
| 2026-08-25 | Code | `autobyteus-server-ts/src/agent-execution/domain/agent-run.ts`; `.../input/agent-run-input-contract.ts` | Native termination already quiesces admission, cancels accepted-not-forwarded input, waits for active lifecycle, and terminates |
| 2026-08-25 | Code | `.../domain/member-team-context.ts`; `.../domain/member-collaboration-context.ts`; `.../services/member-team-context-builder.ts`; `agent-communication/services/get-handoff-rules-service.ts` | Current outgoing handoffs are frozen into each AgentRun's team context; dynamic lookup needs a stable current-rule provider or equivalent binding |
| 2026-08-25 | Code | `autobyteus-server-ts/src/api/graphql/types/agent-team-run.ts`; `.../types/agent-team-definition.ts` | TeamRun API supports create/restore/terminate; definition catalog refresh is explicit and separate; no reconcile mutation exists |

## Relevant Existing Behavior And Production Paths

| Behavior ID | Current Supported Trigger | Current Production Path | Current Outcome / Invariant |
| --- | --- | --- | --- |
| `BEH-001` | Create/restore TeamRun | GraphQL → `TeamRunService` → topology planner or V2 restore → manager/factory → `RootTeamRun` | One immutable configured topology is constructed |
| `BEH-002` | V2 persistence/restore | compiled config ↔ execution-tree builder/store | Team defaults and Agent launch snapshots are durable |
| `BEH-003` | Route to configured placement | root index/resolver → containing TeamRun → configured registry/handle | Only launch-time placements can materialize |
| `BEH-004` | Root termination | root admission close → recursive TeamRun/AgentRun termination | Governed native quiescence exists only for root-wide/local termination, not definition reconcile |
| `BEH-005` | Handoff lookup/message/task | frozen member collaboration context → `get_handoff_rules`; root current index → recipient resolution | Handoff lookup is stale if only root tree changes; routing already derives from root index |
| `BEH-006` | Definition CRUD/catalog refresh | definition GraphQL/service/provider/cache | Definition catalog changes; active TeamRuns do not |
| `BEH-007` | Task delegation | root task service → task execution records/tree projections | Task-created topology is distinct from configured topology |
| `BEH-009` | File/package edit | explicit reload required | No automatic active-run mutation |

## Design Health Assessment Evidence

- Change posture: `Larger Requirement`
- Root cause: `Boundary Or Ownership Issue` plus `Missing Invariant`
- Refactor posture: `Needed in this change`
- Governing owner: `RootTeamRun`; public service/GraphQL should remain thin.
- Key pressure: the current tree/index can be replaced root-atomically, but local Team contexts, configured registries, and Agent collaboration snapshots are immutable launch-time projections.
- Forbidden shortcut: directly editing the V2 file or calling `MixedConfiguredMemberRegistry.remove()` without root-owned validation, lifecycle preparation, durable commit, and live projection replacement.

## Relevant Files / Components

| Path / Component | Current Responsibility | Design Implication |
| --- | --- | --- |
| `.../services/team-definition-topology-planner.ts` | Initial definition-to-runtime plan | Reuse graph resolution/validation; add identity-preserving candidate planning rather than corrupting initial launch semantics |
| `.../domain/root-team-run.ts` | Root public runtime owner | Own reconcile orchestration and current committed view |
| `.../services/team-run-persistence-coordinator.ts` | Serializes root file mutations | Reuse for durable topology replacement |
| `.../domain/team-run-context.ts` | Per-Team immutable runtime context | Needs an explicit current configured-topology projection/binding boundary |
| `.../backends/mixed/members/mixed-configured-member-registry.ts` | Lazy local configured handles | Needs controlled staged addition/retirement hooks; must not become global authority |
| `.../domain/member-collaboration-context.ts` | Frozen per-Agent outgoing rules/delivery | Dynamic rules require root-current lookup while stable identity/delivery remain bound |
| `.../domain/agent-run.ts` | Input admission/quiescence/termination | Reuse; do not duplicate accepted-input state |
| `.../domain/team-run-execution-tree.ts` | V2 active configured/persisted topology | Sufficient for active topology rewrite; no migration required for current recommended scope |

## Runtime / Probe Findings

No new runtime mutation probe has been executed. Static evidence establishes that no supported reconcile operation exists and that native AgentRun termination already provides the required input-quiescence primitives. Focused probes belong after requirements approval and design selection.

## External / Public Source Findings

N/A. Current repository contracts govern this task.

## Reproduction / Environment Setup

- No service, emulator, external account, or additional repository was required for current-state inspection.
- Commands were run only in the dedicated ticket worktree.
- No production source file has been modified.

## Findings From Code / Docs / Data / Logs

1. The hierarchical prerequisite is complete; the old “missing nested Team default” blocker is gone.
2. V2 already provides enough launch truth for a simple dynamic rule: new Agent inherits containing-Team default; new Team recursively inherits parent-Team default.
3. `RootTeamRun` is the natural transaction owner; a new peer reconciliation coordinator would duplicate authority.
4. Existing native input quiescence eliminates the need for a new accepted/pending/rejected ledger.
5. Dynamic handoffs cannot be achieved by changing only the persisted tree because AgentRun collaboration contexts retain frozen outgoing arrays.
6. Removing a configured node from the active V2 tree need not delete its separate Agent memory or task/communication records. A retired-placement navigation view is a distinct future product concern.

## Persisted Data Transition Evidence (When Applicable)

- Decision candidate: `Directly Usable — No Migration`.
- Current subject: `TeamRunExecutionTreeFileV2`, task records V1, communication messages V1, and AgentRun memory keyed by run identity.
- Evidence: V2 accepts the desired active configured topology, current handoffs, Team defaults, and Agent launch snapshots without a schema extension.
- Required preservation: retained identities/snapshots plus all task, communication, and Agent memory records.
- Explicit limitation: a removed placement is absent from the active configured tree; no new retired-placement UI is promised.

## Constraints / Dependencies / Compatibility Facts

- Base: current `origin/personal` only.
- No automatic filesystem watcher or polling.
- No AgentOrg implementation in this ticket.
- Existing canonical rooted addressing, coordinator ingress, messaging, task delegation, and definition-management tools remain supported.
- Requirements/use cases are Draft and must not be treated as approved design input yet.

## Open Unknowns / Risks

- User confirmation is still needed for the recommended explicit per-root trigger, graceful removal, parent-default-only additions, and active-tree-only history scope.
- Graceful removal can wait for a provider turn; no timeout policy is currently approved.
- The later design must prove the post-durability live swap is bounded/no-fail or uses existing fail-stop on unexpected failure.
- Exact GraphQL result/event names and file responsibilities remain design decisions after approval.

## Notes For Architecture Reviewer

No architecture review is requested. The requirements basis and intended-behavior supplement are Draft, and `design-spec.md` remains intentionally unstarted pending user discussion/approval.
