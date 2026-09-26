# Design Review Report — Runtime-specific stopped-run model switching

## Review Round Meta
- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-stopped-model-switch/tickets/in-progress/runtime-specific-stopped-model-switch/requirements-doc.md` (SR-006 Approved; REQ-001–008, AC-001–011).
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-stopped-model-switch/tickets/in-progress/runtime-specific-stopped-model-switch/investigation-notes.md` (E01–E23, AE-01–16).
- Upstream Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-stopped-model-switch/tickets/in-progress/runtime-specific-stopped-model-switch/solution-revision-record.md` (SR-001–009).
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-stopped-model-switch/tickets/in-progress/runtime-specific-stopped-model-switch/design-spec.md` (SR-009).
- Supplemental Task Artifacts Reviewed: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-stopped-model-switch/tickets/in-progress/runtime-specific-stopped-model-switch/model-picker-verification-investigation.md` (evidence only); screenshots/prior packages indexed in investigation notes; historical `tickets/done/claude-sdk-canonical-model-ids/api-e2e-test-case-ledger.md` for supported definition-to-Run path. Product UI/UX spec N/A.
- Relevant Solution Revision IDs: SR-002/003 historical capacity basis; SR-006 approved Claude correction; SR-007 failed design; SR-008 recovery evidence; SR-009 current design.
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-stopped-model-switch/tickets/in-progress/runtime-specific-stopped-model-switch/architecture-review-revision-record.md`.
- Current Architecture Review Revision ID: **ARCH-REV-003**; Current Review Round: **3**; Latest Authoritative Round: **3**.
- Trigger: revised SR-009 recovery of ARCH-REV-002 DR-001.
- Prior Review Round Reviewed: ARCH-REV-002 Fail/Design Impact, DR-001; ARCH-REV-001 Pass applied only to SR-003/SR-002.
- Current-State Evidence Basis: prior independently inspected Claude SDK/client/catalog, shared selection, GraphQL, Web picker/launch, Agent/Team definition-to-Run and Application Setup/readiness source paths; re-read SR-009 design and AE-16/E23. `CodexModelCatalog.listModels(cwd)` was checked to bound the environment-key concern. No implementation or tests were performed by this reviewer.

## Routing Classification Review
- Task size: **Medium**.
- Architectural risk: **High**.
- Classification rationale reviewed: shared backend catalog, stopped selection and GraphQL/Web option contracts, preserved Agent/Team definition and application launch consumers, exact persisted IDs. No new subsystem or storage shape; independent review remains warranted.
- Independent Architecture Review required: **Yes**.
- Correction required: none.

## Upstream Behavior And Production-Path Basis Confirmation
- Overall Basis Status: **Confirmed**.
- Approved requirements/intended behavior: external stopped-run choices are runtime-catalog based without platform capacity comparison; AutoByteus retains verified non-decrease. Claude backend omits a proven redundant `default` from **newly offered** rows, but exact SDK-reported saved `default` remains current/continuable and is never implicitly rewritten. No universal provider continuation guarantee. Existing definition/launch-default behavior is outside the change.
- Relevant existing behavior/evidence: E17–22/AE-10–15 establish raw SDK alias and split backend/frontend policy; E23 found five locally indexed exact-`default` Claude run histories, without proving manual selection or definition prevalence. Prior live E2E-02–07 demonstrates supported saved-definition `default` → Agent/Team Run. Current Web launch picker checks exact provider snapshot membership/schema, and Application host validator exact-checks `listLlmModels`; ARCH-REV-002 MP-001/002 trace both product paths.
- Scope guardrail: stopped Agent/Team/Org, backend provider catalog, exact current continuity, fresh Save, copy and validation in scope; definitions/launch defaults, runtime switching, hot-swap, migration and provider internals outside. SR-009's launch/application work contains the shared catalog change rather than adding new launch policy.
- Approved change, preserved behavior, and outside scope understood: **Yes**.
- Every prospective blocking Design Impact finding maps to approved/preserved authority: **Yes**; no new blocking finding accepted.
- Remaining material ambiguity: none for architecture; provider pair behavior and installed definition/application prevalence remain bounded downstream facts, not a design-policy gap.

| Behavior ID | Kind | Design Alignment | Trigger/Current Evidence | Target Path/Spine | Status | Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Stopped Agent/Team/Org options | Pass | Pass — exposed Settings, E17–21 | Pass — DS-01/03 normalized offered choices plus exact saved current | Confirmed | None |
| BEH-002 | Explicit stopped Save | Pass | Pass — existing service/lifecycle guards | Pass — DS-02/04 fresh offered changed ID or fresh exact unchanged ID, schema/atomicity | Confirmed | None |
| BEH-003 | AutoByteus | Pass | Pass — native capacity source | Pass — verified non-decrease and same-model exception | Confirmed | None |
| BEH-004 | Normal continuation | Pass | Pass — next message/restore E08 | Pass — DS-05 exact model/binding/history retained | Confirmed | Validate representative providers downstream |
| BEH-005 | Settings copy/current | Pass | Pass — picker/supplement | Pass — DS-03/06 distinct current display and backend descriptors | Confirmed | None |
| BEH-006 | Team/Org scopes | Pass | Pass — existing managers/tree writers | Pass — per-scope validation and one commit | Confirmed | None |
| BEH-007 (preserved, provisional) | Saved definition/current profile `default` → Agent/Team Run or Application Setup | Pass | Pass — prior live E2E, exposed UI, current host validator; MP-001/002 | Pass — DS-07/08 backend exact-current resolution, current-only Web display/schema, application credential metadata, offered list still normalized | Confirmed | None |

BEH-007 remains a provisional ID for supported preserved behavior, not new product intent.

## Supplemental Artifact Coherence Verdict
| Artifact | Purpose/Scope | Linked | Complete for Role | Consistent | Status/Approval Clear | Action |
| --- | --- | --- | --- | --- | --- | --- |
| Model-picker verification investigation | Pass | Pass | Pass | Pass — early UI-label proposal superseded | Pass — evidence only | None |
| User screenshots, predecessor and historical E2E package | Pass | Pass | Pass for evidence role | Pass | Pass — not SR-006 design authority | None |

Investigation notes contain the canonical supplement inventory. No behavior-defining supplement or Product prototype is missing.

## Task Design Health Assessment Verdict
| Area | Result | Evidence | Action |
| --- | --- | --- | --- |
| Assessment present | Pass | SR-009 names user-directed correction and bounded refactor. | None |
| Root cause evidence-backed | Pass | AE-10–16: raw alias, client fold, ID-only stopped options and exact-current launch consumers. | None |
| Refactor decision explicit | Pass | Claude catalog normalization, one offered/current owner, stopped DTO, launch descriptor query and application current lookup. | None |
| Decision reflected throughout design | Pass | DS-01–08, API/file/removal map, sequence and tests now include the DR-001 consumers. | None |

## Spine Inventory Verdict
| Spine | Scope | Readable | Narrative | Facade/Owner | Naming | Ownership | Off-Spine | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-01 | Stopped options | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-02 | Stopped Save | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-03 | Return to stopped picker | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-04 | Save reconciliation | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-05 | Normal continuation | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-06 | Bounded copy | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-07 | Definition → Run launch | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-08 | Application Setup/readiness | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

DS-07/08 now extend from exposed user surfaces through the shared catalog/current boundary to launch/readiness outcomes, rather than stopping at the normalized list.

## Boundary Encapsulation Verdict
| Owner | Public Entry | Internals Encapsulated | Bypass Controlled | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| ClaudeModelCatalog / ModelCatalogService | Pass | Pass | Pass | Pass | Raw SDK snapshot is internal; offered and exact-current meanings are explicit. |
| RunModelSelectionService | Pass | Pass | Pass | Pass | One ModelCatalogService view; no direct SDK lookup. |
| Stopped Agent/Team/Org owners | Pass | Pass | Pass | Pass | Existing lifecycle/atomic writers retained. |
| Web stopped and launch config | Pass | Pass | Pass | Pass | Offered snapshots/run DTO plus current-only descriptor; no frontend alias policy. |
| Application host validator | Pass | Pass | Pass | Pass | Resolves exact effective current through public ModelCatalogService, not offered-only list or raw SDK. |

## Dependency Direction / Forbidden Shortcut Verdict
| Boundary | Allowed Dependencies | Forbidden Shortcuts | Coherent Direction | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Selection/application → ModelCatalogService → Claude catalog/SDK | Pass | Pass | Pass | Pass | No mixed-level SDK bypass. |
| Lifecycle owners → selection validator | Pass | Pass | Pass | Pass | No second runtime-specific policy. |
| Web → GraphQL options/snapshots/current query | Pass | Pass | Pass | Pass | Display/schema only; query is not Save authorization or offered list. |
| Restore adapter → provider binding | Pass | Pass | Pass | Pass | Normal continuation unaffected. |

## Interface Boundary Verdict
| Interface | Subject | Singular Responsibility | Identity | Generic Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| Catalog view `offeredModels/findExactCurrent` | Pass | Pass | Pass | Low | Pass |
| `resolveExactCurrentLlmModel(runtime,id,cwd?)` | Pass | Pass | Pass | Low | Pass |
| Stopped `RunModelOptions` current/replacements | Pass | Pass | Pass | Low | Pass |
| Batched GraphQL `runtimeCurrentModelDescriptors` | Pass | Pass | Pass | Medium | Pass — read-only descriptors for caller-supplied server-origin seed; not an eligibility command |
| Application host exact-current lookup | Pass | Pass | Pass | Low | Pass |

The launch-current query is proportionate because launch Web already needs provider snapshots for offered choices; stopped Settings instead retains a self-contained run-options DTO to avoid its former second catalog intersection. Implementers must keep non-Claude workspace-scoped catalog lookup aligned with the run environment if that query is used for such IDs; no actual divergent Codex catalog was established here.

## Existing Capability / Subsystem Reuse Verdict
| Need | Existing Area Checked | Decision Sound | New Piece Justified | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Claude alias evidence/normalization | Pass | Pass | N/A | Pass | Existing SDK metadata and Claude catalog. |
| Exact-current backend resolution | Pass | Pass | Pass | Pass | ModelCatalogService extends its current boundary, no generic alias registry. |
| Launch/application display/readiness | Pass | Pass | Pass | Pass | Existing components/validator extended, not parallel policy owners. |

## Subsystem / Capability-Area Allocation Verdict
| Area | Ownership Clear | Reuse/Extend Sound | Spine Fit | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Claude catalog / LLM management | Pass | Pass | Pass | Pass | Backend offered/current authority. |
| Stopped run history/Team/Org | Pass | Pass | Pass | Pass | Existing guards and writers. |
| GraphQL/Web config and launch | Pass | Pass | Pass | Pass | Transport/current-only presentation. |
| Application readiness | Pass | Pass | Pass | Pass | Exact effective current/credential metadata. |

## Reusable Owned Structures Verdict
| Structure | Extraction Evaluated | File Choice | Owner Clear | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Claude offered-row normalization | Pass | Pass | Pass | Pass | Claude-specific. |
| Same-snapshot offered/current view | Pass | Pass | Pass | Pass | No competing raw offered API. |
| Run/current choice descriptor | Pass | Pass | Pass | Pass | One bounded display/schema mapping reused across transport. |

## Shared Structure / Data Model Tightness Verdict
| Structure | Field Meaning | Redundancy Removed | Overlap Controlled | Core/Variant Sound | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `RunModelChoice/RunModelOptions` | Pass | Pass | Pass | Pass | Pass | Current identifier remains when descriptor null; schema null is distinct. |
| Catalog view | Pass | Pass | Pass | Pass | Pass | Offered IDs versus exact SDK-reported current are not conflated. |
| Launch-current query result | Pass | Pass | Pass | Pass | Pass | Same descriptor fields plus requested exact ID/null, no eligibility flag or second choice list. |

## File Responsibility Mapping Verdict
| File/Area | Singular | Owner Match | Retightened | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Claude SDK client/presentation and ClaudeModelCatalog | Pass | Pass | Pass | Pass | Raw adaptation versus offered normalization. |
| ModelCatalogService / RunModelSelectionService | Pass | Pass | Pass | Pass | One owner and stopped policy. |
| GraphQL run/current projections; Web existing-run/launch components | Pass | Pass | Pass | Pass | Self-contained stopped DTO, separate launch-current detail. |
| Application host validator | Pass | Pass | Pass | Pass | Uses exact-current model for existing credential check. |

## Subsystem / Folder / File Placement Verdict
| Path | Placement Clear | Folder Matches Owner | Mixed/Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Claude client and LLM-management catalog | Pass | Pass | Low | Pass | Existing subsystem depth is appropriate. |
| GraphQL/Web config and launch | Pass | Pass | Low | Pass | No extra alias subsystem. |
| Application launch-configuration validator | Pass | Pass | Low | Pass | Current-value resolution remains in existing owner. |

## Removal / Decommission Completeness Verdict
| Item | Obsolete Piece Named | Replacement Owner | Scope Explicit | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Frontend alias folding/`aliasIds` and alias-target GraphQL field | Pass | Pass | Pass | Pass | Remove only after stopped and launch current displays convert; caller audit. |
| Stopped second catalog intersection/mixed fallback | Pass | Pass | Pass | Pass | Replaced by backend current/replacement descriptors. |
| Launch selected-alias behavior | Pass | Pass | Pass | Pass | Current-only display override preserves exact saved ID, not a new offered option. |
| Application offered-only exact validation | Pass | Pass | Pass | Pass | Replace with public exact-current resolver before publishing normalized list. |

## Legacy / Backward-Compatibility Verdict
| Area | Wrapper/Dual Path? | Clean-Cut Removal | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Backend catalog/GraphQL/Web alias policy | No | Pass | Pass | No fake offered alias, dual DTO or frontend folding retained. |
| Persisted `default` | No version branch | Pass | Pass | Exact current lookup is a present-value invariant for any saved ID. |

## Persisted-Data Transition Verdict
| Subject | Decision | Reader/Semantic Evidence | Choice Proportionate | Migration Safety | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Agent metadata; Team/Org trees | Directly Usable — No Migration | Pass | Pass | N/A | Pass | E23 found one Agent/four Team indexed exact-`default` files; raw exact lookup and restore keep ID/binding. |
| Definition/application saved selections | Directly Usable — No Migration | Pass | Pass | N/A | Pass | Prior live E2E shows definition `default`; DS-07 current-only descriptor and DS-08 exact validation preserve it without stored-shape rewrite. Installed prevalence not assumed. |

## Change / Refactor Safety Verdict
| Area | Sequence Realistic | Temporary Seams Explicit | Cleanup Explicit | Verdict |
| --- | --- | --- | --- | --- |
| Claude catalog and application validator | Pass | Pass — update current validator in same backend change before offered-only publication | Pass | Pass |
| Stopped selection/GraphQL DTO | Pass | Pass — options/Save together | Pass | Pass |
| Launch Web/current query and alias removal | Pass | Pass — convert callers first, then remove matching/fallback | Pass | Pass |

## Example Adequacy Verdict
| Topic | Needed? | Present/Clear | Bad Shape Explained | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Proven `default` sibling and stopped Save | Yes | Pass | Pass | Pass | Changed versus unchanged exact ID. |
| Definition → Run and Application saved `default` | Yes | Pass | Pass | Pass | Concrete example keeps current-only label/schema, explicit `opus` switch and application metadata. |

## Material Premise Validation (Only When Needed)

### MP-001 — Saved `default` definition enters Agent/Team Run
- Related approved/preserved authority: REQ-008/AC-010–011 and no change to definitions/launch defaults. Behavior: BEH-007. Kind: **User**.
- Independent trigger/evidence: user opens **Agents → Run** or **Agent Teams → Run** for a definition saved with exact Claude `default`; historical live E2E-02–05 exercised these product surfaces.
- Forward path: saved definition → Run seed → normalized provider snapshot for offered choices plus batched GraphQL exact-current descriptor for server-origin seed → shared picker current-only display/schema → unchanged launch retains `default`, explicit sibling selection changes ID.
- Preconditions/consequence: SDK still reports exact `default` and proven listed sibling; target now avoids the SR-007 false-unavailable state without re-offering `default`.
- Reachability: **Reachable**; prior E2E confirms supported execution. Review consequence: **resolved design path**, no finding.

### MP-002 — Application readiness evaluates an effective saved `default`
- Related authority: REQ-008 and existing application launch-readiness contract. Behavior: BEH-007. Kind: **User/System**.
- Independent trigger/evidence: user selects a saved Agent/Team resource in **Applications → Launch Setup** or active application startup evaluates its configured resource; current setup/view/readiness code and prior supported definition `default` evidence establish the path. No installed affected application count is claimed.
- Forward path: selected resource/effective leaf → configuration view → ApplicationLaunchHostCapabilityValidator → ModelCatalogService exact-current descriptor → existing credential authority/readiness; Web current-only descriptor is separate from normalized offered choices.
- Preconditions/consequence: raw SDK still reports saved `default`; target avoids `MODEL_UNAVAILABLE` merely because selection-facing output omits it.
- Reachability: **Reachable** for supported setup/startup. Review consequence: **resolved design path**, no finding.

No additional material scenario was introduced. Actual provider failure remains approved SCN-006 and downstream validation, not a speculative recovery requirement.

## Unresolved Approved-Behavior Or Current-State Gaps
None. Implementation must still prove GraphQL/Web integration and representative provider behavior; that is validation, not unresolved design authority.

## Review Decision
**Pass.** SR-009 resolves DR-001 through one backend offered-versus-exact-current authority and concrete DS-07/08 launch/readiness paths, while retaining stopped Save, AutoByteus, provider identity/history and no-migration boundaries.

## Findings
None. DR-001 is resolved in ARCH-REV-003's prior-finding table; it is not silently dropped.

## Classification
N/A — no current failure finding.

## Recommended Recipient
Primary Pass handoff: exact implementation recipient returned by `get_handoff_rules`; then informational Pass to its returned Solution Designer recipient.

## Residual Risks
- Smaller-window provider continuation remains unverified for the full model/history matrix; visible rejection with retained history is the approved boundary.
- Backend current-descriptor, provider snapshots, stopped DTO and generated Web operations must move together. Validate server-origin seeds, Team inheritance/application override, no-sibling Claude, stale catalog and exact-ID Save. Do not mutate E23's user records.
- If the cross-runtime launch-current query is used for workspace-scoped Codex catalog data, implementation should preserve the run environment in lookup/cache keys; current design's Claude-specific recovery does not prove divergent Codex per-workspace catalogs.

## Latest Authoritative Result
- Review Decision: **Pass**.
- Material-Premise Gate: **Pass** — MP-001/002 are supported and have coherent target paths.
- Notes: ARCH-REV-003 reviews SR-009 against SR-006. Prior ARCH-REV-002 Fail is resolved only by the verified revised design. No implementation or tests by reviewer.
