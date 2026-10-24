# Follow-ups

## FU-001 — Core test-tree TypeScript policy/debt (not a release-build failure)
- Found during exploratory `autobyteus-ts/node_modules/.bin/tsc --noEmit -p autobyteus-ts/tsconfig.json`; evidence `evidence/IMP-TRIAL-01-ab-core-types.log`.
- Cause established by configuration/source: `tsconfig.json` includes every `tests/**/*` under strict typing, unlike the documented production `tsconfig.build.json` which excludes tests. Unchanged fixtures such as `tests/integration/agent/edit-file-benchmark-flow.test.ts` have untyped `paths` callback parameters; many similar test-only diagnostics are listed in the log. The own anchor-frame discriminant error from that exploratory run was fixed before initial source commit and production build passes. No claim that the exploratory full-tree typecheck passes.
- Disposition: follow-up, not a prerequisite for this ticket's prescribed production build/typecheck + executable Vitest checks. Broad test-fixture typing cleanup is outside shutdown/conflict scope. Solution Designer should send the finding when the ticket leaves the team; no automatic task/release created here.
