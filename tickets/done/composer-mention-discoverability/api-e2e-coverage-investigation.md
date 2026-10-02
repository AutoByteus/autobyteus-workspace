# API/E2E Coverage Investigation

## Investigation Meta
Round 1; trigger Implementation Complete IR-001 / SR-005, source 006fd6928 and artifacts 31e54ed54. Prior investigation/result/revision N/A. Written before test changes or final execution.
- requirements-doc.md: /Users/normy/autobyteus_org/autobyteus-worktrees/composer-mention-discoverability/tickets/in-progress/composer-mention-discoverability/requirements-doc.md
- investigation-notes.md: /Users/normy/autobyteus_org/autobyteus-worktrees/composer-mention-discoverability/tickets/in-progress/composer-mention-discoverability/investigation-notes.md
- design-spec.md: /Users/normy/autobyteus_org/autobyteus-worktrees/composer-mention-discoverability/tickets/in-progress/composer-mention-discoverability/design-spec.md
- solution-revision-record.md: /Users/normy/autobyteus_org/autobyteus-worktrees/composer-mention-discoverability/tickets/in-progress/composer-mention-discoverability/solution-revision-record.md
- solution-handoff.md: /Users/normy/autobyteus_org/autobyteus-worktrees/composer-mention-discoverability/tickets/in-progress/composer-mention-discoverability/solution-handoff.md
- implementation-handoff.md: /Users/normy/autobyteus_org/autobyteus-worktrees/composer-mention-discoverability/tickets/in-progress/composer-mention-discoverability/implementation-handoff.md
- implementation-revision-record.md: /Users/normy/autobyteus_org/autobyteus-worktrees/composer-mention-discoverability/tickets/in-progress/composer-mention-discoverability/implementation-revision-record.md
Supplemental authority (read; accepted screenshots are direct user authority, not a completed Product spec):
- /Users/normy/autobyteus_org/autobyteus-web-prototype-worktrees/composer-mention-discoverability/tickets/in-progress/composer-mention-discoverability/ui-approval-record.md
- /Users/normy/autobyteus_org/autobyteus-web-prototype-worktrees/composer-mention-discoverability/tickets/in-progress/composer-mention-discoverability/product-design-proposal.md
- /Users/normy/autobyteus_org/autobyteus-web-prototype-worktrees/composer-mention-discoverability/tickets/in-progress/composer-mention-discoverability/ui-review-finalization-record.md
- /Users/normy/autobyteus_org/autobyteus-web-prototype-worktrees/composer-mention-discoverability/tickets/in-progress/composer-mention-discoverability/prototype-ticket.md
- /Users/normy/autobyteus_org/autobyteus-web-prototype-worktrees/composer-mention-discoverability/tickets/in-progress/composer-mention-discoverability/validation-record.md
- /Users/normy/autobyteus_org/autobyteus-web-prototype-worktrees/composer-mention-discoverability/tickets/in-progress/composer-mention-discoverability/baseline-gap.md
- /Users/normy/autobyteus_org/autobyteus-web-prototype-worktrees/composer-mention-discoverability/tickets/in-progress/composer-mention-discoverability/approved-ui-evidence/composer-1512.png
- /Users/normy/autobyteus_org/autobyteus-web-prototype-worktrees/composer-mention-discoverability/tickets/in-progress/composer-mention-discoverability/approved-ui-evidence/composer-selected-1512.png
- /Users/normy/autobyteus_org/autobyteus-web-prototype-worktrees/composer-mention-discoverability/tickets/in-progress/composer-mention-discoverability/approved-ui-evidence/composer-1024.png
- Implementation evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/composer-mention-discoverability/tickets/in-progress/composer-mention-discoverability/render-evidence/render-inspection.md; observations.json; self-check.page.vue (reviewed, not reused as certification).
- Architecture review / ARCH-REV / source review / CRR / triggering test review / delivery report / DR: N/A — not applicable.
- API revision: /Users/normy/autobyteus_org/autobyteus-worktrees/composer-mention-discoverability/tickets/in-progress/composer-mention-discoverability/api-e2e-revision-record.md (created on completed result).
- Ledger: /Users/normy/autobyteus_org/autobyteus-worktrees/composer-mention-discoverability/tickets/in-progress/composer-mention-discoverability/api-e2e-test-case-ledger.md.

## Routing Classification
Medium / Low Confirmed; Direct Low-Risk. Successful route Delivery subject to get_handoff_rules. Test review Not Required — direct low-risk route. No Product resumption or deferred DATA-001/BASE-002 repairs.

## Requirement And Design Basis / Supported Scenarios
SCN-001–004 supported. REQ-001 exact native English and zh-CN cue on live mention scope, not inserted into text; no-scope/New Chat preserved. REQ-002 single escaped noninteractive inline chosen-token decoration, no duplicate row. REQ-003 ordinary native edits/undo/reactivation and own-context attachments. REQ-004 candidate/keyboard/skill/send/rejection/history contracts preserved. AC-001–005 critical. Added ordinary cases: parent-only panel resize, wrapped multiword token, scrolled long text, locale change, forced colors, escaped pasted prose. No contrived scenarios tested.

## Changed Behavior / Boundary Classification
| Boundary | Change | Evidence / consequence |
| --- | --- | --- |
| Frontend component / browser / web-equivalent desktop renderer | Yes: placeholder, decoration, row removal | Component suites and durable Chrome renderer probe required; happy-dom lacks layout/native undo |
| Domain/backend/API/transport | No source change; preserved send/admission exercised | Stores, streaming and server admission/handler checks; distinguish mocked runtimes from real providers |
| Authentication/session/permissions | No change | Test-owned session; no user accounts/data |
| Desktop shell / external voice device | No changed boundary | Native textarea kept; no shell journey or audio capture certification |
| Component lifecycle | Yes: ResizeObserver + listener | Cleanup and layout checks |
| Persisted data / worker / distributed coordination | No change | Not Affected; no migration; unchanged DTO/history consumers |

## Project Execution Discovery
Worktree /Users/normy/autobyteus_org/autobyteus-worktrees/composer-mention-discoverability; branch codex/composer-mention-discoverability. Vue/Nuxt/Pinia renderer with native textarea, Electron host, TS backend.
| Instructions | Commands / constraints |
| --- | --- |
| /Users/normy/autobyteus_org/autobyteus-worktrees/composer-mention-discoverability/TESTING.md | Narrow units then renderer dev-path probe; full product/shell journey requires isolated worktree app, never installed/user data; assertions before screenshots |
| /Users/normy/autobyteus_org/autobyteus-worktrees/composer-mention-discoverability/autobyteus-web/AGENTS.md | --run; no git add . or -A |
| /Users/normy/autobyteus_org/autobyteus-worktrees/composer-mention-discoverability/autobyteus-web/README.md Testing; ARCHITECTURE.md Testing Strategy | Colocated Vitest Nuxt/happy-dom; tests/e2e self-starting fixtures |
| /Users/normy/autobyteus_org/autobyteus-worktrees/composer-mention-discoverability/autobyteus-web/package.json; vitest.config.mts; nuxt.config.ts | test:nuxt, own nuxi dev with BACKEND_NODE_BASE_URL, .nuxt prepare and generated contract dist prerequisites |
| /Users/normy/autobyteus_org/autobyteus-worktrees/composer-mention-discoverability/README.md Local full-stack development; docs/isolated-app-instances.md | pnpm dev uses 8000/3000; not selected to avoid shared state; full desktop build path available if needed |
| /Users/normy/autobyteus_org/autobyteus-worktrees/composer-mention-discoverability/autobyteus-server-ts/AGENTS.md; README.md; vitest.config.ts | vitest run --no-watch; test-owned temp filesystem/database for REST integration |
No closer TESTING guideline exists along changed paths. Historical architecture Python prose is stale; actual TS paths authoritative. No secret required for deterministic renderer/API checks; real-provider/full desktop journey not selected for unchanged backend/shell.

## Environment / Fixture Plan
Reuse documented self-starting browser fixture pattern, not Product state. Add small handwritten fixture under tests/e2e/fixtures; temporarily install owned page only if absent; free loopback ports, headless Chrome private context, sanitized child environment; synthetic candidate GraphQL and admission outcome at transport boundary. Real upload client multipart request to test-owned HTTP server, plus independent real Fastify/storage upload integration. Production useRunMentionMenu/parser/localUserSubmission/Context Files/textarea remain real. No claims of actual provider delivery from mocks. Browser fixture uses real scope resolver across Agent/Team/Org/task/read-only/launch shapes; target send adapter calls production local submission functions with emulated acknowledgement. Own processes/page cleaned in finally, evidence retained under ticket. Native OS IME and audio capture are not emulated as real devices.

## Compatibility / Persisted Data
Read handoff removal and persisted transition sections. No runtime legacy compatibility branch observed; chip-only component/helpers deleted; docs/chat.md stale description is Delivery-owned. Not Affected: requirement/requestedMentions/attachment/DTO/history storage unchanged. No persisted spans, migration or data loss approved.

## Existing Durable Coverage Inventory / Decisions
| Test path under web unless qualified | Validity | Action / evidence |
| --- | --- | --- |
| components/agentInput/__tests__/AgentUserInputTextArea.runMentions.spec.ts | Still Valid | Updated by implementation to AC-001–005; mocks candidates, DOM metrics and send; independently rerun |
| components/agentInput/__tests__/AgentUserInputTextArea.spec.ts; AgentUserInputForm.skillTagging.spec.ts; ContextFilePathInputArea.spec.ts | Still Valid | Draft/ack/skills/upload/context regression |
| utils/collaborators/__tests__/collaboratorMentionText.spec.ts | Still Valid | Exact chosen identity and split text; removed chip-only assertion valid per design |
| stores/__tests__/agentRunStore.spec.ts; agentTeamRunStore.spec.ts; agentOrgContextsStore.spec.ts; activeContextStore.spec.ts; agentRunCollaborationStore.spec.ts | Still Valid | Focused target send and scope regression |
| services/runSubmission/__tests__/localUserSubmission.spec.ts; services/agentStreaming/__tests__ | Still Valid | Hold/accept/reject/DTO/history presentation; no source behavior change |
| tests/e2e/agent-org-draft-retention-probe.mjs | Still Valid | Existing multipart upload/switch example; inspected pattern, not changed |
| tests/e2e/cross-scope-agent-mentions-live-probe.mjs | Needs Update (in affected assertions only) | Inspect obsolete chip expectations before running; provider/full-product path not selected this round; do not count old UI assertions as valid |
| tests/e2e/chat-composer-polish-probe.mjs; chat-composer-menus-open-upward-probe.mjs | Out Of Scope for execution | New Chat appearance unchanged; no source touched |
| server tests/unit/services/agent-streaming/*handler*.test.ts, collaborators/admission, Team/Org collaborator tests | Still Valid | Admission rejection, correct focused-agent commands and identity preservation; runtime handles doubled |
| server tests/integration/api/rest/context-files.integration.test.ts | Still Valid | Real upload/admission/storage data independent of synthetic record |
| server tests/e2e/runtime/standalone-agent-collaborator-mention.e2e.test.ts | Out Of Scope for execution | Paid runtime gated; unchanged collaboration domain, not renderer boundary |

## Durable Coverage Decisions
Add tests/e2e/composer-mention-discoverability-probe.mjs and fixtures/composer-mention-discoverability.page.vue plus package script. Layout/native keyboard cannot be protected by happy-dom; retain maintainable dev-path coverage. Update stale live-probe selected-row assertions if present to current inline behavior; no unrelated probe refactor. No test removal planned.

## Repository Execution Plan
C01 narrow component/utility suites; C02 broader agentInput/stores/stream/local submission/activeContext checks; C03 server handler/admission and real upload integration; C04 boundary guards. Exact commands and logs appended on execution. Browser cases B01 capability/copy, B02 selection/native edit/undo/paste, B03 keyboard/skill/send/attachment hold/accept/reject, B04 layout/scroll/resize/locale/forced colors/accessibility/context.

## Ledger Decision
Required: multiple independent cases and credible context interruption; initialize planned IDs before execution, immediate events per completed case. Durable probe writes case evidence incrementally and mirrors to canonical ledger when supplied.

## Post-Repository Confidence Scorecard
Pending execution, not inferred from 106 upstream self-checks. Mandatory categories: requirement proof, changed-boundary directness, cross-boundary realism/mock gap, fixture/environment fidelity, edge/lifecycle/recovery, user/browser/shell, durable quality. Score and average after C01–04; no Pass without all critical evidence.

## Broader Validation Decision
Required — Chrome dev-path renderer closes actual native edit/layout/scroll/ResizeObserver and locale/forced-colors gaps. Web-equivalent delta; shell-specific behavior unchanged so packaged app not selected. Screenshots supplement DOM/state assertions and accepted crops, not sole proof. Expected target >=95% only if critical behaviors are directly proven; no confidence from mere command success.

## Temporary / Not Tested / Escalation
No temporary-only probe planned. Real OS IME, audio-enabled voice and non-Chromium engines not selected: unchanged native handlers/sole textarea; record residual risk, not false Pass. Full Agent/Team/Org/task product capability journeys and actual provider delivery not implied by scope-shape fixtures; consider targeted extra validation if critical gap remains after repository/browser checks. Any observed accepted behavior defect → Fail with classification/owner and focused failure-origin review; unmet safe setup after alternatives → Blocked with exact dependency/user request. No ambiguity currently.

## Investigation Decision
Proceed Yes; durable additions Yes; reroute before execution No. Current confidence N/A until checks. Latest truth updated in place.

## C02 Coverage Validity Update (before test fixture corrections)
C02: 188/193 assertions passed; five failures in two pre-existing untouched tests. TeamComposerPublication fixture fails strict TEAM_EXECUTION_VIEW_SNAPSHOT parsing before rendering: missing agent_statuses[].recoverableBlock and agent_input_states. FocusedInterrupt has the same missing snapshot fields, so current transport rejects the snapshot and interrupt correctly reports TEAM_STREAM_NOT_READY. Current team-stream-server-message.ts / team-execution-view-dtos.ts require these fields; source delta did not change schema, transport, test fixtures or interrupt handler. Assertions remain valid, fixture decision Needs Update (not implementation defect). Narrow API/E2E-owned fixture corrections: null recoverableBlock per snapshot status and empty agent_input_states. Preserve strict parsing and all target/draft/reconnect assertions. Add these two durable test paths to coverage changes and rerun C02 before deciding failure origin; no runtime compatibility shim.
Live probe outdated chip assertions found at lines 371/374/688/759: Needs Update; replace with decorative inline known-token and native Backspace (existing identity contract), keep server/user-message assertions. Node syntax check run, provider/full-product execution not yet selected; update alone is not evidence of live Pass.
C02 rerun resolved focused interrupt and snapshot failures; two remaining AGENT_STATUS fixture messages also lack required recoverableBlock (current agent-presentation-contracts). Extend the same fixture's status helper with null; strict schema and behavioral assertions unchanged. C03 collected two passing suites (14 tests) but seven failed before collection due to missing generated Prisma client `.prisma/client/default`; environment prerequisite, not product failure. Use server package's documented `pnpm exec prisma generate --schema ./prisma/schema.prisma` then rerun exact command. Test config migrates only its test-owned DB.
C02 final: 193/193 pass, 19 files after current-contract fixture repair, no production changes. C03 after Prisma preparation: 75/76 pass; terminal-offline lifecycle case builds an incomplete fake AgentRun backend lacking required compactionRecovery capability, throwing before its assertion. Coverage decision Needs Update for this otherwise-valid lifecycle test: add explicit unsupported capability to the test backend, consistent with current AgentExecutionBackend interface and existing runtime doubles. Do not change production recovery/termination behavior; rerun exact C03.

## Post-Repository Results And Confidence Gate
C01 36/36; C02 193/193 after narrow schema fixture corrections; C03 final results recorded in logs; C04 guards pass. Original C02/C03 attempts retained, not called passes. Test-owned fixtures updated, no product source fix.
| Category | Score | Evidence / gap | Targeted improvement |
| --- | --- | --- | --- |
| Requirement/AC proof | 75% | Native layout/undo still indirect | B01–04 actual Chrome |
| Changed-boundary execution directness | 75% | happy-dom mocks layout; real component branches | Native browser metrics/events |
| Cross-boundary realism/mock gap | 90% | Real client/store and handler/admission/storage tests; no unified renderer upload/send exercise | B03 real multipart client and production held submission |
| Environment/identity/fixture fidelity | 90% | Real selected definition DTO and target mappings; generated prerequisites resolved | Native locale/font/capability fixtures |
| Edge/lifecycle/recovery | 90% | Component lifecycle, real rejection and upload/storage cases; undo/layout needs browser | B02–04 |
| User/browser/shell | 75% | Shell unchanged, native browser untested independently | B01–04 |
| Durable coverage quality | 90% | Validated assertions and fixture corrections; new probe pending run | Executable durable browser cases |
Overall 83.57% (585/7). Critical AC proof No (native AC-002/003/005 incomplete). Clean target No. Broader Required, not Blocked: self-starting Chrome renderer probe selected under TESTING.md. Scope remains web-equivalent, no changed Electron/provider boundary; no user app/data touched. Final confidence reassessed from evidence, not from upstream screenshots.
C03 rerun reaches terminal-offline assertion: actual correct offline payload now includes recoverableBlock:null; expected nested payload used exact equality without this current required field. Same stale-contract test, Needs Update: assert explicit null block alongside exact offline identity/status; do not weaken matching or production schema. Log retains actual correct offline publication. Other 75 tests pass. Browser B01–04 first run passes; final confidence deferred until C03 is clean and screenshots inspected independently.
Browser first-run evidence is real component/native input but its manually composed wrapper leaves child corner clipping unlike actual AgentUserInputForm. Refine durable fixture before final comparison: on standalone Agent use production AgentUserInputForm and normal seeded Agent contexts/selection/useComposerTarget/activeContext facade; emulate only owning run-store send action at transport boundary, continuing to use production local submission. Other capability shapes remain isolated production scope-resolver/component fixtures, not full product journeys. Add 1024 empty/selected and Chinese captures, keyboard ArrowDown/Tab and Chrome input-method smoke (not real OS IME) to close bounded browser gaps. No changed production UI.
Independent crop comparison confirms actual AgentUserInputForm corner/border/context/inline treatment matches approved composer; synthetic prose differs intentionally. Strengthen final visual evidence: use 620px panel at 1024 viewport (approved crop width) and scroll to selected token after locale/media layout changes, asserting its rectangles intersect the editor. Earlier narrow/forced-color screenshots showed the start of long prose after locale relayout, so not used as proof of visible selected-token high contrast. Metrics remain valid but visible-token evidence will be rerun. Chrome composition smoke must assert a unique newly inserted string, not the Chinese already in pasted text.
Final probe enhancement: retain a genuinely completed multipart client-upload attachment across native @ deletion/undo/unrelated edits before rejected and accepted send, and across context switch after a second completed upload. This closes the upstream synthetic-attachment limitation at the renderer/client boundary; C03 separately proves real server storage. Live-provider probe remains syntax-checked only; updated diagnostics name inline highlight rather than removed chip. No paid or full desktop journey claimed.

Final repository addition C05: rerun production Nuxt build after owned fixture page removed and dev stopped, plus both probe syntax checks and final guards/diff hygiene. Protects against accidentally bundling synthetic fixture. Planned before execution.

## Latest Investigation Result — API-REV-001
Round 1 complete: Pass,95%. C03 current76/76; C05 production build/guards pass. Exact commands/cwd /Users/normy/autobyteus_org/autobyteus-worktrees/composer-mention-discoverability/tickets/in-progress/composer-mention-discoverability/api-e2e-evidence/commands.json. Latest native browser run /Users/normy/autobyteus_org/autobyteus-worktrees/composer-mention-discoverability/tickets/in-progress/composer-mention-discoverability/api-e2e-evidence/browser-verified-run.log and browser/evidence.json. Fixture corrections resolved stale schema/capability issues; no production source fix or defect observed. Latest authoritative report /Users/normy/autobyteus_org/autobyteus-worktrees/composer-mention-discoverability/tickets/in-progress/composer-mention-discoverability/api-e2e-execution-coverage-report.md.

| Case | Exact command | Current result / log |
| --- | --- | --- |
| C01 | `pnpm -C autobyteus-web test:nuxt components/agentInput/__tests__/AgentUserInputTextArea.runMentions.spec.ts components/agentInput/__tests__/AgentUserInputForm.skillTagging.spec.ts components/agentInput/__tests__/AgentUserInputTextArea.spec.ts utils/collaborators/__tests__/collaboratorMentionText.spec.ts --run` | Pass — /Users/normy/autobyteus_org/autobyteus-worktrees/composer-mention-discoverability/tickets/in-progress/composer-mention-discoverability/api-e2e-evidence/C01.log |
| C02 | `pnpm -C autobyteus-web test:nuxt components/agentInput services/runSubmission services/agentStreaming/__tests__/AgentStreamingService.spec.ts services/agentStreaming/__tests__/TeamStreamingService.spec.ts services/agentOrgExecution/__tests__/agentOrgStreamingService.spec.ts services/agentCollaboration/__tests__/agentRunCollaborationStreamingService.spec.ts stores/__tests__/agentRunStore.spec.ts stores/__tests__/agentTeamRunStore.spec.ts stores/__tests__/agentOrgContextsStore.spec.ts stores/__tests__/agentRunCollaborationStore.spec.ts stores/__tests__/activeContextStore.spec.ts stores/__tests__/contextFileUploadStore.spec.ts --run` | Pass — /Users/normy/autobyteus_org/autobyteus-worktrees/composer-mention-discoverability/tickets/in-progress/composer-mention-discoverability/api-e2e-evidence/C02-final.log |
| C03 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/services/agent-streaming/agent-stream-handler.test.ts tests/unit/services/agent-streaming/agent-team-stream-handler.test.ts tests/unit/services/agent-streaming/agent-org-stream-handler.test.ts tests/unit/services/agent-streaming/agent-collaboration-stream-handler.test.ts tests/unit/agent-collaboration/collaborators/collaborator-admission.test.ts tests/unit/agent-team-execution/team-root-collaborators.test.ts tests/unit/agent-org-execution/agent-org-collaborators.test.ts tests/integration/api/rest/context-files.integration.test.ts tests/integration/api/rest/agent-org-context-files.integration.test.ts --no-watch` | Pass — /Users/normy/autobyteus_org/autobyteus-worktrees/composer-mention-discoverability/tickets/in-progress/composer-mention-discoverability/api-e2e-evidence/C03-current.log |
| C04 | `pnpm -C autobyteus-web guard:web-boundary && pnpm -C autobyteus-web guard:localization-boundary && pnpm -C autobyteus-web audit:localization-literals && git diff --check` | Pass — /Users/normy/autobyteus_org/autobyteus-worktrees/composer-mention-discoverability/tickets/in-progress/composer-mention-discoverability/api-e2e-evidence/C04.log |
| C05 | `test ! -e autobyteus-web/pages/api-e2e-composer-mention-discoverability.vue && node --check autobyteus-web/tests/e2e/composer-mention-discoverability-probe.mjs && node --check autobyteus-web/tests/e2e/cross-scope-agent-mentions-live-probe.mjs && pnpm -C autobyteus-web guard:web-boundary && pnpm -C autobyteus-web guard:localization-boundary && pnpm -C autobyteus-web audit:localization-literals && pnpm -C autobyteus-web build` | Pass — /Users/normy/autobyteus_org/autobyteus-worktrees/composer-mention-discoverability/tickets/in-progress/composer-mention-discoverability/api-e2e-evidence/C05.log |

Final confidence seven applicable categories 95%, average 95%. Native UI direct proof strong; unchanged cross-boundary stores/handlers/admission/storage exercised with explicit runtime/provider doubles. Every critical AC directly proven at its relevant boundary Yes; material changed-boundary uncertainty None. OS IME/audio/non-Chromium/provider/shell limits are not falsely certified or newly required by unchanged source. Broader Required and Completed (Browser); score rationale in current report. Clean target met. Direct Medium/Low preserved; test review Not Required — direct low-risk route. No reroute required.
