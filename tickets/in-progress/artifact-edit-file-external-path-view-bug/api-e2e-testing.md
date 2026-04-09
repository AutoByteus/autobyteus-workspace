# API / E2E / Executable Validation

## Stage 7 Status

- Ticket: `artifact-edit-file-external-path-view-bug`
- Current Status: `Passed`
- Validation Type: `Focused executable component validation`

## Scenario Coverage

| Scenario ID | Acceptance Criteria | Command / Method | Result | Notes |
| --- | --- | --- | --- | --- |
| `S7-001` | `AC-001` | `pnpm test:nuxt --run components/workspace/agent/__tests__/ArtifactContentViewer.spec.ts components/workspace/agent/__tests__/ArtifactsTab.spec.ts` | Pass | alternate-workspace absolute-path resolution covered in `ArtifactContentViewer.spec.ts` |
| `S7-002` | `AC-002` | same command | Pass | in-workspace `edit_file` fetch behavior remains covered |
| `S7-003` | `AC-003` | same command | Pass | one-time workspace catalog refresh covered |
| `S7-004` | `AC-004` | same command | Pass | `write_file` buffered preview non-regression covered |
| `S7-005` | `AC-005` | same command | Pass | focused suite passed cleanly |

## Environment Notes

- Fresh worktree preparation required:
  - `pnpm install --offline --frozen-lockfile`
  - `pnpm exec nuxi prepare`
- After preparation, the focused validation suite passed with 12/12 tests.
