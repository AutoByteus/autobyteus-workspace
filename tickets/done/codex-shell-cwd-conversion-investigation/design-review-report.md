# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-shell-cwd-conversion-investigation/tickets/done/codex-shell-cwd-conversion-investigation/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-shell-cwd-conversion-investigation/tickets/done/codex-shell-cwd-conversion-investigation/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-shell-cwd-conversion-investigation/tickets/done/codex-shell-cwd-conversion-investigation/design-spec.md`
- Supplemental Task Artifacts Reviewed: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-shell-cwd-conversion-investigation/tickets/done/codex-shell-cwd-conversion-investigation/codex-cwd-probe-evidence.md`
- Solution Revision Record Reviewed: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-shell-cwd-conversion-investigation/tickets/done/codex-shell-cwd-conversion-investigation/solution-revision-record.md`
- Relevant Solution Revision IDs: `SR-001`
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-shell-cwd-conversion-investigation/tickets/done/codex-shell-cwd-conversion-investigation/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-001`
- Current Review Round: `1`
- Trigger: Initial architecture review after user approval of the refined requirements and no-backfill boundary on 2026-08-21.
- Prior Review Round Reviewed: `N/A`
- Latest Authoritative Round: Round 1 / `ARCH-REV-001`
- Current-State Evidence Basis: Repository commit `a098b205ca990bf86b5e452950a49fc5dc39c8d1`; direct review of the Codex parser, event converter, approval coordinator, terminal-event projector, native-history normalizer, runtime trace sequencer/writer, and existing tests; version-exact `codex-cli 0.149.0` contract and live/probe evidence retained in the supplemental artifact.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status (`Confirmed`/`Contradicted`/`Blocked`): `Confirmed`
- Approved requirements / intended behavior understood: Preserve stable app-server `cwd` in canonical `run_bash` projection for live lifecycle, approval, future local traces, and native-history normalization, without changing Codex-owned execution or rewriting old traces.
- Relevant existing behavior and evidence confirmed: Current code routes live and approval payloads through `CodexToolPayloadParser.resolveToolArguments`; native-history normalization reuses the same method; the current `run_bash` branch synthesizes `command` but does not read top-level or nested `cwd`. Codex execution remains upstream-owned.
- Scope guardrail confirmed (`In-Scope Use Cases` / `Out of Scope` / `Preserved Behavior Boundary` / `Review Authority`): `Confirmed` for all four guardrail areas. The design stays inside the existing projection boundary and focused regression coverage.
- Approved change, preserved behavior, and outside scope understood: The change is representational only. Execution, command text, approval/sandbox policy, historical trace contents, raw-event integration, and frontend layout redesign remain unchanged or out of scope.
- Every prospective blocking `Design Impact` finding is traceable to an approved requirement, acceptance criterion, or preserved-behavior ID (`Yes`/`No`): `Yes`; no blocking finding remains.
- Remaining material ambiguity, if any: None.

| Behavior ID | Kind | Design Alignment With Approved Intent (`Pass`/`Fail`) | Approved Trigger / Contract And Current-State Evidence (`Pass`/`Fail`/`Unclear`) | Target Outcome / Path / Spine Coherence (`Pass`/`Fail`/`Unclear`) | Status (`Confirmed`/`Needs Correction`/`Unclear`) | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `BEH-001` | Contract | Pass | Pass — generated/live app-server evidence establishes `workdir` to stable `commandExecution.cwd`, and current AutoByteus code does not execute the command. | Pass — DS-001 preserves Codex as the execution owner. | Confirmed | None |
| `BEH-002` | System | Pass | Pass — live `item/started` and `item/completed` paths reach the event converter and shared parser; terminal projection also resolves arguments through that parser. | Pass — DS-002 carries exact `cwd` to canonical lifecycle consumers and future trace persistence. | Confirmed | None |
| `BEH-003` | User / System | Pass | Pass — the supported command-approval request carries optional top-level `cwd`; the approval coordinator forwards request params and the converter uses the shared parser. | Pass — DS-003 adds approval context without changing identity, policy, or response handling. | Confirmed | None |
| `BEH-004` | Operational | Pass | Pass — native `thread/read` normalization and the live trace writer paths are identified and verified; existing argument readers use open JSON records. | Pass — DS-004 corrects read-time normalization, while DS-002 supplies future local persistence and the approved no-backfill decision remains intact. | Confirmed | None |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? (`Pass`/`Fail`) | Linked To Relevant Core Artifacts? (`Pass`/`Fail`) | Internally Complete? (`Pass`/`Fail`) | Consistent With Related Core Artifacts? (`Pass`/`Fail`) | Status And Approval Applicability Are Clear? (`Pass`/`Fail`) | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `codex-cwd-probe-evidence.md` | Pass | Pass | Pass | Pass | Pass — complete, evidence-only, approval N/A | None |

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Requirements, investigation notes, and design spec consistently classify the task as a small bug fix. | None |
| Root-cause classification is explicit and evidence-backed | Pass | Live and native-history omissions converge on the existing shared parser; current code confirms the missing field promotion. | None |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | The design explicitly selects `No` refactor needed now. | None |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | One established owner already serves all affected projections; the design confines the production edit there and rejects duplicate adapters or execution paths. | None |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `DS-001` | Primary end-to-end command execution | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-002` | Return/event live projection and future trace persistence | Pass | Pass | Pass — lifecycle selection, argument transformation, and persistence ownership are distinguished. | Pass | Pass | Pass | Pass |
| `DS-003` | Return/event command approval projection | Pass | Pass | Pass — approval coordination and argument transformation remain separate. | Pass | Pass | Pass | Pass |
| `DS-004` | Bounded local native-history normalization | Pass | Pass | Pass — history assembly delegates shared argument extraction rather than duplicating it. | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Stable Codex app-server V2 command item/request | Pass | Pass | Pass | Pass | Raw model `workdir` remains diagnostic; stable `cwd` is the integration source. |
| `CodexToolPayloadParser.resolveToolArguments` | Pass | Pass | Pass | Pass | Event and history paths use the shared parser; the design forbids consumer-specific extraction. |
| Canonical `AgentRunEvent.payload.arguments` | Pass | Pass | Pass | Pass | UI and memory consumers remain provider-shape agnostic. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Codex thread/router and app-server boundary | Pass | Pass | Pass | Pass | Must not depend on or invoke AutoByteus terminal execution for this projection. |
| Event/history projection to shared parser | Pass | Pass | Pass | Pass | Both consumers depend on the parser; neither may duplicate `cwd` mapping. |
| Canonical event to memory/UI consumers | Pass | Pass | Pass | Pass | Consumers use canonical arguments and do not reach back into provider payloads. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `resolveToolArguments(payload, "run_bash")` | Pass | Pass | Pass | Low | Pass |
| `CodexThreadEventConverter.convert(message)` | Pass | Pass | Pass | Low | Pass |
| `normalizeCodexThreadHistoryItem(input)` | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Stable provider field extraction | Pass | Pass | N/A | Pass | Extend the existing Codex payload parser. |
| Live lifecycle and approval propagation | Pass | Pass | N/A | Pass | Reuse the converter and coordinator; add coverage only. |
| Native-history propagation | Pass | Pass | N/A | Pass | Reuse current normalizer delegation. |
| Future trace persistence | Pass | Pass | N/A | Pass | Reuse the schema-agnostic writer unchanged. |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Codex item normalization | Pass | Pass | Pass | Pass | Sole production-code edit belongs here. |
| Codex live event conversion | Pass | Pass | Pass | Pass | Reused as an observable boundary. |
| Codex native-history normalization | Pass | Pass | Pass | Pass | Reused as the diagnostic read boundary. |
| Runtime memory | Pass | Pass | Pass | Pass | Reused without Codex-specific persistence logic. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Command/CWD extraction shared by live, approval, and history paths | Pass | Pass | Pass | Pass | The existing parser is already the correct shared owner; no new abstraction is warranted. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Canonical `run_bash` arguments `{ command, cwd? }` | Pass | Pass | Pass | N/A | Pass | Canonical output uses `cwd` only; raw `workdir` is not retained as an alias. |
| Stable app-server command item/request | Pass | Pass | Pass | N/A | Pass | Existing provider shape is consumed without copying or widening it. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `src/.../items/codex-tool-payload-parser.ts` | Pass | Pass | N/A | Pass | Adds the one production mapping in the established owner. |
| `tests/.../events/codex-item-event-payload-parser.test.ts` | Pass | Pass | N/A | Pass | Pins source precedence and absence behavior at the facade/parser boundary. |
| `tests/.../events/codex-thread-event-converter.test.ts` | Pass | Pass | N/A | Pass | Covers public start, terminal, and approval events. |
| `tests/.../history/codex-thread-history-item-normalizer.test.ts` | Pass | Pass | N/A | Pass | Covers the separate native-history consumer. |
| `tests/.../thread/codex-thread.test.ts` | Pass | Pass | N/A | Pass | Covers preservation of approval request params before conversion. |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/backends/codex/items/codex-tool-payload-parser.ts` | Pass | Pass | Low | Pass | Existing item-normalization owner. |
| Codex `events` unit suites | Pass | Pass | Low | Pass | Parser-facade and lifecycle projections remain in established suites. |
| Codex `history` unit suite | Pass | Pass | Low | Pass | History-specific observable remains separate while reusing parser code. |
| Codex `thread` unit suite | Pass | Pass | Low | Pass | Approval forwarding is tested at its owning lifecycle boundary. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Command-only projection when stable `cwd` exists | Pass | Pass | Pass | Pass | The defective outcome is replaced inside the existing parser; no separate branch or file exists to delete. |
| Raw-event `workdir` compatibility proposal | Pass | Pass | Pass | Pass | Explicitly rejected rather than introduced; stable app-server `cwd` remains the only provider source. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| Codex command CWD projection | No | Pass | Pass | No alias, version branch, default, raw-event fallback, or dual write is proposed. Legitimate absence remains the current optional canonical contract. |
| Existing application-owned traces | No | Pass | Pass | Version-agnostic readers directly accept old records without a `cwd` key and future records with it; this is not runtime legacy machinery. |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? (`Pass`/`Fail`) | Direct Use, Rebuild, Or Migration Choice Is Proportionate? (`Pass`/`Fail`) | Migration Safety Is Complete If Required? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Application-owned raw memory traces and read-time Codex native history | `Directly Usable — No Migration` | Pass | Pass | N/A | Pass | `tool_args` is an open JSON object, normal readers accept missing/additional optional keys, the existing live writer will persist corrected arguments, and the approved no-backfill boundary avoids disproportionate rewrites. |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Shared parser correction and focused regression coverage | Pass | Pass — none required | Pass — no migration, move, generated probe, compatibility branch, or temporary adapter remains | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Stable command item, missing CWD, and approval projection | Yes | Pass | Pass | Pass | The examples distinguish projection from execution, preserve exact source values, and prohibit fabricated defaults/raw `workdir` mapping. |

## Material Premise Validation (Only When Needed)

None. No finding or in-scope mechanism depends on a production, failure, or lifecycle premise outside the confirmed approved behavior basis. Optional approval `cwd`, non-fabrication when no usable source exists, and the no-migration trace outcome are established by the approved contracts and reader/writer evidence rather than hypothetical failure scenarios.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass` — the approved behavior basis is confirmed, the target path is coherent, the production correction is owned by the existing shared parser, the persisted-data decision is evidence-backed, and no unsupported material premise or blocking finding remains.

## Findings

None.

## Classification

`N/A` — Pass.

## Recommended Recipient

`/implementation_engineer`

## Residual Risks

- A later Codex app-server protocol version may rename or relocate `cwd`; current contract-shaped tests provide detection but do not remove the normal upstream-integration risk.
- By approved scope, pre-change application-owned traces remain valid but unenriched; only future canonical lifecycle records gain `cwd`.
- Some synthetic fixtures omit the current V2-required lifecycle `cwd`; the approved non-fabrication behavior keeps those inputs command-only rather than inventing context.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate (`Pass`/`Fail`/`Blocked`): `Pass`
- Notes: `ARCH-REV-001` approves `SR-001` for implementation. The implementation boundary is the existing shared Codex tool payload parser plus the focused test files named in the design; Codex execution and historical trace contents remain unchanged.
