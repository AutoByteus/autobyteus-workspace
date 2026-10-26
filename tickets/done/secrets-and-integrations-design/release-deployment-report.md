# Delivery / Release / Deployment Report — secrets-and-integrations-design (autobyteus-244)

## Release / Publication / Deployment Scope

Repository finalization of `codex/secrets-and-integrations-design` into `origin/personal`, then a beta release at the user's request. `task_size=Large`, `architectural_risk=High`, reviewed route.

## Project Release Guide

- Release guide path and revision: `RELEASE.md` at `origin/personal` @ `67994daba0` (last changed in `83e8e12125`; it now includes the Secret Gate, from `8525065075`)
- Deviations from the guide and why: `None`
- Proposed guide fixes, and whether the user agreed: `None`

## Handoff Summary

- Handoff summary artifact: `tickets/done/secrets-and-integrations-design/handoff-summary.md`
- Handoff summary status: `Updated`
- Delivery revision record: `tickets/done/secrets-and-integrations-design/delivery-revision-record.md`
- Current delivery revision ID: `DR-001`

## Initial Delivery Integration Refresh

- Bootstrap base reference: `origin/personal` @ `a2faf424d6`
- Latest tracked remote base reference checked: `origin/personal` @ `67994daba0` (fetched 2026-10-26)
- Base advanced since bootstrap: `Yes`. 76 commits touching 368 non-ticket files: autobyteus-260 (agent-tool result rule), -273 (Claude prompt-cache TTL), -303 (available agent runtimes), -308 (internal agents), the NFS guide R3, and releases `v1.5.9-beta.7` … `beta.9`.
- New base commits integrated into the ticket branch: `Yes`
- Local checkpoint commit result: `Not needed` (the validated state was fully committed at `d665fa4f42`)
- Integration method: `Merge` → `2c67d4b4c2`
- Integration result: `Completed`
  - Conflicts in `GLOSSARY.md` and `docs/design-cases.md` only, both additive and resolved keeping both sides (see `docs-sync-report.md`).
  - `mcp-runtime-tool-matrix.e2e.test.ts` and `autobyteus-web/generated/graphql.ts` merged automatically. The generated file still holds the ticket's 3 `needsSecret` lines; it was not regenerated, because the repository keeps unrelated codegen drift out of commits (IMP-22).
- Post-integration executable checks rerun: `Yes`. The full suites ran, because the base changed the agent-tools MCP layer, agent definitions and the web.

| Check | Command | Result | Evidence |
| --- | --- | --- | --- |
| DR-01 | `pnpm -C autobyteus-ts build`; `pnpm -C autobyteus-server-ts typecheck`; `pnpm -C autobyteus-server-ts build` | Pass | `evidence/DR-01-integrated-builds-typecheck.log` |
| DR-02 | `pnpm -C autobyteus-server-ts test:unit` | Pass: `840 passed \| 4 skipped` files, `7023 passed` tests, 0 failed files | `evidence/DR-02-integrated-server-unit.log` |
| DR-03 | `pnpm test:e2e` (repo root); then the two failing files with a resolved HOME | Every MCP and secret suite passes: `mcp-secrets-in-vault (3)`, `mcp-bulk-import`, `mcp-http-auth-remote-server`, `mcp-http-redirect-and-transport`, `mcp-http-error-status`, and the `secret-management/*` suites. Totals: `2 failed \| 103 passed \| 98 skipped` files. The terminal PTY test failed under an unresolved `/tmp` HOME (`/private/tmp`) and is green with a resolved HOME (environment). `archive-run-history-graphql` fails 4 of 6: a stale `vi.mock` from autobyteus-308, byte-identical to `origin/personal` (FU-009) | `evidence/DR-03-integrated-server-e2e.log` |
| DR-04 | `RUN_AGY_FAILURE_E2E=1 … mcp-runtime-tool-matrix.e2e.test.ts` | Pass (`1 passed \| 5 skipped`) | `evidence/DR-04-integrated-matrix-agy.log` |
| DR-05 | `pnpm -C autobyteus-web test:nuxt --run`; then the failing spec alone | All of this ticket's MCP specs pass (form 19, bulk import 7, banner 6, card 2, rows 34, review state 3, …). Totals: `1 failed \| 693 passed` files, `4985 passed`. `definitionMutationCache.spec.ts` fails 3 Agent cases deterministically: the fixture lacks `internal` (autobyteus-308); the spec and its imports are byte-identical to `origin/personal` (FU-008) | `evidence/DR-05-integrated-web.log` |

- Post-integration verification result: `Passed` for this ticket. The three failing test files are pre-existing on `origin/personal`, test-only (the product code they cover is correct), and recorded as FU-008 and FU-009.
- Delivery edits started only after integrated state was current: `Yes`
- Handoff state current with latest tracked remote base: `Yes` (re-checked before the final merge; see Repository Finalization)

## Verification

- Evidence judged: `Sufficient`
- Evidence relied on:
  - the execution report's requirement proof and Cases (95.4%, no category below 90%);
  - code review CRR-002 Pass;
  - the files and screenshots below;
  - DR-01…05.

| Requirement | Cases And Files Checked | What You Saw | Judgement |
| --- | --- | --- | --- |
| MREQ-001 values in the vault, references in `mcps.json` | `API-03-desktop-journey-a.txt`; `API-04-07-desktop-journey-b.txt`; `API-08-linux-docker-backup.txt` | `fileHasToken: false`; `mcps.json` holds `{"vaultSecretId": "mcp.<uuid>"}` (shape checked by the Secret Gate review); state `CONFIGURED` | Proven |
| MREQ-002 no value shown anywhere | API-03; API-06; API-07; `API-09-safety-scan.txt`; API-02 | form note `Stored in the vault. Leave empty to keep it…`; JSON keep marker `{"stored": "vault"}`; instance logs `test-dummy occurrences 0`; live-check output `token-like strings 0` | Proven |
| MREQ-003 resolved only at connect | `API-02-gated-runtime-and-live.log`; API-03 | native, Claude and Grok matrix cells ✓; auth-agent native/Codex/Claude ✓; token replace `refChanged true`, keep `refKept true`; `gatewayDelivered true`; after restart `delivered True` | Proven |
| MREQ-004 reusable record shape | API-03…05 | a reference per field (`env:<NAME>`, `token`) | Proven |
| MREQ-005 move only on approval, backup, servers work | API-04 (`API-04-02-dialog-one-unticked.png` viewed); API-08 | dialog with one candidate unticked; `Moved to the vault: 2.` with the backup path; backup `mode 600`, `holdsPlainValues true`; Linux `600 root:root` with umask 0022 | Proven |
| MREQ-006 / MDEC-007 import | API-05 | toast `Enter these secrets again on this node: github-like env:GITHUB_TOKEN.`; state `MISSING`; a fresh reference ≠ the source's; re-importing an older copy keeps its own reference | Proven (O-1 is a product question, not a failure) |
| MREQ-007 needs secret / vault locked | API-05; API-06 | `health: LOCKED`; fields `VAULT_UNAVAILABLE`; discover `needs secret … (the vault is unavailable)`; restored `READY` | Proven |
| MREQ-008 gated live GitHub check | API-02 (c) | `✓ stores the token as a vault reference, discovers the tools and reads the test issue`; token-like strings 0 | Proven |
| MDEC-006 banner review state | API-04 | reviewState persisted; after a port change, banner `visible: False` | Proven |
| Regression | API-01; DR-02…05 | API-01: full e2e `103 passed`, 0 failed on the ticket base. Integrated: see DR-03/DR-05 | Proven for this ticket (FU-008/FU-009 pre-existing) |

- One Codex matrix cell (API-02) ended with its Task `TODO`. Its vault-related checks (env, cwd, the HTTP credential, cleanup) passed, and 5 of 5 reruns passed fully (FU-007). It does not count against this change.
- More evidence requested: `None`
- User check needed: `No`
- Re-verification after later re-integration: see Repository Finalization

## Secret Gate

- The ticket branch was never pushed before delivery (`git ls-remote` empty).
- First run, `scripts/check_secrets.sh origin/personal..HEAD` (18 commits): `BLOCKED`, 14 findings. Nothing was pushed.
  - 13 × `generic-api-key` on `"vaultSecretId": "mcp.<uuid>"`. Evidence files: API-03 (4), API-04-07 (7), API-08 (1); and `autobyteus-server-ts/tests/unit/secret-management/mcp-secret-resolver.test.ts` L7. Every value was checked by shape (`^mcp\.<uuid>$`) without printing it. These are vault entry IDs (GLOSSARY "Vault secret ID"), not secret values.
  - 1 × `curl-auth-header` in `probes/agent-shell.sh` L6 (commit `90c21a7cdb`): a 14-character, lowercase, word-like value that the probe sends as a deliberately forged `Authorization: Bearer` to prove the proxy replaces it. No token prefix; not a credential.
- Fix: two narrow `.gitleaks.toml` entries, each with its reason.
  - `^mcp\.<uuid>$` added to the existing UUID allowlist, which applies to the generic rule only.
  - A `curl-auth-header`-only allowlist for that one probe path (in-progress and archived).
- Rerun: `secret gate: PASS (no secrets found)`.
- No key was ever pushed, so nothing needs rotation. The real GitHub test token is held only in the test vault (`API-09`: `CONFIGURED test.github.token`, IDs only).
- On the merged state and before tagging: see Repository Finalization and Version / Tag.

## Release Decision

- Decision: `Beta`
- Decided by: the user, in the Delivery Engineer conversation on 2026-10-26: "if everythign is good. release a new beta thanks". The handoff's constraint was "no release unless the user asks". Delivery judged "good" as: every requirement proven, and every MCP/secret suite green on the integrated state. The three failing test files are pre-existing on `personal` and test-only (FU-008, FU-009); they were in betas `v1.5.9-beta.9` and earlier.

## Docs Sync Result

- Docs sync artifact: `tickets/done/secrets-and-integrations-design/docs-sync-report.md`
- Docs sync result: `Updated` (merge-conflict resolution in `GLOSSARY.md` and `docs/design-cases.md`; the implementation's docs checked and unchanged)

## Ticket State Transition

- Ticket moved to `tickets/done/secrets-and-integrations-design`: `Yes`

## Version / Tag / Release Commit

- pending

## Repository Finalization

- pending

## Release / Publication / Deployment

- pending

## Post-Finalization Cleanup

- Dedicated ticket worktree path: `/Users/normy/autobyteus_org/autobyteus-worktrees/secrets-and-integrations-design`
- pending

## Release Notes Summary

- Release notes artifact: `tickets/done/secrets-and-integrations-design/release-notes.md` (written before finalization). It covers the new behavior, the stdio env limit and how rollback works.
- Release notes status: `Updated`. The beta uses GitHub generated notes; this file is for the next stable release.

## Deployment Steps

- None beyond the published Docker image (`RELEASE.md` Deployment).

## Environment Or Persisted-Data Transition Notes

- Approved persisted-data decision: plain values stay supported; a move happens only on approval, with a 0600 backup (MREQ-005). This is not an automatic migration.
- Delivery action required: `None`
- Result and evidence: API-04 (a plain file works unchanged before the move); API-08 (backup on Linux)

## Verification Checks

- `check_licensing.py`, `check_repository_artifact_hygiene.py` (with the tracked-imports check) and `check_secrets.sh` on the branch, on the merged state and before tagging. Results under Repository Finalization and Version / Tag.

## Rollback Criteria

- A server fails to connect after a move, or a value appears anywhere outside the vault. Then revert the merge on `personal` and cut the next beta.
- Rolling back after a move: earlier builds don't understand `{"vaultSecretId": …}`. In the pre-ticket `file-provider.ts`, a reference object is not a string, so the secret never reaches the server, and re-saving it there writes `String(object)`. Users who go back must first restore the 0600 backup `mcps.json.backup-before-vault-move-…`. The release notes say so. A user who never moved anything is unaffected.

## Final Status

- pending
