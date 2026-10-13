# Handoff Summary — agy-docker-node-availability-diagnostics

## User Verification

- 2026-10-13, recorded by API/E2E in `api-e2e-execution-coverage-report.md`. The user tested an isolated desktop app built from `56b11aeae`. Signed out, it showed "Not signed in on this node. Run `agy` to sign in."; after `agy` sign-in, Antigravity was enabled with its models. The user's words: "it works … its working great" and "I verified the task is working".
- The integrated state (`6e1fbd7e5`) adds only the base's legacy Docker retirement, which doesn't touch the code for this feature. The same checks pass on it (below), so the verified behavior is unchanged.
- User decisions, 2026-10-13 (DR-002):
  1. **Release: none.** The user: "no need to release as i said. just finalize". The fix ships with the next release. The Done criterion "released and checked on the user's Docker node" is replaced by this decision; the user checks node 8003 after a later release.
  2. **`TESTING.md` wording: accepted.** The user's reply "i also verified" came as delivery was setting the note aside for lack of confirmation, so delivery took it as approval. It is committed on its own as `15625371b` (`docs(testing): …`).

## State For User Verification (DR-001)

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-docker-node-availability-diagnostics`, branch `codex/agy-docker-node-availability-diagnostics` (pushed at finalization; the worktree is removed).
  - `87b246c7d`: IR-001, the fix (server classifier, menu row, re-check, locales, docs).
  - `56b11aeae`: IR-002, the shorter sign-in text the user chose.
  - `eb98574bf`: checkpoint. Adds the durable GraphQL E2E `autobyteus-server-ts/tests/e2e/runtime/agy-runtime-availability-graphql.e2e.test.ts` and the SR-004/SR-005 and API/E2E records.
  - `6e1fbd7e5`: merge of `origin/personal` @ `32aca0818` (legacy personal Docker retirement). It merged without conflicts; `autobyteus-server-ts/docker/README.md` combines both sides correctly.
  - `15625371b`: `docs(testing)`, the approved `TESTING.md` note (DR-002).
  - `c148ccceb`: the archived ticket and delivery records.
  - `f615a69c7`: the `--no-ff` merge into `personal`, pushed. The ticket worktree and local branches were removed; the remote ticket branch is kept.
- Base and finalization target: `origin/personal` (see `RELEASE.md`).
- Classification: `task_size=Small`, `architectural_risk=Low`. Route: direct; architecture, source and test-code review are N/A.
- Not to be committed: the untracked `autobyteus-application-backend-sdk/dist/` and `autobyteus-application-sdk-contracts/dist/`.

## What Changed

- **Server.** When `agy` is installed but signed out, availability, run start, model replacement and application launch validation all report "Not signed in on this node. Run `agy` to sign in." The CLI output is only matched, never echoed. The not-found and too-old texts are clearer. No GraphQL schema change.
- **Model menu.** An unavailable runtime shows "Unavailable" ("不可用") with the server's reason under its name, at most two lines. It stays non-selectable and is skipped by the arrow keys. "Not installed" is gone from the menu.
- **Re-check on open.** Each time the menu opens, only runtimes shown as unavailable are checked again, so a sign-in shows without an app reload.
- **Docs.** The AGY module doc, the web chat doc and the Docker README's CLI auth section.

## Checks On The Integrated State (`6e1fbd7e5`)

Logs are in `delivery-evidence/dr-001/`. All passed:

- server: the AGY GraphQL E2E, plus the runtime-management, AGY backend, run-model-selection and launch-validator unit tests. 44 files passed, 4 skipped; 478 tests passed, 6 skipped;
- web: `ChatModelMenu.spec.ts` and `useChatModelCatalog.spec.ts`, 17/17;
- `pnpm -C autobyteus-server-ts typecheck`;
- `scripts/check_licensing.py` and `scripts/check_repository_artifact_hygiene.py`. Hygiene runs again before the final commit, once the new ticket files are tracked.

The full suites ran on IR-001: server unit 5364, web 4241. API/E2E proved the behavior live on a test-owned Docker node with real `agy` 1.3.3: signed out, signed in, and a real run (AC-006).

## Residual Risks

- RSK-001 (accepted): if a future `agy` rewords its sign-in message, the reason falls back to the generic "discovery failed" text, never "Not installed".
- RSK-002 (accepted): while signed out, each menu open runs `agy` (about 2 s) in the background.
- By design, available runtimes are not re-checked on open. A sign-in that lapses while the app is open shows its error when you send, and the row shows Unavailable after a reload.
- The Electron shell was covered only by the user's manual check; no shell code changed.

## Artifacts

All are in this folder: requirements, investigation, solution revision record, design, solution handoff, implementation handoff and revision record, API/E2E coverage investigation, execution report, revision record and ledger, evidence, `docs-sync-report.md`, `release-notes.md`, `release-deployment-report.md` and `delivery-revision-record.md`.
