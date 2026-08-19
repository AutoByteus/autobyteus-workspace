# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| `API-REV-001` | `code_reviewer` / `CRR-001` / execution round 1 | `SR-001`, `ARCH-REV-001`, `IR-001`, `CRR-001` | `N/A` | `Pass / 97.4%` |
| `API-REV-002` | `code_reviewer` / `CRR-003` / execution round 2 after `DR-005` | `SR-001`, `ARCH-REV-001`, `IR-002`, `CRR-003`, `DR-005` | `Pass / 97.4%` | `Pass / 97.2%` |

## Revision Entries

### API-REV-001 — Initial AgentTeam composer regression validation baseline

- Triggering role, report path, and round: `code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/electron-agent-input-controls-regression/tickets/in-progress/electron-agent-input-controls-regression/code-review-report.md`; API/E2E round `1`
- Triggering finding or scenario IDs: no source finding; validate `AC-001`–`AC-007` and reviewer priority journeys after `CRR-001 Pass`
- Related solution, architecture-review, implementation, code-review, or delivery revision IDs: `SR-001`, `ARCH-REV-001`, `IR-001`, `CRR-001`
- Why this baseline or coverage/execution revision was recorded: first completed API/E2E result for the ticket; establishes the authoritative coverage decisions, staged execution, browser evidence, confidence, and cleanup outcome.
- Coverage decisions or durable test paths changed: existing relevant coverage classified `Still Valid`; no repository-resident durable coverage was added, updated, removed, or reclassified during API/E2E.
- Scenarios added, changed, removed, or rechecked: rechecked `REP-001`–`REP-007`; added temporary execution scenarios `BR-001_BR-004`, `BR-002`, `BR-003A`, `BR-003B`, and `BR-005`; removed none.
- Commands, environment, fixture, or broader-validation delta: ran 11 focused Nuxt test files / 76 tests, `pnpm build`, `git diff --check`, and an owned temporary Nuxt/Chrome probe on free loopback port `51933` with synthetic A/B/standalone identities and only unchanged external transport/finalizer/transcription inputs faked. Packaged Electron and production data/profile were not used.

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/electron-agent-input-controls-regression/tickets/in-progress/electron-agent-input-controls-regression/api-e2e-coverage-investigation.md`; `/Users/normy/autobyteus_org/autobyteus-worktrees/electron-agent-input-controls-regression/tickets/in-progress/electron-agent-input-controls-regression/api-e2e-execution-coverage-report.md`; this revision record; `/Users/normy/autobyteus_org/autobyteus-worktrees/electron-agent-input-controls-regression/tickets/in-progress/electron-agent-input-controls-regression/evidence/api-e2e-round-1/`
- Prior result and confidence: `N/A`
- Current result and confidence: `Pass / 97.4%`
- New or remaining failure IDs: `None`
- Recommended recipient: `/code_reviewer` for proportional test-code review; API/E2E durable-coverage change is `None / Not Applicable`.
- Remaining risks, blocked evidence, or untested scope: unchanged real microphone capture, live backend/WebSocket transport, and Electron shell were intentionally not executed. Actual Chrome proved the affected web-equivalent renderer path; these bounded residuals do not block Pass.


### API-REV-002 — Current-source Docker workspace dependency validation

- Triggering role, report path, and round: `code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-universal-task-delegation/tickets/done/electron-agent-input-controls-regression/code-review-report.md`; API/E2E round `2` after `CRR-003`
- Triggering finding or scenario IDs: delivery `DR-005` found that the supported current-source Docker build could not resolve the server's existing `@autobyteus/team-stream-contracts@workspace:*` dependency; API scenarios `DPK-001`–`DPK-004`
- Related solution, architecture-review, implementation, code-review, or delivery revision IDs: `SR-001`, `ARCH-REV-001`, `IR-002`, `CRR-003`, `DR-005`
- Why this coverage/execution revision was recorded: repository-resident Docker packaging changed after `API-REV-001`; the earlier browser/composer result does not prove the new image build/runtime boundary.
- Coverage decisions or durable test paths changed: updated `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-universal-task-delegation/scripts/tests/test_docker_build_context_sources.py` with one table-driven three-Dockerfile inventory guard; preserved existing CLI/source tests; prior browser coverage was classified out of scope for this round.
- Scenarios added, changed, removed, or rechecked: added `DPK-001` durable inventory, `DPK-002` independent full primary build/load, `DPK-003` no-network final-image package/link/parser/`zod` probe, and `DPK-004` resource safety/cleanup; removed none.
- Commands, environment, fixture, or broader-validation delta: ran 5 Python tests; three `docker buildx build --check` commands; one native linux/arm64 primary build using unique tag `electron-agent-input-controls-regression-api-rev-002`; one `docker run --rm --network none` assertion probe; exact-tag cleanup and before/after identity-set comparison. No browser, Electron, Compose, port, volume, profile, or production data was used.

#### Prior Failure Resolution

| Prior Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| `DR-005` current-source Docker build blocker | Delivery `Local Fix`; implementation accepted as `IR-002`, source passed under `CRR-003` | Resolved for the API-owned primary build/runtime package-resolution boundary: independent image build/load and exact runtime assertions passed | `evidence/api-e2e-round-2/primary-image-build.log`; `primary-image-inspect.log`; `primary-runtime-resolution.log` |

- Prior result and confidence: `API-REV-001 Pass / 97.4%` (unchanged product/browser scope)
- Current result and confidence: `Pass / 97.2%` for the Docker packaging round
- Canonical artifacts and sections updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-universal-task-delegation/tickets/done/electron-agent-input-controls-regression/api-e2e-coverage-investigation.md`; `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-universal-task-delegation/tickets/done/electron-agent-input-controls-regression/api-e2e-execution-coverage-report.md`; this revision record; `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-universal-task-delegation/tickets/done/electron-agent-input-controls-regression/evidence/api-e2e-round-2/`
- New or remaining failure IDs: `None`
- Recommended recipient: `/code_reviewer` for proportional review of the single updated durable Python test while preserving `CRR-003` source Pass and `API-REV-002` execution confidence.
- Remaining risks, blocked evidence, or untested scope: delivery retains the reserved persistent Compose start, `/rest/health`, and final Nodes URL; related remote/all-in-one final images and linux/amd64 were not loaded. The three Dockerfile inventories and BuildKit checks passed, and upstream complete builder evidence remains accepted.
