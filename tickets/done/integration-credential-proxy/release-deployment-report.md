# Delivery / Release / Deployment Report — integration-credential-proxy (autobyteus-311 step 1)

## Release / Publication / Deployment Scope

Repository finalization of `codex/integration-credential-proxy` into `origin/personal`, then a beta release at the user's request. `task_size=Large`, `architectural_risk=High`, reviewed route.

## Project Release Guide

- Release guide path and revision: `RELEASE.md` at `origin/personal` @ `f13dec395f` (last changed in `83e8e12125`, including the Secret Gate)
- Deviations from the guide and why: `None`
- Proposed guide fixes, and whether the user agreed: `None`

## Handoff Summary

- Handoff summary artifact: `tickets/done/integration-credential-proxy/handoff-summary.md`
- Handoff summary status: `Updated`
- Delivery revision record: `tickets/done/integration-credential-proxy/delivery-revision-record.md`
- Current delivery revision ID: `DR-001`

## Initial Delivery Integration Refresh

- Bootstrap base reference: `origin/personal` @ `8760c83788`
- Latest tracked remote base reference checked: `origin/personal` @ `f13dec395f` (fetched 2026-10-30)
- Base advanced since bootstrap: `Yes` (25 commits: autobyteus-328 `read_file` media in `autobyteus-ts`; `v1.5.11-beta.3`)
- New base commits integrated into the ticket branch: `Yes`
- Local checkpoint commit result: `Not needed` (validated state committed at `71b6c2ac41`)
- Integration method: `Merge` → `8b53331099`
- Integration result: `Completed`, no conflicts. The only shared file was `autobyteus-web/package.json`: the base bumped the version, the ticket added the `test:e2e:github-integration-card` script.
- Post-integration executable checks rerun: `Yes`, all Pass

| Check | Command | Result | Evidence |
| --- | --- | --- | --- |
| DR-01 | `pnpm -C autobyteus-ts build`; `vitest run tests/unit` (core, because the base changed core tools); `pnpm -C autobyteus-server-ts typecheck`; `pnpm -C autobyteus-server-ts build` | Pass; core unit `310 passed` files, `2089 passed` tests | `evidence/DR-01-integrated-builds-core-unit.log` |
| DR-02 | `vitest run tests/unit/credential-proxy tests/integration/credential-proxy`; `vitest run tests/e2e/credential-proxy/github-integration-graphql.e2e.test.ts` | Pass, 41 and 3 | `evidence/DR-02-integrated-proxy-unit-graphql.log` |
| DR-03 | gated live check (`AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault AUTOBYTEUS_LIVE_STRICT=1 RUN_GITHUB_PROXY_E2E=1`) and the runtime-shell suite's scripted cells (`RUN_AGY_FAILURE_E2E=1 RUN_GROK_SCRIPTED_E2E=1`, AGY probe CLI) | Pass. Live 2/2: connect through GraphQL without showing the token; curl, `gh api`, `git ls-remote` and clone through the proxy. Shells `4 passed \| 6 skipped`: AGY ticked, not ticked, team, and Grok recorded. Cell summaries: `apiHttp 200`; unticked `INTEGRATION_NOT_ALLOWED`; stopped `RUN_PASS_INVALID`; `tokenInShellOutputs []`; `onWire false`; `filesInDataDir []`; the not-ticked run and the team helper get `address null` | `evidence/DR-03-integrated-live-and-scripted-shells.log`, `evidence/DR-03-runtime-shells/*.json` (pass masked) |

- Not repeated: the live LLM runtimes (Claude, Codex, AGY live, Grok live, native) and the packaged desktop journey (API-02…07, API-11). The base changed the core `read_file` tool, which the proxy does not use; the core unit suite (DR-01) covers it. The runtime shell path is covered by DR-03.
- Delivery edits started only after integrated state was current: `Yes`
- Handoff state current with latest tracked remote base: `Yes` (re-checked before the final merge; see Repository Finalization)

## Verification

- Evidence judged: `Sufficient`
- Evidence relied on:
  - the execution report's Acceptance-Criteria Proof and Cases (95.6%, no category below 90%);
  - CRR-001 and CRR-002 Pass;
  - the files and screenshots below;
  - DR-01…03.

| Acceptance-Criteria ID | Cases And Files Checked | What You Saw | Judgement |
| --- | --- | --- | --- |
| AC-001 store, test, Connected as @login, remove, never returned | `API-11-desktop-journey.txt`; screenshots `API-11-02-card-connected.png`, `API-11-03-card-agent-ticked.png` (viewed); IMP-07/08/12; DR-02/03 | `"status":"Connected as @ryan-zheng-teki"`; `"tokenFieldEmptyAfterSave":true`; `"The token works: …"`; remove → `"Not connected"`. The card shows an empty token field after save | Proven |
| AC-002 variables in all five runtimes; none for a not-allowed agent; no token in env/ps/files | `API-01-08-runtime-shells/*.json` (10 cells); `API-09-*`; DR-03 cells | native, Claude, Codex (auto-execute on and off), Grok live and AGY live: an address and `insteadOf` set, `tokenInShellOutputs []`, `onWire false`, `filesInDataDir []`. Not ticked and team helper: `address null`, `gitConfig []` | Proven |
| AC-003 curl and `gh api` get GitHub's answer; activity record; echo redacted | cells (`apiHttp 200`, `issueNumber 1`, activity); IMP-08 (`gh api`); IMP-03 (`[REDACTED]`) | as described | Proven (echo redaction against a fake upstream) |
| AC-004 clone with no prompt; push through the proxy | cells (`lsRemoteHead true`); API-11 (12 MB clone); IMP-03 `✓ clones and pushes through the proxy, with GitHub's Basic format on every upstream call` | as described | Proven (live push to GitHub not possible with the read-only token, DEC-009) |
| AC-005 outside the definition refused; caller's header replaced | IMP-03 (41 tests), confirmed in source by CRR-001; DR-02 | Pass | Proven |
| AC-006 unknown or revoked pass; untick; no token | every cell's `statuses` (`INTEGRATION_NOT_ALLOWED` → `200` → `RUN_PASS_INVALID`); API-11 `afterRemove` `INTEGRATION_NOT_CONNECTED`; IMP-04 (failed activation) | as described | Proven |
| AC-007 token in no log, trace, output or file | `API-09-cli-home-token-scan.txt` (`filesWithToken []` for the Claude, AGY, Codex and Grok transcripts, with markers present); `API-11-desktop-token-scan.txt`; `API-12-ticket-token-scan.txt`; Secret Gate | none found | Proven |
| AC-008 docs | `credential_proxy.md` reviewed (CRR-001); delivery added the web card section | — | Proven |
| QR-001 loopback only, even with Phone Access | API-11: proxy `127.0.0.1:62799`, server `*:62751`; `proxyFromLan ECONNREFUSED`; non-loopback Host → `403 NOT_LOOPBACK` | as described | Proven |
| QR-002 large bodies stream | API-11: `gitDirBytes 12181504`, `rssKbPeakDelta 4736` | as described | Proven |
| QR-003 test vault and dummy values | API-12; Secret Gate | — | Proven |

- More evidence requested: `None`
- User check needed: `No`
- Re-verification after later re-integration: see Repository Finalization
- Not counted against the change, all recorded:
  - The first Grok live attempt was refused by xAI's quota; the retry passed.
  - The team cell's first failure was a test defect.
  - The full server e2e (API-10) had 9 files fail outside the ticket: 8 cannot load (FU-002) and 1 has a stale expectation (FU-005).

## Secret Gate

- The ticket branch was never pushed before delivery (`git ls-remote` empty).
- `scripts/check_secrets.sh origin/personal..HEAD`: 14 commits, `PASS`, before any push. Results on the merged state and before tagging are under Repository Finalization and Version / Tag.

## Release Decision

- Decision: `Beta`
- Decided by: the user, in the Delivery Engineer conversation on 2026-10-30: "if everything is good , i would prefer a beta release thanks". The Task's constraint was "no release unless asked".

## Docs Sync Result

- Docs sync artifact: `tickets/done/integration-credential-proxy/docs-sync-report.md`
- Docs sync result: `Updated` (`autobyteus-web/docs/settings.md`, new section "Server Settings: GitHub")

## Ticket State Transition

- Ticket moved to `tickets/done/integration-credential-proxy`: `Yes`

## Version / Tag / Release Commit

- pending

## Repository Finalization

- pending

## Release / Publication / Deployment

- pending

## Post-Finalization Cleanup

- Dedicated ticket worktree path: `/Users/normy/autobyteus_org/autobyteus-worktrees/integration-credential-proxy`
- pending

## Release Notes Summary

- `tickets/done/integration-credential-proxy/release-notes.md` (`Updated`), written before finalization, for the next stable release; betas use generated notes

## Deployment Steps

- None beyond the published Docker image (`RELEASE.md` Deployment).

## Environment Or Persisted-Data Transition Notes

- Persisted data: a new vault entry `integration.github.token`, written only when the user connects GitHub, plus the integration settings (allowed agents) and `activity.jsonl`. No migration. Delivery action: `None`.

## Rollback Criteria

- If agents lose GitHub access unexpectedly, the proxy forwards outside its definition, or a token appears anywhere outside the vault: revert the merge on `personal` and cut the next beta.
- Rolling back is possible. The pre-ticket vault reads and removes entries only by ID: `authorize` checks per call, and nothing scans or deletes the whole store (`secret-management-service.ts`, `secret-vault-repository.ts` at `8760c83788`). So an earlier build leaves `integration.github.token` unused and untouched.

## Final Status

- pending
