# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: /Users/normy/autobyteus_org/autobyteus-worktrees/file-explorer-pending-save-draft-preservation/tickets/in-progress/file-explorer-pending-save-draft-preservation/requirements-doc.md
- Investigation Notes: /Users/normy/autobyteus_org/autobyteus-worktrees/file-explorer-pending-save-draft-preservation/tickets/in-progress/file-explorer-pending-save-draft-preservation/investigation-notes.md
- Solution Revision Record: /Users/normy/autobyteus_org/autobyteus-worktrees/file-explorer-pending-save-draft-preservation/tickets/in-progress/file-explorer-pending-save-draft-preservation/solution-revision-record.md
- Design Spec: /Users/normy/autobyteus_org/autobyteus-worktrees/file-explorer-pending-save-draft-preservation/tickets/in-progress/file-explorer-pending-save-draft-preservation/design-spec.md
- Supplemental Task Artifacts: /Users/normy/autobyteus_org/autobyteus-worktrees/file-explorer-pending-save-draft-preservation/tickets/in-progress/file-explorer-pending-save-draft-preservation/evidence/ (reviewer probe, SD revalidation log; historical)
- Design Review Report / Architecture Review Revision Record: N/A — not applicable
- Implementation Handoff: /Users/normy/autobyteus_org/autobyteus-worktrees/file-explorer-pending-save-draft-preservation/tickets/in-progress/file-explorer-pending-save-draft-preservation/implementation-handoff.md
- Implementation Revision Record: /Users/normy/autobyteus_org/autobyteus-worktrees/file-explorer-pending-save-draft-preservation/tickets/in-progress/file-explorer-pending-save-draft-preservation/implementation-revision-record.md
- Code Review Report / Revision Record: N/A — not applicable (direct low-risk route)
- Delivery Revision Record / IDs: N/A
- API/E2E Revision Record: /Users/normy/autobyteus_org/autobyteus-worktrees/file-explorer-pending-save-draft-preservation/tickets/in-progress/file-explorer-pending-save-draft-preservation/api-e2e-revision-record.md
- Current API/E2E Revision ID: API-REV-001
- API/E2E Test-Case Ledger: /Users/normy/autobyteus_org/autobyteus-worktrees/file-explorer-pending-save-draft-preservation/tickets/in-progress/file-explorer-pending-save-draft-preservation/api-e2e-test-case-ledger.md
- Current Investigation Round: 1
- Trigger: Implementation Complete IR-001 / SR-001 handoff (dev commit 50f25f68d9)
- Prior Investigation Reviewed: None
- Latest Authoritative Investigation: this file

## Routing Classification

- Task size: Small
- Architectural risk: Low
- Input route: Direct Low-Risk
- Successful-output route: Delivery
- Proportional test-code review decision: Not Required — direct low-risk route

## Current Requirement And Design Basis

Editor input made while a Save of that file is pending must be kept as a draft (REQ-001). When the Save settles, the draft is cleared only if it equals the committed content then in effect (REQ-002..004). Ordinary Save, different later edit, clean undo with no Save pending, IR010 peer-refresh protection, preview/read-only and workspace/path isolation are preserved (REQ-005). Production change: `autobyteus-web/stores/fileExplorerContentActions.ts` only. RSK-001 (real Monaco echoing a spurious draft or model replacement) was explicitly left to this stage; escalation trigger: "real Monaco echoes a spurious draft" → Design Impact. Implementation handoff: Legacy/Compatibility and Persisted Data checks are clean (no compatibility mechanism, no persisted data).

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001, SCN-002, SCN-003 (SCN-004 peer refresh covered by existing unit/IR010 specs; see Not Tested).
- Real-use scenarios added: Save held with a real keyboard Ctrl/Cmd+S in real Monaco, then real Ctrl/Cmd+Z; clear-all with Select-all + Delete; retype of original text; Save failing while later input exists (reply arrives late as an error). Each enters through the real keyboard in the real editor on a real tree-opened file.
- Unsupported/contrived scenarios: none tested; a second concurrent Save per file is out of scope (guard unchanged).

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 pending-Save draft rule | Changed | design-spec, IR-001 | Unit regressions (exist) + real-Monaco probe PSD-001..005, 010, 011 |
| BEH-002 different later edit | Preserved | requirements | PSD-004 |
| BEH-003 clean undo, no Save pending | Preserved | requirements | PSD-009 + existing spec |
| BEH-004 failed Save / IR010 | Preserved | requirements | PSD-006/007/010/011; IR010 via existing specs |
| BEH-005 ordinary Save | Preserved | requirements | PSD-008 (also asserts no Monaco model change after Save) |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | No | — | — | — | — |
| API / transport / contract | No | writeFileContent unchanged | — | — | Probe uses the real server write |
| Frontend component / state | Yes | store draft rule + Save settle | Unit regressions with a textarea Monaco double | The double is not Monaco (RSK-001) | Browser probe with real Monaco |
| Browser integration / user journey | Yes | Monaco `modelValue` sync under a retained draft | none in repo | Spurious echo / model replacement | Browser probe |
| Authentication / session | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | Yes (same code) | same | — | — | Browser probe (web-equivalent) |
| Desktop shell / Electron | No | no shell code touched | — | — | None |
| Process / lifecycle; persisted data; worker; external | No | — | — | — | — |

## Project Execution Discovery

- Assigned worktree: /Users/normy/autobyteus_org/autobyteus-worktrees/file-explorer-pending-save-draft-preservation (branch codex/file-explorer-pending-save-draft-preservation, HEAD 50f25f68d9)
- Stack: Nuxt 3 / Vue 3 / Pinia web app, Fastify/GraphQL server (autobyteus-server-ts), Monaco via @monaco-editor/loader
- Testing guideline: /Users/normy/autobyteus_org/autobyteus-worktrees/file-explorer-pending-save-draft-preservation/TESTING.md ("Renderer UI, stores, client–server behavior that also runs in a browser" → web unit tests + a browser probe). No closer TESTING*.md.
- Conflicts: none. Note: Monaco loads from cdn.jsdelivr.net (loader default 0.55.1), so the probe needs network.
- Secrets required: No.

| Instruction Path | Purpose | Learned |
| --- | --- | --- |
| TESTING.md | layers / env | web unit via `pnpm -C autobyteus-web test:nuxt`, guards, browser probes under autobyteus-web/tests/e2e; build server `pnpm -C autobyteus-server-ts build` first; own ports/data/HOME; clean env |
| autobyteus-web/tests/e2e/search-pdf-preview-probe.mjs | existing probe template | temp host page mounting unchanged FileExplorerLayout, owned backend + Nuxt dev, clean env, group-kill cleanup |
| design-spec.md Guidance | validation intent | real Monaco typing, Ctrl/Cmd+S, undo during held Save response, completion, second Save |

| Component | Cwd | Start | Readiness | Cleanup |
| --- | --- | --- | --- | --- |
| Backend (dist/app.js, sqlite, temp data dir, free port) | autobyteus-server-ts | started by the probe | /rest/health | process group SIGTERM |
| Nuxt dev (free port, BACKEND_NODE_BASE_URL=backend) | autobyteus-web | started by the probe | page fetch OK | process group SIGTERM |
| Headless Chrome 155 | — | playwright-core | page load | browser.close |

| Data Need | Method | Safety | Cleanup |
| --- | --- | --- | --- |
| 11 synthetic text files "draft-a original", one per case; one workspace | `createWorkspace` GraphQL on an owned temp root | temp HOME/TMPDIR/data; no user data | temp root removed; evidence.json records `ownedRootRemoved` |

## Existing Durable Coverage Inventory

| Path / Test | Intent | Related | Validity | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| components/fileExplorer/__tests__/FileExplorerTabs.draftViewer.spec.ts (7 new IR-001 regressions + existing) | Tabs → FileViewer → store draft lifecycle with a textarea Monaco double | AC-001..AC-008 | Still Valid | assertions match approved behavior; hard assertions; AC-002/AC-004a already green on base (guards, not red→green) | None |
| components/fileExplorer/__tests__ (22 files), stores/__tests__/fileExplorer*.spec.ts, utils/fileExplorer/__tests__ | Adjacent File Explorer suite | AC-006..AC-008 | Still Valid | rerun green | None |
| tests/e2e/*-probe.mjs (other features) | other features | — | Out Of Scope | — | None |

## Durable Coverage To Add

| Case ID | Behavior | Evidence | Path | Why |
| --- | --- | --- | --- | --- |
| PSD-001..PSD-011 | Real-Monaco pending-Save draft preservation | AC-001..006, AC-008, RSK-001 | autobyteus-web/tests/e2e/file-explorer-pending-save-draft-probe.mjs, tests/e2e/fixtures/file-explorer-pending-save-draft.page.vue, package.json script `test:e2e:file-explorer-pending-save-draft` | The unit harness replaces Monaco with a textarea; only a real-editor probe can detect a Monaco echo/model replacement. Repository convention keeps such renderer journeys as browser probes. |

## Durable Coverage To Update / Remove

None.

## Repository Coverage Execution Plan And Results

| Order | Command | Cwd | Proves | Result | Evidence |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm -C autobyteus-web test:nuxt components/fileExplorer/__tests__ components/fileExplorer/viewers/__tests__ stores/__tests__/fileExplorerStore.spec.ts stores/__tests__/fileExplorerNodeRouting.spec.ts utils/fileExplorer/__tests__ --run` | worktree root | unit/component regressions and adjacent suite | Pass (22 files, 158 tests) | evidence/api-e2e-repo-checks.log |
| 2 | `guard:web-boundary`, `guard:localization-boundary` | worktree root | boundary rules | Pass | evidence/api-e2e-repo-checks.log |

No separate web typecheck script exists in autobyteus-web/package.json (grep for typecheck/vue-tsc found none); not run.

## Test-Case Ledger Decision

- Ledger required: Yes (11 independent real-editor cases) — /Users/normy/autobyteus_org/autobyteus-worktrees/file-explorer-pending-save-draft-preservation/tickets/in-progress/file-explorer-pending-save-draft-preservation/api-e2e-test-case-ledger.md

## Post-Repository Confidence Scorecard

| Category | Score | Support | Uncertainty | Improve |
| --- | --- | --- | --- | --- |
| Requirement/AC proof | 80% | hard-assert unit regressions for AC-001..008 | all with textarea double | real-editor probe |
| Changed-boundary directness | 80% | store+Tabs+FileViewer real | Monaco substituted | real Monaco |
| Cross-boundary realism / mock gap | 75% | GraphQL and Monaco mocked | RSK-001 open | browser probe |
| Environment/fixture fidelity | 80% | jsdom | no real browser | probe |
| Failure/edge/lifecycle | 85% | failed-save cases in unit | real editor echo unknown | probe |
| User-surface/browser | 60% | none in a browser | critical | probe |
| Durable regression quality | 85% | good unit regressions | no real-editor guard | add probe |

- Overall post-repository confidence: 78% (simple average of the seven categories, rounded)
- Every critical AC directly proven: No (AC-001 requires actual-editor validation)
- Any category below 90%: Yes — all
- 95% target met: No
- Residual risk: RSK-001 real Monaco echo.

## Broader Validation Decision

- Decision: Required
- Mode: Browser (headless Chrome, real Monaco, real server, owned stack)
- Gap addressed: RSK-001 and real keyboard/undo/save behavior
- Why it helps: only a real editor can show a model replacement or spurious draft; the probe counts model content-change events after the held response is released.
- Expected confidence after: ≥95%
- Browser-specific rationale: the changed behavior is a store↔Monaco sync question.
- Desktop shell: not applicable; no shell code touched. Web-equivalent only.

## Live Environment And Fixture Plan

- Startup order: backend → createWorkspace → temp host page copied into pages/ → Nuxt dev → warmup page (errors kept separately) → fresh validation page.
- Write control: Playwright `page.route('**/graphql')` on writeFileContent only: `hold` (real server writes, reply withheld until released), `holdfail` (reply withheld then GraphQL error), `fail`, `pass`. Everything else is real.
- Observations (read-only): Monaco editor value, Monaco model change events, Pinia file state (content, editorDraft, saveContentLoading, error), disk bytes, "Saving..."/"Changes saved" text, ordered mutation payloads.
- Evidence: evidence/api-e2e-final-run{1,2}/ (evidence.json, PSD-001-final.png, backend/frontend logs), api-e2e-base-run1 (same probe on base store).
- Cleanup: owned processes, temp root, temp host page, browser.

## Temporary Executable Validation Plan

None (the probe is kept as durable coverage). A base-store run of the same probe is a discrimination check only; the base store file was restored (git diff shows no change to it).

## Not Tested / Infeasible / Deferred

| Behavior | Reason | Risk | Only user? | Follow-up |
| --- | --- | --- | --- | --- |
| AC-004b "later peer refresh updates the clean editor" in the real editor | Peer refresh needs a watcher event; covered by unit AC-004b regression and existing refresh specs | Low | No | None |
| Electron shell / desktop instance | No shell code touched; web-equivalent renderer is the same code | Low | No | None |
| IR010 peer-modify draft protection in real Monaco | Unchanged code (fileExplorerTreeActions.ts); existing specs | Low | No | None |

## Ambiguities Or Reroute Triggers

None. Pre-existing Monaco `Canceled` unhandled rejection recorded (see report).

## Investigation Decision

- Proceed To API/E2E Execution: Yes
- Durable coverage added/updated/removed: Yes (added browser probe)
- Post-repository confidence: 78%
- Broader validation: Required (Browser)
- Reroute Required Before Validation Execution: No
