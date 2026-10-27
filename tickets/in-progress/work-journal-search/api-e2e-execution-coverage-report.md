# API/E2E Execution Coverage Report

## Round

- Coverage investigation (the plan; it lists the upstream documents): `tickets/in-progress/work-journal-search/api-e2e-coverage-investigation.md` (round 2: § Round 2 Rerun Plan)
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-002`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 2. The code reviewer passed CRR-005 on SR-006, which:
  - removes strength labels (UD-020);
  - replaces them with factual notes: `matchedWords` and `wordsNotFound`;
  - revises the page (UD-021).
  The branch is at `5b16e1fe4a`; the code at `3204aa2455`.
- Prior round reviewed: round 1 (`API-REV-001`, Fail F-001 on `41501c5a41`).
- Deviations from the investigation's plan, and why:
  - **Freshness probe.** The first API-L08r2 attempt used round 1's freshness probe, which still asked for the removed `strength` field, so every poll was a GraphQL error. The word was findable when queried correctly. I wrote `API-PROBE-freshness-r2.mjs`, which exits on errors, and repeated the case.
  - **Evaluation command.** The first run was cut by my shell's 15-minute limit and left no report; it ran again to completion (18 min, mostly the new term census).
  - **AC-002 load.** I waited until the 1-minute load average fell below 12; an idle reference machine was not available.
  - **API-L06 (native agent) not rerun.** The tool result is built by one manifest for both entry forms. `search-memory-tool.test.ts` ("one contract for both entry forms") passed on this code (IMP-29), and the native path was proven with real agents in round 1.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/work-journal-search/tickets/in-progress/work-journal-search/evidence/api-e2e/` (the handoff gives the commit). Private outputs, which show question texts, real journal text and agent transcripts, are in `/Users/normy/autobyteus_org/autobyteus-delivery-receipts/work-journal-search-evidence/api-e2e/` (round 2: `r2/`).

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required` (API-D01)

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `5b16e1fe4a` (code `3204aa2455`); round 1 `06fdc1306a` | macOS (Darwin 25.5) arm64, M1 Max, 64 GB; shared host | Node 22.23.1 | Load recorded with every timing (round 2: 8–61) |
| ENV-D2 | `5b16e1fe4a` | same | Packaged desktop `isolated-app start --build --data-root` → `iso-55187-0f43`; again `--from-worktree` → `iso-62325-1afc` | Data root `/private/tmp/wjs-api2/root`. Memory: a fresh APFS clone of the implementer's copy `/tmp/wjs-copy/memory` (3,680 runs; journals kept, because the pipeline is unchanged; none of round 1's test chats). Granite R2. `CODEX_HOME` is a throwaway home. The Project Task Manager package has `search_memory` selected (17 tools). Browser locale German |
| Round 1 | `06fdc1306a` | same | ENV-D, ENV-S, ENV-2, ENV-K (see `api-e2e-revision-record.md` API-REV-001) | — |

## Cases

Evidence paths are relative to the evidence folder. Round-1 cases marked "still valid" are unchanged in what they exercise; the investigation's § Round 2 Rerun Plan gives each reason.

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-R01 | all server | Impacted server unit suites, memory e2e (clean env), build | Reused: IMP-29, IMP-30 (`3204aa2455`) | — | Pass | `../IMP-29-server-tests-cr004-cr005.log`, `../IMP-30-server-build.log` | `Tests  650 passed \| 2 skipped (652)`; e2e `Tests  20 passed \| 3 skipped (23)`; `exit 0` | On the code under test |
| API-R02 | AC-011, R-015 | Web memory specs; page probe | Reused: IMP-25 web part (`e7a15930c3`), IMP-28 (`606d13b937`, server `dist` at `e7a15930c3`) | — | Pass | `../IMP-25-tests-ir004.log`, `../IMP-28-memory-page-probe/` | `Tests  121 passed (121)`; probe `"result": "Pass"`, 23 checks | Web product code unchanged after `e7a15930c3` (only the probe file); the server's word rule changed after IMP-28, so the page on the final code is API-L02r2 |
| API-D01 | AC-006 | Discovery | Round 1 (`06fdc1306a`) | ENV-1 | Pass (still valid) | `API-D01-discovery-imports-test.log` | `Tests  4 passed (4)` | The test and discovery are unchanged |
| API-R03 | — | Server build | `pnpm -C autobyteus-server-ts build` | ENV-1 | Pass | `API-R03-r2-server-build.log` | `exit 0`; `Built-in agents bootstrap smoke check passed.` | — |
| API-L01 | AC-008, R-005, R-013 | First build | Round 1. Round 2's Index now (journals already current): journals 56 s, text 2 min 30 s, meaning complete 41 min after text (load 10–60) | ENV-D2 | Pass (still valid) | `API-L01-01-first-build-timeline.txt`; round 2 status file private (`r2/build-status.jsonl`) | round 1 `journals 1 min 52 s`, `text 3 min 30 s` | Pipeline unchanged |
| API-L02r2 | AC-011, R-002 (UD-020, UD-021), R-009 | Desktop Memory page | Search two cues; read the note, the match rows and labels; open a match by clicking the row; Back | ENV-D2 | Pass | `API-L02r2-01-result-cards-and-notes.txt` (screenshots private) | `memory-search-some-not-found`, `bg-white`, `Not found in your memory: codenamed, pelicanmarigold9152.`; `memory-search-none-found`, `amber-50`; `Words: project`; `strengthWords: false`, `mentionedPrefix: false`, `openButton: false`; banner `· lines 87–129 · Words: updater, ddns` | — |
| API-L03, API-L07, API-L09, API-L12, API-L13 | AC-010, AC-013, CR-001, AC-006, Docker runtime | — | Round 1 | Round 1 envs | Pass (still valid) | Round 1 files | — | Unchanged in what they exercise |
| API-L04r2 | **AC-001, AC-002**, AC-003, AC-004, AC-005, **AC-007** (word facts) | (1) page search over HTTP; (2) R-016 evaluation command on the instance's own index | (1) `probes/API-PROBE-graphql-gates-r2.mjs <graphql> <file> --rounds 2`; (2) `evaluate-memory-search.mjs --memory-dir <root>/server-data/memory --index-dir <root>/server-data --questions <SR-006 file> --model granite… --asking-run solution_designer_8062…` | ENV-D2 | Pass | `API-L04r2-01-gates.txt` | `gate1 {"passed": 31, "oneSearchTop10": 30, "withinThreeSearches": 31}`; `"top3": 26, "top3Share": 0.8387…, "p90Ms": 742, "maxMs": 1034`; `textMatches {"total": 703, "withoutWords": 0}`; `"mismatches": []`; HTTP `"p90Ms": 678, "maxMs": 1164` | Load 10–17; `offTopicUnnamed` N02 (R-15) and OT-C3/S3 (my own round-2 chat put the codename into memory) |
| API-L14 | **AC-007** (F-001 cues), UD-020 | Page search (GraphQL), complete Text index | `probes/API-PROBE-offtopic-r2.mjs <graphql>`; census `grep -o -i -w` over every journal for each named word | ENV-D2 | Pass | `API-L14-01-offtopic-named-words.txt` | `"strengthField": false`; `"passed": 11, "of": 11`; e.g. `None of these words appear in your memory: pelicanmarigold9152.`; census: no output (0 occurrences of the 10 named words in 7,429 files) | Run before any round-2 chat |
| API-L05r2 | AC-012, AC-002 (steps) | Codex runtime, MCP adapter, new result shape | 3 questions phrased "Please search your memory: …" | ENV-D2 | Pass | `API-L05r2-01-codex-agent-new-result-shape.txt` (tool calls private) | absent codename: `wordsNotFound ['orchidtundra5520']` → "I couldn’t find orchidtundra5520 in my memory …"; Q07: 1 search, 1 read, right run; Q01: reached the DDNS run; `Not found in your memory: ddclient.` | — |
| API-L06 | AC-012 (native) | Native tool | Round 1; shape covered by `search-memory-tool.test.ts` (IMP-29) | — | Pass (still valid) | Round 1 `API-L06-01-…` | — | See Deviations |
| API-L08r2 | **AC-009** | Running app: live update | Codex turn with a new word; `probes/API-PROBE-freshness-r2.mjs` started before sending | ENV-D2 | Pass | `API-L08r2-01-turn-findable-by-text.txt` | `"foundAtMs": 42174` from probe start = 21.2 s after the 05:29:56 reply; `TEXT:lynxcarmine5061` | The void first attempt (probe defect) is recorded in the same file |
| API-L10 | Model change | — | Round 1 | Round 1 | Pass (still valid) | Round 1 files | — | Facade notes for model change are unchanged |
| API-L11r2 | DS-006, R-009 timing | Restart | Start again on the same data root; status and search every 2.5 s | ENV-D2 | Pass | `API-L11r2-01-restart-notes.txt` | catch-up `BUILDING` → `wordsNotFound []`; then `READY` → named; then `None of these words appear in your memory: pelicanmarigold9152.` | Round 1's process checks still valid |
| API-R05 | — | Repository checks | `python3 scripts/check_licensing.py`; `python3 scripts/check_repository_artifact_hygiene.py` | ENV-1 | Pass | `API-R05-r2-licensing-hygiene.log` | `Licensing is consistent.`; `Repository artifact hygiene check passed.` | After the commit |

## Findings

- **F-001 (round 1) is resolved by design (SR-006, UD-020).** No strength label exists anywhere: the schema has no `strength` field and the page shows no Strong/Fair/Weak. Every off-topic cue names its absent words, which a census confirms are absent (API-L14). The evaluation finds 0 named-word mismatches over 47 questions (API-L04r2). An agent told "Not found in your memory: orchidtundra5520." answered honestly (API-L05r2).
- New findings: none.
- Observations:
  - **O-1 (round 1, unchanged).** Agents need "search your memory" in the request to use the tool reliably (the user's direction).
  - **O-3 (round 1, unchanged).** Runs that asked about the same thing compete with the run that did the work. Q01 is #2–#3; still within gates.
  - **O-6 (new, non-blocking).** With no results the note is "No matches; try other words." even when `wordsNotFound` names the words: right after a restart, before the meaning job loads, for 2.5 s (API-L11r2). This is the specified order (no results first). The page and tool still carry `wordsNotFound`.
  - **C-12 (the reviewer's).** Link markup is indexed, so a link-only token can be named as found. I did not observe it in my cues (the found words were `project`, `dashboard`, `run`, `practice`, `reminders`, `tuned`, `supplier`, `contract`, `decide`).
  - **O-2.** The index store size is unchanged by this round.

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-L04r2 (31/31; Q13 at search 3) | Proven | — |
| AC-002 | Yes | API-L04r2: top 3 26/31 = 84%; p90 742 ms, max 1,034 ms in-process (HTTP 678/1,164 ms) at load 10–17. API-L05r2: Q07 in 2 steps | Proven (no idle reference machine; lowest load reached) | — |
| AC-003 | Yes | API-L04r2 (Q01 #2), API-L05r2 | Proven | — |
| AC-004 | Yes | API-L04r2 (5 Chinese questions in the top 10), API-L05r2 (Q07) | Proven | — |
| AC-005 | Yes | API-L04r2 (`unmaskedSecrets 0`) | Proven | — |
| AC-006 | Yes | Round 1: API-L12, API-D01, API-L05 | Proven (still valid) | — |
| AC-007 | Yes | API-L14, API-L04r2, API-L02r2 | Proven | — |
| AC-008 | Yes | Round 1 API-L01; round 2 build consistent | Proven on the copy | The build on the user's own memory needs the user's approval and a backup; delivery takes it to the user |
| AC-009 | Yes | API-L08r2 (21.2 s); round 1 API-L08, API-L09 | Proven | — |
| AC-010 | Yes | Round 1 API-L02, API-L03; API-L04r2 | Proven | — |
| AC-011 | Yes | API-L02r2, API-R02; round 1 API-L01…L03, API-L10 | Proven | — |
| AC-012 | Yes | API-L05r2 (Codex/MCP); round 1 API-L06 (native) | Proven (with "search your memory"; O-1) | — |
| AC-013 | Yes | Round 1 API-L07 | Proven (still valid) | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 85% | 95% | Every AC on real data and real agents; AC-007 checked by census | Latency on a shared host | An idle reference machine |
| Changed-boundary execution directness | 90% | 95% | The new fields through GraphQL, the page and the MCP tool | — | — |
| Cross-boundary integration realism and mock gap | 85% | 95% | Real models, real Codex, real memory copy | — | — |
| Environment, configuration, identity, and fixture fidelity | 80% | 90% | Packaged desktop on a copy of real memory | Copy from 2026-10-21; shared host | The user's own build (delivery) |
| Failure, edge-case, lifecycle, and recovery evidence | 85% | 95% | Restart timing of the notes, absent words, contamination understood | — | — |
| User-surface, browser, and desktop-shell confidence | 90% | 95% | Electron page cards and notes; probe IMP-28 | — | — |
| Durable regression coverage quality and relevance | 90% | 95% | Evaluation census (mismatches, words) and off-topic set now in the R-016 file; unit tests; API-D01 | — | — |

- Overall post-repository confidence: 86%
- Overall final confidence: 94% (simple average)
- Calculation method: simple average.
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `No` (94%). The gap is environment fidelity: a shared, non-idle host and a 6-day-old copy of memory. No executable surface here closes it; the first build on the user's own memory is the user's step.
- Confidence-limiting residual risks:
  - latency on an idle reference machine is not measured;
  - O-1;
  - O-3;
  - C-12;
  - Windows, Linux and macOS x64 builds.

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed).
- Execution mode: `Project Desktop Validation`, `Live API`, `Lifecycle`.
- Confidence gap: the new result shape and notes through the real page, the MCP tool and real agents; AC-007 as a fact check against the real index; the gates on the new search; restart timing of the absence note.
- Browser validation needed: yes (the page changed); done in Electron.

## Desktop Application Validation

- Approach executed: an isolated packaged instance on a test-owned data root (memory clone), CDP-driven; restarted on the same root.
- Cases: API-L02r2, API-L05r2, API-L08r2, API-L11r2, API-L14 (web-equivalent and lifecycle).
- Effect on any already-running desktop application: `None`.
- Behavior not directly proven: Windows, Linux and macOS x64 builds.

## Persisted-Data Transition Checks

- Approved persisted-data decision: unchanged (store and vectors `Discard or Rebuild`; journals `Directly Usable — No Migration`).
- Round 2: the store schema dropped the `chunk_vocab` view (it is created no longer). A store built before carries an unused view; this round built a fresh store, so that path was not exercised. It is harmless by reading, and the store is rebuildable.
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No` (strength removed everywhere: schema, tool, page).
- Durable coverage added or retained only for compatibility-only behavior: `No`
- Upstream recipient notified: N/A

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed: `Yes` (round 1; none this round)

| Path / Test | Change | Case IDs | For A Removal |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/unit/memory-search/memory-run-discovery.test.ts`: "never finds runs imported from another node by Memory Sync (AC-006)" | Added in round 1 (commit `06fdc1306a`) | API-D01 | — |

- Added or updated paths attached for proportional test-code review: `Yes`

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| The user's memory | APFS clone of the implementer's isolated copy | Task rule; TESTING.md | Copy from 2026-10-21 |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Probes (round 2: `API-PROBE-offtopic-r2.mjs`, `API-PROBE-graphql-gates-r2.mjs`, `API-PROBE-freshness-r2.mjs`) | Yes | Kept as evidence | Kept |
| Instances `iso-55187-0f43`, `iso-62325-1afc`; data root `/private/tmp/wjs-api2/root`; throwaway `CODEX_HOME`; test agent package; sampler; `caffeinate` | Yes | `isolated-app stop`; `rm -rf /private/tmp/wjs-api2` | `isolated-app list` → `[]`; no `caffeinate` left; the implementer's copy untouched (3680 `work_journal` dirs) |
| Screenshots with real journal text | Yes | Kept in the private folder (`r2/`) | Kept |
| Round 1 items | Yes | Removed in round 1 | — |

## Preliminary Classification (On `Fail`)

N/A — `Pass`.

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check (IDs): AC-008 on the user's own memory (the user only).
- Preliminary classification and recommended owner: N/A
- Next recipient from `get_handoff_rules`: `/software_engineering_team/code_reviewer` (rule: "When API/E2E validation passes, the carried classification is task_size=Large or architectural_risk=High, and the cumulative evidence package requires proportional test-code review.")
- Notes:
  - F-001 is resolved by SR-006;
  - final confidence is 94%: environment fidelity is the gap, and the user's first build closes it;
  - test review: API-D01.
