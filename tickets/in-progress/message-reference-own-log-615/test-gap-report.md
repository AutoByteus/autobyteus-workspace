# autobyteus-615: why the reference-file bug escaped 461's tests and release testing

- By: Solution Designer (`solution_designer_703182187282472484b90793eac8be40`), 2026-11-23
- Confirmed: `d796d508b0` (autobyteus-461) is in `v1.5.13` (also in `v1.5.13-beta.7` and `beta.10`).

## 1. Why 461's tests did not catch it

**How messages are stored.** Measured on the founder's data (IDs and file lists only):
- A message between two runs (for example the Project Task Manager and a team's `solution_designer`) is stored in **both** runs' logs. 26 of 26 such messages are in both.
- A message between two agents of the same delegated team (for example 609's `solution_designer` to its `implementation_engineer`) is stored **only** in that team's log (126 messages in one team).

**What each test checked:**

| Test | What it checks | Why it passed while the bug existed |
| --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/projects/closed-run-attachments.e2e.test.ts` (469/461 AC-007, "a file attached in an earlier conversation of a dismissed run opens") | The reference of a **Manager → worker** message, through the top run's route, before and after the Task closes and after a restart | That message is a cross-run message, so it is also in the top run's log. This is exactly the case that works. |
| `autobyteus-server-ts/tests/integration/api/team-communication-api.integration.test.ts:257-354` | References of a team root's own messages | The message is in that team's own log |
| `autobyteus-web/services/agentCollaboration/__tests__/agentRunCollaborationContext.spec.ts:66` | `host.referenceContentPath(...)` for the **host's own** view | It never asks the path of a delegated row's view. The delegated view's message key was tested (`:53-65`), its reference link was not. |
| `autobyteus-server-ts/tests/unit/api/rest/user-file-routes.test.ts:83-85` (F13–F15) | The three routes' file headers | They do not check which log is read |
| Browser probes (`autobyteus-web/tests/e2e/*`) | None clicks a reference in a delegated run's Messages tab | — |

**Root of the gap:**
- 461's requirements never named message reference files. Its AC-007 (from 469) was about attachments of a dismissed run.
- During 469's receipt check, the reference route was marked "designed, **not proven** by a case". The proof then added covers the cross-run case only.
- The case that broke is a message **inside** a delegated run, opened from that run's own Messages tab. That case was never written down, so it was never tested.

## 2. Why release testing did not catch it

- RELEASE.md's mandatory check before a tag is `scripts/release_smoke.py` (RELEASE.md "Release smoke check"). It proves that runs start with their skills on every runtime. It opens no Messages tab and no file.
- TESTING.md's server suites and typecheck are kept green, but they contain only the tests above.
- Browser probes are written per ticket. None is mandatory for a release, and none covers this click.
- No user journey on the release checklist covers "open a delegated team's Messages tab and click a reference file".

## 3. The gap, and what prevents this class

**The class:** a refactor moves where data is stored (here, a delegated run's messages into its own log). The main reader moves with it (the list), but a reader of something belonging to that data (its reference files) does not. The tests check only the main reader, plus cases where the old place still happens to hold a copy.

**Additions, recommended:**

1. **A permanent test of the invariant "every listed reference opens"** (in this ticket).
   - A built-server E2E over a synthetic tree: a standalone root, a Team root and an Org root, each with a delegated task team and a delegated task agent.
   - It has cross-run messages and messages inside the delegated runs, each with a reference file.
   - For every view (each root's own tab, each delegated run's member tab), it loads the messages through `collaborationParticipantMessages`. It then fetches **every listed reference** through the link the web builds, and asserts 200 with the file's bytes.
   - It also asserts a web unit test of the one link builder for each row kind.
   - It checks the property, not one example, so a later move of messages, or a new kind of run, fails it immediately.
2. **A TESTING.md rule** (API/E2E writes it in this ticket):
   - When a change moves where data is stored, or which run owns it, the test plan lists every read path of that data: lists, attachments and reference files, counts, links, and live updates. Each is proven for each owner kind and form (standalone, Team, Org, delegated agent, delegated team) through the real route.
   - A case where the old location still holds a copy does not count.
   - "Expected to work" in a coverage table is a gap to close in the same ticket, not coverage.
3. **Design side:** already recorded as `docs/design-cases.md` Case 28, with a "Notice it by" rule for designers and reviewers.
4. **Release:** I do not recommend a new mandatory release-time browser journey for this. Test 1 runs in the server E2E suite that every ticket and delivery runs, which catches the class earlier and more cheaply than release testing.

## Status of the fix

- The founder approved the fix on 2026-11-23, in my conversation with him: "you analyze it and trust your proposals now you can continue".
- Design SR-001 passed architecture review (ARCH-REV-001, no findings), and implementation is under way.
- Additions 1 and 2 are added to the ticket's requirements as AC-007 and AC-008 (SR-002).
