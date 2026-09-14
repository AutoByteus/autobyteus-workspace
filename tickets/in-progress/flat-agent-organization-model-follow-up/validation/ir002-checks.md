# IR-002 implementation-scoped evidence — 2026-09-14

Source/test/docs: `8bc62ce5f`, based on reviewed HEAD `e4490e173` plus preserved incoming work. This is not API/E2E acceptance.

## Red → green
- Before the production correction, the new real service/store/hydrator retained-recovery test failed both mounted and direct cases: expected historical, received reopen_required. `ir002-red.log`.
- Final command in `autobyteus-web`:
  ```sh
  pnpm test:nuxt services/agentOrgExecution/__tests__ stores/__tests__/agentOrgContextsStore.spec.ts stores/__tests__/agentOrgInspection.spec.ts stores/__tests__/agentOrgHistoryApollo.spec.ts stores/__tests__/agentOrgRetainedRecovery.spec.ts stores/__tests__/runHistoryRetainedTeamStatus.spec.ts stores/__tests__/runHistoryStore.spec.ts components/workspace/team/__tests__/TeamWorkspaceSurface.spec.ts --run
  ```
  **13 files / 182 tests pass**; `ir002-local-tests.log`. The final retained recovery file has 20 tests. The command selector for TeamWorkspaceSurface has no separate matched spec; real component mounting occurs within retained-recovery tests. The file/test counts are Vitest's actual counts, not selector counts.
- Coverage includes inactive direct/mounted headers, current identity/conversation/drafts, zero inactive checkpoint/socket/restore, rejected readiness/no resurrection, active before/after checkpoint, active→inactive retry, invalid/unreachable observations, exhausted and coalesced history recovery through both loaders, stale/failed/partial history generations, stop/manual/disconnect ownership, activity commit conflict, pending attachment exclusion/settlement, and existing composer/attachments/task contracts.
- Initial expanded run found two existing reconnect fixtures missing the newly mandatory inspection response and an obsolete failed-Stop expectation that the invalidated socket remain ready. Fixtures now exercise inspection-first active recovery. Stop regression now verifies last-known active identity/read-only until fresh inspection and new snapshot; no implicit restore.
- RET-07 local Team test confirms authoritative inactive history changes retained worker status without refocus, preserves identity/draft/terminal Error, and issues no connect/provider mutation/input. Actual Team restart and deliberate continuation remain API B02 work.

## Typecheck / guards
- `pnpm exec tsc --noEmit`: **Fail (exit 2)**, `ir002-web-typecheck.log` (704 output lines; not a diagnostic count). This plain TypeScript check lacks Vue SFC declarations and reports existing cross-workspace/fixture/module resolution/type problems. It is not a Vue SFC typecheck or a build pass.
- New test fixture readonly DTO assignments found by the first run were corrected. Final new retained-test diagnostic is unresolved `.vue` declaration, matching the unavailable SFC tooling limitation. New inspection reader, streaming service production code and Org contexts store have no reported diagnostics. `runHistoryLoadActions` still reports its unchanged Apollo import and dependent implicit-any callbacks (now lines 4/82/112). No paired whole-repository baseline comparison was performed this round; no global no-new-errors claim.
- IR-001 server strict rootDir/typecheck failure and expanded baseline qualifications remain in the cumulative record; backend was not changed/revalidated this round.
- `git diff --check`: pass. Effective nonempty production lines: reader14, service469, store255, history400; each delta under220. Test files excluded from source guard.

## Direct rendered self-check
- Read web README/AGENTS and existing Org/Team behavior docs/components. Started only an owned Nuxt development renderer on port13862 with backend base `http://127.0.0.1:19876` (no backend there).
- Temporary `pages/ir002-preview.vue` used real service/store/hydrator and `TeamWorkspaceSurface`, with isolated in-page inspection/projection/socket responses and history side-effect suppression. Preserved source: `ir002-preview.page.vue`. This is a preview fixture, not production and not a server-restart test.
- Using the browser UI, directly inspected worker Idle/live and its retained conversation. Edited the fixture draft field, clicked its isolated transport-loss/inactive-observation button, inspected the same worker now Offline/historical/continuable. Conversation remained visible and edited draft retained. No refocus, reload or Send occurred. Existing header spacing, typography and grey Offline dot were coherent; no visual patch required.
- Scope limitation: preview metadata/draft controls are fixture-only. The actual shared composer is disabled because the fixture does not install the global active workspace selection; its production interaction is exercised by composer tests, not this preview. The global sidebar reported unavailable history because there is deliberately no backend; no sidebar or live provider acceptance is claimed. Browser RET-06 and full RET-07 remain downstream.
- No persistent screenshot captured; direct browser AX/screenshot observations were inspected during this turn. `ir002-preview.log` records owned renderer startup and expected unavailable health endpoint.
- Owned tab closed, renderer PID82181 stopped, port13862 no longer listening, temporary route removed. User servers/conversations were not touched. Incoming API generated files/fixtures/evidence retained.
