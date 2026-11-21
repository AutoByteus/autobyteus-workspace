# Docs Sync Report: autobyteus-576 (the autobyteus-554 follow-ups)

## Scope

- Ticket: `memory-follow-ups-576` (Project Task `autobyteus-576`: the autobyteus-554 follow-ups FU-002…FU-009)
- Trigger: API/E2E `API-REV-002` `Pass` (final confidence 95.0%), direct low-risk route (`task_size` Medium, `architectural_risk` Low; architecture review, source review and test-code review `Not Applicable`; the code reviewer's one failure-origin round, CRR-001, resolved by SR-002).
- Bootstrap base reference: `origin/personal` @ `61fd6f41f7`
- Integrated base reference used for docs sync: `origin/personal` @ `61fd6f41f7`: the branch is already current (its base is the tip of `origin/personal` and it is an ancestor of `HEAD`), so no merge was needed.
- Post-integration verification reference: none needed (see `release-deployment-report.md`: nothing came in from the base and nothing changed on the branch since API/E2E's run on `adda171de8` / reports `2e0789392a`).

## Why Docs Were Updated

- Summary: this ticket made seven changes that long-lived docs describe. A definition's folder name keeps its full encoded form up to 255 bytes (the implementation updated that doc). A relative link in a workspace file's Markdown preview opens the linked file; the workspace menus and the mobile launch picker list only places to run; the Antigravity and Grok capability probes treat a child that already exited as finished and report a real time-out as a time-out. Delivery checked each against the final code and found four docs that were stale or silent about it, and fixed them.
- Why this should live in long-lived project docs: a reader of the Markdown renderer's doc was told that opening relative links is an open follow-up; a reader of the chat docs would not know why a skill's workspace is missing from the menu; a maintainer of either runtime probe has to know what the bound does when the main thread is blocked and what a time-out is called.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `DESIGN.md` | Project design rules | No change | No rule added or changed. The probe bound has one owner (`probe-time-bound.ts`) shared by the two probes, and the relative-link resolver is one rule shared with images, so neither fact has a second copy |
| `TESTING.md` | Project testing guideline | No change; proposal | The ticket's tests follow the "File watching on a busy Mac" rule (`os-latency-under-load.ts`, `IN_PROCESS_SERVER_HOOK_TIMEOUT_MS`). One proposal, not delivery's document: a test that waits on OS file events and sees none labels the failure `ENVIRONMENT:` (DEC-005; `DCF-E2E-007` and the file-system watcher integration test do), and a few older files (`DCF-E2E-002`, `-003`) still fail there with a plain "not met within 30000 ms" (`follow-ups.md` FU-003). No command stopped working |
| `RELEASE.md` | Project release guide | No change | No release step, check or workflow changed. No build input changed (no lockfile, `package.json`, `tsconfig`, script, workflow, contract package, generated file or baseline in the diff), so TESTING.md's fresh-start build does not apply |
| `autobyteus-server-ts/docs/modules/agent_memory.md`, `agent_episodic_catalog.md` | The folder-name rule | Checked; already updated by the implementation | Both say 255 bytes, the file-name limit (autobyteus-576), and keep the prefix of 120 bytes, `#` and 16 hex characters for longer IDs. `agent-memory-layout.ts` has the same numbers. No other live doc or source file says 200 for this rule (`git grep`); the archived autobyteus-554 ticket keeps its history |
| `GLOSSARY.md` | The "Semantic memory" entry names the shortened form | No change | It says "an ID too long for one file name", which stays true |
| `autobyteus-web/docs/content_rendering.md` | Said a link with no scheme "does nothing… opening such files is FU-001" | Updated | See Docs Updated |
| `autobyteus-web/docs/chat.md` | Describes what the workspace menu offers | Updated | See Docs Updated |
| `autobyteus-server-ts/docs/modules/grok_build_runtime.md`, `antigravity_cli_runtime.md` | Describe the probes' bounds and diagnostics | Updated | See Docs Updated |
| `autobyteus-web/docs/agent_execution_architecture.md` | Also describes `ChatWorkspaceMenu` | No change | It says the control "picks an existing workspace or accepts an absolute folder path", which stays true; the kinds it lists are in `chat.md` |
| `tickets/done/semantic-memory-for-every-agent/release-notes.md` | The 554 release notes are forward-looking: the next release carries them, and RELEASE.md collects their `## What you need to do` sections | Updated | The implementation replaced the rare-ID action with "Nothing to do for your agents' memory folders…". That is not an action, and the folder-name rule is now such that no user has anything to do, so delivery removed the bullet; the section keeps the one real action (update the app and every node together) |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-web/docs/content_rendering.md` | Reference | The link-click rule now says the renderer emits `relative-link` with the raw href and opens nothing itself; the Markdown preview of a workspace file opens it. New section "Workspace-Relative Links": the preview tab of the same workspace (`MarkdownPreviewer.openRelativeLink` → `openFilePreview`), the one shared resolver `resolveWorkspaceRelativeReference` (fragment and query dropped, segments URL-decoded, POSIX resolution against the document's folder), and what opens nothing (root-absolute, outside the root, malformed, a node file or any non-workspace surface); a missing file shows the viewer's message; a read-only workspace stays a preview | The old line named opening such files as an open follow-up, which this ticket delivers |
| `autobyteus-web/docs/chat.md` | Reference | The workspace menu "lists only places to run": `filesystem` and the temp workspace (`isRunnableWorkspaceKind`, shared with the run-history sidebar and the mobile launch picker); a skill's or semantic memory folder's workspace never appears | FU-003, DEC-003 |
| `autobyteus-server-ts/docs/modules/grok_build_runtime.md` | Reference | A probe past its bound is a time-out, `GROK_MODEL_DISCOVERY_TIMEOUT`, never `GROK_CLI_UNSUPPORTED`; `RUNTIME_PROBE_TIMED_OUT { runtime, command, boundMs }` is logged; a child that already exited when the bound fires is read by its real result (the exit from the `exit` event, the decision deferred past the poll phase, up to 1 s for `close`) | FU-008 |
| `autobyteus-server-ts/docs/modules/antigravity_cli_runtime.md` | Reference | The probe's time bound is the shared `probe-time-bound.ts`: same rule, same log line | FU-008 |
| `tickets/done/semantic-memory-for-every-agent/release-notes.md` | Release notes | The non-action bullet removed | See above |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| A time bound can fire for a child that already finished | When the main thread is blocked past a probe's bound, Node runs the expired timer before the poll phase that delivers the child's exit. `exitCode` is therefore still `null` when the timer runs. Measured: 7 firings 4.1 to 22.5 s after a 3 s bound, each with the exit unseen at the timer and seen after the deferral | `design-spec.md` SR-002, `implementation-handoff.md` IMP-11, `api-e2e-execution-coverage-report.md` API-05c | `grok_build_runtime.md`, `antigravity_cli_runtime.md`, the module's own comment |
| A relative link in a workspace file opens that file | One resolver for images and links; nothing outside the workspace root | `requirements-doc.md` REQ-002, DEC-002 | `content_rendering.md` |
| Only places to run are offered as a run's workspace | `filesystem` and `temp` | `requirements-doc.md` REQ-003, DEC-003 | `chat.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| A probe's `setTimeout` that decides at once, reading `exitCode`, and reports a Grok probe's own bound as "unsupported CLI" | `armProbeTimeBound` (`probe-time-bound.ts`): the exit learned from the `exit` event, a deferred decision, a real time-out reported as a time-out | `grok_build_runtime.md`, `antigravity_cli_runtime.md` |
| `MAX_FULL_DEFINITION_FOLDER_NAME_BYTES = 200` | `255` | `agent_memory.md`, `agent_episodic_catalog.md` |
| The text "opening such files is FU-001" | A relative link in a workspace file's preview opens the file | `content_rendering.md` |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

Not used: five docs changed.

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary, release notes, verification record, archive, finalization (`release-deployment-report.md`)
- Notes: follow-ups FU-001 (the implementation's) and FU-002 (API/E2E's) were in `follow-ups.md`; delivery added FU-003 (the `ENVIRONMENT` label for the older file-event tests). The Solution Designer sends them. DEC-004 (older-layout imported teams) is not a follow-up: it is the founder's open decision and is carried in the handoff summary.
