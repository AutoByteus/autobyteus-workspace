# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-001`
- Approved requirements baseline: `requirements-doc.md` at SR-001, approved by the Solution Designer within the direction of Task autobyteus-149 (user informed in the Solution Designer conversation, 2026-10-19)
- Behavior-defining supplements: none
- Design status: `Ready`
- Canonical investigation-notes path: `/Users/normy/autobyteus_org/autobyteus-worktrees/release-smoke-new-run-skill-links/tickets/in-progress/release-smoke-new-run-skill-links/investigation-notes.md`
- Authorities read (2026-10-19): `references/architecture-design.md`, `references/design-principles.md`, `/Users/normy/autobyteus_org/autobyteus-worktrees/release-smoke-new-run-skill-links/DESIGN.md` (the only `DESIGN*.md` in the repository outside tickets), `references/design-examples.md` Example 11 (scope), plus `RELEASE.md` and `TESTING.md`
- Project design-principle conflicts or discrepancies: none. Observation, not a conflict: TESTING.md's AGY known-gap note names `agy` 1.3.5 (checked 2026-10-14), but the release machine now has 1.4.2. That note is outside this ticket's scope (FU-2).

## Current-State Read

- The release owner follows RELEASE.md by hand. The "Checks Before Tagging" are two plain commands: `python3 scripts/check_licensing.py` and `python3 scripts/check_repository_artifact_hygiene.py`. Both are Python scripts in `scripts/`, with `unittest` tests in `scripts/tests/`. No step starts an agent run (BEH-001).
- The scenarios already exist for Claude, Codex and Grok in `autobyteus-server-ts/tests/e2e/runtime/workspace-skill-links-live.e2e.test.ts`. It is gated per runtime, starts the in-process Studio server, uses test-owned data and needs no `dist/`. Its model choice is loose: stale Codex candidates (`gpt-5.4-mini`, `gpt-5.5-mini`) and a fallback to `available[0]` (BEH-002).
- Antigravity has a scripted CLI suite over the real server: `agy-linked-skills-transport.e2e.test.ts`, gated by `RUN_AGY_FAILURE_E2E` and `ANTIGRAVITY_CLI_COMMAND`. It has no case for an imported package agent's configured skill in a workspace with same-skill links.
- AutoByteus native has a zero-cost suite with a deterministic LLM: `configured-skill-on-demand-loading.e2e.test.ts` (non-gated, factory level). The server path has no LLM injection point; the native runtime through GraphQL needs a real provider. The factory level is the zero-cost boundary that runs the native backend's real preparation: skills, memory folder and workspace.
- The release script needs a clean worktree, so nothing may be written into unignored paths. Parallel suites contend on the shared test DB (autobyteus-142 `05a` log).
- Evidence: investigation notes, Source Log and Architecture Investigation Findings.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Medium`
- Size rationale: about 7 files. One new release-check script and its unit test, three edited E2E suites (one model-selection change and two pairs of added cases), RELEASE.md and TESTING.md. All are within existing owners: `scripts/` release checks, server E2E suites and the release/testing guides. No production source changes.
- Architectural risk: `Low`
- Risk rationale: no production contract, persistence, security, concurrency or runtime-owner change. The release procedure gains one documented local step, written like the existing checks; the release workflows and `desktop-release.sh` are unchanged. The tests use test-owned data only.
- Escalation trigger: return a `Design Impact` if implementation finds that a scenario cannot pass without a production change (that would be a product defect: report it, do not fix it here), that the AGY or native case needs a new server injection point, or that the vitest JSON report cannot identify tests per runtime.

## Architecture Investigation Evidence

| Source / Command / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| RELEASE.md, `scripts/check_*.py`, `scripts/tests/` | repo root | Release checks are stdlib Python with unittest | Runner is `scripts/release_smoke.py` with `scripts/tests/test_release_smoke.py` | — |
| Live suite | `workspace-skill-links-live.e2e.test.ts` | Covers REQ-002 (a)–(d). The gate and `commandReady` silently drop a runtime | Reuse; the runner requires results per runtime instead of changing the suite's gating | — |
| autobyteus-142 logs 07–09 | ticket evidence | About 40–60 s and about 5 turns per runtime | Live tier is cheap enough for every tag | — |
| `agent-provider-factory-builder.ts:181`, `create-process-agent-provider-factory-builder.ts` | server src | The native `createLlm` is fixed to `createAvailableLlm` in the process composition | Native scripted cases stay at factory level with an injected deterministic LLM (existing pattern) | — |
| `antigravity-cli-capability.ts:3` | server src | `ANTIGRAVITY_CLI_COMMAND` is read at module load | The runner sets it in the child environment | — |
| vitest 4.0.18 | `autobyteus-server-ts` | JSON reporter (`--reporter=json --outputFile.json=<file>`) gives per-test `fullName`/`ancestorTitles`/`status` | The runner gets its verdict from the JSON report | Exact field names: implementation verifies |

## Intended Change

Add one release-smoke command that runs the live and scripted run-start scenarios on all five runtimes, one suite at a time, in a clean environment. It decides pass or fail from per-test results against a fixed list of required cases and prints a summary. RELEASE.md makes the command a required check before every tag; TESTING.md lists it.

## Change Scope (Mandatory)

- In scope: UC-001 and UC-002. Areas: the release check scripts (`scripts/`), three server E2E runtime suites, RELEASE.md "Checks Before Tagging", and the TESTING.md test-layer table.
- Deliberately left alone:
  - production source: the smoke observes run start, it does not change it;
  - `.github/workflows/*` and `scripts/desktop-release.sh`: CI belongs to autobyteus-65, and enforcement is a non-goal;
  - the other stale gated suites (autobyteus-148);
  - F2/F3 behaviors (autobyteus-150): the smoke asserts neither the removal of a user's own same-skill link at run end nor AGY's `.agents/skills` refusal;
  - Grok native `.grok/skills` listing (autobyteus-144);
  - the isolated desktop instance journey (DEC-006);
  - `test-support/live-e2e/` (`test:e2e:real`): it covers provider API keys, a different check.
- Follow-ups:
  - FU-1 (optional, for the user to decide): let `desktop-release.sh` refuse to tag without a passing smoke result for the tagged commit, if a documented step turns out not to be enough.
  - FU-2: TESTING.md's AGY sign-in known gap names `agy` 1.3.5 (checked 2026-10-14); the installed `agy` is 1.4.2. Re-check whether an isolated signed-in recipe now exists.
  - FU-3 (note for autobyteus-65): once CI runs server E2E, the AutoByteus smoke cases run there automatically (they are non-gated). The AGY cases also need `RUN_AGY_FAILURE_E2E=1` and `ANTIGRAVITY_CLI_COMMAND` set to the fixture.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / AC IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Operational | REQ-001, 005..008; AC-001, 004, 005, 007, 008 | RELEASE.md Checks Before Tagging | Two checks only (INV) | Smoke check added before every tag | DS-001 |
| BEH-002 | Operational | REQ-002, REQ-004; AC-002, AC-006 | Live suite run by the smoke | Loose models, silent drop (INV) | Pinned cheap models without fallback; missing results fail in the runner | DS-001, DS-002 |
| BEH-003 | System | REQ-002, REQ-003; AC-002, AC-003, AC-009 | createAgentRun / prepareAgentRun / first message / lazy team member / restore | Works since autobyteus-142 | Preserved; observed by DS-002..DS-004 | DS-002..DS-004 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related IDs | Relationship To This Design | Status |
| --- | --- | --- | --- | --- |
| `tickets/done/workspace-skill-collision-fix/` | Scenario origin (SCN-101..104) and live suite rationale | REQ-002, REQ-003 | Scenario set reused | Final, evidence only |

## Task Design Health Assessment (Mandatory)

- Change posture: `Feature` (operational check)
- Current design issue found: `No`
- Structural triggers considered:
  - *Repeated coordination:* the selection policy (which runtimes and cases are required) could spread into every suite as "smoke mode" flags. Ruled out: one owner, the runner, holds the required-case list. The suites keep their ordinary gates.
  - *Capability-area reuse:* `test-support/live-e2e/run-live-e2e.mjs` was considered and rejected. It starts a built server, needs `dist/`, scans for secret canaries and targets provider API keys. Reusing it would mix two checks. The `scripts/` release-check area fits.
  - *Responsibility overload:* the new AGY and native cases go into the suites whose subject they share (AGY linked skills; native configured skills), using the helpers those suites already have, rather than a new suite that copies them.
  - *Empty indirection:* the runner owns real policy (required cases, environment per tier, serial order, verdict, worktree-clean guard), so it is not an empty layer.
- Root cause classification: `No Design Issue Found`. The regression escaped because there was no release step, not because of a design flaw in the suites.
- Refactor needed now: `No`
- Evidence: Current-State Read.
- Design response: add the runner and the cases; tighten the live suite's model selection.
- Intentional deferrals and residual risk: FU-1 (no mechanical enforcement). The residual risk is that a release owner skips a documented step. RELEASE.md is the release owner's mandatory read, and the delivery report must carry the smoke summary.

## Terminology

- **Required case**: a (suite file, runtime, test-title substring) entry in the runner's list that must appear in the run as `passed`.
- **Live tier / scripted tier**: the real-CLI suite (Claude, Codex, Grok) / the scripted-CLI and deterministic-LLM cases (Antigravity, AutoByteus).

## Legacy Removal Policy (Mandatory)

- Obsolete paths in scope: the live suite's stale model candidates (`"sonnet"`, `"gpt-5.4-mini"`, `"gpt-5.5-mini"`) and its `?? available[0]` fallback.
- Compatibility wrappers kept: `None`.

## Persisted Data / State Transition Decision

- Decision: `Not Affected`. No product data; test-owned temp data only.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001, BEH-002 | Release owner runs `python3 scripts/release_smoke.py` | Exit code + summary in the delivery report → tag or no tag | `scripts/release_smoke.py` | The release gate |
| DS-002 | Primary End-to-End | BEH-002, BEH-003 | Live suite step | Per-test results for Claude/Codex/Grok | `workspace-skill-links-live.e2e.test.ts` | Real-CLI run start in the user's setup |
| DS-003 | Primary End-to-End | BEH-003 | AGY scripted step | Per-test results for Antigravity | `agy-linked-skills-transport.e2e.test.ts` | Scripted AGY run start |
| DS-004 | Primary End-to-End | BEH-003 | Native scripted step | Per-test results for AutoByteus | `configured-skill-on-demand-loading.e2e.test.ts` | Native run start |
| DS-005 | Bounded Local | BEH-001 | Inside the runner: preflight → run each step → read JSON → match required cases | Verdict rows | runner | Fail-closed verdict |

## Primary Execution Spine(s)

- DS-001: `Release owner -> release_smoke.py (preflight, clean env) -> vitest step per suite (serial) -> JSON report -> verdict against required cases -> summary + exit code -> RELEASE.md tag decision`
- DS-002: `vitest -> in-process Studio server -> GraphQL importAgentPackage / createAgentRun / restoreAgentRun / createAgentTeamRun -> AgentRunManager -> runtime backend factory (workspace skill materializer, memory folder) -> real claude/codex/grok CLI -> WebSocket turn -> assertion`
- DS-003: `vitest -> Studio server -> GraphQL importAgentPackage / prepareAgentRun / createAgentTeamRun -> AgentRunManager -> AGY factory (capsule skill links) -> scripted agy CLI (READ_SKILLS) -> WebSocket frames -> assertion`
- DS-004: `vitest -> GraphQL importAgentPackage (schema) -> AutoByteusAgentRunBackendFactory.beginPreparation(kind new, memoryDir absent).prepare() -> native agent with deterministic LLM -> first message -> turn completes; configured skill present in what the LLM receives -> assertion`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The runner records `git status --porcelain` and the commit, then checks that `claude`, `codex` and `grok` are on `PATH` and that `~/.codex/auth.json` exists. It runs the three suites one after another, each with its own clean environment and a JSON report written to a temp folder. It matches every required case and also checks that no test failed. It prints a runtime × scenario table with the commit, models and durations. It fails if the worktree status changed. | runner, required-case list, verdict | runner | environment building, JSON parsing, models line capture |
| DS-002 | Unchanged scenario logic. Model choice: the env override, else the pinned cheapest model. The run stops with the available list when that model is not in the catalog. | live suite | live suite | — |
| DS-003 | New E09/E10: an imported package agent with a configured skill, and a workspace whose `.claude/.codex/.grok/skills/<s>` link to the package skill. E09: a brand-new standalone run (prepare + first message) starts; the scripted CLI reports the configured skill linked in the capsule; the workspace links are untouched. E10: a team run whose skill-configured member starts lazily on its first message, with no member memory folder before it; it starts and reports the skill. | AGY suite | AGY suite | existing helpers (`createWorkspace`, `prepareRun`, `ask`, `reportedSkills`) |
| DS-004 | New cases: the same package and linked workspace. A brand-new native run (memory folder absent) prepares, takes one message and completes a turn; the configured skill appears in the LLM's input (system prompt or skill catalog). The same holds for a brand-new team member (team folder present, member folder absent). The workspace links are untouched. | native suite | native suite | existing deterministic LLM and factory helpers |

## Spine Actors / Main-Line Nodes

Runner; the three suites; the Studio server / AgentRunManager / backend factories (unchanged production code, observed).

## Ownership Map

- `scripts/release_smoke.py` owns the smoke policy: required runtimes and cases, environment per step, serial order, verdict, summary and the worktree-clean guard. It owns no scenario logic.
- Each suite owns its scenarios, fixtures and assertions; the live suite also owns its model choice.
- RELEASE.md owns the rule (when to run it, prerequisites, the failure and waiver rule). TESTING.md owns only the layer index row.

## Thin Entry Facades / Public Wrappers

N/A. There is no wrapper; the runner is the governing owner of DS-001.

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By | Scope | Notes |
| --- | --- | --- | --- | --- |
| Live suite `preferredModels` stale entries (`"sonnet"`, `"gpt-5.4-mini"`, `"gpt-5.5-mini"`) | Dead: those Codex models are not in the catalog (autobyteus-142/148 evidence), and with `haiku` pinned `sonnet` is never reached | One pinned cheapest model per runtime | In This Change | — |
| `?? available[0]` fallback | Chooses an arbitrary model of unknown cost (REQ-004) | Explicit failure listing available models | In This Change | — |

## Return Or Event Spine(s)

N/A beyond the existing WebSocket turn streams the suites already read.

## Bounded Local / Internal Spines

- Parent owner: runner. `preflight -> for step in [live, agy, native]: build env -> spawn vitest (json report) -> parse -> collect` then `match required cases + any-failed check -> rows -> print -> exit`. It matters because the verdict must be fail-closed: a missing result counts as a failure.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Environment per step | DS-001 | runner | Live: `PATH`, real `HOME`/`USER`/`LOGNAME`, `TMPDIR`, `RUN_CLAUDE_E2E=1 RUN_CODEX_E2E=1 RUN_GROK_E2E=1`, passing through `CLAUDE_E2E_MODEL`/`CODEX_E2E_MODEL`/`GROK_E2E_MODEL`/`GROK_BUILD_COMMAND` if set. Scripted: `PATH`, temp `HOME` (resolved path), `TMPDIR`, `RUN_AGY_FAILURE_E2E=1`, `ANTIGRAVITY_CLI_COMMAND=<abs fixture>` | TESTING.md clean-environment rules | Suites inheriting the user's shell |
| JSON report reading | DS-001 | runner | Read vitest JSON into (file, ancestor titles, title, status, first failure message) | Verdict input | — |
| Models line | DS-001 | runner | Read `SKILL_LINKS_LIVE_MODELS {...}` from the live step's stdout into the summary | REQ-006 | — |

## Ownership Boundaries

The runner depends only on the suites' public surface: their file paths, test titles, gate variables and the existing `SKILL_LINKS_LIVE_MODELS` log line. Suites do not know the runner exists, apart from a header note that names it. Neither touches production internals beyond what the suites already do.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) | Upstream Callers That Must Use It | Forbidden Bypass Shape | If Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| vitest CLI + JSON report | test execution | runner | runner importing test modules or reading `tests/.tmp` | — |
| Each suite's gates and titles | scenario setup | runner | runner-specific "smoke mode" flags inside suites | Extend the required-case list instead |

## Dependency Rules

- Allowed: runner → `pnpm -C autobyteus-server-ts exec vitest run <file> --no-watch --reporter=default --reporter=json --outputFile.json=<tmp>`; runner → `git rev-parse HEAD`, `git status --porcelain`.
- Forbidden: suites depending on the runner; the runner writing inside the worktree; the runner running suites in parallel; RELEASE.md duplicating the required-case list (it names the command and the runtimes only).

## Interface Boundary Mapping

| Interface | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `python3 scripts/release_smoke.py` (no arguments) | Release smoke verdict | Run everything and decide | none | Model overrides only through the suites' existing env vars |
| Required-case entry | One scenario on one runtime | Match one test | `(suite path, runtime label, title substring, scenario label)` | For the live suite, the runtime label is the `describe.each` ancestor title (`claude`/`codex`/`grok`) |

## Interface Boundary Check

| Interface | Singular? | Identity Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Required-case entry | Yes | Yes | Low (a title substring could match two tests) | The verdict requires exactly one match per entry; more than one is an error |

## Main Domain Subject Naming Check

| Node / Subject | Proposed Name | Natural? | Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Runner | `scripts/release_smoke.py` | Yes (sits beside `check_licensing.py`, `release_versions.py`) | Low | — |
| Unit test | `scripts/tests/test_release_smoke.py` | Yes | Low | — |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Live scenarios | `workspace-skill-links-live` | Reuse (+ model tightening) | Already the F6 shape | — |
| AGY scenario | `agy-linked-skills-transport` | Extend (E09, E10) | Has the scripted CLI, server and helpers | — |
| Native scenario | `configured-skill-on-demand-loading` | Extend (two cases) | Has the deterministic LLM and factory wiring | — |
| Pre-tag command | `scripts/` release checks (Python + unittest) | Extend (new file) | Same audience and style | — |
| Runner over vitest | `test-support/live-e2e/run-live-e2e.mjs` | Not reused | Built-server/provider-key/canary specific | It would couple unrelated checks |

## Subsystem / Capability-Area Allocation

| Subsystem | Owns | Spine | Decision |
| --- | --- | --- | --- |
| `scripts/` release checks | Smoke policy and verdict | DS-001, DS-005 | Extend |
| Server E2E runtime suites | Scenarios | DS-002..004 | Reuse/Extend |
| Release/testing guides | Rule and index | DS-001 | Extend |

## Draft File Responsibility Mapping

See the final mapping; the draft needed no change after the reuse check.

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Decision |
| --- | --- | --- |
| Package-with-configured-skill + linked-workspace setup, now in 3 suites | a shared E2E fixture helper | Not extracted. The live suite writes files and imports through HTTP GraphQL; the AGY suite uses its own `graphql` over HTTP; the native suite uses in-process `execGraphql`. The shared part is about 15 lines of file writing. A helper would need options for each harness and would become a loose shared base. Each suite keeps its few lines; the implementer may extract a tiny `writeLinkedSkillWorkspace(skillDir)` into `tests/e2e/helpers/` only if it really comes out identical in all three. |

## Shared Structure / Data Model Tightness Check

N/A: no shared structure is introduced. The runner's required-case record has four singular fields.

## Final File Responsibility Mapping

| File | Owner | Concrete Concern |
| --- | --- | --- |
| `scripts/release_smoke.py` (Add) | release checks | Required-case list; preflight; per-step clean environment; serial vitest runs with a JSON report in a temp folder; verdict (each required case exactly once and `passed`; no test `failed`; preflight failures name the runtime); summary table (runtime, scenario, result, reason) with commit, models, duration; worktree-status guard; exit 0/1 |
| `scripts/tests/test_release_smoke.py` (Add) | release checks | unittest of the verdict and JSON parsing with synthetic reports: all pass; missing case; skipped case; extra failed test; duplicate match; preflight-missing CLI; worktree changed |
| `autobyteus-server-ts/tests/e2e/runtime/workspace-skill-links-live.e2e.test.ts` (Modify) | live suite | Pinned models without fallback; header notes the release smoke and that the runner names its test titles |
| `autobyteus-server-ts/tests/e2e/runtime/agy-linked-skills-transport.e2e.test.ts` (Modify) | AGY suite | Add E09 (brand-new run) and E10 (brand-new team member) as in DS-003; header note |
| `autobyteus-server-ts/tests/e2e/runtime/configured-skill-on-demand-loading.e2e.test.ts` (Modify) | native suite | Add the two cases in DS-004; header note |
| `RELEASE.md` (Modify) | release rules | "Checks Before Tagging" → add "Release smoke check" (see Guidance) |
| `TESTING.md` (Modify, own commit `docs(testing): …`) | testing index | One row in "Test layers" |

## Applied Patterns

None beyond a fixed required-case list (table-driven verdict).

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner | Responsibility | Why Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `scripts/release_smoke.py` | File | release checks | Smoke policy + verdict | Beside the other pre-tag checks | Scenario logic; writes inside the worktree |
| `scripts/tests/test_release_smoke.py` | File | release checks | Verdict tests | Existing script-test folder | Live runs |
| the three suite files | File | suites | Scenarios | Existing subjects | Runner-specific modes |

## Folder Boundary Check

| Path | Depth | Clear? | Risk | Justification |
| --- | --- | --- | --- | --- |
| `scripts/` | Off-Spine Concern (release tooling) | Yes | Low | Same as the sibling checks |

## Concrete Examples / Shape Guidance

| Topic | Good Example | Bad / Avoided Shape | Why |
| --- | --- | --- | --- |
| Required cases | `("tests/e2e/runtime/workspace-skill-links-live.e2e.test.ts", "codex", "starts a brand-new team member", "brand-new team member")` → exactly one passed test whose ancestors include `codex` | "all tests in the file passed" (a dropped runtime has no tests, so it would pass) | Fail-closed on missing runtimes (REQ-005) |
| Summary | `claude  new run + restore  PASS` / `grok  brand-new team member  FAIL  no result (grok not on PATH)`, then `commit cba6b85… models {"claude":"haiku",…} result FAIL` | A bare exit code | Pasteable evidence (REQ-006) |
| Model choice | `candidate = env || PIN; if (!available.includes(candidate)) throw new Error(\`codex model ${candidate} not offered; available: ${available.join(", ")}\`)` | `?? available[0]` | Cost bound (REQ-004) |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why Considered | Decision | Clean-Cut Replacement |
| --- | --- | --- | --- |
| Keep the model fallback list "for robustness" | Avoid failures when a model retires | Rejected | Fail with the available list; update the pin |

## Change / Refactor Sequence

1. Live suite: model pins, no fallback; header note. Run it once live (all three gates) to confirm the pins are in the catalogs and to measure the time.
2. AGY suite E09/E10 and native cases; run each suite on its own with its existing gates (AC-009).
3. `scripts/release_smoke.py` + unit test.
4. Full smoke run on the branch (AC-001..003, 008); negative runs: `PATH` without `grok` (AC-004), bogus `CODEX_E2E_MODEL` (AC-006), a temporary broken assertion that is not committed (AC-005).
5. RELEASE.md; TESTING.md as its own `docs(testing)` commit.

## Key Tradeoffs

- Documented step vs. script enforcement: documented, like the existing checks (FU-1).
- No automatic retry of stochastic live answers. A failure is diagnosed (TESTING.md Rule 9) before anyone re-runs, so a real regression cannot be retried into a pass. The prompts are deterministic ("reply with only the code"), and all prior runs passed first time.
- Native at factory level (zero cost) rather than through GraphQL with a paid or local model. The runtime-agnostic manager path is covered by the AGY and live tiers.

## Risks

- CLI login expired on the release machine → clear failure; the waiver rule applies (RSK-001).
- Pinned model retired → clear failure listing the alternatives (RSK-003).
- A renamed test title → "no result" failure, which forces the runner list to be updated. That failure is intended, and each suite header names the runner.

## Guidance For Implementation

- RELEASE.md, under "Checks Before Tagging" (change "Run both checks" so it covers the new one, and note that the release workflows do not run it), a short subsection **Release smoke check**:
  - **When:** before every beta and stable tag, on the merged state you will tag, after `pnpm install` and `pnpm -C autobyteus-server-ts prebuild`.
  - **Command:** `python3 scripts/release_smoke.py`.
  - **What it covers:** it starts agent runs with configured skills the way users do, on all five runtimes. That includes a brand-new run, a brand-new team member with no memory folder yet, a run in a workspace whose `.claude/.codex/.grok/skills` link to the same skill, a restored run, and a different same-named skill.
  - **Prerequisites:** `claude`, `codex` and `grok` on `PATH` and signed in on this machine.
  - **Cost:** about five short turns per live runtime on its cheapest model; Antigravity and AutoByteus run scripted, with no provider calls; a few minutes in total.
  - **Pass:** exit 0. Put the printed summary in the delivery report.
  - **Failure, or a runtime that cannot run:** no tag. Find the cause first (TESTING.md Rule 9). The only exception is the user explicitly waiving a named runtime at the release decision; record the waiver and reason in the delivery report.
  - **Why:** one sentence about v1.5.6-beta.2.
- TESTING.md "Test layers" row: `| Release smoke | New runs with configured skills start on every runtime, in the user's skill setup | python3 scripts/release_smoke.py; see [RELEASE.md](RELEASE.md#release-smoke-check) |`.
- Keep the live suite's existing assertions unchanged, and do not assert F2/F3 behavior.
- Write JSON reports and the AGY temp `HOME` under `tempfile.mkdtemp()` and remove them afterwards. Check that `git status --porcelain` is unchanged.
- Each new case's title must stay stable; the runner names it. Put a comment by each one: `// Named by scripts/release_smoke.py`.
