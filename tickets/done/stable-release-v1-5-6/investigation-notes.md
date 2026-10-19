# Investigation Notes — stable-release-v1-5-6

## Investigation Meta

- Package identifier: `stable-release-v1-5-6`
- Request / ticket: Project Task "Release stable v1.5.6 (from the v1.5.6 betas; candidate = v1.5.6-beta.11, origin/personal)" (`project_task_784234fc-e6b8-43db-8f87-94e4a4757b13`), from `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), 2026-10-19
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/stable-release-v1-5-6`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/stable-release-v1-5-6`, `codex/stable-release-v1-5-6`
- Resolved base remote / branch / revision: `origin/personal` @ `69d7d4f3e643f770b172e565c2d88572f42ded65` (fetched 2026-10-19)
- Finalization target remote / branch: `origin` / `personal` (RELEASE.md, Finalization Target)
- Bootstrap result: worktree created from freshly fetched `origin/personal`; ticket folder `tickets/in-progress/stable-release-v1-5-6/`. The shared checkout (`personal`, behind 39, dirty with other owners' files) was not used for authoring.
- Bootstrap blocker: None
- Current solution revision ID: `SR-002`
- Authorities read (2026-10-19): requirements gate `references/requirements-engineering.md`; design gate `references/architecture-design.md`, `references/design-principles.md`, root `DESIGN.md`;, `references/ticket-scope.md`, root `AGENTS.md`, `RELEASE.md` (in full), `autobyteus-server-ts/docs/design/data_migration_guideline.md` §4 "Rolling back after a migration", `.github/release-notes/template.md`, precedent `tickets/done/stable-release-20261014/solution-designer-release-handoff.md`.
- Investigation status: Requirements investigation complete; open user decisions listed in the requirements doc.

## Initial Request And Clarifications

- Original request: the user (2026-10-19): "we have done many beta. now could release stable version now right?" The Task asks for stable `v1.5.6` per RELEASE.md, with curated, functional notes covering everything users see since v1.5.5, honest notes on the one-way migrations, the no-version-skew rule and Docker channels; and asks to settle F1 of autobyteus-142 and any extra beta checks with the user first.
- Clarifications received: 2026-10-19, user: "just send to dleiver engineer to do a stable release please" (approval with the recommendations; route to Delivery).
- User-supplied facts and constraints: last stable v1.5.5 (2026-10-17, GitHub Latest); 11 betas since, used by the user; in-progress work (autobyteus-146, -149, -181, -180, -53, the test vault, cross-node) is deliberately excluded and is not to be waited for.
- Initial ambiguity: the Task's example list includes items that were already in v1.5.5 (see F-02) and an "Antigravity fix" for which no change was found (F-03).

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-10-19 | Command | `git fetch origin --tags`; `git rev-parse v1.5.6-beta.11^{commit}` → `87732d5504…`; `git log v1.5.6-beta.11..origin/personal` | Candidate identity | Only `69d7d4f3e6 docs(delivery): record task-part-of v1.5.6-beta.11 publication (DR-002)` is on origin/personal and not in beta.11; it changes 3 files under `tickets/done/task-part-of/` only. beta.11 is an ancestor of origin/personal. | — |
| 2026-10-19 | Command | `git log --merges v1.5.5..v1.5.6-beta.11 \| wc -l` → 47; `--first-parent` → 20 ticket merges | Inventory | 47 merges = 20 ticket merges into personal + 27 "merge origin/personal into ticket branch" refreshes. Everything merged to personal since v1.5.5 is in beta.11. | — |
| 2026-10-19 | Command | `git log --no-merges --first-parent v1.5.5..v1.5.6-beta.11` | Direct commits | Only release bumps, delivery records and two RELEASE.md docs commits (`d6f2d6ceb5`, `c64a45b871`: migrations move forward; support pointer). | — |
| 2026-10-19 | Command | `git diff --name-only v1.5.5 v1.5.6-beta.11 -- tickets` | Ticket inventory | 18 ticket folders changed (table below). `task-keys-declutter` changed only by v1.5.5's own delivery records. | — |
| 2026-10-19 | Doc | each `tickets/done/<t>/release-notes.md` and `handoff-summary.md` at beta.11 | Per-ticket user-facing changes | Basis for the curated notes; see inventory. | — |
| 2026-10-19 | Doc | `git show v1.5.5:.github/release-notes/release-notes.md` | What v1.5.5 already announced | Task keys, "depends on", Team status dots, first Skill-updated notice, create/update split already shipped in v1.5.5. | F-02 |
| 2026-10-19 | Doc | `tickets/done/stable-release-20261014/release-notes.md` (v1.5.4) | Known limitations previously announced | v1.5.4 listed "Live response batching can flush earlier than its configured interval" as unresolved; PB-001 (`agent-input-state-content-cadence`) fixes it. | Notes mention it |
| 2026-10-19 | Code | `git diff v1.5.5 v1.5.6-beta.11 -- …/claude/claude-workspace-resolver.ts …/codex/codex-workspace-resolver.ts …/autobyteus/autobyteus-agent-run-backend-factory.ts` | F1 | Resolvers now `if (registeredRoot) throw error` (was: only for configured shared workspaces). AutoByteus factory now opens a registered-but-unloaded workspace via `getOrCreateWorkspace` instead of the temp fallback. | DEC-001 |
| 2026-10-19 | Doc | `tickets/done/workspace-skill-collision-fix/design-spec.md:47` (F1, Needs user); code-review C-02 | F1 origin | F1 kept as HEAD pending the user's decision. | DEC-001 |
| 2026-10-19 | Command | `git log v1.5.5..v1.5.6-beta.11 -- …/backends/antigravity …/backends/grok` | "Antigravity fixes" | Only `2448e166bd` (NFS env removal, no user effect) and `810408bcee` (beta-only skill regression restore). No Antigravity user-facing change since v1.5.5. | F-03 |
| 2026-10-19 | Command | `gh run list --limit 12`; `gh release view v1.5.6-beta.11 --json assets` | Candidate pipeline health | beta.9, beta.10, beta.11: all four release workflows `success`; beta.11 has 17 assets. | — |
| 2026-10-19 | Command | `gh repo view AutoByteus/autobyteus-workspace --json visibility,hasIssuesEnabled` | Support pointer | Public repo, Issues enabled. No other support channel is documented in the repository. | DEC-002 |
| 2026-10-19 | Doc | `autobyteus-web/docs/electron_packaging.md:749-812`; `autobyteus-server-ts/docker/README.md:247,581-585` | Backup location | Desktop server data: `~/.autobyteus/server-data/`; Docker: the server data volume mounted at `/home/autobyteus/data`. | Notes |
| 2026-10-19 | Code | `scripts/desktop-release.sh`, `.github/workflows/release-desktop.yml:641` | Notes format constraints | No heading validation; the curated file is copied to `.github/release-notes/release-notes.md` and used as the release body. | — |

## Merged-Change Inventory Since v1.5.5 (in beta.11)

| Ticket folder | First-parent merge | First beta | User-facing? | Source of notes |
| --- | --- | --- | --- | --- |
| delegated-copy-own-run-memory | `9b5cf4025d` | beta.1 | Yes; **one-way migration** `20261017_task_agent_own_run_v1` | release-notes.md |
| (standalone NFS extraction, autobyteus-nfs-1) | `55bff1f5ee` | beta.2 | Mostly no (NFS moved to its own repo); F1 local-workspace changes; introduced the beta-only skill regression | F1 / DEC-001 |
| agent-input-state-content-cadence (PB-001) | `33129d04b9` | — | Yes: standalone live text back to the configured window | handoff-summary |
| remove-create-or-update-project | `3f7e3fb8af` | — | Yes (agent tool removal) | release-notes.md |
| skill-update-notice-changed-files | `4964c61836` | — | Yes | release-notes.md |
| workspace-skill-collision-fix (autobyteus-142) | `d32cef31b6` | beta.4 | No net change vs v1.5.5 (fixes a beta.2/beta.3 regression) | — (omitted from stable notes) |
| link-existing-run-to-task (adoption) + withdraw | `4e738acc66`, `a9ec1b37e4` | beta.5 / withdrawn | Net: only "archived/deleted run leaves the sidebar right away" | release-notes.md |
| append-only-message-logs | `1ca9be9fdf` | — | Yes; **one-way migration** (message-log conversion at startup) | release-notes.md |
| chat-socket-content-cadence (autobyteus-139) | `714b27673a` | — | Yes; contract change → no version skew | handoff-summary, RSK-003 |
| delegated-copies-slow-open | `616b3968d0` | — | Yes | handoff-summary |
| agent-run-input-state-cleanup (autobyteus-140) | `d337f6c137` | — | No (refactor) | — |
| segment-lifecycle-error-flood | `753d35b073` | — | Yes (Claude lost text, error cards) | release-notes.md |
| project-task-semantic-search (autobyteus-71) | `528deff924` | — | Yes; downloads a 55 MB model on first use | handoff-summary |
| codex-segment-turn-admission-drops (autobyteus-165) | `a3824154b0` | — | Server log only | handoff-summary |
| work-journal | `c203ba7975` | beta.9 | Yes; removes old work-trace export folders at first start | release-notes.md |
| design-no-version-skew-compatibility | `e677fe98da` | — | No (DESIGN.md rule) | — |
| run-file-change-owner-scoped-reads | `f7b65486ae` | — | Yes; no version skew | release-notes.md |
| mcp-http-auth-headers | `3a6aa85e28` | — | Yes | release-notes.md |
| task-part-of | `84d0c47e24` | beta.11 | Yes | release-notes.md |

## Findings

- F-01: The candidate is complete. beta.11 = origin/personal minus one docs-only delivery record; nothing merged to personal since v1.5.5 is missing.
- F-02: Task keys and "depends on" (and the first Skill-updated notice, team status dots, create/update tool split) were announced in v1.5.5's stable notes. They are not new in v1.5.6. Only "Part of" and the improved Skill-updated notice are new.
- F-03: No Antigravity user-facing change exists since v1.5.5. The Claude/Codex/Grok skill fix only repairs a regression that existed in beta.2/beta.3; stable users never had it, so it is not listed.
- F-04: Two one-way data migrations run at first start: task agents' own runs (`20261017_task_agent_own_run_v1`) and the message-log conversion. Both tickets' notes state that older versions cannot read the converted data. The Work Journal first start removes old generated work-trace export folders (raw history unchanged). Per RELEASE.md Rollback and the migration guideline §4, the release is not rollback-capable and the notes must point users to support.
- F-05: No version-skew compatibility (DESIGN.md rule added by `e677fe98da`): an older desktop rejects the new Team/Org/delegated batch frames (RSK-003 of autobyteus-139) and shows no member files from a newer node (run-file-change-owner-scoped-reads notes).
- F-06: F1 is real and user-visible in an edge case: a Claude/Codex run whose registered workspace folder can't be opened (moved/deleted folder) now errors instead of silently running in the temp workspace; AutoByteus opens a registered-but-unloaded workspace instead of the temp fallback.
- F-07: The candidate's last three betas published fully (4 workflows success; 17 assets on beta.11).
- F-08: The Task names autobyteus-149 (release smoke checks) as in progress and excluded; F6 of autobyteus-142 (same-skill-link smoke) is part of it. Not a prerequisite: the stable can be cut without it.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/stable-release-v1-5-6/tickets/in-progress/stable-release-v1-5-6/release-notes.md` | Solution Designer | Curated stable notes passed to `desktop-release.sh --release-notes` | v1.5.6 GitHub release body | REQ-003..REQ-007, AC-003..AC-006 | Approved (SR-001 content, SR-002) | Behavior-defining; approved by the user 2026-10-19 |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| RSK-001 | Risk | One-way migrations make a faulty stable unrevertable for users | Rollback impossible | Fix forward per RELEASE.md; notes recommend backup and give the support pointer | Accepted by policy |
| RSK-002 | Risk | Users on mixed desktop/node versions see missing live text / files | Support burden | Notes say to update together | Open (policy) |
| UNK-001 | Unknown | Whether the user wants extra beta checks before the stable | Could delay | DEC-003 | Resolved: none |

## Notes For Architecture Design

The "design" is the RELEASE.md procedure executed by Delivery: version `1.5.6`, cut from origin/personal (which already contains beta.11), curated notes from this ticket's `release-notes.md`, pre-tag licensing/hygiene checks, `--no-push` then push branch and tag, watch four workflows, verify 17 assets, Latest/non-prerelease, Docker `:1.5.6`/`:latest`/`:beta` on amd64+arm64, merge the delivery record, clean up.
