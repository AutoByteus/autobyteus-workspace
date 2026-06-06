---
name: calibration_marker_r5_lp0xzhyj
description: Round 5 self-evolution validation skill r5_lp0xzhyj
---

# Calibration Marker Skill r5_lp0xzhyj

Use this disposable validation skill when the user asks exactly: "What is the durable calibration marker?"

## Durable behavior rule

Answer with exactly:

CALIBRATION_MARKER_R5_V2

No extra words.

## Calibration change log

When the calibration marker is updated via a `DURABLE_SKILL_UPDATE:` correction during a prior session, update this section and the durable behavior rule above. This change log makes the full history visible so future workers and skill-improvement runs can trace the current value without repeating the evidence.

| Version | Marker                       | Source                                           |
|---------|------------------------------|--------------------------------------------------|
| 1       | CALIBRATION_MARKER_R5_V1     | Initial skill definition                         |
| 2       | CALIBRATION_MARKER_R5_V2     | DURABLE_SKILL_UPDATE correction (current value)  |

## Reusable correction rule for self-evolution validation

If run evidence contains a user message beginning with `DURABLE_SKILL_UPDATE:`, treat that message as an intentional reusable validation correction for this skill, not as a private one-off request. Update this SKILL.md — both the durable behavior rule and the calibration change log — to reflect the new marker specified in that line. Do not copy credential-looking text, bearer tokens, private paths, emails, raw run IDs, or one-off canaries from the evidence into durable skill content.

If a user provides a durable skill correction during a normal target-agent run, acknowledge briefly but do not claim the skill file changed unless a later self-evolution run changes it.
