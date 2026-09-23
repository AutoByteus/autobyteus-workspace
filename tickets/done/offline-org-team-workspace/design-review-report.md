# Design Review Report

## Review Round Meta
- Package: `OFFLINE-ORG-TEAM-WORKSPACE-20260922`; date: 2026-09-22.
- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/offline-org-team-workspace/tickets/done/offline-org-team-workspace/requirements-doc.md`.
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/offline-org-team-workspace/tickets/done/offline-org-team-workspace/investigation-notes.md`.
- Upstream Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/offline-org-team-workspace/tickets/done/offline-org-team-workspace/solution-revision-record.md`.
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/offline-org-team-workspace/tickets/done/offline-org-team-workspace/design-spec.md`.
- Supplemental Task Artifacts Reviewed: `evidence/user-subteam-workspace-control.png` (visually inspected), `evidence/current-owner-probe.json`, historical `analysis-result.md`, and current `solution-handoff.md`, all under `/Users/normy/autobyteus_org/autobyteus-worktrees/offline-org-team-workspace/tickets/done/offline-org-team-workspace`.
- Relevant Solution Revision IDs: approved requirements **SR-002**; reviewed architecture **SR-005**; prior SR-004 / ARCH-REV-002; triggering IR-002, CRR-002 and API-REV-001 / API-F001. Earlier solution/review entries remain historical.
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/offline-org-team-workspace/tickets/done/offline-org-team-workspace/architecture-review-revision-record.md`.
- Current Architecture Review Revision ID: **ARCH-REV-003**.
- Current Review Round / Latest Authoritative Round: **3 / 3**.
- Trigger: Solution Designer's SR-005 narrow amendment removes the conflicting unchanged-FileExplorer restriction after IR-002; API-F001 remains an implementation-owned defect per CRR-002.
- Prior Review Round Reviewed: **ARCH-REV-002 / round 2 — Pass on SR-004**, AR-F001 resolved. Affected approved behavior reconfirmed; AR-F001 protection and downstream API-F001 source/ownership checked before the narrow amendment verdict. No broader implementation re-review performed.
- Current-State Evidence Basis: independent focused source inspection at `/Users/normy/autobyteus_org/autobyteus-worktrees/offline-org-team-workspace`, branch `codex/offline-org-team-workspace`, current implemented HEAD **3a52e67ba72ee53497f5d9492f406289f23f28f3** (IR-001), original base **da86efe07f7f71e7455db6a866286af0bf0debd7**. This review made no source/test edits and ran no executable/browser/provider tests. Existing API and Code/Implementation reproduction results are explicitly attributed, not independently claimed. Relevant skill/shared principles/template and server/web instruction context retained.
- Cumulative downstream inputs reviewed: `implementation-handoff.md`, `implementation-revision-record.md` (IR-002); `code-review-report.md`, `code-review-revision-record.md` (CRR-002); API coverage investigation, execution report, test-case ledger and revision record (API-REV-001); scope/origin and recovery-failure evidence. All are under the canonical artifact root above. Full evidence inventory in `solution-handoff.md` is carried forward; unrelated provider/task logs are not independently re-audited in this narrow review.
- Durable test inputs: worktree `autobyteus-web/components/fileExplorer/__tests__/FileExplorer.metadataActivation.spec.ts` (C09-R1 inspected) and `autobyteus-server-ts/tests/e2e/agent-org-runs/stopped-org-workspace-graphql.e2e.test.ts` (API-owned passing coverage carried). Successful test-code review and Delivery: **N/A — not yet reached**.

### Independent source evidence index
Paths are worktree-relative. AR-E01–11 retain the original-base/round-2 design evidence; renamed model-only paths describe that historical baseline, not current filenames. AR-E12–15 establish the current SR-005 amendment. Investigation E01–E42 remains the canonical cumulative supplement index.

| ID | Source inspected | Review relevance |
| --- | --- | --- |
| AR-E01 | `autobyteus-server-ts/src/agent-org-execution/services/agent-org-run-manager.ts:107-125,197-288`; `agent-org-run-model-config-mutator.ts` | Shared restore/save transition; eligibility; model-only target resolution; one write and strict readback. |
| AR-E02 | `autobyteus-server-ts/src/agent-org-execution/services/agent-org-runtime-config-projector.ts:9-58`; `agent-org-task-lifecycle-adapter.ts:61-90`; `agent-collaboration/execution/backends/configured-agent-execution-handle.ts:274-302` | Child paths consumed directly; fresh tasks use current configured source; workspace resolution separate from memory location. |
| AR-E03 | `autobyteus-server-ts/src/run-history/store/run-execution-tree-shared-record-schemas.ts:68-90`; `tests/fixtures/current-agent-org-run-fixtures.ts:8-73`; `src/agent-memory/store/agent-memory-layout.ts`; `src/agent-collaboration/execution/services/rooted-agent-memory-locator.ts` | Existing schema and identity-based memory support direct use without migration. |
| AR-E04 | `autobyteus-server-ts/src/workspaces/workspace-manager.ts:51-99`; `src/llm-management/services/run-model-selection-service.ts:32-128` | Existing registration owner; request-local runtime/cwd evidence; final model validation can be reused. |
| AR-E05 | `autobyteus-web/stores/existingRunModelConfigStore.ts:80-132,414-434`; `stores/agentOrgContextsStore.ts:271-305`; `services/agentOrgExecution/agentOrgExecutionContext.ts:152-190`; `agentOrgContextHydration.ts:54-96` | One editor/save owner, guarded retained-context publication, and current metadata hydration boundary. |
| AR-E06 | `autobyteus-web/components/agents/AgentList.vue:160,276`; `composables/useRunActions.ts:18-25`; `components/workspace/config/RunConfigPanel.vue:194-206`; `composables/useWorkspaceHistorySubjectActions.ts:47-71` | Supported preparation of an Agent draft with workspace A, then selection of a retained Org. Org selection clears run selection, not the launch-config draft. |
| AR-E07 | `autobyteus-web/stores/activeContextStore.ts:103-106`; `components/layout/RightSideTabs.vue:30-39,108-109,135-139`; `components/fileExplorer/FileExplorerLayout.vue:8,24,37` | Org route selects the correct context, but absent context workspace ID becomes `undefined` and is forwarded into Files. Files mounting is not gated by a resolved workspace. |
| AR-E08 | `autobyteus-web/components/fileExplorer/FileExplorer.vue:76-79,118-126,165-205`; `composables/useWorkspaceFileExplorer.ts:8-19`; `components/fileExplorer/FileExplorerTabs.vue:227-236,414-425`; `stores/workspace.ts:407-454` | Missing explicit ID means global fallback in Files tree, scoped actions and editor tabs. With no standalone run selected, global getter uses retained launch configuration. Editor Save uses that fallback workspace ID. |
| AR-E09 | `autobyteus-web/stores/workspaceMetadataActions.ts:92-139`; `stores/runHistoryLoadActions.ts:370-379`; `components/workspace/tools/TerminalPanel.vue:38-67` | Metadata resolver may reject; history wrapper yields null. Terminal already distinguishes omitted metadata from explicit null; Files does not. |
| AR-E10 | `autobyteus-server-ts/src/agent-collaboration/execution/backends/configured-agent-activation-planner.ts:56-116`; `src/agent-execution/backends/codex/thread/codex-thread-manager.ts:189-211`; `backends/claude/backend/claude-session-bootstrapper.ts:61-80`; `src/runtime-management/claude/client/claude-sdk-client.ts:398-423` | Saved cwd and retained provider identity are forwarded. This establishes adapter wiring, not real external cross-directory continuation success. |
| AR-E11 | Round-2 reinspection: `autobyteus-web/components/fileExplorer/FileExplorerLayout.vue:1-40`; `FileExplorer.vue:143-163,260-263`; `FileExplorerTabs.vue:376-411`; `components/layout/RightSideTabs.vue:29-40,108-109,135-139`; `types/workspace/activeAgentWorkspaceTarget.ts`; `TerminalPanel.vue:38-67` | Both Files consumers are contained by one layout; four Org target discriminants exist; tree unmount releases session/search/listeners and editor before-unmount removes global shortcuts. RightSideTabs is the only production layout caller. The proposed gate is actionable without lower fallback rewrites. |
| AR-E12 | Current `autobyteus-web/components/fileExplorer/FileExplorer.vue:118-220,260-263`; `stores/workspaceMetadataActions.ts:37-54,92-180`; `stores/workspace.ts:175-203` | Descriptor lookup does not register a client workspace. Ensure replaces cached metadata before pending-task dedup; a fresh-array getter can retrigger activation. Early registered/no-metadata returns omit loading settlement while previous finally is sequence-guarded. Existing component is the right correction owner. |
| AR-E13 | Current `stores/agentOrgContextsStore.ts:281-302`; `components/layout/RightSideTabs.vue:107-114`; `components/fileExplorer/FileExplorerLayout.vue:1-49`; composed `RightSideTabs.workspaceTarget.spec.ts:127-174` | Canonical read retries missing metadata; explicit Org null still gates both children. Existing composed recovery pre-registers B and misses first metadata-only activation. No SR-005 gate weakening is proposed. |
| AR-E14 | `evidence/api-browser-recovery-failure.md`, `api-c09-checkpoints.json`, API-REV-001; `code-review-metadata-activation-failure.log`, `code-review-failure-origin-source.json`, CRR-002; `implementation-ir002-scope-assessment.md`, reproduction/provenance, IR-002 | API observed both first-recovery variants failing with recursion/stuck Loading; Code Reviewer and Implementation Engineer reproduced C09-R1. This review read source/test/log evidence but did not rerun it. Empty original-base→HEAD diff independently confirms FileExplorer and metadata actions are unchanged origin files. |
| AR-E15 | SR-005 DS-002 “Metadata-only Files activation correction”; owner/dependency/file/removal/validation sections; requirements-only-pointer diff | Explicit bounded authorization, primitive semantic/readiness observation, current-attempt terminal settlement, stable lease identity and regression scope are coherent. Registration/layout/defaulting contracts and approved intent remain unchanged. |

### Round-3 verification delta
Verified SR-005 core changes against the failing source and durable regression, not just the requested authorization. AR-F001 stays resolved: current layout and parent implement its gate and API C09 safety observations support it. API-F001 is separately **open, implementation-owned Local Fix**. The prior blanket unchanged-FileExplorer assumption is explicitly superseded only for local activation/settlement and focused tests. No new architecture owner, persisted transition, public API, product behavior, or approval is needed. Prior unaffected design verdicts remain valid; this is not a second full source-review pass.

## Routing Classification Review
- Task size: **Medium**; architectural risk: **High** — accepted.
- Classification rationale reviewed: bounded existing-owner extension, but changes aggregate API, persisted path propagation, canonical filesystem-target publication, and provider continuation assumptions.
- Independent Architecture Review required by classification: **Yes**.
- Classification evidence or correction required: no correction; source and file inventory support this route. A visual selector unlock alone would not implement the approved behavior.

## Upstream Behavior And Production-Path Basis Confirmation
- Overall Basis Status: **Confirmed for architecture**. Requirements diff changes only the cumulative revision pointer. SR-005 completes the permitted local correction under DS-002; approved behavior and AR-F001 null protection stay unchanged. Known implementation failure API-F001 does not become a design or validation Pass.
- Approved requirements / intended behavior understood: SR-002 / USER-20260922-SCOPE authorizes the pictured mounted-Team selector, all configured children, stopped whole-Org Save and retained continuation.
- Relevant existing behavior confirmed: launch materializes paths; restore does not re-inherit; current stopped Save is model-only; canonical adoption retains context objects; memory is identity-scoped; task history is distinct from configured source.
- Scope guardrail confirmed: UC-001–004 in scope; root/direct-Agent/standalone workspace editing, live editing, file/history moves, provider reset and historical-task mutation excluded. Existing models, runtime/tool/skill policy, identities and drafts remain protected.
- Review authority: technical only. Every prospective blocking Design Impact finding is traceable to approved REQ/AC/BEH IDs: **Yes**.
- Remaining material ambiguity: **None for the narrow architecture authorization**. Metadata-only first recovery is supported and reproduced; current source/API gates remain Fail until the local correction is implemented and reviewed/validated.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User/configuration | Pass | Pass — approved stopped-Team edit; AR-E01–02 | Pass — DS-001/004 expand all configured children independently of model linkage | Confirmed | None |
| BEH-002 | User/settings | Pass | Pass — existing Settings and screenshot; AR-E05 | Pass — one composed draft/Save, other scopes remain locked | Confirmed | None |
| BEH-003 | User/continuation | Pass | Pass — ordinary Send, AR-E02/10; API C05–08 attributed results | Pass — DS-003 unchanged; sampled native/Codex/Claude continuity reported by API owner | Confirmed | Preserve scoped positive evidence; no Resume/provider change in this correction |
| BEH-004 | Contract/canonical publication | Pass | Pass — REQ-004/005/007; AR-E12–15 and API-F001 | Pass in SR-005 target design — gate retained; activation observation/settlement owned locally | Confirmed | API-F001 still open in implementation; C09/C09-R1 and both first-recovery variants must pass later |
| BEH-005 | User/delegation | Pass | Pass — delegation source selection, AR-E02 | Pass — DS-005 changes future source, not historical snapshots | Confirmed | None |
| BEH-006 | User/scope | Pass | Pass — user confirms mounted-Team surface | Pass — explicit Team intent excludes root/Agent/task subjects | Confirmed | None |

## Supplemental Artifact Coherence Verdict
| Artifact | Purpose And Scope Clear? | Linked To Core? | Internally Complete? | Consistent? | Status / Approval Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| User screenshot | Pass | Pass | Pass | Pass | Pass — surface evidence, not Product final visuals | None |
| Current-owner probe | Pass | Pass | Pass | Pass | Pass — synthetic feasibility only | None |
| Historical analysis result | Pass | Pass | Pass | Pass | Pass — explicitly superseded SR-001 hold | None |
| Current solution handoff | Pass | Pass | Pass | Pass | Pass — SR-005 amendment; architecture/source/API outcomes kept distinct | Current report/ARCH-REV-003 supplies architecture disposition only |
| Implementation IR-001/002 + scope/origin evidence | Pass | Pass | Pass | Pass | Pass — implemented baseline plus blocked correction authorization, no fix claimed | Return correction to existing implementation owner |
| Code CRR-001/002 + reproduction | Pass | Pass | Pass | Pass | Pass — historical Pass, current Fail/Local Fix | API-F001 not closed by architecture |
| API investigation/report/ledger/history + evidence/tests | Pass | Pass | Pass | Pass | Pass — API-REV-001 Fail; positive cases scoped and attributed | Preserve failing C09-R1 and both recovery variants; independent revalidation required |

Investigation E37–E42 and the full handoff inventory identify supplement purpose, ownership and applicability. No missing Product-owned or behavior-defining supplement was found. Provider/browser positive evidence is retained without claiming overall acceptance.

## Task Design Health Assessment Verdict
| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment present for current posture | Pass | Behavior change, not retrospective defect in former model-only scope | None |
| Root-cause classification explicit and evidence-backed | Pass | Extending model-only contracts would blur responsibility; AR-E01/05 | None |
| Refactor decision explicit | Pass | Broaden Org command/store; keep genuine model planners | None |
| Concrete design supports decision | Pass | Rename/removal tables, composed draft, one authority; SR-004 explicitly maps two Files presentation owners | None |
| Local defect/refactor proportionality | Pass | SR-005 names activation/settlement in the existing 359-line FileExplorer, with complete owner/file/test mapping; CRR-002 local-defect origin preserved | None; no broad framework/refactor needed |

## Spine Inventory Verdict
| Spine ID | Scope | Readable? | Narrative Clear? | Facade / Owner Clear? | Naming Clear? | Ownership Clear? | Off-Spine Concerns Kept Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary Save | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Canonical return / filesystem view, including bounded activation | Pass | Pass | Pass | Pass | Pass | Pass | Pass — SR-005 reaches registration, guarded settlement and stable live-session lifecycle |
| DS-003 | Primary Send / restore | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 | Bounded local transition | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-005 | Primary future delegation | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

Primary spans otherwise include initiating surface, authority, downstream mechanism and meaningful outcome. The store's load/save/reconcile local flow is also described; no new event bus is needed.

## Boundary Encapsulation Verdict
| Boundary / Owner | Public Entry Clear? | Internals Stay Internal? | Bypass Risk Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Org service/manager | Pass | Pass | Pass | Pass | Resolver never writes trees or calls standalone Team manager |
| Editor / Org context facade | Pass | Pass | Pass | Pass | Editor sends Team intent, facade publishes retained config |
| Context target → Files consumer | Pass | Pass | Pass | Pass | RightSideTabs preserves Org null; layout consumes it before either default-capable child mounts |
| Workspace registration/metadata | Pass | Pass | Pass | Pass | Existing capability reused, no invented IDs |
| FileExplorer activation → workspace registration | Pass | Pass | Pass | Pass | Local sequence/settlement stays in component, registration stays in store/action; layout stays display-only |

## Dependency Direction / Forbidden Shortcut Verdict
| Owner / Boundary | Allowed Dependencies Clear? | Shortcuts Explicit? | Direction Coherent? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Server Save | Pass | Pass | Pass | Pass | Service → manager → pure projection / workspace / validator / store |
| Client draft and canonical publication | Pass | Pass | Pass | Pass | No per-child writes, no direct editor context mutation |
| Files target selection | Pass | Pass | Pass | Pass | Explicit selected target, no replacement by draft getter; lower omitted-ID semantics preserved |
| Restore / task source | Pass | Pass | Pass | Pass | Reads committed configuration; no definition or historical-task bypass |
| FileExplorer local activation | Pass | Pass | Pass | Pass | Primitive semantic target/readiness, no pre-registration/remount workaround or second registration map |

## Interface Boundary Verdict
| Interface / API / Method | Subject Clear? | Responsibility Singular? | Identity Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `getAgentOrgRunConfig` / `updateStoppedAgentOrgRunConfig` | Pass | Pass | Pass | Low | Pass |
| `TeamWorkspacePatch` | Pass | Pass | Pass | Low | Pass — one Org ID plus configured Team address, no descendants |
| `agentOrgRunModelOptions` candidate workspace argument | Pass | Pass | Pass | Low | Pass — read-only preview, final validator authoritative |
| Context `applyRunConfig` / facade read/save | Pass | Pass | Pass | Low | Pass |
| Files consumer input for unavailable target | Pass | Pass | Pass | Low | Pass — string / null / omitted meanings consumed at one layout boundary |
| Existing ensureWorkspaceMetadata and local activation lifecycle | Pass | Pass | Pass | Low | Pass — no public contract change; same-ID metadata availability explicitly observed |

## Existing Capability / Subsystem Reuse Verdict
| Need / Concern | Existing Capability Checked? | Reuse Decision Sound? | New Piece Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Save / persistence / root exclusion | Pass | Pass | N/A | Pass | Extend existing manager and writer |
| Workspace registration / metadata | Pass | Pass | N/A | Pass | Registration side effect outside tree atomicity is stated honestly |
| Workspace draft / selector shape | Pass | Pass | Pass | Pass | Separate workspace semantics, compose rather than duplicate coordinator |
| File target consumption | Pass | Pass | N/A | Pass | Layout retains null gate; local activation fix reuses metadata registration and lease cleanup rather than bypassing them |
| Continuation and tasks | Pass | Pass | N/A | Pass | Existing owners reused; no speculative provider migration |

## Subsystem / Capability-Area Allocation Verdict
| Subsystem | Ownership Clear? | Reuse / Extend Decision Sound? | Supports Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Org execution/domain/GraphQL | Pass | Pass | Pass | Pass | Canonical invariant server-owned |
| Run configuration editing | Pass | Pass | Pass | Pass | Neutral aggregate, model planner remains narrow |
| Workspace views / Files | Pass | Pass | Pass | Pass | RightSideTabs/layout own availability; FileExplorer owns activation/terminal state; store owns registration |
| Runtime / persistence / task owners | Pass | Pass | Pass | Pass | No new subsystem |

## Reusable Owned Structures Verdict
| Repeated Structure / Logic | Extraction Evaluated? | Shared File Sound? | Ownership Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Selector discriminated model | Pass | Pass | Pass | Pass | Existing union reused; no contradictory booleans |
| Aggregate command and draft | Pass | Pass | Pass | Pass | Two semantic patch arrays, Org-specific workspace composition |
| Workspace selection/preview | Pass | Pass | Pass | Pass | New pure draft file avoids model-link coupling |

## Shared Structure / Data Model Tightness Verdict
| Structure / Schema | Fields Singular? | Redundancy Removed? | Parallel Representation Controlled? | Specialization Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Org command | Pass | Pass | Pass | Pass | Pass | No generic arbitrary-field scope patch |
| Org draft | Pass | Pass | Pass | Pass | Pass | Canonical tree baseline; separate intentions |
| Persisted launch config | Pass | Pass | Pass | N/A | Pass | Existing paths, no stored inheritance flags |
| Files target availability | Pass | Pass | Pass | Pass | Pass | Existing prop gains one distinct null meaning; no redundant state/service or persisted flag |

## File Responsibility Mapping Verdict
| File / Group | Singular Responsibility? | Matches Owner? | Re-Tightened After Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Server config domain / mutator / manager / service / resolver | Pass | Pass | Pass | Pass | Types, pure composition, orchestration, application boundary, transport remain separate |
| General process supervisor | Pass | Pass | N/A | Pass | Dependency injection only |
| Existing-run store / model planner / workspace draft / form projector / Org client | Pass | Pass | Pass | Pass | Correct bounded decomposition |
| Org contexts store / execution context | Pass | Pass | Pass | Pass | Async preparation separate from synchronous commit |
| Files/layout target consumers | Pass | Pass | Pass | Pass | Prior gate remains; SR-005 explicitly allows FileExplorer activation/settlement only, plus focused regressions |
| Selector/components/docs/tests | Pass | Pass | Pass | Pass | Focused UI extension; no root/runtime/tool unlock |

## Subsystem / Folder / File Placement Verdict
| Path / Item | Placement Clear? | Folder Matches Owner? | Mixed-Layer / Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Server domain/services/GraphQL | Pass | Pass | Low | Pass | Existing folders sufficient |
| Web runConfigEditing / stores / selector types | Pass | Pass | Low | Pass | No generic support layer |
| DS-002 Files completion | Pass | Pass | Low | Pass | Existing layout and component folders; no new subsystem |

## Removal / Decommission Completeness Verdict
| Item / Area | Obsolete Piece Named? | Replacement Clear? | Scope Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Org model-only endpoints/client boundaries | Pass | Pass | Pass | Pass | Cutover without aliases |
| Aggregate store/draft and context names | Pass | Pass | Pass | Pass | Genuine model-only helpers retained |
| Unconditional stored-only Team control | Pass | Pass | Pass | Pass | Only approved Org Team projection changes |
| Selected Org null→undefined and unconditional Files child mounting | Pass | Pass | Pass | Pass | Explicit null + whole layout branch gate; intentional omitted-ID defaults retained |
| FileExplorer reallocated aggregate watch and unsettled terminal branches | Pass | Pass | Pass | Pass | SR-005 names exact replacement/removal; old target/defaulting semantics retained |

## Legacy / Backward-Compatibility Verdict
| Area | Wrapper / Dual Path / Legacy Retention? | Clean-Cut Removal Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Org API/client | No | Pass | Pass | No old endpoint fallback |
| Data/runtime | No | Pass | Pass | Same current schema; standalone APIs are preserved current behavior, not legacy |
| Provider continuation | No | Pass | Pass | No fresh-session fallback to disguise failure |

## Persisted-Data Transition Verdict (When Applicable)
| Stored Subject | Decision | Evidence Sufficient? | Choice Proportionate? | Migration Safety If Required | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Org execution-tree schema v1 | Directly Usable — No Migration | Pass | Pass | N/A | Pass | Existing fields/readers/fixtures; one explicit configured-state update, not bulk conversion |
| Conversation memory and task snapshots | Not Affected by file relocation/schema change | Pass | Pass | N/A | Pass | Identity-based storage and snapshots preserved; fresh task source sees new values |
| External provider continuation | Existing binding retained; no migration designed | Pass — adapter wiring and attributed API C05–08 sampled continuity | Pass | N/A | Pass at design level | API positive cases retained, not repeated by architecture reviewer or expanded into a universal guarantee |

## Change / Refactor Safety Verdict
| Area | Sequence Realistic? | Temporary Seams Explicit? | Cleanup Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Server contract and client cutover | Pass | Pass — no lasting alias | Pass | Pass |
| Draft/form publication | Pass | Pass | Pass | Pass |
| Files unavailable-target completion | Pass | Pass | Pass | Pass — context publication and layout gate ship together, with composed regression |
| Runtime/schema | Pass | N/A — unchanged | Pass | Pass |
| Local activation correction | Pass | Pass — no temporary bypass | Pass | Pass — C09-R1 plus both composed recovery cases, then source/API gates |

## Example Adequacy Verdict
| Topic | Example Needed? | Present / Clear? | Avoided Shape Explained? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Team intent and propagation | Yes | Pass | Pass | Pass | `/marketing_team` example excludes root/siblings/tasks and preserves custom model |
| Save/metadata consumer outcome | Yes | Pass | Pass | Pass | SR-005 additionally specifies metadata-only B first activation, same-ID readiness and removal of test pre-registration workaround |

## Material Premise Validation (Only When Needed)

### AR-P001 — An unavailable canonical Org workspace must not select a retained launch draft's workspace
- Related approved requirement / established contract: **REQ-005 / AC-005** requires file/explorer context to correspond to canonical saved/active workspace, not stale metadata; **REQ-004 / BEH-004** protects truthful canonical reconciliation. This is a target-correctness contract, not a new general infrastructure-recovery promise.
- Relevant behavior IDs: BEH-004; preservation aspects of BEH-003/006.
- Initiating basis kind: **Contract**, exercised by supported user actions.
- Independent product-supported initiating trigger / governing contract: user prepares a new Agent from the Agents surface with workspace A, then chooses a retained stopped Org from History, edits its mounted-Team workspace to B in the approved Settings surface, Saves, and uses Files. The selected Org's Files target must remain B or unavailable; the unrelated draft must not become the target. The contract applies when the metadata read needed to publish B is unavailable; no corruption, internal-file manipulation, or provider failure is assumed.
- Support evidence: AgentList → `prepareAgentRun` → RunConfigPanel workspace selection is AR-E06; History → `useWorkspaceHistorySubjectActions.execute` selects the Org and clears standalone selection without clearing draft configuration. Approved Settings action is SR-002 SCN-001, and unavailable filesystem context is governed by REQ-005. AR-E09 identifies the concrete metadata lookup/wrapper exercising the contract, not an invented user-operated internal endpoint.
- Scenario validity: **Supported Explicit Edge Scenario** of the approved target-correctness contract within an ordinary supported task-switching journey. This does not assert that metadata failures occur on every Save or that a live incident was reproduced.
- Original-base production path exposing the ARCH-REV-001 risk (historical; null gate now implemented): supported launch draft stores A → History selects stopped Org but retains draft → approved Save returns canonical B → facade resolves B metadata through workspace/history owner → unsuccessful lookup yields no metadata → proposed DS-002 clears member workspaceId/metadata → RightSideTabs maps null ID to undefined → FileExplorerLayout forwards missing ID → Files tree/composable/tabs fall back to global workspace store → no standalone run selection means retained launch configuration A is used → Files can display/edit A rather than remaining unavailable for B.
- Lifecycle preconditions / consequence: enclosing Org is stopped and eligible; draft A remains under its existing owner; selected Team canonical path is B; B metadata is unavailable at publication; A is an existing registered workspace. The explicit null fallback contract is decisive. Terminal already honors explicit null and is not implicated. Tree and editor must both be covered because FileExplorerTabs saves using its fallback ID (AR-E08).
- Reachability: **Reachable**. Original safety premise was source-traced; API C09 subsequently exercised temporary metadata unavailability through the supported browser journey and confirmed null safety. Metadata-only first recovery is now independently established by attributed real browser observations plus source, not merely test setup.
- Review consequence / proportionate response: **AR-F001 resolved by SR-004**. Target path is canonical B → guarded context ID/null → RightSideTabs explicit B/null → layout v-if for the entire tree/divider/editor branch. Null renders unavailable feedback without either lower fallback consumer. Reopen retries unresolved B metadata on the retained context; success remounts both at B. Existing unmount hooks release sessions/search work/listeners and editor shortcuts (AR-E11). Omitted-target defaults, draft A and Terminal semantics stay intact. This is proportionate; no global reset, generic recovery service or cancellation promise for already-issued writes is added.

### AR-P001 — Round-3 recovery continuation / API-F001
- Independent trigger remains the user's supported **Settings canonical read/reopen after stopped-Team Save**, to use the saved Files destination without Save replay. REQ-005/007 / AC-005 / BEH-004 and SR-004 DS-002 already require this outcome. No new scenario or governing contract is invented.
- Forward current path: canonical read → Org facade prepares unresolved B → root metadata lookup caches B descriptor but not `workspaces[B]` → retained context receives B ID → layout mounts Files → activation calls existing ensure action → replacement equivalent metadata invalidates fresh-array watch → repeated activation/current-sequence supersession → recursive update/stuck Loading. API browser D/E cases observed this after successful metadata/CreateWorkspace responses; C09-R1 reproduces with real reactive owner and deferred transport. Prior composed `register('B')` bypasses this lifecycle point and is not sufficient recovery proof.
- Scenario validity / reachability: **Supported Explicit Edge Scenario / Reachable**, continuation of AR-P001; normal asynchronous registration is sufficient, without hidden mutation or conflicting user actions. The trigger and actual metadata-only lifecycle precede the proposed correction and establish its necessity independently.
- Review consequence: accept local semantic primitive-source observation (including same-ID readiness), complete current-attempt settlement and stable lease observation under FileExplorer. Keep stale completion/inactive/unmount guards and existing retry/cleanup; no speculative new recovery machinery. This scope amendment enables correction but **does not resolve API-F001**. No new AR finding duplicates that defect.

## Unresolved Approved-Behavior Or Current-State Gaps
No unresolved **architecture/approved-intent** gap. Known current implementation defect **API-F001** remains acceptance-blocking under CRR-002 / API-REV-001; its correction and validation are the next work, not implied complete by this decision.

## Review Decision
**Pass — SR-005 narrow correction-scope amendment**, against unchanged approved SR-002. It is actionable under the existing owner and preserves AR-F001. This Pass authorizes implementation correction only; current source review CRR-002 and API/E2E API-REV-001 remain Fail.

## Findings
No new/open **architecture** findings. **AR-F001 remains resolved**, not reopened. **API-F001 remains open / implementation-owned Local Fix**; preserve that finding ID and downstream authority until corrected, source-reviewed and independently validated. No new architecture finding is created for the same defect.

## Classification
**Architecture Pass; failure classification N/A**. Cumulative task size **Medium** / architectural risk **High**, Reviewed route retained. SR-005 removes one conflicting file restriction to realize existing REQ-005/007 / AC-005 / BEH-004, not new behavior. Renewed user approval is not required.

## Recommended Recipient
**/implementation_engineer**. Fresh `get_handoff_rules` selected the primary Pass / implementation-ready rule as the single most-specific outcome rule. Correct API-F001, then return through source review and API/E2E. Current single-recipient instruction applies; no duplicate forwarding or additional informational outcome message.

## Residual Risks
- **API-F001 is not fixed.** C09-R1 must pass without recursive/unhandled errors; both initially unopened and previously mounted/dirty recovery cases must use metadata-only B and delayed real registration, not `register('B')`, tab toggles or forced remounts. Verify loading settlement, same-ID metadata arrival, rejection/Retry, stale target/active/unmount completions and stable lease behavior.
- Preserve null gating, no stale file writes, canonical saved B, no Save replay, and draft/composer/conversation identity. Keep layout display-only and metadata registration in its existing owner. Unrelated fallback policy, Save, Resume, providers and persistence are not changed by the amendment.
- API-REV-001 reports scoped Pass for native/Codex/Claude continuity (C05–07), core browser Save/reopen/Send (C08), real HTTP/restart (C04), fresh tasks/historical snapshots (C10), and repository sets. These are API-owner evidence, not repeated by this reviewer or an overall acceptance Pass. Retain their environment and poweroff-resumption limitations; revalidation owner decides necessary rerun scope after the local fix.
- Actual native folder picker remains unexecuted; full web typecheck has reported baseline parser blockers. No successful API test-code review or Delivery gate has been completed. Architecture Pass changes neither these limits nor the current source/API Fail.

## Latest Authoritative Result
- Review Decision: **Pass — SR-005 narrow correction-scope amendment**.
- Material-Premise Gate: **Pass** — supported first-recovery continuation confirmed by current source and attributed downstream execution; no speculative machinery.
- Failure classification: **N/A**; task size/risk **Medium / High** retained.
- Revision: **ARCH-REV-003**, approved **SR-002** / design **SR-005**; trigger **IR-002 / CRR-002 / API-REV-001 / API-F001**.
- Architecture findings: **None open/new**; AR-F001 remains resolved. Downstream API-F001 remains open; source/API Fail remains authoritative. Reviewer footprint: this report and review history only; no source/test edit or test execution.

Artifact integrity check: 88 non-review package/source/test files fingerprinted before and after report edits; identical aggregate SHA-256 `9d3e63ed22983d007126a833531324c92cbe52cffeeef3ac600193116970ecf7`. Only the two architecture review artifacts were edited this round.
