# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: /Users/normy/autobyteus_org/autobyteus-worktrees/fix-legacy-docker-workspace-builds/tickets/in-progress/fix-legacy-docker-workspace-builds/requirements-doc.md — R2 Approved.
- Upstream Investigation Notes: /Users/normy/autobyteus_org/autobyteus-worktrees/fix-legacy-docker-workspace-builds/tickets/in-progress/fix-legacy-docker-workspace-builds/investigation-notes.md.
- Upstream Solution Revision Record: /Users/normy/autobyteus_org/autobyteus-worktrees/fix-legacy-docker-workspace-builds/tickets/in-progress/fix-legacy-docker-workspace-builds/solution-revision-record.md.
- Reviewed Design Spec: /Users/normy/autobyteus_org/autobyteus-worktrees/fix-legacy-docker-workspace-builds/tickets/in-progress/fix-legacy-docker-workspace-builds/design-spec.md — D2 Ready.
- Supplemental Task Artifacts Reviewed: usage-investigation.md, solution-handoff.md, and relevant historical BAS-001/UD-002 evidence listed below. All paths resolve from the canonical package unless absolute.
- Relevant Solution Revision IDs: SR-005 (user-approved retirement), SR-006 (replacement design); SR-001..004 reviewed for supersession/history only.
- Architecture Review Revision Record: /Users/normy/autobyteus_org/autobyteus-worktrees/fix-legacy-docker-workspace-builds/tickets/in-progress/fix-legacy-docker-workspace-builds/architecture-review-revision-record.md.
- Current Architecture Review Revision ID: ARCH-REV-001.
- Current Review Round: 1, completed 2026-10-12.
- Trigger: Solution Designer's Medium/High architecture-review handoff for R2/D2.
- Prior Review Round Reviewed: None; no prior canonical result or revision record exists. Superseded D1 was never reviewed.
- Latest Authoritative Round: 1 / ARCH-REV-001. This report is authoritative; a pass is for design readiness, not implementation or delivery.
- Current-State Evidence Basis: independent read-only source inspection at task HEAD `61770d666`, base `2756d7b298ca5b203ebd2310d172b37a5d381b5c`; clean worktree before review-artifact creation. `git diff --name-status <base> HEAD` contains only the six Solution Designer artifacts. No product edits, executable tests, builds, Docker commands, app/API queries, live-node or user-state access were performed during this review.

Authorities: architecture-reviewer skill, its complete design-principles reference and review/revision templates; design-examples Example 9 for reachability discipline; task-root AGENTS.md, DESIGN.md, TESTING.md (the current 196-line task-base version), and autobyteus-server-ts/AGENTS.md. No closer docker/scripts/.github design or agent instructions found. RELEASE.md is Delivery's authority before finalization; no finalization was attempted here.

Independent evidence anchors (paths below are task-worktree-relative):

- AR-EV-001: `git ls-files docker` identifies exactly the nine tracked root-harness files. Scoped `git grep -n -I` for recipe, wrapper, startup, supervisor, seed and service names, excluding historical tickets/test-results, confirms the removal/reference closure. The seed helper's only active repository caller is `scripts/personal-docker.sh:53-63`; its own CLI describes personal Docker fixtures.
- AR-EV-002: `docker/compose.personal-test.yml:1-87`, both legacy recipes, wrapper dispatch `scripts/personal-docker.sh:242-317`, and owned startup/supervisor scripts establish the current allinone/optional remote test path. `docker/allinone-start-web.sh` waits for GraphQL, runs codegen and starts Nuxt dev; this capability is intentionally retired, not claimed as monorepo-equivalent.
- AR-EV-003: `autobyteus-server-ts/docker/Dockerfile.monorepo:15-42,95-120` materializes the three contracts and copies only retained package/runtime assets, not root-harness assets or root seed/wrapper scripts. Lines 47-49 retain the root license payload/OCI label. `build.sh:13-15,53`, `build-multi-arch.sh:4-6`, server Compose `:4-6`, and `docker-start.sh:261-278` show the retained source build/launch path. Release default/zh steps `release-server-docker.yml:171-197` use root context and that same recipe.
- AR-EV-004: retained guide `autobyteus-server-ts/docker/README.md:22-56,205-228` exposes repeated public `new-container` and local-source helper actions. Public Bash `core.sh` declares the published image, explicit launcher/node labels and independent state directory; `commands.sh:220-224` calls `create_new_container`, and `docker-runtime.sh:552-555` selects an indexed node then starts it. Retirement introduces no edits on this path; PowerShell source is also preserved by the design. Prior live inventory is contextual evidence only, not freshly verified here or build proof.
- AR-EV-005: `docker/.gitignore` contains `.runtime/`; root `.dockerignore:18` excludes `docker/.runtime`. Wrapper `:5-9` establishes where its saved env files are owned. Moving this exclusion to root `.gitignore` preserves the approved data-protection contract without keeping a command. No saved-state contents were inspected.
- AR-EV-006: root README `:296-319` is the obsolete startup section; retained guide `:506` advertises the retired recipes. Server README `:483` links to its own retained `docker/README.md`, not root docker. `scripts/tests/test_docker_build_context_sources.py:9-81` contains the obsolete image set, runtime mappings and allinone-only assertion; its parser is reusable. Existing launcher test `:683-688` checks current docs, and other Docker Python suites target monorepo/browser/CLI or fake-Docker behavior, not the retiring recipes.
- AR-EV-007: historical BAS-001 in the attached API/E2E report, UD-002 in the AGPL handoff, retained validation Dockerfile and startup-log tail corroborate defect/fix attribution only. They are not this task's implementation or image validation. `git diff --exit-code <base> HEAD -- autobyteus-server-ts/docker .github/workflows/release-server-docker.yml scripts/public/docker scripts/tests README.md .gitignore .dockerignore package.json pnpm-workspace.yaml pnpm-lock.yaml LICENSE LICENSING.md NOTICE` is empty at review time; the full name-status diff also shows application/package inputs unchanged.

## Routing Classification Review

- Task size: Medium.
- Architectural risk: High.
- Classification rationale reviewed: eleven bounded owned deletions and four existing-file edits within Docker support; material removal of documented deployment/image/command contracts despite unchanged retained runtime.
- Independent Architecture Review required by the classification: Yes.
- Classification evidence or correction required: AR-EV-001..004 confirm the deployment-contract delta. No correction; artifact volume is not the reason for High risk.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: Confirmed.
- Approved requirements / intended behavior understood: explicit user choice to retire both legacy recipes and dedicated personal-test wiring replaces repair. SR-005 records approval and previously explained Nuxt-in-Docker loss. R2 defines the retained monorepo path, licenses and source-only/data-preserving boundary.
- Relevant existing behavior and evidence confirmed: AR-EV-001..007 independently confirm the current callers, supported local-source/published entrypoints, doc/test closure and ignored-state ownership.
- Scope guardrail confirmed: UC-004..006 / SCN-005..008; no compatibility alias, image repair, gateway consolidation, runtime/API/schema/security change, user-resource operation or historical-evidence rewrite.
- Approved change, preserved behavior, and outside scope understood: BEH-005/008 change the supported source/docs/tests; BEH-006/007 remain intact. Local frontend/desktop development is preserved, not rebuilt inside monorepo.
- Every prospective blocking Design Impact finding is traceable to an approved REQ/AC/BEH ID: Yes; no blockers found.
- Remaining material ambiguity: None.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-005 | Operational | Pass | Pass — approved repository support retirement; existing README → personal wrapper → Compose → recipes/startup/seeding, AR-EV-001/002 | Pass — delete complete owned closure and active references, DS-007; REQ-005 / AC-007 | Confirmed | Implement exact tracked removals, not directory/resource cleanup |
| BEH-006 | Operational / Contract | Pass | Pass — developer source-helper up; release tag/manual dispatch; public launcher new-container → indexed published-image node, AR-EV-003/004 | Pass — DS-005/006 construction/runtime and licenses remain unchanged; REQ-006 / AC-008,011 | Confirmed | Verify preserved-input diff and current source/helper checks downstream |
| BEH-007 | Operational | Pass | Pass — approved source-only cleanup while existing state remains user-owned; wrapper saved env ownership and separate current node state, AR-EV-004/005 | Pass — no resource actions/data transformations; root-ignore relocation protects legacy saved files, DS-007; REQ-007 / AC-009 | Confirmed | Relocate exclusion before nested-ignore deletion; never inspect/delete real saved state |
| BEH-008 | Operational | Pass | Pass — maintainers consult current guides/run current source checks, AR-EV-006 | Pass — monorepo-only supported set plus bounded absence/entrypath/ignore guards, DS-007; REQ-008 / AC-010,011 | Confirmed | Keep historical and intentional guard/exclusion mentions; validate mutations on fixtures |

## Supplemental Artifact Coherence Verdict

The canonical investigation inventory is distributed across its initial inventory, supplement addendum and U/R/AR updates; core requirements/design and the absolute handoff inventory consistently identify current approval applicability. Early hold/repair sections are explicitly historical, not competing current authority.

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| usage-investigation.md | Pass | Pass | Pass | Pass | Pass — factual decision brief; approved-outcome header/end supersede historical hold | None |
| solution-handoff.md | Pass | Pass | Pass | Pass | Pass — R2/D2/SR-006; final verification remains pending | None |
| Attached historical API/E2E report at `/Users/normy/.autobyteus/server-data/projects/project_a1377344-25db-482a-97cc-ecfdb0fb495a/tasks/project_task_b2b611bb-9a5d-49da-b1dc-fc1c8f80d42a/context/ctx_a978bb610209__api-e2e-execution-coverage-report.md` | Pass — BAS-001 attribution | Pass | Pass for relevant scope | Pass | Pass — historical external-owner evidence, not fresh validation | Preserve unchanged |
| `tickets/done/remove-autobyteus-remote-provider/api-e2e-evidence/docker/{Dockerfile.remote-server.validation,container.log}` | Pass — prior fix shape/startup evidence | Pass | Pass for relevant scope | Pass | Pass — retained historical evidence, not supported product recipe | Preserve unchanged |
| `tickets/done/agpl-dual-licensing-slice-2/{implementation-handoff.md,api-e2e-execution-coverage-report.md}` | Pass — UD-002/license context | Pass | Pass for relevant scope | Pass | Pass — historical, not current image proof or legal-policy authority | Preserve unchanged |

No normative supplement or Product/UI artifact applies.

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | D2 identifies approved support cleanup, not the superseded repair | None |
| Root-cause classification is explicit and evidence-backed | Pass | Legacy Or Compatibility Pressure; broken duplicate recipes and obsolete current support expectations, AR-EV-001/002/006/007 | None |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Bounded clean-cut retirement needed now; no app-runtime refactor | None |
| Refactor decision is supported by concrete design or residual-risk rationale | Pass | Eleven explicit deletes, ignore relocation, current docs/test changes, preserved owner paths and re-audit on integration | None |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | Ownership Is Clear? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-005 | Local-source developer → helper/build → root-context monorepo → runtime → backend/mobile/browser/CLI | Pass | Pass | Pass — helpers orchestrate existing recipe/runtime owners | Pass | Pass | Pass | Pass |
| DS-006 | Release event → metadata/build/push → published image → public launcher → remote backend use | Pass | Pass | Pass — release/launcher/runtime roles remain separate | Pass | Pass | Pass | Pass |
| DS-007 | Approved retirement → exact source edits → docs/checks → retained entrypaths/protected state | Pass | Pass | N/A — repository change/verification, not new runtime facade | Pass | Pass | Pass | Pass |

Return/event and bounded local spines: N/A to this delta; no async/runtime sequencing is introduced or modified.

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Retained server construction/runtime | Pass | Pass | Pass | Pass | Existing source helper/Compose, recipe and package-local startup stay intact; no root-harness dependency |
| Public node lifecycle | Pass | Pass | Pass | Pass | Published launcher retains image/node selectors and external state; no retirement hook crosses into management |
| Retired harness/source cleanup | Pass | Pass | Pass | Pass | Entire closure removed; no aliases or replacement under old Compose identities |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Retained construction and launcher | Pass | Pass | Pass | Pass | Local/release build → monorepo; launcher → published image; removed assets absent from required inputs |
| Source retirement and verification | Pass | Pass | Pass | Pass | Explicit tracked edits/fixtures only; no global resource operations, live-node tests, blind relative-link replacement or historical rewrites |

## Interface Boundary Verdict

| Interface / Command | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| Server docker-start.sh, build.sh/build-multi-arch.sh, retained Compose/release | Pass | Pass | Pass — existing project/image/variant choices | Low | Pass |
| Public autobyteus-docker new-container and existing management commands | Pass | Pass | Pass — indexed managed node and image refs unchanged | Low | Pass |
| Personal wrapper/Compose/recipes | Pass | Pass | Pass — explicitly retired subject | Low | Pass |

No new API, query, shared selector or data-transfer contract.

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Supported construction/remote nodes | Pass | Pass | N/A | Pass | Preserve existing monorepo helpers/pipeline/launcher; no replacement framework |
| Source/retirement guards | Pass | Pass | Pass | Pass | Extend existing Python source-test owner with bounded explicit checks, retain its parser |
| Saved-state exclusion | Pass | Pass | Pass | Pass | Exact exclusion moved to root ignore; no lifecycle service or migration |

## Subsystem / Capability-Area Allocation Verdict

| Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Docker construction/runtime and public launcher | Pass | Pass | Pass | Pass | Existing owners unchanged; root harness decommissioned |
| Current docs/source tests/root exclusion | Pass | Pass | Pass | Pass | Existing repository owners absorb focused changes; no new subsystem |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Docker instruction parsing and test mappings | Pass | Pass | Pass | Pass | Keep existing logical_instructions/direct_copy_sources/copy_tokens; shrink obsolete mappings; no graph framework |

## Shared Structure / Data Model Tightness Verdict

N/A — no shared DTO/type/schema/model delta. Supported-image set becomes one recipe; obsolete variants are deleted, not represented through optional fields or parallel policy.

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Matches Intended Owner/Boundary? | Re-Tightened After Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Nine tracked root docker files + personal wrapper/seed helper | Pass | Pass | N/A | Pass | Explicit removal of dedicated harness closure |
| Root .gitignore | Pass | Pass | N/A | Pass | Preserve exact docker/.runtime/ exclusion |
| Root README.md and server Docker README.md | Pass | Pass | N/A | Pass | Remove obsolete commands/recipe claims, retain source/public guides and package-relative links |
| scripts/tests/test_docker_build_context_sources.py | Pass | Pass | N/A | Pass | Monorepo materialization checks plus focused retirement/entrypath/ignore assertions |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Root harness tracked paths | Pass | Pass | Low | Pass | Deleted without sweeping untracked directory contents |
| Root ignore/docs and existing scripts/tests | Pass | Pass | Low | Pass | No new folders/modules; saved-state rule has repo-wide owner after nested-ignore removal |
| Retained server/docker and public launcher | Pass | Pass | Low | Pass | Keep natural package/runtime boundary, not root legacy naming |

## Removal / Decommission Completeness Verdict

| Item / Area | Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| docker/Dockerfile.allinone; docker/Dockerfile.remote-server | Pass | Pass | Pass | Pass | Reachable documented support is retired by approval, not mislabeled already-dead |
| docker/compose.personal-test.yml; scripts/personal-docker.sh | Pass | Pass | Pass | Pass | Entire personal command/Compose path retired; retained helpers/launcher unchanged |
| docker/allinone-start-server.sh; docker/allinone-start-web.sh; docker/remote-server-entrypoint.sh; docker/supervisor-allinone.conf | Pass | N/A | Pass | Pass | Only retiring recipes/supervisor consume these; become dead after approved parent removal |
| scripts/seed-personal-test-fixtures.py | Pass | N/A | Pass | Pass | Sole active caller is wrapper; its dedicated personal fixture action ends with that harness |
| docker/README.md; docker/.gitignore | Pass | Pass | Pass | Pass | Retained server guide owns support; root ignore owns saved-state exclusion before nested file removal |
| Current README/guide and source-test old expectations | Pass | Pass | Pass | Pass | Exact cleanup named; historical/guard/protective mentions explicitly distinguished |

AR-EV-001/002/006 establish reachability/removal ownership, including script/config entrypoints. No additional dead code found in the reviewed touched source closure; no compiler/linter applicability to shell/YAML/Markdown source retirement. Re-audit any new consumer on refreshed integration base.

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Personal harness target | No | Pass | Pass | No alias, stub, fallback recipe or repointed old Compose service |
| Saved-state exclusions/historical records | No | Pass | Pass | Data protection/evidence are not executable legacy support |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Reader / Semantic / Invariant Evidence Is Sufficient? | Choice Is Proportionate? | Migration Safety Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Existing node volumes/profiles/workspaces, legacy saved env files | Not Affected | Pass | Pass | N/A | Pass | No schema/read/write/volume/identity changes or operations; repository source deletion does not destroy external resources. Exact Git/Docker exclusions remain; no migration/import/reset is warranted |

Application-data migration guideline checklist is N/A because no persisted app data is changed. No access to representative user records is necessary to justify unchanged readers/layout and an explicit no-resource-operation boundary.

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Ignore relocation → tracked deletion → docs/tests → verification | Pass | Pass — no compatibility seam; move exclusion first | Pass | Pass |
| Integration/finalization | Pass | Pass — refreshed-base consumer audit and scope-recovery gate | Pass — isolated finalization/Delivery verification remain downstream | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Present And Clear? | Avoided Shape Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Test-policy/source-helper/ignore boundary | Yes | Pass | Pass | Pass | D2 gives supported singleton set, existing up --build-local command, exact exclusions and fixture-only mutation shape; rejects global scanner/aliases/resource cleanup |
| Novel runtime design | No | N/A | N/A | Pass | No novel runtime structure to illustrate |

## Material Premise Validation (Only When Needed)

None. All material choices follow established SCN-005..008 / BEH-005..008 and approved preservation contracts. No additional failure/lifecycle assumption, speculative machinery, global non-use inference or hypothetical edge case drives this result. Preserving exclusions is required by REQ-007 even without proof of saved files on this machine; local absence does not authorize data deletion.

## Unresolved Approved-Behavior Or Current-State Gaps

None at the reviewed base. Moving-base consumer changes are a downstream integration audit, not a present evidence gap.

## Review Decision

Pass — R2/D2 is actionable, behavior-grounded and ready for implementation; no in-scope mechanism or finding rests on an unsupported premise.

## Findings

None.

## Classification

N/A — Pass, no failure-origin classification. Routing remains Medium/High / independent review.

## Recommended Recipient

Primary implementation handoff: /software_engineering_team/implementation_engineer, per returned architecture-pass rule. The skill-defined informational pass condition is only applicable after successful primary handoff; it is not another implementation dispatch.

## Residual Risks

- Approved support loss includes Nuxt-in-Docker, automatic personal fixtures and lightweight ephemeral test nodes. Retained monorepo is sufficient for approved current server roles, not an exact replacement of those retired capabilities. No replacement/shim required.
- Other users may retain old saved state/resources. Preserve it without migration or cleanup; this review does not certify global non-use.
- New consumers may appear on moving personal. Re-audit at integration; material shared consumer/build/runtime change returns to Solution Designer instead of silently extending deletion scope.
- Source/fake-Docker/fixture checks prove this retirement boundary, not a newly built image. Downstream must execute the focused checks and retained-input diff; no fresh build/start is claimed here. If retained construction/runtime inputs change or depend on a removed asset, recover the design and obtain actual current-image proof as revised scope requires.
- Historical gateway defects and unrelated product/baseline work remain outside this retirement. Do not erase their reports or claim they were repaired.

## Latest Authoritative Result

- Review Decision: Pass.
- Material-Premise Gate: Pass.
- Notes: ARCH-REV-001 / SR-005, SR-006 / R2, D2. Design review only; implementation, independent executable validation, explicit user delivery verification and isolated merge/push remain required. No retired-image builds, live user-node checks or paid provider calls are prerequisites for this source-only design.
