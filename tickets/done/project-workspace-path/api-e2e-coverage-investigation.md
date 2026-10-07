# API/E2E Coverage Investigation — Project workspace paths

## Investigation meta and active authority
Round 1, API-REV-001, 2026-10-07. Current result: Pass / 95.00%; see final reconciliation below. Initial planning statements preserved as chronological context. Trigger: Code Reviewer CRR-001 Pass. No prior API result/confidence. Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/project-workspace-path`, branch `codex/project-workspace-path`, entry HEAD `f4fedcd38` plus review-receipt docs; implementation through `7b69893c3` (source `9dad89bae`).

Canonical upstream artifacts, all read in this ticket directory: requirements-doc.md (SR-002/AP-001), investigation-notes.md, solution-revision-record.md, design-spec.md (SR-003), solution-handoff.md, historical analysis-result.md, design-review-report.md and architecture-review-revision-record.md (ARCH-REV-001), implementation-handoff.md and implementation-revision-record.md (IR-001), code-review-report.md and code-review-revision-record.md (CRR-001). Supplemental Product/behavior package and delivery re-entry: N/A. Existing implementation/review evidence is attributed, not our execution.

**Medium / High; Reviewed route; successful durable-test output requires proportional Code Review.** Canonical companion paths: api-e2e-test-case-ledger.md, api-e2e-execution-coverage-report.md and api-e2e-revision-record.md. Evidence: api-e2e-evidence/api-001/.

## Requirement and scenario basis
SCN-001 selected agent creates by absolute folder path, SCN-002 explicit Project patch/replacement/clear, SCN-003 reopen historical/unregistered associations, SCN-004 picker/manual same path. REQ/AC-001–006 apply. BEH-001 native/MCP contract changes; BEH-002 saved/wire links become path+description; BEH-003 preserved omission/blank/clear/atomicity now keyed by canonical path; BEH-004 removes registration/mkdir prerequisites. Global registry IDs, Task/delegation and Project identity unchanged.

Existing historical startup conversion MP-001 is supported and must retain released classifier/output and retry/no-op. MP-002 (ordinary path-only Save while pending source gates Projects) is unsupported/unreachable and will not be fabricated. No new migration, aliases, fallback or runtime old-ID decoder permitted. Read old four-key supersets without writes; ordinary saves reduce to two keys.

## Surface classification and required evidence
| Surface | Changed / risk | Evidence selected |
| --- | --- | --- |
| Backend/domain/store | Yes: pure normalization/duplicates/tolerant read/exact write | Owner unit + actual API/disk |
| HTTP/GraphQL/native/scoped MCP | Yes: removed ID contract and strict paths; existing selection/auth retained | HTTP suite, real resolver suite, built-node scoped MCP |
| Web components/store/router | Yes: same path draft, option/query/row identity | Focused Nuxt + real browser Projects probe |
| Live WebSocket/feed | Yes: strict path-only wire | gated real HTTP/WS scoped-MCP scripted CLI suite |
| Identity/permissions | Preserved, must not loosen selection/node isolation | Native exposure and scoped-MCP denial assertions |
| Lifecycle/persisted transition | Reader changed; frozen existing startup classifier | Both built startup entrypoints/restart, historical fixtures unchanged |
| Desktop shell | No changed preload/main/IPC | Web-equivalent validation appropriate; no packaged/full-product claim |
| Workers/external inference | Unchanged; Task regressions are preserved | Scripted AGY real transport regression; no paid model calls |

## Execution discovery
Read root AGENTS.md, DESIGN.md, full TESTING.md; server/web AGENTS.md, relevant README testing/development sections; server package scripts/vitest.config.ts, web package scripts and probe header, fixture/process setup in Project suites. No closer TESTING.md under changed package paths. Root Project Mutation prose incorrectly says real workspace IDs required; update to approved paths while retaining commands. This stale prose is not authority for compatibility.

Commands from worktree root: server `pnpm -C autobyteus-server-ts prebuild` then `build` (serialize shared output); `exec vitest run <paths> --no-watch`; web `exec nuxt prepare`, `test:nuxt <paths> --run`; browser `test:e2e:projects --skip-server-build --output-dir=<fresh absolute path> --ledger-file=<absolute ledger>`. Feed requires `RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs`. No external credentials needed. Test-owned Prisma setup; forked serialized suites; disposable data/HOME, free ports, readiness health queries, exact-owned cleanup. Never touch installed app, customer data or default shared development profile. Browser probe runs current dist + own Nuxt/Chrome and real SQLite, not mocked Projects endpoints. Builds must finish before built-process/browser tests begin.

## Existing coverage validity / changes planned before edits
| Paths (server tests unless indicated) | Decision | Reason / change |
| --- | --- | --- |
| unit/projects, unit/agent-tools/project-tasks, unit/api/graphql/projects-schema, unit/workspaces manager, migration and runner units | Still Valid | Updated owner proof from IR-001; independently rerun, no restore of IDs |
| e2e/projects/project-task-boundaries | Needs Update | Old workspace_id/addedAt schema, input/ack and unknown-registration rejection; replace with path, invalid-relative and old-ID rejection, exact disk/ack and no registration/folder side effects; retain native selection, Task/context/assignment preservation |
| e2e/projects/project-mutation-node-locality | Replace obsolete remote-ID rejection in existing case | Same absolute path on each node accepted as local metadata; remote Project identity still rejects; registry isolation/restart and source bytes retained |
| e2e/projects/projects-graphql | Needs Update + Add Durable Coverage | Direct/aggregate root inputs/output, invalid-patch atomicity, normalized duplicate, omission/order/clear, no-write historical reads/ordinary save exact keys; preserve historical fixture four-key rows and global registration APIs |
| e2e/projects/project-change-feed | Needs Update + Add Durable Coverage | Remove old selected fields; add actual agent/API path link update/unlink/reconnect parity and strict keys; all existing Task/root cases retained |
| e2e/projects/projects-startup-migration | Still Valid + Add Durable Coverage | Both startup entrypoints currently run real migration; explicitly assert historical four-key output stays byte-identical across reads and current view two-field projection, ordinary save reduces keys |
| other e2e/projects Task suites/fixtures | Still Valid; mechanically update any Project-only stale input found | Task/global runtime ID and frozen migration fixtures must stay intact |
| web components/projects + projectStore + utils/projects tests | Still Valid | Current owner tests; rerun |
| web tests/e2e/projects-feature-probe.mjs | Needs Update + Add Durable Coverage | Old ID options/selectors and registration-on-save expectations obsolete; same draft, picker/manual exact disk shape, special-character edit/unlink/reload, invalid canonical duplicates, no createWorkspace/save registry side effects |
| real providers / packaged desktop / unrelated full suites | Out Of Scope | No changed inference or shell behavior; no full-product certification requested |

No durable file removal planned. Only obsolete assertions above are replaced; their upstream authority is REQ-001/002/006 and design concrete decisions, not a failing test. Historical fixture bytes and unrelated Task/global workspace assertions preserved. No test-validity ambiguity requiring reroute.

## Plan and ledger
Ledger required: multiple independent API/browser/lifecycle cases and interruption risk. Planned independently meaningful groups:
- API-001: focused server owner/schema/registry/migration units, AC-001–006.
- API-002: native/scoped-MCP/HTTP and Task preservation, AC-001/002/003/006.
- API-003: aggregate/direct GraphQL and historical/no-write/exact-save, AC-002–006.
- API-004: two built nodes + graceful restart, AC-002/004/006.
- API-005: both actual startup entrypoints + existing migration/no-write historical continuity, AC-004.
- API-006: strict live feed + reconnect and preserved Task roots, AC-005/002.
- API-007: broader relevant Project suites, preserved Task behavior.
- API-008: focused web component/store suites, AC-005/006.
- API-009: real browser Projects feature journey (probe PT-E2E case IDs retained), AC-002/003/005/006.

Repository order: prerequisite build → owner units → focused HTTP/GraphQL → built-node/migration/feed → broader Project suite → Nuxt owner suite. Record exact commands/results/logs in ledger as run. Browser is required after repository confidence assessment. At initial plan persistence all commands were **Planned**, no API pass inferred; final results below supersede that initial state.

## Post-repository confidence scorecard
Pending repository execution. Mandatory categories: requirement/AC proof; changed-boundary directness; integration realism/mock gap; environment/identity/fixture fidelity; failure/edge/lifecycle/recovery; user-surface/browser/shell; durable coverage relevance. No score yet. Final gate ≥95% average, each ≥90%, every critical AC directly proven. A passing average cannot hide an unproven criterion.

## Broader validation decision / environment plan
**Required (planned)**: real-browser Projects dev probe closes router/DOM/options/manual save integration and reload gaps which component tests bypass. Node process/restart, startup and feed are already durable real-system checks. Probe owns two current-built nodes, private SQLite and settings, own Nuxt/free port and fresh Chrome. Public registration creates only picker fixture; manual path nonexistent; task fixtures from normal API. Capture raw JSON/disk/registry, screenshots supporting DOM assertions, requests, logs and cleanup. Scripted actor/session acquisition is disclosed, not actual model proof. No temporary-only probe planned: regressions belong in existing durable suites.

Desktop decision: Electron wrapper, changed behavior web-equivalent; no shell source change. Browser + built startup checks appropriate per TESTING.md Choosing the path. Packaged app/upgrade, Windows/Linux execution, actual provider inference, customer data and explicit user verification remain **Not Tested**, not acceptance claimed. No effect on user's running app. Cross-platform host path conventions covered only on execution OS plus owner cases; no inferred universal OS guarantee.

## Investigation decision
Proceed with durable test-only adaptation/execution: **Yes**. Add/update coverage: **Yes**, remove files: **No**. Reroute before execution: **No**. Classification remains Medium/High; single primary handoff on completed outcome.

## Repository execution assessment — 2026-10-07 (before browser execution)
Current checked source `ed8897135` (review receipt only beyond original entry). Serialized prebuild/build exit 0; owner 240 tests/17 files, HTTP 8, GraphQL 10, nodes 1, startup 5, feed 7, web 119/15 files passed. Broad `tests/e2e/projects` gated deterministic run: 8 files / 41 passed / 1 explicitly gated real-Claude case skipped. No implementation or fixture failure observed in these checks. Exact commands and raw outputs in ledger/evidence. Skipped live Claude memory case is unchanged/out of scope; no paid provider claim. Search found no further stale Project association inputs outside updated suites; remaining IDs are global registry or intentional historical/schema rejection.

| Mandatory category | Post-repository confidence | Support / uncertainty / next proof |
| --- | ---: | --- |
| Requirements and AC proof | 90% | Direct native/HTTP/disk/migration proofs; AC-005/006 rendered path journey still only owner-unit/attributed implementation proof; run browser |
| Changed-boundary directness | 95% | Current-source native/scoped MCP/GraphQL, real built nodes/startup and strict WS; browser remains to execute |
| Integration realism/mock gap | 95% | Actual services/persistence/transports; model scripted and empty run-manager doubles for resolver unregistration are explicit, not changed-boundary bypass |
| Environment/configuration/identity/fixture fidelity | 95% | Test-owned Prisma/HOME/ports and faithful historical supersets; macOS only, no customer dataset |
| Failure/edge/lifecycle/recovery | 95% | Strict ID/invalid/canonical duplicate rejection with byte atomicity, read-no-write, both startup entrypoints and retries, two-node restart/reconnect; no unsupported MP-002 |
| User-surface/browser/desktop-shell | 75% | 119 owner tests pass; no independent actual browser run yet; shell unchanged/out of scope |
| Durable coverage relevance/quality | 95% | Obsolete assertions replaced by approved contracts; preserved historical/Task/global registration cases; browser adapted but unexecuted |

Overall **91.43%** (640/7). Critical browser acceptance proof still missing, so not Pass. Broader validation **Required**, selected real browser Projects probe on current built backend. Expected closure to ≥95% if actual path authoring/router/edit/unlink/reload/persistence/no-side-effect assertions pass. No packaged desktop/full product certification inferred. No external dependency blocker.

Browser attempt 1 passed 16/16 with no page errors and complete cleanup. During final test-quality inspection, strengthen PT-E2E-004 to correlate each rejected form submission with its actual GraphQL response/error code and the fault-injected 503 count. Waiting only on an alert that may already exist is weaker evidence of a fresh attempt. This is a test-quality refinement (API-owned), not a product failure; record it before the durable edit and rerun the full browser probe.

## Final execution / coverage reconciliation
API-001–009 completed. Exact commands, CWD and results are now indexed in `api-e2e-evidence/api-001/commands.md`; raw logs preserve all stdout/stderr. The previously planned execution items are **Pass**, except the explicitly gated live-Claude case **Not Tested**. Both browser attempts passed; final durable browser code matches browser-2 (16 cases). PT-E2E-003 directly proved exact picker/manual disk shape, missing path with spaces/#/?/unicode/backslash, query roundtrip and focused edit, unlink/reload/re-add, unavailable retained edit, unchanged registry and original file bytes. PT-E2E-004 added actual GraphQL invalid/duplicate/error-response receipts plus one 503 interception. PT-E2E-010 restarted the owned backend and preserved links/Tasks/context.

Final confidence **95.00%**, seven applicable categories each 95%; no material uncertainty in approved changed scope, no missing critical AC. Browser proof closes the two weaker categories; other categories unchanged. It does not create an installed-shell, cross-OS, real-model, customer-data or explicit-user-verification claim. No production code changes, compatibility aliases, historical fixture edits or dedicated unsupported recovery scenarios. No findings or reroute before execution. Successful durable test-code changes require proportional review. Canonical execution report contains final matrix and limitations.
