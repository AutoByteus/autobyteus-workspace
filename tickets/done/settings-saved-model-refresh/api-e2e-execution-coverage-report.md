# API/E2E Execution Coverage Report — settings-saved-model-refresh

## Latest authoritative result
**Pass — API-REV-003, 2026-10-13, final confidence 95%.** Latest-base IR-003 after Delivery DR-002. API-REV-001/002 remain historical results for their own candidates.

- **330/330 web tests, 33 files**, plus **38/38 Prisma unit tests, 2 files**. Narrow 77-test run overlaps.
- Fresh backend build and **6/6 real API tests** grouping DCM-001..008.
- Fresh isolated desktop build and **9/9 combined Settings/Stop journeys**.
- HTTP/Nuxt browser supplement **7/7 journeys**; both surfaces zero uncaught page errors.
- Three syntax checks, five actual-runner and six actual-root-helper synthetic variants, 50 independent source-preservation checks, ledger/identity/cleanup audits **Pass**.
- No failures, new source/test edits, skipped required case or user-only proof gap in this round. No paid inference, user-data access, push, finalization or release.

## Authority / source
Task **5ee10f33-b73e-4373-b646-e87613e9c57b**, **Medium / Low, Direct Low-Risk**. Test-code review **Not Required — direct low-risk route**. ARCH-REV/CRR/Product supplements **N/A — not applicable**.

Worktree **/Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh**, branch **codex/settings-saved-model-refresh**. Canonical ticket folder **tickets/in-progress/settings-saved-model-refresh/**.

Read cumulative approved SR-001 requirements, investigation, SR-002 design/history/architecture handoff; IR-001..003 implementation package; prior API investigation/report/revision/ledger; DR-001/002 reports and raw conflict evidence; incoming approved **tickets/done/sidebar-stop-red-default/requirements-doc.md**. Five Settings authorities and applicable root/package AGENTS, DESIGN, TESTING and isolated-app guide unchanged from previously read source. Legacy Removal and Persisted Data checks remain clean / **Not Affected** for this fix.

Source chain: prior API evidence **5d95381a6637b7fa7eb5a703e8c161064bb05d69** → DR-002 preservation **bd0fb189e6c6d19f99b11ee1216177acd2767aa4** → merge **21bab56a2785f32e137dc54cbb62af43cbd157dc** integrating **7170fd755d0dd5e806371dd4594eb4a9bf3e2682** → validated HEAD **76fab065ec30bff5be76dd2e013243abda3a6934**. Later ticket-evidence commits do not change application or harness code.

DR-002 is a new exact-Team-locator merge conflict, not reopening DR-001's resolved ledger work. IR-003 combines existing exact root/kind/address targeting with incoming exact named Terminate team control and adapts incoming root-history URL extraction to desktop hash routes. Separately approved red enabled Stop supersedes historical gray-enabled expectations. Original Settings code/tests and prior SSR/desktop adapter preserved; incoming Stop/TPS/Prisma source/test preservation independently verified.

## Acceptance-Criteria Proof
Every critical AC **Proven** on current source. Evidence base **E = evidence/api-rev-003/**, **D = E/desktop/**, **B = E/browser/**. In each surface, **JSON = delegated-launch-defaults-evidence.json**. Durable cases assert actual mounted DOM, mutation/query responses and identities; screenshots support rather than substitute for those assertions.

| AC | Current direct proof | Evidence relative to ticket | Result |
|---|---|---|---|
| AC-001 | SSR-001 stopped parent → gear → Agent copy/collaborator edit → Save; original connected Settings element and URL, expanded editor and summary show accepted model before navigation. Repeat Save and reopen. | D/JSON cases.SSR-001 firstSave/firstCanonical/secondSave/collaboratorSave/wire; D/SSR-001-first-same-view.png; D/SSR-001-collaborator-saved.png | Proven |
| AC-002 | SSR-002 Team followers refresh; own Grok default, explicit member choice and exact neighboring Team retained. Repeat Team edit. SSR-004 same Grok model with accepted low→xhigh config, mounted thinking control and reopen. | D/JSON SSR-002/004; D/SSR-002-team-followers-own-choice.png; D/SSR-004-same-model-thinking-saved.png; E/web-regression.log configurable/Fast labels | Proven |
| AC-003 | Cancel does not write; aborted write remains dirty/editable. Real committed write followed by injected read 503 gives truthful refresh-required lock, not false Saved. Refresh reads only; no extra write/start. DCP-004 real running-copy Save refusal records no choice. | D/JSON SSR-001/003,DCP-004; D/SSR-003-write-failed-recoverable.png; D/SSR-003-saved-refresh-needed.png; D/SSR-003-read-only-refresh-recovered.png; D/DCP-004-save-refused-copy-running-1280.png | Proven |
| AC-004 | Agent/collaborator/Team/member Settings; Agent, Team and Org parents; same-model settings-only configuration. Active and stopped paths exercised in packaged app and HTTP supplement. | D/JSON all nine; B/JSON seven; D/DCP-003-org-settings-copy-saved-1280.png; D/DCP-005-team-copy-card-member-saved.png | Proven |
| AC-005 | Save/Refresh/reopen do not launch or resume; running/runtime restrictions, exact sibling config/identity, root/node ownership, refusal/recovery, next-message same conversation retained. New Stop/root lifecycle does not regress Settings. | D/JSON SSR-001/003,DCP-001..005; E/server-e2e.log; E/web-regression.log | Proven |
| AC-006 | Fresh source-current isolated Electron, real private backend selected through production Nodes UI, public fixture data, same-view assertions before navigation; fresh build identity, wire/DOM/screenshots and owned cleanup. | D/desktop-start.log; D/desktop-identity.json; D/desktop-start.json; D/desktop-stop.json; D/JSON; E/runtime-source-identity.json; E/validation-audit.json | Proven |

### Current Stop / root-history preservation
DCP-001..003 directly prove **five variants**: Agent/Team/Org root Stop, Agent and Team copy Stop (Agent copy also exercised under Org).

- Actual computed enabled rest/leave **rgb(239, 68, 68)**; hover **rgb(220, 38, 38)** on **rgb(254, 242, 242)**. Copy and Agent/Team transitions 0.15s; unchanged Org root transition 0s.
- Disabled pending and actual disabled hover **rgb(153, 153, 153)**, transparent background; native disabled opacity 0.6 copy / 0.5 root. No enabled hover cue.
- Native Enter/Space with accessible label/title, visible focus; one exact operation/variables request, no duplicate/dialog, unchanged row selection/expansion/URL while held. Copies pulse; reduced motion suppresses it.
- Held requests forwarded to real backend unchanged; successful copy STOPPED, same Task/status/open state, parent still active; normal message resumes on accepted model. Then native root termination produces exact inactive public history and retained row without Stop.
- DCP-002 selects its own Home Team root/kind/address after older same-label SSR Pair copies. Named Terminate team targets its actual parent. Prior selector ambiguity remains resolved.
- DCP-003 actual Electron **file/hash mode=history** and HTTP **query mode=history** both pass, with archive control and inactive Org history. Hash-aware IR-003 expression is runtime-proven, not merely synthetic.

Direct proof: **D and B JSON cases.DCP-001..003.details.paint/stop/rootStop**, DCP-002 sidebarTarget; **E/desktop-boundary-proof.json**, **E/browser-boundary-proof.json**. Screenshot families parent-rest/hover/leave, copy-*, root-keyboard-focus/pending/disabled-hover/stopped-history. Screenshots inspected in **E/visual-inspection.md**. Historical gray-enabled screenshots remain historical, not current authority.

## Execution and ledger reconciliation
Exact commands/cwd/environment in **E/commands.md**. Investigation planned before execution; narrow-to-broad order and repository scorecard preceded realistic validation. Project TESTING/AGENTS, package scripts and isolated-app guide followed. No overlapping package builds/dev server, sandbox bypass or installed-app reuse.

| Layer / case | Result | Evidence |
|---|---|---|
| REP-001 | 4 files / 77 tests Pass | E/narrow.log |
| REP-002 web | 33 files / 330 tests Pass, Settings/Stop/action/TPS regression selection | E/web-regression.log |
| REP-002 Prisma | 2 files / 38 tests Pass, private engine discovery/migration command fixtures | E/prisma-unit.log |
| Syntax / synthetic / preservation | 3 MJS syntax, 5 runner, 6 helper variants, 50 byte comparisons Pass | E/syntax-check.json; E/runner-check.json; E/root-helper-check.json; E/source-preservation.json |
| API-001 | Fresh server build and six real HTTP/WS/MCP tests Pass, no skips | E/server-build.log; E/server-e2e.log |
| Desktop | Fresh build, explicit SSR-001..004,DCP-001..005 order; 9 Pass / 0 Fail | E/desktop.log; D/JSON |
| Browser | Explicit SSR-001..004,DCP-001..003; 7 Pass / 0 Fail | E/browser-prepare.log; E/browser.log; B/JSON |
| Build/guards | Production Electron web generation/transpilation/packaging, server preparation, web/localization guards all Pass | D/desktop-start.log |
| AUDIT-003 | Case order, persisted completion, CSS/native/history corroboration, source/build and cleanup Pass | E/validation-audit.json; E/*-boundary-proof.json; E/*-ledger-live-audit.json; E/isolated-list-after.json |

Ledger **reconciled**: one Started/Completed pair for each of nine desktop and seven browser cases. Exactly six separate copy/root **Checkpoint** events per surface intentionally preserved, not duplicate case completions. Read-only live observers saw persisted matching result JSON for all **16** completions. Synthetic actual runner independently checks evidence-before-completion ordering. All required cases resolved; none unstarted, blocked, failed or skipped.

## Failure history / rerun delta
No current-round failure or API-owned code repair. Initial and final current runs are the same successful attempts.

Prior API-REV-002's exact-root selector Local Fix **e00d34ffdd** remains preserved and passes with preceding SSR fixtures. Its 8/1 exploratory attempt and observer limitation remain recorded in the prior revision/evidence; not deleted or relabeled. DR-001 remains resolved. New DR-002 conflict plus IR-003 hash helper change are now directly validated on rebuilt source. No new product, requirement/design or unrelated follow-up finding.

## Confidence / broader-validation gate
Evidence judgments, not statistical probabilities; seven applicable categories, equal-weight mean. Missing critical proof cannot be averaged away.

| Category | After repository | Final | Evidence / residual boundary |
|---|---|---|---|
| Requirement and AC proof | 75% | 95% | Every critical AC direct/current; no user-only gap. |
| Changed-boundary directness | 85% | 95% | Still-mounted Settings canonical values and current computed CSS/native Stop. |
| Cross-boundary realism / mock gap | 85% | 95% | Real renderer/API/persistence/tools; only external models and outages controlled. |
| Environment/config/identity/fixtures | 90% | 95% | Fresh backend and asar, public-created private data, exact source/root IDs. |
| Failure/edge/lifecycle/recovery | 95% | 95% | Real refusal, injected transport recovery/read-only retry, held Stop, Task/continuity/history. |
| User-surface/browser/desktop | 50% | 95% | Current Mac packaged renderer plus HTTP; actual gear/Save/focus and inspected screenshots. |
| Durable coverage quality | 90% | 95% | Both parents' assertions execute intact; same-label exact targeting and hash/HTTP history proven. |

**81.4% → 95%**. Broader validation **Required and completed**: actual integrated publication, current Stop/root lifecycle and AC-006 needed fresh desktop. No category below 90; no material unresolved broader-validation risk. More paid-provider/platform certification would not materially improve this bounded renderer fix's proof.

## Environment and source identity
macOS **26.5.2 arm64**, Node **22.23.1**, pnpm **10.28.2**, Electron **42.4.1**, app **1.5.3-beta.4**. English UI; viewport 1512×952, selected shots 1280×900. Not cross-platform/mobile certification.

Fresh **--build**, **skipBuild false**, HEAD **76fab065ec30bff5be76dd2e013243abda3a6934**:
**asar SHA256 e9b395c077453afd31b5e462a1a3299c491837f7523bde29a352f09aa1ce5154**.
Owned instance **iso-65414-c9a5**. Old API-REV-002 asar **15ff98c7…** and API-REV-001 **55749a61…** not reused. E/source-identity.json, runtime-source-identity.json and D/desktop-identity.json bind source, backend/harness hashes and package; no source delta since validated HEAD.

Public GraphQL definitions, real UI/composer-created runs, actual scoped MCP tools, private HOME/data/SQLite/free ports. Production Nodes UI registers and opens the owned node in real Electron. Scripted AGY/Grok replace only external model processes/catalog/schema responses. No mocked Apollo, injected stores, persisted tree edits, secrets, live providers or user data. SSR-003 deliberately aborts one write and fails post-commit reads; Stop tests delay arrival then forward real requests.

## Coverage changes / scope / transition
**No durable source/test changes this round.** Current durable coverage remains:
- autobyteus-web/tests/e2e/delegated-launch-defaults-probe.mjs
- autobyteus-web/tests/e2e/settings-saved-model-refresh-cases.mjs
- autobyteus-web/tests/e2e/fixtures/settings-refresh-desktop.mjs
- autobyteus-web/package.json focused script.

No removals or assertion weakening. Evidence-only audit scripts under E are ticket receipts, not new product/test architecture. No TESTING.md change. Independent test-code review **Not Required — direct low-risk route**.

No compatibility wrapper or legacy branch introduced for Settings. Active stream remains a supported distinct lifecycle. Persisted data **Not Affected**: accepted selections read normally, no schema migration/reset claim. Imported Prisma engine-discovery work is byte-preserved; its unit checks and current built/private server startup pass. Incoming TPS unit/component regression also passes. Full TPS provider/transport certification and Prisma Linux Docker matrix are **Out Of Scope** for this ticket's integration validation; separate delivered target work, not silently claimed here.

## Limitations / not tested
- External CLIs scripted, not live inference; zero model quota. Provider correctness outside scope.
- Actual same-model low/xhigh reasoning proven; Fast absent from controlled catalogs, covered by configurable-schema component tests only.
- DCP-004 backend restart + renderer reload occurs **after** same-view Save assertions; not whole-desktop restart/upgrade/deployment.
- Mac desktop/browser only; no Windows/Linux/mobile or broad accessibility certification. Bounded native Stop keyboard/focus/pending directly tested.
- No standalone web vue-tsc pass (unavailable upstream); fresh production web/Electron/server compilation passed.
- Agent validation is not user acceptance or release approval. No user-only required proof remains.

## Cleanup / custody / history
**E/validation-audit.json** verifies both owned probe data roots removed, all four recorded backend/frontend PIDs absent, six recorded ports free (desktop frontend allocation unused), exact desktop data root removed and control/server ports released. Filtered isolated registry contains no owned instance; three unrelated entries untouched. Logged gated API fixture root absent.

Private unit-test DB at ignored tests/.tmp/autobyteus-server-test.db, dependencies and packaged build retained for Delivery; no user data. SDK dist remains untracked and **must not be staged**.

**134 durable screenshots** (69 desktop, 65 browser), logs, wire/DOM JSON, live ledger and boundary/cleanup audits retained in E. New logs normalized only for trailing whitespace/excess EOF; before/after hashes in E/log-normalization.json and final E/SHA256SUMS. Seven DR-002 reports/raw files byte-identical to bd0fb189e6, E/delivery-custody.json. Historical conflict patches, including markers/whitespace, unchanged and not unresolved source.

API-REV-001 remains Pass/95% pre-integration; API-REV-002 remains Pass/95% for previous base and neutral Stop. This report is current API-REV-003 and does not upgrade old evidence. Existing DR-002 blocked Delivery record remains historical; Delivery must append **DR-003** after independent verification.

## Handoff
**Pass / 95%, no unresolved in-scope failure or blocker.** Successful direct-low-risk output to Delivery subject to current rule lookup, full cumulative package and critical evidence attached. Delivery owns independent evidence verification/docs/finalization under RELEASE.md to origin/personal. **No release authorized.** Eventual completion through Solution Designer to exact Task Manager run **project_task_manager_a5f6d9d306e54970bafdad895bdf731d**.
