# DEL-30 Prompt-reading test files (delivery, merged state `7ac6b392c1` + `a1df50ecd4`)

TESTING.md ("Choosing the path", the row "A runtime's system prompt"): when a prompt changes, run every test in any
layer, gated suites included, that reads a run's composed prompt, and run each file found, because a test that checks how
a prompt ends or cuts it at a heading goes stale without listing a heading. This ticket adds two sections to every agent's
prompt, so the rule applies. The row was added to TESTING.md on the base (`7fffdadab7`) after this ticket's API/E2E rounds.

Command (run from the worktree root):

```text
git grep -l -E "promptOf|processedSystemPrompt|carpenterSystemPrompt|systemPrompt|baseInstructions|_meta\.rules|match\(/\^## |composedOf|instructionsExcerpt" \
  -- autobyteus-server-ts/tests/e2e autobyteus-server-ts/tests/integration test-support autobyteus-server-ts/tests/fixtures autobyteus-server-ts/tests/helpers
```

31 files: 27 test files (16 end-to-end, 11 integration) and 4 helpers or fixtures (`claude-live-agent-harness.ts`,
`collaboration-root-harness.ts`, `agent-runtimes-fake-cli.mjs`, `codex-thread-event-harness.ts`), which the test files use.
The unit layer was run whole (`DEL-07`: 1038 files, 8,613 tests), including `tests/unit/agent-execution/prompt` and its
snapshot. The one prompt snapshot (`collaboration-prompt-sections.test.ts.snap`) is a unit file.

| Test file | Gate | Run here | Result |
| --- | --- | --- | --- |
| `e2e/agent-definitions/agent-semantic-memory` | scripted AGY | `DEL-11` | pass (10) |
| `e2e/projects/collaboration-prompt-wording` | scripted AGY | `DEL-13` | **fail** CPW-P1, P2, P3: `collaborationPart` keeps the two new sections (Local Fix LF-2) |
| `e2e/runtime/configured-skill-on-demand-loading` | none | `DEL-13` | pass |
| `e2e/runtime/grok-build-runtime-replay` | none | `DEL-13`, `DEL-18` | catalog test failed once under load (FU-008), passes alone (10) |
| `integration/agent-execution/agent-run-prompt-fallback` | none | `DEL-10` | pass |
| `e2e/agent-definitions/agent-package-definitions-live-refresh` | scripted AGY | `DEL-20`, `DEL-22`, `DEL-26` | DCF-E2E-007 fails on the base too (FU-007); the other 9 pass |
| `e2e/projects/background-step-stop-own-view` | scripted AGY | `DEL-20` | pass |
| `e2e/projects/daily-assistant-collaborator` | scripted AGY | `DEL-20` | pass |
| `e2e/projects/delegator-view-follows-child` | scripted AGY | `DEL-20` | pass |
| `e2e/projects/own-stream-turns-read-once` | scripted AGY | `DEL-20`, `DEL-23`, `DEL-28`, `DEL-29` | first two runs: AGY discovery timeout; then 5 of 5 pass; passes on the base (FU-008) |
| `e2e/projects/project-run-history` | scripted AGY | `DEL-20` | pass |
| `e2e/projects/team-tab-subtree-messages` | scripted AGY | `DEL-20` | pass |
| `e2e/agent-definitions/json-file-persistence-contract` | none | `DEL-21` | pass |
| `integration/agent-execution/codex-segment-turn-rejection-logging` | none | `DEL-21` | pass |
| `integration/application-backend/brief-package-team-prompt` | none | `DEL-21` | pass |
| `e2e/run-history/history-list-read-timing` | scripted AGY + `RUN_HISTORY_LIST_TIMING` | not run (a gated timing measurement) | read: it only awaits that `promptOf` resolves, it never reads the text |
| `e2e/runtime/agent-semantic-memory-live` | real Codex, Claude, native | API/E2E `API-08` | pass (the memory proof held in all three Codex runs) |
| `e2e/runtime/claude-agent-websocket-interrupt-resume` | `RUN_CLAUDE_E2E` | not run (paid, real Claude) | read: it composes its own prompt and compares the SDK call's `systemPrompt` with the same value |
| `integration/agent-execution/claude-session-manager` | `RUN_CLAUDE_E2E` | not run (paid) | read: its `carpenterSystemPrompt` is an inline array in the test |
| `integration/runtime-management/claude/client/claude-sdk-client` | `RUN_CLAUDE_E2E` | not run (paid) | read: `systemPrompt: ""` |
| six Codex files: four under `integration/runtime-execution/codex-app-server/thread/` and two under `integration/runtime-management/codex/client/` | `RUN_CODEX_E2E` | not run (paid, real Codex) | read: `baseInstructions: null` |
| `e2e/secret-management/real-e2e-provider-capabilities` | `RUN_REAL_E2E` | not run (paid, real providers) | read: `systemPrompt: ''` |

The unrun live files build their own prompt (`null`, `""` or an inline value) and never read the production prompt's tail
or headings. Reading is how they are judged here, which TESTING.md says is not proof for a test that cuts or ends a
prompt. These files cut nothing: no `endsWith`, `slice` or `indexOf("## ")` on a prompt.
