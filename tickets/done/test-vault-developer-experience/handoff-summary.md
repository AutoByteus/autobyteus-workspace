# Handoff Summary: test-vault-developer-experience

- Project Task: `c15a77b2-18b8-4ac6-b3de-8afcba81211e`
- Classification: `task_size = Large`, `architectural_risk = High`, route `Reviewed` (architecture review, code review, API/E2E, proportional test-code review)
- Delivery revision: `DR-001`

## What Was Delivered

Real-provider keys for tests and investigation now come from one standing **test vault**, selected by `AUTOBYTEUS_TEST_VAULT` the way `DATABASE_URL` selects a database:

- `pnpm test-vault setup --source <file>` (once, by the user), `status` and `remove`. The vault lives at `~/.autobyteus-test/vault` by default, and locations inside the user's app data are refused.
- A server started with the variable (`test:e2e:real`, an isolated instance or a manual server) reads the vault read-only. Settings saves fail with `SECRET_VAULT_READ_ONLY`. An unusable vault stops startup. When the variable is unset, or on the real `~/.autobyteus/server-data`, the server uses its own vault as before.
- autobyteus-ts reads the variable itself, so a plain `node`/`tsx` script or a Vitest live run gets keys without a resolver. The embedded and standalone servers turn this default off and use their own resolvers.
- Live tests stay opt-in (`RUN_LIVE_PROVIDER_TESTS=1` / `RUN_*`). Deterministic suites ignore the variable. A missing key is a reasoned skip, and `AUTOBYTEUS_LIVE_STRICT=1` turns it into a failure.
- Env-sourced test credentials are gone: test setups delete inherited `*_API_KEY` variables.
- The Electron embedded server receives only `AUTOBYTEUS_TEST_VAULT` from the caller.
- Docs: `AGENTS.md`, `TESTING.md` § Test vault, `secret_management.md` § Test Vault, autobyteus-ts LLM docs, the READMEs, the isolated-app guide and skill.

## Branch And Commits

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/test-vault-developer-experience`, branch `codex/test-vault-developer-experience`
- Code: `6f38cd51e6` (autobyteus-ts baseline test fix), `855842b8f1` (IR-001), `9498de5f8b` (IR-002), `469de3d47e` (IR-003, CR-001)
- Docs: `3f01a6013a`, `198c9066dc`, `e40b0fe6ce`, `3c9a4e799a`
- Pre-coding base merge: `303a04e945` (`origin/personal` @ `ad784b0a8f`)
- Delivery checkpoint (review documents CRR-003/CRR-004 and the API/E2E test-code review report): `bd3d4fb0c3`
- Delivery integration merge: `ee78ab81a1` (`origin/personal` @ `79b638e787`)

## Integration And Post-Integration Checks

- Method: merge of `origin/personal` @ `79b638e787` (36 new base commits: delegated copies, MCP bulk import, v1.5.7 release) into the ticket branch. No conflicts; no file changed on both sides.
- Checks on `ee78ab81a1` (evidence in `evidence/DEL-*.log`):

| ID | Check | Result |
| --- | --- | --- |
| DEL-01 | `pnpm -C autobyteus-ts build`, server `typecheck` and `build` | Pass (`[verify:runtime-deps] OK`, bootstrap smoke passed) |
| DEL-02 | `pnpm -C autobyteus-ts test` (default, 13 inherited keys, selector unset) | Pass: `392 passed \| 21 skipped (413)`, same as AE-17 |
| DEL-03 | `pnpm -C autobyteus-server-ts test:unit` | Pass: `752 passed \| 4 skipped (756)` (3 more files than IMP-15, from the base) |
| DEL-04 | Server E2E `secret-management`, `llm-management`, Gemini speech (as IMP-20) | Pass: `13 passed \| 2 skipped (15)`, 43 tests |
| DEL-05 | Electron main vitest (as IMP-11) | Pass: `36 passed \| 1 skipped (37)`, `serverRuntimeEnv.spec.ts` 12 tests |
| DEL-06 | **Live** rerun of AE-11 on the standing vault (documented TESTING.md command) | Pass: DeepSeek 6/6 real calls, `7 passed \| 1 skipped`; vault digest unchanged |

- Canary check: 0 real key values in the DEL logs.

## Verification

Delivery verified the change from the evidence; no user check was needed. All 18 acceptance criteria are proven (15 critical, all directly). AC-005, AC-006 and AC-013 are proven live on the user's standing vault (AE-11, AE-13, AE-12); DEL-06 repeats AE-11 on the integrated state. The details are in `release-deployment-report.md` § Verification.

## Release Decision

`No release`, the RELEASE.md default; the user did not ask for one. The change ships with the next release, and a beta or stable release can be cut on request. No release notes were written: the change is developer and test tooling with no user-facing functional change.

## Residual Risks And Notes

- AC-007's optional costly live run (AE-14, collaborators suite) was not requested. It can run on request with the standing vault.
- R-D / FU-005: web probes can see an exported selector. TESTING.md says to set the variable per command or per live-testing shell, never in a shell profile.
- Windows and Linux location policy is covered only through injected per-OS policy (IMP-15/IMP-17).
- The standing test vault `~/.autobyteus-test/vault` belongs to the user and is kept (`pnpm test-vault remove` deletes it).
- The user's old stores and existing worktree `db/test.db` files are untouched by design (DEC-008, FU-004).
- Follow-ups FU-001..FU-006 are in `follow-ups.md` (FU-006: the generic Settings toast on a refused save).
