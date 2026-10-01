# API/E2E Execution Coverage Report — unified collaboration run-history policy

## Latest authoritative validation — API-REV-003 (user-requested real browser round)

- **Result: Pass / 95% confidence, with a documented Codex-runtime interaction caveat.** Prior result: API-REV-002 Pass / 95%. Current implementation source is reviewed CRR-003 Pass (`49ce0d173`); the three durable API/E2E tests were independently reviewed CRR-004 Pass. This round changes no product source or durable test code.
- Trigger: the user explicitly requested real browser testing, importing both local agent repositories and exercising the Classroom Simulation Team and nested classroom Org with Codex App Server / GPT-6-Luna. This is supplemental live integration validation of the current branch, not approval of new behavior or proof of the unmerged Org Memory adapter.
- Environment: documented `pnpm dev` in the assigned worktree; isolated `.autobyteus/development/server-data` SQLite/memory/temp workspace; backend `127.0.0.1:8000`, Nuxt `127.0.0.1:3000`; no existing listeners were stopped. The initially inherited `AUTOBYTEUS_AGENT_PACKAGE_ROOTS` exposed both packages without UI import, so I stopped only that owned stack, restarted it with the inherited variable removed, and actually imported each local path through Chrome Settings → Agent Packages. `pnpm dev` persisted the two roots in this isolated profile. No user AutoByteus desktop process/profile was changed.
- Browser surfaces: Chrome was used for actual package import, Team/Org catalogs and both live runs; after the user interacted with Chrome separately, a separate Safari tab was used for reload, persisted run-history, Memory inspection, stop/archive, then closed. This is **real browser execution**, not a mock, screenshot-only check or HTTP substitute.

### Executed cases (canonical details and timestamps: `api-e2e-test-case-ledger.md`, events 35–45)

| Case | Result | Direct observation |
| --- | --- | --- |
| B-01 | Pass | Backend health and Nuxt readiness; actual Chrome-rendered Settings. |
| B-02 | Pass | Browser imported `/Users/normy/autobyteus_org/autobyteus-agents` and `/Users/normy/autobyteus_org/autobyteus-private-agents` via Import Package; success state and local-path rows showed 12 and 8 Teams respectively. |
| B-03 | Pass | Classroom Simulation Team catalog showed professor coordinator/student; nested Org showed Teacher and StudentStudyGroup, with nested student_one coordinator/student_two detail. |
| B-04 | Pass **with intervention caveat** | Real Codex App Server GPT-6-Luna Team run (auto-approve OFF): professor wrote `homework.md`, sent `/student` a reference-file message; student wrote `student-answer.md` with 12 then 24 and replied `/professor`; two accepted messages and both files observed. Professor's first turn remained running without new trace for about 8 minutes after the reply. Browser **Stop generation** released the queued professor continuation; professor then read the answer and returned `CLASSROOM_BROWSER_OK` plus correct feedback. Thus autonomous no-intervention completion was **not** demonstrated. |
| B-05 | Pass | Real nested Org run with same runtime/model: Teacher `delegate_task` to `/StudentStudyGroup`; spawned task Team/student_one submitted exactly `NESTED_CLASSROOM_OK`; Teacher `review_task_result` accepted it; Task UI showed Accepted and final Teacher confirmation. No ordinary message substituted for the task lifecycle. |
| B-06 | Pass | After browser reload, both Team and Org run groups reappeared. Team conversation/two messages and Org accepted task were reopened in Safari. Team Memory listed one classroom run/two members; member inspector showed `raw_traces_active.jsonl` (16 records), including final feedback. Computed SHA-256 maps of four current index/tree files and 16 imported classroom definition files were identical before/after Memory navigation (`/tmp/api-e2e-unified-history/browser-*-before.sha256`, `browser-*-after.sha256`). This does **not** assert a browser-level per-root tree-read count; G-01/L-03 already prove that separately. |
| B-07 | Pass | Browser stopped the owned Team and Org, then archived their inactive histories. Both persisted index rows have non-null `terminatedAt` and `archivedAt`; workspace sidebar became empty, while physical run trees and classroom files remained. Owned `pnpm dev` runner was terminated; ports 8000/3000 released. Safari test tab closed. The inert dedicated Chrome localhost tab was left open to avoid disturbing the user's separate Chrome API-key work. |

### Confidence and scope

| Mandatory category | Final | Basis / limit |
| --- | --- | --- |
| Requirement and acceptance-criteria proof | 100% | API-REV-002 directly proved all current-branch ACs; this round additionally exercised real Team/Org lifecycle and browser Memory read-only behavior without contradicting those results. Conditional unmerged Org Memory adapter is outside current-branch scope. |
| Changed-boundary execution directness | 95% | Built/API proof from API-REV-002 plus real process/browser reads and index lifecycle; browser did not itself instrument internal tree-read count. |
| Cross-boundary integration realism/mock gap | 95% | Real local package import, production backend, Nuxt, Codex App Server, GraphQL/WebSockets, SQLite/files and two browsers. |
| Environment/configuration/identity/fixture fidelity | 95% | Actual user-specified repositories and target definitions, GPT-6-Luna visible in product catalog, owned isolated profile, no copied credentials or user profile mutation. |
| Failure/edge/lifecycle/recovery | 90% | Actual stop/archive and persisted row/tree check, plus prior manager/concurrency/repair tests; Team completion required manual Stop generation after a long-running turn, so fully autonomous completion remains uncertain. |
| User-surface/browser/desktop-shell | 95% | Real Chrome/Safari import, live run, delegation, reload, Memory, archive. Electron shell not exercised and is inapplicable to this web-equivalent/backend change. |
| Durable regression quality/relevance | 95% | API-REV-002 G-01 and focused suites remain current and CRR-004-reviewed; this live user-specific model journey is temporary rather than a deterministic CI addition. |

- Overall confidence: **95%** (simple mean of seven applicable categories: 100+95+95+95+90+95+95 = 665 / 7 = 95). Every category is at least 90%; no current-branch critical AC failed. Broader validation: **Required and completed**. The manual-intervention caveat is a separate unconfirmed Codex/runtime interaction risk, not evidence that the run-history policy failed; it should be investigated separately if autonomous classroom latency is in scope. Do not silently call it an autonomous Team pass.
- Persisted data: the current eight-field Team/Org history rows remained directly usable; stop/archive updated lifecycle fields in the owned profile. No normal-read repair, compatibility path or source-definition write was invoked. The unmerged Org Memory source adapter is still **conditional N/A**.
- Artifacts/evidence: canonical investigation and ledger in this ticket; `/tmp/api-e2e-unified-history/browser-dev-no-roots.log`, before/after SHA-256 maps; owned isolated profile retained under the worktree for traceability, but its process is stopped. `git diff --check` passed. No screenshots were persisted; semantic accessibility states, visible UI text, trace files, hashes and server/process state are the evidence.
- Route: reviewed Medium/High package. CRR-004 already passed the unchanged durable test code; no new test-code review is required solely for this live round. Apply current handoff rules to route the updated cumulative result.

---

## Historical API-REV-002 report (superseded as latest by API-REV-003; retained for exact repository/API evidence)


## Execution Round Meta

- Canonical worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/unify-agent-team-org-history-policy`.
- Upstream package (same ticket folder): `requirements-doc.md`, `investigation-notes.md`, `solution-revision-record.md`, `design-spec.md`, `solution-handoff.md`, `design-review-report.md`, `architecture-review-revision-record.md`, `implementation-handoff.md`, `implementation-revision-record.md`, `code-review-report.md`, `code-review-revision-record.md`. Behavior-defining supplements: N/A. Delivery revision: N/A.
- Coverage investigation: `api-e2e-coverage-investigation.md`; case ledger: `api-e2e-test-case-ledger.md`; revision record: `api-e2e-revision-record.md` (same ticket folder).
- Current round/revision: **2 / API-REV-002**. Trigger: CRR-003 source-review Pass of IR-002 at `49ce0d173`, under approved SR-002 requirements, SR-005 design and ARCH-REV-003 Pass. Prior authoritative API/E2E result: **API-REV-001 Fail / 86%**, F-001.
- Classification: **Medium / High**, reviewed route. Successful result returns to Code Reviewer for proportional review of API/E2E-owned durable test changes.

## Latest Authoritative Result

- **Pass, 95% final validation confidence.** F-001 (AC-003 current Team imported-memory tree-read bound) is resolved by independent built, GraphQL and HTTP evidence with computed file-hash comparisons. No critical criterion is unproved; no applicable confidence category is below 90%.
- Broader validation: **Required and completed**, not skipped merely because unit tests passed. Browser/Desktop: Not Required, because no renderer, Electron shell or visual behavior changed; changed boundary is backend catalog, imported Memory API and offline CLI.
- Conditional Org root-memory adapter: **N/A in this branch**. It still must be switched to the read-only owner query and validated when the separate memory branch merges. No present coverage credit is assigned to it.

## Prior Failure Resolution — F-001

| Prior failure | Resolution | Direct evidence |
| --- | --- | --- |
| API-REV-001 L-03: 12 request-time execution-tree reads for 3 admitted Team roots (4/root), versus AC-003 ≤1/root | **Resolved.** SR-005/IR-002 passes the already-read root-checked tree through pure tree-scoped member projection. New built L-03 measured 3/3 reads for Team-list and separately 3/3 for Team-run-list after explicit readiness. | `/tmp/api-e2e-unified-history/l03-rerun.log`, `l03-rerun-probe.mjs`; copied current index/three current roots; 44 actual per-file SHA-256 maps identical before/after each request. |
| API-REV-001 L-03 byte-identity output was hard-coded | **Not reused as evidence.** Both round-2 probes compute and compare real recursive SHA-256 maps, and G-01 asserts map equality in durable GraphQL coverage. | L-03 `cardsHashEqual=true`, `runsHashEqual=true`; G-01 test source and log; H-01 45 computed file hashes across server startup and two HTTP requests. |

The previous CRR-002 Design Impact / CR-001 was resolved upstream at SR-005/ARCH-REV-003. This report closes only executable F-001; it does not rewrite earlier review history.

## Investigation, Ledger And Case Reconciliation

- The canonical investigation was updated to round 2 before adding G-01. The ledger reuses prior case IDs; L-03 was rechecked first, then new G-01/H-01 and affected suites. The prior API-REV-001 result remains in the revision record rather than being inferred away.
- Ledger terminal event: sequence 34. Every selected round-2 case is completed; no running, interrupted or unstarted case remains.
- Sequence deviation from a clean initial run: because API-REV-001 had a critical live-path failure, L-03 was rerun **before** broad repository suites. The scorecard after those suites therefore already incorporates the targeted re-entry evidence; H-01 provided a further independent built HTTP confirmation. No result is inferred from source review alone.

| Case | Round-2 result | Command / execution and evidence |
| --- | --- | --- |
| L-03 | **Pass** | Built `dist` Team explorer on owned copy of real current index and 3 admitted Team roots; separate list/run-list requests, each exactly 3 reads. All 44 file hashes equal after each. `l03-rerun.log`, `build-r2.log`. |
| G-01 | **Pass** | Added `tests/e2e/memory/imported-team-memory-graphql.e2e.test.ts`; real imported source selector, in-process production schema, two roots, actual hashes and per-request counters. 1/1 test. `g01.log`. |
| H-01 | **Pass** | Built isolated server + HTTP GraphQL imported Team-list and Team-run-list on copied real roots: 1 card, 3 runs; all 45 imported files unchanged from before startup through both requests. `h01.log`, `h01-http.mjs`. Harness stopped server and removed owned runtime/database. |
| R-01 | **Pass** | 8 focused policy, current-index, repair and changed Team Memory/location files, 35/35 tests. `r01-r2.log`. |
| R-02 | **Pass** | 4 Team-manager/Org lifecycle/workspace files, 26/26 tests including PM-001 real transition-lane interleavings. `r02-r2.log`. |
| R-03 | **Pass** | 7 GraphQL/memory files, 15/15 tests including G-01 and prior API/E2E-owned workspace harness edits. `r03-r2.log`. |
| R-04 | **Pass with project-config caveat** | Full build and sanitized bootstrap (`build-r2.log`), build-config typecheck (`r04-build-r2.log`) and isolated new-test typecheck (`r04-g01.log`) pass. Generic `tsconfig.json` command itself has pre-existing TS6059 rootDir=src/include=tests conflict across unrelated tests (`r04-r2.log`); it is not the project build check. |

## Changed Boundary And Acceptance-Criteria Evidence

| Criterion / scenario | Boundary | Evidence and result |
| --- | --- | --- |
| AC-001 / SCN-001 | Both family catalog queries are admitted, normalized, index-only and no-write, including new instance | R-01 rerun; API-REV-001 L-01 actual current Team/Org arrays had 0 query tree reads/writes and unchanged index SHA. IR-002 did not change those catalog/store paths. **Pass.** |
| AC-002 / SCN-002 / PM-001 | Lifecycle row events, serialization, manager-lane archive/restore, compensation | R-01/R-02 real-manager and R-03 GraphQL archive/Org lifecycle. **Pass.** |
| AC-003 / SCN-003 | Current Team imported source selector; read-only and ≤1 tree read/admitted root/request | L-03 built copied real roots (3/3 for each request, 44 hashes equal), G-01 production GraphQL (2/2 for each request, computed hashes equal), H-01 built HTTP (45 files equal). **Pass.** Org adapter conditional N/A, not silently counted. |
| AC-004 / SCN-004 | Existing arrays directly usable; missing/corrupt/orphan policy; explicit local repair | R-01 rerun; API-REV-001 L-01 and L-02 built CLI dry-run/apply/backup/readback/corrupt/missing-ack evidence remains applicable because IR-002 changed none of these paths. **Pass.** |
| AC-005 | Focused history/run/memory/API/integration checks and no compatibility path | R-01–R-04 and G-01 all green on current code, with documented generic tsconfig caveat. **Pass.** |

## Persisted Data, Legacy And Scope Check

- Approved transition: **Directly Usable — No Migration**. Current eight-field Team/Org arrays read without schema changes; no normal-read reconciliation, compatibility alias, request-time upgrade or dual write was observed. The explicit offline repair remains local-only; prior L-02 proved dry-run, backups, readback, corrupt refusal and missing-index acknowledgement on owned profiles. No compatibility-only coverage was added.
- IR-002 changes only Team Memory/location projection and relevant tests, not catalog/index/repair or public GraphQL schema. L-03/H-01 show the imported current data is not modified by the corrected path. Original user profile was read only to create a small copy; no live user profile was mutated.
- Separate Org Memory source adapter is absent/unmerged and remains a conditional merge obligation. No browser/desktop-shell uncertainty is relevant to this server-only implementation.

## Validation Confidence Scorecard

| Mandatory category | Post-repository | Final | Basis / residual uncertainty |
| --- | --- | --- | --- |
| Requirement and AC proof | 95% | **95%** | All current-branch critical ACs directly exercised; conditional Org adapter is explicitly outside this branch. |
| Changed-boundary execution directness | 95% | **95%** | Built service counters + production GraphQL source selector + built HTTP; separate modes triangulate the changed path. |
| Cross-boundary integration realism and mock gap | 95% | **95%** | Actual imported directory, source metadata, index, root packages, schema and HTTP process. Some unrelated workspace-history tests use mocks. |
| Environment, configuration, identity and fixture fidelity | 95% | **95%** | Three copied real roots/current index and owned server profile; no credential or live-profile mutation. |
| Failure, edge, lifecycle and recovery | 95% | **95%** | PM-001, compensation, strict corrupt/missing index and built repair evidence; no new IR-002 failure mode untested materially. |
| User-surface/browser/desktop-shell | N/A | **N/A** | No changed UI, web renderer or desktop-shell behavior; backend/HTTP is the relevant user-facing boundary. |
| Durable regression coverage quality/relevance | 95% | **95%** | New G-01 protects the imported GraphQL request bound/hash invariant; existing current policy/lifecycle suites pass. |

- Overall: **95%** (mean of six applicable categories). Clean target met: ≥95%, every applicable category ≥90%, direct proof for critical acceptance criteria, no material unresolved broader-validation risk. The residual Org adapter is a separately identified conditional merge obligation, not a claim of current-branch proof.

## Durable Coverage Changed

- **Added this round:** `autobyteus-server-ts/tests/e2e/memory/imported-team-memory-graphql.e2e.test.ts` (G-01), one imported source-selector GraphQL scenario for both list methods, genuine recursive SHA-256 comparisons and per-root read counters.
- **Carried from API-REV-001 and rerun:** `autobyteus-server-ts/tests/e2e/workspaces/archive-run-history-graphql.e2e.test.ts` (current manager-lane/admitted package fixture) and `autobyteus-server-ts/tests/e2e/workspaces/workspace-run-history-graphql.e2e.test.ts` (resolver construction harness). Both remain uncommitted API/E2E-owned changes and need proportional test-code review now that validation passes.
- Removed: none. Product source changed by API/E2E: none. `git diff --check` passed.

## Environment, Temporary Methods And Cleanup

- macOS, Node v22.23.1, pnpm 10.28.2, Vitest 4. Built server via documented `pnpm -C autobyteus-server-ts build`; no browser or Electron app was started. Generated `dist` directories are uncommitted and not part of the source/test review diff.
- Temporary scripts/logs retained under `/tmp/api-e2e-unified-history/`: `l03-rerun-probe.mjs`, `l03-rerun.log`, `h01-http.mjs`, `h01.log`, selected suite/build/typecheck logs. These are execution evidence, not durable suite additions.
- Owned copied real-data profile was deleted after validation. Built HTTP server, runtime directory and isolated SQLite database were stopped/deleted by the repository harness. No user process, user database or live memory directory was stopped/reset/written.

## Recommended Recipient / Latest Authoritative Result

- **Pass / 95%**, broader validation Required and completed. Reviewed Medium/High route → `/code_reviewer` for **proportional test-code review only** of the new G-01 test and the two carried API/E2E harness edits. Do not reopen the implementation source scorecard. Current source-review CRR-003 remains Pass; API-REV-001 Fail is historical and F-001 is resolved by API-REV-002 evidence.
