# IR-008 local implementation checks

All commands ran from `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation` against current worktree source, using TESTING.md and package AGENTS; no closer TESTING file. These are implementation checks, not downstream API/E2E or real-provider acceptance.

1. Before correction (new durable regression only):
   `pnpm -C autobyteus-server-ts exec vitest run tests/unit/run-history/services/collaboration-root-history-public-projection.test.ts --no-watch`
   → ir-008-history-before.log, exit1 (2fail/4pass); proves stamped active/stored return mismatch. Original bytes archived before correction.
2. Focused final:
   `pnpm -C autobyteus-server-ts exec vitest run tests/unit/run-history/services/collaboration-root-history-public-projection.test.ts tests/unit/run-history/services/collaboration-root-history-readiness.test.ts tests/unit/services/agent-streaming/collaboration-public-tree-projection.test.ts tests/unit/services/agent-streaming/agent-collaboration-task-lifetime-projection.test.ts --no-watch`
   → ir-008-history-after.log, exit0, 4files35tests.
3. Production source typecheck:
   `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit`
   → ir-008-production-typecheck.log, exit0 (empty successful output), source scope—not complete test typing.
4. Full server build:
   `pnpm -C autobyteus-server-ts run build:full`
   → ir-008-server-build.log, exit0; clean output + compile/assets + sanitized built-module bootstrap. Existing shared dist dependencies reused (unchanged64SDKoutputs); no desktop build/provisioning/new API setup.
5. Offline compiled mixed-facade fixture producer:
   `node tickets/in-progress/project-task-manager-linked-delegation/implementation-evidence/ir-008-history-fixture-producer.mjs`
   → ir-008-history-fixture-producer.log/json and public-only web JSON/provenance fixture, exit0. Uses only archived real API-009 trees/current store/service and captured catalog/active-snapshot seam, no live endpoint/DB/restore/provider/private writes. Private stamps1/4/3, public0, identity/source/ingress positions14/55/44 and persisted bytes exact; active seam is not live runtime acceptance.
6. Frontend family-loading regression and unchanged boundary guard:
   `pnpm -C autobyteus-web test:nuxt stores/__tests__/runHistoryStore.spec.ts tests/integration/web-boundary-guard.integration.test.ts --run`
   → ir-008-web-history.log, exit0 (store45/guard3). KaTeX quirks/Browserslist diagnostics retained. No component/native fixture changes.
7. Full retained selected units (serialized server execution; no simultaneous server suite):
   `bash tickets/in-progress/project-task-manager-linked-delegation/implementation-evidence/ir-008-cumulative-focused-command.sh`
   → ir-008-cumulative-focused.log, exit0, 143pass3skipfiles/1386pass5skiptests. Exact script retains previous selected owners and adds6history+1readiness cases. Three AGY live suites skipped; getThread-missing mock diagnostic/historical limitations not silently removed. Counts overlap focused tests, not summed.
8. Local rendered feedback loop:
   `node tickets/in-progress/project-task-manager-linked-delegation/implementation-evidence/ir-008-org-history-preview.mjs`
   → ir-008-rendered-preview.log and directory evidence.json/screenshots/nuxt.log, final exit0. Own free-port Nuxt dev route and Playwright ephemeral headless Chrome; actual store/load/parser/collection/tree-state, readonly mocked Apollo union metadata/public fixture; unrelated queries and health mocked. Recorded-only open/inspect callbacks; no genuine runtime/HTTP backend/restart/desktop. Desktop1440×960, mobile390×844, definition Enter/root click, delegated Team collapse/expand, refresh private-negative retaining3/recovery/empty/final3. Direct image inspection completed. Final0page/consoleerrors,1Apollo list replacement warning when list emptied; no policy suppression/patch. Browser/Nuxt process/temporary route removed.
   Initial attempt exit1: own cleanup treated signal-only exit as alive and kill ESRCH; original logs/images retained in ir-008-rendered-preview-initial*. Verified exact owned route removed and no owned Nuxt remained. Second attempt controls exit0 but missing mock GraphQL __typename produced12Apolloerrors; retained in ir-008-rendered-preview-metadata-incomplete*. Final metadata corrected only at mock envelope outside org scalar.
9. Audit:
   `python3 tickets/in-progress/project-task-manager-linked-delegation/implementation-evidence/ir-008-finalize-evidence.py`
   + `git diff --check` inside that script → preservation/inventory/size/reference audits and diffcheck exit0. All287 incoming dirty bytes unchanged;5new dirty paths; full snapshot1672 incoming references except six intentional code/build/owned-canonical changes **and two separately reviewer-owned concurrent CRR-014 canonical updates**, no missing; prior record/investigation exact prefixes. StrictDTO/startup/migrations HEADdiff0.

## Explicit non-runs / unchanged non-green evidence
Whole unit suites, API tests, deterministic E2E, native-to-web, wider component selection regressions and real-provider/desktop/product restart acceptance were not run here. Strict TOOL_LOG4fail/1pass, wider historical mocks/unhandled diagnostics, native obsolete factory2fail, selectedNuxt129pass2fail+2unhandled, provider/model/authorization/remote dependency gaps remain per API-REV-009 and CRR-013. No product Pass inferred from this passing selected local package or from preview screenshots. API-owned factory/mock updates and15carried durable paths remain for later owner work and proportional successful-test review.

Final audit initially stopped on two unexpected external canonical hashes; read exact CRR-014 report/history/receipt and CRR-013 archived hash before reconciling only those reviewer-owned updates. CRR-013LocalFix remains, no pause/source acceptance; current assessment references carried without a second notification. No upstream rollback or silent widened hash whitelist.
