# API/E2E Revision Record

The canonical coverage investigation and execution coverage report remain the current truth. This record preserves the concise history of completed API/E2E rounds.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| `API-REV-001` | Implementation Engineer / `implementation-handoff.md` / Round 1 | `SR-004`; `IR-001`; architecture/code-review revisions N/A | `N/A` | `Fail / 84%` |
| `API-REV-002` | Implementation Engineer / `implementation-handoff.md` / Round 2 local-fix re-entry | `SR-004`; `IR-002`; `CRR-001`; `API-REV-001` | `Fail / 84%` | `Pass / 97%` |

## Revision Entries

### API-REV-001 — Real Team narrow overflow discovered

- Triggering role, report path, and round: `/software_engineering_team/implementation_engineer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/handoff-display-label-only/tickets/in-progress/handoff-display-label-only/implementation-handoff.md`; initial API/E2E round.
- Triggering finding or scenario IDs: `IR-001`; `SCN-001`–`SCN-003`; new `API-FIND-001`.
- Related architecture-design, architecture-review, implementation, code-review, or delivery revision IDs: `SR-004`; architecture-review `N/A`; `IR-001`; code-review/delivery revisions `N/A`.
- Why this baseline or coverage/execution revision was recorded: Establish the required first API/E2E baseline and record a critical realistic-browser failure not exposed by passing component/build checks.
- Coverage decisions or durable test paths changed: Updated Team parent assertions and the existing real-backend Agent Org/Team browser probe; replaced its obsolete visible-rooted-address assertion; added long/stale/collision/manager-local responsive evidence.
- Scenarios added, changed, removed, or rechecked: Rechecked `SCN-001`–`SCN-003`; added `API-E2E-TEAM-DETAIL`, `API-E2E-ORG-AUTHOR`, and `API-E2E-STALE-NARROW`; removed no scenario.
- Commands, environment, fixture, or broader-validation delta: Focused `20/20` Nuxt tests, locale guards, and production build passed. An isolated current-format SQLite/backend/GraphQL/Nuxt/Chromium detail journey failed because Team handoff content overflowed its narrow container.

#### Prior Failure Resolution

None — `API-REV-001` has no prior API/E2E result.

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md`; `api-e2e-test-case-ledger.md`; `api-e2e-execution-coverage-report.md`; this record; retained ticket probe evidence.
- Prior result and confidence: `N/A`
- Current result and confidence: `Fail / 84%`
- New or remaining failure IDs: `API-FIND-001`
- Recommended recipient: `/software_engineering_team/code_reviewer` for focused failure-origin review.
- Remaining risks, blocked evidence, or untested scope: `AC-001`/`QR-002` fails for long Team labels at `585px`; real authoring and full updated-probe regression were stopped and must run after rework.

### API-REV-002 — Narrow overflow resolved; stopped browser cases completed

- Triggering role, report path, and round: `/software_engineering_team/implementation_engineer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/handoff-display-label-only/tickets/in-progress/handoff-display-label-only/implementation-handoff.md`; API/E2E round `2` after `IR-002`.
- Triggering finding or scenario IDs: `IR-002`; `CR-FIND-001`; `API-FIND-001`; recheck `API-CASE-003` before `API-CASE-004` and `API-CASE-005`.
- Related architecture-design, architecture-review, implementation, code-review, or delivery revision IDs: `SR-004`; architecture review `N/A`; `IR-002`; `CRR-001`; delivery `N/A`.
- Why this revision was recorded: Preserve the rerun delta from the prior failing baseline and record direct resolution of the realistic Team overflow plus completion of the previously untested authoring and aggregate browser cases.
- Coverage decisions or durable test paths changed: Retained the prior Team parent and full-stack probe updates; strengthened the browser probe with explicit desktop three-column and settled narrow manager/card/grid/direct-column/identity geometry, plus a bounded viewport-settle wait so JSON and screenshot evidence describe the same final layout.
- Scenarios added, changed, removed, or rechecked: Rechecked and passed `API-CASE-003`; executed and passed prior `Not Tested` cases `API-CASE-004` and `API-CASE-005`; re-ran `API-CASE-001`, `API-CASE-002`, and `API-CASE-006`; removed no scenario.
- Commands, environment, fixture, or broader-validation delta: Real Node backend, isolated SQLite/current packages, GraphQL, Nuxt, and Chromium ran at `1440x1000` and `585x900`. Focused repository coverage passed `5` files / `25` tests; both locale guards and 16-route production build passed. All `24` definition-file hashes were unchanged and every owned process/root was cleaned.

#### Prior Failure Resolution

- `API-FIND-001`: `Resolved` by `IR-002` / commit `fd7a9e1a9`, confirmed through `API-CASE-003`.
- Prior observed geometry: Team HandoffManager `231px` client width / `957px` scroll width at `585px`.
- Current accepted geometry: Team manager/card/grid `501/501px`, `459/459px`, `427/427px`; both direct columns and identity tiles have equal client/scroll widths; complete long label wraps to `60px`; desktop retains `460.5px 32px 460.5px` tracks.
- Canonical evidence: `probes/api-e2e/agent-org-role-labels-detail/agent-org-role-labels-result.json` and `detail-team-narrow-en.png`. Round 1 failure evidence is preserved in `probes/api-e2e/agent-org-role-labels-detail-api-rev-001/`.

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md`; `api-e2e-test-case-ledger.md`; `api-e2e-execution-coverage-report.md`; this record; retained ticket probe evidence.
- Prior result and confidence: `Fail / 84%`
- Current result and confidence: `Pass / 97%`
- New or remaining failure IDs: `None`
- Recommended recipient: Handoff-rule-selected successful direct-route recipient, expected `/software_engineering_team/delivery_engineer`.
- Remaining risks, blocked evidence, or untested scope: Only bounded platform-native closed-select pixel variation and intentionally untested Electron-shell behavior, neither material to this shell-independent shared renderer change. No critical or material scope remains untested.
