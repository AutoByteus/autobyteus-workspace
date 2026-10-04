# Design Review Report — standalone-agent-run-root

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/standalone-agent-run-root/tickets/in-progress/standalone-agent-run-root/requirements-doc.md` (Approved, SR-002)
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/standalone-agent-run-root/tickets/in-progress/standalone-agent-run-root/investigation-notes.md` (E-01–E-14)
- Upstream Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/standalone-agent-run-root/tickets/in-progress/standalone-agent-run-root/solution-revision-record.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/standalone-agent-run-root/tickets/in-progress/standalone-agent-run-root/design-spec.md` (SR-004)
- Supplemental Task Artifacts Reviewed: predecessor UI/UX spec `/Users/normy/autobyteus_org/autobyteus-web-prototype/tickets/done/cross-scope-agent-mentions-sr008/ui-ux-spec.md` (VIS-013, RD-004).
- Relevant Solution Revision IDs: SR-001, SR-002, SR-003, SR-004 (answers ARCH-REV-001)
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/standalone-agent-run-root/tickets/in-progress/standalone-agent-run-root/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-002`
- Current Review Round: 2
- Trigger: SR-004 revised package answering ARCH-REV-001 (AR-001–AR-003).
- Prior Review Round Reviewed: Round 1 (`ARCH-REV-001`, Fail)
- Latest Authoritative Round: 2
- Current-State Evidence Basis: worktree `codex/standalone-agent-run-root` @ `2d3b66005`. Code read:
  - `standalone-agent-run-lifecycle-service.ts`: binding at 74–81; `resolveCommandReadyAgentRun`, `activatePreparedRun` and `restorePersistedRun` at 84–96; `onHostPublished` at 362; `buildConfig` pulling `buildHostMemberExecutionContext` at 422;
  - `agent-run-command-coordinator.ts:66-73`: `resolveCommandReadyAgentRun`, then `onActiveRunReady`, then `postUserMessage` with `lifecycleObserver`;
  - `agent-stream-handler.ts:381-383`: `onActiveRunReady` → `bindSessionToRun`;
  - `agent-collaboration-stream-handler.ts:50-68`: `connect` → `resolveCommandReadyRoot` (restores the host), projects the view with `isActive: true`;
  - `agent-run-service.ts`: `createAgentRun`, `activatePreparedRun`, `restoreAgentRun`, `resolveAgentRun` → lifecycle;
  - their callers: GraphQL `agent-run.ts:199, 275`; application scopes; the skill improver; `skill-improvement-target-context-resolver.ts` (metadata read only);
  - web `graphql/mutations/agentMutations.ts` (`CreateAgentRun` and `RestoreAgentRun` are defined, but no web call sites were found);
  - `run-history/projection/event-monitor-active-trace-page-projection.ts` (the REQ-007 server owner exists);
  - web `docs/chat.md:255-268`.

## Routing Classification Review

- Task size: `Large`. Architectural risk: `High`. Confirmed: runtime ownership for every eligible standalone run (including Daily Assistant), lock order, a shared delivery-text change on every runtime, and a module move.
- Independent Architecture Review required: `Yes`.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`. In Round 2 every path preserves Q-3, and the coordinator ↔ root contract is defined.
- Approved intent:
  - REQ-001: one owner for the standalone run, with no user-visible change (Q-3; AC-001 requires the predecessor suites to pass unchanged).
  - REQ-002/REQ-003: invisible refactors.
  - REQ-004–REQ-008: small listed behavior changes.
  - REQ-009: test health.
  - REQ-010: no change (principle 6).
- Scope guardrail: as stated. The preserved boundary covers every user-visible standalone behavior, including Stop/reopen, crash recovery and the Team tab, except REQ-004–REQ-008.

| BEH | Alignment | Evidence | Target Path | Status | Action |
| --- | --- | --- | --- | --- | --- |
| BEH-001 Standalone command | Pass | Pass | Pass. `StandaloneRunCommandPort.postUserMessage`: `ensureReady` → `onActiveRunReady` → admission → post with `postOptions` (AR-002 resolved). | Confirmed | — |
| BEH-002 Child → host | Pass | Pass | Pass. Uniform `ensureReady`; no special wake path. | Confirmed | — |
| BEH-003 Stop/delete/archive/shutdown | Pass | Pass | Pass | Confirmed | — |
| BEH-004 Team collaborator agent | Pass | Pass | Pass | Confirmed | — |
| BEH-005 Self-delegation | Pass | Pass | Pass | Confirmed | — |
| BEH-006 Delivery text | Pass | Pass | Pass. Non-blocking note on the parser tolerating old headers. | Confirmed | — |
| BEH-007 Token totals | Pass | Pass | Pass | Confirmed | — |
| BEH-008 Earlier events | Pass | Pass | Pass. The server owner is `event-monitor-active-trace-page-projection.ts`. | Confirmed | — |
| BEH-009 Host label | Pass | Pass | Pass | Confirmed | — |
| BEH-010 Preserved | Pass | Pass | Pass. Connect → `resolveRoot` → `ensureHostReady` as today, with the real `isActive` (AR-001). Entry points are dispositioned and the bypass fails loudly (AR-003). | Confirmed | — |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose | Linked | Complete | Consistent | Status | Action |
| --- | --- | --- | --- | --- | --- | --- |
| Predecessor UI/UX spec (VIS-013, RD-004) | Pass | Pass | Pass | Pass | Pass (Approved) | — |

## Task Design Health Assessment Verdict

Pass. The root cause is a `Boundary Or Ownership Issue` (one run, two owners; collaborator agents in configured-member structures) plus `File Placement Or Responsibility Drift`, backed by E-01–E-03 and confirmed in the code. The user requested the refactor now, and sections 1–3 reflect it.

## Spine Inventory Verdict

| Spine | Verdict | Notes |
| --- | --- | --- |
| DS-001 Host command | Pass | The port is defined; interrupt and approval act on a live host only |
| DS-002 Child → host | Pass | — |
| DS-003 Stop/delete/archive/shutdown | Pass | `endRoot` is idempotent; the plain-run fallback is stated |
| DS-004 Team collaborator agent | Pass | — |
| DS-005 Token summary | Pass | Live tree, else stored; each record counted once |
| DS-006 Earlier events | Pass | — |
| Bounded: host readiness | Pass | One readiness attempt joined by concurrent callers |
| Bounded: lock order | Pass | Gate → lane. The lifecycle never calls back into the root after the binding is removed. Delete and archive take `endRoot` before their catalog mutation. |

## Boundary / Dependency / Interface Verdicts

| Item | Verdict | Notes |
| --- | --- | --- |
| `StandaloneAgentRunRoot` as the single owner; lifecycle as the activation backend and sole metadata writer | Pass | — |
| `StandaloneAgentRunRootManager` (`resolveRoot` / `stopRoot` / `endRoot` / `stopAll`); no statics | Pass | — |
| `StandaloneRunCommandPort` (coordinator → root, injected; no import cycle) | Pass | Carries `postOptions` and `onActiveRunReady`; returns `{run, admission, post}` |
| Forbidden bypass: "callers never use the lifecycle for eligible-run commands" | Pass | Entry-point table; `activateHost` throws without a member context for eligible metadata. Note: `AgentRunService` now reaches the root, so it also needs an injected port (see Residual). |
| `TeamRootCollaboratorAgentRegistry` | Pass | — |
| Delivery header | Pass | Note: the web RD-004 parser must accept headers with and without `sender address` (AC-010, existing history) |
| `getStandaloneRunTokenUsageSummary` | Pass | — |

## Existing Capability Reuse / Allocation / Structures / File Mapping / Placement

Pass:
- the handle follows `ConfiguredAgentExecutionHandle`;
- the registries, task lifecycle, communication engine, admission and package store are reused;
- the module move parallels `agent-org-execution`;
- each file stays at or under 400 lines.

## Removal / Legacy Verdict

Pass. Removed:
- the binding;
- the old manager and its statics;
- `bindCollaboration`;
- `onHostPublished`;
- `resolveCommandReadyRoot`;
- the wake branch;
- the liveness special case;
- the `addCollaborator`/`memberContexts.push` path;
- the `getInstance()` calls.

No aliases remain.

## Persisted-Data Transition Verdict

Pass: `Not Affected`. There are no format or semantic changes, and the token roll-up only reads.

## Change / Refactor Safety Verdict

Pass. The order is REQ-009 baseline first, then the Team registry, the Org extraction and the REQ-001 sub-steps. The predecessor suites passing unchanged is the gate, and the escalation triggers are explicit.

## Example Adequacy Verdict

Pass.

## Material Premise Validation

### `P-001` — A user messages a collaborator of a stopped standalone run

- Requirement: Q-3 / REQ-001 ("no user-visible change"); predecessor AC-006/AC-012 (UXJ-002/UXJ-005).
- Initiating basis: `User`. Surface: a stopped standalone run's collaborator row and its composer. Action: send.
- Forward path:
  - **Today:** the web connects `/ws/agent-collaboration/:hostRunId` → `connect` → `resolveCommandReadyRoot`, which restores the host (`agent-collaboration-stream-handler.ts:54`) → the view is projected with `isActive: true` (line 68) → child command.
  - **SR-003:** `connect` → `resolveRoot`, which does not start the host (Key Tradeoffs, "Stream connect no longer restores the host").
- Consequence:
  - The host stays stopped until a child message reaches it.
  - The run's active state (run row status, active-runs views, the projected `isActive`) differs from today after this action.
  - Similarly, a failed mention admission on a stopped run no longer activates the host first.
  - The design asserts this is unobservable, but the host's running state is shown to the user.
- Reachability: `Reachable` → AR-001. Round 2: resolved by preserving connect → `ensureHostReady`.

### `P-002` — A stopped eligible run receives its first host command after the refactor

- Requirement: REQ-001/AC-001 (predecessor suites unchanged); AC-010.
- Initiating basis: `User`. Action: send in a stopped standalone run's composer.
- Forward path:
  - **Today:** `AgentRunCommandCoordinator.postUserMessage` → `resolveCommandReadyAgentRun` → `input.onActiveRunReady(run)` (`agent-stream-handler.ts:381`: `bindSessionToRun`, which attaches the live stream) → `run.postUserMessage(msg, {lifecycleObserver})`, which updates the command record.
  - **SR-003:** activation moves inside `root.executeHostCommand` (`host.ensureReady`). The port's shape (`post, interrupt or approve; plus mentions`) does not carry `onActiveRunReady` or `lifecycleObserver`.
- Consequence: unless they are carried through, the live host stream is not bound to a newly activated run (no live output) and command-record lifecycle facts are lost.
- Reachability: `Reachable` → AR-002. Round 2: resolved by the port contract.

### `P-003` — An eligible host activated through `AgentRunService.createAgentRun` / `restoreAgentRun` / `resolveAgentRun`

- Initiating basis:
  - These are public GraphQL mutations (`createAgentRun`, `restoreAgentRun`).
  - In-repo callers are application-owned or helper runs, which are ineligible.
  - Web defines `CreateAgentRun` and `RestoreAgentRun`, but no web call sites were found.
- Consequence if exercised:
  - Today `buildConfig` pulls the host member context through the binding.
  - After the binding is removed, these paths would start an eligible host without its member context or root. That host would have no `delegate_task`/`send_message_to` (predecessor REQ-012).
  - A later root `ensureReady` would find it already live.
- Reachability: `Unclear` (no supported UI surface found). The proportionate response is a stated disposition, not machinery → AR-003. Round 2: dispositioned.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass`

## Findings

None open. The resolution of each finding is in `architecture-review-revision-record.md` under ARCH-REV-002.

- AR-001: Resolved (option a, behavior preserved).
- AR-002: Resolved (port contract).
- AR-003: Resolved (entry-point dispositions, plus a loud failure on bypass).

## Classification

N/A (Pass).

## Recommended Recipient

`/software_engineering_team/implementation_engineer`

## Residual Risks

- **Implementation note (dependency rule).** `AgentRunService` (in `agent-execution`) now reaches the root for eligible runs: `createAgentRun`, `activatePreparedRun`, `restoreAgentRun`, `resolveAgentRun` and `terminateAgentRun` → `stopRoot`. The design's dependency rule allows only the coordinator, through `StandaloneRunCommandPort`. Wire `AgentRunService` through an injected port as well (extend the port, or add a sibling port wired by the supervisor) rather than importing `standalone-agent-run-root/*`, and update the rule.
- The REQ-001 blast radius covers Daily Assistant and every eligible run. Mitigated by the unchanged predecessor suites and live checks.
- Host activation runs under the root gate for host commands and connects, so a slow restore briefly blocks child deliveries in that root. This matches the predecessor's DS-009.
- The REQ-005 header change affects every runtime. The web RD-004 parser accepts both header forms (recorded in the design).
- The REQ-009 model-save cause is unknown. A behavior-changing production defect returns as a Design Impact.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass`. P-001 and P-002 are resolved. P-003 is dispositioned.
- Notes: the SR-004 package is ready for implementation from `2d3b66005`.
