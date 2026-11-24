# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `tickets/in-progress/file-viewer-word-wrap-618/requirements-doc.md`
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md`
- Design Spec (required on every route): `design-spec.md`
- Supplemental Task Artifacts: `follow-ups.md` (FU-001, FU-002)
- Design Review Report: `N/A — not applicable` (direct route, Small/Low)
- Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: `implementation-handoff.md`
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `N/A — not applicable` (direct route)
- Code Review Revision Record: `N/A — not applicable`
- API/E2E Revision Record (created after the first completed result): `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: the implementation engineer's handoff IR-001 (direct API/E2E validation)
- Prior Investigation Reviewed: none (first round)
- Latest Authoritative Investigation: this file

## Current Requirement And Design Basis

`MonacoEditor.vue`'s default for word wrap, used when no caller sets it, changes from `'off'` to `'on'` (`77045f2a5d`). Its only user is `FileViewer`, which serves:

- the desktop Files tab;
- the phone Files screen;
- the reference and artifact viewers (DEC-002).

The default lives in the editor, so a caller's value still wins and "Toggle Word Wrap" keeps changing the editor's own state (DEC-001). There is no new phone UI (DEC-003, FU-001).

What must be proven:

- **REQ-001 / AC-001:** files open wrapped at the editor's width, with indentation kept, line numbers shown and no horizontal scroll, on the phone (390 px) and the desktop.
- **REQ-002 / AC-002:** the toggle turns wrap off and on again.
- **AC-003:** a caller's value still wins.
- **REQ-003:** line numbers, highlighting, editing and save are unchanged.

## Supported Scenarios And Real Usage

- **Designer scenarios covered:** a user opens a long-line text or code file in the desktop Files tab, and in the phone's Files screen.
- **Real-use scenarios added:** a desktop user edits a file that is wrapped, typing at the end of a line and adding a new long line, then saves it with Cmd/Ctrl+S. The file on disk must hold exactly what was typed. This is REQ-003 "editing and save", which the implementation handoff names as a downstream hint and no IMP check covers.
- **Contrived scenarios:** none recorded.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001: the editor's wrap default | Changed | `MonacoEditor.vue:80-85` | Unit test (Monaco mocked) plus rendered checks at both widths |
| BEH-002: "Toggle Word Wrap" | Preserved | `MonacoEditor.vue:141-153` | Unit test plus rendered toggle off and on |
| A caller's `wordWrap` wins | Preserved | `MonacoEditor.vue:80-83` | Unit test |
| Editing, save, highlighting, line numbers | Preserved (REQ-003) | `MonacoEditor.vue:157-170`; `FileExplorerTabs.vue:373-393` | Line numbers are asserted rendered. Edit, save and highlighting with wrap on are not covered: MSP-110 is added for edit and save, and MSP-108/109 gain a highlighting check. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | No | — | — | — | — |
| API / transport / contract | No | — (save uses the existing file-content write) | — | — | — |
| Frontend component / state | Yes | the editor's initial `wordWrap` | `MonacoEditor.spec.ts` (mocked Monaco) | the real Monaco's layout | rendered |
| Browser integration / user journey | Yes | open, read, toggle, edit and save in a wrapped editor | MSP-108/109 (IMP-04) | edit and save with wrap on; highlighting | rendered: MSP-110 |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | Yes | the Files tab editor | MSP-108 (`nuxt dev` at 1440×900) | the same as above | rendered |
| Desktop shell / Electron-specific integration | No | Monaco renders in the renderer only; no preload, IPC or window change | — | — | — |
| Process / lifecycle | No | — | — | — | — |
| Persisted-data transition | No | `Not Affected` (handoff) | — | — | — |
| Worker / queue / distributed coordination | No | — | — | — | — |
| External integration | No | — | — | — | — |

## Project Execution Discovery

- **Assigned worktree:** `/Users/normy/autobyteus_org/autobyteus-worktrees/file-viewer-word-wrap-618`, base `c1147c8917`, validated at `7824c552b3`; the tested code is from `0f5e844087`.
- **Stack:** Nuxt/Vue web with a Monaco editor; the server is `autobyteus-server-ts`.
- **Testing guideline:** `TESTING.md` (root). No closer `TESTING*.md` exists under `autobyteus-web/`.
- **Conflicting instructions:** none.
- **Changed build inputs:** none. The changed paths are a `.vue` file, a spec, and two `tests/e2e/*.mjs` files, which are not type-checked. The fixture names `pnpm-workspace.yaml` and `tsconfig.json` are written at run time into the probe's temporary workspace; they are not repository paths. No fresh-start case.
- **Secrets:** `N/A`. The scripted runtime is used and no provider key is needed.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` § Choosing the path, the phone bundle rule | A phone renderer behavior is proven on the phone bundle | MSP-109 on `/mobile` built by `build:mobile-web` |
| `TESTING.md` § Rerun by impact | Reuse a passed result for unchanged code | IMP-01..05 ran on `0f5e844087`. Since then only `tickets/` changed. |
| `TESTING.md`, the clean environment rule | Every test and probe | `env -i PATH HOME=<fresh> TMPDIR USER` |
| `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` header | The probe's cases and builds | `--cases=…`, `--output-dir=…`; it needs the server `dist` and the phone bundle |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| The server build and the phone bundle | worktree | `pnpm -C autobyteus-server-ts build`; `pnpm -C autobyteus-web build:mobile-web` | worktree outputs only | the build exits 0 | — |
| The probe stack (alpha node, `nuxt dev`, Chromium) | worktree | the probe starts and stops it | its own ports and a temporary data directory; never the founder's app | the probe's readiness waits | the probe tears it down; checked afterwards |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Three long-line files | `FILES` in `mobile-file-word-wrap-cases.mjs`, written to the probe workspace's `word-wrap-618/` | synthetic | in the probe's temporary workspace |
| An agent run in that workspace | the probe's checker agent and scripted runtime | synthetic | the probe's temporary data |

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `MonacoEditor.spec.ts`, the three 618 cases | default on, toggle off and on, a caller's value wins | REQ-001, AC-002, AC-003 | Still Valid | IMP-01 (red), IMP-02 (green, plus a control) | Reuse |
| `MonacoEditor.spec.ts`, older cases and `components/fileExplorer/__tests__` | the editor and viewer as before | REQ-003 | Still Valid | IMP-02: 75/75 | Reuse |
| `mobile-file-word-wrap-cases.mjs` MSP-108, MSP-109 | wrap rendered at both widths, plus the toggle | AC-001, AC-002 | Still Valid | IMP-04 Pass; IMP-05 control fails | Reuse; extend the file with MSP-110 |
| Older tests of `wordWrap: 'off'` as the default | — | — | none found: `grep -rn "wordWrap" autobyteus-web --include=*.spec.ts` shows only `MonacoEditor.spec.ts` | IMP-03: 804/804 | — |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| IMP-01 | REQ-001, REQ-002 | unit | Reused | IMP-01 | It ran before the change, so it is the red half of the proof. |
| IMP-02 | REQ-001, AC-002, AC-003 | unit | Reused | IMP-02 | It ran on `77045f2a5d`, and `MonacoEditor.vue` has not changed since. |
| IMP-03 | all | typecheck, the guard, the web unit suite | Reused | IMP-03 | It ran on `0f5e844087`; only `tickets/` changed since. |
| IMP-05 | AC-001 (control) | rendered | Reused | IMP-05 | It shows the rendered measurement fails with the old default. |
| AE-001 | AC-001, AC-002 | rendered: desktop `nuxt dev` 1440×900, phone bundle 390×844 | Durable | MSP-108 and MSP-109, rerun by me with MSP-110 in the same probe run | My own run on this commit, with my own builds. It replaces reusing IMP-04 because the probe file changes for MSP-110. |
| AE-002 (MSP-110) | REQ-003 | rendered: desktop Files tab, edit mode, wrap on | Durable | Open the long-line text file, wrapped. Click past the end of line 4, type text ending in "." (which closes Monaco's word suggestions; Escape would leave the maximized view), press Enter and type a new long line. Save with Cmd/Ctrl+S, wait for "Changes saved", and compare the file on disk byte for byte with what was typed. Then check that the editor still wraps, with no line past the edge. | REQ-003 editing, save and highlighting with wrap on are not covered elsewhere. A real file write proves the edited model is what gets saved. |

The probe run order is MSP-108, MSP-110, MSP-109, all in one invocation: `--cases=MSP-108,MSP-109,MSP-110`.

- Test progress log needed: `Yes` (builds plus a long probe run)

## Durable Coverage To Add

| Case ID | Planned Test Path | Why Durable Coverage Is Needed |
| --- | --- | --- |
| AE-002 (MSP-110) | `autobyteus-web/tests/e2e/mobile-file-word-wrap-cases.mjs`, with a header line in `mobile-shell-probe.mjs` | A later change to wrap, the editor's options or save would break editing a wrapped file without any unit test noticing. |

## Durable Coverage To Update

| Case ID | Existing Path / Test | Required Update | Notes |
| --- | --- | --- | --- |
| AE-001 | `mobile-file-word-wrap-cases.mjs` `measureEditor` and `failuresOf` | Measure the Monaco token classes in the view lines and require more than one for the JSON file, at both widths (REQ-003 highlighting) | The first draft also required YAML; `getLanguage` opens YAML as `plaintext` on the base too, so it was never highlighted (run1, FU-003). The check is JSON only. |

## Durable Coverage To Remove

None

## Desktop Application Validation Plan

- **Desktop framework / shell:** Electron wrapping the Nuxt renderer.
- **Instructions used:** `TESTING.md`; the probe header.
- **Web-equivalent behavior:** the editor's layout, the toggle, editing and save. All of it lives in the renderer, together with the server's file write.
- **Shell-specific or lifecycle behavior:** none changed.
- **Chosen approach:** `nuxt dev` at 1440×900 in the probe. This is the documented desktop renderer surface.
- **Server/frontend setup:** the probe's own stack.
- **Avoiding the running app:** the founder's running app is never touched. The probe runs under `env -i` with a fresh HOME, on its own ports and data.

## Live Environment And Fixture Plan

- **Startup:**
  1. Build the server: `pnpm -C autobyteus-server-ts build`.
  2. Build the phone bundle: `pnpm -C autobyteus-web build:mobile-web`.
  3. Run the probe: `env -i PATH="$PATH" HOME="$(cd "$(mktemp -d)" && pwd -P)" TMPDIR="$TMPDIR" USER="$USER" node autobyteus-web/tests/e2e/mobile-shell-probe.mjs --cases=MSP-108,MSP-109,MSP-110 --output-dir=<fresh>`.
- **Environment choices:** the clean environment, and headless Chromium from the probe.
- **Readiness:** the probe's dev-server readiness wait and the run's answer.
- **Seed data:** the three synthetic files.
- **Identities:** the probe's pairing session (phone).
- **Journeys:** AE-001 and AE-002 above.
- **Evidence to capture:**
  - `mobile-shell-probe.json`;
  - the probe log;
  - a screenshot per file and state;
  - for MSP-110, the saved file's text and the expected text.
- **Cleanup:**
  - the probe's processes and temporary data;
  - afterwards, a check that no probe process is left.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| The founder's own files on his own stack | His running app and his data are not used (his constraint) | The synthetic files reproduce his report's file types and line lengths (IMP-05 reproduces his clipped screenshot) | Yes: he can look at his own files after release | Delivery takes it to the founder |
| The packaged Electron shell | Monaco's wrap is renderer-only; no shell code changed | Negligible | No | — |

## Ambiguities Or Reroute Triggers

None

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (MSP-110 added; MSP-108/109 gain a JSON highlighting check)
- Reroute Required Before Validation Execution: `No`
- Notes: FU-002 (the 131 px panel) is the panel's layout and is outside this ticket. FU-003 (YAML not highlighted) was found in run1 and is outside it too: the code that causes it is unchanged.
