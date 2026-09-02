# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| `API-REV-001` | `/code_reviewer` / `code-review-report.md` / API/E2E Round 1 | `SR-001`, `SR-002`; `ARCH-REV-001`; `IR-001`; `CRR-001` | `N/A` | `Pass / 96.9%` |
| `API-REV-002` | `/code_reviewer` / `api-e2e-test-review-report.md` / API/E2E Round 2 | `API-REV-001`; `CRR-002`; `TEST-001` | `Pass / 96.9%` | `Pass / 96.9%` |
| `API-REV-003` | `/user` / explicit real-browser request / API/E2E Round 3 | `API-REV-002`; `CRR-002`; `TEST-001` | `Pass / 96.9%` | `Pass / 98.7%` |

## Revision Entries

### API-REV-001 — Canonical structured Fast catalog parity baseline

- Triggering role, report path, and round: `/code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-fast-mode-investigation/tickets/done/codex-fast-mode-investigation/code-review-report.md`; API/E2E Round 1.
- Triggering finding or scenario IDs: known stale live raw `advertisesFast` projection; `API-CAT-001`.
- Related solution, architecture-review, implementation, code-review, or delivery revision IDs: `SR-001`, `SR-002`; `ARCH-REV-001`; `IR-001`; `CRR-001`; delivery `N/A`.
- Why this baseline or coverage/execution revision was recorded: establish the first authoritative API/E2E result after source review and make live coverage independently assert the approved canonical structured contract.
- Coverage decisions or durable test paths changed:
  - updated `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-fast-mode-investigation/autobyteus-server-ts/tests/integration/services/codex-model-catalog.integration.test.ts`;
  - replaced deprecated camel/snake speed-tier projection with independent `serviceTiers[].id` trim/lowercase matching to `priority`;
  - required at least one positive live structured Fast row;
  - committed as `f6c16014ff0868606ec8a400b74ea24de90fbe0f`.
- Scenarios added, changed, removed, or rechecked:
  - changed `API-CAT-001`;
  - rechecked `API-UNIT-001`, `API-RUNTIME-001`, `API-UI-001`, `API-BUILD-001`;
  - executed broad `API-REG-001`;
  - removed none.
- Commands, environment, fixture, or broader-validation delta:
  - prepared shared package outputs before live server integration;
  - generated Nuxt metadata before focused frontend tests;
  - executed against macOS arm64, Node 22.23.1, pnpm 10.28.2, and real `codex-cli 0.152.0`;
  - broader browser/desktop execution was `Not Required`.

#### Prior Failure Resolution

None. `API-REV-001` has prior result `N/A`. The two initial 0-test setup failures in this same round were resolved locally before the completed result: `prepare:shared` fixed server integration imports and `nuxi prepare` fixed frontend generated metadata.

- Canonical artifacts and sections updated:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-fast-mode-investigation/tickets/done/codex-fast-mode-investigation/api-e2e-coverage-investigation.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-fast-mode-investigation/tickets/done/codex-fast-mode-investigation/api-e2e-execution-coverage-report.md`
  - this `api-e2e-revision-record.md`
  - retained logs under `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-fast-mode-investigation/tickets/done/codex-fast-mode-investigation/api-e2e-evidence/`
- Prior result and confidence: `N/A`
- Current result and confidence: `Pass / 96.9%`
- New or remaining failure IDs: no feature failure ID. `API-REG-001` remains a non-blocking broad repository failure: 63 failed files / 177 failed tests across unrelated/stale suites, while the target catalog scenario passed.
- Recommended recipient: `/code_reviewer` for proportional review of the one updated durable integration test.
- Remaining risks, blocked evidence, or untested scope:
  - full server suite is not a clean regression baseline;
  - generic server package typecheck remains unusable due the pre-existing `rootDir`/included-tests mismatch;
  - future provider-ID changes intentionally fail closed;
  - browser/Electron execution is out of scope and not required for this backend-local adapter change.

### API-REV-002 — Truthful reasoning-and-Fast live scenario name

- Triggering role, report path, and round: `/code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-fast-mode-investigation/tickets/done/codex-fast-mode-investigation/api-e2e-test-review-report.md`; API/E2E Round 2.
- Triggering finding or scenario IDs: `CRR-002` / `TEST-001`; `API-CAT-001`.
- Related solution, architecture-review, implementation, code-review, API/E2E, or delivery revision IDs: `SR-001`, `SR-002`; `ARCH-REV-001`; `IR-001`; `CRR-001`, `CRR-002`; `API-REV-001`; delivery `N/A`.
- Why this coverage/execution revision was recorded: proportional review confirmed all live structured-capability logic and evidence but found that the durable scenario name and runner output described only reasoning. The name therefore had to state both advertised reasoning and Fast capability parity before delivery.
- Coverage decisions or durable test paths changed:
  - updated only the `it(...)` description in `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-fast-mode-investigation/autobyteus-server-ts/tests/integration/services/codex-model-catalog.integration.test.ts`;
  - renamed it to `preserves each live model's advertised reasoning and Fast capabilities through catalog and GraphQL`;
  - did not change the independently normalized `serviceTiers[].id` projection, positive live precondition, catalog/GraphQL assertions, fixtures, or cleanup;
  - committed as `06bcb57cf365ebc6ba12aef4ba4472e091fcd066`.
- Scenarios added, changed, removed, or rechecked:
  - changed and rechecked `API-CAT-001` only;
  - added none and removed none;
  - retained all Round 1 result evidence without rerunning unrelated scopes.
- Commands, environment, fixture, or broader-validation delta:
  - rebuilt generated shared-package outputs with `pnpm -C autobyteus-server-ts prepare:shared` because Round 1 cleanup had correctly removed them;
  - reran `RUN_CODEX_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/integration/services/codex-model-catalog.integration.test.ts --no-watch` against the real local Codex app-server boundary;
  - result: Pass — 1 file / 1 test, executed and not skipped, with the corrected reasoning-and-Fast name visible in runner output;
  - performed a one-line diff/name/legacy audit and removed the exact generated shared-package outputs;
  - did not rerun the full suite because `CRR-002` explicitly waived it for this bounded name-only correction unless new evidence appeared; the focused pass exposed none;
  - broader browser/desktop execution remained `Not Required`.

#### Prior Failure Resolution

| Prior Finding ID | Prior Classification / Owner | Resolution | Evidence | Status |
| --- | --- | --- | --- | --- |
| `TEST-001` | `Local Fix` / `/api_e2e_engineer` | Scenario description now explicitly names both advertised reasoning and Fast capability parity; unchanged live assertions were rerun | Commit `06bcb57cf365ebc6ba12aef4ba4472e091fcd066`; `api-e2e-evidence/16-round2-live-catalog-name-rerun.log`; `17-round2-name-diff-audit.log` | Resolved |

- Canonical artifacts and sections updated:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-fast-mode-investigation/tickets/done/codex-fast-mode-investigation/api-e2e-coverage-investigation.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-fast-mode-investigation/tickets/done/codex-fast-mode-investigation/api-e2e-execution-coverage-report.md`
  - this `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-fast-mode-investigation/tickets/done/codex-fast-mode-investigation/api-e2e-revision-record.md`
  - retained Round 2 logs `15-round2-prepare-shared.log` through `18-round2-cleanup.log` under `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-fast-mode-investigation/tickets/done/codex-fast-mode-investigation/api-e2e-evidence/`
- Prior result and confidence: `Pass / 96.9%`
- Current result and confidence: `Pass / 96.9%`
- New or remaining failure IDs: none for the feature or durable test. `API-REG-001` remains the preserved non-blocking Round 1 broad repository failure; it was not rerun or relabeled.
- Recommended recipient: `/code_reviewer` for proportional re-review of the corrected one-line durable test edit.
- Remaining risks, blocked evidence, or untested scope:
  - full server suite remains a non-clean Round 1 baseline for unrelated/stale reasons;
  - generic server package typecheck remains unusable due the pre-existing `rootDir`/included-tests mismatch;
  - future provider-ID changes intentionally fail closed;
  - browser/Electron execution remains out of scope and unnecessary for this backend-local adapter change.

### API-REV-003 — Real browser Daily Assistant Codex Fast validation

- Triggering role, report path, and round: `/user`; explicit request in the active API/E2E conversation; API/E2E Round 3.
- Triggering finding or scenario IDs: user-requested realistic-system proof; `API-BROWSER-001`.
- Related solution, architecture-review, implementation, code-review, API/E2E, or delivery revision IDs: `SR-001`, `SR-002`; `ARCH-REV-001`; `IR-001`; `CRR-001`, `CRR-002`; `API-REV-001`, `API-REV-002`; delivery `N/A`.
- Why this coverage/execution revision was recorded: Round 2 had already proven the real catalog boundary, but the user specifically requested real-browser proof that the repository backend/frontend could import the external agent package, configure Daily Assistant with Codex Fast, and complete a live runtime turn.
- Coverage decisions or durable test paths changed:
  - no source, fixture, or repository-resident durable test changed in Round 3;
  - retained the browser flow as a temporary realistic-system probe because the changed catalog contract already has durable integration coverage;
  - historical coverage commits remain `f6c16014ff0868606ec8a400b74ea24de90fbe0f` and `06bcb57cf365ebc6ba12aef4ba4472e091fcd066`.
- Scenarios added, changed, removed, or rechecked:
  - added and executed temporary `API-BROWSER-001`;
  - rechecked the actual package import, Daily Assistant discovery, live Fast selector, WebSocket-backed run launch, response rendering, persisted runtime config, and cleanup;
  - added/updated/removed no durable scenario.
- Commands, environment, fixture, or broader-validation delta:
  - confirmed ports `127.0.0.1:3000` and `:8000` and `.autobyteus/development` were free/absent, then ran canonical `pnpm dev` from the assigned worktree;
  - opened the real Nuxt app with AutoByteus `open_tab` at `http://127.0.0.1:3000`;
  - through the browser, removed the bootstrap template registration, imported `/Users/normy/autobyteus_org/autobyteus-agents`, selected Daily Assistant, Codex App Server, GPT-5.6-Sol, and Fast, then sent `Reply with exactly LIVE_FAST_BROWSER_OK and nothing else.`;
  - browser rendered exact assistant response `LIVE_FAST_BROWSER_OK` and status `Idle`;
  - matching backend run `daily_assistant_02fb5512fa2f4bf1bbecd2f7898d8516` persisted `runtimeKind: codex_app_server`, model `gpt-5.6-sol`, and `llmConfig.service_tier: "fast"`; raw trace and WebSocket/publication logs corroborate the live turn;
  - closed the browser tab, stopped the owned stack, verified both ports free, and removed only the isolated/generated paths confirmed absent before startup.

#### Prior Failure Resolution

No new failure was discovered. `TEST-001` remains resolved by Round 2; Round 3 did not modify the durable test and therefore introduces no additional proportional test-code review surface.

- Canonical artifacts and sections updated:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-fast-mode-investigation/tickets/done/codex-fast-mode-investigation/api-e2e-coverage-investigation.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-fast-mode-investigation/tickets/done/codex-fast-mode-investigation/api-e2e-execution-coverage-report.md`
  - this `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-fast-mode-investigation/tickets/done/codex-fast-mode-investigation/api-e2e-revision-record.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-fast-mode-investigation/tickets/done/codex-fast-mode-investigation/api-e2e-evidence/19-round3-full-stack.log`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-fast-mode-investigation/tickets/done/codex-fast-mode-investigation/api-e2e-evidence/20-round3-browser-runtime-audit.log`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-fast-mode-investigation/tickets/done/codex-fast-mode-investigation/api-e2e-evidence/21-round3-cleanup.log`
  - browser screenshots `/Users/normy/.autobyteus/browser-artifacts/758f2e-1788317331771.png` and `/Users/normy/.autobyteus/browser-artifacts/758f2e-1788317606633.png`.
- Prior result and confidence: `Pass / 96.9%`
- Current result and confidence: `Pass / 98.7%`
- New or remaining failure IDs: none for the feature or browser journey. `API-REG-001` remains preserved non-blocking Round 1 repository debt and was not rerun or relabeled.
- Recommended recipient: `/code_reviewer`; record Round 3 durable test review as `Not Applicable` and close the already-pending Round 2 review before delivery.
- Remaining risks, blocked evidence, or untested scope:
  - full server suite remains a non-clean Round 1 baseline for unrelated/stale reasons;
  - generic server package typecheck remains unusable due the pre-existing `rootDir`/included-tests mismatch;
  - future provider-ID changes intentionally fail closed;
  - Electron packaging/window/IPC behavior remains unexecuted because no shell-specific boundary changed and the requested web-equivalent journey passed in a real browser.
