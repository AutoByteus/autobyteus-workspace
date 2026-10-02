# Code Review Report — agent-initiated-collaborators

## Review Round Meta

- Review Entry Point: `Implementation Review` (round 5, IR-003 / SR-007). Rounds 1–4 are preserved below.
- Requirements Doc Reviewed As Context: `requirements-doc.md` (Approved, SR-005; REQ-001–011, AC-001–012, SC-001–005, Q-1/Q-2)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (E-01–E-12)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md`
- Design Spec Reviewed As Context: `design-spec.md` (SR-005)
- Supplemental Task Artifacts Reviewed As Context: `architecture-design-handoff.md`; the predecessor's VIS-001–015 (unchanged UI); `implementation-evidence/render-check-aic/`
- Relevant Solution Revision IDs: `SR-005`
- Design Review Report Reviewed As Context: `design-review-report.md` (ARCH-REV-003, Pass)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: `ARCH-REV-003`
- Implementation Handoff Reviewed As Context: `implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: `IR-001`
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-006`
- Current Review Round: `5`
- Trigger: IR-001, `549510977` (implementation) plus `2dfbd1843` (ticket record) on base `origin/personal` @ `84224a58d`. 145 files changed, +5997/−983.
- Prior Review Round Reviewed: `N/A`
- Latest Authoritative Round: `5` (implementation review of IR-003 / SR-007)
- Coverage Investigation Reviewed (round 2): `api-e2e-coverage-investigation.md`
- Execution Coverage Report Reviewed (round 2): `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed (round 2): `api-e2e-revision-record.md`
- Relevant API/E2E Revision IDs: `API-REV-001` (Fail, 84%)
- Failing Scenario IDs: F-01 (SC-002, UC-004, AC-005/AC-007, all three roots), F-02 (AC-011, Team root UI)
- Exact Failing Commands / Execution Mode: `RUN_CLAUDE_E2E=1 npx vitest run tests/e2e/runtime/agent-initiated-collaborators.e2e.test.ts` (and `RUN_CODEX_E2E=1`) in `autobyteus-server-ts`; live AGY; isolated desktop instance with the public package
- Failure Evidence Paths: `api-e2e-evidence/le-claude-2.log`, `le-claude-3.log`, `le-codex-2.log`, `le-agy.log`, `desktop/DT-04-team-copy-row.png`, `desktop/DT-05-team-copy-row-clicked.png`, `desktop/DO-04-org-new-rows.png`
- Round 2 reviewer verification: both failures traced in the source at `2dfbd1843` (see the Failure-Origin section). No code was run; the evidence plus the code paths are conclusive.

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: confirmed.
  - `send_message_to` now creates.
  - There is a persisted `source` field.
  - Org behavior changes (REQ-007).
  - Admission now runs inside delivery.

## Review Scope

- Changed implementation and behavior reviewed:
  - `CatalogAddressMap`;
  - `CollaboratorAdmission` (ensure, catalog definition at an address, catalog task source), the admission queue and the candidate policy (`listEligible`, AR-002 in-run precedence, `rootDefinition`);
  - `message-recipient-resolution.ts` and `catalog-delegation.ts`;
  - the three root ports;
  - Team `TeamRunCollaborators`, `team-run-message-delivery.ts`, `root-team-run.ts` (delegate path) and `RootTeamRunMaterializationGate`, plus the `RootOperationGate` semantics;
  - the Org index instance ports (`teamInstancesOf`, `memberOfInstance`, `instanceCatalogSource`);
  - Agent-root package creation on a first catalog copy;
  - the task `source` schema;
  - the `list_available_agents` tool, its MCP provider, the exposure flag and the MCP catalog selection filter;
  - the mention-note contract.
- Diff-level reading (not line by line): the remaining root and adapter wiring, the web selectors and the docs.
- Explicit exclusions:
  - Live runtime behavior on AGY and ACP; this is API/E2E-owned.
  - Committed contract `dist/` output.
  - The `autobyteus-web/resources/server` copy, which is gitignored.
- Independent checks run by the reviewer:
  - `pnpm prepare:shared`; the untracked SDK `dist/` folders were removed afterwards and the worktree is as received.
  - Server `npx tsc -p tsconfig.build.json --noEmit`: clean.
  - The 21 changed server test files: 152/153 pass. The one failure is `application-framework-boundaries.test.ts` › "guards the exact SR-011 host definition…". It is **pre-existing on base**: the two `DefinitionService.getInstance` calls it flags in `collaborator-definition-catalog.ts` are already on `origin/personal` (added by the predecessor), and this branch only renamed symbols in that file.
  - Web: 13 files, 87/87 pass (the changed `agentSourceSelectors.spec.ts` plus the collaborator, Org, Agent-root and Team service suites).

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: Yes.
- Design-spec behavior map verified against the implementation: Yes.
- Design review report and round confirmed: ARCH-REV-003 Pass. AR-002 and AR-003 are retained; AR-001 and AR-005 are obsolete by construction (listing never writes).
- Behavior-basis status: `Confirmed`

| Behavior | Status | Implementation Evidence |
| --- | --- | --- |
| BEH-001 (list) | Confirmed | Tool → `MemberCollaborationContext.listAvailableAgents` → `Root.listAvailableAgents(sender)` (authorizes the sender, read-only) → `policy.listEligible(port)` + the map. App-owned and helper runs have no lister, so the tool reports `COLLABORATION_CONTEXT_REQUIRED`. |
| BEH-002 (addresses) | Confirmed | `CatalogAddressMap`: the plain segment unless it collides with another eligible definition or an in-use segment; otherwise `segment_<sha256(defId)[:6]>` for every colliding definition. In-run definitions keep their in-run address (AR-002 precedence through `inRunPlacementsByDefinition`). `addressesInUse` excludes task copies, so catalog copies never shift listed addresses. |
| BEH-003 (bring-in) | Confirmed | `resolveMessageRecipient`: (1) sender instance with no fall-through → (2) run-wide → (3) `bringInAt` (queued) → resolve again; `COLLABORATOR_ADD_FAILED` on failure. By run ID: `deliverToRunId` reaches existing executions only. `@` after bring-in, and bring-in after `@`, reuse one entry (`requireAdmissible` existing-entry rule; an in-run definition is never a catalog address). |
| BEH-004 (catalog copies) | Confirmed | `resolveDelegationPlacement`: (1) teammate inside the sender's own catalog Team copy, from its snapshot → (2) in-run → (3) `catalogTaskSource`, validated for runnability. No collaborator entry is created (Q-1). `source` is persisted, and activation and restore read it first. The first Agent-root catalog copy creates the package (AC-008). |
| BEH-005 (one unit, REQ-007) | Confirmed | Index ports in three roots. Org `teamInstancesOf` walks host Teams deepest first; `memberOfInstance` excludes task copies hosted by the instance. Org configured handoffs between placements resolve run-wide as before (a root-hosted sender has no instances). |
| BEH-006/008/009 | Confirmed | The same helpers in three roots. Contract wording is in one module per text. Web selectors read `source`. `@` and configured paths are unchanged. |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario | Related | Kind | Actor | Goal / Event | Entry | Shape | Path | Outcome | Evidence | Validity | Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| RS-001 | SC-001, AC-004 | User/System | Agent with the tool | Discover a team, then message it | `list_available_agents`, `send_message_to(address)` | Normal | tool → root (gate) → resolve → bring-in (queue) → deliver | One instance, started on its first message | REQ-002/004 | Supported Normal Scenario | Use |
| RS-002 | SC-002, AC-005/007 | System | Agent | Three parallel copies of a listed team | `delegate_task(address)` ×3 | Normal | placement (catalog source) → lifecycle → tree write with `source` | Three copies, each self-contained | REQ-005/007 | Supported Normal Scenario | Use |
| RS-003 | REQ-004, SC-002 | System | Two agents (for example two parallel copies' coordinators) messaging the same new catalog address at about the same time | Reach the one instance | `send_message_to` | Normal | concurrent deliveries inside a non-exclusive gate → admission queue | One instance; the second message reuses it | Design "two concurrent first messages produce one instance"; gates are drain barriers (`root-operation-gate.ts`, `root-team-run-materialization-gate.ts`) | Supported Normal Scenario | Use |
| RS-004 | SC-003 | System | An Org copy of a mounted Team | Its handoffs stay inside the copy | handoff by address | Normal | step 1 instance-relative | The copy's own member | REQ-007 (approved behavior change) | Supported Normal Scenario | Use |
| RS-005 | SC-004 | System | Listed team cannot run with the run's settings | Tell the agent; add nothing | `send_message_to` / `delegate_task` | Explicit Edge | runnability validator before any write | `COLLABORATOR_ADD_FAILED` / null delegation with the reason | REQ-004/005 | Supported Explicit Edge Scenario | Use |

### Candidate Finding And Mechanism Gate

| Candidate | Observation / Mechanism | Scenario / Contract | Disposition | Reason |
| --- | --- | --- | --- | --- |
| C-01 | The design says concurrent first messages "serialize on the gate", but the gates are drain barriers. The implementation adds a per-root `CollaboratorAdmissionQueue` (a promise chain inside each `*Collaborators` service). `bringInAt` re-reads the map inside the queue. The queue runs inside the caller's gate, so termination still drains. | RS-003 | Reject as a finding: a correct, proportionate mechanism for a supported scenario | It serves the approved behavior with no new owner or boundary (the root's own collaborators service) and no gate re-entry, and it is tested in three roots. **Not a Design Impact**: the design's intent stands and only its stated mechanism was factually wrong. Recorded here so the design text can be corrected at docs sync. |
| C-02 | Correction to the predecessor review: in cross-scope-agent-mentions CRR-001, C-08 rejected concurrent same-definition admissions as "serialized by the gate". That premise was false. In the released predecessor, the second admission failed safely: the tree schema's unique-address invariant rejects it, giving `COLLABORATOR_ADD_FAILED`, with no corruption. It was reachable only through two simultaneous user `@` sends in one root. | Predecessor RS / contract | No action (fixed here by C-01) | Noted for the record; the released behavior was fail-safe. |
| C-03 | `delegate_task` inside a catalog Team copy: an address inside the copy's prefix with no snapshot member breaks out to in-run or catalog resolution (no AR-003-style stop) | REQ-007 / AR-003 is scoped to messaging | Reject | Delegation always creates a fresh copy, so no existing instance can be crossed. AR-003 governs message resolution only. |
| C-04 | MCP `isAvailable` doesn't check the definition's selection | REQ-001 opt-in | Reject (not reachable) | `agent-tool-mcp-catalog.ts` resolves static adapters only from `runtimeExposure.requestedToolNames` (the definition's tools), so an unselected tool is never exposed. Claude tooling uses `listAvailableAgentsEnabled`; AutoByteus binds only when the name is selected. |
| C-05 | The task `source` schema requires direct Team members | Persisted data | Reject | `FlatTeamDefinitionResolver` always mounts members as `[...mountPath, memberName]` (direct), matching the existing collaborator-entry schema. |
| C-06 | The mention-note parser accepts the released guidance line | Legacy rule vs. "history opens unchanged" | Reject | A version-agnostic reader of persisted user history; nothing writes the old line. Not current-runtime compatibility behavior. |
| C-07 | The first Agent-root catalog-copy write is messages, then tree. A tree failure after the messages write leaves a messages-only folder. | AC-008 | Reject | It needs an infrastructure write failure. On reload, `readTree` is null, so the root starts empty and recreates the package. |
| C-08 | Bring-in holds the admission queue during runnability validation and hosting, so a concurrent `@` in the same root waits | RS-003 | Reject | This is the intended serialization, once per collaborator. The design accepts the one-time latency (Key Tradeoffs). |
| C-09 | C-11 (no Agent-root self-delegation guard) is unchanged | Predecessor note | Reject (out of scope) | Unchanged and harmless (an ordinary extra copy). |

## Structural / Design Checks

| Check | Result | Evidence |
| --- | --- | --- |
| Task design health assessment preserved | Pass | R-1 split (`ensure`; the note at four `@` sites), R-2 map (allocator removed), R-3 shared resolver plus `team-run-message-delivery.ts` (`root-team-run.ts` 495 → 447). D-1 and D-2 untouched. |
| Matches supplemental artifacts | Pass | No new UI. The render check covered rows, "From", the Team tab and the picker. |
| Spine clarity | Pass | DS-001/002/003 are traceable as designed |
| Ownership boundaries | Pass | Only roots write. The map and resolver are pure over ports. Admission commits through the root's persistence callback. |
| Off-spine concerns | Pass | Hash suffix, description and source projection |
| Existing capability reuse | Pass | Policy, entry builder, runnability validator, hosting, lifecycle and the `publish_artifacts` exposure pattern |
| Reusable owned structures | Pass | `CatalogAddressMap`, `MessageRecipientIndexPort`, one `DelegationPlacement`, `TaskExecutionSource` |
| Shared-structure tightness | Pass | `source` exists only on catalog copies and mirrors the entry's definition fields without identities |
| Repeated coordination ownership | Pass | One resolver and one placement helper for three roots |
| Empty indirection | Pass | `TeamRunMessageDelivery` owns Team addressing, not pass-through |
| Separation of concerns and file responsibility | Pass | See the size audit |
| Dependency direction | Pass | The collaborators helpers depend on ports only, and roots depend on them |
| Authoritative Boundary Rule | Pass | Tool handlers call `Root.listAvailableAgents`, `deliverLogicalMessage` or `delegateTask` only. No handler touches the map or admission. |
| File placement | Pass | `agent-tools/agent-discovery/` is a new transport folder, as designed |
| Flat-vs-over-split | Pass | — |
| Interface clarity | Pass | `{agents:[{name,kind,address,description}]}`; additive `COLLABORATOR_ADD_FAILED`; explicit port operations |
| Naming | Pass | `CollaboratorAdmission.ensure`, `bringInAt`, `CatalogAddressMap`, `resolveInRunRecipient` |
| No unjustified duplication | Pass | — |
| Patch-on-patch control | Pass | The queue is one small class used uniformly |
| Dead/obsolete cleanup | Pass | No `allocateCollaboratorAddress`, `CollaboratorMentionAdmission`, `hasTaskExecutionAt` (C-15 fixed) or `configuredDefinitionIds` left (grep verified) |
| Test scenarios and assertions requirement-aligned | Pass | Each Guidance item has a test, including AR-003, AR-005, concurrency, restore from `source`, and the Org behavior change |
| Test fixtures and helpers coherent | Pass | — |
| No stale, duplicated or compatibility-only tests | Pass | — |
| API/E2E readiness | Pass | — |

## Source File Size And Structure Audit

| Source File | Effective Lines | `>500` | `>220` Delta | SoC / Placement | Classification |
| --- | --- | --- | --- | --- | --- |
| `agent-org-execution/domain/agent-org-run.ts` | 480 | Pass | +21 | Pass | Pass (near the limit) |
| `agent-run-collaboration/domain/agent-run-collaboration-root.ts` | 471 | Pass | +19 | Pass | Pass (near the limit) |
| `services/agent-streaming/agent-stream-handler.ts` | 469 | Pass | +1 | Pass | Pass |
| `agent-team-execution/domain/root-team-run.ts` | 447 | Pass | +30 (net −48 after extraction) | Pass | Pass |
| `run-history/store/run-execution-tree-shared-record-schemas.ts` | 445 | Pass | +13 (`source` parsing extracted to `task-execution-source-schema.ts`) | Pass | Pass |
| `agent-collaboration/collaborators/collaborator-admission.ts` | 180 | Pass | Rename plus extension | Pass | Pass |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms | Pass | The released-guidance parse is a version-agnostic history reader (C-06) |
| No legacy retention | Pass | The first-free allocator is removed, and `@` uses the map |
| Dead code cleanup | Pass | — |
| Persisted-data decision followed | Pass | `Directly Usable — No Migration`: optional `source`, exact write, absence means the source is resolved from configured placements or collaborators |
| No dual reads or writes | Pass | — |
| Transition mechanics | Pass | No migration |

## Dead / Obsolete / Legacy Items Requiring Removal

None.

## Docs-Impact Verdict

- Docs impact: `Yes`, addressed. The branch updates `agent_communication.md`, `agent_tools.md`, `agent_team_execution.md`, `agent_orgs.md` and `agent_run_collaboration.md`.
- At docs sync: correct the design text's "serialize on the gate" to the per-root admission queue (C-01).

## Additional Material Premise Validation

| Premise | Status | Reason |
| --- | --- | --- |
| P-001 (rename, unshare or delete, then reuse a name mid-run) | Confirmed (`Technically Possible but Unsupported/Contrived`) | User-approved narrowing; no machinery |
| "Gate serializes admissions" (design DS-002 bounded spine) | Reclassified (the premise was factually false) | The gates are drain barriers. Serialization is supplied by `CollaboratorAdmissionQueue` (C-01). |

## Review Scorecard (Mandatory)

- Overall: 9.3/10 (93/100). Every category is at 9.0 or above.

| Priority | Category | Score | Why | Weakness | Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.4 | The ordered steps match DS-002/003 exactly in three roots | — | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.4 | Pure map and resolver over ports; root-only writes; the queue sits inside the root's own collaborators owner | — | — |
| 3 | API / Interface / Query / Command Clarity | 9.3 | One list shape; additive failure code; explicit index-port operations | — | — |
| 4 | Separation of Concerns and File Placement | 9.1 | The Team delivery extraction shrank `root-team-run.ts` | The Org and Agent roots are at 480 and 471 | Extract before their next growth, as was done for the Team root |
| 5 | Shared-Structure / Data-Model Tightness | 9.4 | `source` mirrors the entry without identities; one `DelegationPlacement` type | — | — |
| 6 | Naming Quality and Local Readability | 9.3 | Clear names, with doc comments stating the invariants (AR-003, no write, queue rationale) | — | — |
| 7 | API/E2E Readiness | 9.2 | Typecheck clean; focused suites green apart from one pre-existing failure; render check live | AGY/ACP and the Team/Org UIs have not run live | API/E2E covers them |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.2 | Concurrency correctly handled despite the false design premise; no fall-through; addresses stable | — | — |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.4 | The allocator is replaced, not wrapped | — | — |
| 10 | Cleanup Completeness | 9.4 | The C-15 leftover is removed; no stale symbols | — | — |

## Findings

None.

## Classification

N/A (Pass).

## Recommended Recipient

`/software_engineering_team/api_e2e_engineer`

## Residual Risks

- **AGY and ACP live exposure** of `list_available_agents`. It goes through the same requested-tools catalog, but this was not verified live.
- **Team-root and Org-root UIs** for agent-initiated items are unit-tested only.
- **REQ-007 changes Org behavior:** copies of mounted Teams no longer reach the mounted Team. This is approved and documented.
- **Bring-in latency:** a first message to a catalog address includes admission (validation plus one tree write, once per collaborator) and holds that root's admission queue.
- **Downgrade:** an older build ignores `source`, so restoring a catalog copy fails. Unsupported.
- **Pre-existing failure:** `application-framework-boundaries.test.ts` fails on base since the predecessor (`collaborator-definition-catalog.ts` getters). Worth a separate cleanup.
- **C-11** (Agent-root self-delegation) is unchanged.

## API/E2E Failure-Origin Review (Round 2)

Scenario basis: SC-002 / UC-004 (a delegated catalog Team copy works through its own authored handoffs) and AC-011 (the UI shows agent-initiated copies like the predecessor's rows). Both are Supported Normal Scenarios, reached live through real `delegate_task` calls and the desktop app.

| Failure | Source Evidence (at `2dfbd1843`) | Origin | Detectable In Source Review? | Classification / Owner |
| --- | --- | --- | --- | --- |
| F-01: members of a catalog Team copy get no handoff rules (and the wrong or no team instruction) | The copy is **prepared** correctly: `team-task-execution-adapter.ts` builds the copy's TeamRun with `source.handoffs`, and the record persists `source`. But each root builds a member's collaboration scope from **root-level** facts only, never from the containing copy's `source`. (1) **Team root:** `createTeamFlatExecutionCallbacks` passes the *root* `teamContext` for every member, and `resolveMemberScope` → `collaboratorMemberScope` checks `collaborators[]` only. For a catalog copy member the scope is null, so `outgoingHandoffs` = root handoffs filtered by `from` = none, **and** the instruction falls back to `teamContext.teamNode.teamDefinitionId` = the **root team's authored instruction** (`member-team-context-builder.ts:82`). The same applies to a single-agent catalog copy, which is not a member of the root team. (2) **Org root:** `agent-org-execution-scope-builder.ts` uses `agentOrgHandoffs(tree)` = Org handoffs plus collaborator Teams; catalog copies are missing, and `resolveFreshInstruction` gives null. (3) **Agent root:** `agent-run-collaboration-root-builder.ts#buildChildContext` uses `collaboratorOf` over `collaborators[]` only, giving `team = null`, no handoffs and no instruction. | Implementation defect. The design intent is explicit: DS-003 prepares team copies with "the source handoffs", and REQ-007 says a team instance is one unit. **Review gap (CRR-001):** I verified that `source` is persisted and used for activation and restore, but did not trace member-context construction for catalog copies. | Yes. Tracing a catalog copy member's `MemberExecutionContext.outgoingHandoffs` would have shown it. | `Local Fix` → implementation. Resolve a member's scope (handoffs plus team definition for the instruction) from its **containing team instance**, including a task copy's recorded `source`, in all three roots. This is ideally one shared rule over the index ("containing instance → configured, collaborator or catalog source") instead of three ad hoc lookups. A catalog Agent copy in a Team root must not inherit the root team's instruction. Tests: a catalog Team copy member gets its handoffs and its own team instruction in each root, plus a live recheck (LE-A2/T1/O1). |
| F-02: Team-root catalog copy rows show raw segments (`marketing_team`, `marketing_content_creator`) | `teamExecutionTreeSelectors.ts#projectNavigationRows`: `nameOf` applies `memberDisplayName` only when `isCollaboratorAddress(...)`; otherwise `memberAddressBasename`. A catalog copy is not a collaborator, so it gets the raw basename. The Agent and Org roots already format catalog copies (`DO-04`). | Implementation defect (F-03 parity from the predecessor not extended to catalog copies) | Partly: the source read showed the formatter gated on collaborators, but it rendered only live. | `Local Fix` → implementation. Format a sourced copy and its members (`team.source` present) like collaborators, matching the Agent and Org roots. Add a spec. |

### Affected Findings (round 2)

- **CR-001 (High; F-01):** catalog Team copy members lack their own handoffs and team instruction (Team root: they get the root team's instruction) in all three roots.
- **CR-002 (Medium; F-02):** Team-root catalog copy rows and members are unformatted.

### Score Rationale Updates (affected only)

The round-1 scores for Runtime Correctness (9.2) and API/E2E Readiness (9.2) are superseded by CR-001. A catalog Team copy cannot run its authored workflow, which is the core of SC-002.

### Classification (round 2)

- `Local Fix` (both) → `/software_engineering_team/implementation_engineer`. No design change: the approved design already requires it.
- After the fix: source review, then API/E2E again (LE-A2/T1/O1 and the desktop Team-run copy rows).
- API/E2E's durable test changes are **not** reviewed in this failure-origin round. They are reviewed after a passing run:
  - added `tests/e2e/runtime/agent-initiated-collaborators.e2e.test.ts`;
  - updated `tests/e2e/runtime/standalone-agent-collaborator-mention.e2e.test.ts`. Its first-turn step now targets an unknown address, which is consistent with REQ-005, under which a listed address starts a copy.

### Reclassification (CRR-003, user-directed)

- **CR-001 is reclassified from `Local Fix` to `Design Impact`** at the user's direction ("the error is serious… it should be classified as design issue").
- Structural basis, from the code:
  - Each root derives a member's scope (handoffs and team instruction) from root-level facts in its own way: the Team root passes the root `teamContext` to every member with a collaborator-only override; the Org root uses one tree-wide handoff list; the Agent root uses `collaboratorOf` over `collaborators[]`.
  - Nothing owns the rule "a member's scope comes from its containing team instance".
  - The design (SR-005) never names that owner. Its file mapping omits the member-context builders, so catalog copies were never covered, and the architecture review did not catch it.
  - This is a `Missing Invariant` plus `Duplicated Policy Or Coordination`. Fixing it as three ad hoc patches would leave the next copy kind exposed.
- Required design response, for the solution designer:
  - Name one owner for member scope ("containing instance → configured placement, collaborator entry, or a task copy's recorded `source`"), used by all three roots for handoffs and the authored team instruction.
  - Specify that a catalog Agent copy in a Team root gets no root-team instruction.
  - Add it to the file mapping, then the architecture review, then implementation.
- **CR-002 stays `Local Fix`** (Team-root row naming). It is carried with the package so implementation can fix it in the same cycle.

## Implementation Review — Round 3 (IR-002, SR-006)

### Basis And Checks

- Trigger: IR-002, `9b594693b` (fix) and `d651e10b8` (record), on `2dfbd1843`. Design SR-006 (ARCH-REV-004 Pass) answers CR-001 (Design Impact). CR-002 is a Local Fix.
- Scope: 24 files (+579/−110):
  - `member-instance-scope.ts` (new);
  - the Team, Org and Agent-root member-context builders and callbacks;
  - `FlatTeamAgentExecutionHandle` (`hostTeam`);
  - the web `teamExecutionTreeSelectors.ts` and `teamExecutionContextFactory.ts`;
  - tests and docs.
- Reviewer checks:
  - server `tsc -p tsconfig.build.json`: clean.
  - Affected server suites (all of agent-collaboration, agent-team-execution, agent-org-execution, agent-run-collaboration, the prompt tests and the changed tests): 389/400. The 11 failures are all in `team-run-model-selection-save.test.ts`, which is **pre-existing on base**: it fails identically in the clean base-worktree baseline `/tmp/aic-baseline/server-base-clean.json`, and the branch touches no model-selection code.
  - Web: 13 files, 87/87.
  - The shared `dist/` output was removed afterwards. API/E2E's uncommitted test files are untouched.

### Verification Against SR-006

| Rule / Item | Status | Evidence |
| --- | --- | --- |
| One owner (`resolveMemberCollaborationScope`, pure) | Confirmed | `agent-collaboration/execution/domain/member-instance-scope.ts`. Rules in order: (1) the non-root hosting instance, when `parent === host.address` → that instance's handoffs and team definition; (2) a root-level configured placement or a copy at it → the root's handoffs and definition; (3) otherwise none |
| Hosting instance facts from its own context | Confirmed | `FlatTeamAgentExecutionHandle` passes `hostTeam` = `{teamNode.address, teamDefinitionId, teamContext.handoffs}` on both build paths (construction and restore). Root-hosted agents (`RootAgentExecutionRegistry`) pass none. |
| Team root | Confirmed | Root members: host `/` → rule 2 with `configuredRootAddresses` = root `teamNode.children` and root handoffs, the same as before. A copy at a configured address gets rule 2 (preserved). Collaborator Agents and catalog Agent copies are not in `teamNode.children`, so rule 3 (**no root-team instruction**). Collaborator Team, copy and catalog copy members: rule 1 with the copy's own `source.handoffs` (the adapter builds the copy TeamRun with them). |
| Org root (AC-012 preserved) | Confirmed | Mounted Teams are still prepared with the Org-wide `executionTree.handoffs` (scope builder line 160), so mounted members keep their cross-placement Org handoffs and Team instruction (rule 1). Direct Agents get rule 2 (Org handoffs and instruction). Collaborator Agents and catalog Agent copies get rule 3. Catalog Team copy members get rule 1 with their own source. `resolveInstruction` reads the Org or Team definition fresh. |
| Agent root | Confirmed | Root facts are empty. Team instances (collaborator Team, copies, catalog copies) get rule 1; everything else gets none. |
| Special cases removed | Confirmed | No `collaboratorMemberScope`, `resolveMemberScope`, `scope` override, `agentOrgHandoffs`, `resolveFreshInstruction` or `collaboratorOf` remain (grep). |
| `teamScoped` unchanged | Confirmed | — |
| CR-002 | Confirmed | `readsAsDisplayName` = collaborator **or** catalog copy, where a catalog copy is a task execution with `source` at that first segment, found by walking root and collaborator-Team task executions and nested copies. Used by `projectNavigationRows` and `teamExecutionContextFactory.ts`. Render evidence: `implementation-evidence/render-check-aic-team/` ("product team" ×2, "product prototyper", "prototype bootstrapper"). |

### Candidate Gate (round 3)

| Candidate | Observation | Disposition | Reason |
| --- | --- | --- | --- |
| C-10 | Rule 1 matches direct members only (`parent === host.address`) | Reject | `FlatTeamDefinitionResolver` mounts members directly, and the `source` schema enforces direct members. Nested teams are separate TeamRuns with their own `hostTeam`. |
| C-11 | Catalog-copy detection on the web is by first address segment | Reject | Catalog addresses never collide with in-use segments, because the map hashes them, so a segment identifies one definition's copies. |
| C-12 | Org copies of mounted Teams carry the Org-wide handoff list on their TeamRun | Reject (preserved behavior) | It is the same list as before, filtered by `from`. Address resolution stays instance-relative (REQ-007). |

### Prior Findings (round 3)

| Finding | Status | Evidence |
| --- | --- | --- |
| CR-001 (Design Impact) | Resolved by SR-006 and IR-002 | The single owner is used in three roots. Unit tests for rules 1–3. Org AC-012 test (`agent-org-member-scope.test.ts`). Team-root and Agent-root copy scope, including after Stop and reopen. Live recheck (LE-A2/T1/O1) is with API/E2E. |
| CR-002 (Local Fix) | Resolved | `readsAsDisplayName`; spec; render evidence |

### Scorecard (round 3, authoritative)

- Overall: 9.3/10 (93/100). Every category is at 9.0 or above.

| Priority | Category | Score | Why | Weakness | Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.4 | The member-scope bounded spine is explicit and the same in all roots | — | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.5 | CR-001's root cause (no owner) is fixed with one pure owner; three ad hoc paths are removed | — | — |
| 3 | API / Interface / Query / Command Clarity | 9.3 | An optional `hostTeam` on the existing callback; explicit root facts | — | — |
| 4 | Separation of Concerns and File Placement | 9.1 | The owner is in the root-neutral execution domain, and the builders shrank | Org and Agent roots are still at 480/471 (unchanged) | Extract before the next growth |
| 5 | Shared-Structure / Data-Model Tightness | 9.4 | `MemberHostTeam` and `MemberScopeRootFacts` are tight | — | — |
| 6 | Naming Quality and Local Readability | 9.3 | `resolveMemberCollaborationScope`, `readsAsDisplayName` | — | — |
| 7 | API/E2E Readiness | 9.1 | Typecheck clean; affected suites green apart from a pre-existing base failure; render check live | Copy scope is unit-proven but not yet live; AGY/ACP not live | API/E2E recheck |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.2 | Catalog copy members get their own handoffs and instruction; the Team-root wrong-instruction case is fixed; AC-012 preserved | — | — |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.4 | Special cases removed, not wrapped | — | — |
| 10 | Cleanup Completeness | 9.4 | No stale scope helpers left | — | — |

## API/E2E Failure-Origin Review (Round 4, API-REV-002)

- Trigger: API-REV-002 Fail at 93%, with one finding, DI-01 (user-agreed Design Impact). Every executed case passed.
- Resolved live:
  - F-01: catalog Team copies' own handoffs and instruction, on Claude, Codex and AGY in all applicable roots;
  - F-02: desktop Team-root names;
  - AGY/ACP `list_available_agents` exposure;
  - the forced race (one instance, same run ID);
  - SC-004 (`COLLABORATOR_ADD_FAILED`, copy refused, nothing added);
  - AC-012 Org and Team regressions, including after Stop and reopen;
  - the predecessor suites;
  - the desktop restart.
- Evidence:
  - `api-e2e-evidence/desktop/DO-05-org-rows-r2.png`;
  - the ledger R2-6 stored-tree path, `rootOrg.members[1].taskExecutions[0]`;
  - the coverage report § DI-01.

| Failure | Supported Scenario | Source Evidence (at `d651e10b8`) | Origin | Classification / Owner |
| --- | --- | --- | --- | --- |
| DI-01: an Org catalog copy delegated by a mounted Team member is recorded and shown under that Team (`rootOrg.members[i].taskExecutions`, nested under "software engineering team"), although its address `/marketing_team` is Org-level and not a Team member | SC-002/UC-003 in an Org: a mounted Team member delegates a listed catalog team (Supported Normal) | `agent-org-task-execution-adapter.ts:86`: `host = index.requireAgent(delegator).host`, so the copy always joins the delegator's host. The Team root, by contrast, places copies by address (`TeamExecutionScopeResolver.resolveTargetOwner`: the containing ancestor whose address is the target's parent, else the root). Design SR-005/006 DS-003 says "The host rule is unchanged", so the implementation follows the approved design. | **Design Impact.** The approved host rule (carried from the predecessor's AR-006 table, "Delegator's host") is inadequate for catalog copies at Org-level addresses. The two roots now use different placement rules for the same concept. Member scope and address resolution are unaffected: rule 3 / the copy's own TeamRun applies. The consequence is wrong placement in the persisted tree and the UI, and wrong lifetime grouping under the mounted Team's TeamRun. | `Design Impact` → `/software_engineering_team/solution_designer` |

### Classification Notes (round 4)

- **Not a source-review defect:** the implementation matches DS-003. It is partly a review gap in rounds 1 and 3: I accepted "host rule unchanged" without testing it against catalog addresses delegated from inside a mounted Team.
- Requested design decision (per API/E2E and the user):
  - a copy is recorded at the level its address belongs to, so `/marketing_team` goes to `rootOrg.taskExecutions`, with `delegatorAgentRunId` = the solution designer;
  - teammate copies stay inside their team;
  - ideally one placement rule shared by the Org and Team roots.
- The designer must also decide the side effect: a mounted member's copy of another Org-level address (for example `/coordinator`) would also move to the Org level.
- Stored runs keep their recorded placement: the readers already accept both hosts, and that should be confirmed in the design.
- API/E2E's durable test changes (the extended `agent-initiated-collaborators.e2e.test.ts`) are not reviewed in this failure-origin round. They are reviewed after a passing run; API/E2E plans a placement assertion in LE-O1.

## Implementation Review — Round 5 (IR-003, SR-007)

- Trigger: IR-003, `e2c658e3d` (implementation) plus `7ae1335c8` (record). Basis: requirements SR-007 (REQ-012/AC-013, user-approved) and design SR-007 "Copy Placement By Address" (ARCH-REV-005 Pass). Answers DI-01.
- Scope: 15 files (+215/−61):
  - `agent-collaboration/execution/task/task-copy-host.ts` (new);
  - the Org, Agent-root and Team task adapters;
  - `team-execution-scope-resolver.ts` (removed);
  - tests and docs.
- Reviewer checks:
  - server typecheck: clean.
  - Affected suites (agent-collaboration, agent-team-execution including integration, agent-org-execution, agent-run-collaboration): 433/444. The 11 failures are all the base-verified pre-existing `team-run-model-selection-save.test.ts`.
  - No `TeamExecutionScopeResolver` or `requireAgent(delegator).host` placement remains.
  - The worktree is as received.

| Item | Status | Evidence |
| --- | --- | --- |
| One pure placement owner (REQ-012) | Confirmed | `resolveTaskCopyHost(index, delegator, target)`: the first of the delegator's containing instances (`teamInstancesOf`, deepest first, never `/`) whose address is the target's parent; otherwise the root |
| Team root unchanged in behavior | Confirmed | Team `teamInstancesOf` = `listTeamAncestorsDeepestFirst(containingTeamRunId)` minus `/`. That is the removed resolver's walk, with the same root fallback. The commit-time `expectedHost` re-check uses the same owner. |
| Org and Agent root | Confirmed | Activation builds the host identity from the owner. The root identity (`hostRunId` = root run ID, `hostAddress` `/`) matches each index's own root host (`agent-org-execution-index.ts:229`, `agent-run-collaboration-execution-index.ts:71`). A mounted member's catalog or Org-level copy goes to `rootOrg.taskExecutions` with `delegatorAgentRunId`; teammate copies stay in the team. |
| Stored runs | Confirmed | Restore uses the recorded host. A test reopens a copy stored under a team by the old rule in place, with no migration (`Directly Usable`). |
| Unaffected | Confirmed | Member scope (CR-001 owner), address resolution (REQ-007), and lifetime (root-hosted copies were already supported in the Org and Agent roots) |
| UI | Confirmed (by design) | Root-hosted copies already render at the top level. "Started by" stays in the accessible label only (REQ-009). Live check is with API/E2E (LE-O1 placement assertion). |

**Candidate gate (round 5):** C-13, the side effect for an Org root-level delegator (for example `/director`) delegating to a mounted Team's member address (`/eng/dev`). Its containing instances are empty, so the copy goes to the root, not under `/eng`. Disposition: Reject. This matches REQ-012 ("inside the **delegator's own** team instance…, otherwise top level"), the prior Team-root rule, and the prior Org behavior (the delegator's host was the root).

**Prior findings:** DI-01 is resolved by SR-007 and IR-003. CR-001 and CR-002 remain resolved; the source is unchanged by this round.

**Scorecard (round 5, authoritative):** 9.3/10, with every category at 9.0 or above. The round-3 rationale carries over. Changes:
- Priority 2, Ownership: 9.5. Placement now has one owner, matching the member-scope owner.
- Priority 8, Runtime Correctness: 9.3. The Org and Agent roots agree with the Team root.
- Priority 7, API/E2E Readiness: 9.1. The live placement check is still pending.

## Latest Authoritative Result

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review` (round 5, IR-003 / SR-007)
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: 9.3/10 (93/100). Every category is at 9.0 or above.
- Failure Origin: `N/A`
- Recommended Recipient: `/software_engineering_team/api_e2e_engineer`
- Notes:
  - API/E2E should add and run the LE-O1 placement assertion (AC-013) in Org, Team and standalone runs, plus the desktop Org tree.
  - Durable test review after a passing run.
