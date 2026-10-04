# Implementation Handoff

Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/org-member-switch-performance/tickets/in-progress/org-member-switch-performance/` (all paths below are absolute or relative to the worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/org-member-switch-performance`).

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: Direct route (task_size `Small`, architectural_risk `Low`). Independent architecture review not selected. Implementation handoff rule matched: "Small or Medium and Low → `/api_e2e_engineer`".
- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/org-member-switch-performance/tickets/in-progress/org-member-switch-performance/requirements-doc.md` (Approved, SR-003)
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/org-member-switch-performance/tickets/in-progress/org-member-switch-performance/investigation-notes.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/org-member-switch-performance/tickets/in-progress/org-member-switch-performance/solution-revision-record.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/org-member-switch-performance/tickets/in-progress/org-member-switch-performance/design-spec.md` (Ready, SR-003)
- Supplemental task artifacts: `probes/` (`measure.mjs`, `measure-spike.mjs`, `impl-visual-check.mjs` new, others unchanged) and `evidence/` (baseline plus new `impl-IR-001-*`).
- Design review report: `N/A — not applicable`
- Architecture review revision record: `N/A — not applicable`
- Triggering rework report, revision record, or evidence: N/A (initial)

## Current Implementation Summary

- Implementation cycle: `Initial`
- Implementation revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/org-member-switch-performance/tickets/in-progress/org-member-switch-performance/implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-003`
- Related architecture-review revision IDs: `N/A`
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: `N/A`
- Commit: `88bd41620` on `codex/org-member-switch-performance` (base `origin/personal` @ `26b555126`). Ticket folder and build outputs are uncommitted.

The design is implemented as specified:

1. **On-demand reference identity.** `projectAgentOrgReference` keeps its signature and frozen `TeamReferenceFile` shape. `referenceId` is a getter that computes `sha256(messageId + "\0" + path)` on first read and memoizes it in the closure.
2. **One list computation.** `CollaborationMessagesSection` owns `rows = computed(() => messages.listMessages())`, derives the header count from it, and passes `:rows` to the Panel. The Panel no longer calls `listMessages()`.
3. **Bounded reference rendering (Option A).** Every message with references shows a paperclip count. Only the selected message lists references: first 20 (`REFERENCE_PREVIEW_LIMIT`), then a "Show all N files" button. `showAllReferences` resets on selected-message, focused-member or root change, and survives same-message row updates.
4. Locale keys `reference_count_label` / `show_all_references` (en, zh-CN), wording as specified.

Two small implementation details beyond the literal design text, both inside its intent:
- `selectedReference` returns `null` without scanning when no reference is selected (keeps REQ-005 "no IDs for undisplayed references" true, independent of template short-circuiting).
- Counts are formatted with `Intl.NumberFormat(resolvedLocale)` (the app locale, same precedent as token-usage). `toLocaleString()` followed the browser locale and rendered "3.136" under a German system locale during the visual check.

## Routing Classification (Mandatory)

- Task size: `Small`
- Architecture risk: `Low`
- Design classification section / evidence reference: design-spec "Task Size And Architectural Risk".
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale: Four production files in the planned capability areas (plus the two locale catalogs). No API, persistence, server, store, cache, `markRaw`/`shallowRef` or virtualization change. The server reference-ID contract is unchanged (unit-tested against Node `createHash`). The Panel's only caller is the Section. Targets were met without any of the escalation-trigger mechanisms.
- Selected route: `Direct API/E2E`
- Lightweight implementation self-review completed for the direct route: `Yes`. Checked: reactivity of frozen records with getters (Vue skips non-extensible objects); Section recompute on view replacement; Show-all reset matrix; that no remaining consumer reads `referenceId` for undisplayed rows (key, highlight, `selectedReference`, `referenceContentPath` only); dead code removed (`displayMessages`, Panel `listMessages()` call, eager hash); file sizes.
- New design impact or escalation trigger: `None`

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | Switch ≤ 200 ms; one projection; no IDs for undisplayed refs | `CollaborationMessagesSection.vue` (single `rows` computed) → `CollaborationMessagesPanel.vue` (selected-only, sliced refs) ; `agentOrgReferenceProjection.ts` (lazy getter) | Harness: 20–67 ms per switch (baseline 3,155–4,232 ms for code reviewer). Unit: `listMessages` called once per view; only the 20 displayed references read IDs on mount and on member switch |
| BEH-002 | Files-tab switching unchanged | Not touched (Panel not mounted) | Harness control 5–58 ms (baseline 5–51 ms) |
| BEH-003 | Count on each row; refs only under selected message, 20 + Show all; order, header, auto-selection, detail preserved | `CollaborationMessagesPanel.vue` | Unit + rendered check. ≤ 20 reference rows after any switch (baseline 41,965); DOM 828–1,916 nodes (baseline 188,589) |
| BEH-004 | Same content opens; ID on demand | Reference click → `reference.referenceId` (first read hashes) → `messages.referenceContentPath` → viewer | Unit: ID equals Node SHA-256; hashed once across reads. Rendered: last of 1,820 references opened its file content after Show all |
| BEH-005 | Live arrival bounded by visible rows | Org view replacement → Section recomputes rows (no hashing) → keyed patch; Show-all kept for same message | Unit: Show-all survives same-message `rows` update; identity reads bounded to displayed rows after a view replacement. Live-stream timing not measured (see coverage hints) |
| BEH-006 | Team / standalone use the same bounded panel | Shared Section/Panel; standalone root also uses `projectAgentOrgReference` | Unit tests use Team-shaped data (`testCollaborationMessagesContextView`) |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes` (mobile, producer side, server untouched).

## Key Files Or Areas

- `autobyteus-web/services/agentOrgExecution/agentOrgReferenceProjection.ts`
- `autobyteus-web/components/workspace/collaboration/CollaborationMessagesSection.vue`
- `autobyteus-web/components/workspace/collaboration/CollaborationMessagesPanel.vue`
- `autobyteus-web/localization/messages/en/workspace.ts`, `autobyteus-web/localization/messages/zh-CN/workspace.ts`
- Specs: `components/workspace/collaboration/__tests__/CollaborationMessagesPanel.spec.ts`, `.../CollaborationOverviewPanel.spec.ts`, `services/agentOrgExecution/__tests__/agentOrgReferenceProjection.spec.ts`

## Important Assumptions

- The preview limit is 20 (approved mockup; "25 hours" read as a transcription of 20, per the design). It is one constant.
- Existing selection semantics are unchanged. If the selected message also exists in the new member's perspective (a message between the two members), it stays selected after a switch, as before.

## Known Risks

- A user who expands Show all, opens a reference beyond the first 20, then switches member while that same message stays selected will see the list collapse to 20. The opened reference stays in the viewer, but its row is hidden until Show all is clicked again. This follows the approved reset rule; noted only for awareness.
- Electron renderer timing is not measured (UNK-002); headless Chrome only.
- A future consumer iterating `referenceId` over all references would reintroduce hashing (design Risks). The projection test asserts no hashing before read.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Performance with an approved visible behavior change.
- Reviewed root-cause classification: Local Implementation Defect.
- Reviewed refactor decision: `No Refactor Needed`
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: Targets met with only the three removals/bounds. No caching, store, watcher on the org view, reactivity opt-out or virtualization added.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None` (no fallback to `listMessages()` in the Panel; `rows` is required).
- Legacy old-behavior retained in scope: `No` (no "inline all references" mode or flag).
- Dead/obsolete code removed in scope: `Yes`. Removed the Panel's `displayMessages` / `listMessages()` call, the eager hash and the all-messages reference loop.
- Shared structures remain tight: `Yes` (`TeamReferenceFile` unchanged).
- Canonical shared design guidance reapplied: `Yes`
- Changed source files within size guardrails: `Yes`. Panel 316 effective lines; total source delta about 100 lines.
- Notes: none.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected`
- Design-spec decision reference: "Persisted Data / State Transition Decision".
- Implementation follows the approved decision: `Yes`. Reference IDs are derived, never stored.
- Direct-use evidence or discard/rebuild result: N/A
- Migration implementation: N/A
- Deviation: `None`

## Environment Or Dependency Notes

- No dependency changes.
- Snapshot reproduction (for validation reuse). Data: `/tmp/org-switch-repro/data`. The investigation notes did not record the exact commands; these are the ones used:
  - Backend (isolated; the log confirms `Datasource ... file:/tmp/org-switch-repro/data/db/production.db`): from `/Applications/AutoByteus.app/Contents/Resources/server`, `env -i HOME=/tmp/org-switch-repro/home PATH=/usr/bin:/bin ELECTRON_RUN_AS_NODE=1 APP_ENV=production DATABASE_URL=file:/tmp/org-switch-repro/data/db/production.db DB_NAME=/tmp/org-switch-repro/data/db/production.db AUTOBYTEUS_MEMORY_DIR=/tmp/org-switch-repro/data/memory AUTOBYTEUS_SERVER_HOST=http://127.0.0.1:29811 /Applications/AutoByteus.app/Contents/MacOS/AutoByteus dist/app.js --data-dir /tmp/org-switch-repro/data --port 29811 --host 127.0.0.1`. Pass `DATABASE_URL` explicitly. An earlier designer-run log (`/tmp/org-switch-repro/server.log`) shows Prisma pointing at the user's real `~/.autobyteus/server-data/db/production.db`.
  - Frontend: in `autobyteus-web`, `NODE_ENV=production BACKEND_NODE_BASE_URL=http://127.0.0.1:29811 BACKEND_GRAPHQL_BASE_URL=…/graphql BACKEND_REST_BASE_URL=…/rest BACKEND_*_WS_ENDPOINT=ws://127.0.0.1:29811/… pnpm exec nuxt build`. Output goes to `autobyteus-web/dist/public`; serve it with `python3 -m http.server 29812 --bind 127.0.0.1`.
  - Both servers were stopped after the checks. `autobyteus-web/dist/` is a build output and is not committed.

## Local Implementation Checks Run

- `pnpm -C autobyteus-web test:nuxt components/workspace/collaboration services/agentOrgExecution services/agentCollaboration --run`: 13 files, 106 tests passed.
- `pnpm -C autobyteus-web test:nuxt components/workspace/team/__tests__/TeamFocusSendWorkflow.spec.ts components/layout --run`: passes except 2 tests in `components/layout/__tests__/RightSideTabs.workspaceTarget.spec.ts` ("retains A while canonical B metadata fails…"). These **fail identically on the unmodified base** (verified with the change stashed), so they are pre-existing and unrelated.
- `pnpm -C autobyteus-web audit:localization-literals`: passed, zero findings. `pnpm -C autobyteus-web guard:localization-boundary`: passed.
- `tsc --noEmit -p autobyteus-web/.nuxt/tsconfig.json`: no errors in changed TS/spec files. `vue-tsc` is not installed in the workspace, so SFC `<script setup>` blocks were not type-checked.
- `nuxt build` (production): succeeded.
- Snapshot harness (implementation self-check, not acceptance sign-off). Evidence in `evidence/impl-IR-001-switch-Org-results.json` and `evidence/impl-IR-001-switch-Files-results.json`:
  - Org tab: code reviewer 51/51/65/46 ms, api e2e 27/49 ms, architecture reviewer 67 ms, solution designer 20 ms, implementation engineer 43 ms. Every switch ≤ 200 ms (QR-001). Reference rows ≤ 20 (QR-002). DOM 828–1,916 nodes.
  - Show all 3,136: 261 ms (QR-003 ≤ 300 ms). An earlier run measured 255 ms.
  - Files control: 5–58 ms.

## Frontend Rendered-Result Check (When Applicable)

- Affected surfaces / journeys: Right-side Org tab → Messages (shared with Team/standalone Messages): message list, reference list under the selected message, Show all, reference viewer.
- Approved references: DEC-001 Option A mockup (design-spec Concrete Examples).
- Existing design system / adjacent surfaces reviewed: existing Panel row styling, Iconify heroicons, `sr-only` usage, token-usage locale-number formatting precedent.
- Rendered surface used: production build against the isolated snapshot backend in headless Chrome (2000×1250 and 1280×800). Script: `probes/impl-visual-check.mjs`.
- States and interactions inspected: count on every row, including the selected one ("3,136"; title "3,136 reference files"); 0-file message with no indicator (unit); selected message with 20 rows; Show-all control (hover/focus style); Show all via click and via keyboard (focus + Enter → 3,136 rows, button removed); opening the last of 1,820 references after Show all (viewer shows the file); selecting another message (its 4 rows only); narrow viewport.
- Issue found and corrected: the count used the browser locale ("3.136"). It now uses the app locale ("3,136").
- Supporting evidence: `evidence/impl-IR-001-visual/*.png`. Limitations: zh-CN rendering checked only through catalog entries and audit, not visually. Electron not exercised.

## Downstream Coverage Hints / Suggested Scenarios

- AC-001/AC-002/AC-005/AC-006: rerun `probes/measure-spike.mjs <out> Org` and `probes/measure.mjs <out> Files` against a fresh production build of `88bd41620` (setup above).
- AC-004: open the first and last reference of the largest message (3,136) and compare the content with the same path. Also check a missing/unreadable file shows the existing viewer error.
- AC-007 (UNK-001): live org, Org tab open on a member with large history; deliver a new communication message. Expect: the list updates, Show-all state is kept for the same selected message, and main-thread work stays ≤ 200 ms.
- AC-008: Agent Team run (server-provided `reference_id`) with many references. Expect the same bounded rendering.
- UNK-002: Electron spot check of the switch timing.
- zh-CN: count title and "显示全部 N 个文件" rendering.

## API / E2E / Executable Coverage Investigation And Execution Still Required

All acceptance criteria still need independent API/E2E validation: AC-001–AC-008, QR-001–QR-003, the live-arrival path (AC-007), the Team-root dataset (AC-008) and the Electron check (ASM-002/UNK-002). The harness numbers above are implementation self-checks only.
