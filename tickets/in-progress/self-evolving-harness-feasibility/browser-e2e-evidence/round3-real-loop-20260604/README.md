# Round 3 Real Self-Evolution Loop Evidence — 2026-06-04

## User-requested full-loop scope

This round intentionally went beyond the previous browser smoke test. It created a disposable target agent with a Git-backed editable skill, produced before/correction run evidence, clicked the browser self-evolve action, let the visible Skill Self-Evolver run with AutoByteus + DeepSeek Flash and auto-executed tools, inspected the resulting skill diff and self-evolution record, then launched a follow-up target run to check next-run behavior.

## Environment

- Backend: built `autobyteus-server-ts/dist/app.js` on `http://127.0.0.1:8000`
- Frontend: Nuxt dev server on `http://127.0.0.1:3000`
- Runtime/model: `autobyteus` / `deepseek-v4-flash`
- Temp root: `/tmp/autobyteus-self-evolution-real-e2e`
- Target skill: `calibration_marker_mpzumbn3`
- Target agent: `calibration-marker-agent-mpzumbn3`
- Target run: `calibration_marker_agent_mpzumbn3_validation_target_7561`
- Evolution run: `6984a63e-dd84-4dc2-a9b0-3a6195f4ba4d`
- Visible evolver run: `skill_self_evolver_skill_evolution_specialist_1190`
- Post-evolution follow-up run: `calibration_marker_agent_mpzumbn3_validation_target_5674`

The DeepSeek key was not printed or copied into this evidence directory.

## What passed

1. The disposable target skill was created as Git-backed and writable.
2. The target run launched with self-evolution enabled in its run-launch snapshot and was eligible.
3. The target answered the before marker as `CALIBRATION_MARKER_V1`.
4. The target conversation included durable correction evidence instructing the skill to use `CALIBRATION_MARKER_V2`.
5. In the browser, the `Improve skills from this run` action was present and enabled; it was clicked.
6. The visible `Skill Self-Evolver` run launched using AutoByteus + `deepseek-v4-flash` and executed `run_bash` tool calls.
7. The target `SKILL.md` file was actually edited from `CALIBRATION_MARKER_V1` to `CALIBRATION_MARKER_V2`.
8. A follow-up target run loaded the updated skill and answered `CALIBRATION_MARKER_V2`.

## What failed

The self-evolution service recorded the run as `failed` even though the evolver edited the exact target file. On macOS, the Git/audit path resolved through `/private/tmp/...` while the editable target path supplied to the task was `/tmp/...`. The change recorder treated that realpath alias as an off-target mutation:

- valid changed skill path: `/tmp/autobyteus-self-evolution-real-e2e/server-data/skills/calibration_marker_mpzumbn3/SKILL.md`
- off-target path recorded: `/private/tmp/autobyteus-self-evolution-real-e2e/server-data/skills/calibration_marker_mpzumbn3/SKILL.md`
- policy violation: `Self-evolver changed off-target path '/private/tmp/autobyteus-self-evolution-real-e2e/server-data/skills/calibration_marker_mpzumbn3/SKILL.md'.`

Because the record failed, `notificationSummary` was `null`; the active target notification was not sent. Metrics also marked benefit as not collectible, even though the next run demonstrated improved behavior.

## Evidence files

- `01-target-run-eligible-before-click.png` — browser history shows target run and enabled self-evolve action before click.
- `02-self-evolver-run-visible-after-click.png` — browser history shows self-evolver run appeared after click.
- `03-self-evolver-run-conversation.png` — browser conversation shows the self-evolver task and tool activity.
- `setup-before-eligibility.json` — setup, before answer, correction acknowledgement, eligibility, and skill target paths.
- `self-evolution-record.json` — persisted self-evolution record showing failed status, alias off-target path, and null notification.
- `graphql-record-and-metrics.json` — compact summary of record/metrics and follow-up result.
- `skill-before.SKILL.md` — initial skill content from Git tag `0.1.0`.
- `skill-after.SKILL.md` — actual skill content after live evolver edit.
- `skill.diff` — Git diff proving the live edit.
- `post-evolution-next-run.json` — follow-up run answer `CALIBRATION_MARKER_V2`.
