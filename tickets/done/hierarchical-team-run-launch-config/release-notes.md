# Release Notes — Hierarchical Team Launch Configuration

## What's New

- Every nested Agent Team can now act as its own launch-configuration scope, inheriting from its parent by default and supporting explicit Team-level customization.
- Individual Agent overrides continue to take precedence over their nearest Team defaults, with canonical rooted Team and Agent addresses preserved through launch, history, restart, and restore.
- Existing TeamRun Settings now reuse the same compact Team form and hierarchy as pre-launch configuration while remaining explicitly read-only.

## Improvements

- Root, nested-Team, and Agent runtime, model, model-specific settings, workspace, skill access, and auto-approval values resolve through one consistent hierarchy.
- Nested Teams show inherited or customized state, effective values, and reset-to-parent behavior without adding extra interaction to root-only Teams.
- Stored Settings preserve immutable V2 topology, member order, workspace identity, and exact historical values while keeping disclosures operable and mutation controls disabled.
- Application and external root-only launch profiles retain compatible inheritance semantics across all descendants.

## Reliability And Migration

- Team execution-tree V2 stores a complete effective default on every Team node and a complete resolved launch snapshot on every Agent node.
- Startup migration upgrades eligible V1 production history to V2 with deterministic identities, binding preservation, warning isolation, retry safety, overlap rejection, and idempotent relaunch behavior.
- Older history remains readable without fabricated Team defaults; known Agent settings and producer-backed historical model fields remain visible exactly once.

## Validation

- Hierarchy lifecycle, GraphQL creation/history, restart/restore, production upgrade, application launch, stale-workspace repair, and actual browser/Electron presentation paths passed.
- Final API/E2E confidence: 98%; complete source review: 9.6/10; proportional durable-test review: Pass with no findings.
- The final hands-on macOS arm64 Electron candidate was approved before repository finalization and release.
