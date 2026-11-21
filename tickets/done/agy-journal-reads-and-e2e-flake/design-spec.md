# Design Spec — agy-journal-reads-and-e2e-flake

## Solution And Approval Basis
- Revision `SR-001`; requirements approved by the Solution Designer within the direction (user informed). User approval of the design: `Not required`. Status: `Ready`.
- Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-journal-reads-and-e2e-flake/tickets/in-progress/agy-journal-reads-and-e2e-flake/investigation-notes.md` (F-01…F-13). Authorities read: skill references, `DESIGN.md` (rules 4, 5, 6, 7, 11, 12; rule 12 does not apply: no build input changes), `TESTING.md` (Rule 9, "File watching on a busy Mac").

## Current-State Read
- Journal: the Antigravity translation (`rendering/runtimes/antigravity-translation.ts`) has a table of built-in converters (`view_file` → a converted `cat` line through `convertedCommandLine`), a result normalizer (`normalizeAgyResult`: only `<truncated N lines>`) and Claude's translation already turns its saved-output text into a neutral marker (F-02, F-06).
- Tests: `startStudioE2eRuntimeServer` is the one in-process start path (119 files use it); the project owns `IN_PROCESS_SERVER_HOOK_TIMEOUT_MS` (60 s) but only 7 files use it (F-11).
- Discovery: `AgyAgentRunBackendFactory.assertAvailable` calls `listAntigravityModels()` at every run start (usual bounds, no step deadline); `armProbeTimeBound` (576) already defers a timeout decision for an exited child.

## Task Size And Architectural Risk
- Task size: `Medium` (three items: two translation rules, a constant, a helper line, a sweep-free hook rule, a deterministic reproduction with a conditional fix, tests, docs). Risk: `Low` (derived journal text; test helper; an isolated probe helper if D-6 branch A is taken).
- Escalation trigger: D-6 branch A needs a production change beyond `probe-time-bound.ts`'s decision logic, or the reproduction shows a second owner of the stall (then back to me; architecture review if production behavior changes).

## Intended Change

### D-1 `read_file` (FU-1)
In `antigravity-translation.ts` the `viewFile` converter becomes `readFile` and reads the path as `AbsolutePath ?? Path` (both through `asText`), the range from `StartLine`/`EndLine` and the byte offset from `ContentOffset` as today; the table registers it under `"view_file"` and `"read_file"`. The skill-load rule and the 560 omission already work on both names (the omission's predicate handles `read_file`).

### D-2 Long outputs (FU-2)
In the same file `normalizeAgyResult`'s `normalizeText` also applies `SPILLED_OUTPUT`, anchored at the start of the text after the envelope is removed and line endings are normalized:
`/^The tool's output was truncated due to being too long\. You can find the full output in a file at file:\/\/([^\n]+)\n+Here is a preview with the middle of the output truncated:\n?([\s\S]*)$/`
→ `<preview with trailing whitespace trimmed>\n…[full output was saved outside the raw trace: <path>]` (the same words as Claude's marker, without a size, which Antigravity does not give). It applies to result text and error text (the normalizer's `clean`). A wording that does not match, a nested JSON-escaped form and any other result stay unchanged. The later read of the file is an ordinary read (D-1): nothing is hidden or linked (DEC-1).

### D-3 Renderer revision
`WORK_JOURNAL_RENDERER_REVISION` 3 → 4 (`domain/work-journal-models.ts`); the comment is unchanged. Re-render and re-index cost: the files of Antigravity runs with `read_file` lines or the spill sentence (counts in the requirements: 46 files hold the sentence on the founder's node); other files are rendered again and found unchanged (not rewritten).

### D-4 The hook timeout has one owner (FU-3 a)
`tests/e2e/helpers/studio-runtime-test-server.ts` imports `vi` from vitest and `IN_PROCESS_SERVER_HOOK_TIMEOUT_MS` from `tests/helpers/os-latency-under-load.ts` and calls `vi.setConfig({ hookTimeout: IN_PROCESS_SERVER_HOOK_TIMEOUT_MS })` at module load: every file that imports the helper (every in-process-server file) registers its hooks with 60 s (F-12). Its doc comment says why (F-08…F-10) and that tests that prove something does *not* happen keep their own short windows. `os-latency-under-load.ts`'s comment names the helper as the owner. The 7 files that already pass the constant explicitly are left alone (harmless; same value). TESTING.md's sentence ("a test that … starts or closes such a server takes … its vitest timeouts from …") gets the owner named: **the API/E2E engineer edits TESTING.md in this ticket** (it owns that document), saying the helper sets the hook timeout for the file and that only waits and per-test timeouts still come from the constants.

### D-5 Nothing else for hooks
No global `hookTimeout` in `vitest.config.ts`; no per-file edits; the architecture test `e2e-node-credential-paths.test.ts` already keeps `startStudioE2eRuntimeServer` the one start path, so the owner cannot be bypassed.

### D-6 Discovery timeouts (FU-3 b): reproduce first, then the cause decides
1. **Reproduce deterministically** (AC-009) in the in-process E2E server with the scripted CLI: after the start message is sent, stall the test process's main thread for N seconds (`Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, N * 1000)` from a `setTimeout` in the test), N = 5, 9, 12; capture the `RUNTIME_PROBE_TIMED_OUT { runtime, command, boundMs }` console line and the run's error. The existing probe records which command and bound fired.
2. **Branch A** (a stall makes a child that already answered report `AGY_MODEL_DISCOVERY_TIMEOUT`): the defect is in the probe's decision (`runtime-management/probe-time-bound.ts` and the command's `close` handling): after a stall, results that are already available (exit and stdout) must win over the timer. Fix there, with a unit test of the probe under a stalled loop (AC-010), failing before and passing after. This is a production change of an isolated helper: report it as such.
3. **Branch B** (the stall does not make a false timeout): the discovery failures were not this mechanism (U-1 stays open). Then do **not** add a retry or raise a bound. Make the next occurrence self-explaining: the E2E helpers that print an `AgyDiscoveryError` also print the captured `RUNTIME_PROBE_TIMED_OUT` line (the command and bound); record the result in the implementation handoff and keep a follow-up open for the first recurrence with that line. State plainly that the hook timeout is fixed and the discovery timeout's cause is not established.

## Change Scope (Mandatory)
- In scope: UC-001, UC-002: `rendering/runtimes/antigravity-translation.ts`, `domain/work-journal-models.ts`, `tests/e2e/helpers/studio-runtime-test-server.ts`, `tests/helpers/os-latency-under-load.ts` (comment), `TESTING.md` (by the API/E2E engineer), `autobyteus-server-ts/docs/modules/agent_work_journal.md` (rules and revision), the tests; D-6 branch A: `runtime-management/probe-time-bound.ts` and its tests.
- Derived consumers: the journal readers, chunker, memory search (fewer words in some entries; the fingerprint includes the revision, so the catch-up is automatic: 560 F-07).
- Deliberately left alone: the 560 omission and its path rule; `toolCallLine`; other runtimes; spill-read lines; Antigravity wrapper lines and the `grep_search` result-file shape (follow-ups); probe bounds; vitest defaults for other files; the machine.
- Follow-ups: `follow-ups.md` FU-1 (wrapper lines), FU-2 (the `grep_search` shape), FU-3 (only if D-6 branch B: a recurrence with the probe line).

## Relevant Behavior And Production-Path Map
BEH-001/002/003: raw-trace file → `WorkJournalService.reconcile` → `WorkJournalFileRenderer.render` → `toolCallLine` → ★ Antigravity table (`readFile`) / `normalizeAgyResult` (spilled output) → journal text. BEH-004: test file imports → ★ helper's `vi.setConfig` → hooks registered with 60 s → `startStudioE2eRuntimeServer` / `app.close()`. BEH-005: run start → `assertAvailable` → `listAntigravityModels` → `runCommand` → ★ `armProbeTimeBound`.

## Task Design Health Assessment (Mandatory)
- Posture: `Behavior Change` (journal) and `Bug Fix` (test reliability). Current design issue: `Yes` for FU-3: a project rule with one explicit constant that each file must remember (115 files do not): Duplicated Policy / Missing Owner. Resolved by D-4: the owner is the start helper. For the journal: no issue (the runtime table is the designed home; one missing converter and one missing runtime-text rule).
- Alternatives rejected: DEC-1 (b)–(d), DEC-3 (a), (b), DEC-4 (a), (b).
- Refactor needed now: `Yes`, minimal: `viewFile` becomes `readFile` for two names; the helper gains one line.

## Legacy Removal Policy / Persisted Data
No legacy path kept. Persisted data: derived journals, `Discard or Rebuild` as in 331 and 560 (the revision bump); no migration; raw traces untouched.

## Ownership, Dependency Rules, Interfaces
Owner of Antigravity's read and runtime-text rules: the Antigravity translation. Owner of the in-process server's hook timeout: `startStudioE2eRuntimeServer`'s module. No new interface. Test helpers import vitest; production code does not.

## Backward-Compatibility Rejection Log
None.

## Change / Refactor Sequence
1. Failing tests first (AC-001, 003, 007; the stall reproduction AC-009). 2. D-1, D-2, D-3. 3. D-4 and the docs. 4. D-6 branch. 5. Repeat runs (AC-008) at load.

## Key Tradeoffs
A 60 s hook bound delays the report of a genuinely hung hook in files that start a server (they already had the constant in 7 files). The marker drops the sentence the runtime wrote: the preview and the path are kept.

## Risks
(1) The regex mismatches another Antigravity wording: unchanged text (U-2), AC-004. (2) vitest changes `setConfig`'s timing: AC-007 guards it. (3) D-6 branch A grows: escalation trigger.

## Guidance For Implementation
- **Reproductions to start from** (all with synthetic data):
  - FU-1: a renderer test with `read_file {Path, StartLine, EndLine}` + a size-only DONE result; today the line is `Tool: read_file …`.
  - FU-2: a renderer test with the measured result text (the two sentences, a synthetic `file:///home/user/.gemini/antigravity-cli/brain/abc/.system_generated/steps/12/output.txt`, a short preview): today both sentences and the path are in the output.
  - FU-3 (a): `work-journal-agy-schema-reads-scripted-agy.e2e.test.ts` solo, repeated 6 times at load average ≥ 35: it failed 2 of 6 with a 10 s `afterAll` timeout before this change (`evidence/INV-01…`); the teardown timing recipe is `evidence/INV-02…` (a scratch copy with a timer around each `afterAll` step; do not commit it).
  - FU-3 (b): D-6 step 1.
  Fixtures: `tests/agent-work-journal/journal-record-fixtures.ts` (`RecordBuilder`, `render`); synthetic paths only; never copy a real record or path (the Task; TESTING.md).
- Tests (TESTING.md layers): renderer unit tests AC-001…005; a service test AC-006 (`tests/agent-work-journal/services`); AC-007 as a test of the helper's effect (assert the effective hook timeout through the runner's config rather than waiting 11 s, or a subprocess vitest run of a fixture with a 12 s hook; the implementation decides and says why); AC-008 as executed runs (report load and teardown times); AC-009/010 per D-6. Existing journal, memory-search, probe (`armProbeTimeBound`) and the 560 tests stay green.
- Do not run two heavy suites at once (TESTING.md). The machine is busy and swapping at the time of design: for AC-008 note load, `fseventsd` and swap in the report; do not stress it further.
- Do not edit TESTING.md yourself: the API/E2E engineer does (D-4). Do not touch raw traces or the user's data.
