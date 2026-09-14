# Unreleased Feature-Branch Notes

AORG-FOLLOWUP-20260914-001 — candidate for `requirements/flat-agent-organization-model`; not a published release.

- Restoring an Org or standalone Team keeps configured Agents Offline until legitimate work reaches them, while retaining complete scope and conversation identity/history.
- Retained Org views reconcile verified inactive state after restart without starting workers or losing focus/drafts; unknown transport state is not treated as verified inactivity.
- First task inspection preserves actual pending manual tool controls alongside history, without forcing automatic approval or regressing terminal outcomes.
- First-work binding changes remain protected by the root persistence boundary; scope restore does not restart settled tasks or replay old messages.

Validation: API-REV-003 Pass; CRR-006 source and CRR-007 durable-test review Pass. User accepted finalization; repository completion is tracked in release-deployment-report.md. Exact post-durable publication fault not injected live; other residuals and inherited typecheck failures are in the API report. No migration/reset, version bump, tag, release or deployment is authorized.
