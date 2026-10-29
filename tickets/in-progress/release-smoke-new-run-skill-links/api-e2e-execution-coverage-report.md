# API/E2E Execution Coverage Report

The run record and the result. The coverage investigation is the plan; `api-e2e-revision-record.md` is the history.

## Round

- Coverage investigation (the plan; it lists the upstream documents): `tickets/in-progress/release-smoke-new-run-skill-links/api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `tickets/in-progress/release-smoke-new-run-skill-links/api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `tickets/in-progress/release-smoke-new-run-skill-links/api-e2e-test-progress.md`
- Round and trigger: round 1. Implementation handoff IR-001 (direct route), started 2026-10-19. Resumed 2026-10-29 at the Solution Designer's request: the user asked to continue, after the SR-001 addendum confirmed the scope and the documented RELEASE.md step. The requirements are unchanged.
- Prior round reviewed: none
- Deviations from the investigation's plan, and why:
  - API-06b added (see the investigation).
  - API-08 ran on 2026-10-29 instead of 2026-10-19. The session ended while the run was waiting for Grok's quota.
  - Rebase onto the newer `origin/personal`: not done. Integration is delivery's step, and TESTING.md "Rerun by impact" applies when it happens.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/release-smoke-new-run-skill-links/tickets/in-progress/release-smoke-new-run-skill-links/evidence/`

## Routing Classification

- Task size: `Medium`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `27e197bd72` (+ temporary revert of the `src/` part of `810408bcee` for API-05 only) | macOS Darwin 25.5.0, Python 3.9.6, node 22 | claude 2.1.302, codex-cli 0.163.0, grok 1.0.62; vitest 4.0.18 | Release machine; host sign-ins (API-05); 2026-10-19 |
| ENV-2 | `27e197bd72` | as ENV-1 | as ENV-1 | Throwaway empty `HOME` (signed out). API-06: full `PATH`. API-06b: `PATH` limited to links to claude, codex, node plus system dirs (no grok) |
| ENV-3 | `917633e354` (code identical to `8f37ab5eb8`; later commits are ticket documents only) | as ENV-1 | claude 2.1.312, codex-cli 0.165.0, grok 1.0.70; vitest 4.0.18 | Release machine, normal user shell, host sign-ins; 2026-10-29 |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-01 | REQ-001, 004–006, 008; AC-004/005 logic | runner verdict logic | Reused IMP-01 | — | Pass | (IMP-01) | — | Ran on `8f37ab5eb8`; nothing outside the ticket folder has changed since |
| API-02 | AC-009 | production typecheck | Reused IMP-02 | — | Pass | (IMP-02) | — | No `src/` change on the branch |
| API-03 | AC-003, AC-009 | native and AGY suites alone, existing gates | Reused IMP-04, IMP-05 | — | Pass | (IMP-04, IMP-05) | — | Same code; both suites also ran in full inside API-05/06/06b/08 and passed every time |
| API-04 | AC-007 | RELEASE.md, TESTING.md | Doc review at the head, against AC-007 and the design guidance; anchor and commit split checked | ENV-1 | Pass | `API-04-doc-review.md` | Every row `Yes`; `8f37ab5eb8 docs(testing) … TESTING.md \| 1 +` | Observation 1 led to FU-002 |
| API-05 | AC-005, REQ-001, REQ-005; SCN-004a | full command over the real beta.2 regression | `git apply -R` of the `src/` part of `810408bcee`; `PATH=<without ~/.grok/bin> python3 scripts/release_smoke.py`; `git apply` to restore | ENV-1 | Pass | `API-05-smoke-regression-mutation.txt` | `Workspace skill path collision for 'link-probe-…'` (new run: claude, codex, grok); `ENOENT … realpath …/agent_teams/<team>/<member>` (team member: all three); `result    FAIL`, `exit=1`; `identical: yes` | 8 of 9 live cases fail with exactly the beta.2 symptoms. AGY/AutoByteus pass, as they should, because beta.2 did not affect them. Grok still ran because a second copy lives at `~/.local/bin/grok`, but it spent no tokens: every case failed before a turn |
| API-06 | AC-004, REQ-005; SCN-004b | full command, CLIs signed out | `env -i PATH="$PATH" HOME=<throwaway resolved> USER LOGNAME TMPDIR python3 scripts/release_smoke.py` | ENV-2 | Pass | `API-06-smoke-signed-out.txt` | `preflight: codex not available: ~/.codex/auth.json missing (codex not signed in)`; `grok model grok-4.7 is not offered; available: grok-4.5, grok-4.6`; `exit=1` | Fails closed in about 40 s. The signed-out Grok reason names the model, not the sign-in: FU-001 |
| API-06b | AC-004, REQ-005; SCN-004b | full command, Claude/Codex signed out, no grok | As API-06 with `PATH=/tmp/api-e2e-149/bin-nogrok:/usr/bin:/bin:/usr/sbin:/sbin` (links to claude, codex, node) | ENV-2 | Pass | `API-06b-smoke-signed-out-no-grok.txt` | `CLAUDE_RUNTIME_AUTHENTICATION_FAILED: Not logged in · Please run /login`; `grok … FAIL    not available: grok not on PATH`; `exit=1` | No hang (about 60 s). Codex rows show the turn's `Reconnecting... n/5`; the preflight line names the sign-in |
| API-07 | AC-004, AC-005, AC-006 | full command negative paths | Reused IMP-08 | — | Pass | (IMP-08) | — | Ran on `e8d2888695`; only RELEASE.md and TESTING.md have changed outside the ticket folder since |
| API-08 | AC-001, AC-002, AC-003, AC-006, AC-008; QR-001..003 | full command on the head, all five runtimes | `/tmp/api-e2e-149/api08.sh`: snapshots, `python3 scripts/release_smoke.py` from the repository root, snapshots | ENV-3 | Blocked | `API-08-smoke-full-run.txt` | 10 × `PASS`, including `grok        brand-new team member                    PASS` and `grok        different same-named skill               PASS`; `codex … FAIL … You’ve hit your usage limit … try again at Nov 4th, 2026 8:11 AM`; `models    {"claude": "haiku", "codex": "gpt-5.6-luna", "grok": "grok-4.7"}`; `duration  live 103s, antigravity 21s, autobyteus 9s`; four `before == after: yes` | Codex's 3 cases were refused by its ChatGPT account usage limit, an external quota: 07:11Z on 2026-11-04 (host CET). Codex run start itself worked: run created, member folder created on the first message, collision refused. Only the provider turn failed. Grok used 241,515 tokens |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 (one run on the commit: exit 0, every case PASS, commit and models listed) | Yes | API-08 (Blocked), API-01 (all-pass verdict path, unit) | Not Proven | Not a user-only check. It needs one run in which Codex has quota. Every one of the 13 cases has passed on equivalent code (Codex: IMP-07 on `e918bb6c44`; the live suite has changed since only in assertion messages, `cbbb868f63`). The worktree guard passed at the head. Not yet observed: one run where all 13 pass and it exits 0 |
| AC-002 (Claude, Codex, Grok each pass (a)–(d) through the real server and CLI) | Yes | API-08 (Claude, Grok at the head); IMP-07 (Codex all 3, `e918bb6c44`) | Proven per runtime | Codex at the head: run start proven up to the provider turn; the answer-from-skill step was last proven in IMP-07 |
| AC-003 (AGY and AutoByteus brand-new run and member, no provider call) | Yes | API-08, API-05, API-06, API-06b, API-03 | Proven | — |
| AC-004 (missing CLI / not signed in → non-zero exit, runtime and reason named) | Yes | API-07 (IMP-08), API-06, API-06b | Proven | Signed-out Grok's reason text: FU-001 |
| AC-005 (a failing scenario → non-zero exit, failing case named) | Yes | API-05 (the real beta.2 regression), API-07 (broken assertion) | Proven | — |
| AC-006 (models haiku / gpt-5.6-luna / grok-4.7; override used; unavailable model fails with the list) | No | API-08 models line; API-07 (bogus override with available list) | Proven | — |
| AC-007 (RELEASE.md and TESTING.md content) | Yes | API-04 | Proven | Cost wording refinement: FU-002 |
| AC-008 (worktree status unchanged; no user folders or CLI configs changed) | Yes | API-08 (`git status`, config hashes, `~/.autobyteus` and `~/.codex` listings identical), API-05 (status identical after restore), IMP-07 | Proven | — |
| AC-009 (typecheck passes; touched suites pass alone) | No | API-02, API-03 | Proven | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 75% | 85% | API-04..08, reused IMP checks | AC-001 has no single green run (Codex quota) | One API-08 rerun with Codex quota |
| Changed-boundary execution directness | 90% | 95% | API-05, 06, 06b, 08: the real command from the repository root | — | — |
| Cross-boundary integration realism and mock gap | 90% | 95% | Real CLIs and server (API-08); AGY scripted and native at factory level, by design (DEC-002) | Native skips the GraphQL run path (accepted in the design) | — |
| Environment, configuration, identity, and fixture fidelity | 90% | 90% | Release machine, normal shell, host sign-ins; throwaway HOME for signed-out | Codex account quota exhausted at run time | Rerun when the quota resets |
| Failure, edge-case, lifecycle, and recovery evidence | 90% | 95% | Real regression detected (API-05); signed-out (API-06/06b); missing CLI, bogus model, broken assertion (IMP-08); provider quota failures named (IMP-07 Grok 429, API-08 Codex limit) | — | — |
| User-surface, browser, and desktop-shell confidence | N/A | N/A | No UI or desktop change; the summary text is covered by directness | — | — |
| Durable regression coverage quality and relevance | 95% | 95% | 21 runner unit tests incl. title-existence check; AGY E09/E10 and native cases assert the real symptoms (links untouched, memory folder absent before, skill reached) | — | — |

- Overall post-repository confidence: 88%
- Overall final confidence: 92.5%
- Calculation method: simple average of the six applicable categories
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `No`. AC-001 has no single green run.
- Any final applicable category below `90%`: `Yes`. Requirement and acceptance-criteria proof is 85% (AC-001).
- Default final confidence target of `95%` met: `No`
- Confidence-limiting residual risks: AC-001's single green run waits for Codex's account usage limit, which resets 2026-11-04 07:11Z. The live tier's subscription quotas can block a real release check the same way: Grok takes about 240k of 600k tokens per run, and Codex has an account usage limit (FU-002).

## Broader Validation Decision (Mandatory)

- Decision: `Blocked`
- Execution mode: `CLI` (the release smoke command against the real Claude, Codex and Grok CLIs)
- Confidence gap or residual risk it addresses, and the expected gain: one run where all 13 cases pass and the command exits 0 (AC-001). That would raise AC proof to 100% and overall confidence to about 95%.
- Browser validation needed, and why or why not: No. The change is a CLI release check and server E2E suites, with no renderer or browser surface.
- If `Blocked`: the unavailable dependency is the user's Codex (ChatGPT) usage. Every Codex turn returns "You’ve hit your usage limit … try again at Nov 4th, 2026 8:11 AM". Tried: a full run on the head (API-08). A different Codex model would not help, because the limit is on the account. No other Codex sign-in is available. Resumes with one API-08 rerun (about 2–3 minutes, about 12 live turns) once the user's Codex usage is available.

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`. The stale model candidates and the `available[0]` fallback are gone; checked in the diff.
- Durable coverage added or retained only for compatibility-only behavior: `No`
- Upstream recipient notified: `N/A`

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `No`. API/E2E made no test changes; the implementation's added coverage was validated as `Still Valid`.
- Added or updated paths attached for proportional test-code review: `Not Applicable`

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Antigravity CLI | Scripted `agy-failure-cli.mjs` (by design, DEC-002) | No isolated signed-in recipe; a live run writes into the user's `agy` history | Proves the server path and capsule links, not paid inference |
| AutoByteus LLM | Deterministic LLM at factory level (by design) | The process composition has no LLM injection point | Skips the GraphQL/manager path (covered for other runtimes) |
| Signed-out CLIs (API-06/06b) | Throwaway empty `HOME` | Never sign out the user's real CLIs | A login that is present but expired was not reproduced |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Reverse-applied `810408bcee` `src/` (API-05) | Yes | `git apply` of the same patch | `git status` identical to the state before the mutation; never committed |
| Throwaway HOMEs `/tmp/api-e2e-149/home-*` | Yes | `rm -rf` | Removed |
| Runner-kept step logs (`release-smoke-x4jp8nrl`, `-yct2gukt`, `-bn81nebl`, `-oywcyhiw`) | Yes | Excerpts saved to evidence, then `rm -rf` | Removed |
| `/tmp/api-e2e-149/` scripts and snapshots | Yes | Left in `/tmp` (outside the worktree); evidence holds the results | — |
| Host CLI sessions created by live runs (Claude, Grok session stores; Codex used a throwaway `CODEX_HOME`) | Created in host stores, as for every live suite (requirements: Data Continuity) | none | As specified |

## Latest Authoritative Result

- Result: `Blocked`
- Criteria not proven, or parts only the user can check: AC-001 is not proven. It needs one green run, which is blocked by the Codex account usage limit, not by product or test behavior.
- Preliminary classification and recommended owner: `N/A` (not a failure). Follow-ups FU-001 and FU-002 are recorded in `follow-ups.md`.
- Next recipient: no handoff rule matches `Blocked`. The result goes back to the Solution Designer, who gave this task and talks to the user, with the question for the user.
- Notes: Options for the user:
  - Make Codex usage available (a reset on 2026-11-04 07:11Z, or added credits); API/E2E then reruns API-08 and, with 13 PASS and exit 0, completes `Pass` to delivery.
  - Or decide that the per-case proof above is enough for AC-001. That changes the verification basis, so it is the user's decision.
