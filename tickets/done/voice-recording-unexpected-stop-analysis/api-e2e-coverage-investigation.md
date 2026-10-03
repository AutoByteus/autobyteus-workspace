# API/E2E Coverage Investigation

## Investigation Meta
- Owner/date: /api_e2e_engineer, 2026-10-03. Initial round 1; latest authoritative investigation is this file. No prior completed API/E2E round existed at intake; current completed baseline **API-REV-001**.
- Assigned worktree: /Users/normy/autobyteus_org/autobyteus-worktrees/voice-recording-unexpected-stop-analysis, branch codex/voice-recording-unexpected-stop-analysis, development HEAD f1243aba0254f16eb47710a63c7c9ab195148ae5.
- Canonical upstream files (all under this worktree's tickets/in-progress/voice-recording-unexpected-stop-analysis/): requirements-doc.md, requirements-approval.md (AP-001), investigation-notes.md, design-spec.md, solution-handoff.md, solution-revision-record.md (SR-001–003), analysis-result.md, stable-release-impact-result.md, implementation-handoff.md and implementation-revision-record.md (IR-001). Complete upstream package read; retained evidence is factual, not a replacement specification.
- Supplemental evidence: all original source/probe/stable evidence and IR-001 tests/build/preview artifacts inventoried by those handoffs. Historical pre-fix probes will not be overwritten or executed as fixed-code success.
- Independent architecture-review and source-review reports/revision records: **N/A — not applicable**, direct Small/Low route. Delivery re-entry/revision: N/A — initial validation.
- Canonical output paths: this directory's api-e2e-execution-coverage-report.md, api-e2e-revision-record.md (created after completed round, API-REV-001), api-e2e-test-case-ledger.md.
- Trigger: Implementation Complete IR-001; independent investigation/validation requested.

## Routing Classification
- task_size **Small**, architectural_risk **Low**, confirmed bounded production change to one adapter; input **Direct Low-Risk**. Success route subject to live rule lookup; expected Delivery.
- Proportional test-code review: **Not Required — direct low-risk route**. Added executable coverage does not change production architecture or approved behavior.

## Current Requirement And Design Basis
BEH/REQ/AC-001: same eligible exact context and binding must survive unrelated Team publications, retaining recording and operable manual Stop without resource disposal/IPC. BEH/REQ/AC-002: actual replacement (even same runId), null/read-only, node change and owner teardown retire the old sink; no late output migration and no other-owner cancellation. BEH/REQ/AC-003: deliberate Stop keeps FLUSH/transcription/single draft append, existing draft and no automatic Send. AP-001 explicitly approved bounded repair with simulated-microphone disclosure. SR-003 only establishes historical stable exposure; no new design/release authority. Private per-mounted-owner record is the approved existing-owner correction; generic button/store/media/IPC remain unchanged.

## Supported Scenarios And Real Usage
- SCN-001 ordinary selected Team-member dictation while TWO OTHER members communicate; SCN-002 genuine member navigation/node/teardown; SCN-003 explicit Stop.
- Added execution variants within these same supported scenarios: delayed microphone acquisition, pending FLUSH/IPC while a normal publication arrives, genuine navigation during those phases; shared run input vs Chat caller; multiple mounted owners and Project/settings isolation. These timings occur in normal async use, not fabricated simultaneous user sessions.
- Contrived/unsupported scenarios: None selected; no sub-tick invisible departure, cross-tab race, or intentional context corruption is a requirement.

## Changed Behavior Summary
| Behavior/boundary | Type | Basis | Coverage consequence |
| --- | --- | --- | --- |
| BEH-001 exact sink reuse | Changed | F-001, AP-001, DS-001 | Prove actual wrapper changes and uninterrupted owned capture |
| Old per-publication allocation | Removed | Design clean-cut removal | Red provenance retained; no fallback/compatibility mode |
| BEH-002 lifetime/currentness | Preserved/strengthened | DS-002 | Exact context/access/binding/owner invalidation, late results and owner isolation |
| BEH-003 draft/Stop | Preserved | DS-003 | Existing draft + once, no send; no-speech/error tests |

## Changed Surface And Boundary Classification
| Surface | Affected? | Changed boundary / available evidence | Gap / selected surface |
| --- | --- | --- | --- |
| Domain/backend, API/schema/transport | No production change | Team DTO schema/publication path used; sender transport unchanged | No backend/model suite required for local identity correction |
| Frontend state/components | Yes | Adapter mounted-hook, real Team projection/button/store integration | Actual browser rendering/timing and BOTH caller components |
| Browser integration/web-equivalent desktop renderer | Yes | Happy-dom covers Vue but substitutes media/worklet | Chrome dev-path using actual getUserMedia, AudioContext and production worklet with synthetic device |
| Authentication/session/permission policy | No policy change | Native browser permission/device startup/error unit coverage | Synthetic Chrome grant is not OS microphone authorization |
| Desktop shell/IPC, external transcription | No production change | Existing direct fake-worker integration and IPC-lifetime store tests | Browser fake IPC not native shell/model certification; no shell gap introduced by adapter |
| Process/lifecycle | Mounted-owner only | Unmount, generation, resource disposal | Browser observe real tracks/context states |
| Persisted-data transition | No | Design/IR Not Affected, existing draft merge | No DB/schema writer/migration affected |
| Workers/queue/distributed | No worker code change | Real browser AudioWorklet adds capture fidelity | No provider/distributed system claim |

## Project Execution Discovery
- Root TESTING.md applies; no closer TESTING*.md found between root and changed code. Applicable autobyteus-web/AGENTS.md read. No conflicting instruction; no secrets/accounts required.
- Instruction/config paths: root README.md Local full-stack/Packaged testing; autobyteus-web/README.md environment/development/testing; ARCHITECTURE.md Testing Strategy; docs/electron_packaging.md Capture Startup And Ownership; package.json; nuxt.config.ts; vitest.config.mts; tests/setup/{websocket,localization}.ts; existing tests/e2e/fresh-run-auto-approval-probe.mjs (owned temporary page/Chrome/Nuxt convention) and its fixtures. No container/DB/seed setup required by selected renderer surface.
- Commands: pnpm -C autobyteus-web test:nuxt <paths> --run (no watch); browser dev-path probe per TESTING.md for renderer change; package web build after removing temporary page. No installed/user app or shared data allowed. Full product/shell journey would require isolated current-worktree desktop build; not selecting that unchanged boundary.
- Environment already local: Node v22.23.1, pnpm 10.28.2, macOS arm64. Isolated dependencies and four contract builds/nuxt prepare from IR-001 available; verify via tests rather than modify shared install. Untracked application-SDK dist must not be staged.
- Browser setup: new repository-resident probe with owned free port, BACKEND_NODE_BASE_URL=http://127.0.0.1:9, sanitized child environment, headless Chrome fresh profile; synthetic audio device/automatic grant flags. Minimal Team seeded with project fixture builder into actual context/selection stores; no database, credentials or user state. Native AudioContext/worklet not replaced. Transcription response only is fixture-controlled. Send action count records actual activeContext action attempts, not an unused diagnostic field.
- Readiness: exact temporary route responds and ready DOM/store/device conditions. Cleanup: owned Chrome/profile, own Nuxt process group/port and installed page only; retain logs/screenshots. Abort on occupied page, never overwrite.

## Persisted Data Transition Coverage Basis
**Not Affected**, confirmed against adapter-only git diff and IR legacy/data checks. No backward-compatible reader, version shim or retained legacy path. Existing draft is transient and kept through normal append path; no migration/representative database needed.

## Existing Durable Coverage Inventory
All paths below are relative to autobyteus-web/; every meaningful case in these files inspected against approved intent.
| Path/cases | Intent/REQ | Decision | Action |
| --- | --- | --- | --- |
| composables/voiceInput/__tests__/useComposerVoiceTarget.spec.ts (7) | Exact reuse, same-runId replacement/no revival, null/read-only return, binding/same binding, separate owner/unmount, initial null; REQ-001/002/003 | Still Valid | Independently rerun unchanged |
| tests/integration/composer-voice-lifetime.integration.test.ts (13) | Actual Team publication + projection + adapter/button/status/store, repeated publication/Stop, member/node/unmount, startup/FLUSH/IPC preserve vs invalidation, same-context owners, Project/settings isolation; all ACs | Still Valid | Rerun; notes: selected context providers and media/IPC mocked; no real browser/media claim |
| stores/__tests__/voiceInputStore.spec.ts (19) | Startup duplication/resource/permission failures, matched cancellation, transcript/no-speech/empty/error, stale output, device/resume/watchdog/settings/FLUSH/IPC | Still Valid | Broader affected run; stable fake sinks don't prove adapter |
| components/agentInput/__tests__/AgentUserInputTextArea.spec.ts (17), TeamComposerPublication.spec.ts (4) | Mic/status/startup/Send/drafts and complete publication; REQ-002/003 | Still Valid | Preserve/run unchanged; local component doubles are limited evidence |
| components/chat/__tests__/ChatComposer.spec.ts (5) | Footer/order and draft/action rules, shared caller | Still Valid | Preserve/run; browser will join actual caller/adapter |
| composables/projects/__tests__/useProjectTaskDraft.spec.ts (5) | Draft edits, Save/remove/upload isolation | Still Valid | Preserve/run; not full Project voice/browser proof |
| tests/integration/voice-input-extension.integration.test.ts (2) | Immutable HTTP asset installation + real managed service/fixture subprocess → guarded store append | Still Valid | Run as adjacent unchanged API/process contract; synthetic worker, not official model |
| tests/integration/web-boundary-guard.integration.test.ts (3) | No web/core illicit dependency | Still Valid | Preserve/run prerequisite, not product pass |
| Other desktop/full-stack/provider/browser suites | Other boundaries and UI policies | Out Of Scope | No broad/full workspace pass inferred |

## Durable Coverage To Add
| Case IDs | Planned paths | Why |
| --- | --- | --- |
| B-001–B-007 | tests/e2e/composer-voice-lifetime-probe.mjs; tests/e2e/fixtures/composer-voice-lifetime.page.vue; package.json test:e2e:composer-voice-lifetime | Existing repository browser-probe convention; repeatable actual run/Chat callers + native browser/worklet capture; lifetime bug deserves durable browser regression instead of one-off preview |
API harness attempt1: B-001 failed before recording because native textarea advertises combobox with live mention scope, not textbox. Correct locator to native textarea; no product assertion changed. Browser/owned server/page cleaned; attempt evidence retained. This is Local Fix — API/E2E test selector, not an implementation AC failure. Cold optimizer also logged #app-manifest pretransform errors; inspect/reprepare isolated Nuxt cache if pageerrors persist. Updates/removals: None. No assertions need weakening or obsolete tests deleting.

## Repository Coverage Execution Plan And Results
| Order/case | Command (worktree root) | Proves | Result/evidence |
| --- | --- | --- | --- |
| 1 / R-001 | pnpm -C autobyteus-web test:nuxt composables/voiceInput/__tests__/useComposerVoiceTarget.spec.ts tests/integration/composer-voice-lifetime.integration.test.ts --run | Direct local adapter/publication lifetimes | **Pass: 2 files / 20 tests**, independent; evidence/api001-focused.log |
| 2 / R-002 | pnpm -C autobyteus-web test:nuxt stores/__tests__/voiceInputStore.spec.ts composables/projects/__tests__/useProjectTaskDraft.spec.ts components/chat/__tests__/ChatComposer.spec.ts components/agentInput/__tests__/AgentUserInputTextArea.spec.ts components/agentInput/__tests__/TeamComposerPublication.spec.ts tests/integration/web-boundary-guard.integration.test.ts tests/integration/voice-input-extension.integration.test.ts --run | Adjacent capture/callers and actual fixture HTTP/worker contracts | **Pass: 7 files / 55 tests**, independent; evidence/api001-adjacent.log |
| 3 / R-003 | pnpm -C autobyteus-web build | Final bundle after browser temporary page removed | **Pass: final Nuxt web build**, page absent; evidence/api001-build.log |
| 4 / R-004 | node --check probe; git diff --check; hashes/status/cleanup check | Test syntax, scope, provenance | **Pass: syntax/diff/hashes/collision/cleanup**, evidence/api001-provenance.log |

## Test-Case Ledger Decision
**Yes**: independently meaningful repository groups and seven browser journeys, async setup and credible interruption risk. api-e2e-test-case-ledger.md initialized with IDs before execution; each terminal event persists before next case.

## Post-Repository Confidence Scorecard
Completed after independent R-001/R-002 (75 tests / 9 files), before browser execution. Warnings: stale Browserslist, test KaTeX quirks-mode, fake-worker login-shell npm_config_prefix/nvm warning; tests and worker assertions passed, no production conclusion inferred from warnings.
| Category | Score | Support / remaining uncertainty / next evidence |
| --- | --- | --- |
| Requirement/AC proof | 95% | Direct real changed adapter + publication + button/store assertions for AC-001–003; happy-dom user-surface gap remains |
| Changed-boundary directness | 95% | No adapter/publication/button/store mock; actual Vue watchers/owners; browser caller joining will strengthen |
| Cross-boundary realism/mock gap | 90% | Media/worklet/IPC controlled, adjacent real HTTP/install/process fixture passes; browser native capture/worklet will remove media bypass |
| Environment/configuration/identity/fixture | 90% | Actual schema/coherent three members/exact-context/binding; selection providers mocked; browser uses real stores/configuration |
| Failure/edge/lifecycle/recovery | 95% | Same-runId/access/null/binding/owner, deferred startup/FLUSH/IPC and cancellation/no-speech/errors directly proven; native disposal next |
| User-surface/browser/desktop-shell | 75% | Component tests/doubles not Chrome; no independent browser run yet. Shell unchanged/N/A within this category; run/Chat renderer proof required |
| Durable regression quality/relevance | 95% | Requirement-linked 20 regressions, source red provenance retained, broad preserved tests; browser regression to add |
- Overall **90.71%** = (95+95+90+90+95+75+95)/7. All critical logical ACs directly proven by integration but actual caller/browser evidence incomplete; no clean Pass yet. Applicable user-surface category below90%; default 95% target not met. Broader **Required** confirmed.

## Broader Validation Decision
**Required — Browser**, per TESTING.md renderer choice. Happy-dom integration does not prove native browser AudioWorklet/getUserMedia, actual caller rendering, DOM draft updates or browser event timing. Expected final target >=95% if all critical ACs directly proven with no category <90%. Native shell/model/real device are explicitly not this narrow adapter correction's certification; no conditional capture policy is changed there.

## Desktop Application Validation Decision
Electron app, but changed boundary is web-equivalent renderer destination identity. Choose owned Chrome dev-path and actual native audio capture/worklet with synthetic input; unchanged transcription IPC emulated. Do not run installed/current app or touch user data. Full Team layout, packaged Electron permission/device/model path and actual historical incident remain not tested; evidence limits must be explicit, not a broad product/voice certification.

## Live Environment And Fixture Plan
- Install owned test fixture page from tests/e2e/fixtures only while running; start pnpm dev --host 127.0.0.1 --port <free>; Chrome synthetic microphone, own profile.
- Setup actual 3-member Team, select lead through actual selection store; type existing text through each actual component; apply parsed normal engineer→reviewer publication at real Team view ingress. Use real member focus action for navigation.
- B-001 run caller repeated messages → manual Stop → once/no-send; B-002 Chat caller at 390px with keyboard Stop; B-003 hold real microphone startup → publication → release; B-004 startup member change → release/dispose; B-005 pending IPC publication → success; B-006 pending IPC actual member change → discard; B-007 real capture owner unmount → dispose.
- Observe DOM text/labels/enabled/busy/draft, captured target currentness, native track.readyState/context.state, actual worklet diagnostics + WAV header at IPC boundary; screenshots support assertions. Keep page errors and cleanup receipts.

## Temporary Executable Validation Plan
No temporary-only behavior probe planned. Temporary installed page/server/profile are scaffolding for durable CLI/fixture, not production. Original upstream probes retained untouched.

## Not Tested / Infeasible / Deferred
No real microphone, official model, OS permission, packaged desktop/full Team product journey, network Team sender/server or comprehensive accessibility audit; these unchanged boundaries are outside the correction's bounded evidence. Browser fake-device coverage is not real-device certification. No separate typecheck/full-workspace/release pass. Explicit end-user verification/finalization belongs to Delivery.

## Ambiguities Or Reroute Triggers
None at discovery. Any source defect against ACs -> Fail + failure-origin review; test/environment defect owned here corrected without new production behavior; requirement/design ambiguity -> Solution Designer through live rules. No compatibility or data transition mismatch observed.

## Investigation Decision
Proceed **Yes**; add durable browser coverage **Yes**, preserve existing tests **Yes**; removals **No**. Broader validation Required; no pre-execution reroute.

## Browser Execution Checkpoint
Attempt2 passed all B-001–007 with native tracks/AudioContext/worklet, Chrome 154.0.8037.97 and no pageerrors/API mutations. Kept all receipts. Dev still logged optional #app-manifest pretransform errors despite nuxt prepare; no assertion was suppressed and current route worked. Before final execution, quarantine only the assigned worktree-generated .nuxt and web Vite optimization cache to test clean setup; keep attempts1/2 intact. Extend B-001 past existing 2500ms watchdog with actual native capture-stats and retain recording/transcribing screenshots. No production change/new behavior.

## Regression Sensitivity Control Added Before Execution
C-001: run the final durable browser CLI on exact original adapter from 98d8fb36a632ce0f46136cda20129d1fe1ee0ac8, with current tests/callers/native audio. Expect B-001 to reject the first unrelated publication (recording false, tracks ended, no IPC). This temporary source substitution is an evidence-only red control, not an implementation failure or a new product scenario. Save/restore exact committed fixed source via shell EXIT trap, verify hash and rerun focused R-001 before build. Keep red-control receipts separate; never overwrite original Solution Designer evidence. All current-source browser cases passed in final run; clean-cache final has no #app-manifest errors and no pageerrors; expected refused port9 health is not used by fixture validation.

## Final Investigation Reconciliation
- R-001 20/20 pass independently twice (restoration rerun included); R-002 55/55 pass, total 75 distinct tests/9 files. R-003 final web build Pass; R-004 syntax/diff/hash/safe collision guards/owned cleanup Pass.
- Final durable browser B-001–007 all Pass on fixed source; seven independently meaningful supported journeys, native Chrome audio APIs and current worklet. B-001 3.331s/159872 samples, recording still active after 3 publications, real timer 0:03, no prior Stop/IPC/disposal; explicit Stop then closed media and one append/no Send.
- C-001 sensitivity-control Pass: exact original adapter failed first publication with capture ended and zero IPC; fixed source restored/hash equals IR-001 and 20 tests passed again. Red control is not a current-source failure.
- Attempt1 API selector failure resolved (real textarea has combobox semantics); no production change/assertion weakening. Attempt2 all7 passed but optional manifest-cache logs retained; final fresh generated-cache setup eliminated #app-manifest errors, browser page errors 0. Expected isolated health endpoint127.0.0.1:9 refusal is not a fixture dependency or live-server proof.
- Durable API changes: new CLI and fixture + one package script, test-only development commit 0c17debbf8e81dd549cc2d42d7cd2e39d020b7de. No production/API/data-contract change, no removals. Complete typed/media/caller guards retained.
- Final confidence **95.71%**, seven-category scorecard in execution coverage report; >=95% target met, no category <90%, no unproven critical AC or material in-scope broader risk. Broader Required → Browser completed. No real-device/model/packaged-desktop/transport/full-product pass implied.
- All owned browser/Nuxt processes/ports/page/source backup/cache quarantine cleaned; local dependencies/ignored final build remain assigned, application-SDK dist unstaged. Original SR/IR hashes unchanged. API-REV-001 is latest complete result; investigation and report authoritative.
