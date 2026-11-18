# Implementation Handoff — delegated-copy-project-workspace (autobyteus-97)

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: architecture review selected (Medium / High); ARCH-REV-001 `Pass` of SR-002. Next: code review (handoff rules, High).
- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-project-workspace/tickets/in-progress/delegated-copy-project-workspace/requirements-doc.md` (SR-002, Approved)
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-project-workspace/tickets/in-progress/delegated-copy-project-workspace/investigation-notes.md` (E-001…E-012; E-011's citation corrected by the review)
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-project-workspace/tickets/in-progress/delegated-copy-project-workspace/solution-revision-record.md` (has the Solution Designer's uncommitted edit)
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-project-workspace/tickets/in-progress/delegated-copy-project-workspace/design-spec.md` (SR-002)
- Supplemental task artifacts: none.
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-project-workspace/tickets/in-progress/delegated-copy-project-workspace/design-review-report.md` (untracked; the reviewer's file)
- Architecture review revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-project-workspace/tickets/in-progress/delegated-copy-project-workspace/architecture-review-revision-record.md` (untracked; the reviewer's file)
- Triggering rework report: N/A.

## Current Implementation Summary

- Implementation cycle: `Initial`
- Implementation revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-project-workspace/tickets/in-progress/delegated-copy-project-workspace/implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: SR-002
- Related architecture-review revision IDs: ARCH-REV-001
- Related code-review / API/E2E / delivery revision IDs: N/A
- Triggering finding IDs: N/A
- Worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-project-workspace`, `codex/delegated-copy-project-workspace`, base `origin/personal` `c952758a81`. Code commit `8959bc507a` (review `94c466ae9c..8959bc507a`); documents and evidence in the commit after it. Release only on the user's word.

A new local copy's folder is decided once: each root's placement step asks `RootTaskExecutionLifecycle.newCopyFolder(work)`. No Project on the work → `null` (inherit). Otherwise the port's `projectFolderForNewCopy(projectId)` applies the rule in `projects/services/project-new-copy-folder.ts`: first link, existing-directory check, no link → `null`, unusable → `TASK_PROJECT_FOLDER_UNAVAILABLE`. `resolveDelegationPlacement` applies the folder to both forms: a catalog copy resolves its launches from `baseInFolder(base, folder)`, so the usability check reads that folder's catalog; an in-run placement gets `sourceInFolder`. Remote delegation returns before the step.

## Routing Classification (Mandatory)

- Task size: `Medium`
- Architecture risk: `High`
- Design classification section / evidence reference: design spec § Task Size And Architectural Risk.
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale: 20 server source files within existing owners, one new 18-line file, one error code; no web, snapshot or restore change. The blast radius (where every local saved-Task and sub-work copy runs) is as classified. No runtime ignored the recorded folder (the escalation trigger).
- Selected route: `Code Review`
- Lightweight self-review for the direct route: `Not Applicable`
- New design impact or escalation trigger: `None`

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | Task's Project link, first one, for Agent and Team copies, saved Tasks and sub-work, on all roots; otherwise inherit | `project-new-copy-folder.ts`, `project-task-service.ts`, `task-execution-resource-port.ts`, `root-task-execution-lifecycle.ts` (`newCopyFolder`), `team-task-execution-service.ts` (forward), `catalog-delegation.ts`, `collaborator-admission.ts`, `collaborator-root-port.ts` (`baseInFolder`), `run-execution-tree-shared-records.ts` (`sourceInFolder`), three roots' delivery, resolver and collaborators | Implemented; IMP-01, IMP-03, IMP-05 |
| BEH-002 | Unusable first link refuses, coded, before anything starts | The rule throws `ProjectError`; `newCopyFolder` wraps with `asTaskDelegationError`; code in `ProjectErrorCode`, `TASK_EXECUTION_RESOURCE_REJECTION_CODES`, `TaskDelegationErrorCode` | Implemented; AC-006 on the real tool path, IMP-03 and IMP-05: `{error:{code:"TASK_PROJECT_FOLDER_UNAVAILABLE",…}}`, no Task entry, no copy |
| BEH-003 | No UI change; focus shows the copy's folder; nested under the delegator | No web code changed | IMP-05 on an Agent root, both modes: Files and Terminal follow the copy |
| BEH-004 | Existing copies keep their folder | `assignToExistingCopy` and restore untouched | IMP-03 AC-007 (live and stored tree); no real process restart (below) |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

- New: `autobyteus-server-ts/src/projects/services/project-new-copy-folder.ts`; tests `tests/unit/projects/project-new-copy-folder.test.ts`, `tests/unit/standalone-agent-run-root/standalone-root-new-copy-folder.test.ts`, `tests/unit/agent-org-execution/agent-org-new-copy-folder.test.ts`.
- Extended tests: `tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts` (Team root, real tool, real Projects service and files), `message-recipient-resolution.test.ts`, `collaborator-admission.test.ts` (AC-008), `tests/fixtures/task-execution-resource-fixtures.ts`.
- Line counts (`IMP-06-line-counts.log`): `root-team-run.ts` 500 → 500 (the step stayed inside the existing line), `root-task-execution-lifecycle.ts` 466 → 475, `project-task-service.ts` 445 → 447; all ≤ 500.

## Important Assumptions

1. **Review points 1–3 applied.** The Team forward is in `team-task-execution-service.ts`; `root-team-run.ts` did not grow; the code is in `ProjectErrorCode` and the port call is wrapped.
2. **Refusal text.** The design's text says "does not exist"; a link that is a file also refuses, so the text reads `which is not an existing folder on this node`. The rest is the design's wording.
3. **`catalogTaskSourceOf` keeps its signature**, so the peer-started run path (`remote-delegation-receiver.ts`) is unchanged; `catalogTaskSource` and it share a private `sourceFromBase`.
4. **A Project that vanished between reading the Task and this step** rejects `PROJECT_NOT_FOUND` rather than inheriting. The review notes Project Delete removes Task files, so this is a narrow race; it reaches the agent as the tool's uncoded `TASK_DELEGATION_ERROR`, with nothing started. I judged a silent inherit worse.
5. **Refusal order** as the review said: the folder is read before `resolveDelegationPlacement`, so an unusable link wins over the CM-1 refusal and target-not-found. Nothing starts either way.

## Known Risks

- **For the delivery summary (review point 6): a Project folder not yet registered appears as a new row in the Workspaces list after the first delegation.** IMP-05 shows it (`newWorkspacesRowForProjectFolder: true`). Accepted in the design; the user should hear it.
- **Actual working directory (review point 7).** Native: true `pwd`: a real native copy ran `run_bash pwd > native-cwd.txt` and the file in F contains F; nothing landed in G. AGY (scripted CLI, labeled): the process cwd is the run's capsule (`…/agy-project`) **by design**, and the folder reaches it as `--add-dir F` and the capsule's `workspacePath` = F, both read from the live launch. So AGY proves the launch inputs, not a shell `pwd`; a real Codex or Claude working directory was not read (needs credentials; API/E2E, test vault).
- **In-run placements have no launch check (review point 4).** None added. In the scripted runs no model failed in the new folder; a folder-scoped catalog on a configured placement was not exercised. Nothing worse than the review described was seen.
- **`EXC-E2E-004` failed once, on a path this change does not touch.** In IMP-04, at offset 7 ms, `delegate_task` to an existing copy returned `delegated:false`, "…the message with its work was not delivered (… is fenced for root shutdown.)". Reading the text and the test: DONE of the copy's last open Task released it while the follow-up Task's message was being delivered. The Task was still assigned and the agent is told how to continue, but the test's rule is "never refused". It passed 3 of 3 alone. `assignToExistingCopy` and release are unchanged here, and the test's Project has no links. I did not reproduce the window or confirm the cause by instrumenting it. It needs its owner: the Solution Designer may want it as its own item.
- **`activeWorkspaceMetadata` still returns the host's folder for a selected child** (review point 5). The right panel does not read it; IMP-05 confirms Files and Terminal follow the copy. Left as is.
- **Task text with relative paths** now resolves in the Project folder (design § Risks).

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Feature.
- Reviewed root-cause classification: `No Design Issue Found`.
- Reviewed refactor decision: `No Refactor Needed`.
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: one rule owner, one shared apply step, one call per root.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed: `Yes` (none found)
- Dead code found elsewhere, added to `follow-ups.md`: None
- Shared structures remain tight: `Yes` (`DelegationWork` not extended; no shape change)
- Canonical shared design guidance reapplied: `Yes`
- Changed source files within size guardrails: `Yes`
- Notes: none.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected`
- Design-spec decision reference: § Persisted Data / State Transition Decision
- Implementation follows the decision: `Yes`: new copies write the existing `workspaceRootPath` fields with a different value.
- Evidence: IMP-03 AC-007, IMP-05.
- Deviation: `None`

## Environment Or Dependency Notes

`pnpm install --frozen-lockfile`, server `prebuild` and `build`, `nuxi prepare` in the fresh worktree. Untracked `autobyteus-application-*/dist/` not staged.

## Checks Run

Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-project-workspace/tickets/in-progress/delegated-copy-project-workspace/evidence/implementation/`.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `pnpm -C autobyteus-server-ts test:unit` | `8959bc507a` content | macOS, Node 22 | whole server unit suite incl. Agent and Org root cases, rule, placement, admission | AC-001, 002, 004, 005, 006, 008 | Pass | `IMP-01-server-test-unit.full.log` | `Test Files  917 passed \| 5 skipped (922)`, `Tests  7758 passed \| 9 skipped (7767)` |
| IMP-02 | `pnpm -C autobyteus-server-ts typecheck` | `8959bc507a` content | macOS, Node 22 | server `src` and tests against the baseline | — | Pass | `IMP-02-server-typecheck.log` | `test-file errors: 1200 in 370 files (baseline 1200 in 370 files)`, `[typecheck] PASS` |
| IMP-03 | `vitest run tests/integration/agent-team-execution tests/integration/standalone-agent-run-root tests/integration/agent-collaboration` | `8959bc507a` | macOS, Node 22 | Team root through the real tool and Projects service: AC-001…007 | AC-001…007 | Pass | `IMP-03-server-integration.log` | `Test Files  12 passed (12)`, `Tests  89 passed (89)` |
| IMP-04 | Scripted AGY E2E: `delegated-launch-config-defaults`, `project-task-context-files-delegation`, `task-existing-copy-assignment`, `delegation-forest-restore` | `8959bc507a`, dist from it | macOS, scripted AGY | delegation launches, restore, existing copies over HTTP/WS | REQ-006, 007 | 13 pass, 1 fail (`EXC-E2E-004`, Known Risks; passes alone 3/3), 2 skipped | `IMP-04-scripted-e2e.log` | `Tests  1 failed \| 13 passed \| 2 skipped (16)`; the "fenced for root shutdown" text |
| IMP-05 | `env -i … node <ev>/new-copy-folder-proof.mjs --output-dir <ev>/IMP-05-proof` | `8959bc507a`, dist from it | macOS, Chrome headless, script-owned stack; scripted AGY; native on a fake OpenAI-compatible endpoint | real `delegate_task`, launches, native `run_bash`, web tree, Files, Terminal | AC-001…006, AC-009 | Pass | `IMP-05-proof.log`, `IMP-05-proof/evidence.json`, `IMP-05-proof/*.png`, `new-copy-folder-proof.mjs` | four `Pass:` lines; `pwdWrittenByTheCopy` ends `project-first`; `addDirs` and `capsuleWorkspacePath` the same; `managerFolder` ends `manager-folder`; cleanup `dataRootRemoved: true` |
| IMP-06 | effective line counts, base → now | `8959bc507a` | — | every touched source file | Size guardrail | Pass | `IMP-06-line-counts.log` | `500 -> 500 …/root-team-run.ts`; nothing above 500 |

- Not run, and why: the remaining gated scripted projects E2E suites and web suites (no web code changed; API/E2E's); a real process restart after an existing copy took another Project's Task (AC-007 is asserted on the live and stored tree; restore code is untouched); a real external runtime's working directory (Codex, Claude; needs the test vault); the packaged desktop journey in AC-009 (API/E2E's); a Team root and an Org root in the browser (AC-009 was asked on the Agent root; the review cites an existing Org spec).

## Frontend Rendered-Result Check (When Applicable)

- Affected surfaces / journeys: none changed in code; focused copy's Files and Terminal, and the run tree, now see a copy folder that differs from the root's for the first time on an Agent root.
- References: REQ-008, AC-009; review point 5.
- Design system and adjacent surfaces reviewed: `RightSideTabs.vue`, tree rows; unchanged.
- Rendered surface: script-owned stack of IMP-05 (Nuxt dev + built server, headless Chrome 1440×900).
- States, layouts, viewports, and interactions inspected: manager focused → Files shows `sentinel-manager.txt`; copy focused → Files shows `sentinel-project.txt` and not the manager's file; Terminal `pwd` prints F; row nested under the manager in Workspaces mode and, for a manager started under another Project, in Projects mode; the Task's own Project stays "No runs yet". Screenshots inspected.
- Issues found and corrected: none in the product.
- Remaining unverified: Team-member focus in the browser, narrow layout (unchanged code), packaged app.

## Downstream Coverage Hints / Suggested Scenarios

- A real Codex or Claude copy: read its actual working directory (test vault).
- AC-007 with a real restart, and a folder-scoped catalog on a configured placement (review point 4).
- AC-009 in the packaged desktop app; the Workspaces row appearing.
- `EXC-E2E-004` repeated under load, to establish the "fenced for root shutdown" window.

## API / E2E / Executable Coverage Investigation And Execution Still Required

Everything in "Not run" above. Delivery updates server `docs/modules/projects.md` (Saved-ID delegation, Workspace Registration Boundary), `docs/design/collaboration_model.md` (a sentence under CM-6) and `standalone_agent_run_root.md` if it states inheritance, and mentions the new Workspaces row in the summary.
