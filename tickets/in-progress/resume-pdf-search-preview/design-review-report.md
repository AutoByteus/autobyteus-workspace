# Design Review Report

## Review Round Meta

- Review date / reviewer: 2026-10-12 / architecture_reviewer.
- Task workspace: /home/autobyteus/workspace/.codex/worktrees/resume-pdf-search-preview; branch `codex/resume-pdf-search-preview`.
- Upstream Requirements Doc: /home/autobyteus/workspace/.codex/worktrees/resume-pdf-search-preview/tickets/in-progress/resume-pdf-search-preview/requirements-doc.md
- Upstream Investigation Notes: /home/autobyteus/workspace/.codex/worktrees/resume-pdf-search-preview/tickets/in-progress/resume-pdf-search-preview/investigation-notes.md
- Upstream Solution Revision Record: /home/autobyteus/workspace/.codex/worktrees/resume-pdf-search-preview/tickets/in-progress/resume-pdf-search-preview/solution-revision-record.md
- Reviewed Design Spec: /home/autobyteus/workspace/.codex/worktrees/resume-pdf-search-preview/tickets/in-progress/resume-pdf-search-preview/design-spec.md
- Supplemental Task Artifacts Reviewed:
  - /home/autobyteus/workspace/.codex/worktrees/resume-pdf-search-preview/tickets/in-progress/resume-pdf-search-preview/solution-handoff.md
  - /home/autobyteus/workspace/.codex/worktrees/resume-pdf-search-preview/tickets/in-progress/resume-pdf-search-preview/evidence/runtime-failure-excerpts.log
  - /home/autobyteus/workspace/.codex/worktrees/resume-pdf-search-preview/tickets/in-progress/resume-pdf-search-preview/evidence/installed-module-checksums.txt
  - /home/autobyteus/workspace/.codex/worktrees/resume-pdf-search-preview/tickets/in-progress/resume-pdf-search-preview/evidence/baseline-isolated-reproduction.log
  - Original screenshot E-001, personally inspected: /home/autobyteus/data/projects/project_f34a9537-07d7-449a-b78f-16368f1aa619/tasks/project_task_1aefbe1a-dfb5-4ec1-b893-8423b09a12dd/context/ctx_7cbb18ffeeeb__ctx_27db61845e57_image.png
- Relevant Solution Revision IDs: `SR-001` (Approved R1), `SR-002` (design).
- Architecture Review Revision Record: /home/autobyteus/workspace/.codex/worktrees/resume-pdf-search-preview/tickets/in-progress/resume-pdf-search-preview/architecture-review-revision-record.md
- Current Architecture Review Revision ID: `ARCH-REV-001`.
- Current Review Round: 1.
- Trigger: Architecture Design Complete, Small / High.
- Prior Review Round Reviewed: None; no prior report or review result exists.
- Latest Authoritative Round: 1.
- Current-State Evidence Basis: authoring commit `27ff56afb`, base `2756d7b298ca5b203ebd2310d172b37a5d381b5c`; independent source/consumer inspection, supplied runtime excerpts/reproduction, screenshot, existing tests and area documentation. Source paths below are relative to the task workspace.
- Shared/project authorities read: architecture-reviewer skill, full shared design-principles, design-examples Example 9, mandatory report/revision templates, root DESIGN.md/TESTING.md/AGENTS.md and both package AGENTS.md. RELEASE.md finalization rules sampled for design coherence; no merge, deployment or release performed.
- Review execution: read-only code/evidence inspection. No suite, test server, browser, live HTTP request or production mutation. Executable changed-build proof remains downstream.

## Routing Classification Review

- Task size: `Small`.
- Architectural risk: `High`.
- Classification rationale reviewed: bounded change to an existing public method with focused tests/docs; material GraphQL search identity semantics correction at a protected-file boundary, plus required live-runtime rollout.
- Independent Architecture Review required by the classification: Yes.
- Classification evidence or correction required: None. Small implementation does not erase public-contract/deployment risk. Local deletion requested below does not require reclassification.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: Confirmed.
- Approved requirements / intended behavior understood: R1 / REQ-001–004 and AC-001–004; fix search-selected PDF/shared file identity, preserve content restrictions/data, and distinguish isolated validation from actual rollout/user verification.
- Relevant existing behavior and evidence confirmed: public search forwards absolute strategy candidates; the store retains that path; REST correctly rejects it before bytes. Tree identities are relative. The screenshot and runtime failure excerpts corroborate this actual user path.
- Scope guardrail confirmed: UC-001 search/open identity; UC-002 preserved content restrictions; UC-003 safe delivery. No résumé edits, access expansion, symlink redesign, UI overhaul, compatibility formats, migration or public release.
- Approved change, preserved behavior, and outside scope understood: one producer-boundary conversion; unchanged ranking/index/abort/watchers, shared reader/viewers and unrelated state/services.
- Every prospective blocking Design Impact finding is traceable to approved authority: Yes. ARCH-F-001 is local removal-plan completeness under mandatory shared Core Principle 7, with REQ-004/AC-003 contract documentation and REQ-003 preserved behavior as its task scope. It does not allege an additional user-facing defect.
- Remaining material ambiguity: None for intended behavior or the fix boundary. Host rollout prerequisites remain explicit downstream risks, not grounds to invent deployment machinery.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Pass | Pass: user uses Files search `resume` and selects PDF; E-001/004/009 plus source chain | Pass: DS-001/002, relative locator → protected bytes → shared PDF viewer | Confirmed | Execute AC-001 on changed test-owned stack downstream |
| BEH-002 | User | Pass | Pass: browse/search the same workspace file; relative tree paths and lazy search-node fallback in source | Pass: same workspaceId/path for existing tree node or unloaded result; text uses protected GraphQL reader | Confirmed | Execute AC-003; preserve local/external preview capabilities |
| BEH-003 | Contract | Pass | Pass: approved REQ-002 preserves established absolute/traversal/sibling escape denial; path owner and REST inspected | Pass: reader untouched; derived search locator checked by existing getPath | Confirmed | Execute AC-002 with real path owner |
| BEH-004 | Operational | Pass | Pass: requested port8001 delivery; E-002 separates installed /app runtime from worktree | Pass: DS-003, isolated proof then safe coordinated rollout or precise blocker and explicit user verification | Confirmed | Delivery must establish runtime pin/access/timing; no live tests |

Forward paths independently checked:

- **Search:** user types query in Files → FileExplorer.vue/useWorkspaceFileExplorer → search actions/Apollo → GraphQL resolver/explorer lease → WorkspaceFileExplorer.searchFiles → snapshot refresh/index and fuzzy/ripgrep → public result → TreeNode choices. Current line 247 is raw pass-through. Target maps/validates once here.
- **Open:** user clicks FileItem → scoped openFilePreview → workspace content URL (or GraphQL text read) → registered workspace/path owner → filesystem bytes → FileViewer/PdfViewer. `fileExplorerSearchActions.ts:51–54` preserves paths; `fileExplorerContentActions.ts:143–156` encodes the locator. `workspace-path-utils.ts:29–48` denies absolute/escaping input; `api/rest/workspaces.ts:30–45` resolves before streaming and maps denial to400.
- **Return/lifecycle:** snapshot controller owns refresh sharing/generation, abort race and cleanup; resolver releases its explorer lease in finally and retains existing catch-to-empty-array transport behavior. No watcher lease added.
- **Preserved alternate surfaces:** mobile search reuses this same store; embedded local-file and external-URL preview capabilities remain distinct unchanged code. Workspace search should select workspace files, not infer client-local host paths.

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| Runtime failure excerpts | Pass | Pass | Pass | Pass | Pass | None; read-only current failure evidence |
| Installed module checksums | Pass | Pass | Pass | Pass | Pass | None; not asserted as image digest or source revision |
| Baseline isolated reproduction | Pass | Pass | Pass | Pass | Pass | None; proves mismatch, not PDF rendering or changed source |
| Original screenshot E-001 | Pass | Pass | Pass | Pass | Pass | None; clipped identity is supplemented by runtime evidence |
| Cumulative solution handoff | Pass | Pass | Pass | Pass | Pass | None; no implementation or delivery claim |

Canonical supplement inventory exists in investigation notes; applicable core artifacts reference it. No normative Product/UI supplement or additional approval is needed.

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Bug Fix; missing public identity invariant | None |
| Root-cause classification is explicit and evidence-backed | Pass | Absolute internal candidate reaches relative-only reader via public pass-through | None |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | No broad refactor; reuse existing owner | None |
| Refactor decision is supported by concrete design sections or residual-risk rationale | Pass | Single boundary conversion; lifecycle/security ownership retained | Keep this solution; amend only local cleanup plan per ARCH-F-001 |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | Ownership Is Clear? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Files query → usable search choices | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Search/tree click → rendered file | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Operational candidate → verified runtime/receipt | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-001 return/local narrative | Snapshot refresh/index → abort race → public conversion → choices | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

The design separately describes return and bounded existing snapshot lifecycle under DS-001. It does not substitute that local flow for the full query/open paths.

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| WorkspaceFileExplorer | Pass | Pass | Pass | Pass | Resolver calls public search; strategy/index stay internal |
| Filesystem workspace/path owner | Pass | Pass | Pass | Pass | REST remains authoritative; locators are not authorization |
| Store/shared viewers | Pass | Pass | Pass | Pass | No PDF-specific fs/native bypass or client containment replacement |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Search | Pass | Pass | Pass | Pass | UI/store → GraphQL → explorer → snapshot/strategies/path utility |
| Content | Pass | Pass | Pass | Pass | Viewer/store → protected transport → workspace/path owner → fs |
| Delivery | Pass | Pass | Pass | Pass | Reviewed/validated package precedes rollout; no /app edits during implementation |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| GraphQL searchFiles(workspaceId, query) | Pass | Pass | Pass | Low | Pass |
| Explorer searchFiles(query, signal) | Pass | Pass | Pass | Low | Pass |
| Internal strategy search(rootPath, query) | Pass | Pass | Pass | Low | Pass |
| Content/read APIs with workspaceId + relative locator | Pass | Pass | Pass | Low | Pass |

Transport remains string[]; semantic correction is intentional. No abs/rel dual fields, client format flag or fallback is needed.

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Public search identity | Pass | Pass | N/A | Pass | Extend existing explorer; no new owner |
| Containment validation | Pass | Pass | N/A | Pass | Reuse getPath/resolveWorkspaceRelativePath, no copied guard |
| PDF/text display | Pass | Pass | N/A | Pass | Existing reader and shared viewer |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| File explorer/search | Pass | Pass | Pass | Pass | Public representation here; search mechanics unchanged |
| Workspace content | Pass | Pass | Pass | Pass | Byte access/containment unchanged |
| Web Files/viewers | Pass | Pass | Pass | Pass | Selection/render remains client-owned |
| Delivery | Pass | Pass | Pass | Pass | Integration/runtime verification, approval and cleanup |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Relative-path validation | Pass | Pass | Pass | Pass | Existing path utility reused |
| Candidate-to-locator conversion | Pass | N/A | Pass | Pass | One mapping in existing public method; extraction unnecessary |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Public search string[] | Pass | Pass | Pass | N/A | Pass | All strings are relative to request workspace; no parallel absolute field |
| Internal search candidates | Pass | Pass | Pass | N/A | Pass | Absolute filesystem representation remains private |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches Intended Owner/Boundary? | Responsibilities Were Re-Tightened After Shared-Structure Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| src/file-explorer/file-explorer.ts | Pass | Pass | N/A | Pass | Correct conversion owner; orphan methods require removal-plan disposition below |
| Search integration/unit tests | Pass | Pass | N/A | Pass | Public relative identity, private strategy absolutes, order/abort/reader interoperability |
| Existing file-explorer/content E2E tests | Pass | Pass | N/A | Pass | Extend real GraphQL/REST/path owner, not mock-only guard |
| Web browser probe | Pass | Pass | N/A | Pass | Real PDF pages/canvases on test-owned changed backend |
| Area docs | Pass | Pass | N/A | Pass | Search contract and current lifecycle; remove stale method references per ARCH-F-001 |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Existing server file-explorer/workspaces paths | Pass | Pass | Low | Pass | No new subsystem/directory |
| Server tests + web tests/e2e | Pass | Pass | Low | Pass | Existing layer-specific locations; no global testing-policy edit |
| Server/web file_explorer.md | Pass | Pass | Low | Pass | Existing area documentation |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Public absolute pass-through / erroneous integration expectation | Pass | Pass | Pass | Pass | Named clean-cut correction |
| Test-only explorer toShallowJson / getAllFilePaths | Fail | Pass | Fail | Fail | ARCH-F-001; omitted from removal inventory despite touched-file cleanup rule |
| Tests/docs referring to those obsolete methods | Fail | Pass | Fail | Fail | Retain useful assertions through live tree/projection/search owners; correct stale search docs |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Public absolute search response | No | Pass | Pass | No absolute-reader fallback or dual output |
| Private absolute strategy candidates | No | Pass | Pass | Current representation, not compatibility retention |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? | Direct Use, Rebuild, Or Migration Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Documents, registry and app state | Not Affected | Pass | Pass | N/A | Pass | No writer/schema/model/storage change |
| Search results/open tabs | Not Affected (transient state) | Pass | Pass | N/A | Pass | User closes failed tab and re-searches; no hidden migration |

No migration obligation is introduced by a transient response-format correction.

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| One-boundary fix and independent validation | Pass | Pass | Pass | Pass |
| Local obsolete method/test/doc cleanup | Pass | Pass | Fail | Fail |
| Live rollout | Pass | Pass | Pass | Pass |

Rollout status must stay conditional on host access/runtime pin and user timing/verification. There is no authority to silently restart PID61 or use live data as a test fixture.

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Root-aware relative conversion | Yes | Pass | Pass | Pass | In-root locator and same-prefix sibling escape shown |
| Broader refactor/framework | No | N/A | N/A | Pass | Not needed for this bounded fix |

## Material Premise Validation (Only When Needed)

None. All product/failure/operational conditions used to assess the correction are already established by BEH-001–004 and SCN-001–004. No imagined corruption, symlink change, timing race, outside strategy output or external absolute-consuming client is promoted into an additional product scenario.

ARCH-F-001 is a static reference/removal-plan finding under the mandatory touched-file dead-code rule, not a hypothesized user failure/lifecycle scenario. No new fallback, recovery or defensive machinery is requested.

## Unresolved Approved-Behavior Or Current-State Gaps

None for the approved behavior basis and source correction. Host image/access and changed-build rendering are correctly recorded as later-stage verification/delivery prerequisites.

## Review Decision

**Fail — Design Impact.** The root-cause diagnosis and one-boundary search correction are sound. One narrow local removal-plan amendment is required by the mandatory review checklist before implementation handoff. No requirement reapproval or change to the selected fix architecture is requested.

## Findings

### ARCH-F-001 — Touched explorer file retains test-only methods omitted from removal plan

- Type: Design Impact.
- Severity: Low runtime impact; blocking removal-plan completeness under mandatory shared Core Principle 7 and the report template's Removal / Decommission check.
- Approved authority / scope: REQ-004 / AC-003 (accurate shared file/search identity contract and durable coverage); preserved REQ-001/003 (usable Files behavior without unrelated behavior loss). The specific cleanup obligation is the governing shared touched-file dead-code rule, not a new product requirement.
- Scope status: Within Approved Scope — local cleanup in the already selected source file and area tests/docs.
- Required update changes approved behavior: No; no additional user approval required.
- Affected existing behavior/contract: live search uses snapshot controller → buildWorkspaceDirectoryTree → FileNameIndexer traversal of getTree, not getAllFilePaths. Live folder projection serializes TreeNode.toShallowDict directly. These supported paths must stay intact.
- Evidence:
  - `src/file-explorer/file-explorer.ts:177–182` defines `toShallowJson`; `:220–244` defines `getAllFilePaths`.
  - Repository reference search (excluding node_modules/dist/ticket histories) finds calls only in `tests/unit/file-explorer/file-explorer.test.ts:84,96` and `tests/integration/file-explorer/file-explorer.integration.test.ts:31`, plus their tracked .js test counterparts. No production call/import/reflection/configuration entry exercising either method was found.
  - `WorkspaceSearchSnapshotController:110–115` invokes tree build then refreshSnapshotIndex; `FileNameIndexer.buildIndexFromCurrentTree` traverses getTree. `api/graphql/types/file-explorer.ts:99` uses folderNode.toShallowDict. Other production explorer importers are filesystem workspace and file-explorer streaming; their call paths do not use either method.
  - Server package is private; `src/index.ts` exports server/host entrypoints, not this class/API. No documented external consumer was found. No unused-public-member gate is configured in package/tsconfig; the production-reference trace is the current evidence.
  - Both `docs/modules/file_explorer.md:30` and `autobyteus-web/docs/file_explorer.md:922` misleadingly describe current search traversal as `getAllFilePaths`.
  - Design Legacy Removal Policy says no dead code was identified; Removal Plan lists only the absolute pass-through/test expectation, so the static omission is unresolved.
- Material-premise validation: N/A — static source-reference finding; no additional production-failure premise.
- Required update:
  1. Add these two methods, their method-only assertions and stale doc references to the explicit removal/decommission and file-change inventory; correct the no-dead-code assertion.
  2. Plan bounded removal, retaining meaningful relative tree/shallow projection assertions at the actual TreeNode/GraphQL/search owners rather than preserving methods solely for tests. Account for the tracked .js test counterparts where they reference removed methods; do not undertake broad generated-test cleanup.
  3. Require implementation reference search plus current typecheck/focused tests to confirm no production consumer is removed. If independent evidence of an actual supported consumer exists, record it and reassess the affected item instead of deleting that live capability.
- Proportionality: about two small methods plus their direct test/doc references; no new layer, migration, reader change or wider refactor. This is not asserted to cause the PDF400 or to improve runtime performance.
- Recommended recipient: Solution Designer through the matching Design Impact handoff rule.

## Classification

Design Impact. Approved requirements remain R1; affected upstream design/history/investigation should record this bounded cleanup disposition. Keep Small / High.

## Recommended Recipient

get_handoff_rules on 2026-10-12 returned the Fail / Blocked + Design Impact / Requirement Gap / Unclear rule to `/software_engineering_team/solution_designer`. It is the sole matching rule. No implementation handoff or pass notification.

## Residual Risks

- Changed-build GraphQL → protected REST200/MIME/fixture bytes, real PDF canvas/page rendering, relative text reads and rejection checks remain implementation/API-E2E responsibilities; no such pass is claimed here.
- Public absolute-to-relative response correction is intentional; no supported external absolute-consuming contract was evidenced. Do not add speculative compatibility.
- /app is still the baseline runtime; host Docker image/tooling and actual frontend version are not established. Delivery must pin/report deployed state or a precise blocker, obtain disruption timing approval if needed, and capture explicit user verification.
- Original résumé must remain unchanged; recorded SHA-256 is `7ede472f9974fa733499efc8b9e9066a6c11cec5d1e36b98982d6126851df2b5`.
- Existing lexical containment is preserved, not upgraded to symlink/TOCTOU guarantees.
- Review created only these two task-owned Markdown artifacts. Worktree/branch remain for downstream work; no processes/fixtures were started or left by this reviewer.

## Latest Authoritative Result

- Review Decision: Fail.
- Material-Premise Gate: Pass.
- Notes: ARCH-REV-001, SR-001/SR-002, ARCH-F-001 open. Behavior basis and selected fix architecture confirmed; complete the local obsolete-code removal plan, then return for review. Missing prior review never implied Pass.
