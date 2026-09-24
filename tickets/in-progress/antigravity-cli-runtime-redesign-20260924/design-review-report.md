# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/antigravity-cli-runtime-redesign-20260924/tickets/in-progress/antigravity-cli-runtime-redesign-20260924/requirements-doc.md` (approved SR-016 baseline + SR-021 REQ-011/AC-010).
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/antigravity-cli-runtime-redesign-20260924/tickets/in-progress/antigravity-cli-runtime-redesign-20260924/investigation-notes.md`.
- Upstream Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/antigravity-cli-runtime-redesign-20260924/tickets/in-progress/antigravity-cli-runtime-redesign-20260924/solution-revision-record.md`.
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/antigravity-cli-runtime-redesign-20260924/tickets/in-progress/antigravity-cli-runtime-redesign-20260924/design-spec.md` (revised SR-021).
- Supplemental Task Artifacts Reviewed: `/Users/normy/autobyteus_org/autobyteus-worktrees/antigravity-cli-runtime-redesign-20260924/tickets/in-progress/antigravity-cli-runtime-redesign-20260924/agy-cli-experiment-report.md`; `/Users/normy/autobyteus_org/autobyteus-worktrees/antigravity-cli-runtime-redesign-20260924/tickets/in-progress/antigravity-cli-runtime-redesign-20260924/agy-tool-event-capture-analysis.md` and raw captures; SR-018/019 workspace, MCP, skill and toolset probe scripts/raw results; `/Users/normy/autobyteus_org/autobyteus-worktrees/antigravity-cli-runtime-redesign-20260924/tickets/in-progress/antigravity-cli-runtime-redesign-20260924/agy-command-outcome-matrix-probe.py` and `/Users/normy/autobyteus_org/autobyteus-worktrees/antigravity-cli-runtime-redesign-20260924/tickets/in-progress/antigravity-cli-runtime-redesign-20260924/agy-command-outcome-matrix-probe/summary.json` plus raw stdout/stderr; triggering IR-001 `/Users/normy/autobyteus_org/autobyteus-worktrees/antigravity-cli-runtime-redesign-20260924/tickets/in-progress/antigravity-cli-runtime-redesign-20260924/implementation-handoff.md` and `/Users/normy/autobyteus_org/autobyteus-worktrees/antigravity-cli-runtime-redesign-20260924/tickets/in-progress/antigravity-cli-runtime-redesign-20260924/implementation-revision-record.md`; superseded `/Users/normy/autobyteus_org/autobyteus-worktrees/antigravity-cli-runtime-redesign-20260924/tickets/in-progress/antigravity-cli-runtime-redesign-20260924/design-direction-proposal.md` for chronology only.
- Relevant Solution Revision IDs: SR-016, SR-017, SR-018, SR-019, SR-020 (superseded), SR-021; IR-001 triggering checkpoint.
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/antigravity-cli-runtime-redesign-20260924/tickets/in-progress/antigravity-cli-runtime-redesign-20260924/architecture-review-revision-record.md`.
- Current Architecture Review Revision ID: ARCH-REV-003.
- Current Review Round: 3.
- Trigger: User-approved SR-021 AGY DONE-to-success design revision after partial IR-001 Requirement Gap; ARCH-REV-002 did not review this semantic change.
- Prior Review Round Reviewed: ARCH-REV-002 Pass on SR-019; ARCH-REV-001/DR-001 resolution rechecked and unaffected.
- Latest Authoritative Round: 3.
- Current-State Evidence Basis: approved SR-021 user direction, AGY 1.2.10 exact raw outcome matrix (exit 0, exit 8, command-not-found, denial), prior exit-7 capture, current canonical event/trace/hydration consumers and partial IR-001 neutral-event implementation at `03bf9a370`. Provider probes are not product integration or rendered E2E validation.

## Routing Classification Review

- Task size: **Large**.
- Architectural risk: **High**.
- Classification rationale reviewed: new provider process, identity/project/restore, scoped MCP, canonical event persistence and web policy across standalone/team/org boundaries.
- Independent Architecture Review required by the classification: **Yes**.
- Classification evidence or correction required: None.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: **Confirmed**.
- Approved requirements / intended behavior understood: SR-016's structured AGY/identity/binding/default/trace baseline and SR-019 workspace correction remain. SR-021 explicitly changes AGY tool `DONE` without explicit error to canonical success/green **as provider-step convention**, knowingly including nonzero shell exits; tool `ERROR`/explicit error remains failed/denied and no shell exit code may be invented. Other runtimes and no-archive/no-PTY/no-headless-approval boundaries remain.
- Relevant existing behavior and evidence confirmed: current canonical `TOOL_EXECUTION_SUCCEEDED` flows through recorder/raw trace, live WebSocket, team projection and green UI; partial IR-001 added neutral `TOOL_EXECUTION_COMPLETED`/completed-unverified with AGY as its only observed production producer. Raw AGY controls show exit 0, exit 8, command-not-found all tool ACTIVE→DONE with no structured shell exit, while denied command emits ERROR and `denied_actions` despite overall SUCCESS. Current `RuntimeToolTraceSequencer` persists terminal `result` data, not arbitrary top-level event fields, so AGY source state/output must be inside the persisted result shape. Prior workspace/config design remains verified.
- Scope guardrail confirmed: In scope SCN-001–004/BEH-001–006 and preserved SCN-005; out of scope old-branch merge/migration, global settings mutation, guessed resume and invented provider payload; technical review cannot introduce new UX or security policy.
- Approved change, preserved behavior, and outside scope understood: Yes.
- Every prospective blocking Design Impact finding is traceable to approved requirement, acceptance criterion, or preserved-behavior ID: **Yes — no technical blocker identified; DR-001 remains resolved.**
- Remaining material ambiguity: No intended-behavior ambiguity. Command exit is structurally unreported in the tested AGY stream; the user knowingly chose provider-step success. Product live/reloaded behavior remains downstream validation.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | New runtime selection | Pass | Pass | Pass | Confirmed | None. |
| BEH-002 | Full agent/member identity | Pass | Pass | Pass | Confirmed | Verify custom-agent loading and scoped MCP in downstream live checks as designed. |
| BEH-003 | Exact create/restore binding | Pass | Pass | Pass | Confirmed | None; idle-init reviewer control reinforces pre-input feasibility. |
| BEH-004 | Permission/default policy | Pass | Pass | Pass | Confirmed | None. |
| BEH-005 | Run isolation and real workspace | Pass | Pass | Pass | Confirmed | SR-019 names selected task root in the main-agent snapshot, retains config in capsule, saves path for restore and gates actual target-path validation; DR-001 resolved. |
| BEH-006 | Canonical trace/history and SR-021 tool status | Pass | Pass | Pass | Confirmed | Map DONE/error priority per REQ-011; preserve source state/output in result data, and verify live/reloaded green/red parity plus neutral-seam removal. |
| SCN-005 | Preserved runtimes | Pass | Pass | Pass | Confirmed | Regression checks remain required. |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `agy-cli-experiment-report.md` + adjacent probes/results | Pass | Pass | Pass | Pass | Pass | Evidence only; no product-integration claim. |
| `agy-tool-event-capture-analysis.md` + raw stdout/stderr/capture scripts | Pass | Pass | Pass | Pass | Pass | Preserve as provider fixture evidence. |
| `design-direction-proposal.md` | Pass | Pass | Pass | Pass | Pass | Superseded/non-authoritative; do not implement from it. |
| SR-018/019 workspace, MCP, skill and toolset probe scripts/raw summaries | Pass | Pass | Pass | Pass | Pass | Evidence only; supplied results are bounded CLI 1.2.10 controls, not AutoByteus integration. |
| SR-021 command-outcome matrix script/summary/raw files | Pass | Pass | Pass | Pass | Pass | Exact terminal states support the changed convention, not underlying command success or product E2E. |
| IR-001 implementation handoff/revision record | Pass | Pass | Pass | Pass | Pass | Partial/unaccepted trigger; separate segment-lifecycle fix has no independent live confirmation. |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for current task posture | Pass | Design §Task Design Health Assessment. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | Boundary/ownership pressure and model-catalog fallback tied to current paths. | None. |
| Refactor decision is explicit | Pass | Bounded provider/model/draft refactor now; unrelated internals excluded. | None. |
| Refactor reflected in design or residual rationale | Pass | SR-021 removal plan names IR-001's AGY-only neutral event/trace/UI seam; changed converter path and live/reload test sequence are explicit. | None. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | Ownership Is Clear? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary create/selected workspace | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Primary exact restore | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Return/event trace, changed DONE mapping | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 | Bounded turn loop | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

DS-001 now distinguishes AGY's capsule project/config root from the selected task workspace and carries the latter into the main-agent snapshot, `--add-dir`, saved manifest and target-path verification. The claim is model-directed task targeting, not a provider-level cwd or sandbox guarantee.

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| AgentRunManager/provider backend | Pass | Pass | Pass | Pass | No parallel frontend/PTY execution route. |
| AGY backend/capsule/process/converter | Pass | Pass | Pass | Pass | Capsule owns generated config; backend binds selected task workspace and validates targets in acceptance checks. |
| MCP session authority | Pass | Pass | Pass | Pass | Actual AGY invocation remains downstream validation. |
| Recorder/projection | Pass | Pass | Pass | Pass | Converter does not write history directly. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Orchestration → AGY backend | Pass | Pass | Pass | Pass | Manager consumes backend contract. |
| AGY internals → canonical events/MCP descriptor | Pass | Pass | Pass | Pass | No frontend or history-store bypass. |
| Web draft → launch config | Pass | Pass | Pass | Pass | AGY-only shared transition. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `createBackend` / `restoreBackend` | Pass | Pass | Pass | Low | Pass |
| `dispatchUserInput` / `getPlatformAgentRunId` | Pass | Pass | Pass | Low | Pass |
| `convert(providerEvent, turnContext)` | Pass | Pass | Pass | Medium | Pass |
| AGY DONE/error → canonical terminal result | Pass | Pass | Pass | Medium | Pass |
| `applyNewDraftRuntimeSelection` | Pass | Pass | Pass | Medium | Pass |
| Selected workspace → AGY capsule/project/tool task root | Pass | Pass | Pass | Medium | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Identity, MCP, binding, trace | Pass | Pass | Pass | Pass | Reuses shared composer, session authority, activation and recorder. |
| Process and converter | Pass | Pass | Pass | Pass | Provider-specific leaf is justified. |
| Workspace resolution | Pass | Pass | Pass | Pass | Selected absolute path is stored and added to generated main-agent body; not represented as primary cwd. |
| Configured skills | Pass | Pass | Pass | Pass | Uses SkillService and current external-runtime `PRELOADED_ONLY`/`NONE` meaning; capsule owns AutoByteus-generated links only. Provider-native discovery remains outside this materializer. |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Runtime/model services; manager; AGY backend; memory; web launch | Pass | Pass | Pass | Pass | Exhaustive AGY branch avoids Codex fallback. |
| AGY workspace/capsule integration | Pass | Pass | Pass | Pass | Capsule owns provider config; selected workspace binding and task-root guidance are explicit. |
| AGY MCP/configured-skill materializers | Pass | Pass | Pass | Pass | Run-local AutoByteus entry/packages; not a claim to control provider/user-global sources. Real AutoByteus MCP and team attribution remain validation gates. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Provider message guards, capsule manifest, draft transition, step correlation | Pass | Pass | Pass | Pass | Manifest now includes the selected workspace and configured-skill decision; no duplicated provider-ID authority or global tool registry. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Capsule manifest / provider ID | Pass | Pass | Pass | Pass | Pass | Provider ID remains metadata authority. Fingerprint on restore must validate saved snapshot integrity, not current edited definition. |
| `TOOL_EXECUTION_SUCCEEDED` result for AGY DONE | Pass | Pass | Pass | Pass | Pass | Provider-step success is distinct from shell exit; keep `provider_state: DONE` and exposed output in `result` so raw trace/reload retains them. Never add synthetic `exit_code: 0`. |
| Configured-skill mode/bindings | Pass | Pass | Pass | Pass | Pass | `NONE` suppresses AutoByteus-configured package materialization, not unrelated AGY skill discovery. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches Intended Owner/Boundary? | Responsibilities Re-Tightened? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| AGY backend/capsule/stream files | Pass | Pass | Pass | Pass | SR-019 adds task-root binding, main-agent stanza, tool frontmatter, scoped MCP and configured-skill materializer under capsule owner. |
| Existing runtime/model/manager/web/trace files | Pass | Pass | Pass | Pass | Reuse success/failed/denied consumers; remove AGY-only neutral branch across canonical event, DTO, trace, hydration, team projection and web rendering if no other producer remains. |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `backends/antigravity/{backend,capsule,stream}` | Pass | Pass | Low | Pass | Provider-specific leaf. |
| Existing runtime/model/web/trace areas | Pass | Pass | Low | Pass | Ownership follows current subsystems. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Non-Claude→Codex model fallback and duplicate draft mutations | Pass | Pass | Pass | Pass | In-scope replacement identified. |
| IR-001 neutral canonical/trace/UI branch | Pass | Pass | Pass | Pass | AGY converter is its only observed production producer; SR-021 names clean-cut deletion across consumers and tests, with local development-trace audit. |
| Old PTY/first-user/log-ID/NDJSON archive | Pass | N/A | Pass | Pass | Not on current base; do not import. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| AGY integration/IR-001 neutral branch | No | Pass | Pass | No released old AGY population; remove the unmerged neutral path if no independent producer exists. |

## Persisted-Data Transition Verdict

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? | Direct Use, Rebuild, Or Migration Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Existing run metadata/raw traces | Directly Usable — No Migration | Pass | Pass | N/A | Pass | Existing shape/generic readers unchanged; zero old AGY product records. |
| New AGY capsule | New run-owned data, not a transition | Pass | Pass | N/A | Pass | Retain while restorable; no provider-store ownership claim. |
| IR-001 local neutral trace | Discard or Rebuild — local development artifact only | Pass | Pass | N/A | Pass | One local test run is acknowledged; audit before cleanup and do not add historical-schema logic to released runtime. |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| AGY converter DONE/error remap → neutral-seam removal → raw-trace/web parity tests | Pass | Pass | Pass | Pass |
| Availability → capsule/MCP/skills → stream → activation → web/trace → E2E | Pass | Pass | Pass | Pass |
| Non-AGY regression and temporary test seams | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Identity, binding, tool outcome | Yes | Pass | Pass | Pass | Concise good/avoid examples. |
| DONE without shell exit vs ERROR denial | Yes | Pass | Pass | Pass | Exit-8 and command-not-found green by approved convention; denial stays failed, output retained, no invented exit code. |
| Selected-workspace task relative path with capsule cwd | Yes | Pass | Pass | Pass | Two-line agent text, positive file/shell target captures and explicit negative control distinguish provider config cwd from model-directed task root. |
| Configured skills and MCP visibility | Yes | Pass | Pass | Pass | Capsule MCP call and skill discovery controls are bounded; design rejects exclusive provider visibility. |

## Material Premise Validation

Prior MP-001/DR-001 remains resolved by SR-019 and is unaffected. The changed tool-status decision depends on these distinct supported initiating paths:

### MP-002 — A normal AGY coding command can exit nonzero while AGY emits tool DONE

- Related approved requirement or established contract: SR-021 REQ-011/AC-010 and REQ-009/AC-008; current chat-to-tool execution contract.
- Relevant behavior IDs: BEH-006; SCN-001/002.
- Initiating basis kind: User.
- Independent product-supported initiating trigger or applicable governing contract: user starts an AGY run in the exposed workspace/chat surface and requests an ordinary project command (for example, running tests or a build); a command failure is a normal possible outcome of that supported task, not an invented lifecycle state.
- Support evidence: the existing chat dispatch and AGY tool-use path; exact raw AGY 1.2.10 controls for `sh -c 'exit 8'`, command-not-found, and earlier `exit 7` reproduce the provider terminal shape. These synthetic commands demonstrate AGY's handling of a real command-failure class; they do not establish the user trigger by themselves.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: chat user input → AutoByteus run dispatch → AGY stdin user event → agent `run_command` → shell returns nonzero → AGY tool ACTIVE→DONE with no structured shell exit → SR-021 converter `TOOL_EXECUTION_SUCCEEDED` → canonical recorder/raw trace and green live/reloaded Event Monitor. Exposed output such as `command not found` remains visible.
- Lifecycle preconditions and material consequence at the claimed point: AGY high-trust enabled run; command executes and can fail. A green AutoByteus tool state then denotes AGY provider-step DONE, **not** verified shell exit zero. This consequence is explicitly approved, not inferred to be harmless.
- Reachability: **Reachable** for the supported user workflow and bounded provider behavior; other AGY versions/tool kinds still require validation.
- Review consequence / proportionate response: No finding. Preserve provider state/output, never synthesize exit 0, and test the counterexample in live and reloaded product views.

### MP-003 — A deliberately non-autoexecuting AGY run can receive a headless permission denial

- Related approved requirement or established contract: REQ-007/008/011, AC-006/007/010; explicitly false AGY policy.
- Relevant behavior IDs: BEH-004/006; SCN-001/002.
- Initiating basis kind: User.
- Independent product-supported initiating trigger or applicable governing contract: in the exposed new-run settings the user turns AGY `autoExecuteTools` off, then asks in chat for a permission-requiring command.
- Support evidence: the approved false-path contract and the AGY outcome-matrix denial control, which emitted tool ERROR/`denied_actions` while overall turn status was SUCCESS. The control reproduces the provider state; the UI toggle/chat action independently supplies the product trigger.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: explicit-off launch config → AGY headless request-review process → chat command request → AGY tool ACTIVE→ERROR with permission error → converter `TOOL_DENIED` (or failed for nonpermission explicit error) → raw trace and red/denied live/reloaded Event Monitor. Overall turn SUCCESS must not override the terminal tool error.
- Lifecycle preconditions and material consequence at the claimed point: no actionable per-tool approval channel exists for AGY headless; the attempted command is denied. Incorrect DONE-first or result-status-first mapping would falsely show success, violating the approved false-path behavior.
- Reachability: **Reachable** as an explicitly supported edge workflow.
- Review consequence / proportionate response: No finding; SR-021 explicitly prioritizes ERROR/explicit error and retains denial fixtures as a verification gate.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

**Pass.** SR-021's changed intended behavior is explicitly approved, the raw provider counterexamples are acknowledged rather than hidden, and DS-003/return path maps DONE, ERROR and denial through the existing authoritative canonical event/trace/UI boundary. The clean-cut IR-001 neutral-seam removal is concrete. No implementation or product E2E pass is inferred.

## Findings

None.

## Classification

N/A — Pass; no blocking finding.

## Recommended Recipient

`/implementation_engineer` for the primary reviewed-package handoff, followed by informational `/solution_designer` notification.

## Residual Risks

- The SR-021 green-success convention can describe an underlying failed shell command. Preserve AGY source `DONE` and any textual error/output in the canonical `result` data so both live and raw-trace reload retain it; no shell exit code or command-success fact may be fabricated. Actual product projection and provider-version/tool-category variation remain downstream tests.
- Model-directed selected-workspace targeting is not a filesystem sandbox or guarantee; test actual file/shell paths on the production-generated custom main agent, including generic requests, exact resume and concurrent runs. Do not report a task as safely targeted from turn `SUCCESS` alone.
- The AGY capsule MCP/skill probes are provider-side only. A real AutoByteus scoped MCP call, team/org attribution, configured-skill positive/`NONE` checks and user-owned collision behavior remain required acceptance gates; AGY-native subagents are out of scope.
- Custom-agent loading and eight-name tool frontmatter must be validated against each supported CLI version. `init.agent` or `init.tools` alone does not prove effective behavior.
- On restore, validate the capsule/identity fingerprint against the saved run-start snapshot, not an edited current definition. Preserve saved workspace binding and explicit non-restorable behavior for actual mismatch.
- Remove the IR-001 neutral `TOOL_EXECUTION_COMPLETED`/completed-unverified seam across canonical event, team/WebSocket DTO, trace/hydration and web consumers if no independent producer remains. Audit its local test trace; do not add a released-data migration. Recheck the separate `AGENT_SEGMENT_LIFECYCLE_INVALID` fix in a fresh rendered run; IR-001 local tests alone are not sign-off.

## Latest Authoritative Result

- Review Decision: **Pass**.
- Material-Premise Gate: **Pass**; no current in-scope mechanism/finding depends on an unsupported premise.
- Notes: ARCH-REV-003 / SR-016, SR-021; prior ARCH-REV-002/DR-001 resolution remains valid. Partial IR-001 implementation exists but is unaccepted and must resume against this reviewed basis before Code Review/API-E2E.
