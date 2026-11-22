# Docs Sync Report: autobyteus-579 (small follow-ups: the file viewer's refusals, busy-host test limits, TESTING.md's Claude home)

## Scope

- Ticket: `small-follow-ups-579` (Project Task `autobyteus-579`: the small follow-ups of autobyteus-576, 583 and 599, merged into one ticket)
- Trigger: API/E2E `API-REV-001` `Pass` (final confidence 95.0%), direct route (`task_size` Medium, `architectural_risk` Low; architecture review, source review and test-code review `Not Applicable`). One criterion, AC-003, is accepted as unverified risk by the Solution Designer's evidence decision `DEC-004`.
- Bootstrap base reference: `origin/personal` @ `f2c0d2a902`
- Integrated base reference used for docs sync: `origin/personal` @ `f2c0d2a902`: the branch is already current (its base is the tip of `origin/personal` and an ancestor of `HEAD`), so no merge was needed. The Solution Designer's uncommitted `DEC-004` records were committed first as the checkpoint `a107a3c2d1`.
- Post-integration verification reference: none needed for the base (see `release-deployment-report.md`); delivery ran one check TESTING.md names for the `autobyteus-web/demo/**` change that the evidence did not contain (`evidence/DEL-02`, `DEL-03`).

## Why Docs Were Updated

- Summary: `fileContent` now answers every refusal (a missing file, a path outside the workspace, a link not opened, no permission, an unexpected read error) as a GraphQL error with a code in `extensions.code`, never as text. Before, the refusal travelled as the string `{"error":"…"}`, so the viewer showed that JSON as the file's text. A file whose own text is `{"error":…}` is now a file like any other. The web store already showed a query error as the viewer's error state, so nothing parses the old string any more. The other five items are test and documentation work: file-event waits fail with the `ENVIRONMENT:` or `INCONCLUSIVE:` label through one shared probe, eight busy-host files got the limit or wait their measured cause calls for, the Claude turn-race test waits on what it asserts, two cleanups wait for their writers to exit, and `TESTING.md` documents the test-owned Claude home. Delivery read each long-lived doc that describes `fileContent`, the file viewer's states, the busy-host rules or the CLI test homes against the final code.
- Why this should live in long-lived project docs: a maintainer of the file explorer who reads the module doc would not know that a refusal is an error and not text, and would parse JSON again; and the web doc described `fetchFileContent` as "loads text file" with no word on what a refusal does.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `DESIGN.md` | Project design rules | No change | No rule added or changed. The error form follows the existing split (`fileContent` returns raw text, `folderChildren` always JSON), and web and server ship in one release (rule 9, as DEC-001 says) |
| `TESTING.md` | Project testing guideline | Updated by API/E2E (its document); checked; proposal | API/E2E added the "Claude Code" and "A recorder in front of a CLI" entries to "Test-only runtime CLI settings" (REQ-007, DEC-003). Delivery checked them against the code: `CLAUDE_AGENT_SDK_AUTH_MODE` (`claude-sdk-spawn-environment.ts`), `capturedTestVaultSetting()` (`test-support/test-vault/test-vault-selection.ts`), `initializeLiveServerVault` (`live-server-vault.ts`), and that `CLAUDE_CODE_EXECUTABLE_PATH` alone is probed with `--version` for exit 0 within 3 s (`claude-sdk-executable-path.ts`, `spawnSync … timeout: 3_000`); `CODEX_APP_SERVER_COMMAND` and `GROK_BUILD_COMMAND` exist in the runtime-management sources. One pointer is missing, not delivery's document: the "File watching on a busy Mac" rule does not name the shared probe or the shared server-load limit this ticket added (`follow-ups.md` FU-004). No command stopped working |
| `RELEASE.md` | Project release guide | No change | No release step, check or workflow changed, and no build input changed (no lockfile, `package.json`, `tsconfig`, script, workflow, contract package or generated file in the diff), so the fresh-start build rule does not apply. A finding about tracked build output is recorded as FU-003 |
| `autobyteus-server-ts/docs/modules/file_explorer.md` | Lists `fileContent` among the snapshot operations and states the boundary expectations | Updated | See Docs Updated |
| `autobyteus-web/docs/file_explorer.md` | Describes the store's `fetchFileContent` and the viewer | Updated | See Docs Updated |
| `autobyteus-web/docs/content_rendering.md`, `autobyteus-web/docs/remote_access.md`, `autobyteus-server-ts/docs/features/remote_access.md` | Describe the viewer and the REST content routes | No change | They describe renderers and the REST routes' own answers (403 and 404 with codes), which this ticket did not change; the GraphQL `fileContent` is not the REST route |
| `GLOSSARY.md`, `autobyteus-ios/README.md` | The demo node and file terms | No change | No term changed; the demo node's two handler edits keep its operation list (the operation-coverage check passes, `evidence/DEL-02`) |
| The test helpers' own comments (`os-file-event-probe.ts`, `os-latency-under-load.ts`) | The measurements and the rule they implement | No change | `SERVER_UNDER_FSEVENTS_LOAD_TEST_TIMEOUT_MS` is documented in its comment with its measurements (IMP-08); the probe's header names the two labels |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/file_explorer.md` | Reference | A boundary bullet: `fileContent` answers the file's exact text, so a refusal is a GraphQL error whose `extensions.code` is one of `WORKSPACE_NOT_FOUND`, `FILE_NOT_FOUND`, `WORKSPACE_ACCESS_REFUSED`, `FILE_PERMISSION_DENIED`, the workspace's own access codes such as `WORKSPACE_LINK_NOT_OPENED`, or `FILE_READ_FAILED` (generic message, cause logged); a file whose own text is `{"error":…}` is a file like any other; `folderChildren` still answers its refusals as JSON | The doc said nothing of how `fileContent` refuses; the codes are the ones `fileContentRefusal` throws (`file-explorer.ts`) |
| `autobyteus-web/docs/file_explorer.md` | Reference | The `fetchFileContent` row says a refusal (a GraphQL error) becomes the file's `error`; a paragraph says what the viewer shows (the red `role="alert"` error state, "Error!" and the node's message; an unsaved draft stays visible as before), that a file whose own text is `{"error":…}` opens as text, and that the two fire-and-forget reads (the open path and `invalidateFileContent`) swallow the rejection because the refusal is already the file's error state | The doc said only "loads text file via GraphQL" |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| An in-band error marker cannot be told apart from content | `fileContent` returns raw text, so a refusal inside the text would break a file whose text looks like the marker; the refusal is a typed GraphQL error and the web needs no parsing | `requirements-doc.md` REQ-001, REQ-002, DEC-001 | `file_explorer.md` (server and web) |
| A test limit follows its measured cause | A busy-host failure is classified by measurement (OS latency, the test's own fixed waits, product slowness); the limit or wait is then set by the cause, and a product-slowness cause becomes a follow-up with its numbers | `requirements-doc.md` DEC-002; `implementation-handoff.md` I-2 table | `TESTING.md` rule 9 and "File watching on a busy Mac" already say it; no new rule. The numbers stay in the ticket |
| How a Claude test gets its own home | A throwaway `HOME` and `CLAUDE_CONFIG_DIR`, api-key mode with the test vault, and a recorder that answers `--version` | `requirements-doc.md` REQ-007 | `TESTING.md` (written by API/E2E) |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `fileContent`'s `jsonError(...)` refusals and the matching "parse the JSON string" in the demo and in tests | `fileContentRefusal` (a `GraphQLError` with `extensions.code`) | `file_explorer.md` (server) |
| The watcher integration test's own raw-watch probe and labels | `tests/helpers/os-file-event-probe.ts`, shared by the watcher integration test, the live-refresh E2E and the chokidar runtime test | the helper's header; FU-004 proposes a pointer in `TESTING.md` |
| `settle()` (a fixed flush budget) in `claude-provider-turn-race.test.ts`; two 500 ms sleeps that stood in for a writer wait | Condition waits on what each step asserts; `stopFakeRuntimeProcesses` and `stopAndAwaitExit` | the tests (code only) |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

Not used: two long-lived docs changed in delivery, and `TESTING.md` in API/E2E's stage.

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary, release notes, verification record, archive, finalization (`release-deployment-report.md`)
- Notes: follow-ups FU-001 (a built server's slow graceful stop on a busy Mac, the implementation's) and FU-002 (the packaged event-monitor probe is broken on the base, API/E2E's) were in `follow-ups.md`; delivery added FU-003 (the tracked `dist/` of the team stream contracts is stale) and FU-004 (a pointer in `TESTING.md`). The Solution Designer sends them.
