# Code Review Report

## Latest Complete Result — CRR-002

- **Entry point:** focused API/E2E failure-origin review, triggered by API-REV-002 Fail. Not successful-test review or a repeated full source audit.
- **Outcome: Fail — Design Impact; upstream scoped recovery required.** API-F001 is a composition-boundary conflict, not evidence of product data loss. Do not whitelist the extra constructor simply to pass.
- **Prior finding CR-F001: Resolved**, on the current uncommitted 33-line test correction and API-REV-002 execution evidence.
- **Classification:** Large / High unchanged. SR-005 / ARCH-REV-001 / IR-002 / API-REV-002; DR-003 remains basis-limited history.
- **Candidate:** HEAD `a727971dabab141a39404a00ca6f7db46696f0b9`, integrated base `b0b077b02571098a6bf7993ab46b67a69fdb8f9d`, plus the test-only correction. Incoming local/untracked artifacts preserved.
- **Release:** not ready. Failed architecture gate and deferred current desktop/full-product and old-writer replay remain. No delivery handoff or successful proportional test review has occurred.
- **Scope/score:** bounded failure-origin review; no new source scorecard or speculative deduction. CRR-001's 94/100 is historical, not current acceptance. Its complete report is retained at `code-review-evidence/crr002/prior-code-review-report-CRR001.md`.

All relative paths below are worktree-relative unless they are explicitly ticket evidence paths. Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-mcp-tool-call-presentation`.

## Evidence And Failure Validity

Reviewed current requirements/design and cumulative handoffs; API report, revision, coverage/ledger, exact correction and logs; both failing guards and relevant host/catalog/admission paths; independent provider-composition, host-definition and collaborator design contracts. Reviewer independently confirms both guards and collaborator catalog are byte-identical to the integrated base (`code-review-evidence/crr002/reviewer-provenance.json`). Catalog last changed in `33b0d1eef` (SR-010 collaborators); its two definition getter calls predate that constructor addition. This is provenance, not a baseline suite execution or waiver.

API's full unit/architecture run: **4126 pass / 2 fail / 6 skip**. Its focused reproduction: **32 pass / 2 fail**. Exact command:

```sh
pnpm -C autobyteus-server-ts exec vitest run tests/architecture/agent-provider-composition-boundaries.test.ts tests/architecture/application-framework-boundaries.test.ts --no-watch
```

- `agent-provider-composition-boundaries.test.ts:573–581` expects precisely the Studio and standalone host constructor roots; finds a third in `collaborator-definition-catalog.ts:38`.
- `application-framework-boundaries.test.ts:2995` expects 26 enumerated definition singleton reads; finds 28, with two extra at the same catalog's lines 36–37.
- Existing logs reproduce exact source-derived differences, not an environment or assertion-execution problem. Reviewer did not redundantly rerun these static checks or the successful migration suite.

## Supported Scenario / Candidate Gate

### CG-005 — Promote: host-owned validation composition conflict → API-F001

**Independent engineering contract:** `tickets/done/explicit-agent-provider-composition-and-scope-assembly/provider-composition-transition-inventory.md:7–18,479` makes host-selected catalog/validator identity normative and forbids a leaf catalog getter/second validator policy; its design-spec:636 requires host-selected propagation and source-derived constructor sets. Historical names there are ModelConfigValidationService/RunModelConfigValidator; current hosts and the maintained guard use RunModelSelectionService/RunModelSelectionValidator. The newer `tickets/done/cross-scope-agent-mentions/design-spec.md:425–427` independently requires collaborators to stay port-based, receiving RunModelSelectionValidator and allocators as injected ports. That design does not document an exception authorizing a third lazy model-validator construction root.

**Supported Normal Scenario:** a user adds an available collaborator through the normal `@` menu and Send in a live standalone Agent, Team or Org run. Collaborator design SR-010 DS-001/REQ-008 establishes runnability validation before allocation/commit; no contrived timing or concurrency premise is needed.

**Forward path and lifecycle:** live root → GraphQL `collaboratorMentionCandidates` (`src/api/graphql/types/agent-run-collaboration.ts:71–79`) → catalog getter for policy. On Send, `agent-run-command-coordinator.ts:130`, Team stream handler:176, Org handler:127 or collaboration handler:117 → root operation gate → corresponding collaborator owner (`agent-run-collaboration-collaborators.ts:58`, `team-run-collaborators.ts:61`, `agent-org-run-collaborators.ts:62`) → default `getCollaboratorMentionAdmission()` → admission plan → `CollaboratorRunnabilityValidator.validate` before allocation/write. The catalog's processAdmission initializes lazily and supplies `new RunModelSelectionService(getModelCatalogService())`, rather than the validator selected in `build-studio-server.ts:213` / `start-standalone-application-host.ts:255` and propagated to execution roots.

**Evidenced consequence:** collaborator validation has a separate construction/selection authority, outside the established host composition and its identity propagation. The valid architecture guard detects this structural conflict. No incorrect model decision, duplicate catalog instance, corruption, stale-cache runtime failure, or cross-host race is claimed. The extra service is currently constructed from the process catalog; that does not establish the required host-selected validator identity.

### CG-006 — Hold separate defect attribution: the two definition getters

Independent host-definition contract: `tickets/done/universal-application-framework-latest-personal-integration/design-spec.md:466–487` assigns binding/lifecycle to HostDefinitionServices, explicit definitions to run owners and configured registration to public GraphQL; it also explicitly permits retained general non-GraphQL process getters bound to the canonical services. The new collaborator catalog serves both GraphQL and root admission. Its exact allowance/assembly boundary is not resolved by the count 26 versus 28 alone.

The two calls unquestionably cause the second guard failure. They **do not alone prove duplicate definition services, corrupt state or a separate product defect**. No independent finding or deduction is made for those outcomes. Reconcile their intended ownership alongside the confirmed validator conflict in scoped design recovery; no speculative machinery or blind list update is prescribed.

## API-F001 — P2 Structural Composition Conflict / Design Impact

Primary location: `autobyteus-server-ts/src/agent-collaboration/collaborators/collaborator-definition-catalog.ts:31–38`.

Origin: integrated-base source composition conflicting with a retained engineering contract, not an AGY projection/migration regression, not test flakiness, and not an implementation change after CRR-001. The newer collaborator design establishes injected ports but does not resolve its process composition/lifecycle with the host-owned validator. Current SR-005 has no approved corrective design for this separate ownership boundary.

**Owner: Solution Designer.** REQ-010/011, AC-012/013 and design-spec:260,273 require new defects or ambiguous contract outcomes outside REQ-008/009 to return for scope/design recovery. This makes Design Impact more specific than handing an unapproved cross-root production refactor directly to implementation. Confirm the minimal ownership integration, reconcile both guards against that authority, and obtain renewed approval for any changed intended behavior. Preserve existing collaborator admission semantics; do not weaken runnability checks or independently invent a lifecycle strategy here.

**Earlier review attribution:** CRR-001 reviewed 11 cumulatively changed implementation paths and selected tests. This catalog and the two architecture guards were unchanged against the integrated base and outside those changed-source paths; full unit/architecture acceptance was explicitly still outstanding. The catalog constructor is statically detectable in a repository-wide composition audit; the earlier selected pass is not evidence that this guard passed. No misattribution to an AGY source defect and no claim that every newly executed baseline failure is a reviewer/runtime regression. CRR-001 already remained Fail for the independent test gap.

## CR-F001 Resolution

**Resolved on this candidate.** Reviewed `tests/e2e/app-data-migrations/team-run-v1-production-upgrade.e2e.test.ts:837–869` and fixture:350–393. `assertConvertedPackage` now reads `agent_org_task_delegation_records.json` and asserts complete equality for schema/Org identity, accepted record, delegator/recipient/task identity, description, references, submission/review linkage and timestamps. Expectations remain independently specified, not computed by production conversion. This matches the historical preservation contract and the cutover's `records: teamTasks.records` at `src/app-data-migrations/migrations/agent-org-flat-team-families-v1/agent-org-flat-team-families-v1-app-data-migration.ts:159–169`.

API evidence `api-e2e-evidence/api-rev-002/migration.log` shows fresh built-server **5/5 pass**; full deterministic E2E also passes this file. The helper is exercised through initial/retry/relaunch conversion, not only a V2→Org unit fixture. Correction only adds the 33-line assertion; no production edits, weakening or skips. This closes the narrow coverage finding, not the entire acceptance package. Successful API/E2E must still return for the applicable proportional test review.

## Remaining Validation / Routing

Credit current API evidence without inflating it: integration 318 pass/64 skip; deterministic E2E 238 pass/133 skip; fake AGY 9/9; live AGY 3 pass/1 skip; renderer live/reload/stop-reopen Pass; historical repair cohort 287 pass across 47 files. Skip inventories/limitations stay authoritative in API-REV-002. Required current isolated desktop/full-product TC-013 and old-base-writer replay remain Not Tested/deferred, not waived or environmentally Blocked. User verification/delivery freshness remain downstream gates.

After scoped recovery: retain Large/High and cumulative artifacts; review affected implementation if changed; rerun failed guards and required affected/full validation under a resolved candidate; complete deferred realistic checks; obtain proportional test review before Delivery. No release authorization.

Selected route: **Design Impact → `/solution_designer`** under the returned upstream revision rule. Only that outcome recipient is notified; the resolved CR-F001 does not trigger a duplicate API handoff while API-F001 controls the package. Cumulative incoming package plus this report/revision and independent contract evidence accompany the handoff. No source/test edits, new test execution, fetch, commit, push, release or destructive cleanup by reviewer this round.

Handoff receipt: **DELIVERED** to `/solution_designer`, run `solution_designer_0bd89e0c429a4c8a899edd2c41b30ea0`, with cumulative package and CRR-002. No second recipient notified.
