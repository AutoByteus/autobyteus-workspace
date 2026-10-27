# Design Review Report — Model Router Core (autobyteus-32)

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-runtime-model-routing/tickets/in-progress/delegated-runtime-model-routing/requirements-doc.md` (SR-018, Approved incl. UI)
- Upstream Investigation Notes: `.../delegated-runtime-model-routing/investigation-notes.md` (A-01…A-31)
- Upstream Solution Revision Record: `.../delegated-runtime-model-routing/solution-revision-record.md` (SR-001…SR-014)
- Reviewed Design Spec: `.../delegated-runtime-model-routing/design-spec.md` (SR-018, `Ready`; SR-017 in `history/design-spec-sr017.md`, SR-016 in `history/design-spec-sr016.md`)
- Supplemental Task Artifacts Reviewed: `launch-selection-order.md` (SR-018, behavior-defining); Product UI/UX specification `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/delegated-runtime-model-routing/ui-ux-spec.md` (linked, Product-owned, Approved, design revision `ce3e417`). I checked it only for consistency with the server contract (GraphQL, status codes, Decisions/Overview data); its visual content is Product-approved and not re-reviewed.
- Relevant Solution Revision IDs: `SR-012` (my preliminary points), `SR-013`, `SR-014`…`SR-018`
- Architecture Review Revision Record: `.../delegated-runtime-model-routing/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-004`
- Current Review Round: `4`. Rounds: ARCH-REV-001 (Fail: AR-001, AR-002), ARCH-REV-002 (Pass, SR-015), ARCH-REV-003 (Pass, SR-016).
- Trigger: SR-018 from the Solution Designer (2026-10-26), answering code review CRR-003 (failure origin of API/E2E round 1: CR-003 and CR-004 Design Impact, CR-005 Local Fix) with the user's decision to remove the router's workspace confinement; also covers the SR-017 record tightening (CRR-001 C-03, CR-001), which was not sent for re-review
- Prior Review Round Reviewed: `3` (ARCH-REV-003, Pass)
- Latest Authoritative Round: `4`
- Naming (SR-015, the user's wording): "conversation" is gone. `ModelRouterAgent` owns the router's run, its workspace and the knowledge read; the mutation is `openModelRouterAgent`. The vocabulary is consistent with the never-bare-"router" rule.
- Current-State Evidence Basis: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-runtime-model-routing`, `origin/personal` `d74f75a51a`. Opened:
  - `agent-execution/domain/agent-run.ts:180-215`
  - `agent-execution/shared/runtime-agent-tool-exposure.ts:1-90`
  - `agent-execution/services/agent-run-service.ts:238-306`
  - `agent-execution/services/standalone-agent-run-eligibility.ts:4-5`
  - `agent-execution/services/standalone-agent-run-lifecycle-service.ts:34-38,193`
  - `agent-tools/mcp/agent-tool-mcp-session-service.ts:60-110`
  - `agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts:155-178`
  - `agent-execution/backends/claude/session/{claude-session-tooling-options.ts:130-160, claude-session-query-options.ts:30-50, claude-session-tool-use-coordinator.ts:75-118, claude-session-config.ts:3}`
  - `runtime-management/claude/client/{claude-sdk-client.ts:84-92, claude-sdk-setting-sources.ts}`
  - `remote-collaboration/channel/peer-client.ts:36-50`
  - `remote-collaboration/inbound/remote-delegation-receiver.ts:20-73`

## Routing Classification Review

- Task size: `Large`; Architectural risk: `High`
- Classification rationale reviewed: a new subsystem (~50 files); a long-lived, system-owned, auto-approved agent with file tools and web reading; new persisted stores; a changed peer contract; resolution waiting inside the root gate.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: none.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood:
  - Defaults first; the node's Model Router chooses for agents no usable default covers, behind a per-node switch that is off by default. Off means no new behavior.
  - One long-lived router conversation per node, in its own internal workspace, with `knowledge.md` written by the router.
  - Validated choices, a 40 s routing budget, and visible fallback (this node) or refusal (peer).
  - Decisions are recorded only while on, by the node that resolved the copy.
  - The UI is per the approved UI/UX specification.
  - The router has its listed tools plus its runtime's file tools, confined to its workspace on Codex/Claude (REQ-003, AC-011, QR-004).
- Scope guardrail confirmed: in scope UC-001…005 and UC-007. Out of scope: configured placements, existing copies, user and application launches, router-chosen model settings, cross-node routing by another node's router, server-text localization, faster runtime reads. Learning from outcomes is its own later Task (DEC-021).
- Every prospective blocking `Design Impact` finding is traceable: `Yes` (AR-001 → AC-011, REQ-003, QR-004; AR-002 → REQ-003, AC-011, QR-004)
- Remaining material ambiguity: none in the requirements.
- Statements about existing code the design relies on, checked:
  - A-21 (`append_to_active_turn`, input lifecycle observer `agent-run.ts:186-191`): confirmed.
  - A-28: the peer client's 20 s bound is confirmed (`peer-client.ts:43-44`). The new 50 s start bound fits.
  - The orphan argument ("a prepared run that never gets its packet expires") is confirmed (`remote-delegation-receiver.ts:22-26`).
  - A-29 Codex: `danger-full-access` under auto-approve is confirmed (`codex-thread-bootstrapper.ts:168-172`).
  - A-29 Claude: the built-ins include Bash/Write/Edit (`claude-sdk-client.ts:87-89`); permission mode `default` (`claude-session-config.ts:3`); built-ins are not in `allowedTools`, so `canUseTool` reaches the coordinator (`claude-session-tooling-options.ts:143-155`). That confirms it for the default case. See AR-002 for the user-settings case.
  - MCP sessions work for a run without a member context (`agent-tool-mcp-session-service.ts:81-92`, `kind: "agent"`).
  - Not stated in the design: `RouterConversation` creates the router run through `AgentRunService`. A run without `applicationExecutionContext` is collaboration-eligible (`standalone-agent-run-eligibility.ts:4-5`) and gets a member context, and with it the automatic collaboration tools (AR-001).

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | Pass | Pass | Pass | Confirmed | — |
| BEH-002 | Contract | Pass | Pass | Pass | Confirmed | — |
| BEH-003 | System | Pass | Pass | Pass | Confirmed | — |
| BEH-004 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-005 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-007 | System | Pass | Pass | Pass (off path unchanged; records and report read only while on) | Confirmed | — |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `launch-selection-order.md` SR-014 | Pass | Pass | Pass | Pass (40 s, the failed turn, knowledge in the request, the router's own launch and workspace) | Pass (Approved SR-014) | None |
| UI/UX specification (linked) | Pass | Pass | Pass, for the server contract | Pass: GraphQL reduced to status, decisions (source filter), statistics and three mutations; reason codes; Task groups. D11's knowledge box is marked withdrawn | Pass (Product-approved, normative) | None |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present | Pass | Feature, with a local ordering defect (A-03) | — |
| Root-cause classification is evidence-backed | Pass | `Missing Invariant` + local ordering (A-03) | — |
| Refactor decision is explicit | Pass | Lifecycle split; `LaunchUsabilityCheck` extraction | — |
| Refactor decision is supported by the design sections | Pass | DS-001, Removal Plan, Sequence step 1 | — |

## Spine Inventory Verdict

| Spine ID | Scope | Readable? | Narrative Clear? | Facade Vs Owner Clear? | Naming Clear? | One Owner Per Node, In Call Order? | Off-Spine Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Local delegation | Pass | Pass | Pass | Pass | Pass (root sequences; resolver owns order; `ModelRouter` owns routing) | Pass | Pass |
| DS-002 | Peer delegation | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Routing | Pass | Pass | Pass | Pass | Pass | Pass | Pass (`ModelRouterAgent.ensureRun` creates the run with `systemRunOwner`) |
| DS-004 | Decision tool | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-005 | Page | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-006 | Return (notes, rows) | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-007 | Knowledge | Pass | Pass | N/A | Pass | Pass (the router writes, the server only reads) | Pass | Pass |
| DS-008 | Workspaces list | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Entry Point Clear? | Internals Stay Internal? | Bypass Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `ModelRouter` | Pass | Pass | Pass | Pass | The resolver never touches sessions or posts messages |
| `ModelRoutingSessions` | Pass | Pass | Pass | Pass | Settled only by `submit_launch_choices`; the sender is checked |
| `ModelRouterAgent` | Pass | Pass | Pass | Pass | The only creator of the agent's run and the only setter of `systemRunOwner`; the eligibility rule reads the marker |
| `RoutingDecisionLog` | Pass | Pass | Pass | Pass | — |
| `InternalWorkspaces` | Pass | Pass | Pass | Pass | — |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Clear? | Forbidden Explicit? | Coherent? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-collaboration` → `model-routing` (ports) | Pass | Pass | Pass | Pass | — |
| `model-routing` → agent-execution, available-agent-runtimes, workspaces, config | Pass | Pass (never → agent-collaboration) | Pass | Pass | — |
| `workspaces` → config | Pass | Pass | Pass | Pass | — |
| Backends read `toolConfinement` from the run config only | Pass | Pass | Pass | Pass | — |

## Interface Boundary Verdict

| Interface | Subject Clear? | Singular? | Identity Explicit? | Generic Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `ModelRouterPort.route` / `ModelRouter.status` | Pass | Pass | Pass | Low | Pass |
| `submit_launch_choices({requestId, choices})` | Pass | Pass | Pass | Low | Pass |
| `RoutingDecisionLog.listTaskGroups` / `RoutingStatistics.forPeriod` | Pass | Pass | Pass | Low | Pass |
| `AgentRunConfig.toolConfinement` | Pass | Pass | Pass | Low | Pass (general option, one value) |
| Peer start request/answer (clean cut) | Pass | Pass | Pass | Low | Pass |
| GraphQL (3 queries, 3 mutations) | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need | Checked? | Decision Sound? | New Piece Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Runtime facts, internal agents, run lifecycle, system notice, workspace, append log, settings, built-in agent | Pass | Pass | N/A | Pass | Reuse throughout |
| Router run creation | Pass | Pass | Pass (`systemRunOwner`, a general run-metadata marker) | Pass | Mirrors how application-owned runs are excluded from collaboration |

## Subsystem / Capability-Area Allocation Verdict

| Area | Allocation Clear? | Decision Sound? | Supports Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `model-routing` (new), `agent-tools/model-routing`, `workspaces`, `agent-execution` (confinement), `agent-collaboration`, `remote-collaboration`, `run-history`, `built-in-agents`, web | Pass | Pass | Pass | Pass | — |

## Reusable Owned Structures Verdict

| Structure | Evaluated? | Shared File Sound? | Ownership Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Routing types/ports; `LaunchUsabilityCheck` | Pass | Pass | Pass | Pass | — |

## Shared Structure / Data Model Tightness Verdict

| Structure | One Meaning Per Field? | Redundant Removed? | Overlap Controlled? | Core Vs Variant | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `LaunchConfigurationSource` (+ `model_router` with `choiceReason`, `taskKind`) | Pass | Pass | Pass | Pass (discriminated) | Pass | — |
| Decision record (Task identity, `delegatingRunId` vs `fromNode`) | Pass | Pass | Pass | N/A | Pass | — |
| `ModelRoutingStatus` (reason code + params + English fallback) | Pass | Pass | Pass | N/A | Pass | — |

Derived consumers listed with a decision for each: `Pass` (§ Change Scope table).

One vocabulary: `Pass` (Model Router, router conversation, router workspace, internal workspace, routing request, launch choice, knowledge file, task kind, decision record; `choiceReason` kept apart from fallback `reason`).

## File Responsibility Mapping Verdict

| File | Singular? | Matches Owner? | Re-Tightened? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Final File Responsibility Mapping (all rows) | Pass | Pass | Pass | Pass | — |

## Subsystem / Folder / File Placement Verdict

| Path | Clear? | Matches Owner? | Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `model-routing/{domain,services,stores}`, `workspaces/internal-workspaces.ts`, `launch-preferences/launch-usability-check.ts` | Pass | Pass | Low | Pass | — |

## Removal / Decommission Completeness Verdict

| Item | Named? | Replacement Clear? | Scope Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `CollaboratorLaunchResolver.check`; `delegateToNewCopy` | Pass | Pass | Pass | Pass | The SR-012 knowledge store and task-kind setting are not built |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Retention? | Clean-Cut Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Peer contract; lifecycle | No | Pass | Pass | DESIGN.md rule 9 |

## Persisted-Data Transition Verdict

| Subject | Decision | Evidence Sufficient? | Proportionate? | Migration Safety | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Launch source, remote links, `AgentRunConfig.toolConfinement` | `Directly Usable — No Migration` | Pass (tolerant lists, optional fields) | Pass | N/A | Pass | — |
| Decision log, conversation state, router workspace, settings | New | Pass | Pass | N/A | Pass | An unreadable line is skipped with a warning (rule 7) |

## Change / Refactor Safety Verdict

| Area | Realistic? | Seams Explicit? | Cleanup Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Steps 1–10 | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic | Needed? | Present? | Bad Shape Explained? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Routing request text, launch note | Yes | Pass | N/A | Pass | — |

## Material Premise Validation

### `MP-001` — The router's run gets `delegate_task` and `send_message_to`

- Related approved requirement: AC-011 ("Router has exactly its listed tools plus its runtime's file tools"), REQ-003, QR-004
- Relevant behavior IDs: BEH-005 (and BEH-001, the router answering routings)
- Initiating basis kind: `System`. The trigger is the first routing or "Talk to the router" (UC-001, UC-005), which makes `RouterConversation.ensure()` create the router run.
- Forward path:
  1. `RouterConversation` creates the run through `AgentRunService.createAgentRun` → `activate` → `standaloneRuns.resolveRootAndEnsureHost` (`agent-run-service.ts:238-244, 303-306`).
  2. The run has no `applicationExecutionContext`, so it is collaboration-eligible (`standalone-agent-run-eligibility.ts:4-5`). Its root attaches a member context (`standalone-agent-run-lifecycle-service.ts:34-38,193`).
  3. `buildRuntimeAgentToolExposure` adds `send_message_to` and `delegate_task` to every member context (`runtime-agent-tool-exposure.ts:21-26, 56-60`).
- Lifecycle preconditions and consequence:
  - The router, auto-approved and reading web pages, can call `delegate_task`. That starts a copy of a normal agent with shell tools, running unconfined, which escapes REQ-003's confinement.
  - A router `delegate_task` whose copy needs routing posts a request into the router's own active turn, while that turn waits on the tool. The routing then hangs until the 40 s budget ends.
  - AC-011 fails as written.
- Reachability: `Reachable` (tool exposure on every router run created by the current path).
- Review consequence: AR-001.

### `MP-002` — A Claude Write/Edit outside the router workspace is allowed without reaching the coordinator

- Related approved requirement: REQ-003 ("on Claude, … file writes only inside the workspace"), AC-011, QR-004
- Initiating basis kind: `User` / `System`. The user's own Claude Code settings carry allow rules, a normal, supported configuration of the Claude runtime, which AutoByteus loads. The router on Claude makes a write.
- Forward path:
  - Claude sessions load `settingSources: ["user", "project", "local"]` (`claude-sdk-setting-sources.ts:1-5`, used in `buildQueryOptions`).
  - Claude Code evaluates permission allow rules from those settings before calling `canUseTool`. The coordinator's denial (§ Ownership Map: "the tool-use coordinator denies Write/Edit/MultiEdit/NotebookEdit outside the workspace root before approval") is reached only when no rule already allows the tool.
  - Bash is safe: `disallowedTools` wins over allow rules.
- Consequence: with a user rule such as `"allow": ["Write", "Edit"]` (or `defaultMode` settings), the router on Claude can write outside its workspace, against REQ-003 and QR-004.
- Reachability: `Reachable` for the supported configuration. Medium confidence on Claude Code's rule order; the design should not depend on it either way.
- Review consequence: AR-002.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Round 2 Recheck (SR-015)

| Finding | Status | Evidence |
| --- | --- | --- |
| AR-001 | Resolved | `AgentRunMetadata.systemRunOwner: "model_router"`, set only by `ModelRouterAgent` at creation and kept on restore. `isCollaborationEligibleStandaloneRun` returns false for it, as for application-owned runs, so there is no member context and no automatic `send_message_to` / `delegate_task`. Agent Tools MCP serves runs without a member context (`agent-tool-mcp-session-service.ts:81-92`), so `list_available_agent_runtimes` and `submit_launch_choices` stay available. A per-runtime test checks that the tool set equals the template list plus the runtime's file tools. Persisted: `Directly Usable — No Migration` (absent = ordinary run). The Ownership Map, Boundary Map ("anyone else creating a run of `autobyteus-model-router`" forbidden) and File Mapping (`standalone-agent-run-eligibility.ts`, run metadata types) are consistent |
| AR-002 | Resolved, and wider than reported | A-32 cites the Claude Agent SDK's permission order: hooks first, deny applies even in `bypassPermissions`, and allow rules skip `canUseTool`. A confined Claude run gets: setting sources `["user"]` only (the workspace's own `.claude/settings*.json` would be writable by the agent: allow rules and hooks); shell tools in `disallowedTools`; a programmatic `PreToolUse` hook that denies Write/Edit/MultiEdit/NotebookEdit outside the workspace root. Owner: Claude session tooling from `toolConfinement`. The live checks add a user-level allow rule for Write, a workspace `.claude/settings.json`, and a workspace `.codex/config.toml` asking for full access |
| Residual: decision on B before the work packet | Resolved | B keeps the records with the prepared run and writes them when A's packet arrives; an abandoned start leaves no record (DS-002) |
| Residual: Codex temp roots; FU-002 text | Resolved | Module-doc note; FU-002 ≤ 40 s |

Material premises MP-001 and MP-002 are no longer reachable under SR-015: the router run is non-collaborative, and the hook runs before any allow rule.

## Round 3 Delta Review (SR-016)

| Item | Verdict | Evidence |
| --- | --- | --- |
| A-33: only Codex and Claude append input to a running turn | Confirmed | `inputCapabilities.activeTurnAppend`: `"supported"` in `codex-agent-run-backend.ts:36` and `claude-agent-run-backend.ts:18`; `"unsupported"` in `autobyteus-agent-run-backend.ts:91`, `agy-agent-run-backend.ts:20`, `acp-agent-run-backend.ts:31`. SR-015's "answered in that turn" held on two runtimes only; the several-kinds check was missed in the earlier rounds and is caught now |
| `RoutingRequestQueue`: FIFO, one request in flight, released when `ModelRouterAgent` reports the run idle; owned and used only by `ModelRouter` | Pass | One owner drives the sequence (`ModelRouter`: open session → enqueue → wait for release → read knowledge → post → await settle). The idle signal is a run-status notification, not a split sequence. The behavior is the same on every runtime |
| 40 s budget includes the wait; a request that runs out while waiting is never sent and fails "the Model Router was busy" | Pass | An explicit outcome, not behavior by absence (REQ-004, REQ-006, AC-006). It still fits the 50 s peer start bound and Codex's 60 s tool-call time-out |
| Requirements REQ-004, AC-006, QR-002, supplement § 5 (Busy router, row 101) | Pass | Consistent with the design |
| Old-wording rows from ARCH-REV-002 | Pass | No `ModelRouterRun` left. The A-29 evidence row keeps its historical source list; the Ownership Map is the authority |

## Round 4 Delta Review (SR-017, SR-018)

| Item | Verdict | Evidence |
| --- | --- | --- |
| SR-017: decision record keeps only structured `skipped` / `routerFailure`, no rendered `notes[]`; `delegatingAgentName` nullable for peer-started records | Pass | One representation per fact (Principle 11). The reader ignores `notes` in older records (`Directly Usable — No Migration`). No peer contract change (CR-001 option 1); the approved UI shows the name only in "Open run", which a peer's page lacks |
| SR-018: the user removes the router's workspace confinement | Pass (requirement change approved by the user) | REQ-003, AC-011, QR-004 and DEC-023 changed by the user's own decision. The Solution Designer stated the remaining risk (hidden instructions in a web page, the same exposure as any auto-approved agent) and the user accepted it. Not a reviewer decision to reopen. A-34 records why the confinement could not be held cheaply (L-02: a workspace `.codex/config.toml` `writable_roots` merged into `workspace-write`; L-01: the user's claude.ai connectors and `Skill`) |
| Clean cut of `toolConfinement` | Pass | Codex bootstrapper, `agent-run-config.ts` and the Claude session tooling / setting-source files revert to base; the option is removed with no unused field left; the `toolConfinement` row is gone from Persisted Data. Not released, so no stored data carries it |
| Kept: `systemRunOwner` (AR-001), internal workspace + listing rule, one request at a time | Pass | AR-001 stays a correctness rule (a router delegation could wait on the router itself), not only a security one. AC-011 now tests no `delegate_task` / `send_message_to` / `get_handoff_rules`, normal tests only |
| CR-005 carried as an implementation Local Fix (restore an inactive registered router run through `resolveCommandReadyAgentRun` before posting; failed-turn test) | Pass | Fits the `ModelRouterAgent.ensureRun` owner. See the non-blocking note on status codes |
| FU-005 withdrawn | Pass | Consistent with SR-018 |

## Review Decision

- `Pass`: SR-017 and SR-018 are consistent across requirements, supplement and design, and ready for implementation.

## Findings

None open. AR-001 is resolved and kept. AR-002 is obsolete: the requirement it protected was changed by the user in SR-018.

## Classification

N/A (Pass)

## Recommended Recipient

Implementation Engineer (`/software_engineering_team/implementation_engineer`); informational notice to the Solution Designer.

## Residual Risks

Non-blocking notes for the revision or implementation:
- **CR-005 and the status line:** "status not active while the run cannot take input" has no reason code in the approved list (`OFF`, `ROUTER_NOT_SET`, `RUNTIME_UNAVAILABLE`, `SIGNED_OUT`, `MODEL_NOT_OFFERED`, `MODEL_BLOCKED`, `REPORT_UNREADABLE`), and the UI translates by code. Prefer that `ensureRun` restores the run (so it can take input) and that a restore failure fails that routing with its reason, with no new status code. If a new code is truly needed, it needs a UI text, which goes back to the Solution Designer and Product.
- **SR-018 tests:** "normal testing only" is the user's decision; the API/E2E reruns are MR-09 and normal live routing per runtime.
- **SR-016, what "idle" means:** release the next request on the run's state (its turn ended and no other input is running), never on the session's state. A request whose 40 s budget ended while its turn is still running keeps the run busy until that turn ends. The user's own messages are inputs too: a user message that lands just as a request is released is appended (Codex/Claude) or queued (others), which is acceptable. Test both: a slow turn past the budget, and a user message during a routing.
- **Decision on B:** resolved in SR-015. B writes the records when A's work packet arrives.
- **Codex `workspace-write`:** no longer applies (SR-018 removed confinement).
- **Tool-call time-outs on Claude SDK / Antigravity / Grok:** verified live in API/E2E with a Design Impact escape (§ SR-012 point 1). Accepted as a planned verification.
- **FU-002 text:** corrected to ≤ 40 s.
- **Stale names in the design (non-blocking):** the A-29 evidence row still says "writes checked in the coordinator" (superseded by the `PreToolUse` hook), and the derived-consumers row says "set only by `ModelRouterRun`" (now `ModelRouterAgent`). Implementation follows the Ownership Map.
- **Workspace config files on Codex:** no longer applies (SR-018).
- RSK-003…RSK-008 are as recorded. FU-004 (Reconnect marking internal runs missing) and FU-005 (Antigravity/Grok confinement) are accepted by the user.
- **Done-when:** the user's own check in the desktop app is part of the Task's Done-when and must be carried to delivery (design § Guidance).

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass` (MP-001 and MP-002 are removed by the SR-015 mechanisms)
- Notes: SR-018 (no confinement; `systemRunOwner` kept; CR-005 Local Fix) with SR-017's record tightening is ready for implementation. The Task's Done-when includes the user's own check in the desktop app; carry it through delivery.
