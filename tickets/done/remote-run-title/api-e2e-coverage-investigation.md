# API/E2E Coverage Investigation — autobyteus-269 (a remote run's title)

`…` = `/Users/normy/autobyteus_org/autobyteus-worktrees/remote-run-title/tickets/in-progress/remote-run-title`

## Investigation Meta

- Requirements: `…/requirements-doc.md` (Approved, SR-002), AC-601 … AC-605
- Design: `…/design-spec.md` (SR-003); investigation notes `…/investigation-notes.md`
- Implementation handoff: `…/implementation-handoff.md` (IR-001, code `05be574608`, docs `d08cd902a9`)
- Classification: `Small / Low`, direct route; a pass goes to delivery with `Not Required — direct low-risk route`
- Revision record: `…/api-e2e-revision-record.md`; `API-REV-001`; round 1
- Testing guideline: the worktree's `TESTING.md`

## What Must Be Proven

- **AC-601.** When alpha delegates to beta's Publisher and to beta's Studio Team, beta's history lists each run with the delegated description as its title, before any owner message. A later owner message, or a peer's message, doesn't change it.
- **AC-602.** A long multi-line description gives a one-line title of at most 100 characters, by the catalogs' rule (`compactSummary`: whitespace collapsed, over 100 → the first 97 characters plus `...`).
- **AC-603.** User-started titles are unchanged.
- **AC-604.** No migration.
- **The user-visible effect.** Beta's history sidebar shows the title, which was the user's complaint. The handoff's known risk (an open Agent row overlays the live conversation's first user message) is existing web behavior; it is observed, not judged.

## Planned Cases

| Case | Criteria | Kind | Steps |
| --- | --- | --- | --- |
| API-00 | all | Existing | server build (the dist predates the fix) |
| API-R1 | AC-602, AC-603, unit | Reused | IMP checks at `05be574608` (focused 439 tests, full unit 6473) |
| API-01 | AC-601 | Durable (two-server E2E) | RC-05: Publisher's run title equals the description after the packet, before any owner message, and is unchanged after the owner's messages and a peer message. RC-21: the Studio Team run title equals the description. RC-22: unchanged after owner messages to the coordinator and the checker and peer messages |
| API-02 | AC-602, AC-601 | Durable (two-server E2E, new RC-30) | A 300-character multi-line description to Publisher and to Studio Team: each title equals `compactSummary(description)`, with no line break and 100 characters |
| API-03 | AC-601 (what the owner sees) | Browser journey (temporary setup) | Two dist servers, delegation to Publisher and to Studio Team, `nuxt dev` against beta: the sidebar rows show the description before opening, after opening, and after an owner message |
| API-04 | AC-603, AC-604, preserved | Existing | the whole two-server E2E (RC-01 … RC-29); `git diff` shows no migration |

- Test progress log: `Yes`

## Not Tested / Deferred

| Behavior | Reason | User only? |
| --- | --- | --- |
| AC-605 Docker node | the user's nodes | Yes |

## Investigation Decision

- Proceed: `Yes`; durable coverage changes: `Yes`; reroute: `No`
