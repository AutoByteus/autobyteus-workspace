# Handoff Summary — memory-team-view-slow-load

Status: **user-verified; finalized into `origin/personal`, with no release.** On 2026-09-25 the user tested the DR-002 packaged build and wrote: "i tested. its working. lets finalize, no need to release a new version".

## What Was Delivered

- **Speed.** Memory → Agent Teams, and opening a team, are now linear in stored team runs, with one execution-tree read per root per request. On the user's real data copy against the built backend:
  - teams list: 0.20–0.26 s, down from about 32 s;
  - SE team runs: 0.18–0.21 s, down from 65–80 s to usable;
  - orgs: about 0.02 s.
- **Navigation.** Every card, run, member or Back click navigates immediately and issues exactly one request. Detail views show "Loading runs…" and never show another selection's runs.
- **Agent Orgs tab** (REQ-006…REQ-008). It has org cards, org runs, a member tree, and an org member inspector with the breadcrumb `Agent Orgs / <org> / <org run> / <member>`.
- **Member tree** (REQ-012). Every agent run with memory is shown in its execution structure: configured agents, configured teams, task agents and task teams (at any depth). Each row opens its own run (REQ-010) and shows its name (REQ-009).
- **Sources refresh** (REQ-011). The sources list refreshes only on the Memory home view.
- **GraphQL.** Existing query names and arguments are unchanged. The package adds:
  - the org queries and `getAgentOrgMemberRunMemoryView`;
  - the member-target fields `executionKind`, `startedAt` and `groupPath`, and the type `CollaborationMemoryGroup`;
  - a rename of the shared member type to `CollaborationMemberMemoryTargetSummary`.
- **Persisted data.** Unchanged; every path is read-only.

## Classification And Evidence

- `task_size=Large`, `architectural_risk=High`, reviewed route.
- Requirements SR-004 (user "go", 2026-09-25). ARCH-REV-004 Pass, IR-002, CRR-005 Pass (9.4/10), API-REV-001 Pass (95.7%; AC-001…AC-014 directly proven), CRR-006 Pass.

## Integrated State For Verification

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-team-view-slow-load`
- Branch: `codex/memory-team-view-slow-load` @ `fdcadbbb5`. That is a merge of `origin/personal` @ `a2694ed45` over checkpoint `a146a14bf`, which holds the CRR-006-reviewed e2e assertion and the review artifacts. The branch is 0 behind and 4 ahead, local only.
- Integration method: merge. Upstream delta: one docs-only delivery-record commit. No conflicts.
- Post-integration checks:
  - server memory/org/graphql/run-history suites: 87 files passed, 417 tests passed. Only the 3 pre-existing unrelated failures remain (`memory-sync-multiprocess.e2e`, `agent-run-history-catalog-service`, `published-artifact-projection-service`), identical to CRR-005;
  - server `tsc --noEmit`: 0 errors;
  - web memory specs: 12 files, 54 tests passed.
- Docs synced: `autobyteus-web/docs/memory.md` and `autobyteus-server-ts/docs/modules/agent_memory.md` (see `docs-sync-report.md`).

## How To Verify

1. Install the local test build. Quit the running AutoByteus app first, since the build uses the same app name and data:
   `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-team-view-slow-load/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.4.81.dmg`
   - The build is unsigned: on first launch, right-click → Open, or allow it in System Settings → Privacy & Security.
   - Alternatively, run `pnpm dev` from the worktree.
2. Open Memory → **Agent Teams**. Cards should appear in about a second. Open a large team such as software-engineering-team. The runs should appear at once, with member names.
3. Open Memory → **Agent Orgs**. Open an org and then a run. Check the member tree:
   - configured teams appear as group rows;
   - delegated task teams and task agents are marked as tasks, with a start time.
4. Open a member. The Inspector should show that run's memory, the breadcrumb should read `Agent Orgs / … / <member>`, and Back should return to the org detail.
5. Optional: go back to Memory home and confirm the source selector is still present and current.

## Known Items / Residual Risk

- A packaged Electron build (DR-002) passed the isolated startup and health smoke test. The Memory-page behavior inside the packaged app is what your test covers.
- `generated/graphql.ts` codegen delta was hand-applied onto upstream's already-stale file. It was verified at 401/401 lines against codegen output.
- RSK-001 (accepted): there is no caching. Performance is bounded at today's volume.
- CR-005 and CR-006 are low-severity, non-blocking source cleanups:
  - an orphaned doc comment above `containsRunId` (`team-run-execution-tree-location-service.ts:98`);
  - the unused `sourcesLoaded` store field.
- C-14: the AC-014 example rows in `requirements-doc.md` don't match real data. In real data the configured `StudentStudyGroup` students have no memory, so they correctly don't appear. The wording fix is with the Solution Designer.
- DEC-004: memory folders that the run's execution tree does not reference are intentionally not shown.
- API/E2E environment incidents (details in `api-e2e-execution-coverage-report.md`):
  1. One read-only batch of queries hit the live app on port 29695; the results were discarded.
  2. The old comparison server attached to `production.db` for about 76 s, with no evidence of writes (mtime unchanged, no migrations).
- Separate-ticket candidate: a fresh dev DB re-runs app-data migrations on copied memory. That rewrote 146 team communication files, and 100 roots then failed admission. The cause is upstream, not this package.

## After Verification (completed in DR-003)

Once you confirm, delivery will:

1. Move the ticket to `tickets/done/`.
2. Commit, push the ticket branch, and merge into `origin/personal` after a fresh refresh.
3. Remove the ticket worktree and branch.

A versioned release, using `release-notes.md`, happens only if you ask for one.
