# Secret Scan Report: repository-secret-scan

- Date: 2026-10-20
- Scanned by: Delivery Engineer (user-directed direct delivery)
- This report holds no secret values. Findings are named by repository, commit,
  path, rule and kind of key. Fingerprints, where given, are the first 12 hex
  characters of the value's SHA-256.

## Scope

The Task listed many repositories. During the work, the user narrowed the scope
to **this repository only**: "only for this repo by the way".

| Repository | Visibility | In scope | Scan result |
| --- | --- | --- | --- |
| `AutoByteus/autobyteus-workspace` (local `autobyteus-workspace-superrepo`, its worktrees and tmp release clones) | Public | Yes | **1 real finding (revoked)**, all other hits false positives |

What "this repository" covered:

- The published history: a fresh `git clone --mirror` from GitHub. That is
  every branch, tag and ref on the remote (6,341 commits, 360 branches,
  416 tags), not only `personal`.
- The 205 commits in the shared local checkout that were never pushed
  (`git rev-list --branches --tags --not --remotes`).
- The current tree at `origin/personal` `66d834b0ac`.
- The worktrees and the tmp release clones
  (`autobyteus-release-personal-*`) share this repository's history, so the
  mirror covers them. Their uncommitted local files are local data, not
  committed content (handoff note 6).

Left out, by the user's direction: every other repository in the Task's list.
Their GitHub visibility was looked up before the user narrowed the scope;
`follow-ups.md` FU-001 lists them. The local document folders that are not git
repositories (`autobyteus-delivery-receipts`, `delivery-receipts`) are left out
the same way.

## Method

- **gitleaks 8.30.1**, Homebrew install, over the full history (`--all`):
  - its default rules;
  - a targeted rule set for our provider key names: `sk-` keys, `*_API_KEY`,
    `*_TOKEN` and `*_SECRET` literals, bearer literals, passwords in URLs and
    private-key blocks.
- **trufflehog 3.99.3**, Homebrew install, over the full history with
  `--no-verification`. It also opens committed archives.
- No key was sent to any provider.
- Scanner output went straight into a filter that kept only the location,
  rule, value shape (hex digest, UUID, git SHA, identifier, other) and a
  fingerprint. No value was written to disk or shown.
- Targeted checks:
  - tracked `.env` files: key names and value shape only;
  - committed databases (`*.db`, `*.sqlite`): copies opened read-only, table
    and row counts, and a text-pattern scan;
  - credential-named evidence files;
  - test fixtures;
  - GitHub Actions workflows.
- All scanner work ran in a temporary folder outside every repository. It was
  deleted at the end.

## Counts

| Source | Hits | Unique values | Real | False positive |
| --- | --- | --- | --- | --- |
| trufflehog, full history | 1,048 | 71 | 1 (2 hits) | 1,046 |
| gitleaks default rules, full history | 29,362 | 3,429 | 1 (same token, 2 hits) | 29,360 |
| gitleaks targeted rules, full history | 460 | 142 | 0 | 460 |
| gitleaks, 205 unpushed local commits | 98 | — | 0 | 98 |
| Tracked `.env` files (46, current tree) | — | — | 0 | — |
| Committed databases (5, plus 3 journals) | — | — | 0 | — |

## Real Finding

| ID | Kind | Repository | Commit | Paths | Status |
| --- | --- | --- | --- | --- | --- |
| SF-001 | Telegram bot token (`GATEWAY_TELEGRAM_BOT_TOKEN`, also `telegramBotToken`) | `AutoByteus/autobyteus-workspace` (public) | `c798a7e70c` (2026-03-09, "feat(messaging): surface external runs and fix runtime routing") | `autobyteus-server-ts/extensions/messaging-gateway/config/gateway.env:22`, `.../provider-config.json:13` | **Revoked by the user on 2026-10-20** |

- **Why it is real:** it has the exact Telegram bot-token format, Telegram was
  enabled in that config, and the file was a generated runtime config, not a
  fixture.
- **Exposure:** the files were removed the same day (`46b172d0dd`, "chore:
  ignore generated messaging gateway artifacts"), and the path is ignored
  since then (`.gitignore`: `autobyteus-server-ts/extensions/`). The commit
  is still in the history of 332 branches and 363 published tags
  (v1.2.33 to v1.5.8-beta.1), so the value was public from March to October.
- **Same file, lower risk:** `GATEWAY_ADMIN_TOKEN` is a UUID-shaped admin token
  for the local messaging gateway. It matters only if that gateway was ever
  reachable from outside the machine. The user was told about it with the
  Telegram token.
- **User decisions, made directly by the user in this conversation:**
  - Revoke the token in Telegram (@BotFather `/revoke`). Done.
  - **No history rewrite.** A rewrite would move 363 published tags, which
    `RELEASE.md` forbids. It cannot reach copies already cloned, and the
    revoked token is worthless.
- **Current files:** the token is not in the current tree, so there was
  nothing to remove.

## False Positives (by kind)

All checked by value shape and context, without the value:

- **sha256 digests (hex64):** file-hash and pin maps in ticket evidence
  (`*-hashes.json`, `entry-audit.json`, `source-pins.json`). This covers the
  trufflehog Parsers and ProtocolsIO hits and the gitleaks Discord and
  generic hits.
- **UUIDs, git SHAs, 32-hex IDs:** run, agent, team and container IDs in
  evidence logs (trufflehog Dockerhub, Box, LaunchDarkly).
- **`Sec-WebSocket-Key` handshake values** (24 characters, base64) in browser
  (CDP) logs.
- **Local dev-server websocket tokens** (`ws://127.0.0.1:<port>?token=…`) in
  browser evidence. They are short-lived and work only on localhost.
- **LLM response `signature` fields** in recorded agent calls.
- **Identifiers:** code and log text such as `process.env.OPENAI_API_KEY`,
  `apiKey.revealToTrustedConsumer`, `dedupe_key` values, i18n keys, test
  markers (`CITRUS-…`, `API-REV-…`) and vendored Monaco editor code.
- **Test fixtures and canaries, all obviously fake:**
  - `synthetic-*-canary`, `sk-vaultcanary-*`, `sk-envcanary-*`,
    `sk-proj-…secret-value`;
  - a `1234567890abc…` sequence in a redaction test;
  - `https://user:secret@…` in a URL test;
  - `REPLACE_WITH_OPENAI_API_KEY` and `.env.*.example` placeholders.
- **Committed `.env` evidence files and databases:** only file paths, ports
  and flags, with empty `mcp_server_configurations`, `secret_entries` and
  `secret_encryption_metadata` tables. One file, `kimi-…/server-data/.env.redacted`,
  holds only redacted placeholders.

`gitleaks-allowlist.toml` in this folder encodes these classes, so the next
scan can ignore them.

## Other Checks

- **GitHub Actions** (`.github/workflows/release-*.yml`):
  - secrets come only from `${{ secrets.* }}`;
  - no secret is echoed and there is no `set -x`;
  - no `pull_request_target`;
  - triggers are tag push and `workflow_dispatch` only.
- **Committed run logs and traces:** covered by the full-history scans above.
  No real key was found in them.
- **Images:** the 11,957 committed images (`.png`, `.jpg`, `.gif`, `.webp`)
  cannot be text-scanned. See `follow-ups.md` FU-003.

## Guards

- **In place (agreed by the user):** root `.gitignore` now ignores `.env`,
  `.env.*`, `*.env`, `*.db`, `*.db-journal`, `*.db-wal`, `*.db-shm`,
  `*.sqlite` and `*.sqlite3`, and re-allows `*.example`.
  - Files tracked before the rule stay tracked. That includes the 46 `.env`
    files and 8 database files checked above, all non-secret.
  - A new one needs `git add -f`.
  - This closes the path the leak took: a generated runtime config, or a
    copied server data folder, committed by accident.
- **Proposed, not added (user decision open):** a gitleaks check in CI or as a
  pre-commit hook, using `gitleaks-allowlist.toml`. See `follow-ups.md` FU-002.

## Related Tickets

- autobyteus-217: untracked local `test.db` files with real keys. Not
  repeated here. The only databases this ticket checked were the five
  committed ones, which hold no keys.
- autobyteus-218 and autobyteus-219: what agents inherit at run time. Not
  repeated here.
- autobyteus-214: the user cleans their own local `.env`. Not touched.

## User Data

- No user data was changed: no local `.env`, database or vault.
- The scanners never ran against the home directory.
