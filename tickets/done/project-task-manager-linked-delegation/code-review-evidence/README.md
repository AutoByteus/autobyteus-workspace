# CRR-001 evidence / execution boundaries

This section is historical initial-review evidence. Current source result is **CRR-002 / Pass**; its independent checks are recorded below. Prior assertion-of-defect probes are not current acceptance tests.

Date 2026-10-03. Evidence-only reviewer probes; **not durable acceptance tests**, no production/test fixes. Approved scenarios and forward product paths are established independently in the canonical report before these probes. All production code/test/template files were preserved.

## Inventory

- `source-audit.md`: independently enumerates all 131 dirty changed/new implementation files/templates. Includes conservative comment-only-excluded effective count and whole-new-file delta; 61 implementation tests/fixtures excluded from size limits.
- `package-fingerprints.tsv`: SHA256 of the 131 source and 61 test/fixture files at inspection, checked again after probes. Ticket evidence is not implementation source. HEAD/base806907faeb567d2b703e10fe984fcd01be0b41fd; 156 tracked changes.
- `production-typecheck.log`: command below exit0, no diagnostics.
- `diffcheck.log`: command below exit0, no diagnostics.
- `cleanup-witness.test.ts`: evidence probe intended to be **temporarily copied** to `autobyteus-server-ts/tests/unit/reviewer/cleanup-witness.test.ts`, so its relative imports address the production source and existing fixtures. It is not left in the server test tree.
- `cleanup-witness.log`: final exact run, exit0, two assertions-of-defect witnesses passed. First authentic local nested-child quiet shutdown → coordinator-only restore → DONE exact release gives parent released, child pending; retry requests **only the outstanding child** and stays pending; controlled active runtimes empty and root active. Second actual private Team preparation/control release holds first abort, shows only first cleanup initiated, then second starts after first drain.
- `cleanup-witness-initial-config-failure.log`: reviewer temporary config initially omitted repository tsconfig paths; no tests ran. `cleanup-witness-fixture-failure.log`: reviewer attempted to modify frozen projection and replaced a facade method rather than its fixture's closed-over constructor callback. `cleanup-witness-assertion-failure.log`: reviewer incorrectly asserted exact result without the valid displayName/agentRunId fields. `cleanup-witness-source-fixture-failure.log`: reviewer initially omitted the saved Team source snapshot used by exact ingress projection. These are reviewer probe construction/assertion faults, corrected **only in the evidence script**, not implementation defects or product results. Latest log alone is the completed witness result.

## Reviewer commands

From the worktree:

```sh
pnpm -C autobyteus-server-ts exec tsc --noEmit -p tsconfig.build.json
# exit0; production-typecheck.log empty

git diff --check
# exit0; diffcheck.log empty
```

For the evidence probe, from `autobyteus-server-ts`, copy the evidence file to the temporary test path above; write temporary `reviewer-vitest.config.mts`:

```ts
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
export default defineConfig({
  plugins: [tsconfigPaths({ projects: ['./tsconfig.json'] })],
  server: { deps: { inline: ['repository_prisma'] } },
  test: { environment: 'node',
    include: ['tests/unit/reviewer/cleanup-witness.test.ts'],
    fileParallelism: false, pool: 'forks' },
});
```

```sh
pnpm exec vitest run --no-watch --config reviewer-vitest.config.mts
# final exit0, 1 file/2 witnesses passed; temporary test/config removed afterward
```

This config intentionally omits global/setup Prisma reset: probes do not use a database. Only provider construction/physical liveness and closed business-port boundary are controlled; factory, handles/registries, quiet shutdown, subject adapter restore, exact release and neutral scope are production implementations. Original preparation controls are supplied through the root-registration observation surface. Source snapshots use current production projection; no stored user data was mutated. No real model, provider process, SDK child or desktop app was started by reviewer. Tests do not claim actual-provider cleanup, Manager journey or all-three-concrete-root executable acceptance. Initial AppConfig location logging does not certify or mutate a user profile. No global Stop, converter/replay or released migration change occurred.

Both tests pass because they intentionally confirm the current defective behavior. Implementation-owned durable regressions must instead assert the corrected approved outcomes, retain negative scopes and failed-receipt truth, and return for source review before independent API/E2E.


# CRR-002 evidence / independent source re-review boundaries

Date 2026-10-03. Current canonical source review **Pass**, CRF-001/002 resolved at source level. Full cumulative package and approved scenarios retained; no production or durable test fixes by reviewer.

## Independent preservation and source audit

- `crr-002-package-fingerprints.tsv`: current 195 implementation-source/template/test/fixture hashes, not ticket/generated files.
- `crr-002-package-comparison.json`: independently compared with CRR-001 manifest: 187 unchanged, four source plus one test modified, three test/fixture additions, zero missing, zero disagreement with implementation's current manifest. Branch/HEAD/base unchanged.
- `crr-002-source-audit.md`: independent full 131-source count/delta inventory, max489 effective/max499 raw nonempty; all below500; prior cumulative >220 Manager299/CodexClientManager232 reviewed evidence preserved, no new local correction >220. Tests/fixtures (64) excluded from thresholds.
- Unaffected full-package review evidence reused only after hashes matched; complete four corrected source bodies, affected registration/quiet/terminal/restore/provider-proof paths and changed/new tests reviewed independently. No new unsupported scenario or broader machinery prescribed.

## Exact reviewer commands / current results

From the assigned worktree:

```sh
pnpm -C autobyteus-server-ts exec vitest run --no-watch \
  tests/unit/agent-collaboration/task-lifetime-tree-scope.test.ts \
  tests/unit/agent-collaboration/task-lifetime-quiet-generation.test.ts \
  tests/unit/agent-team-execution/flat-team-private-release-independence.test.ts
# exit0; 3 files/24 tests passed; crr-002-corrections.log

pnpm -C autobyteus-server-ts exec tsc --noEmit -p tsconfig.build.json
# exit0; crr-002-production-typecheck.log empty

git diff --check
# exit0; crr-002-diffcheck.log empty
```

Unlike the CRR-001 evidence-only config, this uses the **default repository Vitest setup**, which applies/reset migrations in the worktree-owned `autobyteus-server-ts/tests/.tmp/autobyteus-server-test.db`. No user profile DB/data, released migration source, shared checkout, running app/server/provider or real model touched. No temporary reviewer test/config created this round; no broad-suite rerun claimed.

- Quiet-generation suite: actual local factory/registries/quiet and three subject adapters/neutral scope; two legitimate coordinator-only follow-ups, nested Agent/Team/grandchild, actual current restored failed cleanup and exact retry/idempotence, separately root-hosted helper/protected A/B/borrowed/Manager scope, unchanged tree. Negative exact proof cases establish fresh-history/unknown/foreign placement cannot use absence as terminal proof. Provider Manager candidate, physical stop and closed business port remain controlled. Root registered controls observed through fixture surface, not a full business status/API journey.
- Private release suite: actual private factory/manager/planner/controls; second acquired member abort starts before first held abort settles, including failing first/rejecting second and actual second binding failure after acquisition; exact callback retry, success idempotence/no publication/reacquisition. Controlled callback timings are ordering witnesses, not live-provider deadlines.
- Tests confirm consequences of independently approved reachable scenarios; they do not establish scenario validity themselves. Source review is not provider-backed Manager/root/native-MCP/desktop acceptance.
- Supplied expanded IR-004 logs and earlier non-green audit/migration logs were inspected, not independently rerun wholesale; counts overlap. Current source Pass preserves those limitations and all downstream API/E2E/Delivery gates.

- Final post-check implementation preservation: `crr-002-final-preservation-check.json`, **195/195 unchanged** against current reviewer manifest. Initial verifier inferred TSV column order from string length and misread three 64-character paths; corrected to explicit path→SHA256 parsing, without changing implementation. This was a verifier construction fault, not missing package files or a product defect.


# CRR-003 focused failure-origin diagnostics

Current entry point is failed API/E2E origin/disposition, **not successful-test review**. See canonical report/CRR-003 for complete independent scenario/contract paths before attribution. Reviewer only wrote ticket evidence/reports; source/tests retained.

- `crr-003-preservation.json`: independently195/195 reviewed implementation files unchanged; HEAD/base unchanged.
- `crr-003-unchanged-failure-authorities.diff`: empty HEAD diff for four failing tests, released migrations, Prisma/startup and both entry owners.
- `crr-003-schema-prerequisite-probe.mjs` / `.log`: real installed Prisma DMMF matches checked-in required column; test-selected seven released SQL files omit it, real query P2022; existing Sept23 SQL expansion adds it and same-client empty read succeeds. Scratch only; not full conversion/rollback/retry/freelist proof.
- `crr-003-catalog-diagnostic-probe.mjs` / `.log`: actual API-built current catalog over copied historical fixture + predecessor-only directory gives empty admission and current missing-required-fields/missing-tree diagnostics, predecessor bytes unchanged. Reveals masked second stale diagnostic oracle too. Post-V1 reader diagnostic only, no complete conversion/real root proof.

From assigned worktree, both commands exited0 and printed `OWNED_SCRATCH_REMOVED=true`:

```sh
node tickets/in-progress/project-task-manager-linked-delegation/code-review-evidence/crr-003-schema-prerequisite-probe.mjs
node tickets/in-progress/project-task-manager-linked-delegation/code-review-evidence/crr-003-catalog-diagnostic-probe.mjs
```

Only newly created owned OS temp SQLite/memory roots used and removed; no repository test/source fix, app/provider/model/credential/user-profile access, global Stop or default test DB reset this review. Existing current build used for catalog, no new build claimed. Supplied final four-file failing run and focused archive baseline inspected, not rerun by reviewer. Origin correction and rerun belong to API/E2E. Prior source Pass/CRF closure remains unchanged; provider/product and later proportional successful-test/Delivery gates remain.

# CRR-004 focused source-boundary origin / upstream feedback recovery

Canonical report/history now **CRR-004 / Fail—Design Impact**, carrying implementation-owned **CRF-003/FAPI-005 (P2)**. Prior CRR-002 source Pass is historical at the newly confirmed projection boundary; CRF-001/002 stay source-resolved. FAPI-001–004 actually resolved in API-REV-002 after faithful corrections, not waived.

- `crr-004-preservation.json`: independent195/195 prior implementation,12/12 prior API coverage and1/1 new regression hashes unchanged.
- `crr-004-projection-authorities.diff`: empty HEAD diff for relevant projector/handler/shared DTOs. Newly added internal stamp reaches the preserved raw public projection; no post-review source drift.
- `crr-004-stamped-projection.log`: independent default unit reproduction, not provider acceptance.

From W:

```sh
pnpm -C autobyteus-server-ts exec vitest run tests/unit/services/agent-streaming/agent-collaboration-stream-handler.test.ts tests/unit/services/agent-streaming/agent-collaboration-task-lifetime-projection.test.ts --no-watch
```

**Exit1,2files:1failed/1passed;5tests:1failed/4passed.** Current reader accepts valid stamped/unstamped children; strict public projection fails only stamped case. Three existing empty-handler controls pass. Test does not require private stamp wire exposure; actual ordinary packaged Manager/worker journey independently establishes scenario validity. Source event and snapshot passthrough reviewed; snapshot-only unit is not complete event/UI recovery proof.

Owned live tree/WS/tool evidence, user sidebar screenshot and fresh/packaged equal-DTO-hash controls inspected. No paid provider/app launched or credential read/import by reviewer. Worktree-default unit setup reset its disposable test DB; no user DB/profile operation. Only ticket artifacts edited, no production/durable-test fixes.

Incoming API feedback **UC-001** is called **API-UC-001** here to avoid collision with approved requirements' invocation use case. Current design273/prompt6/full serializer implement the old approved diagnostics; new business-only Manager responsibility requires upstream revision/approval, not ad hoc truncation, hidden cleanup-success or scheduler. Source stream defect stays independently open. See report for rejected hypotheses, exact earlier source-review omission, real provider/three-root limits and single-owner routing.

# CRR-005 cumulative source re-review evidence

Current source result **Pass / CRR-005**, approved REQ-BL-008/SR-014/ARCH-REV-005/IR-005, unchanged Large/High. CRF-003 source-resolved; API-UC-001 approved role/result revision source verified. Source gap acknowledged in CRR-004 is not erased; actual API-REV-003/FAPI-005 rendered/provider acceptance still incomplete.

- `crr-005-package-comparison.json` / `package-fingerprints.tsv`: current281 paths exact; prior195 reviewer paths191unchanged/3source+1testmodified; initial273dirty269unchanged/4modified/0missing+8newlydirty. All13 prior API coverage paths unchanged.
- `crr-005-source-audit.md` / `size-audit.json`: whole134 source current structural/line audit; max489effective/499raw; mapper98/100; two retained >220 signals unchanged.81tests excluded from limits.
- `crr-005-local-delta.diff`: all12 current source/test/fixture delta paths; existing HEAD diffs plus complete new text, no implementation edit by reviewer.
- `crr-005-git-status.txt`: dirty cumulative inventory, no reset/stage/commit.
- `crr-005-unchanged-startup-contracts-migrations.diff`:0bytes HEAD diff; no new converter/schema relaxation.

Independent exact commands from W:

```sh
pnpm -C autobyteus-server-ts exec vitest run tests/unit/services/agent-streaming/collaboration-public-tree-projection.test.ts tests/unit/services/agent-streaming/agent-collaboration-task-lifetime-projection.test.ts tests/unit/services/agent-streaming/team-execution-view-projector.test.ts tests/unit/services/agent-streaming/agent-collaboration-stream-handler.test.ts tests/unit/services/agent-streaming/agent-org-stream-handler.test.ts tests/unit/agent-tools/project-tasks tests/unit/built-in-agents tests/unit/agent-collaboration/task-lifetime-tree-scope.test.ts tests/unit/agent-collaboration/task-lifetime-quiet-generation.test.ts tests/unit/agent-team-execution/flat-team-private-release-independence.test.ts --no-watch
pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit
git diff --check
git diff HEAD -- autobyteus-server-ts/src/startup/migrations.ts autobyteus-server-ts/src/standalone-application-host/start-standalone-application-host.ts autobyteus-server-ts/src/app-data-migrations autobyteus-collaboration-stream-contracts/src autobyteus-server-ts/docs/design/data_migration_guideline.md
```

**12files102tests pass/exit0**; production typecheck/diffcheck0; lastdiff0bytes. No default test executions run concurrently. Logs `crr-005-boundaries-and-prior-findings.log`, `production-typecheck.log`, `diffcheck.log`. Worktree-owned default disposable test DB only.

Current recursive reader→projection/snapshot/indexed-start/collaborator/handler-publisher-subscription/reconnect/GraphQL controlled inspection/Team-protocol controls prove source boundary correctness, not real rebuilt desktop UI. Actual TaskService/native/MCP tests retain full business context/exact assignment and internal failure/retry/pending/release truth; provider release callbacks controlled. Prior24 quiet/tree/private release cases rerun. Source conformance to approved business-only prompt is not guaranteed model behavior, automatic reporting or physical proof.

Supplied selected1233passed/5skipped,build/assets/smoke and mocked web3test results inspected within reported limits, not rerun wholesale. All iterations/historical non-green evidence retained. Reviewer edits ticket review artifacts only; no source/durable-test fix, app/provider/model/credential/profile/deployment operation. Later real API/provider/root/frontend and successful-test/Delivery gates remain.

## CRR-006 — FAPI-006 focused terminal-publication origin

See canonical report and CRR-006 history entry. Independent actual directory/factory/configured handle six-file run: exit1,1failed53passed54total; two exact terminal callbacks missing despite controlled accepted stops. Original stamped/public/quiet/tree/private controls pass. Providers/business/client controlled, no live acceptance inferred. Reviewer did not modify production source or durable tests.

Command: `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-collaboration/root-task-team-terminal-publication.test.ts tests/unit/services/agent-streaming/agent-collaboration-task-lifetime-projection.test.ts tests/unit/services/agent-streaming/collaboration-public-tree-projection.test.ts tests/unit/agent-collaboration/task-lifetime-tree-scope.test.ts tests/unit/agent-collaboration/task-lifetime-quiet-generation.test.ts tests/unit/agent-team-execution/flat-team-private-release-independence.test.ts --no-watch`. Log `crr-006-terminal-publication-neighbors.log`. `git diff --check` exit0; startup/migration/strict DTO diff0bytes. Input/output manifest proofs and bounded actual UI/socket extract retained. Full current native/MCP/three-root/provider acceptance remains incomplete; no new full scorecard.

## CRR-007 independent cumulative source review

- Complete134-source structural/size audit: crr-007-source-audit.md and size-audit.json.283 actual non-ticket dirty fingerprints/660 upstream references verified; prior131 unaffected source hashes preserved. Three owner corrections and original/new terminal tests reviewed directly, not diff-only.
- Terminal/private/nested/stamped/quiet controls: from W, bash tickets/in-progress/project-task-manager-linked-delegation/implementation-evidence/ir-006-terminal-neighbors-command.sh, redirected to crr-007-terminal-neighbors.log; exit0,8files99tests.
- Actual run/Manager and business boundary controls: pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution/agent-run.test.ts tests/unit/agent-execution/agent-run-manager.test.ts tests/unit/agent-tools/project-tasks/project-task-business-results.test.ts --no-watch; crr-007-run-and-business-controls.log; exit0,3files67tests.
- pnpm -C autobyteus-server-ts exec tsc --noEmit -p tsconfig.build.json; crr-007-production-typecheck.log; exit0.
- git diff --check exit0; crr-007-diffcheck.log. Startup/released migration/strict DTO/guideline HEAD source diff0bytes; crr-007-unchanged-startup-contracts-migrations.diff.
- No actual desktop/model/provider run or full suite; controlled local root tags are not concrete root facade/physical proof. API-REV-004 Fail64.29% remains; source-resolution alone never closes FAPI-006 actual frontend/provider gate. No source/test implementation fix by reviewer. Current canonical report+CRR-007 history authoritative; crr-006-completed-report.md is retained triggering failure evidence only, not a competing current report.
