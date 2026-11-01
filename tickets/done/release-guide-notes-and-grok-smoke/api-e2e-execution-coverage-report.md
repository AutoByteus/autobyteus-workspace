# API/E2E Execution Coverage Report — autobyteus-355

The run record and the result. The plan is `api-e2e-coverage-investigation.md`; the history is `api-e2e-revision-record.md`.

## Round

- Coverage investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/release-guide-notes-and-grok-smoke/tickets/in-progress/release-guide-notes-and-grok-smoke/api-e2e-coverage-investigation.md`
- Revision: `API-REV-001`; progress log `api-e2e-test-progress.md`
- Round and trigger: round 1, implementation complete (IR-001), direct low-risk route
- Prior round reviewed: `N/A`
- Deviations from the plan: none
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/release-guide-notes-and-grok-smoke/tickets/in-progress/release-guide-notes-and-grok-smoke/evidence/` (files `API-*`)

## Routing Classification

- Task size `Small`, architectural risk `Low`, input route `Direct Low-Risk`, successful-output route `Delivery`.
- Test-code review: `Not Required — direct low-risk route`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform | Runtime | Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `23d722096a` (code `6cc367a37e`, `927e343504`) | macOS 26.5.2 arm64 | Python 3, Node v22, vitest 4.1.12; `claude` 2.1.316, `codex`, the fake Grok `scripts/tests/fixtures/fake-grok-acp.mjs` | `env -i PATH HOME=<temp> TMPDIR=<temp> GROK_BUILD_COMMAND=<fake>`. In that environment Claude and Codex are signed out, checked before the run: `claude auth status` → `"loggedIn": false`, `codex login status` → `Not logged in`. No `USER`/`LOGNAME` (TESTING.md) |
| ENV-2 | same | macOS | `gh` 2.86.0 (signed in) | Read-only against the published `v1.5.11-beta.9` |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-01 | AC-002..AC-005 | vitest nested `beforeAll` probe, choice-rule unit tests, runner unit tests, typecheck of the changed tests, key/gate/hygiene | Reused IMP-01, IMP-02, IMP-03, IMP-07, IMP-08 | — | Pass | — | — | `git diff --name-only 927e343504 23d722096a` touches only `tickets/`. IMP-04/05/06 are superseded by API-02/03, which run the same paths through `main()` |
| API-02 | AC-002, AC-003, AC-005 | `release_smoke.py` `main()` end to end: preflight, three steps, real vitest report and log, `read_models`, `failed_suite_errors`, `evaluate`, summary, exit code. All three live runtimes enabled (the runner always enables them) | `cd <worktree> && env -i PATH="$PATH" HOME=<temp> TMPDIR=<temp> GROK_BUILD_COMMAND=<worktree>/scripts/tests/fixtures/fake-grok-acp.mjs python3 scripts/release_smoke.py` | ENV-1 | Pass | `API-02-release-smoke-run-a.console.log`, `API-02-run-a-live-step.log` | `models    {"claude": "haiku", "codex": "gpt-5.6-luna", "grok": "grok-4.5 (pinned grok-4.7 not offered)"}`. Each runtime's rows carry its own reason: claude `CLAUDE_RUNTIME_AUTHENTICATION_FAILED: Not logged in`; codex `RUNTIME_ERROR … Reconnecting…`; grok `ACP_PROMPT_FAILED … fake Grok refuses prompts`. `antigravity …PASS` ×2, `autobyteus …PASS` ×2; `result    FAIL`; `exit 1`. Live step log: `SKILL_LINKS_LIVE_MODEL {"runtime":"grok","model":"grok-4.5","pinned":"grok-4.7"}` | The expected outcome, given that this run is deliberately signed out. Grok is set up with the fallback model and its cases run (the fake refuses the prompt). Claude and Codex fail in their own cases without a successful provider call. The worktree guard stayed silent: no worktree change during the run |
| API-03 | AC-002, AC-004, AC-005 | As API-02, Grok strict override | As API-02 plus `GROK_E2E_MODEL=grok-4.7` | ENV-1 | Pass | `API-03-release-smoke-run-b.console.log`, `API-03-run-b-live-step.log` | `grok … FAIL    skipped: Error: grok model grok-4.7 is not offered; available: grok-4.5, grok-4.6` ×3, while the Claude and Codex rows show their own case results (`failed: … Not logged in`, `failed: … Reconnecting…`); `models    {"claude": "haiku", "codex": "gpt-5.6-luna"}`; AGY and AutoByteus `PASS` | **AC-002 core:** one runtime's setup miss fails only that runtime. The other runtimes' cases still ran in the same suite file, where before the change a single shared `beforeAll` miss stopped them all (design E-07/E-09) |
| API-04 | AC-001 | RELEASE.md and template, as a delivery engineer follows them | Read the diff; steps 2–3 run read-only on the latest beta, `v1.5.11-beta.9`: the merges in `git log v1.5.11-beta.8..v1.5.11-beta.9`, `gh release view v1.5.11-beta.9 --json body --jq .body > generated.md`, `{ cat actions.md; echo; cat generated.md; } > notes.md` with a sample `actions.md`; `gh release edit --help` for `--notes-file` | ENV-2 | Pass | `API-04-release-notes-steps-readonly.log` | `exit 0` for each command; `notes.md` starts `## What you need to do` then the generated body; `-F, --notes-file file`. The anchors `#beta-notes-with-a-user-action` and `#watching-the-rollout` exist; the pre-release workflow fact is kept, with "added afterwards by hand" | `gh release edit` was not run: it would change a published release. **Non-blocking wording note:** step 2's "the merges in `git log <previous-tag>..HEAD`" also lists base-refresh merges such as `Merge origin/personal into codex/atomic-agent-run-creation (delivery base refresh)` (seen for beta.9). `git log --merges --first-parent <previous-tag>..HEAD` lists only the ticket merges. A delivery engineer can tell them apart, so AC-001 holds. Separately, beta.9's published body already holds "Full Changelog" twice, which comes from the existing workflows, not this ticket |
| API-05 | AC-005 | Logs of API-02/03 | `gitleaks dir` on each run's log folder; key-shape grep | ENV-1 | Pass | `API-05-key-scan.log` | `no leaks found` ×2; `key-shape grep over 8 files: 0 matches` | Claude: no call possible (`Not logged in`). Codex: unauthenticated reconnect attempts only. Grok: the fake. No tokens spent |

## Acceptance-Criteria Proof

| AC | Critical | Proven By | Result | User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-04 | Proven | The first real `gh release edit` happens at the next beta with a user action (delivery, on the user's release request) |
| AC-002 | Yes | API-03 (real `main()`, three runtimes, one setup miss), API-02, API-01 (IMP-01, IMP-03) | Proven | — |
| AC-003 | Yes | API-02, API-01 (IMP-02) | Proven | — |
| AC-004 | Yes | API-03, API-01 (IMP-02) | Proven | — |
| AC-005 | Yes | API-05, API-02/03 (signed out, fake Grok) | Proven | — |

## Validation Confidence Scorecard (Mandatory)

| Category | Post-Repository | Final | Supports | Residual |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 90% | 95% | API-02..05 | — |
| Changed-boundary execution directness | 85% | 95% | The real runner `main()` with the real suite | — |
| Cross-boundary integration realism and mock gap | 85% | 95% | Real Claude and Codex CLIs (signed out), the server's real catalogs and runtimes; only Grok is a fake | A real Grok catalog without `grok-4.7` (xAI's list) is the next release smoke |
| Environment, configuration, identity, fixture fidelity | 90% | 95% | The runner's own clean environment; signed-out state checked first | — |
| Failure, edge-case, lifecycle, recovery | 90% | 95% | Fallback, strict miss, mixed failures, fail-closed exit 1 | — |
| User surface (CLI summary, guide) | 90% | 95% | Summary rows and models line; the guide's commands on a real release | Step-2 wording note |
| Durable regression coverage | 95% | 95% | 23 runner tests, 5 choice-rule tests | — |

- Overall post-repository: 89%. Final: 95%.
- Every critical criterion directly proven: `Yes`. No category below 90%. Target met: `Yes`.

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Mode: `CLI`. The full `release_smoke.py` as delivery runs it, made token-free by signed-out CLIs and the fake Grok; plus the guide's commands read-only.
- Gap addressed: the implementation applied the runner's functions to logs, but did not run `main()` or several live runtimes at once.

## Compatibility / Legacy Scope Check

- `No` compatibility mechanisms. The old single models line is gone, and the summary shows the new per-runtime form.

## Durable Coverage Changed In The Codebase

- None by API/E2E.

## Dependencies Mocked Or Emulated

| Dependency | Method | Limitation |
| --- | --- | --- |
| Grok CLI | `fake-grok-acp.mjs` (offers grok-4.5, grok-4.6; refuses prompts) | A real Grok turn: next release smoke |
| Signed-in Claude and Codex | Run signed out on purpose | Their passing path is the release-time check |

## Temporary Methods And Cleanup

| Item | Owned | Cleanup | Result |
| --- | --- | --- | --- |
| `/private/tmp/ab355-api` (temp HOME, run logs, API-04 scratch) | Yes | `rm -rf` after copying evidence | Removed |
| Published release `v1.5.11-beta.9` | No | Read only, never edited | Unchanged |
| The user's `~/.claude`, `~/.codex`, `~/.grok` | No | Never used: temp HOME | Untouched |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven: none. User-only: the first real `gh release edit` at the next beta with a user action.
- Next recipient: delivery engineer (direct low-risk route)
- Notes:
  - Non-blocking wording note on step 2 (`--merges --first-parent`).
  - The implementation's FU-1 is unchanged.
