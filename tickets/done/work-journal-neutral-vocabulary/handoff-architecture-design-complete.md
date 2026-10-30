# Handoff — Architecture Design Complete (autobyteus-331)

- Result: `Architecture Design Complete`
- Package identifier: `work-journal-neutral-vocabulary` (Project Task `autobyteus-331`, Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`)
- Current SR entry: `SR-002`
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), for the user
- Workspace: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/work-journal-neutral-vocabulary`, branch `codex/work-journal-neutral-vocabulary`, base `origin/personal` @ `a0a038967c` (fetched 2026-10-30; contains autobyteus-328). Finalization target: `origin/personal`, `--no-ff` merge per `RELEASE.md`. Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/work-journal-neutral-vocabulary/tickets/in-progress/work-journal-neutral-vocabulary/`.
- Approval state: requirements `Approved` (Solution Designer within the direction; the user delegated the wording decisions); design `Approved` by the user on 2026-10-30 ("Yeah, I like your recommendation. Let's go.").
- Classification: `task_size=Medium`, `architectural_risk=Low` (design-spec § Task Size And Architectural Risk). Route: direct implementation (Small/Medium with Low risk).

## Original request and goal

Make the Work Journal semantically neutral across the five runtimes: each line says what was done (load a skill, send a message to X, run JavaScript, open a page), not which runtime's tool did it, so an agent on another runtime or a person reads the same words for the same action. No migration: the journal is derived data; raising the renderer revision rebuilds it. Source of the behavior: `work-journal-neutral-vocabulary-contract.md` (tables per runtime and for the platform tools, rules, decisions N-1…N-9, complete synthetic traces with expected lines in §11).

## What to build (read design-spec.md first)

1. `rendering/tool-call-line.ts`: the one owner of the lookup chain (unwrap, qualified-name split, runtime table, platform table, generic); the renderer's `toolEntry` calls it (move the old lookup out).
2. `rendering/platform/`: platform converters (message, project-task, browser, media, discovery families, the registry, shared line parts), keyed by string literals (recorded names, current and history).
3. Runtime-only converters in the Claude, Codex, Antigravity and AutoByteus tables; `splitToolName` hook for Codex and Antigravity; Grok unchanged.
4. `rendering/skill-load.ts` plus the rule in `commandLine`; `loadSkillLine`.
5. Outcome `delivered`; `BodyPart.message`; `via` in the generic line.
6. Revision 1 to 2; `WorkJournalService.rendererRevision` and `ensureCurrent(target, {regenerate})`; the Journals step fingerprint includes the revision and Rebuild passes `regenerate`.
7. Tests (design-spec § Guidance For Implementation), the shadow render and its report (REQ-013), docs sync (REQ-014).

## Constraints

- Private journals: read-only, never copied out; fixtures are synthetic hand-built records (TESTING.md). The shadow render runs on an isolated copy of the memory, never on the user's data; the report holds counts and neutral snippets only.
- Follow `DESIGN.md` and `TESTING.md`. No flag, environment variable or second renderer for the old wording. No tool, runtime backend, run metadata or raw-trace change. Files under 500 lines.
- Environment (E-19): the main checkout's built workspace packages are older than this base; install dependencies normally in the worktree and prove from a clean clone; `pnpm test:unit` includes `tests/agent-work-journal`.
- Do not put "the user has verified" into any Done-when (Project Task Manager's instruction); the Done-when is the tests, the measured report and the merge.
- No release unless the user asks.

## Reproduction / fixtures to start from

`probes/build_examples.py` (spec of the synthetic traces, and `neutral()` = the expected "after" lines) and `probes/render-examples.probe.test.ts` (renders them with the real renderer; steps in contract §11). Port the traces to `tests/agent-work-journal/synthetic-run-traces.ts`.

## Open items and risks

- Re-index cost: regeneration and re-chunking at the first start after the update, embedding of 82% of the cards (6,159 of 7,509 files, 1.62 GB) at the first search or live update, estimated of the order of 50 minutes; to be measured (REQ-013).
- Search quality with the new words: re-run the memory-search evaluation's known-answer queries on the shadow render (U-2).
- Skill rule: report how many skill-file reads convert and sample the labels (U-3).
- Out of scope, recorded: FU-001 (226 local journals without a recorded runtime), FU-002 (Claude session tool exposure). Imported journals are copies rendered by their source node.

## Files

Attached to this handoff: this file, `requirements-doc.md`, `investigation-notes.md`, `solution-revision-record.md`, `design-spec.md`, `work-journal-neutral-vocabulary-contract.md`, `follow-ups.md`, `probes/build_examples.py`, `probes/render-examples.probe.test.ts`. Also in the folder: `journal-neutrality-analysis.md` (evidence).

## Route

Handoff rules applied (2026-10-30): `task_size=Medium`, `architectural_risk=Low` → the rule for Small/Medium with Low risk → `/software_engineering_team/implementation_engineer`; message delivered to run `implementation_engineer_1eb95bbd952944cfab8e6e84efebd4dc` with this file and the package attached. No independent architecture review (rule for Large/High not applicable).
