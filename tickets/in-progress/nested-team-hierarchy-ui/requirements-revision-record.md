# Requirements Revision Record

The latest `requirements-doc.md` and `investigation-notes.md` remain authoritative.

## Revision Index

| Revision ID | Trigger / Round | Prior Status | Current Status | Affected Requirement / Behavior IDs | Result |
| --- | --- | --- | --- | --- | --- |
| RER-001 | Initial investigation and coherent requirements baseline from the user's hierarchy complaint and two screenshots. | N/A | Draft — Requirements Visualization Needed | BEH-001–BEH-005; REQ-001–REQ-012; AC-001–AC-008; DEC-001–DEC-003 | Current behavior mapped to Workspace history; hierarchy, responsive, accessibility, density, and preservation requirements defined; exploratory visual comparison required before approval. |

## Revision Entries

### RER-001 — Initial nested-team hierarchy readability baseline

- Triggering user feedback, prototype package, downstream feedback, or investigation evidence: User reported that a root team with nested subteams is difficult to understand in the current UI, could not determine whether color/font/display caused it, and supplied wide and narrow current-state screenshots.
- Prior authoritative status (`N/A` for `RER-001`): N/A.
- Current authoritative status: Draft — Requirements Visualization Needed.
- Requirement, behavior, acceptance-criteria, scenario, or decision IDs affected: `BEH-001`–`BEH-005`; `UC-001`–`UC-006`; `REQ-001`–`REQ-012`; `AC-001`–`AC-008`; `SCN-001`–`SCN-005`; `DEC-001`–`DEC-003`.
- Why this baseline or revision was recorded: Investigation established that the hierarchy exists structurally and nested disclosure works, but the current row language relies on subtle indentation and dense repeated metadata. A stable behavioral basis is needed for an interactive requirements comparison.
- Canonical artifact sections changed: All initial sections in `requirements-doc.md` and `investigation-notes.md`.
- Supplemental artifacts added, changed, or removed: Two externally stored user screenshots linked as current-state evidence; no requirements-owned visual artifact created.
- Prototype evidence or product decisions incorporated: No future-state prototype yet. Product Experience Evidence Gate selected `Requirements Visualization` to compare hierarchy grammar, team-node differentiation, and metadata density.
- User approval impact: No approval claimed. The visualizer must return for user clarification, after which the requirements package will be revised and presented for explicit approval.
- Downstream architecture or direct-implementation route impact: Routing assessment is deferred until requirements approval and readiness. Current evidence suggests a bounded frontend presentation change, but no route is classified yet.
- Remaining gaps, assumptions, or blocked decisions: `DEC-001` branch/group/hybrid treatment; `DEC-002` metadata density; `DEC-003` team-vs-agent styling.
- Next action or recipient: Apply dynamic handoff rules for `Requirements Visualization Needed`; Product Design & Prototyping should build a reviewable interactive comparison using the selected `autobyteus-web` frontend locator and return a review URL/artifact package to Requirements Engineering.
