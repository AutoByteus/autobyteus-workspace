# Handoff Summary — model-settings-reality

- Project Task: `autobyteus-9`
- Classification: `task_size` `Large`, `architectural_risk` `High`. Route: `Reviewed` (architecture review ARCH-REV-001..003; source review CRR-001..004; API/E2E API-REV-001..003, final confidence 95%; test-code review CRR-005 and CRR-006).
- Branch: `codex/model-settings-reality`, integrated with `origin/personal` @ `358771e83` (merge `ce929a9f4`, method: merge). Bootstrap base `fd0eb664c`.

## What changed for users

- **Claude thinking settings tell the truth.**
  - AutoByteus runtime: Opus 5 "Off" really turns thinking off. Fable 5 and 5.1 offer effort only. Switch rows (Opus 5, Sonnet 5, Sonnet 5.5, Haiku 5.5) default to On, as Anthropic does. Off never sends an effort.
  - Claude Agent SDK runtime: effort only, no invented default (untouched shows "Default" and sends nothing), and no `thinking` option is sent to the CLI.
- **Only the settings a model declares reach providers and new runs.** A stored key the model no longer declares is dropped at the provider boundary and is not copied into a new run. Old runs holding such keys resume.
- **Model pickers read the current list.** Every picker (new-run picker, launch config, application launch profile, the phone's model sheet, a saved run's menus) re-reads its runtime's list when it opens and on "Refresh models"; the AutoByteus runtime's discovered providers (Ollama, LM Studio, custom) are re-discovered. A failed refresh keeps the list shown and offers Retry.
- **A refused Save says why and what to do.** It names the model and scope, says nothing was saved, and says to refresh the model list and choose again. An unreadable list is its own result (`model_list_unavailable` / `MODEL_LIST_UNAVAILABLE`, `modelListReadable: false`): the menu keeps its options, shows "Couldn't refresh models" with Retry, and a saved model is not marked "No longer offered".
- **Docs:** the LLM module docs (autobyteus-ts), `llm_management.md`, `run_history.md`, web `chat.md` and `GLOSSARY.md` describe the delivered behavior.

## Delivery integration

- The base had advanced 107 commits since bootstrap. Checkpoint commit `8c1bb4b94` (the code reviewer's two uncommitted round-2 review documents), then `git merge --no-ff origin/personal` → `ce929a9f4`.
- Four conflicts, all resolved by keeping both sides' intent: `claude-session-config.ts` (the base added `additionalDirectories` for agent semantic memory; this ticket removed the `thinking` option; the merged file has the first and not the second) and its unit test (expectation: `additionalDirectories: []`, effort only, no `thinking`); `native-runtime-live-harness.ts` and `available-agent-runtimes-graphql.e2e.test.ts` (the base's autobyteus-447 owner-credential attachment replaces the ticket's explicit credential header; those two files now match the base apart from one ticket line, `entry.isFile()`).
- Integrated-state checks: see `release-deployment-report.md`, "Initial Delivery Integration Refresh". All pass except two autobyteus-ts `run-bash` tests that need a non-root user (container runs as uid 0; the base ticket's tests, unrelated).

## Verification

- Verified from the evidence (API-REV-002 at 95%, API-REV-003 changed no case or score): every critical acceptance criterion is directly proven; details in `release-deployment-report.md`, "Verification". No user check was required.
- **Optional user check (not a gate):** the Electron embedded-server environment. No Electron shell code changed and the same renderer + server behavior is proven on the real stack, but an isolated Electron instance could not run in the container. Steps (`api-e2e-execution-coverage-report.md`, Acceptance-Criteria Proof, last row): `AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault pnpm --silent isolated-app start --build`; put a different Claude CLI earlier on `PATH` by symlink (`CLAUDE_CODE_EXECUTABLE_PATH` does not pass into the embedded server); open a model picker and a stopped Team's member settings and expect the new list on open.

## Release

- No release requested; `RELEASE.md` defaults to none. The change ships with the next release. A beta or stable release is available on request.
- Not run (needs the release runner): macOS packaging, signing, notarization, electron-builder, Linux packaging, "Verify bundled Prisma". The fresh-start build (API-18) passed the rest of the release job's chain. `autobyteus-web/generated/graphql.ts` is a build input of this change; no release workflow, runner image or build step changed.

## Follow-ups (for the Solution Designer to send)

- FU-001, FU-002, FU-003, FU-005, FU-006, FU-007, FU-008, FU-009, FU-010 in `follow-ups.md`; none urgent. Delivery added none.

## Known residuals

- Failures not caused by this change: web `projectRunsStore.spec` (FU-005); server and autobyteus-ts tests that depend on a non-root user (uid-0 container); a pairing-auth teardown race (FU-008); the phone probe's health check of port 8000 when a real node listens there (FU-009).
- Not proven live: projected requests for non-Anthropic providers (no vault keys), proven by per-adapter request-capture units; the delegated copy's locked menu in the UI (server path and store merge covered).
