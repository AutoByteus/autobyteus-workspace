# API/E2E Coverage Investigation

## Investigation Meta
Round 1; initial CRR-001 pass. Requirements R1/SR-001, design SR-002, ARCH-REV-001 Pass, IR-001, CRR-001 Pass. Medium / High, Reviewed route. Canonical upstream files (all ticket-relative): requirements-doc.md, investigation-notes.md, solution-revision-record.md, design-spec.md, solution-handoff.md, design-review-report.md, architecture-review-revision-record.md, implementation-handoff.md, implementation-revision-record.md, code-review-report.md, code-review-revision-record.md, follow-ups.md. Supplements: probes/native-history.cjs and evidence/native-history.json (dependency only); IMP-01–10 retained evidence. No Product supplement, delivery record or earlier API result. Current API revision pending first result.

## Current Requirement And Design Basis
Prove active-tab native Back/Forward, independent histories and accurate capability projection, full/same-document traversal and forward truncation, event settlement rather than acceptance, no selection theft, safe lease/IPC gates, draft retention and other browser controls. SCN-001–005 all supported; none classified contrived. Additional contract cases exercise malformed input/foreign attachment through actual preload; simulated native-dispatch exceptions and foreign leases remain repository evidence. AC-006 merge/archive is explicitly delivery-owned; this stage proves retained validation, isolation and its own cleanup, not final integration.

## Changed Behavior And Boundary Classification
| Boundary | Change | Repository coverage / remaining gap |
|---|---|---|
| Renderer component/store | Added controls, required flags, narrowed draft watch | Mocked component/store tests valid; rendered focus, geometry and actual events need desktop |
| Preload/IPC/main authority | Added active-only history command, sender-derived authority | Controller/IPC tests valid; actual preload round trip needed |
| Chromium/WebContentsView | Native traversal plus observer extraction | Fake native views do not prove committed content/history; desktop required |
| Lifecycle | Preserve tab selection/leases/popup/title/destruction | Mocked regressions valid; pending traversal switch/close plus popup native proof |
| Backend/domain/auth/persistence/workers/external provider | Not affected | No server suite, migration, keys or real sites needed |

## Project Execution Discovery
Worktree: /Users/normy/autobyteus-org/autobyteus-task-worktrees/embedded-browser-history. macOS arm64 Electron 42.11.16, Node 22.23.3, pnpm 10.28.x. Root TESTING.md is sole applicable testing guideline; root and web AGENTS.md, docs/isolated-app-instances.md, skills/autobyteus-isolated-app/SKILL.md, web package.json, electron/vitest.config.ts and existing tests/e2e/isolated-app-lifecycle-probe.mjs consulted. No instruction conflict. No secrets required.
Commands from root: pnpm -C autobyteus-web test:electron --run browser/__tests__; test:nuxt --run <focused paths>; transpile-electron; guard:web-boundary; guard:localization-boundary; audit:localization-literals. Run once/by impact; no installed app, parallel build or user app control. Current worktree build is retained from IMP-07; only artifact files changed since its source 7e2704199a6cf192546506f7e265301aee014dc0. New test-only probe need not rebuild production.
Desktop start: pnpm --silent isolated-app start --from-worktree (or equivalent project CLI used by existing lifecycle probe); readiness receipt must identify private root/control/backend ports. Attach playwright-core CDP only to returned endpoint, normal UI inputs; read-only shell snapshots and fixture state for proof. Local HTTP fixture owns ephemeral loopback port, no accounts/providers. Stop only returned instanceId with canonical CLI, verify root deletion/ports free, close fixture and connections. Native-window screenshots use owned PID/window only; CDP renderer captures cannot prove native overlay.

## Existing Durable Coverage Inventory
| Paths (under autobyteus-web) | Intent / criteria | Validity | Action |
|---|---|---|---|
| electron/browser/__tests__/browser-shell-controller.spec.ts | AC-001/002/004 lease/active/error/event/no-op; existing bounds/emulation/popup | Still Valid | Reuse IMP-01 |
| electron/browser/__tests__/browser-tab-manager.spec.ts | AC-002/004/005 native lifecycle/readiness/popup/emulation | Still Valid | Reuse IMP-01 |
| electron/browser/__tests__/browser-tab-observers.spec.ts | AC-003/004 title, frame-safe URL, same-URL, stop, destruction | Still Valid | Reuse IMP-01 |
| electron/browser/__tests__/register-browser-shell-ipc-handlers.spec.ts | AC-004 actual sender/unavailable runtime | Still Valid | Reuse IMP-01 |
| Remaining five browser Electron test files | Preserved profile/runtime/view/screenshot boundaries | Still Valid | Reuse IMP-01 |
| stores/__tests__/browserShellStore.spec.ts | AC-003/004 flag-only apply/error, missing API | Still Valid | Reuse IMP-02 |
| components/workspace/tools/__tests__/BrowserPanel.spec.ts | AC-001/003/005 labels/disabled/draft/control regressions | Still Valid | Reuse IMP-02 |
| tests/e2e/isolated-app-lifecycle-probe.mjs | Launch mechanics unchanged | Out Of Scope for rerun | Reuse documented setup, not repeat unrelated lifecycle suite |

## Planned Cases
| Case | AC | Boundary / kind | Steps / rationale |
|---|---|---|---|
| API-01 | 001–005 | Repository / Reused | IMP-01 39 Electron + IMP-02 19 renderer tests; exact headers/counts inspected, git diff 7e270419 HEAD ticket-only |
| API-02 | 005/006 | Build/contracts / Reused | IMP-03–06 tsc/guards + IMP-07 build; unchanged exercised source/build inputs |
| API-03 | 001 | Desktop / Durable | UI A→B→C, Back B/A, Forward B/C, content/URL/flags/entry length |
| API-04 | 003/005 | Desktop / Durable | Hash, pushState, replaceState, same-URL state commits, flag-only draft retention, Back→link/address truncation |
| API-05 | 002/004 | Desktop / Durable | Two independent tabs; stale/inactive/unavailable/malformed/unattached preload; pending traversal switch/close; no late selection |
| API-06 | 004/005 | Desktop / Durable | Local load failure then history recovery; popup title/traversal/close and destruction preservation |
| API-07 | 005 | Desktop / Durable plus observed native captures | Normal/minimum panel and full-view, mobile/desktop, keyboard activation/disabled, refresh |
| API-08 | 006 | Lifecycle / Durable | Canonical stop, private root removed, ports closed, fixture shutdown; no release/install |

## Durable Coverage Decision
Add tests/e2e/embedded-browser-history-probe.mjs with local deterministic fixture and optional case filtering. Native regression warrants repeatable repository coverage, not only temporary manual observations. No updates/removals to valid existing tests; no compatibility coverage. Discover script through package.json test:e2e:embedded-browser-history. Screenshot capture may be ticket-owned platform observation instead of requiring macOS-specific tooling for every probe run.

## Persisted Data / Desktop / Live Environment Plan
Persisted data Not Affected (design and IR agree), no migration/reset/new history store. Fresh isolated app root only; no original app/partition/data touched. Real shell/renderer/IPC/Chromium exercised; no web-only substitute. Local fixtures model ordinary links, user-gesture SPA controls and slow/error HTTP response; no synthetic product store mutation. Controlled server delay models ordinary pending network request. Native-dispatch throw, foreign lease and absent runtime use retained mocked regressions because inducing those via production mutation would be artificial and unsafe. No unsupported scenarios planned.

## Not Tested / Deferred / Reroute Triggers
Release/install, integrated merge/archive and branch/worktree deletion belong to delivery; FU-001/002 deferred, unchanged. Native unload/form policy exhaustive matrix outside approved scope. Any ordinary supported journey failure must be diagnosed and routed, not weakened to invoke/index success. No ambiguity currently; proceed Yes, durable coverage added Yes, pre-execution reroute No. Progress log required Yes.

Execution refinement: API-03–05 pass. API-06 initial run reached a native failed request but probe incorrectly called the recorded URL string as a function. Correct only API-06 predicate and rerun API-06; API-07 never ran. No production/harness/fixture change; API-03–05 remain valid. Initial failed evidence retained, no product defect inferred. Startup selector previously corrected from button role to visible Browser tab text based on actual DOM.

API-06 diagnosis: requestfailed fires before native error-document/stop settlement; an immediate UI/native comparison raced. One diagnostic run waited and observed chrome-error://chromewebdata/ plus ERR_EMPTY_RESPONSE, expected false/true flags and successful recovery/popup paths. Final durable case now waits main-frame frameStoppedLoading, error-document commit and shell URL/capabilities before asserting. Only API-06 changed; rerun it and pending API-07. No source correction or product failure established.

API-07 initial run proved keyboard/refresh/normal drawer but expected a dock resize handle in responsive drawer mode. Read WorkspaceToolShell/responsive policy and captured native view: expanded left sidebar makes 1200px use a drawer. Correct only API-07 setup to close drawer, collapse left sidebar and reopen tools through UI, then drag the real dock handle to 400px minimum. No product/style/store mutation or app resizing required; API-03–06 remain valid.

Final additional case API-09 (Existing Test/inspection, AC-006): node --check added probe; git diff --check; verify final result files and all owned roots/ports absent; retain exact probe SHA-256 and change impact. No production changes, no additional broad suites.
