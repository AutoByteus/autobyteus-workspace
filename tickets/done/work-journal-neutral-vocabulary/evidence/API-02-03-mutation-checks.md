# API-02/API-03 mutation checks (do the new durable tests fail when the behavior is broken?)

Date 2026-10-30, worktree source at 40fb8233d5, each change reverted with `git checkout` right after its run (`git status --short -- src` clean afterwards).
Command each time: `env -i PATH HOME=<temp> TMPDIR pnpm exec vitest run tests/e2e/memory/work-journal-neutral-vocabulary.e2e.test.ts --no-watch`

| Mutation (production source) | Result | Failed case(s) |
| --- | --- | --- |
| A: `memory-index-pipeline.ts`: Rebuild passes `false` instead of `request.kind === "rebuild"` | 1 failed / 4 passed | "Rebuild regenerates a closed file whose manifest already has the current revision; Index now leaves it" (timed out waiting for the marker to go) |
| B: `journals-step.ts`: fingerprint without `renderer:<revision>` | 1 failed / 4 passed | "the first catch-up pass replaces every journal in place ... a second start renders nothing" |
| C: `skill-load.ts`: `skillNameOfPlainRead` returns `null` | 3 failed / 2 passed | the three build cases (neutral lines, same job on every runtime, search) |
| D: `platform-line-parts.ts`: refusal (`accepted === false`) branch disabled | 3 failed / 2 passed | the two build cases that assert `failed: <message>` and the catch-up case |

Unmutated: 5 passed (API-02-03-neutral-vocabulary-e2e.log).
