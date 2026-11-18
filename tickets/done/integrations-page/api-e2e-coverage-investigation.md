# API/E2E Coverage Investigation — Integrations page (autobyteus-337)

The plan. Results, confidence and the broader-validation decision are in `api-e2e-execution-coverage-report.md`.

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (approved SR-006; SR-009 current)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md` (SR-001…SR-009)
- Design Spec: `design-spec.md` (SR-009; Large / High)
- Supplemental Task Artifacts:
  - the approved r2 UI spec `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/integrations-page-r2/ui-ux-spec.md` (VIS-001…VIS-035, plus the first design's VIS-019);
  - the manifest contract `AutoByteus/autobyteus-integrations` `8887475` `docs/integration-manifest.md`;
  - `follow-ups.md` (FU-001…FU-003).
- Design Review Report / Architecture Review Revision Record: `design-review-report.md` (ARCH-REV-002 Pass) / `architecture-review-revision-record.md`
- Implementation Handoff / Revision Record: `implementation-handoff.md` (IR-001, IMP-01…IMP-14) / `implementation-revision-record.md`
- Code Review Report / Revision Record: `code-review-report.md` (CRR-001 Pass) / `code-review-revision-record.md`
- Delivery Revision Record: N/A
- API/E2E Revision Record: `api-e2e-revision-record.md`; current revision `API-REV-001`; round 1
- Trigger: code review CRR-001 pass (reviewed route)
- Prior Investigation Reviewed: N/A

Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/integrations-page`, branch `codex/integrations-page`, base `0295553657`. Code `db704b76ee…9e8264614e`. Review artifacts are in `22f17adf30`, which changes `tickets/` only after `9e8264614e`.

## Current Requirement And Design Basis

- **REQ-001/002/009, AC-001:** an Integrations page in the main menu, after Nodes. It shows one card per integration folder in the imported skill sources, in one of three states: Installed, needs a token / Connected as @login / Needs a newer AutoByteus. With nothing imported it shows an empty state, and opening the page makes no network request.
- **REQ-003, AC-002:** Import takes a GitHub link or a folder and has coded refusals. Manage sources: Update for GitHub sources, Remove for both kinds. Removing a source disconnects its integrations, on both the Integrations and the Skills page (DEC-015). An update that drops an integration disconnects it (DEC-016). A failed disconnect refuses the change.
- **REQ-004, AC-003:** Connect, Test and Remove for the token work as in 311.
- **REQ-005/006, AC-004:** access follows the integration's skill in the agent's effective skills: configured, or all installed (DEC-002). The full check runs at preparation and a cheap one on every call. The ticks are gone.
- **REQ-007, AC-005:** Basics has no GitHub card. The old API is removed.
- **REQ-008, AC-006:** tool presence.
- **AC-007:** no token in any output, log, trace or file.
- **AC-008:** the teammate's way, live, on an isolated instance:
  1. Import `https://github.com/AutoByteus/autobyteus-integrations`;
  2. Connect;
  3. add `github-integration` to an agent;
  4. the agent runs `issues.sh list` and `comment` on `ryan-zheng-teki/autobyteus-mcp-test`;
  5. the activity log shows the calls, and no token appears anywhere.
- **AC-009:** the README, on an unpushed branch; doc review; delivery finalizes it.
- **Persisted data:** `connections.json` is `Directly Usable — No Migration`. `agentDefinitionIds` is ignored and dropped on the next write, and the vault entry is kept (the beta.4 user).
- **Preserved:** 311's proxy behavior.

## Supported Scenarios And Real Usage

- **Designer scenarios:** SCN-001 (set up GitHub), SCN-002 (a teammate on another node), SCN-003 (stop an agent's access).
- **Added from investigating the implemented behavior, each with its real trigger:**
  - **SCN-A1:** a user still on the installed release (1.5.11-beta.9, which has the old Settings card and ticks) upgrades to this build on the same data. Real trigger: connecting and ticking on the old card in the installed app, then starting this build on the same data root.
  - **SCN-A2:** an agent set to "all installed skills" gets the integration (DEC-002). The user disables the skill on the Skills page, and the running agent's next call is refused; enabling it restores access.
  - **SCN-A3:** a team whose member is a team-local agent with the skill.
  - **SCN-A4:** the user removes the integrations source on the Skills page (Manage Skill Sources) while an agent run with the skill is active. The connection is removed and the run's next call is refused.
  - **SCN-A5:** a real LLM agent in each runtime uses the integration from its own shell (the live cells of the runtime-shells suite).
  - **SCN-A6:** an integration folder whose `token.help` holds `https:`, `http:` and `javascript:` links, opened in the packaged app's dialog.
  - **SCN-A7:** Manage sources → Update on the real GitHub source when no new revision exists.
- **Contrived / unsupported (not tested):** none recorded by the designer.

## Changed Behavior Summary

| Behavior | Change | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| DS-001 list, states, tools | Added | IMP-04, IMP-07, IMP-11, IMP-12 | Packaged app (API-04, API-05) |
| DS-002 import, refusals, Manage | Added | IMP-04, IMP-07 (folder), IMP-08 (link), IMP-12 (folder, rendered) | Link import through the packaged UI (API-05); Update on real GitHub (API-05) |
| DS-003 connect | Changed (per integration) | IMP-07, IMP-08, IMP-12 (rejected; connected state intercepted) | A real connect in the packaged UI (API-05) |
| DS-004 access by skill | Changed (security rule) | IMP-04, IMP-08, IMP-09 (scripted runtimes) | Live runtime cells (API-01); all-installed, disabled skill and team-local on real runs (API-02) |
| DS-005 removal and update observer | Added | IMP-04 (stub GitHub update), IMP-12 (Skills-page removal removes the card, folder source) | Skills-page removal with a running agent (API-02 and the packaged app, API-05) |
| Clean cut of the ticks and the GitHub API | Removed | IMP-07, IMP-12 (Basics) | Upgrade from the installed release (API-04) |
| `connections.json` direct use | Preserved | core unit test (synthesized beta.4 file) | Real data written by the installed release (API-04) |
| Skills-page "Integration" label | Added | IMP-11, IMP-12 | Packaged app (API-05) |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | catalog, manifest, access rule, observer | IMP-04 | — | Reuse |
| API / transport / contract | Yes | new integrations GraphQL; old one removed | IMP-07 | — | Reuse |
| Frontend component / state | Yes | page, dialogs, store | IMP-11, IMP-11b | — | Reuse |
| Browser integration / user journey | Yes | the full journey | IMP-12 (Nuxt dev; connected state intercepted) | A real connect and link import in the packaged renderer | Isolated desktop instance |
| Authentication / session / permissions | Yes | access by skill; disconnect on removal | IMP-04, IMP-08, IMP-09 | Real runs of all-installed, disabled, team-local and Skills-page removal agents; live LLM shells | Gated runtime suite; isolated instance |
| Desktop renderer / web-equivalent UI | Yes | page and navigation in the packaged app | none packaged | packaged renderer | Isolated instance |
| Desktop shell / Electron | Indirect | `externalLink` (`electronAPI.openExternalLink`) for `token.help` links | spec | The real shell's link opening (not exercised: it would open the user's browser) | Read: DOM only |
| Process / lifecycle | Yes | async `environmentForRun` in five backends | IMP-03, IMP-09 | live runtimes | Gated runtime suite |
| Persisted-data transition | Yes | `connections.json` from the old card | unit test with a synthesized file | real files from the released app | Isolated instance (installed release → worktree build) |
| Worker / queue / distributed | Indirect | team members | IMP-09 (shared members) | team-local member | Gated runtime suite |
| External integration | Yes | GitHub import, Update, the integration's scripts | IMP-08 | through a real agent in the app | Isolated instance |

## Project Execution Discovery

- Worktree: as above. Stack: pnpm monorepo (server, web/Electron, core).
- Testing guideline: `TESTING.md` (root). There is no closer guideline. It covers:
  - the clean env;
  - the test vault (`test.github.token`; `RUN_GITHUB_PROXY_E2E=1` posts one comment on issue #1 per run);
  - one heavy run at a time;
  - throwaway `CODEX_HOME`;
  - isolated instances (only `CODEX_HOME` passes into the embedded server; `--data-root`).
- Discrepancies: none found yet.
- Secrets: `test.github.token` CONFIGURED (expires 2026-11-25). Signed-in `claude`, `codex`, `grok`; `agy` host login; LM Studio.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | global guideline | as above; Rules 1–9 |
| `docs/isolated-app-instances.md` | isolated instances | `isolated-app start [--build] --data-root`; the installed app is the default when `--build` is absent (macOS); `stop` |
| `autobyteus-server-ts/docs/modules/credential_proxy.md`, `skills.md`; `autobyteus-web/docs/integrations.md` | contract of this change | access rule, observer, refusal texts |
| `tests/e2e/credential-proxy/github-credential-proxy-runtime-shells.e2e.test.ts` | the gated runtime suite (from 311, moved to skills by IMP) | gates in its header |

| Component | Working Directory | Start | Notes | Readiness | Stop |
| --- | --- | --- | --- | --- | --- |
| In-process studio server (suite) | `autobyteus-server-ts` | vitest | own temp data dir and vault | server returns | `afterAll` |
| Installed release 1.5.11-beta.9 (isolated) | repo root | `pnpm --silent isolated-app start --data-root <owned>` | the user's installed app binary in an isolated instance; never the user's data | start JSON | `isolated-app stop` |
| Worktree build (isolated) | repo root | `CODEX_HOME=<temp> pnpm --silent isolated-app start --build --data-root <same owned root>` | packaged build of this branch | start JSON | `isolated-app stop` |

| Data / Identity Need | Mechanism | Safety | Cleanup |
| --- | --- | --- | --- |
| GitHub token | test vault, read by the test or driver; typed once into a test-owned instance's card | never printed; scans report paths only | Disconnect; data roots removed |
| Integrations repository | `https://github.com/AutoByteus/autobyteus-integrations` (public), imported by link | read only | removed with the data root |
| Comments on issue #1 | the agent's `issues.sh comment` (AC-008) | the test repository is meant for this (TESTING.md) | left (as every live run) |
| Integration folders with special `token.help` | written into the owned data root | — | removed |

## Persisted Data Transition Coverage Basis

- Approved decision: `Directly Usable — No Migration` (`connections.json`); vault and skill-source storage unchanged.
- Representative existing data: what the **installed release** actually writes. Its own card connects with the real token and ticks an agent, on an owned data root (API-04), so the file and the vault entry are the released format, not synthesized.
- Evidence planned:
  - after this build starts on that root, Basics has no card and the page is empty until import;
  - importing the repository shows "Connected as @login" at once;
  - `agentDefinitionIds` stays in the file until the next write and is gone after it.
- Upstream ambiguity: none.

## Existing Durable Coverage Inventory

| Path / Test | Intent | Related | Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `tests/unit/credential-proxy/*`, `tests/integration/credential-proxy/*` (catalog, host, connection, git) | catalog, refusals, access rule incl. all-installed, disabled, bundle copy, removal and update observer | DS-001…DS-005 | Still Valid | IMP-04 | Reuse |
| `tests/e2e/credential-proxy/integrations-graphql.e2e.test.ts` | GraphQL on a built server | AC-001, AC-002, AC-005, AC-006 | Still Valid | IMP-07 | Reuse |
| `tests/e2e/credential-proxy/github-credential-proxy-live.e2e.test.ts` | link import, connect, AC-008 scripts in-process | AC-002…AC-004, AC-007, AC-008 | Still Valid | IMP-08 | Reuse |
| `tests/e2e/credential-proxy/github-credential-proxy-runtime-shells.e2e.test.ts` | scripted cells (IMP-09) and gated live LLM cells | AC-004, REQ-005 | Still Valid; Needs additions (SCN-A2…A4 on real runs) | IMP-09 | Run the live cells; add cells |
| web specs and `integrations-page-probe.mjs` | page and dialogs | AC-001…AC-006, VIS | Still Valid | IMP-11, IMP-12 | Reuse |
| the rest of server e2e (every suite starts the composition; skills resolvers became async) | preserved behavior | — | Still Valid | not run by implementation | Run (API-03) |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-R01 | AC-001…AC-008 (repository) | unit, integration, built-server e2e, live GitHub, scripted runtimes, web, rendered probe | Reused | IMP-01…IMP-14 | Code unchanged since `9e8264614e` (`git diff --name-only 9e8264614e 22f17adf30` lists only `tickets/`); IMP-11 ran at `858e493786`, and the web changed after it only by the IMP-11b spec |
| API-01 | AC-004, AC-007, REQ-005 | live LLM shells: native (LM Studio), Claude, Codex (auto-execute off and on), Grok, AGY | Existing Test | the runtime-shells suite's live cells (gates in its header) | SCN-A5; not run by implementation |
| API-02 | AC-004, REQ-005, DEC-002, DEC-015, SCN-A2…A4 | AGY scripted runs (no model) on the in-process server | Durable (added cells) | new cells in the runtime-shells suite: all-installed + disable/enable; team-local member; Skills-page source removal with a running agent | Real-run proof of the access rule's other entry paths; cheap and repeatable |
| API-03 | regression | full server e2e | Existing Test | `pnpm test:e2e` (clean env) after build and prepare | composition, skills resolvers and five backends changed |
| API-04 | AC-005, persisted data, SCN-A1 | installed release → worktree build on one owned data root | Journey | <ol><li>Installed beta.9 (isolated): connect on the old card with the token, tick an agent; stop.</li><li>Worktree build on the same root: Basics has no card; the page is empty.</li><li>Import the repository: "Connected as @login" at once.</li><li>`connections.json` before and after the next write.</li></ol> | The real upgrade data |
| API-05 | AC-001…AC-004, AC-006…AC-008, SCN-001, SCN-003, SCN-A4, SCN-A6, SCN-A7 | packaged worktree build (continues API-04's instance) | Journey | <ul><li>Menu and page.</li><li>Manage → Update (real GitHub, no new revision).</li><li>Test and Replace, a rejected token.</li><li>Add the skill to an agent in the UI.</li><li>A real Codex agent runs `issues.sh list` and `comment`; activity records.</li><li>Skills → Manage Skill Sources → Remove while the run is active: card and connection gone; the agent's next call refused.</li><li>A folder integration with `http:`/`javascript:`/`https:` links in `token.help`: only `https:` is a link.</li><li>Token scan of the data root, logs and `CODEX_HOME`.</li></ul> | The user's real journey; AC-008 |
| API-06 | AC-007, QR-001 | ticket folder and new test files | Temporary Probe | token scan (paths only) | evidence must be token-free |

- Test progress log: `Yes`.

## Durable Coverage To Add

| Case ID | Path | Why |
| --- | --- | --- |
| API-02 | `autobyteus-server-ts/tests/e2e/credential-proxy/github-credential-proxy-runtime-shells.e2e.test.ts` (3 cells) | The access rule's other ways in (all-installed, a team-local member) and its revocation by disabling the skill or removing the source from the Skills page have deterministic tests (IMP-04). A real run with a real pass and a real GitHub call keeps them proven end to end, at no model cost |

## Durable Coverage To Update / Remove

None.

## Desktop Application Validation Plan

- Packaged worktree build plus the installed release, both as isolated instances on one owned data root; driven over CDP.
- **Web-equivalent:** the page, dialogs, Skills label and agent edit.
- **Shell-specific:**
  - the embedded server with `CODEX_HOME`;
  - the installed-release upgrade;
  - `openExternalLink`: its DOM is checked, but it is not clicked, because clicking would open the user's browser.
- **Not disturbing the user's app:** separate data root and ports. The user's installed app binary is launched only as an isolated instance (TESTING.md Rule 1 allows installed builds with isolation support).

## Not Tested / Infeasible / Deferred

| Behavior | Reason | Risk | Only The User Can Check? | Follow-Up |
| --- | --- | --- | --- | --- |
| DEC-016 on a **real** new GitHub revision that drops an integration | Needs a commit to a GitHub repository. The only writable one, `ryan-zheng-teki/autobyteus-mcp-test`, is a shared test fixture, and changing its content would affect other suites. The update path is covered with a stub GitHub (IMP-04); Update itself runs on real GitHub in API-05 | Low: the same `updateGitHubSkillSource` path as every skill update; the observer is tested with a stub | No | None |
| An application bundle copy of the skill granting nothing at runtime | Needs an application package with an agent bundle carrying a copy of the integration skill; covered deterministically (IMP-04, the bundle-copy test) | Low (a negative case of a `rootPath` comparison) | No | None |
| Clicking a `token.help` link in the packaged app | It would open the user's default browser | Low (`externalLink` spec) | No | None |

## Ambiguities Or Reroute Triggers

None at planning.

## Investigation Decision

- Proceed: `Yes`. Durable coverage added: `Yes` (cells in the runtime-shells suite). Reroute: `No`.
