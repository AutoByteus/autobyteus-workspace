# Handoff Summary: available-agent-runtimes-tool (autobyteus-303)

- Status: verified from the evidence, archived and finalized on `personal`. No release (none requested; the RELEASE.md default). The final repository state is in `release-deployment-report.md`.
- Classification: `task_size=Large`, `architectural_risk=High`, reviewed route. Architecture review: ARCH-REV-001…008 (final Pass on SR-007). Code review: CRR-005 Pass, 9.5/10 (bar 9.2), CR-001…CR-005 resolved. API/E2E: API-REV-001 Fail → API-REV-002 Pass, final confidence 95%. Test review: CRR-006 Pass, no findings.
- Revisions: SR-007 / ARCH-REV-008 / IR-004 / CRR-006 / API-REV-002 / DR-001.
- Worktree (removed after finalization): `/Users/normy/autobyteus_org/autobyteus-worktrees/available-agent-runtimes-tool`, branch `codex/available-agent-runtimes-tool`.

## What Changed

- New opt-in agent tool `list_available_agent_runtimes` (no arguments). It returns, for the node the agent runs on, every available agent runtime (Codex, Claude, Antigravity, Grok, AutoByteus per keyed or answering provider) with its models and live usage limits. A model that cannot run now carries `blocked: {until, by}`. It works on the AutoByteus runtime as a local tool and on Codex, Claude, Antigravity and Grok through Agent Tools MCP. An agent gets it only when its definition lists it.
- Limits are read live with 0 tokens: Codex `account/rateLimits/read`, Claude `get_usage`, Antigravity `/usage`, Grok `_x.ai/billing`, plus DeepSeek, Kimi, Anthropic and xAI provider checks. Every other provider says "limits not reported". Answers carry no keys, tokens or account identities.
- Reads are parallel, each step has its own deadline, and the whole answer comes within 20 s. A failed step says "timed out" or "could not be read: <reason>"; nothing is guessed. Concurrent callers share one read.
- New Settings → **Model Routing** page, section "Agent runtimes now". It shows the same answer for the window's node, reads on open and on "Check again", and never polls. en and zh-CN.
- Claude model discovery no longer sends a user turn: it uses a control query whose input never yields.
- Code commits: `5135bb73dc`, `683b036be9`, `07c07cfc27`, `c4fff3eb00`, `7ece4e2069`. API/E2E test commits: `8de58e3ab3`, `cc789b7c84`.
- Durable tests:
  - Server E2E `tests/e2e/runtime/available-agent-runtimes-graphql.e2e.test.ts` (AAR-01…06).
  - Web browser probe `tests/e2e/model-routing-settings-probe.mjs` (MRP-01…07).
  - Unit and component tests for the service, the parsers, the provider readers, deadlines and the page.
- Docs: `agent_runtimes.md`, `agent_tools.md`, `llm_management.md`, `settings.md`, `GLOSSARY.md`, `docs/design-cases.md`. The implementation wrote them; delivery completed the tool lists in `agent_tools.md` and the test listings (`docs-sync-report.md`).

## Integration

- `origin/personal` was still at the bootstrap base `a2faf424d6`, so the branch was already current. Nothing was merged.
- Delivery smoke rerun on the final state (`e1450c9754`, code identical to the validated `cc789b7c84`): the server E2E passed 6/6, AAR-01…06 (`evidence/delivery/DEL-01-server-e2e-rerun.log`).

## Verification From Evidence

All 12 critical acceptance criteria are directly proven. The full table is in `release-deployment-report.md`. Highlights:

- AC-001, 003…007, 009: live answers equal the vendors' own direct answers on a real node (API-08). The page and GraphQL answers match on a real stack (MRP-01). Six Claude reads cost 0 USD with no model usage (API-10).
- AC-002, 012: a Codex run whose definition lists the tool gets it over MCP; one without gets "Tool is not enabled for this session" (AAR-04).
- AC-008, 011: hung steps end at their own deadlines in about 14 s total, with "timed out" wording 400/400 (AAR-03, API-03b).
- AC-010: proven on the web-equivalent page, including a remote-node window.
- AC-013: four callers share one read, and one app-server is started (AAR-04, API-09).
- No user check is required to verify the change.

## Checks Only The User Can Do (optional, after merge)

These need the user's own windows or accounts. The tests could not reach them, and they do not block this ticket:

- AC-010 in the user's own desktop window and Docker-node windows. The page is the same web bundle that was proven on test-owned nodes, and the desktop shell is unchanged.
- AC-006 (non-critical): what Grok's used percentage means, once Grok reports one (UNK-001). Grok reports none this period, so nobody can check it yet.
- ASM-001: reads with signed-in CLIs inside a Docker node. The Docker node was proven with signed-out CLIs (they are detected and left out), and the readers were proven live on the host. Copying the user's logins into a container could rotate their refresh tokens.

## Follow-ups (`follow-ups.md`, sent by the Solution Designer)

- FU-001: `RuntimeAvailabilityService` uses blocking `spawnSync`.
- FU-002: the stale Agent Runtimes settings probe fails 4 cases, the same as on base. The code reviewer recorded for the user that TESTING.md Rule 9 would have fixed it in this branch, while the skill makes it a follow-up.
- FU-003: the Codex client manager refuses a closing generation.
- FU-004: English answer texts on the zh-CN page.
- FU-005: repeated work per read.
- Delivery found no new follow-up.

## Residual Risk

- RSK-001: external formats can change without notice, such as Claude's experimental `get_usage` and its undeclared `rate_limits.limits[]`. A change makes that runtime's limits "unknown: …" and does not produce a wrong answer.

## Release

- Decision: no release. The change ships with the next beta or stable release that the user cuts.
