# IR012 local checks

All commands run from worktree root, exact argv/cwd/timestamps/exits in adjacent JSON. Logs are new IR012 outputs; owner evidence unchanged.

| Check | Result | Scope |
|---|---|---|
| pnpm -C autobyteus-web guard:web-boundary before |exit1, expected reproduced failure|Four direct core imports at old services test path; stale-link branch absent|
| same mandatory guard after |exit0|No guard/manifest change; not full build|
| test:nuxt selected4files --run |19 Pass|Native2 + identity12 + guard3 + existing Electron dependency2; no product environment|
| test:nuxt tests/integration/native-accepted-input-history.integration.test.ts --run |2 Pass|Exact documented standalone command; same two cases, do not add to19|
| native body identity and source preservation |Pass|Entire mock/test body unchanged; all17 production hashes match IR011|
| tracked diff --check |exit0|TESTING.md|
| new native and guard test no-index --check |exit1 each, logs empty|/dev/null differs from these untracked files; explicit whitespace scan Pass in whitespace-check.json|

No emit/build, dependency install, server Vitest DB setup, full typing, broad suite or app launch. Existing core dist is unchanged and current to IR011 native source implementation. Tests use disposable native memory and controlled providers, close their own runs; guard fixtures remove only their own temp directories. No user data/provider budget. Prior7181web diagnostics/OOM/7078 remain non-green and were not rerun.
