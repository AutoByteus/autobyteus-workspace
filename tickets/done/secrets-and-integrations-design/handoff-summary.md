# Handoff Summary — secrets-and-integrations-design (autobyteus-244: MCP server secrets in the vault)

## Ticket

- Package: `secrets-and-integrations-design`; Project Task `autobyteus-244`
- Classification: `task_size=Large`, `architectural_risk=High`; route: reviewed. Architecture review ARCH-REV-003 Pass; code review CRR-002 Pass (round 2; average 9.4, every category ≥ 9.3); API/E2E API-REV-001 Pass (95.4%); test-code review CRR-003 `Not Applicable` (no durable test changes by API/E2E).
- Revisions: SR-001…SR-008, ARCH-REV-001…003, IR-001…002, CRR-001…003, API-REV-001, DR-001
- Archived ticket folder: `tickets/done/secrets-and-integrations-design/` on `personal` (worktree removed after finalization)

## What Changed For Users

- Secret values of MCP servers are stored encrypted in the node's vault. This covers chosen env values, the HTTP `token`, and chosen header values such as `Authorization`. `mcps.json` holds `{ "vaultSecretId": "mcp.<uuid>" }` in their place.
- Rows are pre-locked by a simple name and prefix rule, and the user can lock or unlock any row.
- No API, UI field, export or log returns a value. The form shows Stored / Replace / Remove.
- Values are resolved only at connect time: into HTTP request headers, or into the one stdio child's environment.
- Existing plain values move only on approval. "Review and move to vault" writes a 0600 backup first. The banner shows only unreviewed candidates (per-device review state), and the per-row "Move to vault" stays.
- Bulk import stores rule matches in the vault. A foreign reference imports as "needs secret".
- A missing secret, or a locked vault, shows "Needs secret": the server does not connect and never falls back to plain text.
- Test vault: a GitHub test-token alias for the gated live check against GitHub's remote MCP server.

## Integration

- Merge of `origin/personal` @ `67994daba0` (76 commits, 368 non-ticket files, including autobyteus-260, -273, -303 and -308, and betas up to `v1.5.9-beta.9`) → `2c67d4b4c2`.
- Conflicts: `GLOSSARY.md` and `docs/design-cases.md` only, resolved keeping both sides. `mcp-runtime-tool-matrix.e2e.test.ts` and `autobyteus-web/generated/graphql.ts` merged automatically; the latter still carries this ticket's three `needsSecret` lines.
- Checks on the integrated state:
  - DR-01: core build, server typecheck and build pass.
  - DR-02: server unit, 7023 passed, 0 failed files.
  - DR-03: full server e2e: every MCP and secret suite passes, including `mcp-secrets-in-vault` (3), `mcp-bulk-import`, `mcp-http-*` and the `secret-management` suites. Two files failed, neither caused by this ticket. The terminal PTY test was environmental (an unresolved `/tmp` HOME) and is green with a resolved HOME. `archive-run-history-graphql` (4 cases) fails on a stale mock from autobyteus-308, byte-identical to `personal` (FU-009).
  - DR-04: matrix AGY cell passes.
  - DR-05: web suite, 4985 passed, all of this ticket's MCP specs green. One spec, `definitionMutationCache.spec.ts` (3 Agent cases), fails on a stale fixture from autobyteus-308, byte-identical to `personal` (FU-008).
- Secret Gate (`RELEASE.md`): first run flagged 14 false positives: 13 `mcp.<uuid>` vault secret IDs and one deliberately forged probe bearer. Two narrow `.gitleaks.toml` entries were added; the rerun passes.

## Verification

- Judged from the evidence; no user check needed. Details in `release-deployment-report.md`.

## Release

- `Beta`, at the user's request ("if everythign is good. release a new beta thanks"). Version and outcome in `release-deployment-report.md`.

## For The Solution Designer

- **O-1 (product question):** re-importing a file applies the secret rule (MDEC-004) to plain values the user had reviewed and kept plain. This matches the approved rules (MDEC-004, MDEC-006), but the requirements don't address reviewed values on import.
- Follow-ups FU-001…FU-009 in `follow-ups.md`, none sent yet. FU-003 is marked urgent (security): vault root key in the macOS Keychain, and a separate OS user for agent shells on Docker.
- Residual risks:
  - Windows is not covered.
  - FU-007: one unreproduced Codex matrix result; the vault-related checks in that cell passed, and 5 of 5 reruns passed.
  - The live-check token expires 2026-11-25.
  - Stdio env values are readable by a same-user process (MDEC-003, accepted).
