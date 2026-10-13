# Retained Baseline Work Handover — separate follow-up, not dispatched

## Task / Scope Linkage
- Follow-up confirmed by Task Manager via Solution Designer: project_task_6b9ce371-7593-42d7-9d20-3c637512830a, Fix Agent/Org creation cache field completeness, TODO / not dispatched.
- Original UI Task: project_task_7fd4b73e-075b-464c-b313-bbbd59f45797, agent-team-members-after-description, IN_PROGRESS.
- Source scope authority: /Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-members-after-description/tickets/in-progress/agent-team-members-after-description/scope-separation-handoff.md, SR-003; user direction / CRR-002.
- API-F001/API-F002 remain unresolved confirmed pre-existing defects, outside R1 UI acceptance. This manifest preserves already-prepared work; no new fix/review/build/implementation dispatch for the follow-up is authorized.

## Durable Retrieval / Integrity
- Repository/worktree of origin: /Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-members-after-description; common repository local ref is usable from any linked worktree.
- Retained branch: preserve/agent-definition-cache-fix-d8bac59860.
- Exact unreviewed prepared commit: d8bac598606001b702e300eeaeefe06c3caf0d3d.
- Exact parent: ba869880e7ecc49fdd1c31b27a5f144ba5a7da98. Its ancestry includes original regression/evidence commitb6b514f2309ed5d498e1270bd4f43cba66a6bbef.
- Original bootstrap base73f743211c8b86c704acb33f216154e42b7a67b8; UI integrated basef13bdd0eb79aacc63dffa5995b9c86f359001468; original desktop build59a5bd76de232b9bdd05c369d53e3586178d789d.
- Durable exports already committed in ccf7143cb5ccbb9dc6ee147c822417e31ad7a71e:
  - /Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-members-after-description/tickets/in-progress/agent-team-members-after-description/implementation-fix-02/baseline-fix-d8bac59860.patch.gz; SHA256 cba06b15a3313885f6dea7bce49dc02edc8e161c8dbea02b129d9ffac8fc019d.
  - /Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-members-after-description/tickets/in-progress/agent-team-members-after-description/implementation-fix-02/follow-up-cache-regression.spec.ts; SHA256 c0ed8fa6a41cf029cd54c4b650bca2dc3c01c6b2ca7467e22bdada36bb562067.
- Patch is verbatim format-patch compressed deterministically; decompress with gzip -dc <absolute patch path>. Git show <retained branch>:autobyteus-web/stores/__tests__/definitionMutationCache.spec.ts retrieves the exact complete four-case test. Git show d8bac598606001b702e300eeaeefe06c3caf0d3d retrieves source/test delta. Do not change/move a shared published tag; this is an unpublished local preservation ref, no release.
- For Task context attachment, copy THIS manifest plus the compressed patch and full spec (not only filesystem links) so follow-up retrieval does not depend on keeping this UI worktree.
- Fresh follow-up base may lack the original API-added regression. Do not assume blind cherry-pick applies: the full spec export supplies the complete fixture/test, whereas patch modifies the parent file. Normal follow-up investigation/review must decide integration.
- Keep the retained branch until Task Manager/owner acknowledges durable artifact transfer. No new worktree or delegated implementation has been started.

## Exact Prepared Delta / State
- autobyteus-web/graphql/mutations/agentDefinitionMutations.ts: select existing list-required loadIssue subfields code/reason/definitionPath/packageRoot in create/update fragment.
- autobyteus-web/graphql/mutations/agentOrgDefinitionMutations.ts: select existing list-required loadIssues subfields kind/definitionId/name/code/reason/definitionPath/packageRoot/usingLastGood in create/update fragment.
- autobyteus-web/stores/__tests__/definitionMutationCache.spec.ts: real stores/Apollo/InMemoryCache plus AST-selected response double; original Agent/Org create cases and added ordinary edit response/cache/reread cases. No fixture supplying unselected fields, production error suppression or migration/recovery framework.
- No reviewer Pass of this prepared work; no actual corrected desktop creation run, deployment or defect closure.
- User-stop separation: revert09731dcd140a08e5bdab6e0889d54aaaf2812f22 restores ONLY these three paths to pre-fix source. Complete exclusion of standalone baseline-only regression from active UI package is the next targeted source/test transfer operation under SR-003; preservation above exists before exclusion.

## Evidence / Reproduction (Historical, Not New Pass)
- Technical authority: /Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-members-after-description/tickets/in-progress/agent-team-members-after-description/code-review-report.md and code-review-revision-record.md, CRR-001/002.
- Raw real-backend UI creation errors: /Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-members-after-description/tickets/in-progress/agent-team-members-after-description/api-desktop-01/failure-summary.json, e02-create-coordinator.json, e02-create-other-members.json, e04-org-roundtrip.json: six Agent loadIssue and one Org loadIssues Apollo13 event. Creations persisted; no data-loss finding.
- Original durable reproduction command: pnpm -C autobyteus-web test:nuxt stores/__tests__/definitionMutationCache.spec.ts stores/__tests__/agentDefinitionStore.spec.ts --run.
- Original valid result: two precise failures/five pass; /Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-members-after-description/tickets/in-progress/agent-team-members-after-description/code-review-01/failure-recheck.log and /Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-members-after-description/tickets/in-progress/agent-team-members-after-description/implementation-fix-02/before-fix.log. Current UI source restores that baseline, not a fixed result.
- Pre-stop prepared-fix checks: /Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-members-after-description/tickets/in-progress/agent-team-members-after-description/implementation-fix-02/create-after-fix.log (7 pass), focused-checks.log (9 suites/61 pass), update-regression-old-fields.log (4 expected failures on original fields), restored-fix.log (9 pass), self-review.json. These apply ONLY to withdrawn prepared commit, not current UI source or independent review.
- Full API authorities: /Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-members-after-description/tickets/in-progress/agent-team-members-after-description/api-e2e-execution-coverage-report.md / api-e2e-revision-record.md (historical API-REV-002 full-product Fail retained), api-e2e-coverage-investigation.md / api-e2e-test-case-ledger.md.
- Original supplements: three original Task-context screenshot paths in investigation-notes.md E001 inventory remain UI context, not bug-fix approval.

## Required Future Workflow / Limits
Follow-up stays TODO/not dispatched. Its eventual approved package must retain causal/scenario proof, validate selected-response cache semantics and create/update/scoped paths, obtain applicable source review, and perform a NEW source-current isolated app/actual UI creation validation; old asar cannot validate corrected mutation source. No paid inference needed. Do not use user app/data; retain isolated cleanup.
Original iso-52535-8486 is stopped/cleaned; api-desktop-01/isolated-stop.json and cleanup-check.json record forced=true and released ports/root/record/group. No live resource is transferred.
UI ticket receives a NEW truthful scoped API disposition after source/test exclusion; historical broader failure is not erased or converted to Pass. Human app acceptance, release agreement, finalization and cleanup remain Delivery-owned.

## Completed UI Exclusion / Transfer Receipt
- After this handover was committed in cf53160698, source/test exclusion completed in cf18b16f46230d20bc2c1d8c1c19f7fc81bb8b71: original standalone baseline-cache regression removed from active UI test package. Previously prepared mutation correction was already reverted in09731dcd14.
- GraphQL and store source/test net delta versus integrated basef13bdd0eb79aacc63dffa5995b9c86f359001468 is now empty; the full regression remains preserved in committed exports and retained d8 branch, not silently skipped.
- Current authority/receipt: implementation-handoff.md / IR-004 and implementation-ui-separation.json in this ticket. R1-only five-suite local check passes40 tests; no baseline defect resolution or new broader API Pass follows from that result.
- Process follow-up project_task_4c7b3e0e-9edb-45da-914c-ce22c9a999c4 is distinct/TODO/not dispatched; this cache-work handover belongs only to project_task_6b9ce371-7593-42d7-9d20-3c637512830a.
