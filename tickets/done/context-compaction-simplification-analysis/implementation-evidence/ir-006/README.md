# IR-006 — API-F007 numeric Settings classification Local Fix

Current authority: `/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis/tickets/in-progress/context-compaction-simplification-analysis/implementation-handoff.md` and `implementation-revision-record.md`. Trigger CRR009 Fail/Local Fix, API005 Fail78.6 / API-F007 Open. Approved SR028/SR030, ARCH003, SR031 unchanged. **Large/High**; ready for source re-review only, not API closure or Delivery.

## Scope / rationale
Supported user action Settings -> Server Settings -> Compaction configuration -> Effective context override 16000 -> Save. CompactionConfigCard/store -> ServerSettingsResolver -> ServerSettingsService -> AppConfig -> normal read/reopen. The original credential-name heuristic matched TOKEN in TOKENS before the already-public editable metadata could apply. Exact-key classification now exempts only AUTOBYTEUS_ACTIVE_CONTEXT_TOKENS_OVERRIDE, using one predicate for ordinary reads/writes; generic regex, credential editors, validation and AppConfig policy unchanged. Similar names and genuine credential names remain blocked and hidden. No general metadata bypass, registry, migration, retry, default/support or design change.

## Exact fresh implementation commands
Run in `/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis/autobyteus-server-ts`:

1. Before production edit, after adding implementation unit regressions:
```sh
pnpm exec vitest run tests/unit/services/server-settings-service.test.ts --no-watch
```
`unit-before-fix.log/.exit`: exit1, **43Pass/1Fail**. New public-key write is the sole failure; twelve credential/read-filter controls pass. Retained red evidence, not waived.

2. Final focused unit + narrow service persistence integration:
```sh
pnpm exec vitest run tests/unit/services/server-settings-service.test.ts tests/integration/services/server-settings-service.integration.test.ts tests/unit/config/app-config.test.ts tests/unit/api/graphql/types/server-settings.test.ts --no-watch
```
`settings-local.log/.exit`: exit0, **4files/80Pass** (44 service-unit, 2 real AppConfig integration, 27 config-unit, 7 resolver-unit). Numeric save/readback/recreated-service + real config reload/clear; rejection/read filtering of credential-like/similar keys; readonly/retired/custom handling; existing applicable enum/tuple/other validation. Isolated synthetic temp config; setting written only via public service; no hidden setting injection, provider/credential access or API/E2E campaign. Test temp directories removed normally.

3. Production typecheck, no generated output replacement:
```sh
pnpm exec tsc -p tsconfig.build.json --noEmit
```
`server-production-typecheck.log/.exit`: exit0. Not full test-tree/web typecheck.

From worktree root, owned diff whitespace check:
```sh
git diff --check -- autobyteus-server-ts/src/services/server-settings-service.ts autobyteus-server-ts/tests/unit/services/server-settings-service.test.ts
```
exit0; new integration file whitespace checked by audit. No global pending diff normalization.

## Ownership and limits
- `source.patch`, `source-inventory.json`, `source-size-check.json`: exact three owned paths; 7 additions/3 deletions production. No commit/stage/push/merge/remote refresh or cleanup. HEAD remains6908ccff483f1eca522caa65bfaaf6dcfcc26750.
- `entry-audit.json` pins current pending/reference bytes. `final-audit.json` and `api-owner-preservation.json` distinguish only authorized IR006 changes; all ten API paths untouched. SDK/generated outputs preserved, normal ignored Prisma generation may occur during standard test setup.
- `rendered-result-check.md`: CUA no surfaces/native pipe failure; actual fixed desktop/HTTP/GraphQL save/reopen unverified here. Existing API positive-red and negative-control source unchanged, **not rerun** by implementation.
- Current API005 **Fail78.6**, previous API004Fail90.7 historical. F007 implementation candidate only; reviewer/API closure pending. Source CRR0089.40 historical, affected readiness rationale corrected byCRR009. Successful ten-path API test review still pending; no test approval or confidence rescore.
- Integrated heldA/attachment/queuedB/retry/cancel/postresponse/reconnect/savedresume campaign stopped at Settings failure; loopback3parent/0compaction/0remote onlyprotocol evidence. No live provider budget.
- Preserve F006 corrected/C01Pass (attributed), F005SR020acceptedknownnonblocking/notfixed/notPass/QwenSTOPPED, F004originalunknown, SR0221fidelityFail/3scopedusable/exhausted/v6parked. SR031 unsupported repeated-ID diagnostic remainsFail/not scored; no withdrawn retention machinery.
-14 inherited residuals,7 baseline contract failures,webtypecheck6836/fullsuite/crash/currentlive and Delivery/user gates remain unwaived.

Complete cumulative input refs plus current evidence: `reference-index.json`; presence check `reference-check.json`. Copies prefixed `entry-` are frozen intake, not competing current authorities. Final sole routing recorded after fresh get_handoff_rules.
