# Delivery Revision Record

## Revision Index

| Revision ID | Entry Point / Trigger | Prior Result | Current Result | Affected Canonical Artifacts |
| --- | --- | --- | --- | --- |
| DR-001 | User-directed direct delivery from the Solution Designer (2026-10-20) | N/A | Scan done; SF-001 revoked by the user; `.gitignore` guard finalized into `personal` | `secret-scan-report.md`, `gitleaks-allowlist.toml`, `follow-ups.md`, `docs-sync-report.md`, `handoff-summary.md`, `release-deployment-report.md`, `.gitignore` |
| DR-002 | User request: Secret Gate at every finalization (2026-10-20) | DR-001 | Gate in `RELEASE.md` + `scripts/check_secrets.sh` + root `.gitleaks.toml`, tested, pushed to `personal` | `RELEASE.md`, `scripts/check_secrets.sh`, `.gitleaks.toml`, `secret-scan-report.md`, `follow-ups.md`, `handoff-summary.md`, `docs-sync-report.md` |

## Revision Entries

### DR-001 — Secret scan of autobyteus-workspace and the .gitignore guard

- Delivery round and trigger: the first round. The Solution Designer routed
  the Task as user-directed direct delivery (`handoff.md`).
- Triggering upstream report, verification, or evidence: none (no upstream
  stages, by the user's direction).
- Prior authoritative result: N/A
- Current authoritative result:
  - The scope was narrowed by the user to `autobyteus-workspace`.
  - 1 real finding (SF-001, Telegram bot token, history only). The user
    revoked it and chose no history rewrite.
  - Every other hit was a false positive.
  - The guard was committed.
- Docs sync report: `docs-sync-report.md` (No impact)
- Handoff summary: `handoff-summary.md`
- Release/publication/deployment report: `release-deployment-report.md` (No release)
- Integration and post-integration verification: already current with
  `origin/personal` `66d834b0ac`. Ignore-rule, allowlist and hygiene checks
  passed.
- Verification (evidence judgement or user check) and finalization state:
  sufficient, with the user's revocation check.
  - Ticket branch `codex/repository-secret-scan` committed as `de24d513a6`
    and pushed.
  - `origin/personal` moved twice during delivery: first to `7f41314aa8`
    (runtime-lifecycle-review and the `1.5.8-beta.2` bump), then to
    `51bb75ef18` (mcp-http-error-status). The pre-push check caught the
    second move, so nothing was pushed until then. `finalize/repository-secret-scan`
    was rebuilt from `51bb75ef18` and the ticket branch merged with `--no-ff` as `8dc4be788e`, with
    no conflicts. This record commit follows the merge.
  - Rerun on the merged state: ignore-rule checks and the hygiene check
    passed. gitleaks (0 findings) and trufflehog `--no-verification`
    (0 findings, 480 chunks) scanned the new base range `66d834b0ac..51bb75ef18`, in two steps.
  - Pushed to `origin/personal` after a fresh fetch confirmed it had not moved.
  - No release (`RELEASE.md` default).
  - Cleanup: ticket worktree and local `codex/` and `finalize/` branches
    removed. The remote ticket branch is kept, as on earlier tickets. The
    scan temp folder was deleted.
- Terminal return to the Solution Designer: `Sent` (`Delivery Completed`).
- Why this baseline or delivery revision was recorded: first delivery result.
- Next recipient/action: finalize into `personal`, clean up, then return
  `Delivery Completed` to the Solution Designer.
- Remaining blockers, rollback concerns, or untested scope:
  - FU-001: other repositories not scanned (user scope).
  - FU-002: CI or pre-commit scan not agreed.
  - FU-003: images not OCR-scanned.

### DR-002 — Secret Gate at every finalization

- Delivery round and trigger: the user asked for a security gate on every
  finalization, so that no API key gets committed, and approved adding it to
  `RELEASE.md` and committing directly to `personal` (2026-10-20).
- Prior authoritative result: DR-001. The guard was the `.gitignore` rule
  only; CI or pre-commit was proposed (FU-002).
- Current authoritative result:
  - The `RELEASE.md` "Secret Gate" section, plus the gate in the finalize
    steps and in Checks Before Tagging.
  - `scripts/check_secrets.sh`: gitleaks over a commit range, redacted; exit
    0 pass, 1 block, 2 cannot run.
  - Root `.gitleaks.toml`, moved from this folder's `gitleaks-allowlist.toml`
    and tuned.
- Changed canonical artifacts: `RELEASE.md`, `scripts/check_secrets.sh`,
  `.gitleaks.toml`, plus these ticket documents:
  - `secret-scan-report.md` (Guards);
  - `follow-ups.md` (FU-001, FU-002);
  - `handoff-summary.md`;
  - `docs-sync-report.md`.
- Verification:
  - **Detection:** a throwaway clone in a temp folder, with 14 planted values
    randomly generated in real provider formats (GitHub, AWS, OpenAI,
    Anthropic, Google, Slack, Telegram, private key, generic, bearer, a
    40-hex Serper-style key, a 32-character Mistral-style key, a camelCase
    `apiKey`, a password in a URL). All 14 were caught, and 16 of 16 output
    lines were redacted.
  - **False blocks** on real history: `HEAD~400..HEAD` (1,820 commits, 126
    ticket merges since 2026-10-04) would block 2 merges. Both are word-like
    values in ticket prose and a Python list, not keys. That is down from 13
    with the DR-001 allowlist.
  - **Exit paths:** a bad range gives 2; an empty range gives 0; the SF-001
    commit passes (allowlisted).
  - On the release range `v1.5.8-beta.2..HEAD`: PASS. The hygiene check
    passed.
  - The gate was run on its own change before the push.
- A fix found while tuning: the DR-001 allowlist ignored any 40-hex value for
  every rule, which would hide a hex provider key. Shape allowlists are now
  scoped to `generic-api-key`, and the new `env-style-secret` rule covers
  `*_API_KEY=<hex>`.
- Finalization: committed on `codex/secret-gate` from `origin/personal`
  `4c513759fb`. The pre-push check found `personal` had moved to
  `18d37c7d6d` (runtime-lifecycle-review record; no overlap), so the commit
  was rebased onto it, the gate rerun (PASS on the change and on the new base
  range) and the hygiene check rerun. It was pushed to `personal` as
  `8525065075` (fast-forward, by the user's direction to commit directly).
  This correction is the following commit.
- Terminal return to the Solution Designer: `Sent` (`Delivery Completed`).
- Remaining: FU-002, a CI check for pushes that skip the guide.
