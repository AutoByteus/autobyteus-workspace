# Unreleased Feature-Branch Notes

TEAM-PACKAGE-READ-20260915-001 — uncommitted candidate for requirements/flat-agent-organization-model, not a published release.

- Flat Team input reads ignore unused metadata and accept missing/null defaultLaunchConfig without rewriting package files. Required values, scoped Agent references, handoffs and launch checks remain enforced; canonical writes remain strict.
- Invalid nested parents remain unavailable as whole Teams; no partial flattening or automatic Org generation.
- Automatic authored Team/Org definition conversion/cleanup is removed, including server-owned definitions. Maintainers own authoring changes; existing software-owned execution/history migration remains intact, without reset/replay/reversal.

API-REV-001 Pass95.0% scoped confidence, source CRR-001 Pass, proportional CRR-002 Not Applicable (no API durable changes). User explicitly verified and authorized Git finalization; completion tracked in delivery report. Only5 supplied Teams available,7 missing required avatarUrl,2 missing scoped Agent targets; no manufactured fixes. Full runtime/browser/typecheck limits in API report. No release/deployment or live-data operation authorized.
