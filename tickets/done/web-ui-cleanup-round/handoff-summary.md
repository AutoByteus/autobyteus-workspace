# Handoff Summary: web-ui-cleanup-round (autobyteus-320)

- Status: verified from the evidence, proven from a clean clone, archived and finalized on `personal`, and released as beta `v1.5.10-beta.1` at the user's request (2026-10-28: "if everythign is going fine. please release a new beta thanks"). The final repository and release state is in `release-deployment-report.md`.
- Classification: `task_size=Medium`, `architectural_risk=Low`, route Direct. Architecture review: `N/A — not applicable`. Source review: not selected. The code reviewer ran two failure-origin reviews (CRR-001, CRR-002), each a Local Fix. Test-code review: `Not Required` (direct route); delivery judged API/E2E's two probe changes itself (below).
- Revisions: SR-001 / IR-001…IR-003 / API-REV-001 (Fail), API-REV-002 (Fail), API-REV-003 (Pass) / CRR-001, CRR-002 / DR-001.
- Worktree (removed after finalization): `/Users/normy/autobyteus_org/autobyteus-worktrees/web-ui-cleanup-round`, branch `codex/web-ui-cleanup-round`.

## What Changed (six items)

1. The decorative icons that beta 15 made visible were removed. The Settings menu is text only; "Back to Workspace" keeps its arrow. Group A/B icons are gone, and the group C icons are kept (DEC-001).
2. One name per agent runtime, from `agentRuntimeName` in `@autobyteus/agent-presentation-contracts`. Full names appear everywhere in web and server ("Claude Agent SDK", "Codex App Server", "Antigravity CLI", "Grok Build", "AutoByteus") (DEC-002). `GLOSSARY.md` lists them.
3. The Embedding page's Project-indexes card has one "Waiting…" state ("等待中…"). The Product Team recorded it in the design repository (`a938d892b3`, design repo `752b6b816c`).
4. Skill-update notices show the folder and file paths literally, as inline code.
5. The Depends-on picker: Enter with options already loaded chooses the first choosable Task.
6. Voice input in Memory → Search. The transcript fills the box and Search runs the search (DEC-003). `VoiceTargetStatus` is now the one shared voice status line.

Fixes from the failed rounds: `1a4bfd2ae9` (runtime kinds in the app setup summary and agent detail) and `0e3029d503` (the nullable runtime kind that failed the desktop typecheck).

## Integration And The Clean-Clone Proof

- Integration: the branch was already current with `origin/personal` @ `e72a4702e9`, so no merge was needed.
- Clean clone (the user's "prove from a clean clone"): `git clone --no-local --branch codex/web-ui-cleanup-round` at `a2a431fcd1` into `/tmp/ab320-clone`, with no build output. Then:
  - `pnpm install --frozen-lockfile`;
  - `pnpm --filter "@autobyteus-example/brief-studio-authoring^..." build`;
  - a second `pnpm install --frozen-lockfile`, to link the devkit bin (FU-008 of autobyteus-296);
  - `pnpm -C applications/brief-studio build`.
- Results (logs in `evidence/DEL-0*-clean-clone.log`):

  | Check | Result |
  | --- | --- |
  | DEL-01 contracts test | 22 pass, 0 fail |
  | DEL-02 server typecheck | exit 0 |
  | DEL-03 web guards (web-boundary, localization-boundary, localization-literals audit) | Passed |
  | DEL-04 web typecheck, the desktop build's gate that failed in round 2 | production errors 0; test-file errors 298 in 139 files, at baseline; PASS |
  | DEL-05 full web suite | 668 files; 4857 passed, 2 skipped (both check packaged desktop output, absent in a clone) |
  | DEL-06 server units + work journal + skill-notice integration | 797 files; 6721 passed, 9 skipped (live-runtime and performance gates) |
  | DEL-07 model-routing e2e with scripted AGY | 9/9 |
  | DEL-08 affected e2e | import→launch 2/2, reload-repair 5/5, running-agents 4/4, available-runtimes GraphQL 6/6 |
  | DEL-09 the AGY-gated e2e, which DEL-08 skipped without the gate | delegated-launch config defaults 3/3, remote delegation two-server 41/41 |

## Verification From Evidence

- The execution report's AC proof was checked against the evidence. Screenshots viewed:
  - the app setup summary: "/researcher · Codex App Server · gpt-5.6-luna";
  - the Settings menu: text only, with the "Back to Workspace" arrow;
  - Memory search: the transcript in the box with the mic button, and no search run.
- The journey record shows AC-001, AC-002, AC-010 and AC-011 in the real desktop build. The round-3 results show AC-003's fixed views and the desktop typecheck gate.
- AC-012 (suites pass, clean-clone proof) is proven by DEL-01…09.
- API/E2E's durable probe changes, which had no test review on the direct route, were judged by delivery:
  - `bacc8f51fd` builds the delegated-launch probe's expected notes with `agentRuntimeName`. The literal names stay pinned by `autobyteus-agent-presentation-contracts/tests/agent-runtime-names.test.mjs`, so the probe checks placement and the contract test checks spelling; coverage is not weakened.
  - `a26305a2a7` only stubs the app shell's WebSockets and run-history root fields in the fixture page.
- AC-008: the Product Team's record `a938d892b3`.
- AC-011 with a real microphone: optional, and not needed. A real extension, real transcription and an emulated mic were used.
- API/E2E final confidence: 95%, every category ≥ 95%.

## Docs

- `GLOSSARY.md` and `autobyteus-web/docs/settings.md` (implementation).
- Delivery: `autobyteus-web/docs/projects.md` (`VoiceTargetStatus`; the picker's Enter rule), `autobyteus-web/docs/memory.md` (Memory search voice input) and `autobyteus-server-ts/docs/modules/skill_update_notices.md` (paths as inline code).

## Follow-ups (`follow-ups.md`, sent by the Solution Designer)

- FU-001: voice button focus is lost on start/stop in every voice input.
- FU-002: technical lines (`PACKAGE_TEAM_DEFAULT:bundle-team__…`, `llmConfig: none · workspace: APPLICATION_RUNTIME`) in the launch-authority summary. They are visible, and overflow the card, in `API-12-r3-01-app-setup-summary.png`.

## Release

- Decision: beta, at the user's request (2026-10-28). `v1.5.10-beta.1`, the next unused beta after stable `v1.5.9` (`release_versions.py next-beta`). Pre-release with generated notes.
