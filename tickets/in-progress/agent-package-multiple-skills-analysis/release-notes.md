# Release Notes

## What's New

- Agent packages can now carry package-private skills for shared and team-local agents.
- Team-local package agents can resolve owning-team shared skills from the package team folder.
- Runtime configured-skill resolution now uses the current agent/team source context before falling back to global skills.

## Improvements

- Package agents can reference multiple private skills through `agent-config.json.skillNames` without registering those skills globally.
- The global Skills catalog and Skills page now stay global-only, avoiding package-private skill leakage into standalone skill management.
- Native AutoByteus, Codex, Claude, and team-member bootstraps share the same configured-skill resolver boundary.

## Guidance And Safety

- Duplicate skill names across global, package-private, and team-shared sources are product-excluded for this ticket; use unique logical skill names.
- Codex uses the normal resolved `Skill[]` materialization path and has no source-aware duplicate-name preflight/materializer behavior in this ticket.
- Supported package layouts include colocated `agents/<agent-id>/SKILL.md`, multi-skill `agents/<agent-id>/skills/<skill-name>/SKILL.md`, team-local equivalents, and `agent-teams/<team-id>/skills/<skill-name>/SKILL.md` for team-shared skills.
- `SKILL.md` frontmatter `name` must match the configured `skillNames` entry; mismatches and unsafe path-like names are skipped with warnings.
- Live model-backed Codex/Claude/native conversations were not part of validation; deterministic package import, contextual resolver, catalog/API non-leakage, and TypeScript checks passed.
