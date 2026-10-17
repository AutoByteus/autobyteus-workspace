# API/E2E Execution Coverage Report — task-keys-declutter

(`…` = `/Users/normy/autobyteus_org/autobyteus-worktrees/task-keys-declutter/tickets/in-progress/task-keys-declutter`)

## Execution Round Meta

- Requirements Doc: `…/requirements-doc.md` (Approved, SR-001)
- Investigation Notes: `…/investigation-notes.md`
- Solution Revision Record: `…/solution-revision-record.md`
- Design Spec: `…/design-spec.md`
- Supplemental Task Artifacts: the user's screenshot (path in the requirements); predecessor `ui-ux-spec.md`
- Design Review Report: `N/A — not applicable`
- Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: `…/implementation-handoff.md` (IR-001)
- Implementation Revision Record: `…/implementation-revision-record.md`
- Code Review Report: `N/A — not applicable`
- Code Review Revision Record: `N/A — not applicable`
- Delivery Revision Record: N/A
- Coverage Investigation: `…/api-e2e-coverage-investigation.md`
- API/E2E Test-Case Ledger: `…/api-e2e-test-case-ledger.md`
- API/E2E Revision Record: `…/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Execution Round: 1
- Trigger: IR-001 from `/software_engineering_team/implementation_engineer` (direct route)
- Prior Round Reviewed: none
- Latest Authoritative Round: 1

## Routing Classification

- Task size: `Small`; architectural risk: `Low`; input route: `Direct Low-Risk`; successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Investigation And Execution Basis

- The investigation was written before execution and followed without material deviation.
- Existing coverage decisions revised: none. Reroute: `No`.
- Validated code: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/task-keys-declutter`, branch `codex/task-keys-declutter`, base `origin/personal@aa84fd026c`, uncommitted IR-001 changes (20 files).

## Test-Case Ledger Reconciliation

- Ledger initialized before execution: `Yes`; every case recorded: `Yes`; reconciled: `Yes`; no case left unresolved.

| Case ID | Final Result | Evidence |
| --- | --- | --- |
| B1 build | Pass | `evidence/api-e2e/logs/electron-build.log` |
| DSK-D1..D4, G1 | Pass | `evidence/api-e2e/desktop/` |
| U1 server | Pass | `evidence/api-e2e/logs/server-*.log` |
| U2 web | Pass | `evidence/api-e2e/logs/web-*.log` |
| P1 Projects probe | Pass 17/17 | `evidence/api-e2e/browser/projects-feature/` |
| P2 PM-UX probe | Pass 25/25 | `evidence/api-e2e/browser/project-manager-ux/` |

## Compatibility / Legacy Scope Check

- Backward compatibility in scope: `No`.
- Compatibility-only behavior observed: `No`. The worker `taskKey` field is removed outright; selecting it is now a schema error. The web app is its only client and ships with the server.
- Persisted-data transition: `N/A` (Not Affected).
- Compatibility-only durable coverage: `No`.

## Acceptance-Criteria Proof

- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-keys-declutter/tickets/in-progress/task-keys-declutter/evidence/api-e2e/`

| AC | Critical | Proven By | Evidence Files | Result |
| --- | --- | --- | --- | --- |
| AC-001 board page and tab board without key line; badge keeps its key | Yes | U2 (`TaskKeysAndDependencies.spec.ts`), P1 PT-E2E-017, P2 PMU-015/021, DSK-D1 and DSK-D2 (DOM: 0 `project-task-row-key` on all cards; each card's first text is its summary; badge "Blocked by autobyteus-1" with the full key in its title) | `desktop/dsk-declutter.json`, `desktop/dsk-d1-board-page-1440x900.png`, `desktop/dsk-d2-tab-board-1440x900.png` | Proven |
| AC-002 tree: summary only, title / name "Show Task in Projects: <summary>" | Yes | U2 (summary specs, en and zh-CN), P2 PMU-020/025, DSK-D3 (Project Task copy "Build the API on the schema" and Temp copy "Reply OK."; no key span; title = aria-label without key) | `desktop/dsk-d3-tree-*.png`, `desktop/dsk-declutter.json` | Proven |
| AC-003 keys kept elsewhere | Yes | U2, P1 PT-E2E-017 (chip, copy, dependency rows, picker, key URLs), DSK-D4 (chip `autobyteus-2`, Depends on row `autobyteus-1`, key URL, picker options by key), DSK-D2 (tab Task view chip and rows) | `desktop/dsk-d4-*.png`, `desktop/dsk-d2-tab-task-view-1440x900.png` | Proven |
| AC-004 no `taskKey` on the worker answer; the tree still locates | Yes | U1 (schema unit test: fields exactly `description, projectId, status, taskId`), G1 on the packaged app's server (same fields; a `taskKey` selection is rejected), DSK-D3 (locate from the tree summary works), P2 PMU-021 | `desktop/dsk-declutter.json` (G1), `logs/server-unit-projects-graphql.log` | Proven |
| AC-005 isolated desktop instance screenshots | Yes | DSK-D1..D4 on the worktree's packaged build | `desktop/dsk-d1-*.png`, `dsk-d2-*.png`, `dsk-d3-*.png`, `dsk-d4-*.png` | Proven |

## Changed Boundary And Evidence Matrix

| Case ID | AC | Changed Boundary | Surface | Evidence Type | Result |
| --- | --- | --- | --- | --- | --- |
| U1 / U2 | AC-001–004 | components, store, query, GraphQL type | unit | Durable | Pass |
| P1 / P2 | AC-001–004 | renderer against a built backend (probe-owned) | browser | Durable | Pass |
| DSK-D1..D4, G1 | AC-001–005 | packaged app, embedded server | isolated desktop | Desktop / Temporary | Pass |

## Additional Repository Coverage Execution

| Order | Command | Result | Evidence |
| --- | --- | --- | --- |
| 1 | `pnpm -C autobyteus-server-ts prebuild`; `pnpm -C autobyteus-web build:electron:mac` | Pass | `logs/server-prebuild.log`, `logs/electron-build.log` |
| 2 | `pnpm -C autobyteus-server-ts typecheck` | Pass | `logs/server-typecheck.log` |
| 3 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/projects tests/unit/api/graphql --no-watch` | 42 files / 306 tests pass | `logs/server-unit-projects-graphql.log` |
| 4 | `pnpm -C autobyteus-web test:nuxt --run` + guards | 4,473 pass, 0 fail; guards pass | `logs/web-unit.log`, `logs/web-guards.log` |
| 5 | `pnpm -C autobyteus-web test:e2e:projects --output-dir=<fresh> --skip-server-build --ledger-file=<abs>` | 17/17 | `browser/projects-feature/` |
| 6 | `node autobyteus-web/tests/e2e/project-manager-ux-probe.mjs --output-dir <fresh>` | 25/25 | `browser/project-manager-ux/` |

- Server E2E suites were not rerun. No suite reads the worker `taskKey` (grep), the server change is limited to the view shape, and that shape is covered by the schema unit test and G1 against a real server.

## Validation Confidence Scorecard

| Category | Post-Repository | Final | Evidence | Residual Uncertainty |
| --- | --- | --- | --- | --- |
| Requirement and AC proof | 90% | 98% | Every AC proven by unit + probe + desktop | — |
| Changed-boundary execution directness | 92% | 98% | The exact components rendered in the packaged app and in a browser; the schema checked live | — |
| Cross-boundary integration realism | 90% | 97% | Real backend, real feed, scripted runtime for the tree copies | Inference scripted (irrelevant to a display change) |
| Environment / fixture fidelity | 90% | 96% | Owned data root, packaged worktree build; data created through public APIs and an agent | — |
| Failure / edge / lifecycle | N/A | N/A | Display removal; no failure or lifecycle path changed | — |
| User-surface, browser, desktop | 85% | 98% | Desktop screenshots + DOM assertions at 1440×900; probes at 1512 and 390 px (PT-E2E-009) | zh-CN tree title checked in browser (PMU-025), not on the desktop |
| Durable regression coverage | 95% | 96% | Updated specs and probes pin the absence of the key and keep the other key surfaces | — |

- Overall final confidence: 97.2% (simple average of the six applicable categories)
- Every critical AC directly proven: `Yes`; no category below 90%; 95% target met: `Yes`

## Broader Validation Decision And Execution

- Decision: `Required` (AC-005); executed. Browser probes plus an isolated desktop instance (`iso-59740-05cd`, `--from-worktree`, owned data root).
- Environment: the scripted AGY CLI was set only in the owned root's `server-data/.env`, followed by a `restart` so the server read it. No provider calls. No Codex was used; per the user's standing instruction, any real-model run would use the Claude Agent SDK with Claude Haiku 5.5. None was needed for this display-only change.
- Effect on the user's running AutoByteus: `None`.

| Journey | Expected | Actual | Evidence | Result |
| --- | --- | --- | --- | --- |
| DSK-D1 Projects board | no key lines; summary first; keyed badge | 3 cards, 0 key lines; badge "Blocked by autobyteus-1", key in title | `dsk-d1-board-page-1440x900.png` | Pass |
| DSK-D4 Task page / picker | chip, rows, URL, picker keys | `autobyteus-2` chip; "autobyteus-1 To Do Design the board schema"; `#/…/tasks/autobyteus-2`; picker [autobyteus-2, autobyteus-1] | `dsk-d4-task-page-1440x900.png`, `dsk-d4-picker-1440x900.png` | Pass |
| DSK-D3 tree | summary only (Project + Temp copies); key-free title / name; locate works | "Build the API on the schema" / "Reply OK."; titles "Show Task in Projects: …"; located in the tab | `dsk-d3-tree-*.png`, `dsk-d3-located-1440x900.png` | Pass |
| DSK-D2 tab board / tab Task view | no key lines; badge; chip and rows kept | as expected | `dsk-d2-*.png` | Pass |
| G1 live schema | worker answer fields without `taskKey`; selection rejected | fields `description, projectId, status, taskId`; selection rejected with a `taskKey` validation error | `dsk-declutter.json` | Pass |

## Platform / Runtime Targets

- macOS arm64; Node v22.23.1; Electron worktree build (`AutoByteus_enterprise_macos-arm64-1.5.5-beta.3`); headless Chrome for the probes.

## Durable Coverage Changed In The Codebase

- By API/E2E: none. The durable test updates are the implementation's (listed in its handoff) and were executed here: web specs, server unit tests, `projects-feature-probe.mjs` PT-E2E-017 and `project-manager-ux-task-locator-cases.mjs` PMU-020/025.

## Temporary Execution Methods / Scaffolding

| Path / Method | Why | Cleanup |
| --- | --- | --- |
| `evidence/api-e2e/scripts/dsk-declutter.mjs` | AC-005 journeys and G1 on the packaged app | Kept as evidence |
| Isolated instance iso-59740-05cd + owned root `tkd2-desktop-root.*` | AC-005 | Stopped (ports released, not listed); root removed |

## Dependencies Mocked Or Emulated

- Agent inference: the scripted AGY CLI (`agy-failure-cli.mjs`). It only produces delegated copies for the tree; no real-model behavior is in scope.

## Result Summary

| Result | Case IDs | Summary |
| --- | --- | --- |
| Pass | B1, U1, U2, P1, P2, DSK-D1..D4, G1 | All ACs proven; no failure observed |

## Cleanup Performed

- Instance stopped; owned data root removed; probe stacks removed by the probes (cleanup receipts complete); no temp files left.

## Latest Authoritative Result

- Result: `Pass`
- Final validation confidence: 97.2%; 95% target met; no category below 90%
- Broader validation: `Required`, executed (browser + isolated desktop)
- Critical ACs lacking direct proof: none
- Behavior only the user can check: the user's own look at the beta release (Done-when). Delivery takes it to the user. The desktop screenshots above are the evidence they can compare against.
- Next recipient: per `get_handoff_rules` (direct route → delivery)
- Notes:
  - Residual risk RSK-001 (accepted by the user's direction): a badge names a key that no card shows.
  - The Product design record update (DEC-004) is routed via `/project_task_manager`, not this team.
