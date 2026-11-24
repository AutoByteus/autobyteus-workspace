# Docs Sync Report: autobyteus-618 (text and code files wrap in the file viewer's editor)

## Scope

- Ticket: `file-viewer-word-wrap-618` (Project Task `autobyteus-618`)
- Trigger: API/E2E `API-REV-001` `Pass` (final confidence 95%), direct low-risk route (`task_size` Small, `architectural_risk` Low; architecture review, source review and test-code review `Not Applicable`).
- Bootstrap base reference: `origin/personal` @ `c1147c8917`
- Integrated base reference used for docs sync: `origin/personal` @ `c1147c8917`: the branch is already current (its base is the tip of `origin/personal` and an ancestor of `HEAD`), so no merge was needed.
- Post-integration verification reference: none needed (see `release-deployment-report.md`): nothing came in from the base, and the branch has changed only tests and records since the product change was checked.

## Why Docs Were Updated

- Summary: the file viewer's editor (`MonacoEditor.vue`, Monaco) used to open text and code files with word wrap off, so a long line ran past the editor's right edge and had to be scrolled sideways; on the phone, where the editor is 322 px wide, files such as `pnpm-workspace.yaml` showed clipped lines (the founder's screenshot). The editor's own default is now on, so files wrap at the editor's width, a wrapped row keeps its line's indentation, and line numbers stay once per line. The existing "Toggle Word Wrap" action turns it off and on again, and a caller's value still wins. Delivery read every long-lived doc that describes the editor or the file viewer against the final code.
- Why this should live in long-lived project docs: the renderer doc describes the editor's font handling but said nothing of wrapping, so a reader could not tell why a long line wraps, where the default lives, or that the setting is not remembered.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `DESIGN.md` | Project design rules | No change | No rule added or changed. The default lives with the component that owns the editor's options (`MonacoEditor.vue`), not in its caller: DEC-001 records why (a value passed from `FileViewer` would make the setting "controlled" and the toggle would stop applying its own change) |
| `TESTING.md` | Project testing guideline | No change | The ticket's checks follow it: a unit test with a red half and a control, and the repository's rendered probe (MSP-108…110) on a built phone bundle and a desktop window, run under `env -i` with a fresh `HOME` |
| `RELEASE.md` | Project release guide | No change | No release step, check or workflow changed, and no build input changed (no lockfile, `package.json`, `tsconfig`, script, workflow, contract package or generated file in the diff), so the fresh-start build rule does not apply |
| `autobyteus-web/docs/content_rendering.md` | Names `MonacoEditor` as the viewer of text and code and describes how it takes its font size | Updated | See Docs Updated |
| `autobyteus-web/docs/file_explorer.md` | Lists `MonacoEditor.vue` in the module's file tree and describes the viewer's drafts, tabs and error state | No change | It describes what the editor holds (drafts, committed content), not how a line is laid out; wrapping changes neither |
| `GLOSSARY.md`, `autobyteus-web/docs/**` other than the two above | Terms and screens for the file viewer and the phone Files screen | No change | No term changed and no screen was added; the Monaco context-menu action is unchanged |
| `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` header | The probe's own description of its cases | Updated by API/E2E | The header now covers MSP-108…110 |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-web/docs/content_rendering.md` | Reference | A new section "Text And Code Wrapping" before the display settings: text and code files open in `MonacoEditor.vue` with word wrap on on the phone and the desktop; a wrapped row keeps its line's indentation and line numbers appear once per line; a caller's `wordWrap` (prop or `options`) wins; with none, the context-menu action "Toggle Word Wrap" turns wrap off and on again for that editor and the choice is not remembered between files; editing, saving, line numbers and highlighting do not depend on it; the one user of `MonacoEditor.vue` is `FileViewer` (the Files tab, the phone Files screen, the reference and artifact viewers), so they share the default | The doc described the editor's font handling but not its wrapping, and the default now reaches every viewer of text |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| The wrap default belongs to the editor, not to a caller | A caller that passes `wordWrap` makes the setting controlled and the toggle then only emits an event; the editor's own default keeps the toggle applying its own change | `requirements-doc.md` DEC-001, DEC-002 | `content_rendering.md`, and the comment above the default in `MonacoEditor.vue` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| The editor's default `wordWrap: 'off'` | `'on'` | `content_rendering.md` |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

Not used: one doc changed.

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary, release notes, verification record, archive, finalization (`release-deployment-report.md`)
- Notes: follow-ups FU-001 (the only wrap toggle is a context-menu action, hard to reach on a phone and not remembered), FU-002 (the desktop Files tab's editor beside the tree is about 131 px wide, so wrapped text shows a dozen characters per row; maximizing gives the window's width) and FU-003 (YAML and other common file types open as plain text with no highlighting) are in `follow-ups.md`; delivery adds none. The Solution Designer sends them.
