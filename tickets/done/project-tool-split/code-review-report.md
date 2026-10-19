# Code Review Report

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (`Approved`, SR-001)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (cited SRC-* entries)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-001, SR-002)
- Design Spec Reviewed As Context: `design-spec.md` (SR-002, `Ready`)
- Supplemental Task Artifacts Reviewed As Context: precedent `tickets/done/task-tool-split/` (read-only; consulted for the docs-anchor lesson only)
- Relevant Solution Revision IDs: `SR-001`, `SR-002`
- Design Review Report Reviewed As Context: `design-review-report.md` (ARCH-REV-001 Pass; R-1..R-4)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: `ARCH-REV-001`
- Implementation Handoff Reviewed As Context: `implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: `IR-001`
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: `1`
- Review Scope: `Full Review`
- Review Scope Evidence (round >1): N/A
- Trigger: Implementation Engineer handoff (IR-001), commits `285acae39a` (code, tests, docs) and `79c5d2c5ef` (ticket folder) on `codex/project-tool-split`, base `origin/personal` @ `8a970f214c`
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Coverage Investigation / Execution Coverage / API/E2E Revision Record: N/A (implementation review)
- Delivery Revision Record: N/A
- Failing Scenario IDs / Commands / Evidence: N/A

## Routing Classification Review

- Task size: `Medium`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: Confirmed. Production delta is three files in `src/agent-tools/project-tasks/` (contract 163→208, manifest 96→98, native 47→60 effective lines), within existing ownership. High stands: two new public agent tool contracts on two transports, two newly protected first-party names, and a two-version transition contract (REQ-004/REQ-005). No correction.

## Review Scope

- Changed implementation and behavior reviewed: the `create_project` / `update_project` split; the `create_or_update_project` dispatcher (`effectiveProjectTaskToolName`); manifest execution under the effective name; native registration; the error order and messages of the shared validators; the old tool's byte-identical description and schema.
- Files / areas reviewed: `project-task-tool-contract.ts`, `project-task-tool-manifest.ts`, `project-task-native-tools.ts` (full diff plus the unchanged native `prepareExecution`/`_execute` path and `PROJECT_TASK_TOOL_MANIFEST`); `tests/unit/agent-tools/project-tasks/project-task-tools.test.ts`; new `tests/unit/agent-execution/shared/project-tool-runtime-parity.test.ts`; `tests/e2e/projects/project-task-boundaries.e2e.test.ts`, plus the rename-only E2E, fixture and web-probe edits; the three docs; `release-notes.md`; the AC-005 probe script and outputs.
- Explicit exclusions: `ProjectService`, exposure, the AutoByteus resolver, the MCP catalog (the design leaves them unchanged; the review checked only that they consume the new names through `PROJECT_TASK_TOOL_NAMES` and the manifest); AGY-gated E2E runs, web probes and the AC-006 real-app check (API/E2E owns them).
- Independent checks run by the reviewer: `vitest run` on the two changed unit files: 107 passed. `pnpm typecheck`: clean. `git diff v1.5.5-beta.1 v1.5.5-beta.2` and `v1.5.5-beta.2 origin/personal` on `src/agent-tools`, runtime exposure, the AutoByteus resolver and the Claude tooling options: both empty. This supports using the installed 1.5.5-beta.1 binary as the release-side stand-in for AC-005. `git grep` found no stale `#exactly-five-agent-tools` anchors outside archived tickets, and no `src` consumer of the removed `parseProjectMutation`.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: Yes. There are two single-meaning tools with today's semantics, and neither is added automatically. The old tool stays unchanged during the transition, and mixed lists work in both versions.
- Design-spec behavior map verified against the implementation: Yes (DS-001, DS-002).
- Design review report and round confirmed: ARCH-REV-001, round 1, Pass. R-1 and R-2 are applied, and R-3 is applied as the new parity test. R-4 is not applied: the file is outside the Change Scope and the comment is optional.
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior: None
- Remaining material ambiguity: None

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting / New Evidence |
| --- | --- | --- | --- |
| BEH-001 | Confirmed | The native `CreateProjectTool` and the MCP manifest entry both go through `parseProjectTaskToolInput` → `parseCreateProjectInput`. The parser does a plain-object check, then `rejectUnsupported([name,description,workspaces])` (so `project_id` is rejected as unsupported), then `addProjectFields`, then the name-required check. Execution goes through `executeProjectTaskTool` (`tool === "create_project"`) → `createProjectRecord` → `{project}`. | — |
| BEH-002 | Confirmed | `UpdateProjectTool` / MCP → `parseUpdateProjectInput`: plain-object check, then `rejectUnsupported` with the old allowed set, then `id(project_id)`, then fields, then the patch-required check. This is today's order. Execution: `patchProjectRecord` → `{project}`. | — |
| BEH-003 | Confirmed | The new names join `PROJECT_TASK_TOOL_NAMES`. Exposure (`isProjectTaskToolName`) and the manifest/`protect_static_adapter` are unchanged and pick the names up with no automatic exposure. The unit parity test covers the AutoByteus resolver, the Codex catalog and the Claude tooling options. | — |
| BEH-004 | Confirmed | `effectiveProjectTaskToolName` is the single rule: plain-object check first (same message as before), then `project_id` presence. The old tool's text and schema are pinned as literals against the base. Both modes' results and every pinned error equal those of the effective tool. The native double parse (`prepareExecution` normalizes, then `_execute` re-parses) is unchanged from base: normalized create input has no `project_id`, so the effective tool stays `create_project`. The AC-005 probe output shows the release skipping unknown names with warnings and 0 errors. | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related IDs | Kind | Actor / Initiator | Goal / Event | Entry Surface | Shape | Forward Path / Lifecycle | Expected Outcome | Independent Evidence | Validity | Review Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | BEH-001, REQ-001 | System | configured agent (PTM) | create a Project | `create_project` call (native or MCP) | Normal | DS-001 create branch | `{project}`; today's errors | requirements SCN-001; PTM skill | Supported Normal Scenario | Use |
| SCN-002 | BEH-002, REQ-002 | System | configured agent | change a known Project | `update_project` call | Normal | DS-001 patch branch | `{project}`; today's errors | requirements SCN-002 | Supported Normal Scenario | Use |
| SCN-003 | BEH-003, REQ-003 | User | user | choose which agents get the tools | agent definition `toolNames` | Normal | DS-002 | exactly the listed tools | requirements SCN-003 | Supported Normal Scenario | Use |
| SCN-004 | BEH-004, REQ-004 | System | agent with an existing configuration | keep working after the upgrade | old-name call | Normal | DS-001 via the effective name | unchanged results and errors | requirements SCN-004; PTM package (SRC-07) | Supported Normal Scenario | Use |
| SCN-005 | BEH-004, REQ-005 | Operational | package author / user | move a package without a gap | mixed list in either version | Normal | DS-002 on both versions | a project tool in both | precedent package transition | Supported Normal Scenario | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Scope | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CAND-001 | The retained `create_or_update_project` dispatcher is a compatibility path | REQ-004, DEC-002; design Legacy Removal Policy | existing PTM configurations | the old name runs through the new parsers and service path only | contract diff; no second validator or service call | Reject | — | The user approved this retention. It is time-boxed (FU-2) and implemented as the design's thin dispatcher, so it is not a legacy violation. |
| CAND-002 | `effectiveProjectTaskToolName` is called twice (in `executeProjectTaskTool` and inside `parseProjectTaskToolInput`) | R-1 (one dispatch rule) | any call | the second call receives an already-effective name and returns it unchanged | code | Reject | — | The rule is implemented once and the second call is idempotent, so there is no consequence. R-1 is satisfied. |
| CAND-003 | The validation order of the old tool could drift between the two parsers | REQ-004 / AC-004 (errors unchanged) | malformed old-tool call | old order: plain-object, unknown keys, `project_id`, fields, name/patch required | diff read line by line against base `parseProjectMutation`; pinned code+message table; mixed-precedence cases (`{project_id:null, extra}`, `{project_id:null, name:""}`); implementer's mutation check | Reject | — | The order and messages are identical to base, and the tests pin them. |
| CAND-004 | The AC-005 release side was probed on installed 1.5.5-beta.1, not v1.5.5-beta.2 | AC-005 | — | — | reviewer's `git diff` of beta.1..beta.2..base on all relevant paths: empty | Reject | — | The two versions are equivalent on every path the probe exercises. Final AC-005/AC-006 validation stays with API/E2E. |
| CAND-005 | R-4: the doc comment in `runtime-agent-tool-exposure.ts` names only the Task tools | design Change Scope | — | non-normative comment; no runtime effect | design-review R-4 marks it optional | Reject | — | The file is outside the Change Scope and the comment does not affect behavior, so it is neither a finding nor a follow-up Task. |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment present and preserved | Pass | The ambiguous interface is split into two parsers and `parseProjectMutation` is removed, as the design requires. | — |
| Matches behavior-defining supplements | Pass | No supplements. The descriptions are the design examples verbatim. | — |
| Data-flow spine clarity | Pass | DS-001 is native or MCP → contract (effective name → parser) → manifest → `ProjectService` → projection. | — |
| Ownership boundary preservation | Pass | The contract owns names, schemas, parsing and the dispatch rule. The manifest owns execution and projection. The native file only registers. | — |
| Off-spine concern clarity | Pass | Error projection and collision protection are unchanged. | — |
| Existing capability reuse | Pass | `ProjectService`, exposure and the catalog are reused unchanged. | — |
| Reusable owned structures | Pass | One `workspacesDefinition` serves the three schemas. `projectInput`, `addProjectFields`, `projectNameRequired` and `rejectUnsupported` are shared. | — |
| Shared-structure tightness | Pass | `EffectiveProjectTaskToolName` is a narrowing via `Exclude`, not a parallel type. | — |
| Repeated coordination ownership | Pass | The old-name rule lives only in `effectiveProjectTaskToolName`. | — |
| Empty indirection | Pass | The dispatcher owns a real rule. The parsers own validation. | — |
| SoC and file responsibility | Pass | Each of the three files keeps its concern. | — |
| Ownership-driven dependency | Pass | manifest → contract. native → contract and manifest. No new edges. | — |
| Authoritative Boundary Rule | Pass | Transports never parse independently and call `ProjectService` only through `executeProjectTaskTool`. | — |
| File placement | Pass | All changes are under `agent-tools/project-tasks/`. | — |
| Flat-vs-over-split layout | Pass | No new files in `src`. | — |
| Interface boundary clarity | Pass | Each new tool has one subject and an explicit identity (`project_id` required or rejected). The old tool's ambiguity is accepted for the transition (FU-2). | — |
| Naming quality | Pass | `parseCreateProjectInput`, `parseUpdateProjectInput`, `effectiveProjectTaskToolName` and `addProjectFields` describe their roles. | — |
| No unjustified duplication | Pass | The schemas share the workspaces builder. The parameter texts differ on purpose. | — |
| Patch-on-patch complexity | Pass | A single clean split. | — |
| Dead code removed in touched files | Pass | `parseProjectMutation` and the manifest's `project_id`-presence branch are removed. `plainInput` is still used by the Task parsers. | — |
| Test scenarios and assertions clear and requirement-aligned | Pass | Errors are pinned by code and message. The old and effective tools are checked for parity on both transports. The schema literals for the old tool are byte-pinned. Runtime parity covers AutoByteus, Codex and Claude for both host kinds. | — |
| Test fixtures/helpers reusable, structure coherent | Pass | The `projectToolError` helper checks native and MCP parity. The `PROJECT_TOOLS` map is reused across cases. | — |
| No stale or compatibility-only tests | Pass | The old-tool tests prove REQ-004 and are listed for removal in FU-2. | — |
| API/E2E readiness | Pass | Build, typecheck, full unit suite and the two narrow E2E files pass. The remaining gated runs are listed in the handoff. | — |

## Source File Size And Structure Audit

| Source File | Before | After | `>500` | `>220` Delta | SoC / Ownership | Placement | Classification | Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `project-task-tool-contract.ts` | 163 | 208 | Pass | Pass (+45) | Pass | Pass | Pass | — |
| `project-task-tool-manifest.ts` | 96 | 98 | Pass | Pass | Pass | Pass | Pass | — |
| `project-task-native-tools.ts` | 47 | 60 | Pass | Pass | Pass | Pass | Pass | — |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | The one retained mechanism is user-approved (REQ-004/DEC-002) and time-boxed (FU-2). It is a single dispatch function with no second validation or service path, and the design records it as an explicit exception. |
| No legacy old-behavior retention | Pass | Same approved retention. Nothing else is kept. |
| Dead code removed (Principle 7) | Pass | See the structural checks. |
| Persisted-data transition followed | Pass | `Not Affected`. No migration. |
| No version-specific dual reads/writes | Pass | — |
| Transition mechanics match design | Pass | — |

## Dead / Obsolete / Legacy Items Requiring Removal

None in this change. The old tool's contract entry, native class, dispatch rule, docs and REQ-004 tests are scheduled for FU-2 (user decision DEC-006).

## Docs-Impact Verdict

- Docs impact: `Yes`, and already done in this change.
- Why: the tool set changed and the old tool is deprecated.
- Files: server `projects.md` (section renamed; anchor `#project-and-task-agent-tools`; all in-repo links updated, verified by `git grep`), `agent_tools_mcp_server.md`, web `projects.md`, and `release-notes.md` (What's New, Improvements and Upgrade Notes per DEC-005). The new descriptions name no other tool (DEC-004), and the old description is unchanged.

## Additional Material Premise Validation

None. No new or reclassified premises.

## Review Scorecard (Mandatory)

- Overall score: `9.5/10` (`95/100`), a simple average for visibility only.

| Priority | Category | Score | Why | Weak / Holding Down | Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.5 | DS-001 and DS-002 are preserved, and the old name joins at one point | — | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.5 | contract, manifest and native keep distinct roles; no bypass | — | — |
| 3 | API / Interface / Query / Command Clarity | 9.5 | two single-meaning tools with explicit identity | the old tool stays ambiguous by approved requirement until FU-2 | remove it in FU-2 |
| 4 | Separation of Concerns and File Placement | 9.5 | no new files; each change sits in its owner | — | — |
| 5 | Shared-Structure Tightness and Reusable Owned Structures | 9.5 | shared validators and workspaces builder; tight `Exclude` type | — | — |
| 6 | Naming Quality and Local Readability | 9.3 | clear names and short doc comments | the contract stays dense (one-letter `p`, terse helpers), consistent with the existing file style | — |
| 7 | API/E2E Readiness | 9.5 | local checks green; remaining runs and AC-006 clearly listed | — | — |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.6 | order and messages identical to base; parity is pinned and mutation-checked | — | — |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.2 | the only retention is approved, thin and scheduled for removal | a compatibility path exists by user direction | FU-2 |
| 10 | Cleanup Completeness | 9.5 | old parser and branch removed; docs and anchors updated | — | — |

## Findings

None.

## Follow-ups

None. FU-1 and FU-2 are already recorded in the design spec and owned there.

- Sent to: `None`

## Classification

N/A (Pass).

## Recommended Recipient

`/software_engineering_team/api_e2e_engineer` (pass), with an informational notice to `/software_engineering_team/implementation_engineer`.

## Residual Risks

- AC-006 (isolated real-app check) and the AGY-gated E2E files and web probes with renamed tool lists have not been run yet. API/E2E owns them.
- AC-005 release side: the probe used the installed 1.5.5-beta.1 binary. It stands in for v1.5.5-beta.2 because the relevant paths have an empty diff between the two (the reviewer verified this). If API/E2E wants beta.2 itself, that is an execution choice.
- Design risks carried forward: third-party MCP tools named `create_project`/`update_project` are shadowed (covered in the release notes), and agents listing all three tools see two ways to do the same thing until FU-1.

## Latest Authoritative Result

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass` (none required)
- Score Summary: 9.5/10. Every category is ≥ 9.2.
- Failure Origin: N/A
- Recommended Recipient: `/software_engineering_team/api_e2e_engineer`
- Notes: R-1 and R-2 are verified in code and tests. R-3 is delivered as `project-tool-runtime-parity.test.ts`. R-4 is correctly left out of scope.
