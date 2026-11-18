# Delivery Revision Record — release-beta-20261102

| Revision ID | Trigger | Prior Result | Current Result | Artifacts |
| --- | --- | --- | --- | --- |
| DR-001 | Release Requested (user: a new beta) | N/A | Blocked before tagging: build-only run failed (typecheck reads an unbuilt `autobyteus-ts`) | `release-deployment-report.md` (first version) |
| DR-002 | Release Requested again after `clean-runner-build-order` | DR-001 Blocked | Released: `v1.5.11-beta.11`, 4 of 4 workflows, 23 of 23 assets; Grok waived by the user | `release-deployment-report.md` |

### DR-002
- Rechecked on `personal` @ `1df12d475a`; smoke 12 of 13 (Grok waived), build-only run passed, tagged at `4c6a59ff61`. Notes: one added "For API clients" section. Terminal return: `Sent`. Remaining: none blocking; Docker image not pulled.
