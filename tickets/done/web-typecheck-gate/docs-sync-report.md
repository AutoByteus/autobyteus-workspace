# Docs Sync Report

## Scope

- Ticket: `web-typecheck-gate`, Project Task `autobyteus-workspace-9` (FU-003 of `autobyteus-workspace-7`). URGENT: every desktop release build of `personal` is blocked by the web typecheck. No release, tag or publish is wanted.
- Trigger: API/E2E result `Pass` (API-REV-001, 95% overall, no category below 90%), direct low-risk route. `task_size` `Small`, `architectural_risk` `Low`. Independent review gates: `Not Applicable`.
- Bootstrap base reference: `origin/personal` @ `742de88c2b386d4722508eb5f99bef94133c4537`
- Integrated base reference used for docs sync: `origin/personal` @ `742de88c2b386d4722508eb5f99bef94133c4537`. The ticket branch already contained it (merge base equals the tip; no new base commits).
- Post-integration verification reference: none was needed. Nothing was integrated, so the validated code state is the state that merges. The code is unchanged since `25aa717ba`; API/E2E's fresh-start build and verify steps ran on that commit (`evidence/API-01`, `API-02`).

## Why Docs Were Updated

- Summary: the ticket changed a rule the project follows. TESTING.md now says that every TypeScript change runs both typechecks, and why. RELEASE.md's delivery-audit rule named only "one relevant check" after a base refresh, which now differs from TESTING.md's "Rerun by impact" step 5. One clause aligns it.
- Why this should live in long-lived project docs: the escape was a missing rule at the earliest stage that can reproduce it. The team's project-documents rule ("When a later stage catches a problem") puts the check in the testing guideline. A ticket document is archived with the ticket and no later role reads it when choosing checks.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `TESTING.md` | The ticket's own change (REQ-004, AC-005) | `Updated` (by the ticket, commit `afaeb9ed5`) | Checked against the final state: the Web typecheck row (line 37), the "Both typechecks, whatever the change touches" paragraph after the Choosing-the-path table, and Rerun-by-impact step 5 match design-spec "Concrete Examples". The anchor `#choosing-the-path` matches the heading at line 68. No other rule (Fresh-start build, Rule 9) conflicts: both typechecks and the Fresh-start command ran as written |
| `RELEASE.md` | Release guide: delivery's audit rule and the reruns it lists | `Updated` (this delivery) | One clause in "Finalization Target", the audit rule's second bullet. See Docs Updated |
| `RELEASE.md` | Main-checkout path in "Finalization Target" | `Needs follow-up` | `FU-001` in `follow-ups.md`: `RELEASE.md:23-26` names `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`, which does not exist (the main checkout is `/Users/normy/autobyteus-org/autobyteus-workspace`). It is outside this ticket: the fix and the gate work without it. The Solution Designer sends it when the ticket leaves the team |
| `DESIGN.md` | Design rules the change might touch | `No change` | No design change: the test uses an existing server test fixture, production types are unchanged. The investigation notes record "Not a design-case mistake" (460's design was correct), so no design-case entry. DESIGN.md has no typecheck rule |
| `AGENTS.md` (root) | Pointers to the three documents | `No change` | All three documents exist and are named |
| `autobyteus-web/docs/electron_packaging.md` (the only component doc that mentions the typecheck) | It describes the desktop build's web typecheck, lines 580-584 | `No change` | It already says the build runs the web type check, that test-file errors beyond `typecheck-baseline.json` stop the build, and links the Web typecheck layer in TESTING.md. All of that is still true. `grep` over `autobyteus-web/docs`, `autobyteus-server-ts/docs` and `docs` found no other typecheck description, and no doc that mentions `createTestRunWorkspaceSkills` or the fixtures file |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `TESTING.md` | Rule, row, step (done by implementation, commit `afaeb9ed5`, verified here) | Web typecheck row says the cross-package tests compile the server's `src` and server test fixtures; new paragraph "Both typechecks, whatever the change touches"; Rerun-by-impact step 5 names both typechecks | Closes the gap that let autobyteus-460 through (REQ-004) |
| `RELEASE.md` | Alignment clause | In "Finalization Target", the audit rule's second bullet: "(one relevant check on the merged state, and both typechecks, web and server, as TESTING.md's "Rerun by impact" step 5 says)" | TESTING.md step 5 asks for both typechecks after a merge or rebase, including delivery's base refresh; RELEASE.md said "one relevant check", which could be read as a single typecheck |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Cross-package typecheck reach | The web typecheck compiles server `src` and server test fixtures; the server typecheck builds and reads `autobyteus-ts` and the shared packages. A change in one package can break the other's typecheck | `investigation-notes.md` "Architecture Investigation Findings"; `design-spec.md` "Concrete Examples" | `TESTING.md` (Web typecheck row; Choosing the path) |
| The rule, not the incident | Every TypeScript change runs both typechecks; the rule is stated without the autobyteus-460 story | `requirements-doc.md` REQ-004, `solution-revision-record.md` | `TESTING.md` |

The root cause and the escape (autobyteus-460, `07d5d69b3`) stay in `investigation-notes.md` (archived with the ticket). Project documents hold rules, not one ticket's story.

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| "Typecheck chosen by the changed package" (implicit in the old Choosing-the-path table) | "Both typechecks for any TypeScript change" | `TESTING.md`, Choosing the path and Rerun by impact step 5 |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

Not used: `TESTING.md` and `RELEASE.md` changed. `DESIGN.md` and the component docs are `No change` for the reasons in the table above.

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary, ticket archive to `tickets/done/web-typecheck-gate/`, hygiene and secret checks, finalization on `origin/personal`. No release.
- Notes: RSK-001 (the rule is documented, not enforced by a machine; CI would be the user's decision) is carried to the handoff summary and the terminal message.
