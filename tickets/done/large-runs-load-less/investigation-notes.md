# Investigation Notes

## Investigation Meta

- Package identifier: `large-runs-load-less` (Project Task `autobyteus-358`)
- Request / ticket: autobyteus-358, "Large runs: load less and open faster (8 small Tasks merged into one)". Merges autobyteus-151, -152, -118, -156, -162, -163, -161 and -200 (full original texts in the Task's context file `bundle-large-runs.md`)
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/large-runs-load-less`
- Repository mode: `Git`
- Task worktree / branch: the workspace root, branch `codex/large-runs-load-less`
- Resolved base: `origin/personal` @ `efd28d5c4a6c867ee1674a6f1a5e98585ddf2ea9` (fetched 2026-11-01)
- Finalization target: `origin/personal`
- Bootstrap result: `pnpm install --frozen-lockfile` (exit 0); server `prebuild` + `build`, `nuxt prepare` (exit 0)
- Bootstrap blocker: none
- Current solution revision ID: `SR-001`
- Authorities read: `SKILL.md` (updated 2026-11-01), `references/requirements-engineering.md` (2026-11-01, this conversation)
- Investigation status: complete. Item 163's cause was established after IR-001 (M-163b)

## Initial Request And Clarifications

- Original request: the Task (read with `get_project_task`, no comments). "Check each item against the current code first: report what is already fixed or no longer applies, with evidence, and work only on what is still true." "Measure before and after on realistic large data (isolated copies; never the user's real data without his approval and a backup)." "Where items share one cause or one fix … the fix should be one change, not eight."
- Clarifications, all relayed by the PM with the user's words:
  - 2026-11-01: "check yourself whether each merged small problem still exists, and decide. An item that is already fixed, no longer applies, or is no longer worth the effort … is yours to drop … Say in your report which items you dropped and why. Only questions that truly need the user (a change of product behavior or scope) go to him."
  - "Other teams work in parallel on 318, 345, 357, 285, 337 and 355: keep to your area."
- The user, in this conversation (2026-11-01): "a lot of … those are performance issues and yeah, go ahead."

## Source Log

| Date | Type | Source | Finding | ID |
| --- | --- | --- | --- | --- |
| 2026-11-01 | Code | `autobyteus-server-ts/src/services/agent-streaming/agent-collaboration-view-projector.ts:24-54` | The Agent-root view (`GetAgentRunCollaboration`, and every live snapshot) carries `communication_messages` with the whole public message log | E-01 |
| 2026-11-01 | Code | `standalone-agent-run-root/services/standalone-agent-run-root-manager.ts:269-287`; `persistence/standalone-root-package-store.ts:55-84` | A stopped hub's view reads the tree, composed from every task agent's own file (`composeTreeFile`), plus the hub's log and every task agent's log (`composeMessageLogs`) | E-02 |
| 2026-11-01 | Code | `run-history/services/root-run-package-current-validator.ts:132-200`; `root-run-package-readiness-index.ts:32-67` | The readiness scan reads and validates every root team and org run's whole message log. It runs at the first history access after a start, and `admitCurrent` runs it again on every new team or org run | E-03 |
| 2026-11-01 | Code | `autobyteus-web/services/runHydration/teamRunContextHydrationService.ts:266-298`; `services/agentOrgExecution/agentOrgContextHydration.ts:77,148-165` | Opening a team or org run fetches every member's projection (conversation and activities) and file changes. A team fetches them best-effort; an org fetches them all | E-04 |
| 2026-11-01 | Code | `autobyteus-web/services/runHydration/teamMemberProjectionHydrationService.ts`; `services/agentCollaboration/agentRunCollaborationChildHydration.ts:59` | On-demand member loading exists for team members (fallback) and for a hub's copies (autobyteus-93) | E-05 |
| 2026-11-01 | Code | `autobyteus-web/stores/existingRunConfigStore.ts:198-208` | `readAgentCanonical` (Settings data on selection) calls `readAgentRunCollaboration` itself for a stopped run, only for its tree, closed and remote task executions | E-06 |
| 2026-11-01 | Code | `autobyteus-web/stores/agentRunCollaborationStore.ts:142-162,219-227`; `composables/agentCollaboration/useAgentRunCollaborationSync.ts` | The collaboration store dedupes only its own in-flight inspection | E-07 |
| 2026-11-01 | Code | `autobyteus-server-ts/src/projects/stores/project-store.ts:98-104`; `projects/services/project-service.ts:116-121,263-281`; `projects/search/project-task-search-service.ts:105-113` | The Projects list reads every `task.json` of every Project for the counts; the Embedding status reads the Tasks of dirty Projects only | E-08 |
| 2026-11-01 | Data | the user's data, **file names and sizes only** (`ls`, `stat`, `du`; no content read) | 728 team runs, 26 org runs, 745 agent runs. Current team/org message logs: 754 files, 103.8 MB. The PM's hub log is 4.2 MB sealed + 2.5 MB active. The largest org runs have 8 members with 49–58 MB of raw traces; 12 Projects, 458 Tasks | E-09 |

## Runtime, Probe, Or Reproduction Findings

All on test-owned data: a seed made by the repository's own probe (`autobyteus-web/tests/e2e/delegated-copies-large-hub-probe.mjs --seed-to /tmp/ab358-seed --teams 50 --unrelated 300`) through public APIs, with a scripted runtime (no inference). The seed has a hub with 50 six-member Team copies (300 task agents), 250 copy→hub reports of 10 KB (hub log 2.6 MB) and 300 stopped team runs. Host: macOS 26.5.2, node v22.23.1, Chrome; the load average is recorded per measurement (other teams' work: 6–150).

| ID | Item | Method | Observation | Evidence |
| --- | --- | --- | --- | --- |
| M-161 | 161 | The seed probe compares the running hub's live view with the stored log | **Fixed already**: `liveViewMessages 252`, `storedMessages 252` (October: 11 of 252) | `/tmp/ab358-seed.log`; copied to `evidence/M-161-seed-message-log.txt` |
| M-200 | 200 | `evidence/probes/projects-backlog-probe.mjs`, 20 Projects × 1,000 Tasks | Projects list median **642 ms** on the Mac (load 153); **1,315 ms** in a Docker node (`autobyteus/autobyteus-server:1.5.11-beta.7`, 10 CPUs, load 2). All Tasks: 632 / 1,484 ms. October on Docker: 1.8 s. At the user's 458 Tasks, about 30 ms | `evidence/M-200-projects-backlog-before.json`, `evidence/M-200-projects-backlog-docker-before.json` |
| M-118 | 118 | Seed probe S-API: hub view over HTTP | The view with 300 task agents' own files and the 2.6 MB log takes **47 ms** on the server (first 97 ms) | `evidence/M-hub-open-current.json` |
| M-152 | 152 | Same | The hub view is **2,790,524 bytes**; its message log is about 2.6 MB of it. The PM's log is about 6.7 MB on disk | same |
| M-162 | 162 | Seed probe S-001..003, a hub click with request counts | `hubClickSettledOps: GetAgentRunCollaboration 2` (2 × 2.79 MB) and `GetSkills 2`. The cause is E-06: Settings data reads the view itself | same |
| M-156 | 156 | `evidence/probes/startup-scan-probe.mjs` on a copy of the seed, logs grown with valid messages | 300 admitted team runs: **139 ms** at 2.5 MB of logs, **328 ms** at 100.4 MB (load 9–14). Reading the logs is about 0.19 s per 100 MB, per scan | `evidence/M-156-startup-scan-before.json` |
| M-163 | 163 | Seed probe L-010 `--large-shape unbroken`: 20 × 60 KB single-token messages to a copy, a cold page opens it | Still **87,014 ms** from the click to loaded, with server time 26 ms (2.46 MB projection). In isolation, the conversation builder, markdown (with linkify, KaTeX, DOMPurify), the path finders, the mention splitter and Chrome's layout of 10 × 60 KB unbroken text are each linear and under 40 ms. The cause is being found with a CPU profile of the real click | `evidence/M-163-*` |
| M-163b | 163 (after IR-001: QR-004 missed with one layout read per frame) | (1) The implementation's profile: 23 forced layouts of 3.9–7.1 s each (`evidence/IMP-L010-unbroken-after.cpuprofile`). (2) The copy opened with CSS injected before the click: `overflow-wrap:anywhere` 86.3 s, `word-break:break-all` 43.3 s, `min-width:0` 86.3 s (`evidence/M-163-css-variants.txt`). (3) In the loaded page, forced relayouts with one property changed at a time (`evidence/M-163-layout-experiments.json`): as is **86,076 / 85,406 ms**; `font-family: Arial` **83 / 45 ms**; `font-kerning:none; font-variant-ligatures:none; font-feature-settings:normal; text-rendering:optimizeSpeed` **48 / 87 ms**; `white-space:normal` 85.6 s; every element `display:block` 79 s; without the 20 user blocks 43.9 s; without the 20 markdown blocks 42.7 s. The 40 long elements use `ui-sans-serif, system-ui, sans-serif` with `overflow-wrap: break-word` | **Cause: text shaping of 60 KB single-word runs in the system UI font with kerning and ligatures**, seconds per message and per layout. Line breaking is secondary (break-all halves it). The repeated layouts during opening multiply it | `evidence/M-163-*` |
| M-151 | 151 | Code (E-04) plus data sizes (E-09) | Opening the user's largest org run loads 8 members' conversations derived from 49–58 MB of traces before showing it. To be measured before and after on a seeded large org run in the build | — |

- Temporary diagnostics: a CPU-profile copy of the probe (`tests/e2e/ab358-profile-probe.mjs`) and two benchmark specs (`tests/ab358tmp/`); not kept in the code, removed before handoff.
- Reproductions for implementation: the seed probe commands above; `evidence/probes/*.mjs`.

## Persisted Data And State Facts

- No stored format changes are needed by any kept item. The views and queries change, not the files.

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Resolution |
| --- | --- | --- | --- |
| U-01 | Unknown | Item 163's exact cause | Resolved: M-163b (font shaping with kerning and ligatures) |
| R-01 | Risk | The measurements run beside other teams' work (load 6–150) | Record the load with each number; compare before and after under similar load |
