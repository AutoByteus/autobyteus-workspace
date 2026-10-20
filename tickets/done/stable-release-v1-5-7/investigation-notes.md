# Investigation Notes: stable-release-v1-5-7

## Investigation Meta

- Package identifier: `stable-release-v1-5-7` (Project Task autobyteus-213)
- Request: Release stable v1.5.7 (candidate v1.5.7-beta.4), from `/project_task_manager`, the user's request of 2026-10-20
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/stable-release-v1-5-7`
- Repository mode: Git; branch `codex/stable-release-v1-5-7` (ticket documents), from `origin/personal` @ `9227d61597`
- Release candidate: the `origin/personal` tip at cut time (the user's direction, 2026-10-20), currently `9227d61597` = v1.5.7-beta.4 + autobyteus-190 (MCP Bulk Import fix) + delivery records
- Finalization target: `origin/personal`
- Current solution revision ID: SR-001
- Authorities read (2026-10-20): `references/requirements-engineering.md`, `references/ticket-scope.md` (earlier in this conversation); `RELEASE.md` (origin/personal); `tickets/done/stable-release-v1-5-6/` (requirements, design, revision record, notes) as the precedent
- Status: complete for requirements

## Source Log

| Date | Source | Command / Path | Finding |
| --- | --- | --- | --- |
| 2026-10-20 | Command | `git tag --list "v1.5.7*"`; `git log --first-parent v1.5.7-beta.4..origin/personal` | Betas 1–4 (beta.4 on 2026-10-20). After beta.4, origin/personal adds the autobyteus-190 merge `b70caf79c8` (MCP bulk import fix: product code in `autobyteus-web/stores/toolManagementStore.ts` and localization, 20 files outside `tickets/`) plus delivery records. **F-01 (superseded by the user's direction, 2026-10-20: "release the latest … whatever on the personal"):** the cut is from the origin/personal tip at cut time, which includes autobyteus-190. |
| 2026-10-20 | Command | `git log --first-parent --merges v1.5.6..v1.5.7-beta.4` | 8 merges: run-file-change-live-cache-race, mcp-sdk-1-32-upgrade, mcp-sdk-1-32-upgrade-parity (tests and docs only), mcp-real-server-test-fixtures (tests only, not user-facing), search-model-settings, mcp-run-session-cleanup, unclean-shutdown-delegated-run-restore, delegated-copy-restore-from-own-file. Plus 4 release bumps. **F-02** |
| 2026-10-20 | Doc | `tickets/done/{delegated-copy-restore-from-own-file,mcp-run-session-cleanup,mcp-sdk-1-32-upgrade,run-file-change-live-cache-race,unclean-shutdown-delegated-run-restore}/release-notes.md`; `tickets/done/search-model-settings/handoff-summary.md` | Source text for the curated notes. **F-03** |
| 2026-10-20 | Command | `git show origin/personal:.github/release-notes/release-notes.md` | v1.5.6 notes: structure ("Before You Update" first), backup and no-rollback wording, GitHub Issues support pointer (v1.5.6 DEC-002). **F-04** |
| 2026-10-20 | Command | `gh run list` for `v1.5.7-beta.4` | Desktop, Android, iOS and Server Docker all succeeded on beta.4; the delivery record says 17 assets. **F-05:** the pipeline is healthy on this content. |
| 2026-10-20 | Command | `python3 scripts/release_versions.py android-version-code 1.5.7` → `10050799` | Version 1.5.7 is valid. **F-06** |
| 2026-10-20 | Command | `gh release view` (Latest) | Latest = v1.5.6. **F-07** |
| 2026-10-20 | Doc | `tickets/done/stable-release-v1-5-6/design-spec.md` | The precedent cut from origin/personal with the standard RELEASE.md stable path. By the user's direction this release does the same. **F-08** |

## Notes Inventory (what stable v1.5.6 users see new)

| Area | Source | In notes |
| --- | --- | --- |
| Embedding settings (models, Project indexes, index after Task writes) | search-model-settings handoff | What's New |
| Delegated runs keep their own settings; views show them; team member follow flag | delegated-copy-restore-from-own-file notes | Improvements |
| MCP library 1.32.1 | mcp-sdk-1-32-upgrade notes | Improvements |
| Restore after sudden shutdown; clearer refusal | unclean-shutdown notes | Fixes |
| MCP servers close with their run | mcp-run-session-cleanup notes | Fixes |
| Artifacts file no longer missing | run-file-change-live-cache-race notes | Fixes |
| No credentials sent across a redirect to another host | mcp-sdk-1-32-upgrade notes | Security |
| WebSocket MCP transport removed | mcp-sdk-1-32-upgrade notes | Changes |
| One-way conversion of delegated runs; backup; no rollback; support pointer | delegated-copy notes; RELEASE.md Rollback | Before You Update, Upgrade Notes |
| Desktop and nodes updated together | DESIGN.md rule 9; Task | Before You Update |
| Docker `:1.5.7`, `:latest`, `:beta`; launcher return to `latest` | RELEASE.md | Upgrade Notes |
| Memory Sync mirrors from older nodes | delegated-copy notes | Upgrade Notes |
| MCP Bulk Import: failed entries with reasons; paste `mcps.json`; refresh and messages | `tickets/done/mcp-bulk-import-errors/release-notes.md` (autobyteus-190, after beta.4) | Improvements |
| MCP real-server test fixtures; parity tests | ticket handoffs | Not user-facing; left out |

## Supplemental Artifact Inventory

| Artifact | Owner | Purpose | Related IDs | Status | Approval |
| --- | --- | --- | --- | --- | --- |
| `tickets/in-progress/stable-release-v1-5-7/release-notes.md` | Solution Designer | Curated v1.5.7 notes | REQ-003..REQ-006 | Draft SR-001 | Needs the user's approval |
