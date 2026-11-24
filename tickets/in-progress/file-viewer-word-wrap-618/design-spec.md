# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-001`
- Approved requirements: SR-001, within the direction (founder informed)
- User approval of the design: `Not required`
- Design status: `Ready`
- Authorities read (2026-11-24): `references/architecture-design.md`, `references/design-principles.md`, `DESIGN.md`
- Data contract (Principle 17): `N/A` (no stored or cross-boundary data)

## Current-State Read

`MonacoEditor` owns its wrap state. It defaults to `'off'` unless a caller passes one, and its toggle works only when no caller passes one (investigation notes). Its one user, `FileViewer`, passes none.

## Task Size And Architectural Risk (Mandatory)

- **Size:** `Small`. One default in one component, plus its unit tests and one rendered check.
- **Risk:** `Low`. No contract, persistence or ownership change.
- **Escalation trigger:** a caller that relies on the `'off'` default.

## Intended Change

`MonacoEditor`'s uncontrolled default becomes `'on'`. Nothing else changes: a caller's value still wins, and the toggle still works.

## Change Scope (Mandatory)

- **In scope:** UC-001; `MonacoEditor.vue` and its unit tests; a rendered check.
- **Derived consumers:** `FileViewer`, and through it the File Explorer tabs, the phone Files screen, and the reference and artifact viewers. All of them get wrap on, by decision (DEC-002).
- **Left alone:** a remembered preference; a phone toggle button; previews.
- **Follow-ups:** FU-001.

## Task Design Health Assessment (Mandatory)

- **Posture:** `Behavior Change` (a default).
- **Design issue found:** `No`. The owner, `MonacoEditor`'s wrap state, is right.
- **Triggers:** none fire. **Behavior by absence** was checked: the default is the explicit fallback of one owner, used only when no caller sets a value; that is intended.
- **Refactor:** `No`.

## Final File Responsibility Mapping

| File | Change |
| --- | --- |
| `autobyteus-web/components/fileExplorer/MonacoEditor.vue:80-83` | The final fallback `'off'` becomes `'on'` |
| `autobyteus-web/components/fileExplorer/__tests__/MonacoEditor.spec.ts` | Tests: the default is on; the toggle goes off and back on; a passed value wins |

## Removal / Decommission Plan (Mandatory)

None.

## Backward-Compatibility Rejection Log (Mandatory)

N/A.

## Change Sequence

1. The default.
2. The tests.
3. A rendered check at phone width (about 390 px) and desktop width with synthetic `pnpm-workspace.yaml`, `tsconfig.json` and long-line `.txt` files. Show that there is no horizontal scroll, that wrapped lines are indented like their line, and that line numbers stay. Save screenshots.

## Guidance For Implementation

- Synthetic files only.
- TESTING.md rules apply to the rendered check (a worktree build, not the founder's running app).
