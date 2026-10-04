# API/E2E Test-Case Ledger — github-skill-sources

Round 1 / API-REV-001 pending; initialized 2026-10-04 before execution. Worktree as in coverage investigation. Canonical investigation/report/revision are adjacent; this ledger preserves checkpoints, not a round-level verdict.

## Planned cases
| Case | Expected result | Entry | Order | State |
| --- | --- | --- | --- | --- |
| E-001 | Valid focused repository checks pass | Documented prebuild then Vitest | 1 | Not Tested |
| E-002 | Source GraphQL lifecycle/errors/fragments retain semantics | Real schema, controlled remote transport, disposable storage | 2 | Not Tested |
| E-003 | Public root/collection imports and read supporting files | Read-only live GitHub | 3 | Not Tested |
| E-004 | Restart/fault/removal preserve published state | Source commands and owned process lifecycle | 4 | Not Tested |
| E-005 | Same-workspace B starts with g2 while A remains live | Actual header ＋/Send, production adapters | 5 | Not Tested |
| E-006 | Old explorer closes; reopen current files; remove no stale root | Real socket/watcher/product files surface | 6 | Not Tested |
| E-007 | Package/local/default behavior retained | Affected regression suites | 2b | Not Tested |
| E-008 | Native archive/link/permissions/deletion retain boundaries | Windows/Linux targets | 7 | Not Tested |

## Execution events
| Sequence | Case | Event | Command/configuration | Expected | Observed/result | Evidence | Next |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | E-001 | Checkpoint | pnpm -C autobyteus-server-ts prebuild | Restore dependencies | Pass; prebuild only, no test assertions | evidence/api-prebuild.txt | focused suite |
| 2 | E-001 | Completed | Focused command in investigation | Valid source/archive/materializer checks pass | Pass, 6 files / 91 tests; macOS fixture evidence only | evidence/api-focused.txt | E-002 |
| 3 | E-002 | Started | vitest run tests/e2e/skills/github-skill-sources-graphql.e2e.test.ts --no-watch | Actual frontend documents execute through source/storage/archive | Running | evidence/api-graphql-initial.txt | Diagnose any failure before attribution |
| 4 | E-002 | Checkpoint | Initial suite | Collect/run | 0 tests, missing graphql-tag from Nuxt alias; API harness correction, not product failure | evidence/api-graphql-initial.txt | Rerun corrected harness |
| 5 | E-002 | Completed | Corrected GraphQL harness | Five integrated source cases pass | Pass, 1 file / 5 tests; real schema/files, mocked GitHub and deletion fault | evidence/api-graphql-ready.txt | affected regressions |
| 6 | E-007 | Started | Skills API/integration/catalog/package/bootstrap regression command in api-regression.txt | Preserved behaviors pass | Running | evidence/api-regression.txt | Inspect failing assertions against current approval |
| 7 | E-007 | Checkpoint | Broader regression | 297 tests pass | 295 pass / 2 fail in existing skill-name GraphQL fixture; API-owned fixture drift identified | evidence/api-regression.txt | Fix singleton/transport fixtures without weakening assertions |
| 8 | E-001-web | Completed | pnpm -C autobyteus-web test:nuxt components/skills stores/__tests__/skillStore.spec.ts stores/__tests__/skillSourcesStore.spec.ts --run | Existing renderer checks pass | Pass 6 files / 28 tests | evidence/api-web.txt | Broader product evidence still required |
| 9 | E-007 | Completed | vitest run tests/e2e/skills --no-watch after fixture updates | Preserve API assertions | Pass, 3 files / 19 tests; broader suite rerun pending | evidence/api-graphql-regression-ready.txt | Broader validation |
| 10 | E-003 | Started | Current built server, temp app-data, real public root/collection | HTTP import/check/reload/remove, restart retention | Setup | evidence/api-live-public.txt | Assert real responses and cleanup |
| 11 | E-008-Linux | Started | Owned --rm node:22-bookworm container, unprivileged native /tmp filesystem | Archive/link/permission/release checks pass | Running | evidence/api-linux-filesystem.txt | Windows remains separate |
| 12 | E-008-Linux | Completed | Linux unprivileged container probe | Archive/link/permission/release checks pass | Pass, 12 checks; cleanup true, --rm container | evidence/api-linux-filesystem.txt | Native Windows remains unproven |
| 13 | E-007 | Completed | Full 28-file affected regression rerun after fixture corrections | All current assertions pass | Pass, 297/297; no baseline unrelated suite claimed | evidence/api-regression-ready.txt | Public/product probes |
| 14 | E-003 | Completed | node evidence/probes/public-http.mjs import against iso-51956-8bc2 | Real public root and collection imports, equivalence, check, Reload | Pass; humanizer 1 skill at 225a6f39ac85f76ee48dbad772ea4abe4ed6c9d8; squirrelscan 2 skills at dcf16bf83a4267fcf6a913e89ab9209072b28a94 | evidence/api-live-public.txt; api-public-installed.json | UI and restart |
| 15 | E-006/UI | Started | node evidence/probes/desktop-sources.mjs | Duplicate/trust/cancel, Files socket open/close, managed remove/reimport | Running on owned packaged current-worktree app | evidence/api-desktop-sources.json | Record actual result, not update proof |
| 16 | UI-001 | Checkpoint | First desktop probe | Submit duplicate URL | Probe locator said Import, real localized label is Import repository; no submission occurred | evidence/api-desktop-sources-initial.* | Correct selector and rerun; API-owned harness issue |
| 17 | UI-001/UI-002 | Completed | Desktop rerun | Duplicate, trust guidance and removal cancel | Pass; real requests/DOM | evidence/api-desktop-sources-selector.json | Explorer case |
| 18 | UI-003 | Checkpoint | Desktop explorer probe | Visible SKILL.md and connected socket | Real socket CONNECTED; assertion accidentally selected hidden drag preview with same text | evidence/api-desktop-sources-selector.json | Scope selector to visible file text; no product finding |
| 19 | UI-001–004 / E-006 partial | Completed | Real packaged desktop probe after selector corrections | Duplicate/cancel/Files socket open-close/remove/reimport | Pass 4 journeys; socket closed=true with CONNECTED frame. No update-generation or model-run proof | evidence/api-desktop-sources.json; api-desktop-*.png | Restart |
| 20 | E-004-restart | Started | Capture current HTTP source snapshot, isolated-app restart iso-51956-8bc2 | Source identities/revisions/catalog persist across real process restart | Running | evidence/api-public-restart.txt | Compare exact snapshot |
| 21 | E-004-restart | Completed | isolated-app restart iso-51956-8bc2 + public-http.mjs restart | Exact source rows persist across owned process restart | Pass; PID 62964 → 19484, same private data/ports; registry snapshot matches | evidence/api-isolated-restart.json; api-public-restart.txt | Cleanup public copies |
| 22 | E-003-removal | Started | public-http.mjs remove | Only owned managed roots deleted | Running | evidence/api-public-remove.txt | Stop owned instance |
| 23 | E-003-removal | Completed | public-http.mjs remove | Managed copies removed via real API | Pass; both source IDs absent and roots deleted | evidence/api-public-remove.txt | Stop owned process |
| 24 | Cleanup | Completed | isolated-app stop iso-51956-8bc2; list; container --rm | Owned process/data/ports released | Pass, graceful, dataRootRemoved/controlPortReleased/serverPortReleased true; owned container absent; generated untracked SDK outputs removed after tracked-path check | evidence/api-isolated-stop.json; api-isolated-list-after.json | Preserve report and blocker |

## Historical round-1 reconciliation
- No cases/processes running. Last event 24, cleanup Pass. E-001/E-002/E-003/E-007 and described UI/restart/Linux subcases Pass; E-004/E-006 only partial; E-005 Not Tested; E-008 Windows Blocked.
- Reconciled into api-e2e-execution-coverage-report.md round 1 / API-REV-001 Blocked, 73.6%.
- Timing disclosures: prebuild setup ran before initial investigation write retry (python unavailable, retried python3) but no durable changes or assertion execution preceded investigation. E-003 terminal ledger row appended after initial UI inspection/probe launch; command logs retain actual chronology. No missing result inferred.
- Next: native Windows target from user, then outstanding integrated cases in canonical investigation/report; reuse case IDs.

## API-REV-002 execution plan — user scope correction (in progress)
User explicitly excludes native Windows testing and confirms this is a web-capable feature, not an Electron-shell feature. Windows and Electron-specific gates are **Out Of Scope**, not Blocked. Prior 73.6%/Blocked is historical, not the current execution status. No missing dependency currently prevents continued testing. No new product behavior requested; approved import/update/removal/current-reader guarantees remain.

Continue through ordinary Nuxt frontend + real built backend + fresh Chrome on owned free ports/disposable data, following the existing Projects real-stack probe setup. Do not use installed/user Electron. Preserve prior live public GitHub evidence; deterministic upstream revisions/failures will be controlled at outbound GitHub fetch in an owned backend process, not by mocking GraphQL or mutating public repositories. Add durable browser coverage for import/check/cancel/update/failure/retry/Reload/removal and real Files open/update/reopen/socket teardown. Add integrated current-adapter bootstrap/source-update coverage with only external provider calls controlled where necessary; no paid/live model requirement for skill installation. Keep source safety/failure integrity and existing collision assertions; no all-platform or full-suite claim.

Planned round-2 cases: E-006-web (real UI/API update and file freshness, owned browser/server), E-004-web (failed update preserves prior install, retry and removal), E-005-integrated (real source/current adapter preparation for later run; assess remaining browser new-chat evidence honestly), E-007-rerun (affected regression after durable changes). Record each attempt immediately; no final result/confidence until execution finishes. No external blocker at plan time.

- WEB-001-import-explorer: Pass; /Users/normy/autobyteus_org/autobyteus-worktrees/github-skill-sources/tickets/in-progress/github-skill-sources/evidence/web-r2-initial/result.json

- WEB-002-check-cancel: Pass; /Users/normy/autobyteus_org/autobyteus-worktrees/github-skill-sources/tickets/in-progress/github-skill-sources/evidence/web-r2-initial/result.json

- WEB-003-failed-update-retains-install: Pass; /Users/normy/autobyteus_org/autobyteus-worktrees/github-skill-sources/tickets/in-progress/github-skill-sources/evidence/web-r2-initial/result.json

- WEB-004-retry-update-and-reopen: Pass; /Users/normy/autobyteus_org/autobyteus-worktrees/github-skill-sources/tickets/in-progress/github-skill-sources/evidence/web-r2-initial/result.json

- WEB-005-reload-restart-remove: Pass; /Users/normy/autobyteus_org/autobyteus-worktrees/github-skill-sources/tickets/in-progress/github-skill-sources/evidence/web-r2-initial/result.json

- WEB-001-import-explorer: Pass; /Users/normy/autobyteus_org/autobyteus-worktrees/github-skill-sources/tickets/in-progress/github-skill-sources/evidence/web-r2-chat/result.json

- WEB-CHAT-A: Pass; /Users/normy/autobyteus_org/autobyteus-worktrees/github-skill-sources/tickets/in-progress/github-skill-sources/evidence/web-r2-chat/result.json

- WEB-002-check-cancel: Pass; /Users/normy/autobyteus_org/autobyteus-worktrees/github-skill-sources/tickets/in-progress/github-skill-sources/evidence/web-r2-chat/result.json

- WEB-003-failed-update-retains-install: Pass; /Users/normy/autobyteus_org/autobyteus-worktrees/github-skill-sources/tickets/in-progress/github-skill-sources/evidence/web-r2-chat/result.json

- WEB-004-retry-update-and-reopen: Pass; /Users/normy/autobyteus_org/autobyteus-worktrees/github-skill-sources/tickets/in-progress/github-skill-sources/evidence/web-r2-chat/result.json

- WEB-CHAT-B-header-plus-after-update: Pass; /Users/normy/autobyteus_org/autobyteus-worktrees/github-skill-sources/tickets/in-progress/github-skill-sources/evidence/web-r2-chat/result.json

- WEB-005-reload-restart-remove: Pass; /Users/normy/autobyteus_org/autobyteus-worktrees/github-skill-sources/tickets/in-progress/github-skill-sources/evidence/web-r2-chat/result.json

- WEB-001-import-explorer: Pass; /Users/normy/autobyteus_org/autobyteus-worktrees/github-skill-sources/tickets/in-progress/github-skill-sources/evidence/web-r2-complete/result.json

- WEB-CHAT-A: Pass; /Users/normy/autobyteus_org/autobyteus-worktrees/github-skill-sources/tickets/in-progress/github-skill-sources/evidence/web-r2-complete/result.json

- WEB-002-check-cancel: Pass; /Users/normy/autobyteus_org/autobyteus-worktrees/github-skill-sources/tickets/in-progress/github-skill-sources/evidence/web-r2-complete/result.json

- WEB-003-failed-update-retains-install: Pass; /Users/normy/autobyteus_org/autobyteus-worktrees/github-skill-sources/tickets/in-progress/github-skill-sources/evidence/web-r2-complete/result.json

- WEB-004-retry-update-and-reopen: Pass; /Users/normy/autobyteus_org/autobyteus-worktrees/github-skill-sources/tickets/in-progress/github-skill-sources/evidence/web-r2-complete/result.json

- WEB-CHAT-B-header-plus-after-update: Pass; /Users/normy/autobyteus_org/autobyteus-worktrees/github-skill-sources/tickets/in-progress/github-skill-sources/evidence/web-r2-complete/result.json

- WEB-INTERRUPT-download-restart: Pass; /Users/normy/autobyteus_org/autobyteus-worktrees/github-skill-sources/tickets/in-progress/github-skill-sources/evidence/web-r2-complete/result.json

- WEB-005-reload-restart-remove: Pass; /Users/normy/autobyteus_org/autobyteus-worktrees/github-skill-sources/tickets/in-progress/github-skill-sources/evidence/web-r2-complete/result.json

- E-005-integrated: Pass, actual GraphQL source import/update followed by Codex/Claude bootstrap or Grok ACP factory, real profile-owned links and provider-surrogate process for Grok; 24 combinations (three adapters × two scopes × old-tree retained/deleted × both release orders), plus five source cases = 29/29. Evidence: evidence/api-r2-adapters-initial.txt.
- Round-2 post-repository decision: broader validation Required; 24 adapter cases substantially close preparation gaps, web source/update/chat evidence already passes; finishing interrupted-download and real permission-denied removal/restart/retry. No Windows/Electron gates.

- E-007-rerun server: command exit 0; evidence/api-r2-regression.txt (counts reconciled in report).

- E-001-web-rerun: command exit 0; evidence/api-r2-web-unit.txt.

- WEB-001-import-explorer: Pass; /Users/normy/autobyteus_org/autobyteus-worktrees/github-skill-sources/tickets/in-progress/github-skill-sources/evidence/web-r2-final/result.json

- WEB-CHAT-A: Pass; /Users/normy/autobyteus_org/autobyteus-worktrees/github-skill-sources/tickets/in-progress/github-skill-sources/evidence/web-r2-final/result.json

- WEB-002-check-cancel: Pass; /Users/normy/autobyteus_org/autobyteus-worktrees/github-skill-sources/tickets/in-progress/github-skill-sources/evidence/web-r2-final/result.json

- WEB-003-failed-update-retains-install: Pass; /Users/normy/autobyteus_org/autobyteus-worktrees/github-skill-sources/tickets/in-progress/github-skill-sources/evidence/web-r2-final/result.json

- WEB-004-retry-update-and-reopen: Pass; /Users/normy/autobyteus_org/autobyteus-worktrees/github-skill-sources/tickets/in-progress/github-skill-sources/evidence/web-r2-final/result.json

- WEB-CHAT-B-header-plus-after-update: Pass; /Users/normy/autobyteus_org/autobyteus-worktrees/github-skill-sources/tickets/in-progress/github-skill-sources/evidence/web-r2-final/result.json

- WEB-INTERRUPT-download-restart: Pass; /Users/normy/autobyteus_org/autobyteus-worktrees/github-skill-sources/tickets/in-progress/github-skill-sources/evidence/web-r2-final/result.json

- WEB-005-reload-restart-remove: Pass; /Users/normy/autobyteus_org/autobyteus-worktrees/github-skill-sources/tickets/in-progress/github-skill-sources/evidence/web-r2-final/result.json

## API-REV-002 final reconciliation
- E-001/E-002/E-005-integrated/E-007: affected 28files321tests Pass; E-001-web6files28tests Pass. Counts include the29 GraphQL cases and are not additive.
- E-004/E-005/E-006: web-r2-final8cases Pass, no page errors, current Files/socket/new-chat and real failure/restart checks complete. Earlier5/7/8case attempts retained.
- E-008 Windows: **Out Of Scope per explicit user correction**, supersedes old Blocked status. Electron-specific testing also not a gate. Prior Linux/public/packaged evidence remains supplementary.
- Cleanup: Chrome closed; all owned children stopped; frontend60317/backend60316 ports released; private data removed. No case/process running.
- Canonical execution report API-REV-002 **Pass/95%**. No remaining testing blocker. Proportional test-code review next, not delivery approval.
