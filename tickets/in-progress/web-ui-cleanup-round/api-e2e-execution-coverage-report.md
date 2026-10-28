# API/E2E Execution Coverage Report

The run record and the result. The coverage investigation is the plan; `api-e2e-revision-record.md` is the history.

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: 1, implementation IR-001 complete (direct route, `Medium` / `Low`)
- Prior round reviewed: none
- Deviations from the investigation's plan, and why:
  - API-10 needed a baseline fix in its probe: harness drift that predates this ticket (see the case).
  - API-11's probe ignored `--output-dir <dir>` (it takes `--output-dir=<dir>`) and wrote into `autobyteus-web/test-results/`. The output was moved to `/tmp`; nothing was left in the worktree.
  - AC-011 needed one Work Journal for Memory search to be ready. One local turn on LM Studio was used (no provider credits), and the model was unloaded afterwards.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/web-ui-cleanup-round/tickets/in-progress/web-ui-cleanup-round/evidence/`

## Routing Classification

- Task size: `Medium`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery` (not reached: result `Fail`)
- Proportional test-code review decision: `Not Applicable` (Fail: failure-origin review requested)

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `b34c2a36ea` (+ the probe changes committed as `bacc8f51fd` and `a26305a2a7`) | macOS 26.5.2, Node v22.23.1 | Browser probes: probe-owned Nuxt dev and `autobyteus-server-ts/dist/app.js`, rebuilt from this worktree (`evidence/API-00-server-build.log`; the earlier build predated `f9c1a8d5e3`); headless Chrome 156; scripted AGY/Grok CLIs | Probe-owned data roots and ports |
| ENV-2 | `a26305a2a7` (code = `b34c2a36ea`'s code commits) | macOS 26.5.2 | Isolated desktop instance `iso-50076-407f` (`isolated-app start --build`); voice extension installed in it (runtime 0.3.0, `mlx-community/whisper-small-mlx`, MLX); LM Studio `qwen/qwen3.6-35b-a3b` for one local turn | Own data root (removed at stop); throwaway `CODEX_HOME` (removed); the user's AutoByteus and data untouched; the microphone emulated in the renderer only (`evidence/API-12-desktop-journey/tool-mic-inject.mjs`) |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-01…API-08 | as IMP-00…IMP-08 | contract, server, web suites, guards, Agent Runtimes probe, server e2e | Reused: IMP-00 … IMP-08 | — | Pass | — | — | Code unchanged since; see the investigation for why IMP-07/IMP-08 still hold |
| API-09 | AC-004 (SCN-002b), AC-003 | real stack: delegation tool results in the conversation; Run Settings rows | `node tests/e2e/delegated-launch-defaults-probe.mjs --output-dir /tmp/ab320e2e/API-09r2/out --ledger-file … --cases DLP-003,DLP-004,DLP-005` (cwd `autobyteus-web`) | ENV-1 | Pass (after a probe update) | `API-09-delegated-launch-probe-stdout.log` (run 1), `API-09-run1-actual-vs-expected.txt`, `API-09r2-delegated-launch-probe-stdout.log`, `API-09r2-DLP-003-agent-run-settings-880.png`, `API-09r2-DLP-003-conversation-squad-notes-1280.png` | Run 1: `Summary: 0 Pass, 3 Fail`; actual "its team default Antigravity CLI / … is not available on Antigravity CLI" vs probe-expected "antigravity_cli"; run 2: `Summary: 3 Pass, 0 Fail`; screenshot rows "Grok 4.7 · Grok Build", "Alt test model · Antigravity CLI" | The probe built its expected notes from runtime kinds; the product is correct. The probe now builds them through the contract's `agentRuntimeName` (`bacc8f51fd`); launch values keep kinds |
| API-10 | AC-003 | system-instruction labels | `node tests/e2e/system-instruction-activity-probe.mjs --output-dir /tmp/ab320e2e/API-10r2/out` | ENV-1 | Pass (after a baseline fix) | `API-10-system-instruction-probe-run1-failures.txt`, `API-10r2-system-instruction-probe-evidence.json`, `API-10r2-desktop-expanded.png` | Run 1: `BE2E-SI-001A` Pass with "AutoByteus-supplied · AutoByteus configured system prompt", "… Claude Agent SDK systemPrompt", "… Codex App Server baseInstructions", HARNESS Fail on browser errors; run 2: `result Pass`, `failures []` | Run 1 had WebSocket errors from the app shell's change feeds (`/ws/agent-package-definitions`, `/ws/update-notifications`, added 2026-10-12/20) and Apollo "missing field" errors (`listWorkspaceRunHistory`, `listCollaborationRootHistory`, `agentOrgDefinitions`). The probe's last real change is 2026-08-20, and this ticket touches neither. Cause in the probe's stub; baseline fix `a26305a2a7` (accept the WebSockets, answer those fields), TESTING Rule 9 |
| API-11 | AC-003 | Model Routing names (two nodes, scripted AGY) | `node tests/e2e/model-routing-decisions-probe.mjs` | ENV-1 | Pass | `API-11-model-routing-decisions-probe-stdout.log`, `API-11-MRD-04-run-settings.png` | `Pass MRD-01` … `Pass MRD-07`, `Model Routing decisions probe: Pass` | — |
| API-12 | AC-001, AC-002, AC-003, AC-010, AC-011, QR-001 | isolated desktop instance of this worktree | Journey in `evidence/API-12-desktop-journey/JOURNEY.md` (UI over CDP; DOM checks per page; the voice extension installed; Memory → Search by keyboard with the emulated microphone; the chat composer's voice button for comparison) | ENV-2 | **Fail** (one finding); every other check Pass | `API-12-desktop-journey/JOURNEY.md`, `FINDING-application-setup-runtime-kinds.txt`, the screenshots and JSON files listed in JOURNEY.md | Finding: `"text": "PACKAGE BASELINE /researcher · codex_app_server · gpt-5.6-luna …"`, `"visible": true`, `"technicalToggle": "Show technical details"`. Passes: see JOURNEY.md (e.g. voice: `"value": "Release notes for the voice input."` with no memory-search request; picker: Enter chose "ab320-picker-1 Task C (choosable)" with the newest option `aria-disabled`) | Group C icons all present (search magnifiers, argument trash, folder browse, toasts). Not reached in the app (component-tested in IMP-05): Qwen "API key configured" (the form validates the key with the provider: "Model discovery failed with status 401"), Migrations "Run" (no pending migration), the workspace list's empty state, Token Statistics names (no data in a fresh instance), the Embedding Waiting state (AC-007) and the skill-update card (AC-009) |

### Observations (not defects of this ticket)

- The voice button loses keyboard focus when recording starts and when it stops (it disables itself while starting and transcribing). The chat composer's voice button behaves identically (`voice-chat.json`; focus comparison: `"50ms after Enter (start)","BODY"`), so the new button matches the existing ones (QR-001). Recorded as follow-up FU-001.
- Model Routing's hint quotes what a user might type: "use Antigravity for writing". It's an example utterance, not a runtime label; left to the reviewer's judgement.
- Server Settings: "Add agent" / "Add team" (FeaturedCatalogItemsCard) and the media-model selects show icons. `3a87152631` did not touch them, so they were visible before beta 15 and are out of scope.

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-05 (IMP-05 sidebar test), API-07 (IMP-07), API-12 | Proven | — |
| AC-002 | Yes | API-05 (component tests), API-12 (every group A/B page reachable in the app; group C kept) | Proven | — |
| AC-003 | Yes | API-05, API-07, API-09, API-10, API-11, API-12 | **Not Proven**: the Application launch setup summary shows runtime kinds (API-12 finding). Every other surface shows full names | — |
| AC-004 | Yes | API-03/04/08 (IMP), API-09 | Proven | — |
| AC-005 | Yes | API-02 (IMP-01) | Proven for maps (no other name map). The finding is a place that shows the kind without any map | — |
| AC-006 | No | GLOSSARY (implementation) | Proven (review) | — |
| AC-007 | Yes | API-05 (component test, both model states, both languages) | Proven (component level; not reachable in the fresh instance without an embedding model and a Task) | — |
| AC-008 | No | — | Product Team record (`a938d892b3`), outside API/E2E | — |
| AC-009 | Yes | API-03 (builder test), API-05 (card test) | Proven | — |
| AC-010 | Yes | API-00 (IMP-00), API-05, API-12 (real app) | Proven | — |
| AC-011 | Yes | API-05, API-12 (real extension, real transcription, emulated microphone) | Proven | A real microphone and speech: optional user check |
| AC-012 | Yes | API-02…08 | Proven for the suites; the clean-clone proof is delivery's | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 80% | 75% | All ACs but AC-003 proven | AC-003 fails at one surface | Fix and recheck the launch setup summary |
| Changed-boundary execution directness | 80% | 95% | Rendered pages in the desktop app; real extension | — | — |
| Cross-boundary integration realism and mock gap | 75% | 95% | Real server texts read in the web (API-09, API-11); real voice IPC and transcription | The microphone is emulated | User check (optional) |
| Environment, configuration, identity, and fixture fidelity | 85% | 95% | Worktree desktop build, own data root | — | — |
| Failure, edge-case, lifecycle, and recovery evidence | 85% | 95% | Voice: no speech, failure text, mic denied, unavailable, not ready; picker loop option | — | — |
| User-surface, browser, and desktop-shell confidence | 60% | 85% | API-12 | One user-visible surface shows kinds | Fix |
| Durable regression coverage quality and relevance | 90% | 90% | Component and server tests; probes updated | No test asserts the launch setup summary's runtime text | A component test with the fix |

- Overall post-repository confidence: 79%
- Overall final confidence: 90% (simple average: 75, 95, 95, 95, 95, 85, 90)
- Every critical acceptance criterion directly proven: `No` (AC-003)
- Any final applicable category below `90%`: `Yes`: requirement proof, user surface
- Default final confidence target of `95%` met: `No`

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `Browser` (probes) + `Project Desktop Validation` (isolated instance with the voice extension)
- Gap: rendered pages, live run views, the voice extension path. Closed except for the finding.

## Desktop Application Validation

- Approach executed: isolated instance of the worktree build, CDP control; voice extension installed in its data root; microphone emulated in the renderer
- Web-equivalent cases: icons, names, picker. Shell-specific: voice extension install, enable, language, transcription IPC.
- Effect on the already-running desktop application: `None`

## Compatibility / Legacy Scope Check

- Backward compatibility introduced or tolerated in scope: `No`; compatibility-only behavior observed: `No`; durable coverage for compatibility-only behavior: `No`

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`

| Path / Test | Change | Case IDs | For A Removal |
| --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/delegated-launch-defaults-probe.mjs` (`bacc8f51fd`) | Updated: expected launch notes and model-availability reasons through `agentRuntimeName` | API-09 | — |
| `autobyteus-web/tests/e2e/system-instruction-activity-probe.mjs` (`a26305a2a7`, baseline fix) | Updated: accepts the app shell's WebSockets and answers the run-history/Org root fields | API-10 | — |

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Microphone | Renderer `getUserMedia` returns a WAV-backed MediaStream (macOS `say`, silence) or rejects `NotAllowedError` | No speaker; the OS permission prompt for a new app bundle | Real capture and OS permission dialog not exercised |
| Runtime CLIs in probes | Scripted AGY/Grok | Deterministic | None for names |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Isolated instance `iso-50076-407f` (with the voice extension, a dummy MCP server, a test Project, Brief Studio) | Yes | `isolated-app stop` | `dataRootRemoved: true`, both ports released, `list` empty (the stop was forced after the graceful close); no voice worker left |
| Throwaway `CODEX_HOME` | Yes | Removed | — |
| LM Studio `qwen/qwen3.6-35b-a3b` (loaded by the one local turn) | Yes | `lms unload` | "No models are currently loaded." |
| Probe output written to `autobyteus-web/test-results/` (API-11) | Yes | Moved to `/tmp` | Not in the worktree |
| `/tmp/ab320e2e/` (raw outputs, audio files) | Yes | Kept outside the repo | — |

## Preliminary Classification (On `Fail`)

- `Local Fix` (implementation). REQ-003 says "every runtime name shown by the web app … is the full name". The Application launch setup's authority summary, visible by default, prints `leaf.runtimeKind` in three places (`ApplicationExecutionResourceSlotEditor.vue:52,64,88`); `agentRuntimeName` would give the full name there. The design's census missed it, so it may also be read as a small `Design Impact`. One point for the reviewer: the block mixes user-facing rows with technical identifiers (`PACKAGE_TEAM_DEFAULT:bundle-team__…`, `llmConfig: none · workspace: APPLICATION_RUNTIME`). If the block is considered technical metadata, it belongs behind "Show technical details", which is a scope question for the Solution Designer.
- Recommended owner: implementation engineer, after failure-origin review.

## Latest Authoritative Result

- Result: `Fail`
- Criteria not proven: AC-003 (one surface)
- Preliminary classification and recommended owner: `Local Fix`, implementation engineer (failure-origin review first)
- Next recipient from `get_handoff_rules`: Code Reviewer (failure-origin review)
- Notes: everything else passed in the app. A rerun after the fix needs only the launch setup check (a component test plus a look), unless the fix touches more.
