# Solution Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Result |
| --- | --- | --- | --- | --- |
| SR-001 | `solution_designer` initial investigation baseline | `N/A` | `Initial Baseline` | Requirements refined/design-ready; root cause identified; design ready for architecture review |

## Revision Entries

### SR-001 — HTML preview resource-identity baseline

- Triggering role, report path, and round: `solution_designer`; initial solution package baseline; no prior report.
- Triggering finding IDs: `N/A`.
- Prior authoritative result: `N/A`.
- Current authoritative result: Requirements are `Design-ready`; investigation is complete; design specifies a context-gated HTML static URL with a loaded-content Blob fallback for local absolute paths.
- Why this baseline or revision entry is recorded: The user's symptom was traced end-to-end and reproduced at the viewer URL-selection boundary.
- Resolution: Preserve the existing Event Monitor/File Explorer/Electron/server owners. Complete the existing `relativeResourceContext` handoff into `HtmlPreviewer`; use workspace static URLs only for explicit workspace context and Blob content otherwise. Do not relax server containment.
- Approved behavior or requirement IDs affected: BEH-001–BEH-004; RQ-001–RQ-004; AC-001–AC-005.
- Canonical artifacts and sections updated: `requirements.md` (current/desired behavior, requirements, acceptance criteria); `investigation-notes.md` (production trace, probe evidence, root cause, target direction); `design-spec.md` (behavior map, spines, interface, file mapping, sequence, test intent).
- Supplemental artifacts updated, added, or removed: None.
- Downstream and architecture-review impact: Architecture review should verify that explicit file-resource identity is the right existing boundary, that local Blob fallback does not broaden access, and that workspace static behavior remains covered. Implementation should not begin until the architecture gate passes.
- Next recipient or routing: `architecture_reviewer` with the cumulative mandatory solution package.
- Remaining gaps or risks: Focused implementation/API-E2E validation is still pending; local HTML relative-asset behavior from Blob content remains a bounded residual risk; server tests were not executed in this worktree because server Vitest dependencies are absent.
