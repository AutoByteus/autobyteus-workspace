# Release Notes — Self-Evolving Harness Feasibility

## Summary

Adds an experimental, disabled-by-default manual skill self-evolution capability for AutoByteus runs.

## User-Facing Changes

- Settings → Server Settings → Basics now includes a **Self-evolution** capability toggle for the current node.
- Eligible workspace history run/member rows can expose a sparkles action to start manual skill self-evolution after backend eligibility has been checked.
- The backend launches a separate visible skill-evolver agent run rather than inserting an evolver into the target business team.

## Backend/API Changes

- Added typed GraphQL capability, strategy catalog, eligibility, start, run-record, and metrics-report surfaces.
- Added run-launch `selfEvolution` config placement for standalone and team/member launches with `selfEvolutionEffective` metadata snapshots.
- Added the built-in `autobyteus-skill-evolver` helper agent and setting key `AUTOBYTEUS_SKILL_EVOLVER_AGENT_DEFINITION_ID`.
- Definition-owned self-evolution config is intentionally not supported.

## Safety And Validation Notes

- The feature is globally disabled by default through `ENABLE_SELF_EVOLUTION`.
- MVP execution is manual-only and single-agent-evolver only; scheduled/signal triggers and evolver-team strategy are placeholders.
- Direct edits are limited to exact configured writable `SKILL.md` targets and are audited after the helper run for off-target or non-editable changes, with realpath-aware comparison for aliases such as macOS `/tmp` and `/private/tmp`.
- Update metrics and downstream benefit metrics are reported separately; changed files are not proof of benefit.
- Live browser validation passed for a full disposable Git-backed self-evolution loop: target run evidence, browser `Improve skills from this run`, visible Skill Self-Evolver run, actual `SKILL.md` edit, record completion, target notification, post-evolution next-run answer from the updated skill, and update/benefit metrics.
- Full project-wide web typecheck remains blocked by pre-existing unrelated TypeScript errors; focused server/web validation and live loop validation passed.
