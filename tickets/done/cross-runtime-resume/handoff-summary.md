# Handoff Summary — cross-runtime-resume (autobyteus-316: a stopped agent continues on another agent runtime)

## Ticket

- Package: `cross-runtime-resume`; Project Task `autobyteus-316`
- Classification: `task_size=Large`, `architectural_risk=High`; route: reviewed. Architecture review ARCH-REV-001…004; source review CRR-001…003 Pass; API/E2E API-REV-001 Fail (native candidate record, reopened chat history), reworked (IR-002), API-REV-002 Pass (94.9%); test-code review CRR-004 Pass (no findings).
- Archived ticket folder: `tickets/done/cross-runtime-resume/` on `personal`

## What Changed

- **Settings of a stopped standalone Agent run** can choose another agent runtime and a model of it. Save records a `pendingRuntimeSwitch` in the run's metadata only; undo (choosing the previous runtime again) restores it; a model-only edit keeps a pending switch. GraphQL clean cut: `updateStoppedAgentRunSelection` with a required `runtimeKind` replaces `updateStoppedAgentRunModelConfig` (the team family keeps its names).
- **The first message makes the switch real:** the previous agent's raw-trace records are archived as a `runtime_switch` segment (its own `runtime_kind`), the new file starts with the switch marker, then the new agent's own instruction records; the activation commit sets the session and removes the pending field in one write. A failed attempt leaves the previous file as it was (the message is refused with the reason); a failure after the marker is completed by sending again, with one marker and one segment.
- **Hand-over notice:** derived from the raw traces (not registered state), delivered with the next input before the user's text, names no runtime or model, points at the Work Journals; it survives a restart.
- **Chat:** the earlier conversation and the marker show after a reload (archived `runtime_switch` segments plus the active file; compaction segments stay unread).
- **Work Journal:** each file is read with the translation of the runtime that wrote it (manifest entry per file); never-switched runs render byte-identically (15/15 compared with the base).
- **Limits:** only a standalone Agent run switches; team members, Org members, delegated copies and application/system-owned runs keep their runtime (FU-003).
- Docs: `GLOSSARY.md`, `run_history.md`, `agent_memory.md`, `agent_work_journal.md`, `autobyteus-web/docs/settings.md` (done in the ticket; verified by delivery).
- Tests: built-server cases RS-01…RS-08, journal identity test, unit and web specs, browser probe `pnpm -C autobyteus-web test:e2e:runtime-switch`; an earlier ticket's recent-run-projection E2E changed with the code reviewer's agreement (the first hydration of a switched run reads the manifest, design §3.7, invariant I-10).

## Integration

- Merge of `origin/personal` @ `a977b2c1bc` (24 commits: Docker node in-place update, Nodes page, release scripts) into the ticket branch; no conflicts.
- Post-integration checks all Pass (`evidence/DEL-01-post-integration-checks.md`): server typecheck; focused server suites 2406 passed and library 330 passed (identical to API/E2E); server build; built-server RS-01…RS-08 and projection tests 17 passed; web typecheck, guards and 225 web specs; browser probe `RSW-01 Pass` with the reload screenshot reviewed.

## Verification

- Judged from the evidence; no user check needed. Every critical AC is directly proven, including the case that failed in round 1 (RS-01), the failure and restart paths (RS-04…RS-08), live Claude then Codex then scripted Antigravity on isolated data (AC-008, the Task's "real run"), and the real browser journey (the rendered chat, marker and settings after a reload). Confidence 94.9% against the 95% default, no category below 93%. Details: `release-deployment-report.md`.

## Release

- `No release`: the Task says "no release unless asked" and the user did not ask. `release-notes.md` is ready for a beta (generated notes) or a stable release. A beta or stable release is available on request.
- Notice points: the GraphQL mutation rename breaks clients of the old mutation; the switch starts at the first message after the save.

## For The Solution Designer

- Follow-ups in `follow-ups.md`, none sent: FU-001, FU-003 (team/Org/delegated switch), FU-004 (a switch started by an agent or the Model Router), FU-005, FU-008, FU-009 (the broken import in `claude-live-agent-harness.ts`, the same defect as autobyteus-331's FU-004), FU-010 (test header tidy).
- Not tested: the Electron shell (Chrome only); the native and Grok runtimes on real providers; a real process kill (emulated by cutting the active file); optional hardening of `begin` for a non-empty active file whose last complete record has no id. The live Claude/Codex run added sessions to those CLIs' history (TESTING.md).
