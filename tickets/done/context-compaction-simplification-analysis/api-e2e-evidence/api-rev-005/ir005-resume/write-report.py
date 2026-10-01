from pathlib import Path
import json
e=Path(__file__).resolve().parent;t=e.parents[2]
# Canonical current report prepends current result; older sections remain historical.
report='''# API-REV-005 — current completed result: Fail / 78.6%

Date: 2026-09-30. **API-F007: normal Compaction Settings cannot save the effective context ceiling.** Preliminary Local Fix in production settings classification; focused failure-origin review requested, not successful-test review or Delivery. Large / High / reviewed route unchanged.

Current source/HEAD: 6908ccff483f1eca522caa65bfaaf6dcfcc26750, branch codex/context-compaction-simplification-analysis; refreshed origin/personal8caa610ff438c288d9aca9f2efe2c33924fbf517. Current pending worktree reviewed, not HEAD alone. Authority: approved SR028 REQ001–012 / AC001–017, SR030 design, ARCH-REV003 Pass, SR031 supported-scenario clarification, IR005, CRR008 source Pass9.40. Full cumulative SR/ARCH/IR/CRR/API chain retained. Product supplements and Delivery N/A. No production changes, commit, push, merge or release.

This completes the resumed API005 round. Its earlier interruption and SR022 diagnostic remain historical sections below. API004 Fail90.7 is the prior completed result, not the current score. The reduction reflects expanded critical recovery/UI scope and a newly observed valid settings failure, not a regression inferred from test totals.

## Investigation and executable surfaces

Investigation preceded execution and each durable change. Applicable instructions: root TESTING.md; server/web AGENTS.md; package manifests/Vitest configs, standard server Prisma setup; docs/isolated-app-instances.md; skills/autobyteus-isolated-app/SKILL.md; advertised browser-automation/SKILL.md and its bundled CLI. Core package test script is a placeholder, so use the established pnpm exec vitest runner; web test:nuxt uses normal Nuxt config/happy-dom. No direct CDP or hidden UI state manipulation.

Changed boundaries assessed: direct strategy/provider attempt budget, host acceptance/persistence, native runtime waiter, server admission/FIFO/ACK/stop, shared contracts, standalone/Team/Org live projection, renderer/composer and real settings transport. Existing implementation fixtures are valid but synthetic native strategy/runtime tests do not prove full UI recovery or real model quality.

Broader validation **Required**. An owned worktree-built desktop and local LM Studio-compatible protocol emulator were selected to exercise actual settings/model discovery/factory/adapter/runtime/stream/renderer while making failures deterministic. Emulator has no outbound client and was explicitly capped at40 local requests/30min; remote budget0. It is not LM Studio inference, DeepSeek, Qwen, or semantic evidence. Only3 parent seed requests occurred, all through actual user submissions; 0compaction requests. No credentials, private source env or private history accessed.

## Results and limits

Evidence root: api-e2e-evidence/api-rev-005/ir005-resume/. Exact commands, working directories, timestamps and exit codes are in each case JSON/log; ledger records in-flight checkpoints.

| Case | Current evidence |
| --- | --- |
| API-C01 shared prerequisites | 3 files /28 Pass: real current normalizer/facade, event and termination fixtures; corrected Unicode assertion retained. |
| API-C13 strategy/host/provider | 5 /84 Pass: three strategy attempts, success positions, invalid output, cancellation/backoff, SDK invocation-local controls, host ownership. Mocked transports, not remote calls. |
| API-C14 server recovery | 4 /23 Pass: native recovery/FIFO, races/admission/ACK and supported root-command scenarios. No unsupported same-ID Team/Org resend claim. |
| API-C14-core | 8 /55 Pass: actual core runtime lifecycle and compaction integration with synthetic LLMs, worker/status/assembler. |
| API-C06 renderer | 11 /175 Pass: standalone/Team/Org streams, stale/wrong-run projection, state hydration/composer and message display. Happy-dom/components, not full UI recovery. |
| API-C05 settings/history/parent | Initial7 /41 Pass. Added missing context-control regression: focused1 Pass/1 Fail/11 filtered; final full GraphQL file12 Pass/1 Fail. Exact compaction tuple tests remain passing but do not cover the failed numeric key. |
| API-C11 preserved snapshots | Initial8 /134 Pass/1 Fail. One stale current-writer schema_version assertion corrected after approved behavior audit; focused restore-flow1 Pass. Other134 results unchanged. Real temp filesystem/core continuation, not desktop resume/power-loss. |
| API-C09 isolated product | Worktree build/start/browser attach Pass. Normal UI endpoint/model/agent/workspace creation and3 streamed synthetic parent turns Pass. **Compaction Settings save Fail**, reproduced twice in UI and separately over real HTTP. Further recovery phases stopped, not passed. |
| API-C08 current live semantic sample | Not run; remote0. Prior actual DeepSeek semantic findings retain original source/config/sample limits; no current strategy acceptance inferred. |
| API-C09 remaining / C10 | Held A with attachment, later B/full retry UI, renewed failure, cancellation, post-response error/reconnect, saved-run resume and whole-archive/power-loss not executed in this product campaign. Repository proofs and older scoped evidence remain attributed only. |

Fresh final distinct selected assertions: **542 Pass /1 Fail across46 files** (not the sum of repeated attempts). Original C11 stale-assertion failure and repeated F007 reproductions remain in logs; no full-suite claim. Initial six groups gave406 Pass before product execution. Current full web typecheck was not rerun: implementation6836 failures and prior14 broader residuals plus7 independently baseline-reproduced contract failures remain disclosed, not waived.

## API-F007 — supported settings save rejected as a credential

- Valid expectation: REQ008 / **AC010**, with related settings AC012: current optional effective-context override remains usable through normal Settings. A positive16000 value is not secret material.
- Actual journey: Settings → Server Settings → Compaction configuration → Effective context override16000 → Save. Visible alert: “Compaction configuration was not saved. Sensitive settings must use their write-only credential editor.” Reopening shows blank; typed value was not persisted.
- Real HTTP mutation to owned server65101 reproduces rejection; filtered before/after query shows key absent. This is an application rejection in HTTP200 GraphQL data, not a transport or provider failure.
- Source hypothesis: ServerSettingsService tests unanchored SENSITIVE_SETTING_NAME containing TOKEN before editable-setting metadata; it matches TOKENS in AUTOBYTEUS_ACTIVE_CONTEXT_TOKENS_OVERRIDE. Same regex/guard bytes at refreshed base8caa610f,5cb7b049 and6908ccff. Source identity is not a full baseline execution and does not waive current accepted behavior.
- Durable GraphQL positive regression now fails with identical text. Adjacent synthetic credential-key rejection control passes; no weakening of security guards or production fix by API owner.
- Evidence: API-F007-ui-reopen.json, API-F007-ui-confirm.json, API-F007-settings.png, API-F007-http.json, API-F007-origin-audit.json, API-F007-regression.log/.json, API-C05-final.log/.json.
- Preliminary classification **Local Fix — production/server settings**, recommended Implementation Engineer after Code Reviewer confirms origin. No requirement/design change proposed. This is not evidence that retries themselves fail.

## Durable coverage delta

Two paths changed this resumed stage:
1. autobyteus-server-ts/tests/e2e/server-settings/server-settings-graphql.e2e.test.ts: add numeric-context positive and secret-name negative tests; existing cumulative tuple tests preserved. This was already one of the nine API-owned paths.
2. autobyteus-ts/tests/integration/agent/working-context-snapshot-restore-flow.test.ts: change misleading strict-v5 title and obsolete schema_version expectation to exact current versionless keys. Test constructs current serializer output. Restore/continuation checks unchanged, focused rerun Pass. API005-LF001 test-owned correction, not production defect.

Before-images and focused patches retained. Eight of nine prior API files unchanged; IR005's171 source/adapted inventory entries still match. Cumulative durable API review scope is now **ten paths**, all require eventual successful proportional test-code review; this failure handoff does not approve them. F007 positive test deliberately remains red.

## Mandatory confidence scorecard

Percentages are evidence-confidence judgments, not pass rates or measured probabilities. The repository-only scorecard below is recorded at final reconciliation from the first406 results, not falsely presented as a contemporaneously recorded pre-browser score.

| Category | Repository-only | Final | Evidence / remaining gap |
| --- | ---: | ---: | --- |
| Requirements / acceptance proof |75|50|New critical AC010 failure; AC014/017 full-product evidence incomplete.|
| Changed-boundary directness |90|90|Real native runtime/strategy/admission execution and actual settings HTTP; provider failures mocked.|
| Cross-boundary realism / mock gap |75|75|Actual desktop/server/adapter streaming seeds, but full recovery not reached.|
| Environment / config / identity / fixtures |95|95|Fresh worktree-built app, owned ports/data, real normal setup, bounded synthetic emulator; no private data.|
| Failure / edge / lifecycle / recovery |90|85|Strong deterministic counts/races/cancel/stop; full-product combinations remain unobserved.|
| User surface / browser / shell |50|65|Actual settings rejection and ordinary streaming rendered; no retry-composer/held/reconnect acceptance. Packaging startup is not all shell proof.|
| Durable regression relevance |95|90|Invalid schema assertion corrected, missing valid settings regression added/red; cumulative review pending.|

Repository-only570/7 =81.4%; final550/7 =**78.6%**. Default95% gate not met, multiple categories<90 and critical valid failure. **Overall Fail**, not external Blocked. Broader validation remains Required after correction; do not substitute setting-file edits or change thresholds behind the UI to claim the failed control works.

## Historical dispositions / remaining limits

- API-F006: CRR007 correction remains resolved; C01 fresh28 Pass. No arbitrary emoji or LLM wording constraints reintroduced.
- API-F005: SR020 accepted known deviation/non-blocking, **not fixed/Pass**. Qwen stopped; no waived remedy handoff.
- API-F004: original continuation cause remains unknown. No new reproduction or asserted root cause.
- SR022 four-call campaign exhausted:1 fidelity Fail /3 scoped usable. No v6/default/support change or semantic-repair authorization inferred.
- SR031 same-ID Team/Org injected diagnostic remains historical Fail with unsupported production premise, excluded from acceptance score. Fresh-ID supported cases retained; no withdrawn shared-retention design.
- Old persistence/migration/source/provider/research/license/prompt supplements preserved via complete reference index. Full suite, full-tree typecheck origin, integrated recovery/browser coverage, repeated-current live fidelity and crash limits remain explicit.

## Cleanup and routing

Owned instance iso-65100-17c1 stopped through pnpm isolated-app stop; data root removed, control65100/server65101 released. Emulator PID44436 stopped, port65300 released; disarmed before cleanup, no held responses. Exact safe fixture/wire/logs retained. No shared app/provider/private vault/history touched, no generated SDK cleanup, no commit/push/merge/release.

Current reports, ledger, revision history, entry/final audits and full cumulative references are authoritative. Request **focused failure-origin review** for API-F007 with preliminary production Local Fix; successful ten-path review/Delivery remain pending. Routing receipt is recorded after confirmed handoff.

---

## Historical report (preserved; superseded as current status)
'''
p=t/'api-e2e-execution-coverage-report.md';p.write_text(report+'\n'+p.read_text())
invest='''

# API-REV-005 final reconciliation — Fail78.6%
Current result is API-F007 production-settings rejection (preliminary Local Fix), not environmental Blocked. Valid context override save cannot be bypassed to claim UI acceptance. Initial406 repository Pass led to required broader work; final distinct542Pass/1Fail after C11 stale-test correction and F007 durable regression. Full case/failure/scorecard/source/cleanup rationale in canonical report and ir005-resume/README.md. Repository-only reconstructed score81.4%, final78.6%; retrospective recording disclosed. Actual browser revealed a missed valid boundary despite C05 tuple tests passing. Broader recovery/resume remains Required after owner correction. Stop at failure and route focused origin review, not successful-test review. Cumulative API durable scope now10 paths. Historical failures/exceptions and all residuals unchanged.
'''
with (t/'api-e2e-coverage-investigation.md').open('a') as f:f.write(invest)
with (t/'api-e2e-test-case-ledger.md').open('a') as f:f.write('''

API005 final C09: Fail / API-F007 / REQ008 AC010 (related AC012). Two actual UI attempts and one public HTTP reproduction reject positive numeric context ceiling as credential; no persistence. 3 local scripted parent requests,0compactor,0remote. Remaining heldA/B/attachment/retry/post-response/cancel/reconnect/resume phases Not Tested, not silently passed. Stop condition applied.
API005-LF001 / C11: original134Pass/1stale schema assertion Fail retained; approved versionless correction1Pass. New durable path requires review.
API005 cleanup: iso-65100-17c1 stopped normally, own data removed;65100/65101/65300 released, emulator stopped/disarmed. Source unchanged; owner evidence/fixtures retained.
API005 completed overallFail78.6,542distinct selectedPass/1Fail. Code Reviewer focused origin review requested; no Delivery or successful ten-path test review.
''')
p=t/'api-e2e-revision-record.md';s=p.read_text();pos=s.index('## Revision entries')
row='| API-REV-005 | CRR008 IR005 source Pass; resumed after SR028/030/031 | SR028/030/031; ARCH003; IR004→005; CRR007→008 | API004 Fail90.7% | Fail78.6%; API-F007 settings rejection; current recovery UI unproven |\n\n'
s=s[:pos]+row+s[pos:]
s+='''

### API-REV-005 — Resumed recovery validation; real settings control fails
- Date2026-09-30; trigger CRR008 source Pass9.40 / IR005, after prior API005 requirement interruption. Approved SR028/SR030/ARCH003 and supported-scenario SR031. Large/High unchanged. Source6908ccff; full pending package read/preserved.
- Previous complete API004Fail90.7; current **Fail78.6%**. No intermediate interruption/diagnostic is fabricated as a completed result.
- Fresh cases C01,C13,C14,C14-core,C06,C05,C11: final distinct542Pass/1Fail. Full actual worktree app starts; public UI config/model/agent/workspace and3 synthetic parent streams succeed, compaction context override save fails. No provider generations beyond3 bounded local emulator seeds; remote0, compactor0.
- **API-F007** new/Open: REQ008/AC010 (+relatedAC012), ordinary positive numeric ceiling rejected by credential-name guard. Two UI observations + actual HTTP + durable schema regression. Preliminary Local Fix production settings; source guard bytes inherited at base, not waived. Focused failure-origin review/Implementation owner recommended.
- Durable delta: existing server settings GraphQL path adds valid positive and secret-negative tests; core restore-flow title/exact-key assertion updated for current versionless writer, focusedPass. Investigated before edits. Now10 cumulative API paths pending eventual successful proportional review.
- **API005-LF001** initial C11 stale schema_version assertion resolved test-only; original134Pass/1Fail retained, corrected1Pass. Not production regression.
- Prior API-F006 CRR007 narrow correction remains resolved/C01Pass; F005 accepted known/nonblocking underSR020, notfixed/Pass/Qwenstopped; F004 unexplained historical continuation. SR0221fidelityFail/3usable exhausted, v6 parked. Unsupported same-ID Team/Org diagnostic retains historicalFail, not acceptance risk. Seven contract baseline failures/other14/fulltypecheck6836 not waived.
- BroaderRequired before and after current execution; full-product heldA/queuedB/attachments/reconnect/resume/cancel and current semantic sample not reached. No assertion allmodelsPass, no crash/power-loss/fullsuite/typecheckPass.
- Final mean550/7=78.6%; requirement50/user-surface65, valid critical failure preventsPass regardless of total. Reconstructed repository-only81.4% disclosed.
- Cleanup own iso-65100-17c1 and emulator complete, own data removed/ports released; no private credentials/sourceenv/history or shared app touched. Exactv5/source/IR005171inventory preserved. No commit/push/merge/release.
- Canonical investigation/report/ledger/this history updated; evidence api-e2e-evidence/api-rev-005/ir005-resume; cumulative reference index and source/test audit attached. No Delivery; focused origin routing receipt follows confirmed handoff.
'''
p.write_text(s)
(e/'README.md').write_text('''# API-REV-005 resumed on IR005 — Fail78.6%

Canonical current authority is ../../../../api-e2e-execution-coverage-report.md (ticket-level file; see absolute reference-index.json), investigation and revision record. API-F007 is the valid settings failure, not a provider failure.

## First read
- API-F007-ui-confirm.json and API-F007-settings.png: actual rendered rejection.
- API-F007-ui-reopen.json: numeric draft did not persist.
- API-F007-http.json: same normal public mutation fails, key absent before/after.
- API-F007-origin-audit.json: unanchored TOKEN matches TOKENS; identical baseline/current guard, no full baseline execution claimed.
- API-F007-regression.log/.json and API-C05-final.log/.json: valid numeric regression red; credential-negative and prior tests pass.
- F007-regression.patch; server-settings-before-F007.ts: new durable coverage exact delta.
- API-C11.log/.json; restore-flow-correction.patch; restore-flow-before.ts; API-C11-corrected.log/.json: stale writer assertion audit and correction.
- entry-audit.json, final-audit.json, cleanup.json; full canonical reports and index.

## Exact executable commands
Case JSON/logs carry every repository command/cwd/exit. run-case.py runs nonwatch normal package Vitest/Nuxt surfaces, no remote flags. Case sums in canonical report deduplicate focused and full repeats. Initial406Pass then preserved snapshot134Pass/1staleFail, corrected1Pass; added GraphQL1Pass/1Fail, finalwholefile12Pass/1Fail. Finaldistinct542Pass/1Fail across46files, not full suite.

Actual app: pnpm --silent isolated-app start --build from assigned worktree. Returned iso-65100-17c1/control65100/server65101. Browser CLI environment CHROME_REMOTE_DEBUGGING_PORT=65100 BROWSER_AUTOMATION_ATTACH_ONLY=1, health-check before list-tabs, exact returned tab used throughout. UI evidence ui-01..21. Setup through UI; no hidden store or queue injection.

loopback-manifest.md declared40local/0remote; loopback-provider.mjs exposes discovery and OpenAI chat on own127.0.0.1:65300 with no outbound implementation. Node syntax checked; original disarmed state observed, then3 deliberate synthetic parent requests, no compactor before settings failure. No claim full response-hold/retry emulator behavior certified because never reached. Wire is synthetic fixture data and no headers. Invalid shell quoting in ui-04-set-host.json failed before action; corrected ui-04b successful, retained transparently.

Cleanup through pnpm --silent isolated-app stop iso-65100-17c1 and SIGTERM owned emulator44436; own data removed/3ports free. Generated build outputs remain, synthetic fixture retained as evidence. Never read/import private credentials or history; no DeepSeek/Qwen external calls.
''')
