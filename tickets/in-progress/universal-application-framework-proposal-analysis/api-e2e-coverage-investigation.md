# API/E2E Coverage Investigation

- Task: Universal Application Dual-Host Architecture
- Current API/E2E revision: `API-REV-013`
- Current reviewed implementation: `IR-021` (cumulative `IR-019`–`IR-021` SR-016 hardening)
- Source-review gate: `CRR-037` Pass / 98
- Reviewed HEAD: `53eb73795c616148f01c2f6e0207f6b410410e24`
- Investigation status: Complete
- Execution outcome: Pass
- Final confidence: `98%` (`98.3%` unrounded)

## Investigation Meta

- Trigger: `code_reviewer` requested the reopened proportional API/E2E stage after IR-021 closed `CR-025`.
- Requirement basis: `BEH-011`, `REQ-011`, `AC-024`, `UC-028`, DS-016, and `application-framework-hardening-evaluation.md`.
- Preserved runtime basis: `BEH-001`–`BEH-010`, `AC-001`–`AC-023`, and the authoritative `API-REV-012` Pass / 97% baseline.
- Supplemental artifacts: `application-framework-architecture-simplification.md` and `application-framework-hardening-evaluation.md`.
- Historical `APIE2E-REPO-005`: remains separate, `Unclear`, unattributed, and unused as Pass evidence.

## Current Requirement And Changed Boundary

SR-016 adds a contributor-time architecture gate, not production behavior. The current checker must:

1. parse governed TypeScript, JavaScript, and Vue SFC inputs;
2. apply exact server, Studio-web, Brief, Socratic, and template project/config/manifest profiles;
3. enforce `AFB-001`–`AFB-005`, including the closed AFB-004 injection obligations;
4. treat a resolved Vue external `<script src>` as an SFC-owned dependency edge before reading the target;
5. reject forbidden AFB-002/005 external targets with the standard SFC-owned diagnostic;
6. allow local external targets, then resolve their imports from the external file;
7. preserve the existing dual-host routes, execution, publication, recovery, remount, package bytes, and developer commands.

IR-021 changes only `autobyteus-server-ts/tests/architecture/application-framework-boundaries.test.ts`. The three executable hardening commits have zero production `src/**` delta. Other integrated-base release/model updates since API-REV-012 are independently present and were covered by the broader build/runtime matrix; they are not attributed to SR-016.

## Changed Surface And Boundary Classification

| Surface | Classification | Required Evidence |
| --- | --- | --- |
| Vue external `script src` | Test-owned parser/resolver boundary | Direct allowed and rejected AFB-002/005 fixtures through the real checker |
| Architecture policy | Repository contributor gate | Complete current-tree `AFB-001`–`AFB-005` execution and exact diagnostics |
| Project dependency declarations | Test-only development dependency/lock | Frozen/current install validity, build TypeScript, full architecture execution |
| Runtime/API behavior | Behavior-preservation boundary | Retained 31-file API/runtime matrix on current HEAD |
| Standalone host | Real browser/process boundary | Start, real Brief team run, publication/handoff/projection, same-data restart |
| Studio host | Nuxt/GraphQL/iframe/browser boundary | Exact package team/Luna defaults, real run, one-iframe explicit remount |
| MCP route separation | API/security boundary | Both internal routes 401 unauthenticated; standalone gateway 404; Studio gateway initialize 200 |
| Package integrity | Read-only dual-host package boundary | Exact 73-path SHA-256 equality before and after both hosts |
| Cleanup | Process/filesystem boundary | Owned ports/processes clear; no atomic staging/previous residue |

## Project Execution Discovery

Authoritative execution sources retained and rechecked:

- root `package.json` and pnpm workspace lock;
- `autobyteus-server-ts/package.json`, Vitest configuration, build scripts, and architecture test;
- `autobyteus-application-devkit/package.json`;
- `autobyteus-web/package.json` and `nuxt.config.ts`;
- `applications/brief-studio/package.json`;
- `applications/socratic-math-teacher/package.json`;
- API-REV-012 canonical reports and real-host evidence.

Execution constraints:

- Node 22 and pnpm workspace scripts are authoritative.
- The linked devkit is built before local authoring commands consume `dist/cli.js`; published-package users receive built package output.
- System Chrome was available at `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome` and driven with repository Playwright Core.
- Standalone used port 43127 and a unique `/tmp/api-rev013-standalone-data-*` root.
- Studio used isolated backend 8011, Nuxt 3011, and a unique `/tmp/api-rev013-studio-data-*` root with explicit data/database/log/memory/workspace variables.
- No user-owned listener or data root was stopped or reused.

## Existing Durable Coverage Validity Decisions

| Coverage | Decision | Current Result |
| --- | --- | --- |
| `tests/architecture/application-framework-boundaries.test.ts` | **Updated by IR-021, Still Valid** | 14/14 Pass; current tree and external-script target fixtures execute |
| IR-020 external-script resolution-origin fixture | **Still Valid** | Allowed target resolves imports from external file and preserves SFC/source diagnostic identity |
| AFB-002 Studio external-target fixtures | **Still Valid** | Studio-local target allowed; server application-engine target rejected before target parse |
| AFB-005 Brief external-target fixtures | **Still Valid** | Brief-local target allowed; host-runtime project escape rejected before target parse |
| API-REV-012 31-file runtime/API selection | **Still Valid** | Re-executed with architecture test: 32 files / 130 tests Pass |
| Devkit atomic pack/watch/browser tests | **Still Valid** | 20/20 Pass |
| Maintained Brief/Socratic build/validate/typecheck | **Still Valid** | Pass for both applications |
| Prior real dual-host scenarios | **Retained; proportional rerun required** | Current standalone and Studio real journeys Pass |

No current assertion was stale, removed, skipped, weakened, or replaced by a compatibility path.

## Durable Coverage Delta

### Added / Updated For This Requirement

- Cumulative SR-016 durable path: `autobyteus-server-ts/tests/architecture/application-framework-boundaries.test.ts`.
- IR-021 update: external Vue `src` is modeled as an SFC-owned `ImportEdge`; four direct allow/reject fixtures cover Studio and Brief targets.
- Test-only dependency/declaration scope: `autobyteus-server-ts/package.json` and `pnpm-lock.yaml`; synchronized documentation remains in the upstream implementation package.

### API/E2E-Owned Durable Changes In This Round

None. The reviewed IR-021 architecture test already provides the correct durable boundary. API/E2E added only temporary execution harnesses and evidence; all temporary harnesses were removed.

## Repository Execution Plan And Results

| Order | Check | Result | Evidence |
| --- | --- | --- | --- |
| 1 | Architecture test first gate | 1 file / 14 tests Pass | `api-rev-013-architecture-first-gate.log` |
| 2 | Server build-config TypeScript no-emit | Pass | `api-rev-013-architecture-first-gate.log` |
| 3 | Architecture plus retained API-REV-012 runtime/API matrix | 32 files / 130 tests Pass | `api-rev-013-architecture-runtime-matrix.log` |
| 4 | Full server build | Pass, including sanitized built-in bootstrap smoke | `api-rev-013-build-maintained-app-matrix.log` |
| 5 | Devkit full suite | 20/20 Pass | `api-rev-013-build-maintained-app-matrix.log` |
| 6 | Brief build, validate, backend typecheck | Pass | `api-rev-013-build-maintained-app-matrix.log` |
| 7 | Socratic build, validate, backend typecheck | Pass | `api-rev-013-build-maintained-app-matrix.log` |
| 8 | Commit/scope/diff audit | SR-016 executable commits have zero production-source delta; `git diff --check` Pass | `api-rev-013-scope-audit.log` |

## Post-Repository Confidence Scorecard

| Category | Score | Basis | Remaining Repository-Only Gap |
| --- | ---: | --- | --- |
| Requirement and acceptance proof | 99% | Exact current-tree and external-target fixtures Pass | No real-host preservation yet in this round |
| Changed-boundary directness | 100% | The real checker executes its own approved fixtures and current tree | None for the checker |
| Cross-boundary realism/mock gap | 96% | Retained real SQLite/API/runtime selection Pass | Browser/provider hosts still to confirm |
| Environment/configuration/identity fidelity | 96% | Current lock, TypeScript, builds, maintained packages | Live host setup still to confirm |
| Failure/edge/lifecycle/recovery | 95% | Forbidden targets, unresolved paths, injection obligations, retained lifecycle matrix | Same-data restart/remount still to confirm |
| User-surface/browser confidence | 90% | No user code changed; builds pass | Proportional real dual-host confirmation required by handoff |
| Durable regression quality/relevance | 99% | One closed test owner, direct positive/negative fixtures, no production helper | Proportional test-code review pending |

- Repository-only confidence: `96%` (`96.4%` unrounded).
- Broader validation decision: **Required**, despite the clean test-only scope, because the reopened delivery flow explicitly requires API-REV-012-equivalent dual-host, route, and package-integrity preservation evidence on current HEAD.

## Broader Validation Plan And Result

| Scenario | Selected Evidence | Result |
| --- | --- | --- |
| `APIE2E-ARCH-013` | Current architecture test and scope audit | Pass |
| `APIE2E-STANDALONE-013` | Real Chrome Brief create/generate; Codex/Luna team; raw Agent Tools traces; SQLite projection | Pass |
| `APIE2E-STANDALONE-RESTART-013` | Stop/start same data root and browser state check | Pass |
| `APIE2E-STUDIO-013` | Real Nuxt setup, exact package team/Luna defaults, iframe business run, raw traces, SQLite projection | Pass |
| `APIE2E-STUDIO-REMOUNT-013` | Open host controls and explicit reload | Pass: launch 1 -> 2, one iframe, completed record retained |
| `APIE2E-ROUTES-013` | Direct HTTP requests | Pass: internal 401 both hosts; standalone gateway 404; Studio gateway initialize 200 |
| `APIE2E-PARITY-013` | Exact pre/post SHA-256 over retained 73-path set | Pass: 73/73 byte-identical |
| `APIE2E-CLEANUP-013` | Listener/process/scratch audit | Pass |

The first combined Studio temporary harness entered and completed the real business run, but its readiness snapshot was early and its parent-page polling attempted cross-origin iframe DOM access. A focused corrected harness waited semantically inside the Playwright frame, confirmed the completed run, and passed explicit remount. This was temporary harness logic only; production and durable tests were unchanged.

## Final Confidence Scorecard

| Category | Score | Final Basis |
| --- | ---: | --- |
| Requirement and acceptance-criteria proof | 99% | AC-024 checker behavior plus preserved dual-host acceptance directly executed |
| Changed-boundary execution directness | 100% | Exact production checker/current-tree/fixture path executed |
| Cross-boundary integration realism and mock gap | 98% | 130 repository tests plus real provider/browser/SQLite paths in both hosts |
| Environment, configuration, identity, and fixture fidelity | 98% | Current HEAD, current lock/builds, exact Brief team and Luna defaults, isolated data |
| Failure, edge-case, lifecycle, and recovery evidence | 96% | Forbidden-before-parse fixtures, standalone same-data restart, Studio remount, retained API-REV-012 lifecycle matrix |
| User-surface/browser and desktop-shell confidence | 98% | Real Chrome standalone and Nuxt Studio iframe journeys; no shell-specific source changed |
| Durable regression coverage quality and relevance | 99% | Closed AFB test owner and direct positive/negative fixtures; no broad allow-list or production helper |

- Final confidence: `98%` (`98.3%` unrounded).
- Every applicable category is at least 90%; all critical current-scope criteria have direct evidence.
- No new failure ID or blocker exists.

## Not Tested / Residual Scope

| Boundary | Decision | Residual Risk |
| --- | --- | --- |
| Historical `APIE2E-REPO-005` | Not rerun or reattributed | Separate historical uncertainty; no supported SR-016/IR-021 connection |
| Electron shell | Not applicable | No preload, IPC, window, signing, packaging, or native integration changed |
| Multi-node/public gateway deployment | Outside approved local-first scope | None for AC-024 or preserved local dual-host behavior |
| Full API-REV-012 worker-kill/multi-run failure injection | Retained, not repeated | Production source unchanged; current runtime matrix plus proportional restart/remount closes current risk |

## Investigation Decision

- Result: `Pass`.
- Final confidence: `98%`.
- Broader validation: `Required — completed`.
- API/E2E-owned durable changes: none.
- Durable review surface: cumulative SR-016 `application-framework-boundaries.test.ts` and its test-only declaration/lock integration.
- Recommended recipient: `code_reviewer` for the separate proportional durable-test review before delivery resumes.
