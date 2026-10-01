# API/E2E Execution Coverage Report — API-REV-003

## Latest authoritative result

**Pass — approved AGY-only scope, 95.7% confidence.** SR-006 / IR-003, Small / Low, Direct Low-Risk. **The full repository E2E suite is not green:** 43 failed assertions are reproduced with baseline production behavior and remain disclosed/out of this ticket's repair scope. This is not release approval, a parent-ticket Pass, or closure of API-F001.

Candidate: `cb7688c4e25d0d990d1f196ea59142dff824d0ea` on `codex/agy-mcp-tool-call-presentation-only`, directly over `b0b077b02571098a6bf7993ab46b67a69fdb8f9d`. Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-mcp-tool-call-presentation-only`. Final tracked/index diff empty. No durable edits or commit this round.

## Authority, investigation and routing

First fresh API execution of the **new** narrow ticket; API-REV-003 continues inherited cumulative numbering. Requirements REQ-001..007 / AC-001..008 / BEH-001..006 / SCN-001..004, decisions DEC-001..005. Canonical basis: `requirements-doc.md`, `investigation-notes.md`, `design-spec.md`, `solution-handoff.md`, `solution-revision-record.md` SR-006, `user-original-scope-approval-20261001.md`, `implementation-handoff.md` and `implementation-revision-record.md` IR-003. Scope/import audit in implementation-evidence/ir003 and recovery-evidence/scope-reset-sr006 confirms only nine AGY paths plus two TESTING rows.

Current architecture/source independent review: **N/A — not applicable** (Small/Low). Copied ARCH-REV-001, CRR-001/002, API-REV-001/002 and DR-003 are historical parent context, not current passes. Successful-output route Delivery; proportional test-code review **Not Required — direct low-risk route**; no durable test changes. No new requirement/design uncertainty or in-scope finding remains. Expanded Team/migration/preflight work and API-F001 stay preserved/deferred, not silently accepted or fixed.

Initial coverage investigation and ledger were written before execution. Applicable root TESTING.md, server/web AGENTS.md, manifests/config/setup and isolated-app instructions followed; no closer TESTING guideline. Explicit fresh server build preceded built-server checks because current root test:e2e does **not** build. Cases recorded incrementally and reconciled below; none still running. Extra diagnostic token ordering and temporary desktop automation corrections are explained, not hidden.

## Boundary, acceptance and ledger reconciliation

All evidence below is relative to `api-e2e-evidence/api-rev-003/`. Exact commands/cwd/configuration: `commands.json` and retained executable scripts.

| Case | Requirements / boundary | Fresh result | Evidence |
| --- | --- | --- | --- |
| TC-001/002 | AC-001..008; projection/converter/native/denial/IDs | Build/bootstrap Pass; AGY unit folder **168 pass /0 fail /5 opt-in skipped** | build.log, agy-units.json |
| TC-003 | AC-001,003..008; actual WS→converter→history/Files | Explicit fake transport cohort **9/9 pass**; seven start/terminal identities, own args/results, error/fallback, exactly one MCP-media Files entry, terminate/reopen | fake-agy.json, fake-evidence/agy-mcp-tool-call-transport.json |
| TC-004 | BEH-006 / SCN-004 / DEC-004; old writer→new reader | **Pass:** base converter wrote wrapped calls; current process on same data returned identical conversation/activities; persisted run-file SHA256s unchanged | old-writer/old-writer-result.json, old-writer/old-projection.json, old-writer/current-projection.json |
| TC-005/008 | AC-002,005,007; actual provider/platform collaboration/native image | Live AGY Team/Org and native-image **3 pass /1 optional imported-Codex-package skipped** | live-agy.json, live-evidence/, live-agy.log |
| TC-006 | SCN-002/003; real third-party MCP args/results/error | **Pass:** AGY1.2.14 SUCCESS; real MCP server received nested echo_args, empty json_result args, always_fails; provider wrapper/error captured | agy-mcp-call-shape-probe/summary.json, stdout.jsonl, mcp-server-messages.jsonl |
| TC-007 | AC-001,003,005,006,008; browser Activity + reload/reopen | **Pass:** current Nuxt→built backend→scripted CLI; all seven titles, own arguments/structured results, error/fallback; reload and stop/reopen; zero page errors | renderer/tc-007-activity-panel-evidence.json, screenshots/logs |
| TC-013 | Full packaged product/native preservation/lifecycle | **Pass:** current isolated Electron app, seven scripted MCP/native Activity items and exact detail values; reload and process-reopen; installed real AGY native run_command output displayed and persisted after restart | desktop/desktop-result.json, fake-activity.png, fake-restarted.png, real-native.png, instance.log |
| TC-012 | Broad affected regression | **Fail, inherited/out-of-scope repair:** current full E2E **195 pass /43 fail /133 skipped**, no AGY regression; every failing identity reproduced on baseline | full-e2e.json; failure-provenance.md; final-failure-provenance.json |

AC-001 exact delegate_task display/args/start-terminal consistency is exercised through the real backend and both renderers with a scripted CLI. A live model-selected delegate_task invocation specifically was not repeated; live actual platform send_message_to and fresh third-party wrapper captures close provider-shape realism. This name-independent projection does not alter delegation semantics. AC-004 empty args, AC-005 denial/error, AC-006 malformed/blank wrappers, AC-007 native image/MCP-name guards and AC-008 array/object versus primitive/text output have explicit unit expectations. No skipped test is counted as passed.

## Non-AGY failures: execution and separation, not a waiver

Full baseline-equivalent suite: **197 pass /41 fail /133 skipped**; its41 failing identities match candidate failures. The remaining two token analytics failures pass in isolation on current code (5/5), but a deterministic four-file diagnostic ordering reproduces both on current **and baseline** (12 pass /2 fail each). Unit-price/provider-semantics tests leave analytics facets after deleting their run records: the observed contamination is exactly an extra1,000,000 output tokens/report and a safe-integer overflow. No AGY conversion occurs in those fixture operations. `failure-provenance.md` lists all12 files and reproduction basis.

Baseline method: temporarily replace the **only existing changed production file**, converter source and its compiled counterpart, with exact base source/transpilation. Other existing production source and every failing test are byte-identical to base; the added helper is unused. Backups and finally-restoration hashes retained. This is **production-equivalent baseline behavior**, not a clean separately installed base checkout. No false claim that all43 reproduced in one baseline run. All43 have reproduction across the full and ordered diagnostic runs. No assertion removal, skip masking, whitelist, or excluded repair.

API-F001 architecture conflict remains inherited and deferred under SR-006/CRR-002, not resolved here. Full unit/architecture, full integration, web-wide/core-wide suites and other provider opt-ins were **Not Tested this round**; focused AGY units, actual transport, full E2E and live/rendered/desktop boundaries are the selected proportionate regression evidence. Historical totals are not credited as current passes.

## Confidence gate

| Mandatory category | Post-repository | Final | Direct evidence / bounded residual |
| --- | ---: | ---: | --- |
| Requirement and AC proof |90%|95%| Exact narrow invariants and UI assertions; specific live delegate_task selection not repeated |
| Changed-boundary directness |95%|100%| Real converter execution, WS/persistence/Files, built and packaged servers |
| Integration realism/mock gap |75%|95%| Actual AGY platform + third-party captures + native image; deterministic adverse packet cases explicit |
| Environment/config/identity/fixtures |95%|95%| Fresh build/package, scoped live identities, owned DB/roots/ports; reconstructed base writer limitation disclosed |
| Failure/edge/lifecycle/recovery |75%|95%| Failure/denial/fallback, stable IDs, old writer bytes, reload/terminate/process restart |
| User surface/browser/desktop |50%|95%| DOM assertions in Nuxt and actual packaged app; real CLI command and restarted history |
| Durable regression quality/relevance |90%|95%| Existing narrow unit/fake/live coverage valid, opt-ins enabled; broad failures separated with executable provenance |

Simple mean **81.4% →95.7%**. No final category below90%. Critical original acceptance behavior has direct proof; no material in-scope unresolved failure. Broader validation **Required — completed**, not waived because repository tests passed. No current future-AGY-version guarantee, live permission-denial policy exercise, or full model matrix claim.

## Realistic setup, temporary methods and cleanup

- macOS arm64 Darwin25.5.0; Node22.23.1, pnpm10.28.2, AGY1.2.14 (`environment.txt`). Electron42.4.1 / Chromium148.0.7778.265; final viewport1440×1000. Browser probe uses installed Chrome, en-US. No credentials printed/copied/imported; live AGY uses its normal existing auth.
- Server Vitest phases ran serially against this worktree's owned test SQLite DB with documented setup. Runtime subprocess probes create only their own roots/free ports. Old-writer clone uses exact base converter in a current built-server clone; it and both writer/reader processes/data removed, receipt retained.
- Nuxt/Chrome probe launched owned processes and temp root, closed browser, terminated owned backend/frontend, deleted its root. Screenshots supplement exact DOM/API assertions.
- Desktop: `pnpm --silent isolated-app start --build`, then own reported instance IDs for restart/stop. Because browser-automation has no runtime-advertised locator/tool, temporary project Playwright/CDP automation attached only to the reported owned endpoint. Fake CLI settings added only to the disposable instance .env; restored before real AGY run. User content created/sent via UI; no production data accessed.
- Desktop first three attempts exposed temporary automation assumptions: blindly toggled already-open sections, assumed visible Activity despite responsive drawer, navigated saved route before initial bootstrap. Corrections open only hidden sections, select Activity, and await ready home before navigation; **all exact data assertions unchanged**. Failed-attempt JSON/screenshots/logs retained in desktop-attempt1..3. Final complete attempt passes. No production/UI correction was made.
- All four owned instances `iso-61037-b04d`, `iso-61514-023b`, `iso-61729-667d`, `iso-61927-503e` stopped via lifecycle tool; roots removed and ports released per receipts. Final list has no owned running instance. No installed/user app stopped or reused. Real AGY's normal conversation/native-image cache retained, no global cleanup.
- Source/dist diagnostic overrides restored byte-for-byte; final tracked/index diff empty. Existing parent artifacts, checkpoint9038c218b and all incoming untracked evidence/generated outputs preserved. New build artifacts retained locally. No commit, push, tag, publish, deployment, release or user-verification claim.

## Persisted-data and compatibility decision

**Directly Usable / No Migration**, DEC-004. Old stored wrappers remain unchanged, new runs use existing fields. Fresh old writer→current reader across actual process replacement preserves exact projection and run-file hashes; current new-history replay proven via API/browser/packaged restart. No version-specific runtime branch, dual read/write, legacy-retention layer, or compatibility-only durable test added. No upstream invalid compatibility scope observed.

## Handoff

Current canonical investigation/report/ledger/revision record updated in place; inherited snapshots remain clearly historical. Proposed rule outcome: **Pass, Small/Low direct route → Delivery**. Delivery owns fresh user verification, latest-base integration and applicable release/finalization gates. Keep the full-suite failures/API-F001 disclosure; do not merge the expanded repair branch or infer missing historical reviews as passes.

Confirmed routing rule selected: **/delivery_engineer**, Pass / Small-Low direct / no required durable-test review.
