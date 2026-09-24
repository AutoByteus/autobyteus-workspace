# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/antigravity-cli-runtime-redesign-20260924/tickets/in-progress/antigravity-cli-runtime-redesign-20260924/requirements-doc.md` (approved SR-016).
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/antigravity-cli-runtime-redesign-20260924/tickets/in-progress/antigravity-cli-runtime-redesign-20260924/investigation-notes.md`.
- Upstream Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/antigravity-cli-runtime-redesign-20260924/tickets/in-progress/antigravity-cli-runtime-redesign-20260924/solution-revision-record.md`.
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/antigravity-cli-runtime-redesign-20260924/tickets/in-progress/antigravity-cli-runtime-redesign-20260924/design-spec.md` (revised SR-019).
- Supplemental Task Artifacts Reviewed: `/Users/normy/autobyteus_org/autobyteus-worktrees/antigravity-cli-runtime-redesign-20260924/tickets/in-progress/antigravity-cli-runtime-redesign-20260924/agy-cli-experiment-report.md`; `/Users/normy/autobyteus_org/autobyteus-worktrees/antigravity-cli-runtime-redesign-20260924/tickets/in-progress/antigravity-cli-runtime-redesign-20260924/agy-tool-event-capture-analysis.md` and raw captures; SR-018/019 workspace, MCP, skill and toolset probe scripts/raw results indexed in `investigation-notes.md`; superseded `/Users/normy/autobyteus_org/autobyteus-worktrees/antigravity-cli-runtime-redesign-20260924/tickets/in-progress/antigravity-cli-runtime-redesign-20260924/design-direction-proposal.md` for chronology only.
- Relevant Solution Revision IDs: SR-016, SR-017, SR-018, SR-019; SR-015 provider-event evidence.
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/antigravity-cli-runtime-redesign-20260924/tickets/in-progress/antigravity-cli-runtime-redesign-20260924/architecture-review-revision-record.md`.
- Current Architecture Review Revision ID: ARCH-REV-002.
- Current Review Round: 2.
- Trigger: Solution Designer's revised Architecture Design Complete handoff, SR-019, resolving ARCH-REV-001/DR-001.
- Prior Review Round Reviewed: ARCH-REV-001 Fail (DR-001).
- Latest Authoritative Round: 2.
- Current-State Evidence Basis: same current branch `40b1783f40c072b577ad9d0c5d8fe4f5418c6c38`; current server/web paths and SR-018/019 provider captures. The negative no-guidance capsule write from round 1 remains valid. The exact two-line generated-agent stanza produced selected-real-workspace file and shell outputs in supplied AGY 1.2.10 controls. Independent disposable reviewer repeats with that stanza and **generic** requests that did not themselves name the workspace also created `review-generic.txt` and `review-generic-shell.txt` in the selected real directory, with no same-name capsule file. These are bounded provider observations, not integrated product passes or deterministic guarantees.

## Routing Classification Review

- Task size: **Large**.
- Architectural risk: **High**.
- Classification rationale reviewed: new provider process, identity/project/restore, scoped MCP, canonical event persistence and web policy across standalone/team/org boundaries.
- Independent Architecture Review required by the classification: **Yes**.
- Classification evidence or correction required: None.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: **Confirmed** for the approved, model-directed selected-workspace contract in SR-019.
- Approved requirements / intended behavior understood: SR-016 approves first-class structured AGY runs, run-start identity, exact provider binding, AGY-only default-on auto-execute, team/org members and normalized AutoByteus traces; it does not approve a second archive, PTY route or interactive AGY approval bridge.
- Relevant existing behavior and evidence confirmed: Codex/Claude workspace resolvers put execution cwd at the selected workspace; the shared prompt composer contains identity/team text but no workspace section. SR-017's capsule-plus-`--add-dir` alone failed a normal write. SR-019 adds a two-line selected-workspace statement to the generated **main** agent and records that path for restore. Both supplied and independent generic-prompt provider controls produced real-workspace targets while `init.cwd` remained capsule. Current activation/binding and canonical recorder paths are unchanged. Current external-backend skill materializers suppress AutoByteus-configured materialization for `NONE`, not provider-native discovery.
- Scope guardrail confirmed: In scope SCN-001–004/BEH-001–006 and preserved SCN-005; out of scope old-branch merge/migration, global settings mutation, guessed resume and invented provider payload; technical review cannot introduce new UX or security policy.
- Approved change, preserved behavior, and outside scope understood: Yes.
- Every prospective blocking Design Impact finding is traceable to approved requirement, acceptance criterion, or preserved-behavior ID: **Yes — none remains; DR-001 is resolved on the revised design.**
- Remaining material ambiguity: None requiring design rework. Model-directed path choice and AGY's nonexclusive discovery remain explicit residual risks, not a claim of filesystem isolation.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | New runtime selection | Pass | Pass | Pass | Confirmed | None. |
| BEH-002 | Full agent/member identity | Pass | Pass | Pass | Confirmed | Verify custom-agent loading and scoped MCP in downstream live checks as designed. |
| BEH-003 | Exact create/restore binding | Pass | Pass | Pass | Confirmed | None; idle-init reviewer control reinforces pre-input feasibility. |
| BEH-004 | Permission/default policy | Pass | Pass | Pass | Confirmed | None. |
| BEH-005 | Run isolation and real workspace | Pass | Pass | Pass | Confirmed | SR-019 names selected task root in the main-agent snapshot, retains config in capsule, saves path for restore and gates actual target-path validation; DR-001 resolved. |
| BEH-006 | Canonical trace/history | Pass | Pass | Pass | Confirmed | Exhaustive neutral-event consumer tests remain required. |
| SCN-005 | Preserved runtimes | Pass | Pass | Pass | Confirmed | Regression checks remain required. |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `agy-cli-experiment-report.md` + adjacent probes/results | Pass | Pass | Pass | Pass | Pass | Evidence only; no product-integration claim. |
| `agy-tool-event-capture-analysis.md` + raw stdout/stderr/capture scripts | Pass | Pass | Pass | Pass | Pass | Preserve as provider fixture evidence. |
| `design-direction-proposal.md` | Pass | Pass | Pass | Pass | Pass | Superseded/non-authoritative; do not implement from it. |
| SR-018/019 workspace, MCP, skill and toolset probe scripts/raw summaries | Pass | Pass | Pass | Pass | Pass | Evidence only; supplied results are bounded CLI 1.2.10 controls, not AutoByteus integration. |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for current task posture | Pass | Design §Task Design Health Assessment. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | Boundary/ownership pressure and model-catalog fallback tied to current paths. | None. |
| Refactor decision is explicit | Pass | Bounded provider/model/draft refactor now; unrelated internals excluded. | None. |
| Refactor reflected in design or residual rationale | Pass | Removal plan, paths and sequence. | None. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | Ownership Is Clear? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary create/selected workspace | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Primary exact restore | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Return/event trace | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
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
| Neutral `TOOL_EXECUTION_COMPLETED` | Pass | Pass | Pass | Pass | Pass | Distinct from underlying success; test all event consumers. |
| Configured-skill mode/bindings | Pass | Pass | Pass | Pass | Pass | `NONE` suppresses AutoByteus-configured package materialization, not unrelated AGY skill discovery. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches Intended Owner/Boundary? | Responsibilities Re-Tightened? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| AGY backend/capsule/stream files | Pass | Pass | Pass | Pass | SR-019 adds task-root binding, main-agent stanza, tool frontmatter, scoped MCP and configured-skill materializer under capsule owner. |
| Existing runtime/model/manager/web/trace files | Pass | Pass | Pass | Pass | Map is actionable, with implementation-time consumer audit. |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `backends/antigravity/{backend,capsule,stream}` | Pass | Pass | Low | Pass | Provider-specific leaf. |
| Existing runtime/model/web/trace areas | Pass | Pass | Low | Pass | Ownership follows current subsystems. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Non-Claude→Codex model fallback and duplicate draft mutations | Pass | Pass | Pass | Pass | In-scope replacement identified. |
| Old PTY/first-user/log-ID/NDJSON archive | Pass | N/A | Pass | Pass | Not on current base; do not import. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| AGY integration | No | Pass | Pass | Single structured mode; no old AGY product runs. |

## Persisted-Data Transition Verdict

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? | Direct Use, Rebuild, Or Migration Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Existing run metadata/raw traces | Directly Usable — No Migration | Pass | Pass | N/A | Pass | Existing shape/generic readers unchanged; zero old AGY product records. |
| New AGY capsule | New run-owned data, not a transition | Pass | Pass | N/A | Pass | Retain while restorable; no provider-store ownership claim. |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Availability → capsule/MCP/skills → stream → activation → web/trace → E2E | Pass | Pass | Pass | Pass |
| Non-AGY regression and temporary test seams | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Identity, binding, tool outcome | Yes | Pass | Pass | Pass | Concise good/avoid examples. |
| Selected-workspace task relative path with capsule cwd | Yes | Pass | Pass | Pass | Two-line agent text, positive file/shell target captures and explicit negative control distinguish provider config cwd from model-directed task root. |
| Configured skills and MCP visibility | Yes | Pass | Pass | Pass | Capsule MCP call and skill discovery controls are bounded; design rejects exclusive provider visibility. |

## Material Premise Validation

None newly needed in round 2. Prior MP-001 was a supported normal selected-workspace task under the superseded SR-017 design and drove DR-001. SR-019 addresses that path with the explicit two-line main-agent task-root snapshot, saved real-workspace binding and target-path acceptance checks. The negative no-guidance control remains true; it is not a witness that the revised prompt necessarily misroutes a task. Bounded positive controls, including independent generic-request file and shell cases, support feasibility without proving deterministic compliance. The user accepted model-directed targeting rather than a filesystem guard, so hypothetical future model misdirection does not itself authorize additional in-scope machinery.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

**Pass.** The approved behavior basis and revised target spines are coherent and actionable in the current codebase. DR-001 is resolved at architecture level; implementation/API-E2E must still verify production-generated identity, scoped MCP/team calls, selected-workspace targets and canonical replay.

## Findings

None.

## Classification

N/A — Pass; no blocking finding.

## Recommended Recipient

`/implementation_engineer` for the primary reviewed-package handoff, followed by informational `/solution_designer` notification.

## Residual Risks

- Model-directed selected-workspace targeting is not a filesystem sandbox or guarantee; test actual file/shell paths on the production-generated custom main agent, including generic requests, exact resume and concurrent runs. Do not report a task as safely targeted from turn `SUCCESS` alone.
- The AGY capsule MCP/skill probes are provider-side only. A real AutoByteus scoped MCP call, team/org attribution, configured-skill positive/`NONE` checks and user-owned collision behavior remain required acceptance gates; AGY-native subagents are out of scope.
- Custom-agent loading and eight-name tool frontmatter must be validated against each supported CLI version. `init.agent` or `init.tools` alone does not prove effective behavior.
- On restore, validate the capsule/identity fingerprint against the saved run-start snapshot, not an edited current definition. Preserve saved workspace binding and explicit non-restorable behavior for actual mismatch.
- Wire neutral `TOOL_EXECUTION_COMPLETED` through all canonical event consumers, including team stream/hydration and lifecycle projections; product raw-trace/frontend replay and non-AGY regressions are not yet established.

## Latest Authoritative Result

- Review Decision: **Pass**.
- Material-Premise Gate: **Pass**; no current in-scope mechanism/finding depends on an unsupported premise.
- Notes: ARCH-REV-002 / SR-016, SR-018–019; DR-001 resolved after verifying the corrected design and bounded provider evidence. Implementation has not yet occurred.
