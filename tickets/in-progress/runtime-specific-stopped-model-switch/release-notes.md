# Candidate Release Notes — Runtime-specific stopped-run model switching

Status: **Draft for user verification; not published or versioned**.

## Changes
- Stopped Agent, Team and Agent Org Settings offer distinct models from the run's fixed Claude Agent SDK, Codex App Server or Antigravity CLI backend catalog without a platform context-window gate. AutoByteus retains verified non-decreasing capacity for replacements. Save still rechecks model availability/schema and lifecycle/ownership guards; linked-scope updates remain atomic.
- The Claude backend removes a redundant `default` from new choices only when another listed ID is proven to resolve to the same model. Existing definitions, runs and Application setup saved with exact `default` keep that ID, their current display/schema, valid same-model settings and normal continuation. Choosing a listed sibling is explicit; distinct models, including `[1m]` variants, are not collapsed by a label guess.
- Stopped-run options now carry current/replacement descriptors; definition, Run, mobile and Application Setup surfaces request exact-current detail for server-origin saved values. Frontend alias folding and obsolete numeric stopped-option fields/external capacity readers were removed.
- Saved Application Agent and Team Launch Setup now reopens safely from reactive persisted configuration without a `DataCloneError`/Nuxt 500. Existing history/provider binding is not reset by Save; a provider may visibly reject an oversized conversation on later continuation.

## Verification And Limits
- Approved SR-006/SR-009 reviewed route; ARCH-REV-003, CRR-008 source and CRR-009 durable-test reviews passed. API-REV-004 passed at **94.3%**, below the default 95% clean target; no category below 90%.
- Built GraphQL 3/3, focused Application 13/13, deterministic browser 6/6, production Web build, real Chromium Application Agent/Team Save→new-page restore and authenticated mobile browser setup passed. Earlier current-basis provider/browser checks remain as indexed in API-REV-004; they were not all rerun in that round.
- No numerically verified smaller-window external provider pair, real-device/mobile Create Run, CI-durable credentialed full-stack/provider suite, or universal provider continuation claim. No persisted-data migration or automatic history rewrite is required.

This candidate remains unmerged and unpublished pending explicit user verification and a release decision.
