# API/E2E Coverage Investigation — autobyteus-355 (RELEASE.md beta user-action notes; per-runtime live model check with a Grok fallback)

The plan. Results are in `api-e2e-execution-coverage-report.md`.

## Investigation Meta

All paths are in `/Users/normy/autobyteus_org/autobyteus-worktrees/release-guide-notes-and-grok-smoke/tickets/in-progress/release-guide-notes-and-grok-smoke/`.

- Requirements Doc: `requirements-doc.md` (Approved, SR-001)
- Investigation Notes: `investigation-notes.md` (+ `investigation-probe-nested-beforeall.test.ts.txt`)
- Solution Revision Record: `solution-revision-record.md` (SR-001)
- Design Spec: `design-spec.md` (SR-001, Ready; D-1..D-4)
- Supplemental Task Artifacts: `handoff-architecture-design-complete.md`, `follow-ups.md` (FU-1)
- Design Review Report: `N/A — not applicable` (Small / Low, direct route)
- Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: `implementation-handoff.md` (IR-001)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report / Revision Record: `N/A — not applicable` (direct low-risk route)
- API/E2E Revision Record: `api-e2e-revision-record.md` (created with this round); this round `API-REV-001`
- Current Investigation Round: `1`
- Trigger: implementation complete (IR-001), message from `/software_engineering_team/implementation_engineer`

## Current Requirement And Design Basis

- **REQ-001/002, AC-001:** RELEASE.md and the notes template state when and how a beta carries the included tickets' `## What you need to do` sections. The step is added by hand after all four workflows succeed, and only the release body changes. Betas without such a section keep the generated notes alone.
- **REQ-003, AC-002:** a runtime's model or catalog problem in the live suite fails only that runtime's cases. The runner (`release_smoke.py`) attributes each runtime's setup error to that runtime's rows only.
- **REQ-004, AC-003:** without `GROK_E2E_MODEL`, Grok uses `grok-4.7` when offered, else the first offered model. The models line says so.
- **REQ-005, AC-004:** an explicit `GROK_E2E_MODEL` is strict.
- **REQ-006, AC-005:** no tokens, no keys.
- Preserved: the fail-closed verdict; Claude and Codex pins strict; the workflows untouched.

## Supported Scenarios And Real Usage

- **UC-002 as delivery runs it:** `python3 scripts/release_smoke.py` from the repository root. Its `main()` runs three steps and prints the summary and exit code. The implementation proved the parts on real logs (IMP-06: functions applied to the IMP-04/05 logs) and the live suite with Grok alone. It did not run `main()` itself or more than one live runtime at once.
- **RU-1, the full runner, token-free, with all three live runtimes enabled.** The runner always sets `RUN_CLAUDE_E2E`, `RUN_CODEX_E2E` and `RUN_GROK_E2E`.
  - Claude and Codex run signed out: a temp HOME, and no `USER`/`LOGNAME`, per TESTING.md. I checked first that they are signed out there: `claude auth status` → `"loggedIn": false`; `codex login status` → `Not logged in`.
  - Grok is the fake (`GROK_BUILD_COMMAND`).
  - Each runtime then fails for its own reason. This is the mixed shape AC-002 describes, in the real `main()` with the real vitest report and log, with no provider call that could succeed.
  - Run (a) has no override (Grok fallback); run (b) has `GROK_E2E_MODEL=grok-4.7` (strict miss).
- **UC-001 / UC-003 (AC-001):** a delivery engineer follows the new subsection. Its commands are checked read-only against an existing release: `gh release view … --json body --jq .body` and the concatenation. `gh release edit` is not run, because it would change a published release.
- Contrived (not tested): none.

## Changed Surface And Boundary Classification

| Surface | Affected | Repository Evidence | Gap | Mode |
| --- | --- | --- | --- | --- |
| Release script (CLI) | Yes | 23 runner unit tests (IMP-03); functions on real logs (IMP-06) | `main()` end to end with several runtimes | CLI run (RU-1) |
| Test suite setup (vitest) | Yes | Probe (IMP-01); fake-Grok runs (IMP-04/05) | Several runtimes failing at once in one file | RU-1 |
| Documentation | Yes | Wording in the handoff | Commands actually work as written | Read-only command check |
| Product code / API / UI | No | — | — | — |

## Project Execution Discovery

- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/release-guide-notes-and-grok-smoke`, HEAD `23d722096a` (code `6cc367a37e`, `927e343504`).
- Testing guideline: `TESTING.md` (Release smoke layer; clean environment; live gates; never the user's CLI configs). RELEASE.md "Release smoke check".
- The runner refuses a dirty worktree change (`worktree_row`). Nothing may be written into the worktree during the run; evidence is copied in afterwards.
- Secrets: none used. The real `claude`/`codex` stay signed out in the run's HOME, and the fake is the only Grok.

## Existing Durable Coverage Inventory

| Path | Intent | Validity | Action |
| --- | --- | --- | --- |
| `scripts/tests/test_release_smoke.py` (23) | Runner parsing, per-runtime errors, models line, verdict | Still Valid (IMP-03) | Reuse |
| `autobyteus-server-ts/tests/unit/e2e-helpers/live-model-choice.test.ts` (5) | Choice rule | Still Valid (IMP-02) | Reuse |
| `tests/e2e/runtime/workspace-skill-links-live.e2e.test.ts` | The live suite | Updated by the change | Exercised in RU-1 |
| `scripts/tests/fixtures/fake-grok-acp.mjs` | Token-free Grok | New | Used in RU-1 |

## Planned Cases

| Case ID | Criteria | Kind | Steps | Why |
| --- | --- | --- | --- | --- |
| API-01 | AC-002..AC-005 | Reused | IMP-01, IMP-02, IMP-03, IMP-07, IMP-08 | `git diff --name-only 927e343504 23d722096a` touches only `tickets/`; IMP-04/05/06 are covered again by API-02/03 through `main()` |
| API-02 | AC-002, AC-003, AC-005 | Journey (CLI) | `env -i PATH="$PATH" HOME=<temp, signed out> TMPDIR=<temp> GROK_BUILD_COMMAND=<fake> python3 scripts/release_smoke.py` | RU-1 (a) |
| API-03 | AC-002, AC-004, AC-005 | Journey (CLI) | As API-02 plus `GROK_E2E_MODEL=grok-4.7` | RU-1 (b) |
| API-04 | AC-001 | Review + read-only command check | Read the RELEASE.md diff and template as delivery would; run step 3's `gh release view` and the concatenation on the latest beta into a temp folder; grep for contradicting "generated notes" statements | AC-001 |
| API-05 | AC-005 | Log scan | Key-shape grep and `gitleaks` over the API-02/03 logs | AC-005 |

- Test progress log: `Yes`

## Durable Coverage To Add / Update / Remove

None.

## Not Tested / Infeasible

| Behavior | Reason | User-only? |
| --- | --- | --- |
| A real Grok, Claude or Codex turn | Spends tokens; it is the release-time check | Yes (the next release's smoke run, on the user's plans) |
| `gh release edit` | It would change a published release | Yes (delivery at the next beta with a user action) |

## Investigation Decision

- Proceed: `Yes`. Durable changes: `No`. Reroute: `No`.
