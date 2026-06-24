# Release Notes — Self-Evolution Companion Work Traces

- Manual **Self improve** now activates or reuses a target-scoped self-evolver companion instead of launching a one-shot inline helper for each request.
- Self-evolution now sends the companion readable work trace file paths generated from the target's raw trace history, keeping prompts smaller while preserving relevant messages, tool activity, errors, and corrections.
- Work trace and evolver-session memory now use flat target-scoped paths under each target run/member memory directory: `self_evolution/work_traces/` and `self_evolution/evolver_session.json`.
- Backend session state now uses evolver-run identity and can attempt a user-triggered restore/resume before replacing an unavailable evolver run.
- Run and team launch inputs no longer carry per-run self-evolution overrides; manual eligibility is resolved from current server settings and the active target state.
- Launch configuration screens no longer show self-evolution eligibility controls; the global setting and run-level **Self improve** CTA remain the user-facing controls.
- Startup migration removes obsolete `selfEvolutionEffective` metadata from existing run and team member history files while creating backups for changed metadata.
