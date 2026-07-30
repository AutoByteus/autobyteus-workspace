# Solution Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Result |
| --- | --- | --- | --- | --- |
| SR-001 | `solution_designer` initial investigation and solution package | `N/A` | `Initial Baseline` | `Design-ready` solution package: unsupported bare absolute Event Monitor Markdown destinations are reclassified as inert `invalid-file` links; supported local and HTTP(S) behavior is preserved. |

## Revision Entries

### SR-001 — Initial Event Monitor unsupported-link baseline

- Triggering role, report path, and round: `solution_designer`; user report in task context; initial solution round.
- Triggering finding IDs: `N/A`.
- Prior authoritative result: `N/A`.
- Current authoritative result: `Design-ready`.
- Why this baseline or revision entry is recorded: Establishes the first complete requirements, investigation, and design package before architecture review.
- Resolution: The false clickable affordance is caused by `resolveEventMonitorMarkdownFileDestination()` returning `not-file` for normalized bare absolute paths with `Unsupported` preview types. The existing ordinary Markdown anchor then survives with a root-relative `href`, while `MarkdownRenderer` has no file action ID or HTTP(S) action to dispatch. Return `invalid-file` for this case and reuse the existing inert span renderer path.
- Approved behavior or requirement IDs affected: BEH-001..BEH-005; R-001..R-005; AC-001..AC-005.
- Canonical artifacts and sections updated: `requirements.md` (design-ready requirements, health assessment, scope, acceptance criteria); `investigation-notes.md` (production paths, source log, probe evidence, design health, persisted-data decision); `design-spec.md` (behavior map, spines, ownership, file mapping, change sequence).
- Supplemental artifacts updated, added, or removed: None.
- Downstream and architecture-review impact: Architecture review should verify that the existing `invalid-file` path is the correct inert projection and that no requirement exists to open DMG/ZIP/PKG at the OS level. Implementation is expected to be a small pure-policy change plus focused tests/docs clarification.
- Next recipient or routing: `architecture_reviewer` for complete solution-package review.
- Remaining gaps or risks: User expectation for OS-level artifact opening is explicitly out of scope and would require a separate security/runtime design; browser-level validation proportionality remains for `api_e2e_engineer`.
