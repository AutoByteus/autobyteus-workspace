# Release Requested — autobyteus-438: stable v1.5.12 from the current beta (v1.5.12-beta.11)

- Classification: `Release Requested` (no change to the software; nothing to investigate or design)
- Project Task: `autobyteus-438` (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`), assigned by `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`) on 2026-11-09
- Requested by: the user, relayed by the PM in his words (2026-11-09): "I'm currently running the latest, as you already know. Now can you please release a stable version based on the latest beta, the current one we're running."
- Worktree / branch / base: `/Users/normy/autobyteus_org/autobyteus-worktrees/release-1.5.12-stable-438`, `codex/release-1.5.12-stable-438`, from `origin/personal` @ `af75cdd544`; finalization target `origin/personal`

## What the stable is

- Release kind: **stable**, version **v1.5.12** (annotated tag), following `RELEASE.md` on `personal` (stable path: curated release notes written from the archived tickets, Docker `:latest` moves with it, GitHub "Latest", not a pre-release).
- Content: exactly the content of **v1.5.12-beta.11** (tag on `72c95ddc9e`, 2026-11-09). Checked by the Solution Designer: `origin/personal` has one commit after the tag (`af75cdd544`, the 436 delivery record), and `git diff --stat v1.5.12-beta.11 origin/personal -- . ':!tickets'` is empty: no software change since beta.11. Do not pull in anything else; only the version number changes to 1.5.12.
- Previous stable: `v1.5.11` (`caa7fb9a4e`, 2026-11-02). First-parent merges since then: 34 (`git log --merges --first-parent --oneline v1.5.11..v1.5.12-beta.11`); the Task counts 58 merges overall.
- The user runs beta.11 on his desktop and Docker nodes; his Android app is beta.9 (no Android change since).

## What the delivery team settles with the user (nothing is assumed; from the Task)

- **Smoke check:** Codex's quota resets on 2026-11-10. A full smoke check covers Claude, Codex, Grok, Antigravity and AutoByteus (DeepSeek Harness is not in the smoke list, autobyteus-400). Any waiver only in the user's own words at release time; the beta waivers do not carry over. Tell the user which runtimes the check could not cover.
- **Curated notes, user actions first** ("What you need to do"), for people going from v1.5.11 straight to v1.5.12, written from the archived tickets' `release-notes.md` (`tickets/done/*`):
  - Every node now needs a key: reinstall the Docker launcher, upgrade the nodes, run `autobyteus-docker setup-code <node>` and connect each node on the Nodes page, pair linked nodes again, copy the MCP gateway token into MCP clients.
  - Node settings `AUTOBYTEUS_ALLOWED_HOSTS`, `AUTOBYTEUS_ALLOWED_ORIGINS`, `AUTOBYTEUS_ALLOWED_CLIENT_NETWORKS`; the local-network allow (off by default); phones over Tailscale need nothing.
  - The new Android APK; the macOS Keychain prompt for stored node keys (autobyteus-445 observes it).
  - Risk statements from the notes of 437, 416 and 436, including: a paired phone can read any file on its node, read-only, until revoked.
- **Open items to state honestly** (notes or to the user before tagging): autobyteus-441 (what a phone key may do, key expiry) not built; autobyteus-430 (standalone application host: DNS-rebinding defence, no credential gate on a non-loopback address); autobyteus-447 (15 server E2E files fail since the node authentication gate because their requests carry no node key: product not affected, server E2E suite not green; the delivery engineer judges whether the evidence for the stable is sufficient and says so plainly; the user decides).
- **Docker:** `:latest` moves to the stable; `:beta` stays on the newest tag; never move or delete a published tag. The user's nodes are updated after the release by him or the PM, on his word.
- **License:** the stable keeps the current license; do not change `LICENSING.md` in this release (the commercial license proposal, autobyteus-346, starts after this tag).

## Constraints and done (from the Task)

- Follow `RELEASE.md` as on `personal`: no per-tag build-only run; triage every pipeline failure first; updater files after the six server packages; the stable path needs the curated notes. Clean up everything created.
- Done when: annotated tag `v1.5.12` on the beta.11 content; GitHub release (not a pre-release, Latest) with all 23 assets; Desktop, Android, iOS and Server Docker workflows succeeded; Docker `:latest` on the stable; curated notes published; delivery record on `personal`; cleanup done. The PM verifies tag, assets, workflows, Docker tags and the "Latest" flag before closing, and reports to the user.
