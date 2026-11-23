# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-001`
- Approved requirements baseline: `requirements-doc.md` at SR-001, approved within the direction; the founder was informed on 2026-11-22.
- User approval of the design: `Not required`
- Design status: `Ready`
- Canonical investigation notes: `investigation-notes.md` (same folder)
- Authorities read (read in this conversation): `references/architecture-design.md`, `references/design-principles.md`, `DESIGN.md`, `TESTING.md`
- Conflicts: none

## Current-State Read

**I-1.** The `fileContent` resolver encodes refusals as a JSON string inside the content field (`file-explorer.ts:46-74`). The web shows that string as text, because a raw-text answer cannot carry an in-band error safely (REQ-002).

**I-2 … I-6.** Test-side only:

| Item | Current state |
| --- | --- |
| I-2 | Default limits on tests whose time cause is unmeasured |
| I-3 | Plain time-out messages |
| I-4 | A fixed settle budget |
| I-5 | Folder removal before the writers exit |
| I-6 | A missing TESTING.md entry |

Evidence for all of these is in the investigation notes.

## Task Size And Architectural Risk (Mandatory)

- **Task size:** `Medium`. One product fix spans the server resolver, the web store or demo, and their tests. Test fixes touch about 12 test files and one new test helper, plus a TESTING.md entry.
- **Architectural risk:** `Low`. The `fileContent` error path changes from an in-band string to a GraphQL error. Web and server ship together (DESIGN.md rule 9), and the web already handles query errors (`fileExplorerContentActions.ts:373, 378-381`). There is no persistence, security, concurrency or ownership change. Test changes do not alter product behavior.
- **Escalation trigger:** if an I-2 measurement shows a product slowness that needs a product change, that becomes a follow-up, not part of this ticket. If `fileContent` turns out to have another reader, return a `Design Impact`.

## Intended Change

| Item | Change |
| --- | --- |
| I-1 | `fileContent` refusals become GraphQL errors |
| I-2 | Each test's limit follows its measured cause |
| I-3 | One shared probe helper labels file-event time-outs |
| I-4 | Condition waits |
| I-5 | Wait for the writers, then remove |
| I-6 | TESTING.md entry (API/E2E) |

## Change Scope (Mandatory)

- **In scope:** UC-001…003.
  - **The resolver:** `fileContent` only.
  - **The web store and demo:** reading the new error form.
  - **Tests:** the listed test files and one new helper.
  - **TESTING.md:** one entry.
- **Derived consumers of `fileContent`:**

  | Consumer | Decision |
  | --- | --- |
  | Web store | No code change needed for errors (it already shows `errors`); keep `data.fileContent` as exact text |
  | Web demo `GetFileContent` | Answer a missing workspace as an error, in the demo framework's error form, instead of the JSON string |
  | Server tests at `file-operations-graphql.e2e.test.ts:178`, `file-explorer-path-boundary.e2e.test.ts:211-213`, `semantic-memory-workspace-access.test.ts:83-84` | Assert the GraphQL error (message and code) instead of parsing JSON |

- **Deliberately left alone:**
  - `folderChildren`, `searchFiles`, `writeFileContent`;
  - product timing;
  - host settings.
- **Follow-ups:** none yet. I-2 may produce one, per DEC-002 (iii).

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior | REQ / AC | Path | Change |
| --- | --- | --- | --- |
| BEH-001 | REQ-001, REQ-002; AC-001, AC-002 | DS-001: Files tab or link → `fetchFileContent` → GraphQL `fileContent` → resolver → file explorer → text, or a GraphQL error → `file.error` → `FileExplorerTabs` error state | The resolver throws `GraphQLError(message, { extensions: { code } })` for every refusal |
| BEH-002…006 | REQ-003…007 | Test code and TESTING.md | As below |

## Task Design Health Assessment (Mandatory)

- **Change posture:** `Bug Fix` (I-1) plus `Cleanup` (tests and docs).
- **Current design issue found:** `Yes`, in I-1: an in-band error marker in a raw-text answer.
- **Structural triggers:**
  - **Repeated coordination** fires for the I-3 probe, which is needed in three test files. Response: extract one shared helper (below).
  - **Several kinds or forms** fires for I-1: missing file, outside the workspace, access refused, a semantic-memory refusal, a missing workspace, and an unexpected error. All throw the same way.
  - Other triggers: none fire.
- **Deliberate deviations:** none.
- **Root cause classification:** I-1 is `Shared Structure Looseness`: one field carries two meanings (content or error). I-2…5 are test defects.
- **Refactor needed now:** `No`, beyond the extraction of the probe helper.

## Data-Flow Spine Inventory

| Spine ID | Scope | Start | End | Owner |
| --- | --- | --- | --- | --- |
| DS-001 | Primary | Open a file in the Files tab | Content shown, or the error state | `FileExplorerResolver.fileContent` (server), `fetchFileContent` (web) |

## Removal / Decommission Plan (Mandatory)

| Item | Why | Replaced By |
| --- | --- | --- |
| `jsonError` uses in `fileContent` | One field with two meanings | `GraphQLError` with `extensions.code`. Keep `jsonError` for `folderChildren` if it still uses it; remove the helper if no caller is left. |
| The demo's `WORKSPACE_NOT_FOUND` JSON for `GetFileContent` | Same | The demo's error form |
| `settle()` in the race test | A fixed budget | Condition waits |
| The duplicated probe in `file-system-watcher.integration.test.ts:30-57` | Moved into the shared helper | `tests/helpers/os-file-event-probe.ts` |

## Interface Boundary Mapping

| Interface | Responsibility | Notes |
| --- | --- | --- |
| `fileContent(workspaceId, filePath): String` | Exact text or a GraphQL error | Error codes in `extensions.code`, for example `WORKSPACE_NOT_FOUND`, `FILE_NOT_FOUND`, `WORKSPACE_ACCESS_REFUSED`, `FILE_READ_FAILED`. The semantic-memory refusal keeps its own code (`WORKSPACE_LINK_NOT_OPENED` and so on), already the start of its message. The message stays the plain text shown today. |
| `tests/helpers/os-file-event-probe.ts`: `labelFileEventTimeout(dir, error): Promise<Error>` (name at implementation's choice) | After a file-event wait times out: write a sentinel into `dir` watched by a fresh `fs.watch` for 10 s. Return an Error that starts with the TESTING.md `ENVIRONMENT:` text when no event came, or the `INCONCLUSIVE:` text when one came, and carries the original wait message. | It owns the label texts now in the integration test (`:52, :57`). That test uses the helper, so its messages stay as they are. |

## Final File Responsibility Mapping

| File | Change |
| --- | --- |
| `autobyteus-server-ts/src/api/graphql/types/file-explorer.ts` | `fileContent` throws `GraphQLError` for every refusal and for unexpected errors (logged, as today, with a generic message) |
| `autobyteus-web/demo/graphql/files.ts` | The error form for a missing workspace |
| `autobyteus-web/stores/fileExplorerContentActions.ts` | No error parsing added. Keep showing the query error. Add a unit test for AC-001 and AC-002 (a file whose text is `{"error":"x"}`). |
| Server tests listed in Change Scope | Assert the GraphQL error |
| `autobyteus-server-ts/tests/helpers/os-file-event-probe.ts` | New: the shared probe and labels (I-3) |
| `tests/integration/file-explorer/file-system-watcher.integration.test.ts` | Use the helper |
| `tests/e2e/agent-definitions/agent-package-definitions-live-refresh.e2e.test.ts` | `waitFor` calls the helper on time-out for the folder each test watches (DCF-E2E-002, -003, and every other file-event `waitFor` there). `osFileEvents` for DCF-E2E-007 stays. |
| `tests/unit/file-explorer/watcher/chokidar-watcher-runtime-links.test.ts` | The `ready` and `notes.md` waits throw the labeled error from the helper instead of `expect(false).toBe(true)`. The quiet window for `secret.md` stays. |
| `tests/unit/agent-execution/backends/claude/claude-provider-turn-race.test.ts` | Replace `settle()` with waits on what each step asserts. After the post: the fake has `sent.length >= 1`. After each emit: the delivered texts reached the expected list. `statusMidTurn` is read once the second turn's first text is delivered. At the end: the status is `idle` and the recorded texts are complete. Use `vi.waitFor` or the file's own poll with a bounded limit. |
| `tests/e2e/runtime/agent-runtimes-graphql.e2e.test.ts` and `tests/e2e/helpers/agent-runtimes-e2e-harness.ts` | Find the writers (rule 9): the scripted CLI processes the server started. Before removing the state folder, `dispose` waits until they have exited and stops any that remain, for example through PIDs the fake CLI records in its state folder. A retrying `rm` alone is not the fix. |
| `tests/e2e/agent-team-runs/team-run-config-graphql.e2e.test.ts` | After `SIGKILL`, await the child's `exit` before `removeOwnedTestRuntime`, and the same after a `stop()` that did not confirm the exit |
| I-2 files (eight) | Per DEC-002, after measuring each test's phases on the busy host. The cause and numbers per test go in the implementation handoff. |
| `TESTING.md` | I-6 entry under "Test-only runtime CLI settings", by the API/E2E engineer (DEC-003) |

## Concrete Examples / Shape Guidance

| Topic | Good | Avoided |
| --- | --- | --- |
| I-1 | `throw new GraphQLError("File not found: notes.md", { extensions: { code: "FILE_NOT_FOUND" } })` | Web code that parses the text for `{"error"`, or a text answer starting with `{"error"` |
| I-2 | "server start 6.1 s of which watcher close 4.8 s (OS) → `IN_PROCESS_SERVER_HOOK_TIMEOUT_MS`" | `{ timeout: 30_000 }` with no cause |
| I-5 | `child.kill("SIGKILL"); await once(child, "exit"); await removeOwnedTestRuntime(…)` | `rmSync(…, { maxRetries })` alone |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Decision |
| --- | --- |
| Keep the JSON error string and also throw | Rejected (DESIGN.md rule 9; one meaning per field) |

## Change / Refactor Sequence

1. I-1: the server, the demo, the tests, and a web unit test.
2. I-3: the helper and its three users, plus a negative control that the label appears when the probe sees no event.
3. I-4.
4. I-5.
5. I-2: measure, classify and apply.
6. A whole server unit and E2E run on the host, recorded.

## Risks

- **RSK-001:** host load varies, so classify by measured phases.

## Guidance For Implementation

- Follow TESTING.md: one heavy run at a time; rule 9 for every failure.
- For I-2, record per test: total time, server start and close, each request, and any watcher time, on the busy host. A cause of type (iii) becomes a follow-up row in `follow-ups.md`.
- Use synthetic data only.
