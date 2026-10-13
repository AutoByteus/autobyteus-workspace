# API/E2E Execution Coverage Report — settings-saved-model-refresh

## Latest authoritative result
**Pass — API-REV-001, round 1, 2026-10-13. Final confidence 95%.**

- **170/170 web tests** (25 files); narrow 46-test run overlaps this selection.
- **6/6 real HTTP/WS/MCP tests**, grouping DCM-001..008.
- **9/9 isolated desktop journeys** in the final consolidated run.
- **6/6 browser/real-backend journeys**.
- Fresh desktop production build passed. No product-code change during API/E2E. No paid inference, user run/data access, push, release or finalization.

## Execution meta / cumulative authority
Task `5ee10f33-b73e-4373-b646-e87613e9c57b`; worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh`; branch `codex/settings-saved-model-refresh`.
Canonical package: `/Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/`.

Read and retained: requirements-doc.md (Approved SR-001), investigation-notes.md, design-spec.md (SR-002), solution-revision-record.md, handoff-architecture-design-complete.md, implementation-handoff.md, implementation-revision-record.md (IR-001), implementation-local-evidence.md. Current coverage authority: api-e2e-coverage-investigation.md, this report, api-e2e-test-case-ledger.md and api-e2e-revision-record.md. Prior API result/confidence N/A. Architecture review, source review, Product supplements and related ARCH-REV/CRR/DR reports: **N/A — not applicable** on direct route. User screenshots remain observational context in upstream inventory.

**Medium / Low; Direct Low-Risk. Successful route: Delivery. Test-code review: Not Required — direct low-risk route.** No structural reclassification trigger found.

## Acceptance-Criteria Proof
All six criteria critical; all **Proven** within approved scope. No user-only missing proof.
Evidence folder: `evidence/` under the canonical package. Below **F** means `evidence/desktop-final/`, **B** means `evidence/browser-01/`. JSON case details contain DOM assertions, exact target IDs, mutation/query variables and responses. Screenshots support rather than replace assertions.

| AC | Case proof | Evidence files relative to package | Result |
|---|---|---|---|
| AC-001 | SSR-001 stopped parent → gear → copy Save, same connected Settings element, same URL, expanded editor and summary match canonical query; second save and reopen. SSR-004 member thinking. | F/delegated-launch-defaults-evidence.json → cases.SSR-001/004.details; F/SSR-001-first-same-view.png; F/SSR-004-same-model-thinking-saved.png | Proven |
| AC-002 | SSR-002 Team choice updates follower; own member choice/default survive; exact neighboring Team unchanged; repeated Team edit. SSR-004 low → xhigh and reopen. | F JSON → SSR-002/004; F/SSR-002-team-followers-own-choice.png; evidence/api-web-regression.log for Fast/config presentation | Proven |
| AC-003 | SSR-001 Cancel sends no mutation; SSR-003 aborted write retains edits; real accepted write + injected read 503 shows saved-but-refresh-needed and locks; Refresh reads without another mutation. DCP-004 real backend refusal when copy wakes. | F JSON → SSR-001/003 and DCP-004; F/SSR-003-write-failed-recoverable.png; F/SSR-003-saved-refresh-needed.png; F/SSR-003-read-only-refresh-recovered.png; F/DCP-004-save-refused-copy-running-1280.png | Proven |
| AC-004 | Agent copy + collaborator (SSR-001), Team and member/instance isolation (SSR-002/004), active Agent + Team/Org roots (DCP-001..005); unchanged-model settings-only real Grok schema. | F JSON all 9 cases; B/delegated-launch-defaults-evidence.json; F/DCP-003-org-settings-copy-saved-1280.png; F/DCP-005-team-copy-card-member-saved.png | Proven |
| AC-005 | SSR-001/003 launch counts unchanged on Save/Refresh; unrelated canonical identities/settings unchanged. DCP-001..005 locks/refusal/next-message resume; DCP-005 nonempty conversation continuation flag. API DCM-001..008 restrictions/continuity. Pending root/node ownership and closure filter repository tests. | F JSON; evidence/api-server-e2e.log; evidence/api-web-regression.log; F/DCP-004-settings-after-restart-1280.png | Proven |
| AC-006 | Fresh desktop build, actual production Electron renderer and Node Manager connecting to owned real backend; no mocked Apollo. Still-open Save assertions/API wire, screenshots, identity/cleanup receipts. | evidence/desktop-01/desktop-start.log; F/desktop-identity.json; F/desktop-start.json; F/desktop-stop.json; F case JSON; evidence/api-cleanup-and-identity.json; evidence/commands.md | Proven |

## Commands / boundary matrix / ledger reconciliation
Exact commands and working directory: **evidence/commands.md**. Repository plan and post-repository scorecard: investigation. No skip counted as Pass.

| Cases | Execution surface / boundary | Latest result and evidence |
|---|---|---|
| REP-001 / REP-002 | Nuxt/Happy DOM components/stores/row builders, controlled transport; alone cannot prove persistence | Pass 46/46 then 170/170; api-narrow.log, api-web-regression.log |
| API-001 (DCM-001..008) | Real HTTP/GraphQL/WS/scoped MCP, catalog, run-history, lifecycle; external AGY/Grok CLI scripted | Pass 6 grouped tests; api-server-e2e.log |
| SSR-001..004 | Production desktop → real node/backend; stopped Agent parent, Agent/collaborator/Team/member settings/recovery | Pass 4/4; desktop-final JSON |
| DCP-001..005 | Production desktop active Agent/Team/Org roots, copy stop/model, wake refusal, backend restart, ordinary-message continuation | Pass 5/5; desktop-final JSON |
| SSR-001..004 + DCP-002/005 | Fresh Chrome → Nuxt → owned real backend, same public fixture path | Pass 6/6; browser-01 JSON |
| Build/static | Server build; fresh Electron full build includes guards/localization/production renderer; three MJS syntax checks and git diff check | Pass; api-server-build.log, desktop-01/desktop-start.log; syntax/diff commands exit 0 |

Ledger reconciled **Yes**. No running, interrupted or unstarted required cases remain. Final consolidated desktop command exited 0 with 9 Pass/0 Fail and zero page errors; browser 6 Pass/0 Fail and zero page errors. Earlier attempts remain intact, not overwritten.

## Attempt history / failure resolution
All failures below were harness defects/corrections, resolved before result classification; no product failure-origin reroute needed.

| Attempt / symptom | Diagnosis and correction | Resolution |
|---|---|---|
| desktop-01 DCP-002/005 sidebar row missing | Existing helper clicked already-expanded Team row and collapsed it; explicitly disclose root after selection | final/browser both Pass |
| desktop-01 DCP-004 chat wait after backend restart | Desktop hash goto retained Settings; unlike HTTP goto it does not reload. Explicit reload only in separate post-restart phase, never to make Save pass | desktop-02/final Pass; refusal/Save already proved before reload |
| desktop-01 SSR-001 collaborator assertion | New helper assumed copy startedAt; collaborator has addedViaAgentRunId. Wire already showed accepted selection; correct public identity lookup | desktop-02/final/browser Pass |
| desktop-02 DCP-002 self-target refusal | Last conversation was copy lead; root manager not selected. Product correctly rejected self-message | explicit manager click; desktop-03/final/browser Pass |
| desktop-02 DCP-005 raw ID → friendly-name string | Catalog hydrated grok-4.7 to Grok 4.7, not config change. Compare recognized equivalent label plus exact canonical execution/source. Audit caught first helper returned undefined; now requires both records by ID/address | desktop-04/final/browser Pass with present exact records |
| desktop-03 SSR-004 primary-menu option absent | Grok generic schema uses reasoning-effort menu, not primary mode; reuse established primary/generic selector. Actual xhigh display is Xhigh | desktop-04/final/browser Pass; backend enum exact |

Baseline helper fixes isolated in **8126fa99b1**. New coverage/desktop adapter in **74889c1ed8**. No source fix hidden in test commits.

## Confidence scorecard
Percentages are evidence judgments, not statistical probabilities or code coverage. Arithmetic mean across seven applicable categories; missing critical proof cannot be averaged away.

| Category | Post-repository | Final | Final evidence / residual boundary |
|---|---|---|---|
| Requirements/AC proof | 75% | 95% | All critical criteria mapped; no user-only gaps. |
| Changed-boundary directness | 85% | 95% | Still-mounted real editor, real mutations/readback, stopped parent. |
| Cross-boundary realism/mock gap | 85% | 95% | Real Electron/Nuxt/API/persistence/tools; external CLI and explicit outage controlled. |
| Environment/config/identity/fixtures | 90% | 95% | Owned public-created data, source-current packaged bytes and exact run IDs. |
| Failure/edge/lifecycle/recovery | 95% | 95% | Refusal, transport failure, committed-read failure, read-only retry, continuation; pending ownership tests. |
| User-surface/desktop | 50% | 95% | Actual Electron, gear controls, saved/error screenshots inspected; Mac only. |
| Durable regression coverage | 90% | 95% | New and existing coverage executed; corrected cases repeated in browser and consolidated desktop. |

Overall **81.4% → 95%**. Target met Yes; category below 90 No; every critical AC directly proven Yes. Broader validation **Required and completed**, not waived after unit success.

## Environment, identity and desktop strategy
- macOS **26.5.2 / arm64**, Node **22.23.1**, pnpm **10.28.2**. Build log packages Electron **42.4.1**, app version **1.5.3-beta.4**. Desktop viewport 1512×952; selected screenshots 1280×900; English UI with host date formatting. Browser context en-US, 1512×952. Not mobile/cross-OS certification.
- Implementation `cd685b6407cd847db52b4a2d7a45b486287fac52`; final committed harness `74889c1ed8`. Fresh app built in desktop-01 from implementation source + test additions. Later diffs contain only tests/package-script entry, no executable application-source delta. Every desktop receipt has identical asar SHA-256 **55749a6189e5680f13bf5b2c254e50a6096a07ba1904dcc728055fab4116bc4b**. No installed binary used.
- Isolated-app owns desktop/embedded backend. Fake CLI variables do not cross its production isolation: actual Nodes UI registers and opens a second desktop window for the owned current dist/app.js backend, private HOME/SQLite/data/free ports and scripted commands.
- Definitions via real GraphQL; runs via actual UI/composer; scripted agent calls real delegation/message tools through scoped MCP. No persisted-tree edits, store injection, fixture page or mocked Apollo. Only SSR-003 transport faults injected; its preceding committed write is real.
- DCP-004 is **backend restart + renderer reload**, not a whole desktop restart or released-app upgrade. Neither is a changed requirement here.
- Final saved, thinking-only and refresh-needed screenshots opened and visually inspected. Disclosure/layout retained, Saved follows readback; failure distinguishes committed write and keeps Refresh visible.

## Durable coverage changed
| Path relative to worktree | Change |
|---|---|
| autobyteus-web/tests/e2e/settings-saved-model-refresh-cases.mjs | Added SSR-001..004, same-view/repeat/isolation, thinking-only, errors/read recovery and wire receipts |
| autobyteus-web/tests/e2e/fixtures/settings-refresh-desktop.mjs | Added safe lifecycle adapter, real Node Manager registration, build hash and owned cleanup |
| autobyteus-web/tests/e2e/delegated-launch-defaults-probe.mjs | Reused public fixtures/runtime; desktop/hash routing/ledger; focused SSR opt-in; baseline helper corrections |
| autobyteus-web/package.json | Added test:e2e:settings-saved-model-refresh nine-case desktop suite |

No tests removed/skipped; no compatibility-only test added. No global TESTING.md change. Independent test review **Not Required — direct low-risk route**; paths attached for Delivery inspection.

## Compatibility / persisted data
No upstream compatibility ambiguity or invalid retained fallback observed. Active live stream is a supported distinct lifecycle. **Not Affected** persisted-data decision respected: formats/readers/writers unchanged; normal saved records read through public APIs. No migration/reset/upgrade or legacy-protection claim.

## Residual limitations / not tested
- Scripted AGY turns and Grok catalog/reasoning schema are not paid inference. Actual provider behavior out of scope; zero quota used.
- Fast mode absent from these controlled catalogs: its config/label has mounted-component coverage, not real-provider desktop proof. Actual desktop settings-only proof uses Grok low/xhigh.
- No Windows/Linux shell certification, mobile/accessibility sweep, installed user data, whole desktop restart or release deployment. Shell source unchanged; required Mac desktop journey completed.
- Upstream standalone vue-tsc unavailable; no pass claimed. Production Electron/web/server builds passed.
- Agent-run testing is not user acceptance. No ticket behavior remains that only the user can check for this executable gate.

## Cleanup and retained outputs
**evidence/api-cleanup-and-identity.json** asserts all six attempt-owned backend roots removed, node/frontend ports no longer listening, every exact desktop removed with data root and both ports released. `evidence/isolated-list-after.json` has no owned instance. Gated API fixture directories checked absent. Chrome closed; Nuxt/backend groups stopped; no temporary production route created. Temporary owned diagnostic JSON/patch removed after evidence audit.

Dependencies, packaged build and untracked `autobyteus-application-sdk-contracts/dist/`, `autobyteus-application-backend-sdk/dist/` remain for Delivery reuse/cleanup; **do not stage**. Tracked contract outputs unchanged. Archive ticket evidence before worktree removal.

## Handoff
**Pass, 95%, no unresolved in-scope failure or external blocker.** Product-failure classification N/A. No unrelated product defect requiring Task Manager follow-up. Configured route receipt recorded in revision record. Finalization remains Delivery-owned via RELEASE.md and origin/personal, no release without user direction. Completion returns through Solution Designer to Task Manager run `project_task_manager_a5f6d9d306e54970bafdad895bdf731d`.
