# Code Review Report

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-tool-context-files/tickets/in-progress/project-task-tool-context-files/requirements-doc.md` (SR-002, Approved)
- Investigation Notes Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-tool-context-files/tickets/in-progress/project-task-tool-context-files/investigation-notes.md`
- Solution Revision Record Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-tool-context-files/tickets/in-progress/project-task-tool-context-files/solution-revision-record.md`
- Design Spec Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-tool-context-files/tickets/in-progress/project-task-tool-context-files/design-spec.md` (SR-003, Ready)
- Supplemental Task Artifacts Reviewed As Context: None (package declares none)
- Relevant Solution Revision IDs: SR-002 (requirements), SR-003 (design)
- Design Review Report Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-tool-context-files/tickets/in-progress/project-task-tool-context-files/design-review-report.md` (Pass, round 1)
- Architecture Review Revision Record Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-tool-context-files/tickets/in-progress/project-task-tool-context-files/architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-001
- Implementation Handoff Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-tool-context-files/tickets/in-progress/project-task-tool-context-files/implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-tool-context-files/tickets/in-progress/project-task-tool-context-files/implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001 (commit `741b05131`; ticket artifacts `7dab8b5d9`; base `4a51482a5`)
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-tool-context-files/tickets/in-progress/project-task-tool-context-files/code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: 1
- Review Scope: `Full Review`
- Review Scope Evidence (round >1): N/A
- Trigger: implementation-complete handoff from `/software_engineering_team/implementation_engineer` (IR-001)
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Coverage Investigation / Execution Coverage / API/E2E Revision Record: N/A (implementation-review entry point)
- Delivery Revision Record: N/A
- Failing Scenario IDs / Commands / Evidence: N/A

## Routing Classification Review

- Task size: `Medium`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: Confirmed. The change has 7 production files in their existing owners, with no new folder, route or persistence shape (Medium). All three risk drivers are present in the diff: the shared native/MCP tool contract changed, the server now reads agent-named local files into app data, and the `ProjectTaskService` create/update bodies that carry the ordering invariants were restructured (High).

## Review Scope

- Changed implementation and behavior reviewed: the `context_files` argument (contract, parser, schema, descriptions) and the manifest's mapping and return projection. In `ProjectTaskService`: `createTaskWithLocalContextFiles`, the shared private `create` / `update` bodies, the extended `updateTaskById` and the unchanged-signature `createTask` / `updateTask`. Also `ProjectTaskContextStore.importLocalFiles`, `contextFileMimeTypeForPath`, the domain command/ack types, the `TASK_CONTEXT_FILE_UNAVAILABLE` code, and the docs `projects.md` and `agent_tools_mcp_server.md`.
- Files / areas reviewed: full diff `4a51482a5..741b05131`. Surrounding code read for context: `closeAndWrite`, `assertOwner`, `reclaim`, `validatePrepared`, `consume`, `toView` and `prepareChanges` in the service; `prepare`, `savedFile` and `reclaimUnpublished` in the store; `ProjectsLayout.directory/regular`. Root `DESIGN.md` mandatory rules. New and changed unit tests.
- Independent checks run:
  - `pnpm -C autobyteus-server-ts exec vitest run tests/architecture tests/unit/projects tests/unit/agent-tools tests/unit/context-files --no-watch`: 65 files and 517 tests pass.
  - `tsc -p tsconfig.build.json --noEmit`: exit 0.
  - `rg`: the only callers of `updateTaskById` / `createTaskWithLocalContextFiles` are in the manifest, `importLocalFiles` is called only by the service, and `src/api` has no diff.
- Explicit exclusions: E2E coverage (owned by `api_e2e_engineer`); the pre-existing `tests/unit/api` failures and the `typecheck` TS6059 script discrepancy recorded in the handoff (they exist on base and are outside this change).

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: Yes. One additive `context_files` argument in both modes. Files are copied into Task saved context under the app upload policy. Input handling is all-or-nothing, with no DONE closure on invalid input. Tasks with no Project are rejected. `attachedContextFiles` is returned only when the call attached files. There is no removal and no new tool.
- Design-spec behavior map verified against the implementation: Yes (DS-001..DS-005).
- Design review report and round confirmed: ARCH-REV-001, round 1, Pass. R-1, R-2 and R-3 are verified as applied (see the revision record). R-4 is documentation-only and belongs to the Solution Designer.
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior: None.
- Remaining material ambiguity: None.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting / Newly Discovered Evidence |
| --- | --- | --- | --- |
| BEH-001 | Confirmed | `parseProjectTaskToolInput`: `context_files` is allowed in create, must be an array, entries are trimmed, and non-string, blank and hole entries are rejected. Then `executeProjectTaskTool` → `createTaskWithLocalContextFiles` → private `create`: `normalizeDescription` → `assertOwner` → `importLocalFiles` → `store.createTask` (in-lock `validatePrepared`) → `taskChanged` → `toView`. The `TASK_CREATE_STATUS_UNSUPPORTED` and unknown-key rules are unchanged | – |
| BEH-002 | Confirmed | `updateTaskById`: patch-required counts non-empty files → description/status validation → ad-hoc gate → `uniqueTask` → private `update`: `assertOwner` → `importLocalFiles` → `closeAndWrite` (DONE) or `writeMetadata`. `meaningful` includes `prepared.files.length > 0`, and the list is written as `[...files, ...prepared.files]` under the Task lock | – |
| BEH-003 | Confirmed | Copies are written to `layout.contextDir` under `buildStoredFilename`. The record shape is `{storedFilename, displayName, mimeType, sizeBytes}`, with the policy coming from `contextFileMimeTypeForPath` + `CONTEXT_FILE_MAX_BYTES`. `utimes` keeps fresh copies outside the 24 h `reclaimUnpublished` TTL | – |
| BEH-004 | Confirmed | `resolveAssignment` is unchanged. The unit test asserts that `referenceFiles` equals the saved copies' `localPath`s | – |
| BEH-005 | Confirmed | The ad-hoc branch throws `TASK_CONTEXT_INVALID` before `write`/`closeAndWrite`. The unit test asserts that the run stays open | – |
| BEH-006 | Confirmed | Manifest `taskAcknowledgement(ack, attached)` projects `{storedFilename, displayName}` and spreads the field only when the list is non-empty. On create the source is `created.contextFiles`; on patch it is `ack.attachedContextFiles`. The service ack field is optional | – |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related Behavior / Contract IDs | Kind | Actor / Initiator | Coherent Goal Or Governing Event | Supported Entry Surface / Event | Scenario Shape | Forward Production Path / Lifecycle | Expected Outcome / Consequence | Independent Evidence | Scenario Validity | Review Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | BEH-001, BEH-003, BEH-006 | Contract | Manager agent | Create a Task carrying the user's screenshots/notes | `create_or_update_task` create (native/MCP) | Normal | DS-001 | New TODO Task with copies; compact return | Requirements SCN-001, AC-001 | Supported Normal Scenario | Use |
| SCN-002 | BEH-002, BEH-006 | Contract | Manager agent | Add material to an existing Task, optionally with text/status/DONE | patch | Normal | DS-002 | Appended files; existing ones kept; DONE semantics as today | SCN-002, AC-002/003 | Supported Normal Scenario | Use |
| SCN-004 | BEH-004 | Contract | Manager → worker | Worker receives the files | `delegate_task({task_id})` | Normal | DS-003 (unchanged) | Saved copy paths as reference files | SCN-004, AC-010 | Supported Normal Scenario | Use |
| SCN-005 | BEH-001, BEH-002 | Contract | Manager agent | Get a clear, non-mutating error | Invalid `context_files` entry | Normal | Parser → service → `importLocalFiles` phase 1 | Error naming the path; nothing changed, no DONE closure | SCN-005, AC-005 | Supported Normal Scenario | Use |
| SCN-006 | BEH-005 | Contract | Agent | Attach to a Task with no Project | patch of an ad-hoc Task | Explicit Edge | `updateTaskById` ad-hoc branch | `TASK_CONTEXT_INVALID`; no change | SCN-006, DEC-002 | Supported Explicit Edge Scenario | Use |
| SCN-G1 | Preserved GraphQL contract | Contract | App user | Create/update a Task with UI-draft context | GraphQL `createTask` / `updateTask` | Normal | Resolver → `createTask`/`updateTask` → shared private bodies | Byte-for-byte unchanged behavior | Design §Guidance; requirements Out of Scope (no GraphQL change) | Supported Normal Scenario | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | GraphQL `updateTask` equivalence after extraction | SCN-G1 | UI patch | `meaningful` now uses `prepared.files.length` instead of `additions.length`. `prepare` returns one file per requested name or throws, and returns `[]` when the list is empty or there is no draft, so both expressions agree. `description !== undefined` equals `hasDescription`, because `normalizeDescription` always returns a string or throws. `writesContextList: Boolean(changes)` matches the old guard. The order (assertOwner → removal check → `prepareChanges`/`reclaim` → write/`closeAndWrite` → feed → consume → cleanupRemoved) is unchanged | Diff L338-366 / L433-457; 191 pre-existing `tests/unit/projects` cases are green | Reject (no defect) | Verified preserved; nothing to do |
| C-02 | GraphQL `createTask` equivalence | SCN-G1 | UI create | Same sequence: normalize → id → timestamp → assertOwner → prepare (draft or none) → in-lock validate → consume → feed → view | Diff L312-330, L413-427 | Reject (no defect) | Verified preserved |
| C-03 | Ordering invariant: validation → import → in-lock commit / `closeAndWrite` | SCN-002, SCN-005 | DONE + invalid file | `importLocalFiles` (phase 1 entirely before `layout.directory`) runs inside `update` before `closeAndWrite`. An invalid file throws before any run is closed | `update` L440-452; test "changes nothing, including no DONE closure" asserts the run is open, `release` is not called, and task.json and the context entries are unchanged | Reject (no defect) | Invariant holds and is tested |
| C-04 | Phase-1 completeness before any write | SCN-005 | Create whose 2nd file is invalid | The duplicate check, then `localContextSource` for every source (shape → stat → isFile → R_OK → MIME → size), and only then `mkdir` | Store L192-199; the parameterized test asserts `taskDirs()` is empty for 7 cases | Reject (no defect) | – |
| C-05 | Phase-2 cleanup and error mapping (R-3) | SCN-005 (copy-time failure) | Source unreadable or truncated mid-call | A non-EEXIST copy failure unlinks its partial target. The catch unlinks all `written` targets, rethrows `ProjectError` as is, and otherwise throws `TASK_CONTEXT_FILE_UNAVAILABLE` naming the current source. The post-copy cap gives `TASK_CONTEXT_INVALID` | Store L201-225; tests R-3 and P-001 | Reject (no defect) | Matches design DS-005 and R-3 |
| C-06 | `EEXIST` on an exclusive copy is reported as "could not be copied" | – | Collision of a random `buildStoredFilename` UUID | Requires a UUID collision | `buildStoredFilename` randomness; root DESIGN.md rule 2 | Reject (Technically Possible but Unsupported/Contrived) | No machinery |
| C-07 | `layout.directory(target, true)` failure escapes as a raw error (→ `PROJECT_OPERATION_UNCONFIRMED`) | – | Filesystem failure creating the app-data dir | Infrastructure failure; the draft `prepare` has the same shape | Design principle 6 (infra failure out of scope by default) | Reject | Outcome stays safe (no mutation claimed) |
| C-08 | A phase-2 failure leaves an empty `context/` dir; a post-import commit failure leaves unreferenced copies | – | Copy or commit failure | Accepted residual risk in the design (§Risks) and ARCH-REV-001; `reclaimUnpublished` later removes stale unreferenced files | Design §Risks; design-review Residual Risks | Reject (accepted, pre-existing property) | – |
| C-09 | DONE: the in-lock `validatePrepared` could fail after `closeTask` closed runs | – | Saved copy vanishing between import and lock | Requires external deletion of app-data bytes within the call window (same as draft path) | P-002-style artificial timing | Reject (Contrived) | – |
| C-10 | Source swapped (TOCTOU) between phase-1 stat and copy | – | Concurrent external mutation of the source | A size change is handled (P-001). A type swap would make the copy fail → mapped error with cleanup | Store L209-218 | Reject (Contrived beyond P-001) | – |
| C-11 | `updateTaskById` no longer builds a `ProjectTaskView` for Project Tasks | BEH-006 | Any patch | The old path built the view and kept only `status`. `toView` swallows `savedFile` errors, so dropping it removes only redundant work. The ack comes from the committed record | Service L400-404, L419-424 | Reject (no defect; improvement) | – |
| C-12 | Path rule repeated from `validateTaskReferenceFiles` | Approved design (dependency direction) | – | – | Design §Key Tradeoffs; ARCH-REV-001 | Reject (approved decision) | – |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved | Pass | Feature, `No Design Issue Found`; only the planned local extraction of the create/update bodies | – |
| Implementation matches approved behavior-defining supplemental artifacts | Pass | None declared; matches the design spec's interface table and error mapping | – |
| Data-flow spine inventory clarity and preservation | Pass | DS-001/002/004/005 are traceable in code exactly as drawn; DS-003 is untouched | – |
| Ownership boundary preservation and clarity | Pass | The service governs ordering, the store owns bytes, the policy owns MIME/cap, and the parser does shape only | – |
| Off-spine concern clarity | Pass | `contextFileMimeTypeForPath` sits in the policy file; `localContextSource` is private to the store | – |
| Existing capability/subsystem reuse | Pass | Reuses `ProjectsLayout`, `buildStoredFilename`, `PreparedTaskContext` and the commit path; no fake draft | – |
| Reusable owned structures | Pass | One commit path for both sources through `create`/`update` + `ContextUpdate` | – |
| Shared-structure/data-model tightness | Pass | Local paths only on the tool-facing commands; the ack field is optional and present only when non-empty; `PreparedTaskContext` reused draft-less | – |
| Repeated coordination ownership | Pass | Ordering lives once in `update`; the patch-required rule appears in the parser and the service as the designed defense at each boundary | – |
| Empty indirection | Pass | `createTask`/`updateTask` own draft-specific validation; `createTaskWithLocalContextFiles` selects the source | – |
| Separation of concerns and file responsibility | Pass | – | – |
| Ownership-driven dependency check | Pass | The manifest imports only the service/domain (`ProjectTaskContextFile` type); `projects/context` → `context-files/domain` existing direction; no `agent-collaboration` import | – |
| Authoritative Boundary Rule | Pass | No manifest → store or `node:fs`; `importLocalFiles` is called only by the service (rg) | – |
| File placement | Pass | All in existing owner files | – |
| Flat-vs-over-split layout | Pass | – | – |
| Interface/API boundary clarity | Pass | Explicit `createTaskWithLocalContextFiles` keeps local paths off the GraphQL-reachable `CreateProjectTaskCommand`; `src/api` unchanged | – |
| Naming quality | Pass | `localContextFiles`, `attachedContextFiles`, `importLocalFiles`, `ContextUpdate.writesContextList` read clearly | – |
| No unjustified duplication | Pass | The path-rule repetition is approved (C-12) | – |
| Patch-on-patch complexity control | Pass | R-1/R-2/R-3 were applied in the initial cycle, not layered | – |
| Dead/obsolete code cleanup | Pass | The old `createTask` call in the manifest was replaced; inline bodies moved, not duplicated; the stale doc sentences were rewritten | – |
| Test scenarios and assertions are clear and requirement-aligned | Pass | Tests are named by AC; they assert persisted `task.json`, context-dir entries, run-open state and `release` calls | – |
| Test fixtures/helpers are reusable and coherent | Pass | `source`, `taskJson`, `contextEntries`, `uiTask` helpers | – |
| No stale/duplicated/compatibility-only tests | Pass | Existing ack assertions unchanged (R-1) | – |
| API/E2E readiness | Pass | The handoff lists concrete MCP/native, delegation and error-contract scenarios | – |

## Source File Size And Structure Audit

| Source File | Effective Non-Empty Lines | `>500` | `>220` Delta | SoC / Ownership | Placement | Classification | Required Action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `src/projects/services/project-task-service.ts` | 440 | Pass | Pass (delta ≈119) | Pass | Pass | OK; watch growth | None now. The next substantial feature here should consider splitting |
| `src/projects/context/project-task-context-store.ts` | 231 | Pass | Pass (+~58) | Pass | Pass | OK | – |
| `src/agent-tools/project-tasks/project-task-tool-contract.ts` | 139 | Pass | Pass | Pass | Pass | OK | – |
| `src/agent-tools/project-tasks/project-task-tool-manifest.ts` | 91 | Pass | Pass | Pass | Pass | OK | – |
| `src/context-files/domain/context-file-upload-policy.ts` | 61 | Pass | Pass | Pass | Pass | OK | – |
| `src/projects/domain/models.ts` | 153 | Pass | Pass | Pass | Pass | OK | – |
| `src/projects/domain/project-errors.ts` | small | Pass | Pass | Pass | Pass | OK | – |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | Two context sources are two supported product paths, not a legacy dual path |
| No legacy old-behavior retention | Pass | – |
| Dead/obsolete code cleanup completeness | Pass | – |
| Approved persisted-data transition decision followed | Pass | `Not Affected`; new records use the existing shape (asserted against `task.json`) |
| No version-specific dual reads/writes | Pass | – |
| Transition mechanics match the design | Pass | N/A (no migration) |

## Dead / Obsolete / Legacy Items Requiring Removal

None.

## Docs-Impact Verdict

- Docs impact: `Yes`. It is already handled in this change.
- Why: the agent tool contract changed.
- Files: `autobyteus-server-ts/docs/modules/projects.md` and `agent_tools_mcp_server.md`. The rules, error codes, return and import path are described accurately and match the code. The stale "no context … tool" and "Task attachment mutation" statements were rewritten.

## Additional Material Premise Validation

### Upstream Design-Review Material-Premise Decisions

| Premise ID | Current Status | Changed Evidence / Reason |
| --- | --- | --- |
| P-001 | Confirmed | `sizeBytes` is the post-copy `fs.stat(targetPath).size`, and the cap is re-checked after the copy. Tested |
| P-002 | Confirmed | Still Not Reachable. In addition, `reclaimUnpublished` removes only files older than the 24 h TTL, and `utimes` refreshes the copy's mtime |

No new or reclassified premises.

## Review Scorecard (Mandatory)

- Overall score (`/10`): 9.4
- Overall score (`/100`): 94
- Score calculation note: simple average; not the decision rule.

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.5 | DS-001/002/005 map one-to-one onto the code; ordering is documented in the code comments | – | – |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.5 | Service-only access to the store; local paths kept off the GraphQL commands | – | – |
| 3 | API / Interface / Query / Command Clarity | 9.5 | Explicit tool-facing entrypoint; optional, compact ack field | – | – |
| 4 | Separation of Concerns and File Placement | 9.0 | Concerns sit with the right owners | `project-task-service.ts` at 440 effective lines is nearing the 500 limit | Consider a split when the next feature lands here |
| 5 | Shared-Structure / Data-Model Tightness | 9.5 | Reuses `PreparedTaskContext` and `ProjectTaskContextFile`; no kitchen-sink fields | – | – |
| 6 | Naming Quality and Local Readability | 9.0 | Clear names | Some long single-line expressions in `update` (matching existing file style) | Optional line wrapping |
| 7 | API/E2E Readiness | 9.5 | Concrete scenario list; error codes and messages are stable and asserted | – | – |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.5 | All ACs traced; ordering, all-or-nothing and DONE invariants hold; GraphQL equivalence verified | – | – |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.5 | None introduced | – | – |
| 10 | Cleanup Completeness | 9.0 | Docs and manifest call sites cleaned | Accepted residual: empty/unreferenced context files after a failure (design §Risks) | – |

## Findings

None.

## Classification

N/A: Pass.

## Recommended Recipient

`/software_engineering_team/api_e2e_engineer` (per handoff rules), with an informational notice to `/software_engineering_team/implementation_engineer`.

## Residual Risks

- RSK-001 (extension-only typing) and RSK-002 (copy trust equal to `delegate_task.reference_files`) were accepted by DEC-001 and ASM-002.
- A failure after import can leave an empty `context/` dir or unreferenced copies. This is the same property as the draft path; stale files are reclaimed after the TTL on a later UI context edit.
- `project-task-service.ts` is at 440 effective lines. This is not a finding now, but it is a size-pressure signal for future features.
- ASM-001 (the server process can read the agent's files) still needs E2E and real-app confirmation.
- Pre-existing and out of scope: 6 failures in `tests/unit/api` on base (fixed upstream in `dc70e7f44`), and the `typecheck` script fails with TS6059. Delivery should integrate against `origin/personal`.

## Latest Authoritative Result

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass` (P-001 confirmed and handled; P-002 Not Reachable)
- Score Summary: 9.4/10; every category ≥ 9.0
- Failure Origin: N/A
- Recommended Recipient: `/software_engineering_team/api_e2e_engineer`
- Notes: Medium / High classification preserved. ARCH-REV-001 R-1, R-2 and R-3 are verified in code and tests.
