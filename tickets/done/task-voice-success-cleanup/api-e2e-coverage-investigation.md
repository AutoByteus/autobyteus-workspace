# API/E2E Coverage Investigation
## Meta and authority
Round 1, IR-001 initial implementation; SR-002 approved requirements, SR-003 design. No prior API result.
Canonical package directory: tickets/in-progress/task-voice-success-cleanup in this worktree.
Read requirements-doc.md, investigation-notes.md, solution-revision-record.md, design-spec.md, solution-handoff.md, implementation-handoff.md, implementation-revision-record.md and implementation-evidence/rendered-check.md.
Architecture/source reviews and delivery revisions: N/A — not applicable.
Medium / Low; Direct Low-Risk; successful output Delivery; test review Not Required — direct low-risk route.
## Scope and scenarios
SCN/BEH-001–003, REQ/AC-001,002,004. AC-003 withdrawn.
Task success has no banner or reserved node; project create/edit appends into latest editable description, never auto-saves, preserves pending Save guard, feedback/cancel/lifetime isolation. Optional blank project/workspace descriptions, attachments and manual persistence remain.
Real triggers: Start/Stop button and keyboard, typing during capture, Save, Cancel/back navigation during pending transcription, retry after error/no speech. No contrived multi-tab/node race added.
Changed components/status/state and web-equivalent Electron renderer: Yes. Capture lifecycle integration: consumer changed, native implementation unchanged. Backend/API/schema/auth/worker/distributed/shell: unchanged. External provider remains existing optional dependency.
Legacy removal and persisted-data checks read: no retained compatibility path; voiceReady entries removed, store terminal success valid elsewhere. Persisted data Not Affected; no schema/read/write transformation. Verify representative blank projects through real current CRUD anyway.
## Execution discovery
Worktree /Users/normy/autobyteus_org/autobyteus-worktrees/task-voice-success-cleanup, branch codex/task-voice-success-cleanup.
Authorities read: root AGENTS.md, TESTING.md (only applicable guideline), README.md local development; autobyteus-web/AGENTS.md, README.md testing, package.json, existing projects-feature-probe.mjs and composer-voice-lifetime-probe.mjs/fixture; server AGENTS.md.
Nuxt/Vue/Pinia renderer, Vitest Nuxt environment; pnpm test:nuxt must use --run. Browser dev-path is correct for changed renderer; do not use installed desktop. Existing Projects probe builds current server, migrates disposable SQLite nodes, starts Nuxt/free ports, drives real routes/API and removes owned processes/data. Existing voice probe demonstrates synthetic native Chrome microphone and actual AudioWorklet with transcription IPC fixture. No secrets required.
Use existing Projects full-stack probe extended with opt-in voice journeys and isolated fake-device Chrome. Native shell/model is emulated only at extension-state/transcribe methods, not voice store or editor. Actual microphone permissions/physical device/provider/package unchanged and not certified. User app/data untouched.
## Inventory and decisions
| Existing coverage | Decision | Scope / evidence |
|---|---|---|
| projects/__tests__/ProjectEditor.spec.ts | Still Valid | optional create/edit, latest draft, save guard, stale target, unavailable voice; mocked stores |
| projects/__tests__/ProjectVoiceStatus.spec.ts | Still Valid | target status, cancellation, retained errors, removed success |
| projects/__tests__/TaskDescriptionComposer.spec.ts | Still Valid | text/context retention; mocked voice |
| other projects component suites | Still Valid | adjacent detail/list/board regression |
| composables/projects/useProjectTaskDraft.spec.ts | Still Valid | existing draft, manual save, lifecycle |
| stores/voiceInputStore.spec.ts | Still Valid | shared store failure/startup/cancel/late response and both target sources |
| tests/e2e/projects-feature-probe.mjs | Needs Update | preserve all 16 existing real CRUD journeys; add optional voice cases |
| tests/e2e/composer-voice-lifetime-probe.mjs | Still Valid, not selected | native audio pattern reused; unrelated Chat/Team behavior unchanged |
No stale tests removed. No uncertain intended behavior or reroute.
## Durable additions and execution plan
1. R-001 focused project/status/task component specs.
2. R-002 broader projects components/draft/voice store/capture tests and localization guard.
3. B-001–006 new opt-in native-browser voice journeys: project create/edit explicit persisted save; task create/edit quiet success; no-speech/error retry; recording cancel; navigation pending-result rejection; optional blank save/read.
4. Existing PT-E2E-001–016 full-stack Projects regressions.
Add helper under tests/e2e and wire option into existing Projects probe; no production changes or test removals. Ledger required for multi-case/build interruption risk; initialized before execution.
Broader validation Required: component mocks bypass integrated native capture, status rendering, real persistence/navigation and timing. Repository scores pending execution. Expected 95%+ if actual renderer/store/native worklet/API paths pass. Physical mic/provider/packaged shell not changed and outside certification.
Retain logs/JSON/screenshots in api-e2e-evidence; per-case ledger appended immediately. Owned backend data root and frontend/browser cleaned by harness; do not stop unrelated resources.

## Repository results and broader gate
R-001: 17/17 across 3 components, focused.log. R-002: 72/72 across 9 affected files, broader.log; localization guard passed, guard.log.
| Mandatory category | Post-repository confidence | Evidence / remaining gap |
|---|---|---|
| Requirement/AC proof | 90% | scoped assertions strong; live composed paths still needed |
| Changed-boundary directness | 90% | components and real store independently tested, not together |
| Cross-boundary realism/mock gap | 75% | stores/native/CRUD bypassed in components |
| Environment/config/identity/fixtures | 75% | Nuxt test DOM, no browser/native/API composition |
| Failure/edge/lifecycle/recovery | 90% | focused store and target guards; navigation runtime pending |
| User surface/browser/shell | 75% | implementation preview indirect; independent run needed |
| Durable regression relevance | 95% | requirement-linked valid tests plus new browser cases |
Average 84.29%; not a Pass, critical integrated paths not directly proven. Broader Required, selected documented browser full-stack Projects probe with opt-in voice cases. Shell unchanged; real native browser capture and synthetic device plus stub IPC narrow the mock gap without using user app or provider credentials.

### Browser attempt 1 harness correction
Existing PT-E2E-001–016 passed. New fixture installed electronAPI before browser bootstrap, incorrectly selecting a shell endpoint without its context. B-001 could not load editor (500 browser endpoint ownership); dependent voice cases cannot prove product behavior. This is API-owned fixture setup, not an implementation failure. Preserve browser-1 JSON/screenshots/logs. Correct fixture to install voice-only bridge after actual browser endpoint bootstrap and initialize actual extension/voice stores via Vite imports; no operation/result/store-state substitution. Rerun full probe in fresh owned output. This improves environment fidelity without weakening product assertions.
Browser attempt 2 reached native capture/actual worklet/transcript insertion (nonempty WAV and ended native tracks), but retained fixture electronAPI also conflicted with the normal browser HTTP endpoint policy at Save. This is the same fixture ownership issue, not a product save defect. Further isolate bridge presence to voice initialization/capture/IPC entry, remove it before browser persistence/navigation; pending promise remains controlled and late-delivery assertions unchanged. Retain attempt-2 failure evidence. No production code changed.

## Final investigation update
Browser-3 and browser-final: all 22 cases Pass; no browser page errors. Browser-final reruns the final durable code, adds immediate recording/quiet-success/narrow screenshots, explicit browser-close receipt, browser version and a page-error gate. Real GraphQL/database state corroborates explicit saves and absence of autosave. Native WAV samples and track disposal corroborate microphone/worklet use. All critical AC-001/002/004 directly proven across repository and browser/API evidence.
Actual broader command contained an unmatched utils/__tests__/voiceInputCapture.spec.ts filter (no such file); the 72 tests are the nine files listed in broader.log, including useProjectNotice, not a standalone capture suite. Store and native-browser cases provide capture evidence. No skipped tests are counted as proof.
Final confidence 95% (seven categories each 95%, rationale in report). Broader Required and completed. No unresolved requirement/design ambiguity or product failure. No test removal. Added TESTING.md run instructions and updated existing probe rather than a parallel server harness.
