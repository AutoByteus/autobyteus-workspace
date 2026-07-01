# Design Rework: Transient Row Status Icon Semantics

## Trigger

User reviewed the Electron implementation and attached screenshot:

`/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_ff152619cd40471aa99b7d021d9fd315/solution_designer_7a57ec51dc7548d9974709d28237a139/context_files/ctx_c8fd4e175d9c__image.png`

The implemented transient rows show too many circular indicators:

- a normal solid status dot at the beginning;
- a second dotted initials/avatar circle at the beginning;
- a trailing dotted circle at the far right.

This is not the intended visual semantics.

## Implemented Code Finding

`autobyteus-web/components/workspace/history/WorkspaceTransientExecutionRow.vue` currently renders:

1. `<StatusDot ... />` as a solid leading status dot.
2. A dashed initials/avatar circle:
   - `inline-flex h-4 w-4 ... rounded-full border border-dashed ...`
3. A trailing dashed circle:
   - `<span class="ml-2 h-2 w-2 ... rounded-full border border-dashed ..." />`
4. A full dashed row border:
   - `border border-dashed border-indigo-100 bg-indigo-50/40 ...`

This means the dotted/dashed visual language is additive instead of replacing the normal status icon semantics.

## Correct Design Intent

The approved visual language is:

```text
● durable member/team row       solid leading status circle + normal row background
◌ transient execution row       dotted/dashed leading status circle + light ghost background
```

The dotted/dashed circle is the **status icon itself**, not an additional avatar/marker.

Transient rows should have:

- exactly one leading circular execution/status indicator;
- that indicator should be dotted/dashed/hollow while still preserving status color as much as practical;
- light ghost row background;
- no extra dotted initials/avatar circle;
- no trailing dotted circle;
- no visible `Temp`/`Temporary` text by default;
- tooltip/aria text may communicate temporary semantics for accessibility.

## Required Implementation Correction

Update `WorkspaceTransientExecutionRow.vue` so the row shape is closer to:

```text
◌ StudentStudyGroup · task_0003
◌ student_one
◌ student_two
```

Concrete guidance:

1. Replace the solid `<StatusDot>` with a transient-status variant.
   - Preferred: extend `StatusDot.vue` / `workspaceStatusDotPresentation.ts` with a `variant="transient"` or similar typed option.
   - Acceptable: add a small local `TransientStatusDot` component if that keeps responsibility clearer.
2. The transient status dot should be a single leading `h-2 w-2 rounded-full` indicator with dashed/dotted border and light/transparent center.
3. Remove the dashed initials/avatar circle from transient rows.
4. Remove the trailing dotted circle from transient rows.
5. Keep the light ghost background. Consider removing full dashed row border if it makes the row visually noisy; the approved essential markers are the dotted leading status icon and ghost background.
6. Keep accessible title/aria text, but no visible temporary label by default.

## Test Updates Needed

Update tests that currently encode the incorrect shape:

- `autobyteus-web/components/workspace/history/__tests__/WorkspaceHistoryWorkspaceSection.spec.ts`
  - Stop expecting visible text `Temporary task execution`.
  - Add assertions that transient rows have one leading transient status indicator.
  - Add assertions that there is no trailing transient marker.
  - Add assertions that no dashed initials/avatar marker is rendered.
- Add/adjust `StatusDot` / status presentation tests if a reusable transient variant is added.

## Additional Disclosure Correction

User clarified one more parity requirement: if the transient row is a task-agent team, it should be collapsed by default, just like a normal persistent agent team.

Required behavior:

```text
Initial render:
◌ StudentStudyGroup · task_0003        collapsed; child rows hidden

After user expands:
◌ StudentStudyGroup · task_0003
  ◌ student_one
  ◌ student_two
```

Implementation guidance:

- Treat transient `task_team` rows with children as expandable rows in the same Workspaces tree visibility/filtering layer that handles stable nested team rows.
- Do not auto-render transient task-team child rows just because the transient task-team root exists.
- Prefer reusing the existing `teamRunId + memberRouteKey` expansion key shape if it safely supports transient member route keys.
- Add tests that assert transient task-team children are hidden by default, visible after disclosure expansion, and hidden again after collapse.

## Classification

- Type: Design Impact / implementation deviation from approved visual semantics.
- Owner for rework: implementation engineer.
- Boundary unchanged: left Workspaces tree remains execution identity/hierarchy; right Team -> Tasks remains task detail/content.
